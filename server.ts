// server.ts
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

const PORT = Number(process.env.PORT) || 3000;
const NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

const MAX_PROMPT_LENGTH = 16000;
const MAX_HISTORY_TURNS = 12;
const MAX_OUTPUT_TOKENS = 8192;

// ─────────────────────────────────────────────
// MODEL CONFIG
// ─────────────────────────────────────────────

const MODEL_CONFIG = {
  "deepseek-ai/deepseek-v3": {
    label: "DeepSeek V3 (Fast & Balanced)",
    tpm: 100000,
    default: true,
  },
  "deepseek-ai/deepseek-r1": {
    label: "DeepSeek R1 (Strong Reasoning)",
    tpm: 64000,
    default: false,
  },
} as const;

type AllowedModel = keyof typeof MODEL_CONFIG;
const DEFAULT_MODEL: AllowedModel = "deepseek-ai/deepseek-v3";

// ─────────────────────────────────────────────
// LOAD INCO DOCUMENTATION
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
      console.log(`[INCODE_SERVER] Loaded Inco docs: ${filePath} (${content.length} chars)`);
      return content;
    }
  }
  console.warn("[INCODE_SERVER] ⚠️ No inco_context.txt found. Place it in project root.");
  return "";
}

const INCO_DOCS = loadIncoDocs();

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function fitDocsToTokenBudget(
  model: AllowedModel,
  basePromptTokens: number,
  historyTokens: number,
  promptTokens: number
): { docs: string; truncated: boolean } {
  const tpm = MODEL_CONFIG[model].tpm;
  const safetyBuffer = 200;
  const availableForDocs = tpm - MAX_OUTPUT_TOKENS - basePromptTokens - historyTokens - promptTokens - safetyBuffer;

  if (availableForDocs <= 0) {
    return { docs: "", truncated: true };
  }

  const maxDocChars = availableForDocs * 4;

  if (INCO_DOCS.length <= maxDocChars) {
    return { docs: INCO_DOCS, truncated: false };
  }

  let cutPoint = maxDocChars;
  const lastNewline = INCO_DOCS.lastIndexOf("\n", cutPoint);
  if (lastNewline > maxDocChars * 0.8) cutPoint = lastNewline;

  const trimmed = INCO_DOCS.slice(0, cutPoint);

  return {
    docs: trimmed + "\n\n[INCO DOCS TRUNCATED — Token budget limit reached.]",
    truncated: true,
  };
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

const FHE_SYSTEM_PROMPT = `You are an elite Senior Web3 Smart Contract Architect and Inco Lightning FHE Specialist.

Your #1 priority is writing secure, correct Inco contracts. You have ZERO tolerance for FHE mistakes.

=== ABSOLUTE FHE RULES (NEVER VIOLATE) ===

1. NEVER branch on encrypted data
   - Forbidden: if(), require(), revert() based on ebool or euint256.
   - Never use .unwrap() on ebool for control flow.

2. ALWAYS use multiplexer pattern:
   ebool canDo = e.ge(balance, amount);
   euint256 actual = e.select(canDo, amount, e.asEuint256(0));

3. NEW HANDLES REQUIRE IMMEDIATE e.allow()
   After every e.add, e.sub, e.select, e.newEuint256, e.asEuint256, you MUST call:
   e.allow(newHandle, address(this));
   e.allow(newHandle, user);   // if user needs decryption

4. Never hardcode fees. Use inco.getFee() or let contract hold ETH.

5. Never emit euint256 or ebool in events.

6. Empty check: if (euint256.unwrap(balances[user]) == bytes32(0))

7. Use Attestation Pattern for withdrawals. Never use e.reveal().

Always start with: using e for *;
Use correct Inco imports.

=== OUTPUT FORMAT (STRICTLY FOLLOW) ===

## 📋 What I'm Building
[Short summary]

## ⚠️ Security Notes
[Bullet points]

## 📦 Imports Required
[Code block]

## 🔐 Contract Code
[Full Solidity code]

## 🧪 Test Snippet
[Test code]

## 🔗 JS SDK Integration
[TypeScript snippet]

## 💡 Inco Primitives Used
[Table]

## ✅ e.allow() Audit
[List every e.allow() with explanation]

If user request violates rules, correct them politely.`;

const BASE_SYSTEM_PROMPT_TOKENS = estimateTokens(FHE_SYSTEM_PROMPT) + 60;

// Build system prompt with docs
function buildSystemPrompt(
  model: AllowedModel,
  chain: "evm" | "svm",
  historyTokens: number,
  promptTokens: number
): { systemPrompt: string; docsTruncated: boolean } {
  const chainSuffix = chain === "evm"
    ? "\n\nTARGET CHAIN: EVM — Generate Solidity ^0.8.28"
    : "\n\nTARGET CHAIN: SVM — Generate Rust with Anchor";

  const { docs, truncated } = fitDocsToTokenBudget(model, BASE_SYSTEM_PROMPT_TOKENS, historyTokens, promptTokens);

  const docsSection = docs
    ? `\n\n${"=".repeat(60)}\nINCO DOCUMENTATION — USE AS YOUR SOLE REFERENCE:\n${"=".repeat(60)}\n${docs}`
    : "\n\n[WARNING: Inco docs omitted due to token budget.]";

  return {
    systemPrompt: FHE_SYSTEM_PROMPT + docsSection + chainSuffix,
    docsTruncated: truncated,
  };
}

// ─────────────────────────────────────────────
// NVIDIA CLIENT
// ─────────────────────────────────────────────

let nvidiaClient: OpenAI | null = null;

function getNvidiaClient(): OpenAI {
  if (!nvidiaClient) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY is not set");
    nvidiaClient = new OpenAI({
      apiKey,
      baseURL: NVIDIA_NIM_BASE_URL,
    });
    console.log("[INCODE_SERVER] NVIDIA NIM client initialized");
  }
  return nvidiaClient;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sanitizeHistory(history: unknown[]) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => m?.role && m?.content)
    .slice(-MAX_HISTORY_TURNS)
    .map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));
}

// ─────────────────────────────────────────────
// SERVER SETUP
// ─────────────────────────────────────────────

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  app.use((req, res, next) => {
    console.log(`[SERVER_LOG] ${req.method} ${req.url}`);
    next();
  });

  const apiRouter = express.Router();

  // Health Check
  apiRouter.get("/health", (_, res) => {
    res.json({ status: "ok" });
  });

  // Models endpoint (critical for frontend)
  apiRouter.get("/models", (_, res) => {
    res.json({
      models: Object.keys(MODEL_CONFIG).map((id) => ({
        id,
        label: MODEL_CONFIG[id as AllowedModel].label,
        default: MODEL_CONFIG[id as AllowedModel].default,
      })),
    });
  });

  // Generate endpoint
  apiRouter.post("/generate", async (req, res) => {
    console.log("[INCODE_GATEWAY] Received generate request");

    const { prompt, chain = "evm", history = [], modelId } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "INVALID_PROMPT", message: "Prompt is required" });
    }

    const safeModel: AllowedModel = ALLOWED_MODELS.includes(modelId) ? modelId : DEFAULT_MODEL;
    const safeHistory = sanitizeHistory(history);
    const historyTokens = estimateTokens(safeHistory.map(m => m.content).join(" "));
    const promptTokens = estimateTokens(prompt);

    const { systemPrompt, docsTruncated } = buildSystemPrompt(safeModel, chain, historyTokens, promptTokens);

    let client: OpenAI;
    try {
      client = getNvidiaClient();
    } catch (err) {
      return res.status(500).json({ error: "NVIDIA_API_KEY_MISSING", message: "NVIDIA_API_KEY not configured" });
    }

    try {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-Model-Used", safeModel);

      const stream = await client.chat.completions.create({
        model: safeModel,
        stream: true,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system", content: systemPrompt },
          ...safeHistory,
          { role: "user", content: prompt.trim() },
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) res.write(text);
      }

      res.end();
    } catch (error: any) {
      console.error("[NVIDIA_NIM_ERROR]", error?.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "GENERATION_FAILED", message: error.message });
      } else {
        res.write(`\n\n[[ERROR]] ${error.message}`);
        res.end();
      }
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ INCOde Server running on http://0.0.0.0:${PORT}`);
    console.log(`    Default Model : ${DEFAULT_MODEL}`);
    console.log(`    NVIDIA Key    : ${process.env.NVIDIA_API_KEY ? "✅ Set" : "❌ Missing"}`);
  });
}

startServer();