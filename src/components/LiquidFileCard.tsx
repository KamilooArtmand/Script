import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, FileCode, Zap, ShieldCheck } from 'lucide-react';

interface LiquidFileCardProps {
  id: string;
  title: string;
  badge: string;
  badgeColor: 'emerald' | 'blue' | 'indigo';
  descriptionFa: string;
  descriptionEn: string;
  code: string;
  filename: string;
  isPrimary?: boolean;
  features: string[];
}

export default function LiquidFileCard({
  id,
  title,
  badge,
  badgeColor,
  descriptionFa,
  descriptionEn,
  code,
  filename,
  isPrimary = false,
  features
}: LiquidFileCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/20',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80 ring-blue-500/20',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-indigo-500/20',
  };

  const iconColors = {
    emerald: 'text-emerald-600 bg-emerald-100/60',
    blue: 'text-blue-600 bg-blue-100/60',
    indigo: 'text-indigo-600 bg-indigo-100/60',
  };

  return (
    <div
      id={`card-${id}`}
      className={`liquid-glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] relative overflow-hidden flex flex-col justify-between ${
        isPrimary ? 'ring-2 ring-emerald-500/30' : ''
      }`}
    >
      {/* Glossy top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${iconColors[badgeColor]}`}>
              {id === 'bat' ? (
                <Zap className="w-5 h-5" />
              ) : id === 'ps1' ? (
                <Terminal className="w-5 h-5" />
              ) : (
                <FileCode className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-800">{title}</h3>
              </div>
              <p className="text-xs text-slate-500 font-mono">{filename}</p>
            </div>
          </div>

          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ring-1 ${badgeStyles[badgeColor]}`}
          >
            {badge}
          </span>
        </div>

        {/* Persian Description */}
        <p className="text-sm font-medium text-slate-700 leading-relaxed text-right mb-2 font-sans" dir="rtl">
          {descriptionFa}
        </p>

        {/* English Subtitle */}
        <p className="text-xs text-slate-500 leading-relaxed mb-4">{descriptionEn}</p>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {features.map((feat, idx) => (
            <span
              key={idx}
              className="text-[11px] text-slate-600 bg-white/80 border border-slate-200/80 px-2.5 py-0.5 rounded-md shadow-2xs flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {feat}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons: Copy & Download ONLY */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-slate-200/60 mt-auto">
        <button
          id={`btn-copy-${id}`}
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-700 liquid-button rounded-xl cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-bold">کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              <span>کپی کد ({filename})</span>
            </>
          )}
        </button>

        <button
          id={`btn-download-${id}`}
          onClick={handleDownload}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
            isPrimary
              ? 'liquid-primary-btn text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>دانلود {filename}</span>
        </button>
      </div>
    </div>
  );
}
