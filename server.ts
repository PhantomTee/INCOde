import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/generate", async (req, res) => {
    const { 
      prompt, 
      chain, 
      history = [], 
      includeNatspec, 
      includeTests, 
      includeSDK 
    } = req.body;
    
    console.log(`[INCODE_GATEWAY] Incoming Transmission: Chain=${chain}, History=${history.length}, PromptLength=${prompt?.length}`);

    // Strictly use the new key provided by the user
    const apiKey = process.env.GEMINIAPI_KEY1;

    if (!apiKey) {
      console.error("[INCODE_GATEWAY] CRITICAL_ERROR: GEMINIAPI_KEY1 IS NULL");
      return res.status(500).json({ error: "GATEWAY_LOCK: GEMINIAPI_KEY1_MISSING" });
    }

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", // Upgraded to 2.0 Flash for superior FHE code gen
        systemInstruction: `You are INCODE, an expert AI specialized in Confidential Computing for Inco Network.
Target: ${chain === "evm" ? "EVM (Solidity ^0.8.28)" : "SVM (Rust/Anchor)"}

Core Mission:
- Generate secure, encrypted smart contracts using Inco's FHE capabilities.
- EVM: Always import "@inco/lightning/Lib.sol". Use euint8, euint32, ebool.
- SVM: Use Inco SVM SDK for confidential state.
- If [IMPORTED_CONTRACT] segments are provided, prioritize migrating them to Inco FHE.

Parameters:
${includeNatspec ? "- ENFORCED: Use full NatSpec documentation." : "- Standard documentation."}
${includeTests ? "- ENFORCED: Include comprehensive integration test suites." : ""}
${includeSDK ? "- ENFORCED: Include SDK integration snippets." : ""}
`
      });
      
      const chat = model.startChat({
        history: history.map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      });

      const result = await chat.sendMessageStream(prompt);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        res.write(text);
      }
      res.end();
      console.log("[INCODE_GATEWAY] Transmission Complete.");
    } catch (error: any) {
      console.error("[INCODE_GATEWAY] Internal Failure:", error);
      res.status(500).write(`CRITICAL_GATEWAY_FAILURE: ${error.message}`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
