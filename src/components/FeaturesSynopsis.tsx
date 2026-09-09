import React from 'react';
import { Sparkles, Cpu, Layers, Undo2, MousePointerClick, ShieldCheck, CheckCircle2, Files } from 'lucide-react';
import { translations } from '../data/translations';

interface Props {
  lang: 'en' | 'fa' | 'ku' | 'ar';
}

export default function FeaturesSynopsis({ lang }: Props) {
  const t = translations[lang];
  const isRtl = lang !== 'en';

  const missions = [
    {
      title: t.features.dualRenameTitle,
      description: t.features.dualRenameDesc,
      icon: Files,
      color: 'text-rose-600 bg-rose-50 border-rose-200/80',
    },
    {
      title: t.features.binaryTitle,
      description: t.features.binaryDesc,
      icon: Cpu,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
    },
    {
      title: t.features.idempotentTitle,
      description: t.features.idempotentDesc,
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    },
    {
      title: t.features.safeTraversalTitle,
      description: t.features.safeTraversalDesc,
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
    },
    {
      title: t.features.undoTitle,
      description: t.features.undoDesc,
      icon: Undo2,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
    },
    {
      title: t.features.zeroSetupTitle,
      description: t.features.zeroSetupDesc,
      icon: CheckCircle2,
      color: 'text-teal-600 bg-teal-50 border-teal-200/80',
    },
  ];

  return (
    <section id="features-synopsis" className="liquid-glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Specular light highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.title}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            {t.desc}
          </h2>
        </div>
      </div>

      {/* Grid of Missions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white/60 hover:bg-white/80 transition-all p-4 rounded-xl border border-white/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
