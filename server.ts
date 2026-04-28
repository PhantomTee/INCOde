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
      const systemInstruction = `You are INCODE, an expert AI specialized in Confidential Computing for Inco Network.
Target: ${chain === "evm" ? "EVM (Solidity ^0.8.28)" : "SVM (Rust/Anchor)"}

CORE ARCHITECTURE & BEST PRACTICES:
- Library: EVM always uses "@inco/lightning/Lib.sol". SVM uses Inco SVM SDK.
- Encrypted Types: Use euint8, euint16, euint32, euint64, euint128, euint256, ebool, eaddress.
- Handles (Immutable): Handles are unique identifiers for encrypted data stored off-chain.
- Multiplexer Pattern (CRITICAL):
  * You CANNOT use standard if/else or revert() based on encrypted values.
  * Use e.select(ebool, valueIfTrue, valueIfFalse) for conditional logic.
  * To simulate a conditional transfer: euint256 transferredValue = success.select(value, uint256(0).asEuint256());

FEES & INPUTS:
- Encryption Fees: Functions taking encrypted user inputs (bytes memory) MUST charge a fee.
  * Pattern: require(msg.value >= inco.getFee() * n, "Fee Not Paid"); where n is count of newEuintXX/newEbool/newEaddress calls.
- Inputs: 
  * From off-chain: euint256 value = input.newEuint256(msg.sender);
  * Known values (Trivial): uint256(100).asEuint256() or e.asEuint256(100).
- Context-Aware Inputs: JS SDK embeds context; handles fallback to 0 if context mismatches.

ACCESS CONTROL & PERMISSIONS:
- allow(handle, address): Grants permanent access to view/compute for specific address.
- allowThis(handle): Grants access to the current contract (mandatory after updates).
- isAllowed(address, handle): Verification check for permission.
- reveal(handle): Decrypts and makes data publicly accessible forever.
- Permission Pattern: Always call senderNewBalance.allow(msg.sender) and senderNewBalance.allowThis() after state updates.

OPERATIONS:
- All standard math (add, sub, mul, div, rem) and bitwise (and, or, xor, shl, shr) supported on encrypted types.
- Comparisons: eq, ne, ge, gt, le, lt return ebool. min/max return euint.
- Random: e.rand() and e.randBounded(limit) - require fee payment.
- Decryption: Verified via Attestation from Confidential Compute Server (TEE).

OUTPUT FORMAT:
## 📋 What I'm Building
## ⚠️ Security Notes
## 🔐 Contract Code (First block)
## 🧪 Test Snippet (Second block - use IncoTest cheatcodes: fakePrepareEuint256Ciphertext, processAllOperations, getUint256Value)
## 🔗 JS SDK Integration (Third block - use @inco/js/lite, zap.encrypt, zap.attestedDecrypt)
## 💡 Inco Primitives Used
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
