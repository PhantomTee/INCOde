import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Zap, Cpu, ChevronRight, X, CheckCircle2 } from 'lucide-react';

interface OnboardingTourProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const OnboardingTour = ({ onComplete, forceShow = false }: OnboardingTourProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      setStep(0);
      return;
    }
    
    const hasSeenTour = localStorage.getItem('incode_tour_seen');
    if (!hasSeenTour) {
      // Small delay for dramatic effect on load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const dismissTour = () => {
    localStorage.setItem('incode_tour_seen', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismissTour();
    }
  };

  if (!isVisible) return null;

  const steps = [
    {
      title: "SYSTEM_INITIALIZATION",
      subtitle: "Welcome to INCOde",
      content: "Welcome to the ultimate FHE (Fully Homomorphic Encryption) generative terminal. This system allows you to build secure, privacy-preserving smart contracts using conversational AI.",
      icon: <Terminal className="w-10 h-10 text-terminal-accent animate-pulse" />
    },
    {
      title: "NODE_AUTHENTICATION",
      subtitle: "Connecting Your Wallet",
      content: "Before transmitting directives, you must initialize your node. Click the CONNECT_WALLET button at the top right to authenticate via an EVM or SVM wallet.",
      icon: <Shield className="w-10 h-10 text-terminal-accent" />
    },
    {
      title: "TRANSMIT_DIRECTIVES",
      subtitle: "The Prompt Interface",
      content: "Use the central console to enter your prompt. Describe the confidential logic, state variables, or rules you need. The AI is specifically trained on Inco's FHE capabilities.",
      icon: <Zap className="w-10 h-10 text-terminal-accent" />
    },
    {
      title: "DECRYPT_INTELLIGENCE",
      subtitle: "Reviewing Output",
      content: "The generated smart contract and associated logs will compile in the right panel. You can easily copy individual files or export the entire project structure as a ZIP archive.",
      icon: <Cpu className="w-10 h-10 text-terminal-accent" />
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-500">
      <div className="terminal-panel w-full max-w-[95vw] md:max-w-lg border border-terminal-accent/30 bg-terminal-bg/95 p-4 md:p-10 rounded-xl md:rounded-2xl shadow-[0_0_50px_rgba(56,189,248,0.15)] relative overflow-hidden flex flex-col max-h-[95vh]">
        <div className="grain pointer-events-none opacity-30" />
        <div className="scanline pointer-events-none opacity-20" />
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 md:mb-8 relative z-10 border-b border-terminal-text/20 pb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 border border-terminal-accent/30 bg-terminal-accent/5 rounded-lg shrink-0">
              {React.cloneElement(currentStep.icon, { className: "w-6 h-6 md:w-10 md:h-10 text-terminal-accent" + (currentStep.icon.props.className?.includes('animate-pulse') ? ' animate-pulse' : '') })}
            </div>
            <div>
              <h2 className="text-base md:text-2xl font-black uppercase tracking-widest text-terminal-accent shadow-terminal-accent/50 drop-shadow-sm">
                {currentStep.title}
              </h2>
              <p className="mono-label text-[9px] md:text-xs uppercase opacity-70 tracking-widest mt-0.5 md:mt-1">
                {currentStep.subtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={dismissTour}
            className="text-terminal-text/50 hover:text-red-500 p-1 md:p-2 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
            title="Skip Tutorial"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 min-h-[120px] md:min-h-[100px] flex items-center mb-6 md:mb-10 overflow-y-auto">
          <p className="text-sm md:text-base font-mono leading-relaxed text-terminal-text/90">
            {currentStep.content}
          </p>
        </div>

        {/* Footer & Controls */}
        <div className="relative z-10 flex flex-col-reverse md:flex-row items-center justify-between border-t border-terminal-text/20 pt-4 md:pt-6 gap-4 md:gap-0">
          {/* Progress Indicators */}
          <div className="flex gap-2 w-full md:w-auto justify-center md:justify-start">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
                  i === step 
                    ? 'bg-terminal-accent shadow-[0_0_8px_rgba(56,189,248,0.8)] scale-125' 
                    : i < step 
                      ? 'bg-terminal-accent/40' 
                      : 'bg-terminal-text/20'
                }`} 
              />
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {step > 0 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest border border-terminal-text/20 rounded-lg hover:border-terminal-text/50 transition-all text-terminal-text/60 hover:text-terminal-text w-full md:w-auto text-center"
              >
                BACK
              </button>
            ) : <div className="w-4 md:w-0" />}
            <button 
              onClick={nextStep}
              className="px-4 md:px-6 py-2 md:py-3 bg-terminal-accent text-terminal-bg text-[10px] md:text-sm font-black uppercase tracking-widest rounded-lg hover:invert transition-all flex items-center gap-1.5 md:gap-2 shadow-[0_0_15px_rgba(56,189,248,0.3)] w-full md:w-auto justify-center"
            >
              {step === steps.length - 1 ? (
                <>INITIATE_SYSTEM <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /></>
              ) : (
                <>PROCEED <ChevronRight className="w-3 h-3 md:w-4 md:h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
