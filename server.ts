import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`[INCODE_SERVER] Starting in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[INCODE_SERVER] GROQ_API_KEY defined: ${!!process.env.GROQ_API_KEY}`);

  app.use(express.json());

  // Global Logger
  app.use((req, res, next) => {
    console.log(`[SERVER_LOG] ${req.method} ${req.url}`);
    next();
  });

  // API Router
  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    console.log("[API] Health check");
    res.json({ status: "ok", uptime: process.uptime() });
  });

  apiRouter.post("/generate", async (req, res) => {
    console.log("[INCODE_GATEWAY] Received Generate Request");
    console.log("[API] Generate request body keys:", Object.keys(req.body));
    const { 
      prompt, 
      chain, 
      history = [],
      includeTests,
      includeSDK,
      includeNatspec,
      modelId = "llama-3.3-70b-versatile"
    } = req.body;
    
    console.log(`[INCODE_GATEWAY] Incoming Transmission: Chain=${chain}, Model=${modelId}, History=${history.length}, PromptLength=${prompt?.length}`);

    // Strictly use the Groq key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[INCODE_GATEWAY] CRITICAL_ERROR: GROQ_API_KEY IS NULL");
      return res.status(500).json({ 
        error: "GATEWAY_LOCK: GROQ_API_KEY_MISSING",
        message: "Please add your GROQ_API_KEY in the Settings menu." 
      });
    }

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const groq = new Groq({ apiKey });
      const systemInstruction = `You are INCODE, a Senior Web3 Smart Contract Architect specialized in Confidential Computing on the Inco Network using Fully Homomorphic Encryption (FHE) in Solidity.
Target: ${chain === "evm" ? "EVM (Solidity ^0.8.28)" : "SVM (Rust/Anchor)"}

CORE FHE CONSTRAINTS (ABSOLUTE RULES):
1. NEVER Branch on Encrypted Data: Strictly forbidden to use if/else, require(), or control flow based on encrypted values (ebool, euint, etc.).
2. ALWAYS Use Multiplexer Pattern: Use e.select(condition, ifTrue, ifFalse) for all conditional logic.
3. Handle Management: Every FHE operation produces a brand new handle. You MUST call e.allow(newHandle, address(this)) and e.allow(newHandle, owner) after any assignment.
4. Uninitialized State: Check for empty handles using euint256.unwrap(balances[user]) == bytes32(0).
5. Fee Handling: Functions using e.newEuintXX() MUST charge fees using inco.getFee(). Use dynamic checks: require(msg.value >= inco.getFee() * n, "Insufficient fee").
6. Decryption & Attestations: Use the co-processor pattern. Verify attestations via inco.incoVerifier().isValidDecryptionAttestation(decryption, signatures).

OPERATIONAL GUIDELINES:
- Always use 'using e for *;'
- EVM Library: "@inco/lightning/src/Lib.sol"
- Access Control: Use allow, allowThis, reveal, and isAllowed.
- Gas Management: Limit batch operations since FHE ops are heavy.

OUTPUT FORMAT (STRICTLY REQUIRED):
## 📋 What I'm Building
[Project Summary]
## ⚠️ Security Notes
[FHE-specific risks and mitigations]
## 🔐 Contract Code (First block)
[Complete, secure Solidity code with NatSpec]
## 🧪 Test Snippet (Second block)
[Use IncoTest cheatcodes: fakePrepareEuint256Ciphertext, processAllOperations, getUint256Value]
## 🔗 JS SDK Integration (Third block)
[Use @inco/js/lite, zap.encrypt, zap.attestedDecrypt]
## 💡 Inco Primitives Used
[Summary of operations used]
`;
      
      const stream = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: prompt }
        ],
        model: modelId,
        stream: true,
      });

      console.log("[INCODE_GATEWAY] Starting stream from Groq...");
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        res.write(text);
      }
      res.end();
      console.log("[INCODE_GATEWAY] Transmission Complete.");
    } catch (error: any) {
      console.error("[INCODE_GATEWAY] Internal Failure:", error);
      
      // Check if headers have already been sent
      if (!res.headersSent) {
        if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
          res.status(429).json({ error: "QUOTA_EXCEEDED", message: "GROQ_API_QUOTA_REACHED. PLEASE_WAIT." });
        } else {
          res.status(500).json({ error: "GATEWAY_FAILURE", message: error.message });
        }
      } else {
        // If headers were sent, we can only write to the stream
        res.write(`\n\nERROR: ${error.message}`);
      }
      res.end();
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
