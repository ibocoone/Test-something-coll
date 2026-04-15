import { ethers } from 'ethers';
import axios from 'axios';
import { OS_GQL, HEADERS, agent, buildBatchMintQuery } from './opensea';

export interface SniperConfig {
    wallets: ethers.Wallet[];
    contract: string;
    chain: string;
    chainId: number;
    quantity: string;
    authCookie: string;
    dryRun: boolean;
    onLog: (msg: string) => void;
}

export class SniperEngine {
    private config: SniperConfig;
    private isRunning: boolean = false;
    private nonces: Map<string, number> = new Map();

    constructor(config: SniperConfig) {
        this.config = config;
    }

    private log(msg: string) {
        this.config.onLog(msg);
    }

    async warmUp() {
        this.log("🌡️ Warming up (Nonces & Connections)...");
        await Promise.all(this.config.wallets.map(async (w) => {
            const n = await w.provider!.getTransactionCount(w.address, "pending");
            this.nonces.set(w.address, n);
            this.log(`✅ Nonce for ${w.address.substring(0, 6)}...: ${n}`);
        }));
        
        // Keep-alive ping
        try {
            await axios.post(OS_GQL, { query: "{ viewer { id } }" }, { 
                headers: { ...HEADERS, "cookie": this.config.authCookie },
                httpsAgent: agent 
            } as any);
            this.log("📡 Connection warmed up.");
        } catch (e) {
            this.log("⚠️ Connection warm-up failed, but continuing...");
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log("🔥 Sniper Engine started. Hammering OpenSea...");

        const batchPayload = buildBatchMintQuery(
            this.config.wallets.map(w => w.address),
            this.config.contract,
            this.config.chain,
            this.config.quantity
        );

        while (this.isRunning) {
            try {
                const res = await axios.post(OS_GQL, batchPayload, {
                    headers: { ...HEADERS, "cookie": this.config.authCookie },
                    httpsAgent: agent,
                    timeout: 2000
                } as any);

                const data = (res.data as any).data;
                const errors = (res.data as any).errors;

                if (errors && errors.length > 0) {
                    const msg = errors[0].message;
                    if (msg.includes("DropNotMintingError")) {
                        // Silent retry for timing
                    } else {
                        this.log(`❌ GQL Error: ${msg}`);
                        if (msg.includes("allowlist") || msg.includes("balance") || msg.includes("Unauthorized")) {
                            this.isRunning = false;
                            break;
                        }
                    }
                }

                if (data && data.w0 && data.w0.actions) {
                    this.log("🎯 CALDATA RECEIVED!");
                    
                    if (this.config.dryRun) {
                        this.log("🧪 DRY RUN: Skipping transaction broadcast.");
                        this.log(`📦 Calldata Sample: ${data.w0.actions[0].transactionSubmissionData.data.substring(0, 64)}...`);
                        this.isRunning = false;
                        break;
                    }

                    this.log("🚀 Broadcasting transactions...");
                    const txPromises = this.config.wallets.map((wallet, index) => {
                        const actionData = data[`w${index}`]?.actions?.[0]?.transactionSubmissionData;
                        
                        if (actionData) {
                            const tx = {
                                to: actionData.to,
                                data: actionData.data,
                                value: actionData.value,
                                nonce: this.nonces.get(wallet.address),
                                maxPriorityFeePerGas: ethers.parseUnits("50", "gwei"), 
                                maxFeePerGas: ethers.parseUnits("100", "gwei"),
                                type: 2,
                                chainId: this.config.chainId
                            };

                            return wallet.sendTransaction(tx).then(res => {
                                this.log(`🚀 Tx sent for ${wallet.address.substring(0, 6)}: ${res.hash}`);
                                return res;
                            }).catch(err => {
                                this.log(`❌ Tx failed for ${wallet.address.substring(0, 6)}: ${err.message}`);
                            });
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(txPromises);
                    this.isRunning = false;
                    this.log("🏁 Sniping complete.");
                    break;
                }
            } catch (e: any) {
                // Ignore DropNotMintingError and keep hammering
                if (e.response?.data?.errors?.[0]?.message?.includes("DropNotMintingError")) {
                    // Silent retry
                } else {
                    this.log(`⚠️ Hammering error: ${e.message}`);
                    // Small delay on other errors to prevent infinite crash loop
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }
    }

    stop() {
        this.isRunning = false;
        this.log("🛑 Sniper Engine stopped.");
    }
}
