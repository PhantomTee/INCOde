import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Send, 
  Zap, 
  History, 
  Trash2,
  Settings as SettingsIcon,
  ChevronRight,
  ShieldAlert,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useIncode } from './hooks/useIncode';
import { Logo, SectionHeader } from './components/Branding';
import { ChatLog } from './components/ChatLog';
import { CodePanel } from './components/CodePanel';
import { Templates } from './components/Templates';
import { HistoryPanel } from './components/HistoryPanel';
import { OnboardingTour } from './components/OnboardingTour';

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
    selectedMessageIndex,
    setSelectedMessageIndex,
    clearHistory,
    modelId,
    setModelId
  } = useIncode();

  const [prompt, setPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => setAvailableModels(data.models))
      .catch(err => toast.error("Failed to load models: " + err.message));
  }, []);

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

    if (!address) {
      toast.error("PROTOCOL_ERROR: WALLET_NOT_CONNECTED. PLEASE INITIALIZE NODE.");
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
        <header className="flex flex-row justify-between items-start p-3 md:p-8 md:pb-2 gap-2">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-none mt-1">INCOde</h1>
            <p className="mono-label tracking-[0.3em] text-[8px] md:text-sm hidden sm:block">PROJECT // UNLEASH_SYSTEM</p>
          </div>

          <div className="hidden lg:flex flex-col items-center max-w-xs">
            <p className="mono-label text-[8px] text-center mb-1 leading-tight">SYSTEM STATUS: OPTIMIZED</p>
            <p className="mono-label text-[8px] text-center opacity-40 leading-tight tracking-wider uppercase">Privacy by Design // Fully Homomorphic Encryption // Decentralized Intelligence</p>
          </div>

          <div className="flex flex-col items-end gap-2">
             <div className="hidden sm:flex items-center gap-3">
                <div className="flex bg-terminal-text/5 border border-terminal-text/10 rounded-full p-1 mr-2 scale-90 md:scale-100 origin-right">
                  <button 
                    onClick={() => { setChain('evm'); if(address) disconnectWallet(); }}
                    className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${chain === 'evm' ? 'bg-terminal-text text-terminal-bg' : 'text-terminal-text opacity-40'}`}
                  >EVM</button>
                  <button 
                    onClick={() => { toast.error("SVM support is under development. Please use EVM."); }}
                    className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${chain === 'svm' ? 'bg-terminal-text text-terminal-bg' : 'text-terminal-text opacity-40'}`}
                  >SVM</button>
                </div>
                <span className="mono-label text-[10px]">{time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC</span>
                <span className="mono-label text-[10px] text-terminal-accent">INCO_LATEST_V.2.1</span>
             </div>
             <div className="flex bg-black/40 border border-terminal-text/10 p-1.5 md:p-2 gap-2 md:gap-3 items-center min-w-[200px] md:min-w-[240px] shadow-2xl backdrop-blur-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 border border-terminal-border flex items-center justify-center bg-black/20">
                  <Terminal className={`w-5 h-5 md:w-6 md:h-6 ${address ? 'text-terminal-accent' : 'opacity-40'}`} />
                </div>
                <div className="flex flex-col flex-1">
                  {!address ? (
                    <>
                      <span className="mono-label font-black text-[8px] md:text-[10px] opacity-60 tracking-wider">OFFLINE_NODE_DETECTED</span>
                      <button 
                        onClick={connectWallet}
                        className="text-[8px] md:text-[10px] uppercase font-black px-2 py-1 md:px-3 md:py-1.5 bg-terminal-text text-terminal-bg mt-1 self-start hover:invert transition-all flex items-center gap-1 md:gap-2"
                      >
                        CONNECT_WALLET.EXE <ChevronRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="mono-label font-bold text-[8px] md:text-[10px] text-terminal-accent flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-pulse" />
                        {chain.toUpperCase()}_NODE_ACTIVE
                      </span>
                      <button 
                        onClick={disconnectWallet}
                        className="text-[10px] md:text-[12px] font-mono font-black tracking-tighter text-terminal-text/90 hover:text-red-700 transition-colors text-left group"
                        title="Click to disconnect"
                      >
                        {address.slice(0, 6)}...{address.slice(-4)}
                        <span className="ml-2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold hidden sm:inline">[ DISCONNECT ]</span>
                      </button>
                    </>
                  )}
                </div>
             </div>
             <div className="w-full flex justify-end gap-2 md:gap-3 mt-1">
                <div className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 border border-terminal-accent/30 bg-terminal-accent/10 rounded">
                   <div className="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-pulse" />
                   <span className="text-[7px] md:text-[8px] font-bold text-terminal-text">EVM_TESTNET</span>
                </div>
                <button 
                  onClick={() => setShowTour(true)}
                  className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 border border-terminal-text/20 bg-terminal-text/5 rounded hover:bg-terminal-text/10 transition-all"
                >
                   <AlertCircle className="w-3 h-3 text-terminal-accent" />
                   <span className="text-[7px] md:text-[8px] font-bold text-terminal-text">HELP</span>
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 border border-terminal-text/20 bg-terminal-text/5 rounded hover:bg-terminal-text/10 transition-all"
                >
                   <SettingsIcon className="w-3 h-3 text-terminal-accent" />
                   <span className="text-[7px] md:text-[8px] font-bold text-terminal-text">SYSTEM_CONFIG</span>
                </button>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col xl:flex-row gap-4 md:gap-6 px-2 md:px-8 overflow-y-auto overflow-x-hidden xl:overflow-hidden py-2 md:py-4">
          {/* Center Column: Generative Area */}
          <section className="flex-none xl:flex-1 flex flex-col border-none xl:border-l xl:border-r border-terminal-border/10 bg-transparent xl:bg-terminal-screen/5 rounded-xl pt-2 md:pt-4 min-h-[60vh] xl:min-h-0">
             <div className="flex-1 flex flex-col items-center pt-4 md:pt-16 min-h-[40vh] xl:min-h-0">
                <h2 className="text-2xl md:text-3xl font-black mb-8 px-6 text-center uppercase tracking-tighter">{"AI >> START_INCODE_GENERATION"}</h2>
                
                {history.length === 0 && !isGenerating ? (
                  <div className="w-full max-w-2xl px-6">
                    <div className="flex items-center gap-3 mb-6 px-1">
                      <Layers className="w-5 h-5 text-terminal-accent" />
                      <h3 className="mono-label text-sm font-black uppercase tracking-widest text-terminal-text">Selected_Blueprints</h3>
                    </div>
                    <Templates 
                      activeChain={chain}
                      onSelect={(templatePrompt, templateChain) => {
                        setChain(templateChain);
                        setPrompt(templatePrompt);
                        toast.success("TEMPLATE_LOADED");
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col overflow-hidden px-4 md:px-8">
                    <ChatLog 
                      history={history} 
                      currentResponse={currentResponse} 
                      isGenerating={isGenerating} 
                      onSelect={(index) => setSelectedMessageIndex(index)}
                    />
                  </div>
                )}
             </div>

             <div className="mt-2 md:mt-4 px-2 md:px-12 pb-2 md:pb-6 relative w-full">
                {!address && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl mb-4 md:mb-6 mx-2 md:mx-12">
                    <div className="flex flex-col items-center gap-2 p-6 border-2 border-terminal-accent/40 bg-terminal-bg/90 shadow-[0_0_20px_rgba(85,255,0,0.2)] rounded-lg">
                      <ShieldAlert className="w-8 h-8 text-terminal-accent animate-pulse" />
                      <span className="mono-label text-terminal-accent font-black tracking-widest">ACCESS_DENIED: INITIALIZE_NODE_FIRST</span>
                      <button 
                        onClick={connectWallet}
                        className="mt-2 px-4 py-2 bg-terminal-accent text-terminal-bg font-black text-xs uppercase hover:invert transition-all"
                      >
                        CONNECT_WALLET.EXE
                      </button>
                    </div>
                  </div>
                )}
                <div className="relative w-full">
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!address || isGenerating}
                    placeholder={address ? "ENTER_PROMPT_HERE // SYSTEM_LISTENING" : "CONNECTION_REQUIRED..."}
                    className={`w-full bg-terminal-text/10 border-2 border-terminal-text/20 p-4 md:p-8 pr-12 md:pr-16 h-28 md:h-40 focus:outline-none focus:border-terminal-text/40 placeholder:text-terminal-text/20 uppercase font-bold text-xs md:text-lg rounded-xl transition-all resize-none ${!address ? 'opacity-30' : ''} ${isGenerating ? 'animate-pulse border-terminal-accent/30 shadow-[0_0_15px_rgba(85,255,0,0.1)]' : ''}`}
                  />
                  <div className="absolute right-4 bottom-4 md:right-6 md:bottom-6 flex items-center gap-2 md:gap-4">
                    {isGenerating && (
                      <span className="text-[8px] md:text-[10px] text-terminal-accent font-black animate-pulse flex items-center gap-1.5 md:gap-2">
                        <Loader2 className="w-3 h-3 animate-spin hidden sm:block" />
                        TRANSMITTING...
                      </span>
                    )}
                    <span className="mono-label text-[8px] hidden md:block">CMD+ENTER to TRANSMIT</span>
                    <button className="opacity-30 hover:opacity-100 transition-opacity p-2 bg-terminal-text/10 md:bg-transparent rounded-lg md:rounded-none" disabled={!address || isGenerating} onClick={handleSubmit}>
                      <Zap className="w-4 h-4 md:w-5 md:h-5 text-terminal-text" />
                    </button>
                  </div>
                </div>
             </div>
          </section>

          {/* Right Panel: Code Preview - Now wider */}
          <section className="flex-none xl:flex-1 flex flex-col w-full xl:w-[45%] h-[80vh] xl:h-auto pt-2 pb-4 xl:pb-0">
             <div className="flex-1 terminal-panel border-terminal-border/20 overflow-hidden flex flex-col bg-terminal-text/5 rounded-xl border-2 min-h-0">
                <div className="flex border-b-2 border-terminal-border/20 bg-terminal-screen/40 p-1 md:p-2">
                   <button className="px-3 py-2 md:px-6 md:py-3 font-black text-[10px] md:text-xs uppercase tracking-tighter border-r-2 border-terminal-border/20 bg-terminal-text text-terminal-bg rounded-l-lg">PREVIEW_LOGS</button>
                   <div className="flex-1" />
                   <div className="px-3 md:px-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-terminal-text/20 rounded-full" />
                      <div className="w-2 h-2 bg-terminal-text/20 rounded-full" />
                      <div className="w-2 h-2 bg-terminal-accent/80 rounded-full animate-pulse" />
                   </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodePanel 
                    content={selectedMessageIndex !== null ? history[selectedMessageIndex].content : (history.slice().reverse().find(m => m.role === 'assistant' || m.role === 'model')?.content || currentResponse)} 
                    isLoading={isGenerating} 
                    chain={chain} 
                  />
                </div>
             </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="min-h-[5rem] md:min-h-[6rem] py-3 px-2 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-terminal-text/10 z-10 border-t border-terminal-border/20">
           <div className="hidden md:flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
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

           <div className="flex flex-row items-center gap-2 md:gap-6 w-full md:w-auto">
              <div className="flex flex-col items-center md:items-end w-full sm:w-auto opacity-0 pointer-events-none absolute h-0 w-[0px]">
                 <span className="mono-label text-[8px] mb-2 font-black uppercase text-terminal-text tracking-widest opacity-60">SELECT_PROTOCOL_CHAIN</span>
                 <div className="flex gap-2">
                   <button 
                    onClick={() => setChain('evm')} 
                    className={`px-5 py-2 border-2 border-terminal-text/40 font-black text-xs uppercase transition-all rounded-full ${chain === 'evm' ? 'bg-terminal-text text-terminal-bg' : 'hover:bg-terminal-text/5'}`}
                   >
                    EVM
                   </button>
                   <button 
                    onClick={() => toast.error("SVM support is under development. Please use EVM.")} 
                    className={`px-5 py-2 border-2 border-terminal-text/40 font-black text-xs uppercase transition-all rounded-full hover:bg-terminal-text/5`}
                   >
                    SVM
                   </button>
                 </div>
              </div>
              
              <div className="flex items-center justify-between gap-2 md:gap-4 w-full sm:w-auto">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".sol,.rs,.toml,.json"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 md:p-4 border-2 border-terminal-text/20 hover:bg-terminal-text hover:text-terminal-bg transition-all rounded-xl md:rounded-2xl group flex items-center gap-2"
                  title="Import Contract Library"
                >
                  <Layers className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
                  <span className="hidden md:inline font-mono text-[10px] font-black">IMPORT_LIBS</span>
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isGenerating}
                  className={`enter-btn flex-1 md:flex-none min-w-[120px] md:min-w-[200px] flex items-center justify-center py-3 md:py-4 px-4 md:px-8 text-sm md:text-lg rounded-xl md:rounded-none whitespace-nowrap ${isGenerating ? 'animate-pulse opacity-70 cursor-not-allowed' : ''}`}
                >
                   {isGenerating ? "TRANSMITTING..." : "EXECUTE"}
                </button>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (confirm('CLEAR_ALL_TRANSMISSION_DATA?')) {
                        clearHistory();
                        setPrompt('');
                        toast.success("BUFFER_PURGED");
                      }
                    }}
                    className="p-3 md:p-4 border-2 border-terminal-text/20 hover:border-red-900/40 hover:bg-red-900/10 hover:text-red-700 transition-all rounded-xl md:rounded-2xl group"
                    title="Clear Current Session"
                  >
                     <Trash2 className="w-4 h-4 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-3 md:p-4 border-2 border-terminal-text/20 hover:bg-terminal-text hover:text-terminal-bg transition-all rounded-xl md:rounded-2xl group relative"
                  >
                     <History className="w-4 h-4 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
                     {history.filter(m => m.role === 'assistant' || m.role === 'model').length > 0 && (
                       <div className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 bg-terminal-accent rounded-full animate-ping" />
                     )}
                  </button>
                </div>
              </div>
           </div>
        </footer>

        <HistoryPanel 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)}
          history={history}
          onClear={clearHistory}
          onSelect={(index) => {
            setSelectedMessageIndex(index);
            toast.success("RESTORED_LOG_ENTRY");
          }}
        />

        <OnboardingTour forceShow={showTour} onComplete={() => setShowTour(false)} />

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
                <div className="space-y-4">
                  <label className="mono-label text-[10px] block opacity-60 uppercase font-black tracking-widest">protocol_chain</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setChain('evm'); if(address) disconnectWallet(); }} 
                      className={`flex-1 px-5 py-3 border-2 font-black text-xs uppercase transition-all rounded-xl ${chain === 'evm' ? 'bg-terminal-text text-terminal-bg border-terminal-text' : 'border-terminal-text/20 hover:bg-terminal-text/5'}`}
                    >
                      EVM (Solidity)
                    </button>
                    <button 
                      onClick={() => toast.error("SVM support is under development. Please use EVM.")} 
                      className={`flex-1 px-5 py-3 border-2 font-black text-xs uppercase transition-all rounded-xl border-terminal-text/20 hover:bg-terminal-text/5`}
                    >
                      SVM (Rust)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="mono-label text-[10px] block opacity-60 uppercase font-black tracking-widest">Model_Intelligence</label>
                  <div className="grid grid-cols-1 gap-2">
                    {availableModels.length > 0 ? (
                      availableModels.map((m) => (
                        <button 
                          key={m.id}
                          onClick={() => setModelId(m.id)} 
                          className={`px-4 py-3 border-2 text-[10px] font-black uppercase rounded-lg transition-all flex flex-col items-start gap-1 ${modelId === m.id ? 'bg-terminal-text text-terminal-bg border-terminal-text' : 'border-terminal-text/20 hover:bg-terminal-text/5 text-terminal-text'}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{m.label.split('(')[0]}</span>
                            {m.provider === 'nvidia' && <span className="bg-terminal-accent/20 text-terminal-accent px-1.5 py-0.5 rounded text-[8px]">PRO_GRADE</span>}
                          </div>
                          <span className={`text-[8px] opacity-60 normal-case ${modelId === m.id ? 'text-terminal-bg' : 'text-terminal-text'}`}>
                            {m.label.includes('(') ? '(' + m.label.split('(')[1] : ''}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="text-[10px] opacity-40 font-mono italic p-4 text-center border-2 border-dashed border-terminal-text/10 rounded-lg">
                        LOADING_AI_CORES...
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="mono-label text-[10px] block opacity-60 uppercase font-black tracking-widest">generation_parameters</label>
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

