import React, { useState } from 'react';
import Editor from "@monaco-editor/react";
import { Copy, Download, Share2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface CodePanelProps {
  content: string;
  isLoading: boolean;
  chain: 'evm' | 'svm';
}

export const CodePanel = ({ content, isLoading, chain }: CodePanelProps) => {
  const [activeTab, setActiveTab] = useState('contract');

  // Parse sections from content
  const extractCode = (lang: string) => {
    const regex = new RegExp(`\`\`\`${lang}([\\s\\S]*?)\`\`\``, 'g');
    const matches = [...content.matchAll(regex)];
    return matches.map(m => m[1].trim());
  };

  const solidityBlocks = extractCode('solidity');
  const rustBlocks = extractCode('rust');
  const tsBlocks = extractCode('typescript');
  const testBlocks = extractCode('solidity'); 

  const getCode = () => {
    if (activeTab === 'contract') return chain === 'evm' ? solidityBlocks[0] : rustBlocks[0];
    if (activeTab === 'test') return (chain === 'evm' ? testBlocks[1] : rustBlocks[1]) || '// No tests generated yet';
    if (activeTab === 'sdk') return tsBlocks[0] || '// No SDK integration generated yet';
    return '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* File Tabs as terminal breadcrumbs */}
      <div className="flex bg-terminal-text/5 border-b border-terminal-border/20 px-2 py-1">
        {[
          { id: 'contract', label: chain === 'evm' ? 'Contract.sol' : 'lib.rs' },
          { id: 'test', label: chain === 'evm' ? 'test.ts' : 'anchor.rs' },
          { id: 'sdk', label: 'sdk.ts' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-[8px] font-bold uppercase transition-all ${
              activeTab === tab.id 
                ? 'text-terminal-accent underline underline-offset-4' 
                : 'text-terminal-text opacity-40 hover:opacity-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 relative bg-terminal-screen/10">
        <Editor
          height="100%"
          theme="vs-dark"
          language={activeTab === 'contract' ? (chain === 'evm' ? 'solidity' : 'rust') : 'typescript'}
          value={getCode()}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 16,
            fontFamily: 'JetBrains Mono',
            padding: { top: 20, bottom: 20 },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12
            }
          }}
          onMount={(editor) => {
            // Apply custom transparent background
            editor.updateOptions({
              "semanticHighlighting.enabled": true
            });
          }}
        />
      </div>
    </div>
  );
};
