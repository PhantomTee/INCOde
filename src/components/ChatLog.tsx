import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../lib/ai';
import { User, Cpu } from 'lucide-react';

interface ChatLogProps {
  history: Message[];
  currentResponse: string;
  isGenerating: boolean;
  onSelect?: (index: number) => void;
}

export const ChatLog = ({ history, currentResponse, isGenerating, onSelect }: ChatLogProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 md:space-y-6 scrollbar-hide">
      {history.map((msg, i) => (
        <div 
          key={i} 
          onClick={() => msg.role !== 'user' && onSelect?.(i)}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${msg.role !== 'user' ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
        >
          <div className="flex items-center gap-1 md:gap-2 mb-1 opacity-70">
            <span className="mono-label tracking-widest text-[8px] md:text-[10px]">{msg.role === 'user' ? 'USER' : 'INCODE'}</span>
            <div className="w-1 h-1 bg-terminal-text/30 rounded-full" />
            <span className="mono-label text-[8px] md:text-[10px]">{msg.timestamp || '00:00'}</span>
          </div>
          
          <div className={`p-3 md:p-4 border md:border-2 ${
            msg.role === 'user' 
              ? 'bg-terminal-text text-terminal-bg border-terminal-text rounded-2xl rounded-tr-sm shadow-lg' 
              : 'bg-terminal-screen/30 border-terminal-border/40 text-terminal-text rounded-2xl rounded-tl-sm shadow-xl'
          } max-w-[95%] md:max-w-[85%] overflow-hidden`}>
            {(msg.role === 'model' || msg.role === 'assistant') && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-terminal-border/20">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-terminal-accent text-terminal-bg rounded-md flex items-center justify-center text-[8px] md:text-[10px] font-black">AI</div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-80 text-terminal-accent">Encrypted_Intelligence</span>
              </div>
            )}
            <div className="markdown-body text-xs md:text-sm prose-zinc font-medium leading-relaxed overflow-x-auto break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {isGenerating && currentResponse && (
        <div className="flex flex-col items-start animate-fade-in">
           <div className="flex items-center gap-2 mb-1 opacity-70">
            <span className="mono-label tracking-widest text-[8px] md:text-[10px]">INCODE</span>
            <div className="w-1 h-1 bg-terminal-accent rounded-full animate-pulse" />
          </div>
          <div className="p-3 md:p-4 bg-terminal-screen/20 border md:border-2 border-terminal-border/40 text-terminal-text rounded-2xl rounded-tl-sm shadow-xl max-w-[95%] md:max-w-[85%]">
            <div className="markdown-body text-xs md:text-sm prose-zinc">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentResponse + ' █'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
