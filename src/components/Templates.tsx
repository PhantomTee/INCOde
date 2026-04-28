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
    description: 'ERC20 with encrypted balances and transfers. Uses the Multiplexer Pattern for conditional transfers.',
    icon: <Globe className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Generate an ERC20 confidential token using Inco. Implement a transfer function that uses e.select to handle cases where the sender has insufficient balance, avoiding reverts. Ensure proper fee handling with inco.getFee() and use allow/allowThis for state updates.'
  },
  {
    id: 'private-auction',
    name: 'Private Sealed Bid',
    description: 'Highest bidder is tracked in secret. Only owner can reveal the winner.',
    icon: <Lock className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Build a sealed-bid auction. Bidders submit encrypted bids (euint256). The contract updates the current highest bid handle using e.max and tracks the highest bidder using e.select on addresses. No plaintext comparisons allowed.'
  },
  {
    id: 'encrypted-lottery',
    name: 'Secret Number Lottery',
    description: 'A lottery where the winning number is generated on-chain using FHE randomness.',
    icon: <Zap className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Create a lottery contract where the winning number is generated via e.randBounded(). Users buy tickets with encrypted numbers. The winner is determined by comparing ticket numbers to the secret winning number via e.eq.'
  },
  {
    id: 'private-dao',
    name: 'Stealth DAO',
    description: 'Confidential voting where vote tallies are never revealed in plaintext.',
    icon: <Vote className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Develop a DAO contract with confidential voting. Votes are encrypted increments to an euint balance mapping. Use e.select for vote weight logic. Decryption should only be possible after the voting period ends via e.reveal.'
  },
  {
    id: 'private-identity',
    name: 'Confidential Identity',
    description: 'Verified attributes (e.g. proof of age) without revealing the underlying data.',
    icon: <Shield className="w-4 h-4" />,
    chain: 'evm',
    prompt: 'Generate an identity verification contract. Store encrypted age (euint8). Provide a function that returns an encrypted boolean (ebool) indicating if the user is 18+ without revealing the age.'
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
