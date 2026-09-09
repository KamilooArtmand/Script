import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, Sparkles, Zap } from 'lucide-react';
import { PYTHON_SCRIPT_CODE, BATCH_LAUNCHER_CODE, POWERSHELL_SCRIPT_CODE } from '../data/codeSnippets';

export default function CodeViewer() {
  const [activeTab, setActiveTab] = useState<'batch' | 'powershell' | 'python'>('batch');
  const [copied, setCopied] = useState(false);

  let activeCode = BATCH_LAUNCHER_CODE;
  let fileName = 'Font-FIX.bat';
  let badgeText = 'Direct Launcher';
  let subtitle = 'Pure Native Windows Launcher • Zero Python Required • Double-Click & Run';

  if (activeTab === 'powershell') {
    activeCode = POWERSHELL_SCRIPT_CODE;
    fileName = 'Font-FIX.ps1';
    badgeText = 'Pure PowerShell';
    subtitle = 'Native .NET Binary TTF/OTF Parser • Zero Dependencies • Idempotent & Audit';
  } else if (activeTab === 'python') {
    activeCode = PYTHON_SCRIPT_CODE;
    fileName = 'Font-FIX.py';
    badgeText = 'Python Edition';
    subtitle = 'fontTools & Rich Engine • Cross-Platform (Windows / Mac / Linux)';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-2.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/70 p-1 rounded-lg border border-zinc-800/80">
          <button
            id="tab-batch"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'batch'
                ? 'bg-emerald-600/90 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-300" />
            <span>Font-FIX.bat</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
              Zero-Python
            </span>
          </button>

          <button
            id="tab-powershell"
            onClick={() => setActiveTab('powershell')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'powershell'
                ? 'bg-indigo-600/90 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-300" />
            <span>Font-FIX.ps1</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
              PowerShell
            </span>
          </button>

          <button
            id="tab-python"
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'python'
                ? 'bg-blue-600/90 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-300" />
            <span>Font-FIX.py</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/50">
              Python
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            id="btn-download-file"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {fileName}</span>
          </button>
        </div>
      </div>

      {/* Code Header Info */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{subtitle}</span>
        </div>
        <span className="font-mono text-zinc-500">{activeCode.split('\n').length} lines</span>
      </div>

      {/* Code Display Area */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs">
        <div className="max-h-[580px] overflow-auto p-4 leading-relaxed text-zinc-300 select-text">
          <pre className="whitespace-pre">
            <code>{activeCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

