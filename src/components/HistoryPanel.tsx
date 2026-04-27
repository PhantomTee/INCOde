import React from 'react';
import { History, Trash2, ChevronRight, MessageSquareCode } from 'lucide-react';
import { Message } from '../lib/ai';

interface HistoryPanelProps {
  history: Message[];
  onClear: () => void;
  onSelect: (msg: Message) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryPanel({ history, onClear, onSelect, isOpen, onClose }: HistoryPanelProps) {
  if (!isOpen) return null;

  const modelResponses = history.filter(m => m.role === 'model');

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-terminal-bg border-l-2 border-terminal-text/20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="grain pointer-events-none opacity-20" />
        
        <div className="p-6 border-b border-terminal-text/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-terminal-accent" />
            <h3 className="font-black uppercase tracking-widest text-lg">Transmission_History</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-terminal-text/10 rounded-lg transition-all font-mono text-xs opacity-50 hover:opacity-100">
            [CLOSE]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {modelResponses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
              <MessageSquareCode className="w-12 h-12 mb-4" />
              <p className="mono-label text-[10px] uppercase">No previous transmissions detected in local buffer</p>
            </div>
          ) : (
            modelResponses.slice().reverse().map((m, i) => (
              <button 
                key={i}
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
                className="w-full text-left p-4 border border-terminal-text/10 bg-black/20 hover:border-terminal-accent/30 hover:bg-terminal-accent/5 transition-all rounded-xl group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[8px] font-black p-1 bg-terminal-accent/10 text-terminal-accent rounded">LOG_{modelResponses.length - i}</span>
                  <ChevronRight className="w-3 h-3 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs font-mono line-clamp-3 opacity-60 group-hover:opacity-100 italic transition-opacity">
                  {m.content.slice(0, 150)}...
                </p>
              </button>
            ))
          )}
        </div>

        <div className="p-6 border-t border-terminal-text/10 bg-black/40">
          <button 
            onClick={() => {
              if (confirm('REALLY WIPE LOCAL BUFFER? THIS ACTION IS IRREVERSIBLE.')) {
                onClear();
              }
            }}
            className="w-full py-4 border-2 border-red-900/40 text-red-700 font-black uppercase text-xs hover:bg-red-900 hover:text-white transition-all flex items-center justify-center gap-2 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            PURGE_ALL_RECORDS
          </button>
        </div>
      </div>
    </div>
  );
}
