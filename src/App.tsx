import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Shield, 
  Settings, 
  Terminal, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Wallet,
  Cpu
} from 'lucide-react';

interface Log {
  id: number;
  message: string;
}

export default function App() {
  const [privateKeys, setPrivateKeys] = useState<string>('[]');
  const [contract, setContract] = useState<string>('');
  const [chain, setChain] = useState<string>('base');
  const [chainId, setChainId] = useState<number>(8453);
  const [quantity, setQuantity] = useState<string>('1');
  const [authCookie, setAuthCookie] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.privateKeys !== "[]") setPrivateKeys(data.privateKeys);
        if (data.nftContract) setContract(data.nftContract);
        if (data.chainName) setChain(data.chainName);
        if (data.chainId) setChainId(data.chainId);
      } catch (e) {
        console.error("Failed to fetch config", e);
      }
    };
    fetchConfig();

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        setLogs(data.logs);
      } catch (e) {
        console.error("Failed to fetch logs", e);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const keys = JSON.parse(privateKeys);
      if (keys.length === 0) throw new Error("No private keys provided");
      
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: keys[0], chainId })
      });
      const data = await res.json();
      if (data.success) {
        setAuthCookie(data.cookie);
      } else {
        alert("Auth failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStart = async () => {
    try {
      const keys = JSON.parse(privateKeys);
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKeys: keys,
          contract,
          chain,
          chainId,
          quantity,
          authCookie,
          dryRun
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsRunning(true);
      } else {
        alert("Start failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsRunning(false);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0A0A0A] text-white font-mono">
      {/* Header */}
      <header className="h-10 border-b border-[#1F1F1F] bg-[#0F0F0F] flex items-center justify-between px-6 shrink-0">
        <div className="text-[#00FF41] font-bold tracking-[2px] text-xs">
          ZUN-OS-SNIPER // HIGH-FREQ
        </div>
        <div className="flex gap-8 text-[10px] text-[#666666]">
          <span>REGION: <b className="text-white">IAD (US-EAST-1)</b></span>
          <span>PING OS: <b className="text-white">7.8ms</b></span>
          <span>PING RPC: <b className="text-white">6.2ms</b></span>
          <span>SESSION: <b className={authCookie ? 'text-[#00FF41]' : 'text-[#FF3E3E]'}>{authCookie ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}</b></span>
          {dryRun && <span className="animate-pulse text-[#00FF41] border border-[#00FF41] px-2 py-0.5 rounded-[2px] font-black">SIMULATION MODE</span>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-[300px_1fr_280px] overflow-hidden">
        {/* Sidebar - Configuration */}
        <aside className="border-r border-[#1F1F1F] p-6 flex flex-col gap-6 overflow-y-auto scrollbar-thin">
          <section>
            <div className="text-[10px] uppercase text-[#666666] tracking-wider mb-4 border-l-2 border-[#00FF41] pl-2">
              Configuration
            </div>
            
            <div className="space-y-4">
              <div className="config-item">
                <label className="block text-[10px] text-[#666666] mb-1">PRIVATE KEYS (JSON)</label>
                <textarea 
                  value={privateKeys}
                  onChange={(e) => setPrivateKeys(e.target.value)}
                  className="w-full bg-black border border-[#1F1F1F] rounded px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-[#00FF41]/50 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#666666] mb-1">CHAIN</label>
                  <select 
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="w-full bg-black border border-[#1F1F1F] rounded px-3 py-2 text-[11px] focus:outline-none focus:border-[#00FF41]/50 appearance-none"
                  >
                    <option value="base">Base</option>
                    <option value="ethereum">Ethereum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#666666] mb-1">CHAIN ID</label>
                  <input 
                    type="number"
                    value={chainId}
                    onChange={(e) => setChainId(parseInt(e.target.value))}
                    className="w-full bg-black border border-[#1F1F1F] rounded px-3 py-2 text-[11px] focus:outline-none focus:border-[#00FF41]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] mb-1">CONTRACT</label>
                <input 
                  type="text"
                  value={contract}
                  onChange={(e) => setContract(e.target.value)}
                  className="w-full bg-black border border-[#1F1F1F] rounded px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-[#00FF41]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] mb-1">QUANTITY</label>
                <input 
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-black border border-[#1F1F1F] rounded px-3 py-2 text-[11px] focus:outline-none focus:border-[#00FF41]/50"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase text-[#666666] tracking-wider mb-4 border-l-2 border-[#00FF41] pl-2">
              Controls
            </div>
            <div className="space-y-2">
              <button 
                onClick={handleAuth}
                disabled={isAuthenticating || isRunning}
                className="w-full bg-[#1F1F1F] hover:bg-[#2A2A2A] disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                {isAuthenticating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                {authCookie ? 'RE-AUTHENTICATE' : 'AUTH OPENSEA'}
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={handleStart}
                  disabled={!authCookie || isRunning}
                  className="flex-1 bg-[#00FF41] hover:bg-[#00D135] disabled:opacity-50 text-black text-[11px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3 fill-current" />
                  START
                </button>
                <button 
                  onClick={handleStop}
                  disabled={!isRunning}
                  className="flex-1 bg-[#1F1F1F] hover:bg-[#FF3E3E]/20 hover:text-[#FF3E3E] disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-3 h-3 fill-current" />
                  STOP
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-[#1F1F1F] rounded mt-4">
                <span className="text-[10px] text-[#666666] uppercase">Dry Run Mode</span>
                <button 
                  onClick={() => setDryRun(!dryRun)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${dryRun ? 'bg-[#00FF41]' : 'bg-[#1F1F1F]'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${dryRun ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </section>
        </aside>

        {/* Center - Console */}
        <section className="bg-[#050505] border-r border-[#1F1F1F] flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            {logs.length === 0 && (
              <div className="text-[#666666] italic text-[11px]">System standby. Waiting for instructions...</div>
            )}
            {logs.map((log, i) => {
              const time = log.match(/\[(.*?)\]/)?.[1] || "";
              const msg = log.split('] ')[1] || log;
              const type = msg.includes('✅') || msg.includes('SUCCESS') ? 'SUCCESS' :
                           msg.includes('❌') || msg.includes('error') ? 'ERROR' :
                           msg.includes('🎯') ? 'FIRE' :
                           msg.includes('🚀') ? 'SEND' : 'INFO';

              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 mb-1 text-[11px] leading-relaxed"
                >
                  <span className="text-[#666666] w-16 shrink-0">[{time}]</span>
                  <span className={`w-12 shrink-0 font-bold ${
                    type === 'SUCCESS' ? 'text-[#00FF41]' :
                    type === 'ERROR' ? 'text-[#FF3E3E]' :
                    type === 'FIRE' ? 'text-[#00FF41]' :
                    type === 'SEND' ? 'text-purple-400' : 'text-[#00FF41]'
                  }`}>{type}</span>
                  <span className="text-[#DDD]">{msg}</span>
                </motion.div>
              );
            })}
            <div ref={logEndRef} />
          </div>
          <div className="h-10 border-t border-[#1F1F1F] bg-[#0A0A0A] flex items-center px-4 text-[#00FF41] text-[10px] tracking-wider">
            &gt; MONITORING ACTIVE... LISTENERS ATTACHED TO ASHBURN_VA_NODE
          </div>
        </section>

        {/* Right Panel - Status & Wallets */}
        <aside className="p-6 flex flex-col gap-8 overflow-y-auto scrollbar-thin">
          <section>
            <div className="text-[10px] uppercase text-[#666666] tracking-wider mb-4 border-l-2 border-[#00FF41] pl-2">
              Mint Status
            </div>
            <div className="bg-[#00FF41] text-black p-4 rounded text-center">
              <div className="text-[10px] font-bold mb-1">T-MINUS</div>
              <div className="text-4xl font-black leading-none">00:00.0</div>
              <div className="text-[10px] font-bold mt-1 uppercase">Hammering Active</div>
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase text-[#666666] tracking-wider mb-4 border-l-2 border-[#00FF41] pl-2">
              Live Wallets
            </div>
            <div className="space-y-2">
              {(() => {
                try {
                  const keys = JSON.parse(privateKeys);
                  return keys.map((k: string, i: number) => (
                    <div key={i} className="border border-[#1F1F1F] p-3 rounded bg-[#0F0F0F]/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-white font-mono">Wallet #{i+1}</span>
                        <span className="text-[9px] bg-[#1F1F1F] text-[#666666] px-1.5 py-0.5 rounded uppercase">Ready</span>
                      </div>
                      <div className="text-[10px] text-[#666666] flex items-center justify-between">
                        <span>BAL: -- ETH</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#00FF41] shadow-[0_0_5px_#00FF41]' : 'bg-[#666666]'}`} />
                          <span>{isRunning ? 'ACTIVE' : 'IDLE'}</span>
                        </div>
                      </div>
                    </div>
                  ));
                } catch {
                  return <div className="text-[#666666] text-[11px] italic">No wallets configured</div>;
                }
              })()}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
