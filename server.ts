import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;

const MAX_PROMPT_LENGTH = 16000;
const MAX_HISTORY_TURNS = 12;
const MAX_OUTPUT_TOKENS  = 8192;

const NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

const MODEL_CONFIG = {
  "deepseek-ai/deepseek-v4-pro": {
    tpm: 128_000, label: "DeepSeek V4 Pro (Full Context)", tokensPerDay: 1_000_000, default: true, provider: 'nvidia' as const
  },
  "deepseek-ai/deepseek-v3": {
    tpm: 100_000, label: "DeepSeek V3 (Fast)", tokensPerDay: 1_000_000, default: false, provider: 'nvidia' as const
  },
  "deepseek-ai/deepseek-r1": {
    tpm: 64_000, label: "DeepSeek R1 (Reasoning)", tokensPerDay: 500_000, default: false, provider: 'nvidia' as const
  }
} as const;

type AllowedModel = keyof typeof MODEL_CONFIG;
const ALLOWED_MODELS = Object.keys(MODEL_CONFIG) as AllowedModel[];
const DEFAULT_MODEL: AllowedModel = "deepseek-ai/deepseek-v4-pro";

// ─────────────────────────────────────────────
// INCO DOCUMENTATION — loaded once at startup
// ─────────────────────────────────────────────

function loadIncoDocs(): string {
  const candidates = [
    "./inco_context.txt",
    "./inco_context.md",
    path.join(__dirname, "inco_context.txt"),
    path.join(__dirname, "inco_context.md"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      console.log(
        `[INCODE_SERVER] Loaded Inco docs: ${filePath} ` +
        `(${content.length} chars, ~${Math.round(content.length / 4)} tokens)`
      );
      return content;
    }
  }
  console.warn("[INCODE_SERVER] ⚠️  No inco_context.txt found. Place it in the project root.");
  return "";
}

const INCO_DOCS = loadIncoDocs();

// ─────────────────────────────────────────────
// TOKEN BUDGET HELPERS
// ─────────────────────────────────────────────

// 1 token ≈ 4 chars — rough but accurate enough for budget gating
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Return a version of INCO_DOCS that fits within the remaining token budget.
 *
 * Budget: model TPM
 *       − MAX_OUTPUT_TOKENS   (reserved for response)
 *       − basePromptTokens    (system prompt without docs)
 *       − historyTokens
 *       − promptTokens
 *       − 200 safety buffer
 *       = tokens available for docs
 *
 * If everything fits  → full docs returned unchanged.
 * If not              → trimmed at last clean newline + truncation notice.
 * If nothing fits     → empty string returned.
 */
function fitDocsToTokenBudget(
  model: AllowedModel,
  basePromptTokens: number,
  historyTokens: number,
  promptTokens: number
): { docs: string; truncated: boolean } {
  const tpm            = MODEL_CONFIG[model].tpm;
  const safetyBuffer   = 200;
  const availableForDocs =
    tpm - MAX_OUTPUT_TOKENS - basePromptTokens - historyTokens - promptTokens - safetyBuffer;

  console.log(
    `[TOKEN_BUDGET] model=${model} tpm=${tpm} ` +
    `base=${basePromptTokens} history=${historyTokens} prompt=${promptTokens} ` +
    `output_reserved=${MAX_OUTPUT_TOKENS} buffer=${safetyBuffer} ` +
    `→ available_for_docs=${availableForDocs}`
  );

  if (availableForDocs <= 0) {
    console.warn("[TOKEN_BUDGET] No room for docs — sending without them.");
    return { docs: "", truncated: true };
  }

  const maxDocChars = availableForDocs * 4;

  if (INCO_DOCS.length <= maxDocChars) {
    return { docs: INCO_DOCS, truncated: false };
  }

  // Trim to last clean newline within budget
  let cutPoint = maxDocChars;
  const lastNewline = INCO_DOCS.lastIndexOf("\n", cutPoint);
  if (lastNewline > maxDocChars * 0.8) cutPoint = lastNewline;

  const trimmed    = INCO_DOCS.slice(0, cutPoint);
  const droppedPct = Math.round(((INCO_DOCS.length - trimmed.length) / INCO_DOCS.length) * 100);

  console.warn(
    `[TOKEN_BUDGET] Docs truncated: kept ${trimmed.length}/${INCO_DOCS.length} chars ` +
    `(~${droppedPct}% dropped). Doc budget was ${availableForDocs} tokens.`
  );

  return {
    docs:
      trimmed +
      "\n\n[INCO DOCS TRUNCATED — token budget limit reached. " +
      "Switch to llama-3.1-8b-instant for 20K TPM and more doc coverage.]",
    truncated: true,
  };
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

const FHE_SYSTEM_PROMPT = `You are an elite Senior Web3 Smart Contract Architect and Inco Lightning FHE Specialist.

Your #1 priority is writing secure, correct Inco contracts. You have ZERO tolerance for FHE mistakes. Breaking the rules below is unacceptable.

=== ABSOLUTE FHE RULES (NEVER VIOLATE) ===

1. NEVER branch on encrypted data
   - Forbidden: if(), require(), revert(), or any control flow using ebool or euint256.
   - Never use .unwrap() on ebool or euint256 for decisions.
   - Always use the multiplexer pattern instead.

2. ALWAYS use the multiplexer pattern for conditionals
   Correct example:
   ebool canDo = e.ge(balance, amount);
   euint256 actual = e.select(canDo, amount, e.asEuint256(0));

3. NEW HANDLES REQUIRE IMMEDIATE PERMISSIONS
   Every FHE operation (e.add, e.sub, e.select, e.newEuint256, e.asEuint256, etc.) creates a NEW handle.
   After ANY new handle assignment, you MUST immediately call:
   e.allow(newHandle, address(this));
   e.allow(newHandle, user);   // only when the user needs decryption rights

   Forgetting e.allow() is the #1 reason Inco contracts become permanently bricked.

4. Fee Handling
   - Never hardcode fees (no 0.01 ether, no constant FEE).
   - Prefer contract holding ETH via receive() external payable {}.
   - When charging user: require(msg.value >= inco.getFee(), "Insufficient Inco fee");

5. Events & Privacy
   - Never emit euint256 or ebool in events. Only emit public metadata (e.g. user address, event type).

6. Empty / Uninitialized Check
   Correct: if (euint256.unwrap(balances[user]) == bytes32(0))
   Best practice: Combine with mapping(address => bool) public isRegistered;

7. Withdrawals / Claims
   - Never use e.reveal().
   - Always use the Attestation Pattern with DecryptionAttestation.

=== GENERAL REQUIREMENTS ===

- Always start every contract with: using e for *;
- Use correct imports:
  import {inco, e, ebool, euint256} from "@inco/lightning/src/Lib.sol";
  import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

- Limit FHE-heavy loops (max 50 iterations recommended).

=== OUTPUT FORMAT (STRICTLY FOLLOW) ===

Always respond using exactly this structure:

## 📋 What I'm Building
[Short summary]

## ⚠️ Security Notes
[Bullet points of Inco-specific risks and how you mitigated them]

## 📦 Imports Required
[Code block with all necessary imports]

## 🔐 Contract Code
[Full, clean Solidity code]

## 🧪 Test Snippet
[Minimal test example]

## 🔗 JS SDK Integration
[TypeScript snippet for frontend]

## 💡 Inco Primitives Used
[Simple table: Primitive | Type | Purpose]

## ✅ e.allow() Audit
[List every e.allow() call you added with explanation]

If the user requests something that violates these rules, politely correct them and show the right way.

Prioritize correctness, safety, and Inco best practices above all else.`;


// Computed once at startup — used for per-request doc budget calculation
const BASE_SYSTEM_PROMPT_TOKENS = estimateTokens(FHE_SYSTEM_PROMPT) + 60; // +60 for chain suffix

/**
 * Build the final system prompt for a specific request.
 * Docs are sized per-request based on the remaining token budget.
 */
function buildSystemPrompt(
  model: AllowedModel,
  chain: "evm" | "svm",
  historyTokens: number,
  promptTokens: number
): { systemPrompt: string; docsTruncated: boolean } {
  const chainSuffix =
    chain === "evm"
      ? "\n\nTARGET CHAIN: EVM — Generate Solidity ^0.8.28 using Hardhat. Import from @inco/lightning/src/Lib.sol."
      : "\n\nTARGET CHAIN: SVM — Generate Rust with Anchor framework using Inco SVM bindings.";

  const { docs, truncated } = fitDocsToTokenBudget(
    model, BASE_SYSTEM_PROMPT_TOKENS, historyTokens, promptTokens
  );

  const docsSection = docs
    ? `\n\n${"=".repeat(60)}\nINCO DOCUMENTATION — USE AS YOUR SOLE REFERENCE:\n${"=".repeat(60)}\n${docs}`
    : "\n\n[WARNING: Inco docs omitted — insufficient token budget. Generate from training knowledge only.]";

  return {
    systemPrompt: FHE_SYSTEM_PROMPT + docsSection + chainSuffix,
    docsTruncated: truncated,
  };
}

// ─────────────────────────────────────────────
// ERROR CLASSIFICATION
// ─────────────────────────────────────────────

type AIErrorType = "REQUEST_TOO_LARGE" | "RATE_LIMITED" | "QUOTA_EXHAUSTED" | "OTHER";

interface ClassifiedError {
  type: AIErrorType;
  httpStatus: number;
  userMessage: string;
  hint?: string;
  retryAfter?: number;
}

/**
 * Precisely classify an AI error (NVIDIA NIM / OpenAI spec).
 */
function classifyAIError(error: any): ClassifiedError {
  const msg: string    = (error?.message ?? "").toLowerCase();
  const rawMsg: string = error?.message ?? "";
  const status: number = error?.status ?? 500;

  const isTooLarge =
    status === 413 ||
    msg.includes("request too large") ||
    msg.includes("context_length_exceeded") ||
    msg.includes("tokens per minute");

  const isQuota =
    status === 429 && (msg.includes("quota") || msg.includes("insufficient_quota"));

  const isRateLimit =
    status === 429 && !isQuota && (msg.includes("rate") || msg.includes("too many requests"));

  if (isTooLarge) {
    return {
      type:        "REQUEST_TOO_LARGE",
      httpStatus:  413,
      userMessage: `Request too large. The Inco docs are being auto-trimmed, but your conversation history may still be too large.`,
      hint:        `Try clearing your chat history or starting a new session.`,
    };
  }
  if (isQuota) {
    return {
      type:        "QUOTA_EXHAUSTED",
      httpStatus:  429,
      userMessage: "NVIDIA API Quota exhausted. Please check your billing/credits.",
    };
  }
  if (isRateLimit) {
    return {
      type:        "RATE_LIMITED",
      httpStatus:  429,
      userMessage: "NVIDIA NIM rate limit hit. Wait a few seconds and try again.",
      retryAfter:  5,
    };
  }
  return {
    type:        "OTHER",
    httpStatus:  status >= 400 ? status : 500,
    userMessage: error?.message ?? "An unexpected error occurred during AI generation.",
  };
}

// ─────────────────────────────────────────────
// AI CLIENTS — singletons
// ─────────────────────────────────────────────

let nvidiaClient: OpenAI | null = null;

function getNvidiaClient(): OpenAI {
  if (!nvidiaClient) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY is not set in environment variables.");
    nvidiaClient = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
    console.log("[INCODE_SERVER] NVIDIA NIM client initialized.");
  }
  return nvidiaClient;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sanitizeHistory(
  history: unknown[]
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m: any) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((m: any) => ({
      role:    m.role    as "user" | "assistant",
      content: m.content as string,
    }));
}

// ─────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────

async function startServer() {
  const app = express();

  console.log(`[INCODE_SERVER] Starting in ${process.env.NODE_ENV ?? "development"} mode`);

  app.use(express.json({ limit: "1mb" }));

  app.use((req, _res, next) => {
    console.log(`[SERVER_LOG] ${req.method} ${req.url}`);
    next();
  });

  const apiRouter = express.Router();

  // ── Health ────────────────────────────────

  apiRouter.get("/health", (_req, res) => {
    res.json({
      status:           "ok",
      uptime:           process.uptime(),
      defaultModel:     DEFAULT_MODEL,
      modelTPM:         MODEL_CONFIG[DEFAULT_MODEL].tpm,
      docsLoaded:       INCO_DOCS.length > 0,
      docsChars:        INCO_DOCS.length,
      docsTokensEst:    estimateTokens(INCO_DOCS),
      basePromptTokens: BASE_SYSTEM_PROMPT_TOKENS,
      docHeadroomTokens:
        MODEL_CONFIG[DEFAULT_MODEL].tpm - MAX_OUTPUT_TOKENS - BASE_SYSTEM_PROMPT_TOKENS - 200,
    });
  });

  // ── Models ────────────────────────────────

  apiRouter.get("/models", (_req, res) => {
    res.json({
      models: ALLOWED_MODELS.map((id) => ({ 
        id, 
        label: MODEL_CONFIG[id].label,
        default: MODEL_CONFIG[id].default,
        provider: 'nvidia'
      })),
    });
  });

  // ── Generate ──────────────────────────────

  apiRouter.post("/generate", async (req, res) => {
    console.log("[INCODE_GATEWAY] Received generate request → NVIDIA NIM DeepSeek");

    const { prompt, chain = "evm", history = [], modelId } = req.body;

    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "INVALID_PROMPT", message: "Prompt is required." });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        error:   "PROMPT_TOO_LONG",
        message: `Prompt must be under ${MAX_PROMPT_LENGTH} chars. Yours is ${prompt.length}.`,
      });
    }
    if (chain !== "evm" && chain !== "svm") {
      return res.status(400).json({ error: "INVALID_CHAIN", message: 'Chain must be "evm" or "svm".' });
    }

    // Model selection
    const safeModel: AllowedModel =
      typeof modelId === "string" && ALLOWED_MODELS.includes(modelId as AllowedModel)
        ? (modelId as AllowedModel)
        : DEFAULT_MODEL;

    // Sanitize + cap history
    const safeHistory    = sanitizeHistory(history);
    const historyTokens  = estimateTokens(safeHistory.map((m) => m.content).join(" "));
    const promptTokens   = estimateTokens(prompt);

    // Build token-budget-aware system prompt
    const { systemPrompt, docsTruncated } = buildSystemPrompt(
      safeModel, chain, historyTokens, promptTokens
    );

    console.log(
      `[INCODE_GATEWAY] model=${safeModel} chain=${chain} ` +
      `history_turns=${safeHistory.length} ≈${historyTokens}tk ` +
      `prompt≈${promptTokens}tk docs_truncated=${docsTruncated}`
    );

    // NVIDIA client
    let nvidia: OpenAI;
    try {
      nvidia = getNvidiaClient();
    } catch {
      return res.status(500).json({
        error:   "NVIDIA_API_KEY_MISSING",
        message: "NVIDIA_API_KEY is not configured. Add it to your settings.",
      });
    }

    // Stream
    try {
      res.setHeader("Content-Type",      "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-Model-Used",      safeModel);
      res.setHeader("X-Chain",           chain);
      res.setHeader("X-Docs-Truncated",  String(docsTruncated));

      const stream = await nvidia.chat.completions.create({
        model:       safeModel,
        stream:      true,
        temperature: 0.2,
        max_tokens:  MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system",    content: systemPrompt },
          ...safeHistory,
          { role: "user",      content: prompt.trim() },
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) res.write(text);
      }

      res.end();
      console.log(`[INCODE_GATEWAY] NVIDIA NIM stream complete — model=${safeModel} chain=${chain}`);

    } catch (error: any) {
      console.error("[NVIDIA_NIM_ERROR]", error?.message || error);

      const classified = classifyAIError(error);

      if (!res.headersSent) {
        return res.status(classified.httpStatus).json({
          error:      "NVIDIA_NIM_FAILURE",
          message:    error?.message || "Failed to connect to NVIDIA NIM",
          hint:       "Make sure your NVIDIA_API_KEY is correct and has access to the model.",
          retryAfter: classified.retryAfter ?? null,
        });
      } else {
        // Stream already started
        res.write(`\n\n[[ERROR]] NVIDIA NIM Error: ${error?.message || "Unknown error"}`);
        res.end();
      }
    }
  });

  app.use("/api", apiRouter);

  // ─── VITE / STATIC ───────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ─── START ───────────────────────────────

  app.listen(PORT, "0.0.0.0", () => {
    const docsStatus = INCO_DOCS.length > 0
      ? `✅  ${INCO_DOCS.length} chars (~${estimateTokens(INCO_DOCS)} tokens)`
      : "⚠️   Not found — place inco_context.txt in project root";

    const headroom =
      MODEL_CONFIG[DEFAULT_MODEL].tpm -
      MAX_OUTPUT_TOKENS -
      BASE_SYSTEM_PROMPT_TOKENS -
      200;

    console.log(`\n✅  INCOde server → http://0.0.0.0:${PORT}`);
    console.log(`    Mode           : ${process.env.NODE_ENV ?? "development"}`);
    console.log(`    Default model  : ${DEFAULT_MODEL}`);
    console.log(`    Model TPM      : ${MODEL_CONFIG[DEFAULT_MODEL].tpm} tokens`);
    console.log(`    Max output     : ${MAX_OUTPUT_TOKENS} tokens`);
    console.log(`    Base prompt    : ~${BASE_SYSTEM_PROMPT_TOKENS} tokens`);
    console.log(`    Doc headroom   : ~${headroom} tokens on default model`);
    console.log(`    Inco docs      : ${docsStatus}`);
    console.log(`    NVIDIA key     : ${process.env.NVIDIA_API_KEY ? "✅  Set" : "❌  Missing"}\n`);
  });
}

startServer();