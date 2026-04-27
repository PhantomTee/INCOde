import React from 'react';

export const Logo = () => (
  <div className="flex items-center gap-2 font-mono text-xl tracking-tighter">
    <span className="text-inco-primary font-bold">INCO</span>
    <span className="text-white opacity-90 underline decoration-inco-primary/50 underline-offset-4">de</span>
    <div className="ml-1 w-6 h-6 border-2 border-inco-primary rotate-45 flex items-center justify-center scale-75">
      <div className="w-2 h-2 bg-inco-primary animate-pulse" />
    </div>
  </div>
);

export const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="flex items-center gap-2 mb-4 group">
    <div className="p-1.5 bg-inco-primary/10 border border-inco-primary/30 group-hover:border-inco-primary/60 transition-colors">
      <Icon className="w-4 h-4 text-inco-primary" />
    </div>
    <h3 className="text-xs font-mono uppercase tracking-widest text-white/70">{title}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-inco-primary/30 to-transparent" />
  </div>
);
