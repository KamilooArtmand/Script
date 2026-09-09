import React from 'react';
import { ShieldCheck, AlertTriangle, Cpu, Terminal, Check } from 'lucide-react';
import { BUG_COMPARISONS } from '../data/codeSnippets';

export default function ComparisonMatrix() {
  return (
    <div className="flex flex-col gap-6">
      {/* Intro Highlight */}
      <div className="p-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-900 border border-blue-900/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Upgraded Architecture & Technological Innovations
            </h3>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            The previous PowerShell script suffered from fatal directory path invalidation, infinite version-appending loops on re-runs, and heavy sub-process spawning. Font-FIX Pro is a unified, idempotent Python 3.9+ system with rich terminal UX and rollback safety.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-900/40 px-3 py-1.5 rounded-lg border border-blue-800/40 text-xs text-blue-300 font-mono">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span>fontTools 4.50+ • Rich CLI</span>
        </div>
      </div>

      {/* Bug & Architecture Comparison Cards */}
      <div className="grid grid-cols-1 gap-4">
        {BUG_COMPARISONS.map((bug, idx) => (
          <div
            key={idx}
            className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-zinc-500 font-semibold">0{idx + 1}</span>
                <h4 className="text-sm font-semibold text-zinc-100">{bug.title}</h4>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                  bug.severity === 'Critical'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/50'
                    : bug.severity === 'Major'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                }`}
              >
                {bug.severity}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Old Problem */}
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Previous Flaw</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{bug.oldFlaw}</p>
                <span className="text-[11px] font-mono text-zinc-500 pt-1">
                  Old: {bug.oldApproach}
                </span>
              </div>

              {/* New Solution */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Pro 2.0 Solution</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{bug.newSolution}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {bug.technologies.map((t, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 rounded text-[10px] font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How to Run Guide */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Quick Execution & Windows Setup Guide
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-1.5">
            <span className="font-semibold text-blue-400">Method 1: One-Click Launcher</span>
            <p className="text-zinc-400 leading-relaxed">
              Place <code className="text-zinc-200 font-mono">Font-FIX.bat</code> and <code className="text-zinc-200 font-mono">Font-FIX.py</code> in your font directory and double-click the .bat file. It auto-installs Python libraries and presents an interactive menu.
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-1.5">
            <span className="font-semibold text-blue-400">Method 2: Drag & Drop</span>
            <p className="text-zinc-400 leading-relaxed">
              Drag any folder containing font subfolders directly onto the <code className="text-zinc-200 font-mono">Font-FIX.bat</code> icon. The script will automatically process that folder!
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-1.5">
            <span className="font-semibold text-blue-400">Method 3: Pro Terminal CLI</span>
            <p className="text-zinc-400 leading-relaxed">
              Run commands with flags:
              <br />
              <code className="text-emerald-400 font-mono">python Font-FIX.py --dry-run</code>
              <br />
              <code className="text-amber-400 font-mono">python Font-FIX.py --undo</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
