import { useState, useRef, useEffect } from 'react';
import { streamIncode, Message, GenerateOptions } from '../lib/ai';
import toast from 'react-hot-toast';

export function useIncode() {
  const [history, setHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('incode_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('incode_history', JSON.stringify(history));
  }, [history]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [address, setAddress] = useState<string | null>(() => {
    return localStorage.getItem('incode_address');
  });
  const [chain, setChain] = useState<'evm' | 'svm'>('evm');

  useEffect(() => {
    if (address) {
      localStorage.setItem('incode_address', address);
    } else {
      localStorage.removeItem('incode_address');
    }
  }, [address]);

  // Handle auto-reconnection for EVM/SVM
  useEffect(() => {
    const attemptReconnect = async () => {
      const savedAddress = localStorage.getItem('incode_address');
      if (!savedAddress) return;

      try {
        if (chain === 'evm' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
          } else {
            // If no accounts found despite saved address, clear it
            setAddress(null);
          }
        }
        // For SVM, most wallet providers like Phantom handle "connect on site load" 
        // if previously authorized, but we'll trust the saved address for now
        // or trigger a quiet connect if needed.
      } catch (err) {
        console.error("Reconnection failed", err);
      }
    };

    attemptReconnect();
  }, [chain]);

  const connectWallet = async () => {
    try {
      if (chain === 'evm') {
        if (!window.ethereum) {
          throw new Error("No EVM wallet detected. Please install Metamask.");
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          toast.success("EVM wallet connected");
        }
      } else {
        // Real SVM (Solana) logic
        const solana = (window as any).solana;
        if (solana) {
          try {
            const resp = await solana.connect();
            setAddress(resp.publicKey.toString());
            toast.success("SVM wallet connected");
          } catch (err: any) {
            throw new Error(err.message || "Solana connection rejected");
          }
        } else {
          throw new Error("No Solana wallet detected. Please install Phantom or another SVM wallet.");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Connection failed");
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    toast.success("Wallet disconnected");
  };

  const [options, setOptions] = useState({
    includeTests: true,
    includeSDK: true,
    includeNatspec: true,
    strictMode: true,
  });

  const generate = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setCurrentResponse('');
    
    const userMessage: Message = { role: 'user', content: prompt };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);

    try {
      const stream = streamIncode({
        prompt,
        chain,
        ...options,
        history,
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setCurrentResponse(fullText);
      }

      setHistory(prev => [...prev, { role: 'model', content: fullText }]);
      setCurrentResponse('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate code.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
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
    clearHistory: () => setHistory([]),
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
