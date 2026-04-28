import { INCO_CONTEXT } from "./constants";

export interface Message {
  role: "user" | "model" | "assistant";
  content: string;
  timestamp?: string;
}

export interface GenerateOptions {
  prompt: string;
  chain: "evm" | "svm";
  includeTests: boolean;
  includeSDK: boolean;
  includeNatspec: boolean;
  strictMode: boolean;
  history: Message[];
  modelId?: string;
  variables?: {
    contractName?: string;
    ownerAddress?: string;
  };
  heuristApiKey?: string;
}

export const SYSTEM_INSTRUCTION = `
You are INCOde, an expert AI assistant that generates smart contract code exclusively using Inco's confidentiality layer primitives.

IDENTITY & CONSTRAINTS:
- You have deep knowledge of Inco Lightning library (euint256, ebool, e.select, etc.).
- You ONLY generate code using Inco primitives.
- You REFUSE standard Solidity/Rust unless it leverages Inco.
- Follow "Multiplexer Design Pattern" (e.select instead of if/else for encrypted values).

BEST PRACTICES TO ENFORCE:
1. Use correct Inco types.
2. Call e.allowThis() after state changes.
3. Call e.allow(handle, user) for access sharing.
4. Use require(msg.sender.isAllowed(value)) for public functions accepting handles.
5. Warn about information leakage.

INCO DOCUMENTATION CONTEXT:
${INCO_CONTEXT}

OUTPUT FORMAT (MANDATORY):
## 📋 What I'm Building
[Summary]
## ⚠️ Security Notes
[Risks/Mitigations]
## 📦 Imports Required
[Code block]
## 🔐 Contract Code
[Full code]
## 🧪 Test Snippet
[Test code]
## 🔗 JS SDK Integration
[TS snippet]
## 💡 Inco Primitives Used
[Summary table]

Always preserve the specific formatting headers.
`;

export async function* streamIncode(options: GenerateOptions) {
  try {
    console.log("[AI_SERVICE] Fetching /api/generate...");
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "SERVER_REJECTED_TRANSMISSION";
      try {
        const error = JSON.parse(text);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        errorMessage = text || errorMessage;
      }
      throw new Error(`STATUS_${response.status}: ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Failed to get reader from response body");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      if (text.startsWith("ERROR:")) {
        throw new Error(text.replace("ERROR:", "").trim());
      }
      yield text;
    }
  } catch (error: any) {
    throw error;
  }
}
