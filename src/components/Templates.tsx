import React from 'react';
import { FileCode, Globe, Shield, Vote, ShoppingCart, Zap, Lock } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  chain: 'evm' | 'svm';
}

const TEMPLATES: Template[] = [
  {
    id: 'conf-erc20',
    name: 'Confidential Token',
    description: 'ERC20 with encrypted balances and transfers using Inco FHE.',
    icon: <Globe className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Generate an ERC20 confidential token using Inco @inco/lightning/Lib.sol. Include encrypted balances (euint32), transfer function with re-encryption for recipients, and minting functionality only for owner.'
  },
  {
    id: 'blind-auction',
    name: 'Sealed Bid Auction',
    description: 'Fully on-chain blind auction where bids are hidden until reveal or end.',
    icon: <Lock className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Build a sealed-bid auction contract. Users submit euint128 bids. The contract should compare bids using FHE (Lib.gt) without revealing them. Only the winner ID is revealed at the end.'
  },
  {
    id: 'private-voting',
    name: 'Private DAO Voting',
    description: 'Vote tallies are encrypted. Only the final result is decrypted.',
    icon: <Vote className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Create a private voting system. Use euint32 for vote counts. Each vote increments an encrypted counter. Provide a function to decrypt the final tally after a certain block height.'
  },
  {
    id: 'ident-shield',
    name: 'Identity Shield',
    description: 'Private identity verification with zero-knowledge-like privacy via FHE.',
    icon: <Shield className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Generate an Identity verification contract. Users store encrypted attributes (e.g., age > 18). Verifiers can check encrypted conditions without seeing the actual values.'
  },
  {
    id: 'svm-escrow',
    name: 'Encrypted Escrow',
    description: 'SVM escrow with confidential release conditions.',
    icon: <Zap className="w-4 h-4" />,
    chain: 'svm',
    prompt: 'Build a Solana Anchor contract using Inco SVM bindings for a confidential escrow. The release condition is an encrypted boolean state.'
  }
];

interface TemplatesProps {
  onSelect: (prompt: string, chain: 'evm' | 'svm') => void;
  activeChain: 'evm' | 'svm';
}

export function Templates({ onSelect, activeChain }: TemplatesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {TEMPLATES.filter(t => t.chain === activeChain).map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.prompt, template.chain)}
          className="group relative flex flex-col p-4 border-2 border-terminal-text/10 bg-black/40 hover:border-terminal-accent/50 hover:bg-terminal-accent/5 transition-all text-left rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-terminal-text/10 rounded-lg group-hover:text-terminal-accent transition-colors">
              {template.icon}
            </div>
            <h4 className="font-black text-xs uppercase tracking-tighter text-terminal-text">{template.name}</h4>
          </div>
          <p className="text-[10px] text-terminal-text/50 leading-tight">
            {template.description}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[8px] font-mono opacity-30">TYPE: {template.chain === 'evm' ? 'SOLIDITY' : 'RUST'}</span>
            <div className="px-2 py-0.5 border border-terminal-text/20 rounded text-[8px] font-black group-hover:bg-terminal-accent group-hover:text-terminal-bg transition-all">
              LOAD_TEMPLATE
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
