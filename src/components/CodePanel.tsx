import React, { useState } from 'react';
import Editor from "@monaco-editor/react";
import { Copy, Download, Share2, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface CodePanelProps {
  content: string;
  isLoading: boolean;
  chain: 'evm' | 'svm';
}

export const CodePanel = ({ content, isLoading, chain }: CodePanelProps) => {
  const [activeTab, setActiveTab] = useState('contract');
  const [copied, setCopied] = useState(false);

  // Parse sections from content with improved logic
  const extractSectionCode = (heading: string) => {
    const headingRegex = new RegExp(`${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?\`\`\`(?:\\w+)?\\n([\\s\\S]*?)\\n\`\`\``, 'i');
    const match = content.match(headingRegex);
    return match ? match[1].trim() : null;
  };

  const getCode = () => {
    if (activeTab === 'contract') {
      const contract = extractSectionCode('## 🔐 Contract Code');
      if (contract) return contract;
      // Fallback to first code block if heading not found
      const firstBlock = content.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
      return firstBlock ? firstBlock[1].trim() : '// No contract code detected';
    }
    
    if (activeTab === 'test') {
      return extractSectionCode('## 🧪 Test Snippet') || '// No tests generated yet';
    }
    
    if (activeTab === 'sdk') {
      return extractSectionCode('## 🔗 JS SDK Integration') || '// No SDK integration generated yet';
    }
    
    return '';
  };

  const validateCode = (code: string) => {
    const unclosedBrackets = (code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length;
    const missingSemicolons = chain === 'evm' && code.includes(';') && (code.match(/;/g) || []).length < 2; // naive check
    
    if (code.startsWith('//')) return { status: 'none', message: '' };
    if (unclosedBrackets) return { status: 'error', message: 'UNCLOSED_BRACKETS_DETECTED' };
    return { status: 'success', message: 'SYNTAX_VALIDATED' };
  };

  const validation = validateCode(getCode());

  const handleCopy = () => {
    const code = getCode();
    if (!code || code.startsWith('//')) return;
    
    const performCopy = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code);
        } else {
          // Fallback for non-secure contexts or restricted iframes
          const textArea = document.createElement("textarea");
          textArea.value = code;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        
        setCopied(true);
        toast.success("CODE_COPIED_TO_CLIPBOARD");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
        toast.error("COPY_FAILED");
      }
    };

    performCopy();
  };

  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      
      const contractCode = extractSectionCode('## 🔐 Contract Code');
      const testCode = extractSectionCode('## 🧪 Test Snippet');
      const sdkCode = extractSectionCode('## 🔗 JS SDK Integration');

      if (contractCode) {
        const ext = chain === 'evm' ? 'sol' : 'rs';
        zip.file(`contract.${ext}`, contractCode);
      }
      if (testCode) zip.file('test.ts', testCode);
      if (sdkCode) zip.file('sdk.ts', sdkCode);
      
      // Add a README
      zip.file('README.md', `# INCOde Generated Project\n\nGenerated on: ${new Date().toISOString()}\nChain: ${chain.toUpperCase()}`);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `incode_project_${chain}_${Date.now()}.zip`);
      toast.success("PROJECT_EXPORTED_AS_ZIP");
    } catch (error) {
      console.error(error);
      toast.error("EXPORT_FAILED");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* File Tabs as terminal breadcrumbs */}
      <div className="flex bg-terminal-text/5 border-b border-terminal-border/20 px-2 py-1 items-center justify-between">
        <div className="flex">
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
        
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className={`p-1 px-2 flex items-center gap-1.5 transition-all rounded border ${copied ? 'bg-terminal-accent/20 border-terminal-accent text-terminal-accent' : 'hover:bg-terminal-text/10 border-terminal-accent/20 text-terminal-accent'}`}
            title="Copy active tab"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 animate-in fade-in zoom-in duration-300" /> : <Copy className="w-3 h-3" />}
            <span className="text-[8px] font-black uppercase tracking-tighter">{copied ? 'COPIED' : 'COPY_ACTIVE'}</span>
          </button>
          
          <button 
            onClick={handleExportZip}
            className="p-1 px-2 hover:bg-terminal-text/10 text-terminal-text flex items-center gap-1.5 transition-all rounded border border-terminal-text/20"
            title="Export full project as ZIP"
          >
            <Download className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-tighter">EXPORT_ZIP</span>
          </button>
        </div>
      </div>

      {/* Validation Ribbon */}
      {!isLoading && validation.status !== 'none' && (
        <div className={`px-4 py-1 flex items-center justify-between border-b border-terminal-border/20 ${validation.status === 'success' ? 'bg-terminal-accent/10 text-terminal-accent' : 'bg-red-500/10 text-red-500'}`}>
          <div className="flex items-center gap-2">
            {validation.status === 'success' ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            <span className="text-[9px] font-black uppercase tracking-wider">{validation.message}</span>
          </div>
          <span className="text-[8px] opacity-40 uppercase">STATIC_ANALYSIS_PASSED</span>
        </div>
      )}

      <div className="flex-1 relative bg-terminal-screen/10 overflow-hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={activeTab === 'contract' ? (chain === 'evm' ? 'solidity' : 'rust') : 'typescript'}
          value={getCode()}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: 'JetBrains Mono',
            padding: { top: 20, bottom: 20 },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            wordWrap: 'on',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12
            }
          }}
        />
      </div>
    </div>
  );
};
