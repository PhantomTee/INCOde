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
    const { prompt, chain, history, options } = req.body;
    
    console.log(`[GENERATE] Request received. Chain: ${chain}, History: ${history.length} msgs`);

    // Strictly use the new key provided by the user (shuaibthalhat54@gmail.com)
    const apiKey = process.env.GEMINIAPI_KEY1;

    if (!apiKey) {
      console.error("[GENERATE] Error: GEMINIAPI_KEY1 is missing.");
      return res.status(500).json({ error: "GEMINIAPI_KEY1 is not configured in the project settings." });
    }

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `You are INCODE, an expert AI specialized in Confidential Computing for Inco Network.
Target: ${chain === "evm" ? "EVM (Solidity ^0.8.28)" : "SVM (Rust/Anchor)"}

Core Mission:
- Generate secure, encrypted smart contracts using Inco's FHE (Fully Homomorphic Encryption) capabilities.
- EVM: Always import "@inco/lightning/Lib.sol". Use euint8, euint32, ebool.
- SVM: Use Inco SVM SDK for confidential state.
- If [IMPORTED_CONTRACT] segments are provided, analyze and prioritize migrating them to Inco FHE.

Code Style:
- Professional and secure.
${options.includeNatspec ? "- Use full NatSpec documentation." : ""}
${options.includeTests ? "- Include a comprehensive integration test suite." : ""}
${options.includeSDK ? "- Include SDK integration code snippets." : ""}
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
    } catch (error: any) {
      console.error("Generation Error:", error);
      res.status(500).write(`ERROR: ${error.message}`);
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
