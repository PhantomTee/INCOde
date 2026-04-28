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
const MAX_HISTORY_TURNS = 10;
const MAX_OUTPUT_TOKENS = 8192;

// ====================== MODEL CONFIG ======================
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

// ====================== LOAD INCO DOCS ======================
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
  console.warn("[INCODE_SERVER] No inco_context.txt found.");
  return "";
}

const INCO_DOCS = loadIncoDocs();

// ====================== HELPERS ======================
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sanitizeHistory(history: unknown[]) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => m?.role && typeof m.content === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

// ====================== NVIDIA CLIENT ======================
let nvidiaClient: OpenAI | null = null;

function getNvidiaClient(): OpenAI {
  if (!nvidiaClient) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY is not set in .env");
    nvidiaClient = new OpenAI({
      apiKey,
      baseURL: NVIDIA_NIM_BASE_URL,
    });
    console.log("[INCODE_SERVER] NVIDIA NIM client initialized");
  }
  return nvidiaClient;
}

// ====================== SERVER ======================
async function startServer() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  // Simple logger
  app.use((req, res, next) => {
    console.log(`[SERVER_LOG] ${req.method} ${req.url}`);
    next();
  });

  const apiRouter = express.Router();

  // Health
  apiRouter.get("/health", (_, res) => res.json({ status: "ok" }));

  // Models (This was missing / returning 404)
  apiRouter.get("/models", (_, res) => {
    res.json({
      models: Object.keys(MODEL_CONFIG).map((id) => ({
        id,
        label: MODEL_CONFIG[id as AllowedModel].label,
        default: MODEL_CONFIG[id as AllowedModel].default,
      })),
    });
  });

  // Generate
  apiRouter.post("/generate", async (req, res) => {
    console.log("[INCODE_GATEWAY] Received generate request");

    const { prompt, chain = "evm", history = [], modelId } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "INVALID_PROMPT", message: "Prompt is required" });
    }

    const safeModel: AllowedModel = Object.keys(MODEL_CONFIG).includes(modelId)
      ? (modelId as AllowedModel)
      : DEFAULT_MODEL;

    const safeHistory = sanitizeHistory(history);

    try {
      const client = getNvidiaClient();

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      const stream = await client.chat.completions.create({
        model: safeModel,
        stream: true,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system", content: "You are a helpful assistant." }, // Replace with your full FHE prompt later
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
      console.error("[GENERATE_ERROR]", error?.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "GENERATION_FAILED", message: error.message });
      } else {
        res.write(`\n\n[[ERROR]] ${error.message}`);
        res.end();
      }
    }
  });

  app.use("/api", apiRouter);

  // Development + Production handling
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
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();