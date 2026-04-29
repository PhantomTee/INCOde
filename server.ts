// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const _cwd = process.cwd();

const PORT = Number(process.env.PORT) || 3000;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const MAX_PROMPT_LENGTH = 16000;
const MAX_HISTORY_TURNS = 12;

// ─────────────────────────────────────────────
// MODEL CONFIG
// ─────────────────────────────────────────────

const MODEL_CONFIG = {
  "deepseek/deepseek-chat": {
    label: "DeepSeek V3",
    default: true,
  },
} as const;

type AllowedModel = keyof typeof MODEL_CONFIG;
const ALLOWED_MODELS = Object.keys(MODEL_CONFIG) as AllowedModel[];
const DEFAULT_MODEL: AllowedModel = "deepseek/deepseek-chat";

// ─────────────────────────────────────────────
// LOAD INCO DOCUMENTATION
// ─────────────────────────────────────────────

function loadIncoDocs(): string {
  const candidates = [
    "./inco_context.txt",
    "./inco_context.md",
    path.join(_cwd, "inco_context.txt"),
    path.join(_cwd, "inco_context.md"),
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
// SYSTEM PROMPT
// ─────────────────────────────────────────────

const FHE_SYSTEM_PROMPT = `You are an elite Senior Web3 Smart Contract Architect and Inco Lightning FHE Specialist.
Your #1 priority is writing secure, correct Inco contracts. You have ZERO tolerance for FHE mistakes.

=== ABSOLUTE FHE RULES (NEVER VIOLATE) ===
NEVER branch on encrypted data
Forbidden: if(), require(), revert() based on ebool or euint256.
Never use .unwrap() on ebool for control flow.

ALWAYS use multiplexer pattern:
ebool canDo = e.ge(balance, amount);
euint256 actual = e.select(canDo, amount, e.asEuint256(0));

NEW HANDLES REQUIRE IMMEDIATE e.allow()
After every e.add, e.sub, e.select, e.newEuint256, e.asEuint256, you MUST call:
e.allow(newHandle, address(this));
e.allow(newHandle, user);   // if user needs decryption

Never hardcode fees. Use inco.getFee() or let contract hold ETH.
Never emit euint256 or ebool in events.
Empty check: if (euint256.unwrap(balances[user]) == bytes32(0))
Use Attestation Pattern for withdrawals. Never use e.reveal().

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

// Build system prompt with docs
function buildSystemPrompt(): string {
  return FHE_SYSTEM_PROMPT;
}

// ─────────────────────────────────────────────
// OPENROUTER CLIENT
// ─────────────────────────────────────────────

let openrouterClient: ReturnType<typeof createOpenAI> | null = null;

function getOpenRouterClient() {
  if (!openrouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    openrouterClient = createOpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
    });
    console.log("[INCODE_SERVER] OpenRouter client initialized");
  }
  return openrouterClient;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sanitizeHistory(history: unknown[]) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => m && m.role && m.content)
    .slice(-MAX_HISTORY_TURNS)
    .map((m: any) => ({
      role: (m.role === "model" || m.role === "assistant") ? "assistant" : "user",
      content: String(m.content),
    }));
}

// ─────────────────────────────────────────────
// SERVER SETUP
// ─────────────────────────────────────────────

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

  const { prompt, history = [] } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "INVALID_PROMPT", message: "Prompt is required" });
  }

  const safeHistory = sanitizeHistory(history) as { role: 'user' | 'assistant'; content: string }[];
  const systemPrompt = buildSystemPrompt();

  let openrouter;
  try {
    openrouter = getOpenRouterClient();
  } catch (err) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY_MISSING", message: "OPENROUTER_API_KEY not configured" });
  }

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Model-Used", "deepseek/deepseek-chat");

    const result = await streamText({
      model: openrouter("deepseek/deepseek-chat"),
      system: systemPrompt,
      messages: [
        ...safeHistory,
        { role: "user" as const, content: prompt.trim() },
      ],
      temperature: 0.1, // Low temperature for coding precision
    });

    for await (const chunk of result.textStream) {
      res.write(chunk);
    }

    res.end();
  } catch (error: any) {
    console.error("[OPENROUTER_ERROR]", error?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "GENERATION_FAILED", message: error.message });
    } else {
      res.write(`\n\n[[ERROR]] ${error.message}`);
      res.end();
    }
  }
});

app.use("/api", apiRouter);

// Vite middleware for development or fallback for production
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  (async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ INCOde Server running on http://0.0.0.0:${PORT} (Dev)`);
      console.log(`    Default Model : deepseek/deepseek-chat`);
      console.log(`    OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? "✅ Set" : "❌ Missing"}`);
    });
  })();
} else {
  // Production
  if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ INCOde Server running on http://0.0.0.0:${PORT} (Prod)`);
      console.log(`    Default Model : deepseek/deepseek-chat`);
      console.log(`    OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? "✅ Set" : "❌ Missing"}`);
    });
  }
}

export default app;