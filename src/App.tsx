import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Send, 
  Zap, 
  History, 
  Settings as SettingsIcon,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useIncode } from './hooks/useIncode';
import { Logo, SectionHeader } from './components/Branding';
import { ChatLog } from './components/ChatLog';
import { CodePanel } from './components/CodePanel';

export default function App() {
  const {
    history,
    isGenerating,
    currentResponse,
    chain,
    setChain,
    address,
    connectWallet,
    disconnectWallet,
    options,
    setOptions,
    generate,
    clearHistory
  } = useIncode();

  const [prompt, setPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 50) {
      toast.error("FILE TOO LARGE (MAX 50KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPrompt(prev => `${prev}\n\n[IMPORTED_CONTRACT: ${file.name}]\n${content}\n[/IMPORTED]`);
      toast.success(`IMPORTED: ${file.name}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Calculate stats
  const tokenUsage = history.reduce((acc, m) => acc + m.content.length / 4, 0);
  const quotaRemaining = 1500; // Server-side handled now

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isGenerating || !prompt.trim()) return;
    
    if (quotaRemaining <= 0 && !heuristApiKey) {
      toast.error("FREE QUOTA EXHAUSTED. PLEASE ENTER HEURIST API KEY IN SETTINGS.");
      setIsSettingsOpen(true);
      return;
    }
    
    generate(prompt);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="crt-container">
      <div className="terminal-screen">
        <div className="grain" />
        <div className="scanline" />

        {/* Top bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-8 pb-2 gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">INCODE</h1>
            <p className="mono-label tracking-[0.3em] text-[10px] md:text-sm">PROJECT // UNLEASH_SYSTEM</p>
          </div>

          <div className="hidden lg:flex flex-col items-center max-w-xs">
            <p className="mono-label text-[8px] text-center mb-1 leading-tight">SYSTEM STATUS: OPTIMIZED</p>
            <p className="mono-label text-[8px] text-center opacity-40 leading-tight tracking-wider uppercase">Privacy by Design // Fully Homomorphic Encryption // Decentralized Intelligence</p>
          </div>

          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-3">
                <span className="mono-label text-[10px]">{time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC</span>
                <span className="mono-label text-[10px] text-terminal-accent">INCO_LATEST_V.2.1</span>
             </div>
             <div className="flex bg-black/40 border border-terminal-text/10 p-2 gap-3 items-center min-w-[240px] shadow-2xl backdrop-blur-sm">
                <div className="w-12 h-12 border border-terminal-border flex items-center justify-center bg-black/20">
                  <Terminal className={`w-6 h-6 ${address ? 'text-terminal-accent' : 'opacity-40'}`} />
                </div>
                <div className="flex flex-col flex-1">
                  {!address ? (
                    <>
                      <span className="mono-label font-black text-[10px] opacity-60 tracking-wider">OFFLINE_NODE_DETECTED</span>
                      <button 
                        onClick={connectWallet}
                        className="text-[10px] uppercase font-black px-3 py-1.5 bg-terminal-text text-terminal-bg mt-1.5 self-start hover:invert transition-all flex items-center gap-2"
                      >
                        CONNECT_WALLET.EXE <ChevronRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="mono-label font-bold text-[10px] text-terminal-accent flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-pulse" />
                        {chain.toUpperCase()}_NODE_ACTIVE
                      </span>
                      <button 
                        onClick={disconnectWallet}
                        className="text-[12px] font-mono font-black tracking-tighter text-terminal-text/90 hover:text-red-700 transition-colors text-left group"
                        title="Click to disconnect"
                      >
                        {address.slice(0, 6)}...{address.slice(-4)}
                        <span className="ml-2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold">[ DISCONNECT ]</span>
                      </button>
                    </>
                  )}
                </div>
             </div>
             <div className="w-full flex justify-end gap-3 mt-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 border border-terminal-accent/30 bg-terminal-accent/10 rounded">
                   <div className="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-pulse" />
                   <span className="text-[8px] font-bold text-terminal-text">EVM_TESTNET</span>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-0.5 border border-terminal-text/20 bg-terminal-text/5 rounded hover:bg-terminal-text/10 transition-all"
                >
                   <SettingsIcon className="w-3 h-3 text-terminal-accent" />
                   <span className="text-[8px] font-bold text-terminal-text">SYSTEM_CONFIG</span>
                </button>
                <button onClick={clearHistory} className="text-[8px] font-black text-red-900 uppercase px-2 py-0.5 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all">
                  DISCONNECT ×
                </button>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col xl:flex-row gap-6 px-4 md:px-8 overflow-hidden py-4">
          {/* Left Panel: Blueprints */}
          <section className="hidden xl:flex flex-col gap-4 w-64 pt-2">
             <div className="terminal-panel flex-1 border-terminal-border/20 p-5 bg-terminal-text/5 rounded-xl">
                <p className="mono-label text-[11px] mb-6 font-black">AUTH.INCODE_CORE</p>
                <div className="w-full aspect-square border-2 border-terminal-text/10 relative overflow-hidden bg-terminal-screen/20">
                  {/* Tactical Graphic Mockup */}
                  <div className="absolute top-4 left-4 w-31/4 h-3/4 border border-terminal-text/20 flex items-center justify-center">
                     <div className="w-24 h-36 bg-terminal-text/15 transform -skew-x-12 rotate-12 flex items-center justify-center font-black text-4xl opacity-10">Z</div>
                     <div className="absolute inset-x-0 bottom-4 flex justify-center">
                        <span className="text-[14px] font-mono font-bold tracking-tighter bg-terminal-text text-terminal-bg px-2">NODE_ID:{address ? address.slice(-6).toUpperCase() : 'N/A'}</span>
                     </div>
                  </div>
                </div>
                <p className="mono-label mt-6 leading-tight opacity-100 font-bold">AGENT_STRUCTURE_V.4.2</p>
                <p className="mono-label text-[8px] mt-2 opacity-50">LATEST_SCAN_DETECTED // NO_THREATS</p>
             </div>

             <div className="terminal-panel h-1/4 border-terminal-border/20 p-4 font-mono text-[10px] leading-relaxed opacity-80 bg-terminal-text/5 rounded-xl overflow-hidden">
                <code className="block text-terminal-text">
                  init_node(auth_key):<br/>
                  &nbsp;&nbsp;verify_attestation(auth_key)<br/>
                  &nbsp;&nbsp;sync_with_inco_lightning()<br/>
                  <br/>
                  generate_contract(prompt):<br/>
                  &nbsp;&nbsp;call_gemini_flash_2_0()<br/>
                  &nbsp;&nbsp;inject_inco_primitives()<br/>
                  <br/>
                  output_buffer.stream()
                </code>
             </div>
          </section>

          {/* Center Column: Generative Area */}
          <section className="flex-1 flex flex-col border-l border-r border-terminal-border/10 bg-terminal-screen/5 rounded-xl pt-4">
             <div className="flex-1 flex flex-col items-center pt-10 md:pt-16">
                <h2 className="text-2xl md:text-3xl font-black mb-8 px-6 text-center uppercase tracking-tighter">{"AI >> START_INCODE_GENERATION"}</h2>
                
                {history.length === 0 && !isGenerating ? (
                  <div className="flex flex-col gap-4 w-full max-w-lg px-6">
                    {[
                      { id: "1-/", label: "BUILD A SEALED-BID AUCTION", sub: "Confidential bidding with euint256" },
                      { id: "2-/", label: "CONFIDENTIAL ERC20 TOKEN", sub: "Private balances and transfers" },
                      { id: "3-/", label: "PRIVATE DAO VOTING SYSTEM", sub: "Hidden vote tallies via e.select" }
                    ].map(item => (
                      <button key={item.id} onClick={() => setPrompt(item.sub)} className="flex items-center gap-4 group">
                        <span className="mono-label font-black text-xs">{item.id}</span>
                        <div className="flex-1 border-2 border-terminal-text/20 bg-terminal-text/5 px-6 py-5 group-hover:bg-terminal-text group-hover:border-terminal-text group-hover:text-terminal-bg transition-all duration-300 rounded-lg shadow-sm">
                          <div className="text-sm font-black mb-1">{item.label}</div>
                          <div className="text-[10px] mono-label group-hover:text-terminal-bg/70">{item.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col overflow-hidden px-4 md:px-8">
                    <ChatLog history={history} currentResponse={currentResponse} isGenerating={isGenerating} />
                  </div>
                )}
             </div>

             <div className="mt-4 px-4 md:px-12 pb-6">
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ENTER_PROMPT_HERE // SYSTEM_LISTENING"
                    className="w-full bg-terminal-text/10 border-2 border-terminal-text/20 p-6 md:p-8 h-32 md:h-40 focus:outline-none focus:border-terminal-text/40 placeholder:text-terminal-text/20 uppercase font-bold text-sm md:text-lg rounded-xl transition-all"
                  />
                  <div className="absolute right-6 bottom-6 flex items-center gap-4">
                    <span className="mono-label text-[8px] hidden md:block">CMD+ENTER to TRANSMIT</span>
                    <button className="opacity-30 hover:opacity-100 transition-opacity">
                      <Zap className="w-5 h-5" />
                    </button>
                  </div>
                </div>
             </div>
          </section>

          {/* Right Panel: Code Preview - Now wider */}
          <section className="flex flex-col w-full xl:w-[45%] h-[50vh] xl:h-auto pt-2">
             <div className="flex-1 terminal-panel border-terminal-border/20 overflow-hidden flex flex-col bg-terminal-text/5 rounded-xl border-2">
                <div className="flex border-b-2 border-terminal-border/20 bg-terminal-screen/40 p-1">
                   <button className="px-6 py-3 font-black text-xs uppercase tracking-tighter border-r-2 border-terminal-border/20 bg-terminal-text text-terminal-bg rounded-l-lg">PREVIEW_LOGS.EXE</button>
                   <div className="flex-1" />
                   <div className="px-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-terminal-text/20 rounded-full" />
                      <div className="w-2 h-2 bg-terminal-text/20 rounded-full" />
                      <div className="w-2 h-2 bg-terminal-accent/80 rounded-full animate-pulse" />
                   </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodePanel content={history.slice().reverse().find(m => m.role === 'model')?.content || currentResponse} isLoading={isGenerating} chain={chain} />
                </div>
             </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="min-h-[6rem] py-4 px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-terminal-text/10 z-10 border-t border-terminal-border/20">
           <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
              <div className="flex flex-col items-start">
                 <span className="mono-label text-[8px] mb-2 font-bold opacity-100 italic">SYSTEM_STATUS_SECURE_V2</span>
                 <div className="flex gap-1.5">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-terminal-accent bg-terminal-accent shadow-[0_0_8px_rgba(85,255,0,0.4)] animate-pulse" />
                    ))}
                 </div>
              </div>
              <div className="hidden md:block h-10 w-px bg-terminal-border/20" />
              <div className="flex flex-col items-start">
                 <span className="mono-label text-[10px] font-black">ENCRYPTED_GATEWAY: ACTIVE</span>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
              <div className="flex flex-col items-center md:items-end w-full sm:w-auto">
                 <span className="mono-label text-[8px] mb-2 font-black uppercase text-terminal-text tracking-widest opacity-60">SELECT_PROTOCOL_CHAIN</span>
                 <div className="flex gap-2">
                   <button 
                    onClick={() => setChain('evm')} 
                    className={`px-5 py-2 border-2 border-terminal-text/40 font-black text-xs uppercase transition-all rounded-full ${chain === 'evm' ? 'bg-terminal-text text-terminal-bg' : 'hover:bg-terminal-text/5'}`}
                   >
                    EVM
                   </button>
                   <button 
                    onClick={() => setChain('svm')} 
                    className={`px-5 py-2 border-2 border-terminal-text/40 font-black text-xs uppercase transition-all rounded-full ${chain === 'svm' ? 'bg-terminal-text text-terminal-bg' : 'hover:bg-terminal-text/5'}`}
                   >
                    SVM
                   </button>
                 </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".sol,.rs,.toml,.json"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-terminal-text/20 hover:bg-terminal-text hover:text-terminal-bg transition-all rounded-2xl group flex items-center gap-2"
                  title="Import Contract Library"
                >
                  <Layers className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="hidden md:inline font-mono text-[10px] font-black">IMPORT_LIBS</span>
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isGenerating}
                  className={`enter-btn flex-1 sm:flex-none min-w-[160px] md:min-w-[200px] flex items-center justify-center py-4 px-8 text-lg ${isGenerating ? 'animate-pulse opacity-70 cursor-not-allowed' : ''}`}
                >
                   {isGenerating ? "TRANSMITTING..." : "EXECUTE"}
                </button>
                
                <button className="p-4 border-2 border-terminal-text/20 hover:bg-terminal-text hover:text-terminal-bg transition-all rounded-2xl group">
                   <History className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
           </div>
        </footer>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="terminal-panel w-full max-w-md border-2 border-terminal-text/20 bg-terminal-bg p-8 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="grain pointer-events-none opacity-20" />
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest text-terminal-text flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-terminal-accent" />
                  System_Config
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-terminal-text/40 hover:text-terminal-text p-2 hover:bg-terminal-text/10 rounded-lg transition-all">
                  [ESC]
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="mono-label text-[10px] block mb-3 opacity-60 uppercase font-black">AI_PROVIDER: SERVER_SIDE_GATEWAY</label>
                  <p className="text-[9px] mb-4 opacity-40 uppercase leading-tight italic">
                    The system is now using project-wide API keys for generation. Secure inference is active.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="mono-label text-[10px] block opacity-60 uppercase font-black">Generation_Parameters</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'includeTests', label: 'GENERATE_TESTS' },
                      { key: 'includeSDK', label: 'INJECT_SDK' },
                      { key: 'includeNatspec', label: 'NATSPEC_DOCS' },
                      { key: 'strictMode', label: 'STRICT_INCO_ONLY' }
                    ].map(opt => (
                      <button 
                        key={opt.key}
                        onClick={() => setOptions({ ...options, [opt.key]: !options[opt.key as keyof typeof options] })}
                        className={`flex items-center justify-between p-3 border-2 transition-all rounded-xl ${options[opt.key as keyof typeof options] ? 'border-terminal-accent/40 bg-terminal-accent/5 text-terminal-accent' : 'border-terminal-text/10 bg-black/20 text-terminal-text/40 hover:border-terminal-text/20'}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</span>
                        <div className={`w-2 h-2 rounded-full ${options[opt.key as keyof typeof options] ? 'bg-terminal-accent animate-pulse' : 'bg-terminal-text/20'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-4 bg-terminal-text text-terminal-bg font-black uppercase tracking-widest hover:invert transition-all rounded-2xl shadow-lg mt-4"
                >
                  SAVE_CONFIG.EXE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

