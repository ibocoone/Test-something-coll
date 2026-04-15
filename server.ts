import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { generateNonce, verifyOwnership } from "./src/lib/opensea";
import { SniperEngine } from "./src/lib/sniper";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let engine: SniperEngine | null = null;
  const logs: string[] = [];

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    logs.push(logMsg);
    if (logs.length > 100) logs.shift();
    console.log(logMsg);
  };

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({
      privateKeys: process.env.PRIVATE_KEYS || "[]",
      rpcUrl: process.env.RPC_URL || "https://mainnet.base.org",
      dropSlug: process.env.DROP_SLUG || "",
      nftContract: process.env.NFT_CONTRACT || "",
      chainId: parseInt(process.env.CHAIN_ID || "8453"),
      chainName: process.env.CHAIN_NAME || "base"
    });
  });

  app.get("/api/logs", (req, res) => {
    res.json({ logs });
  });

  app.post("/api/auth", async (req, res) => {
    try {
      const { privateKey, chainId } = req.body;
      const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      addLog(`🔐 Authenticating for ${wallet.address.substring(0, 6)}...`);
      const nonce = await generateNonce(wallet.address);
      const cookie = await verifyOwnership(wallet, nonce, chainId);
      
      if (cookie) {
        addLog(`✅ Authentication successful for ${wallet.address.substring(0, 6)}...`);
        res.json({ success: true, cookie });
      } else {
        throw new Error("Failed to get auth cookie");
      }
    } catch (error: any) {
      addLog(`❌ Auth error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/start", async (req, res) => {
    try {
      const { privateKeys, contract, chain, chainId, quantity, authCookie, dryRun } = req.body;
      
      const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallets = privateKeys.map((pk: string) => new ethers.Wallet(pk, provider));

      engine = new SniperEngine({
        wallets,
        contract,
        chain,
        chainId,
        quantity,
        authCookie,
        dryRun: !!dryRun,
        onLog: addLog
      });

      await engine.warmUp();
      // Start in background
      engine.start();
      
      res.json({ success: true });
    } catch (error: any) {
      addLog(`❌ Start error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/stop", (req, res) => {
    if (engine) {
      engine.stop();
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "No engine running" });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
