import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../lib/ai';
import { User, Cpu } from 'lucide-react';

interface ChatLogProps {
  history: Message[];
  currentResponse: string;
  isGenerating: boolean;
}

export const ChatLog = ({ history, currentResponse, isGenerating }: ChatLogProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {history.map((msg, i) => (
        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="mono-label tracking-widest">{msg.role === 'user' ? 'USER' : 'INCODE'}</span>
            <div className="w-1 h-1 bg-terminal-text/30 rounded-full" />
            <span className="mono-label">11:04 AM</span>
          </div>
          
          <div className={`p-4 border-2 ${
            msg.role === 'user' 
              ? 'bg-terminal-text text-terminal-bg border-terminal-text rounded-2xl rounded-tr-none shadow-lg' 
              : 'bg-terminal-screen/30 border-terminal-border/40 text-terminal-text rounded-2xl rounded-tl-none shadow-xl'
          } max-w-[90%]`}>
            {msg.role === 'model' && (
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-terminal-border/20">
                <div className="w-6 h-6 bg-terminal-text text-terminal-bg rounded flex items-center justify-center text-[10px] font-black">AI</div>
                <span className="text-[12px] font-black uppercase tracking-widest opacity-80">INCODE_CORE_ANALYSIS</span>
              </div>
            )}
            <div className="markdown-body text-sm md:text-base prose-zinc font-medium leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {isGenerating && currentResponse && (
        <div className="flex flex-col items-start animate-fade-in">
           <div className="flex items-center gap-2 mb-1">
            <span className="mono-label tracking-widest">INCODE</span>
            <div className="w-1 h-1 bg-terminal-accent rounded-full animate-pulse" />
          </div>
          <div className="p-4 bg-terminal-screen/20 border border-terminal-border/40 text-terminal-text rounded-2xl rounded-tl-none shadow-xl max-w-[85%]">
            <div className="markdown-body text-xs prose-sm prose-zinc">
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
