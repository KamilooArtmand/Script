import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FolderSync, CheckCircle2, ArrowDownToLine, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import FeaturesSynopsis from '../components/FeaturesSynopsis';
import LiquidFileCard from '../components/LiquidFileCard';
import LiveSimulator from '../components/LiveSimulator';
import { BATCH_LAUNCHER_CODE, POWERSHELL_SCRIPT_CODE, PYTHON_SCRIPT_CODE } from '../data/codeSnippets';
import { translations } from '../data/translations';

export default function FontFixPage() {
  const navigate = useNavigate();
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeLang, setActiveLang] = useState<'en' | 'fa' | 'ku' | 'ar'>('en');

  const t = translations[activeLang];
  const isRtl = activeLang !== 'en';

  const handleDownloadAll = () => {
    // 1. Download Font-FIX.bat
    const batBlob = new Blob([BATCH_LAUNCHER_CODE], { type: 'text/plain;charset=utf-8' });
    const batUrl = URL.createObjectURL(batBlob);
    const batLink = document.createElement('a');
    batLink.href = batUrl;
    batLink.download = 'Font-FIX.bat';
    document.body.appendChild(batLink);
    batLink.click();
    document.body.removeChild(batLink);
    URL.revokeObjectURL(batUrl);

    // 2. Download Font-FIX.ps1
    setTimeout(() => {
      const psBlob = new Blob([POWERSHELL_SCRIPT_CODE], { type: 'text/plain;charset=utf-8' });
      const psUrl = URL.createObjectURL(psBlob);
      const psLink = document.createElement('a');
      psLink.href = psUrl;
      psLink.download = 'Font-FIX.ps1';
      document.body.appendChild(psLink);
      psLink.click();
      document.body.removeChild(psLink);
      URL.revokeObjectURL(psUrl);
    }, 250);

    // 3. Download Font-FIX.py
    setTimeout(() => {
      const pyBlob = new Blob([PYTHON_SCRIPT_CODE], { type: 'text/plain;charset=utf-8' });
      const pyUrl = URL.createObjectURL(pyBlob);
      const pyLink = document.createElement('a');
      pyLink.href = pyUrl;
      pyLink.download = 'Font-FIX.py';
      document.body.appendChild(pyLink);
      pyLink.click();
      document.body.removeChild(pyLink);
      URL.revokeObjectURL(pyUrl);
    }, 500);
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={`min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-50/40 text-slate-800 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
      
      {/* Background Liquid Ambient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-300/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[32rem] h-[32rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />

      {/* Glass Top Navbar */}
      <header className="sticky top-0 z-50 liquid-glass border-b border-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => navigate('/')} 
              className="w-10 h-10 rounded-2xl bg-white/50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-white hover:text-blue-600 transition-colors shadow-sm cursor-pointer"
            >
              {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-2 ring-white">
              <FolderSync className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  {t.title}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 shadow-2xs">
                  {t.subtitle}
                </span>
              </div>
              <p className="text-xs text-slate-500">{t.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/50 p-1 rounded-xl border border-white/60 shadow-sm backdrop-blur-md mr-2">
              {(['en', 'fa', 'ku', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                    activeLang === lang 
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 text-xs font-semibold liquid-button text-slate-700 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>{showSimulator ? t.closeSimBtn : t.simBtn}</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold liquid-primary-btn text-white rounded-xl cursor-pointer shadow-md"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span className="hidden sm:inline">{t.downloadBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 relative z-10" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* Features Synopsis Section */}
        <FeaturesSynopsis lang={activeLang} />

        {/* Action Downloads */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{t.readyToDownload}</span>
                <span className="text-[10px] font-normal text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                  {t.engineBadge}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.batDesc}
              </p>
            </div>

            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {t.batBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Font-FIX.bat */}
            <LiquidFileCard
              id="bat"
              title="Font-FIX.bat"
              filename="Font-FIX.bat"
              badge="1 Click"
              badgeColor="emerald"
              descriptionFa={t.features.zeroSetupDesc}
              descriptionEn={t.features.zeroSetupDesc}
              code={BATCH_LAUNCHER_CODE}
              isPrimary={true}
              features={['Zero Setup', 'Folders + Files', 'Undo Support']}
            />

            {/* 2. Font-FIX.ps1 */}
            <LiquidFileCard
              id="ps1"
              title="Font-FIX.ps1"
              filename="Font-FIX.ps1"
              badge="PowerShell"
              badgeColor="indigo"
              descriptionFa={t.features.binaryDesc}
              descriptionEn={t.features.binaryDesc}
              code={POWERSHELL_SCRIPT_CODE}
              features={['.NET Binary Parser', 'Audit Log', 'Native Win']}
            />

            {/* 3. Font-FIX.py */}
            <LiquidFileCard
              id="py"
              title="Font-FIX.py"
              filename="Font-FIX.py"
              badge="Python 3.9+"
              badgeColor="blue"
              descriptionFa="Cross-platform Python implementation powered by fontTools."
              descriptionEn="Cross-platform Python implementation powered by fontTools."
              code={PYTHON_SCRIPT_CODE}
              features={['Mac/Linux', 'fontTools Library', 'Rich Terminal']}
            />
          </div>
        </section>

        {/* Quick 3-Step Guide */}
        <section className="liquid-glass-card rounded-2xl p-6 sm:p-7 relative overflow-hidden">
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            {t.guideTitle}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700 text-xs sm:text-sm">
            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
                {t.step1Title}
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
                {t.step2Title}
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">3</span>
                {t.step3Title}
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </section>

        {showSimulator && (
          <section className="liquid-glass rounded-2xl p-6 border border-blue-200/80 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>{t.simBtn}</span>
              </h3>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md bg-white border border-slate-200 cursor-pointer"
              >
                {t.closeSimBtn}
              </button>
            </div>
            <LiveSimulator />
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/60 liquid-glass py-6 text-center text-xs text-slate-500" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Kamiloo.Dev • Open Source Tools</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
