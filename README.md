# ⚡ INCOde

**High-Performance AI Coding Agent for Fully Homomorphic Encryption (FHE)**

INCOde is a specialized IDE and coding assistant optimized for building privacy-preserving decentralised applications on Inco Network. It leverages NVIDIA NIM specialized models (DeepSeek-V3/V4) to generate production-ready Solidity (EVM) and Rust (SVM) smart contracts with FHE capabilities.

## 🚀 Key Features

- **FHE Native**: Built-in knowledge of Inco's FHE library (`fhe-solidity`).
- **NVIDIA NIM Powered**: Ultra-fast, high-reasoning code generation.
- **Cross-Chain**: Support for both EVM (Inco) and SVM (Solana-style) development.
- **Secure by Design**: Retro-terminal UI emphasizing the encryption focus.
- **Full Project Export**: Export contracts, tests, and SDK snippets in a single ZIP.

## 🛠️ Deployment to Vercel

This project is ready for one-click deployment to Vercel.

1. **Environment Variables**:
   - `NVIDIA_API_KEY`: Your NVIDIA NIM API key from [NVIDIA Build](https://build.nvidia.com/).
   - `VITE_GEMINI_API_KEY`: (Optional) If using Gemini features.

2. **Setup**:
   - The project uses `express` as a custom server during development and as a Vercel Serverless Function in production.
   - Routing is handled via `vercel.json`.

3. **Deploy**:
   ```bash
   vercel deploy --prod
   ```

## 🏗️ Architecture

- **Frontend**: React 19 + Tailwind CSS 4 + Vite.
- **Backend**: Express.js + NVIDIA NIM OpenAI-compatible client.
- **Models**:
  - `deepseek-ai/deepseek-v3` (Balanced)
  - `deepseek-ai/deepseek-v4-pro` (Advanced Reasoning)

## 📄 License

MIT // Produced by INCOde Systems.
