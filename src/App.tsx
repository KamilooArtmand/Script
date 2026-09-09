import React, { useState } from 'react';
import { Download, Sparkles, FolderSync, CheckCircle2, ShieldAlert, ArrowDownToLine, RefreshCw } from 'lucide-react';
import PersianSynopsis from './components/PersianSynopsis';
import LiquidFileCard from './components/LiquidFileCard';
import LiveSimulator from './components/LiveSimulator';
import { BATCH_LAUNCHER_CODE, POWERSHELL_SCRIPT_CODE, PYTHON_SCRIPT_CODE } from './data/codeSnippets';

export default function App() {
  const [showSimulator, setShowSimulator] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-50/40 text-slate-800 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Liquid Ambient Orbs (Refracted through frosted glass) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-300/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[32rem] h-[32rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />

      {/* Glass Top Navbar */}
      <header className="sticky top-0 z-50 liquid-glass border-b border-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-2 ring-white">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  Font-FIX Pro
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 shadow-2xs">
                  Zero Python • Native Windows
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                موتور استانداردسازی هم‌زمان نام پوشه‌ها و تک‌تک فایل‌های فونت در ویندوز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-toggle-sim"
              onClick={() => setShowSimulator(!showSimulator)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold liquid-button text-slate-700 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>{showSimulator ? 'بستن تست زنده' : 'تست آنلاین (Simulator)'}</span>
            </button>

            <button
              id="btn-download-all-suite"
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold liquid-primary-btn text-white rounded-xl cursor-pointer shadow-md"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span className="hidden sm:inline">دانلود پکیج کامل (۳ فایل)</span>
              <span className="sm:hidden">دانلود پکیج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 relative z-10">
        
        {/* Persian Synopsis Section */}
        <PersianSynopsis />

        {/* Action Downloads & Copy Cards (No code dumps, only actions) */}
        <section id="download-and-copy-section" className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>فایل‌های آماده برای دانلود یا کپی کد</span>
                <span className="text-xs font-normal text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                  موتور دوگانه پوشه‌ها + تک‌تک فایل‌ها
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                برای اجرای مستقیم در ویندوز، فایل <strong className="text-emerald-700 font-mono">Font-FIX.bat</strong> را دانلود کرده و کنار پوشه فونت‌ها دابل‌کلیک کنید.
              </p>
            </div>

            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              نام‌گذاری پوشه‌ها + تک‌تک فایل‌های فونت داخل آن‌ها
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Font-FIX.bat */}
            <LiquidFileCard
              id="bat"
              title="اجرای مستقیم ویندوز"
              filename="Font-FIX.bat"
              badge="پیشنهادی (۱ کلیک)"
              badgeColor="emerald"
              descriptionFa="فایل اجرایی مستقل بدون نیاز به پایتون. هم نام پوشه‌ها و هم تک‌تک فایل‌های فونت داخل پوشه‌ها را با شماره نسخه بازنام‌گذاری می‌کند."
              descriptionEn="Single-click Windows batch wrapper with dual folder & file renaming. Zero setup required."
              code={BATCH_LAUNCHER_CODE}
              isPrimary={true}
              features={['نام‌گذاری فایل‌ها + پوشه‌ها', 'بدون نیاز به پایتون', 'درگ‌اند‌دراپ پوشه', 'پشتیبانی کامل Undo']}
            />

            {/* 2. Font-FIX.ps1 */}
            <LiquidFileCard
              id="ps1"
              title="موتور نیتیو پاورشل"
              filename="Font-FIX.ps1"
              badge="Pure PowerShell"
              badgeColor="indigo"
              descriptionFa="اسکریپت خالص پاورشل با قابلیت باینری‌پارسر پیشرفته برای خواندن بایت‌های جداول فونت‌ها و تغییر نام تک‌تک فایل‌ها و پوشه‌ها."
              descriptionEn="Pure Windows PowerShell script using .NET System.IO.Stream for direct binary font header inspection."
              code={POWERSHELL_SCRIPT_CODE}
              features={['تغییر نام تک‌تک فایل‌ها', 'باینری‌پارسر .NET', 'حفظ ساختار درختی', 'ثبت لاگ Audit']}
            />

            {/* 3. Font-FIX.py */}
            <LiquidFileCard
              id="py"
              title="نسخه کراس‌پلتفرم پایتون"
              filename="Font-FIX.py"
              badge="Python 3.9+"
              badgeColor="blue"
              descriptionFa="نسخه مبتنی بر پایتون و کتابخانه fontTools ویژه کاربرانی که در محیط لینوکس، مک یا سرور کار می‌کنند."
              descriptionEn="Cross-platform Python implementation powered by fontTools and rich terminal formatting."
              code={PYTHON_SCRIPT_CODE}
              features={['پشتیبانی Mac / Linux', 'کتابخانه fontTools', 'خروجی رنگی Rich', 'سیستم Rollback']}
            />
          </div>
        </section>

        {/* Quick 3-Step Guide (Liquid Glass Card) */}
        <section id="quick-instructions" className="liquid-glass-card rounded-2xl p-6 sm:p-7 relative overflow-hidden" dir="rtl">
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            نحوه استفاده در ۳ گام آسان و سریع:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700 text-xs sm:text-sm">
            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">۱</span>
                دانلود و کپی در پوشه فونت‌ها
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                دکمه <strong>دانلود پکیج کامل</strong> را بزنید و دو فایل <code className="font-mono bg-slate-100 px-1 rounded text-emerald-800 font-semibold">Font-FIX.bat</code> و <code className="font-mono bg-slate-100 px-1 rounded text-indigo-800 font-semibold">Font-FIX.ps1</code> را داخل پوشه اصلی فونت‌هایتان (مثلاً <code className="font-mono bg-slate-100 px-1 rounded">F:\TTF\</code>) کنار هم قرار دهید.
              </p>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">۲</span>
                دابل‌کلیک روی Font-FIX.bat
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                کافی است روی فایل <strong className="font-mono text-emerald-700">Font-FIX.bat</strong> دابل‌کلیک کنید. موتور به‌صورت ۱۰۰٪ خودکار فونت‌های روت و تمام زیرپوشه‌های تودرتو را اسکن و بازنام‌گذاری می‌کند.
              </p>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-white shadow-2xs flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">۳</span>
                گزارش شفاف و پنجره پایدار
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                پنجره پس از اتمام کار باز می‌ماند تا تعداد فایل‌ها و پوشه‌های تغییر‌یافته را ببینید. تاریخچه عملیات در فایل <code className="font-mono bg-slate-100 px-1 rounded">font_fix_audit.json</code> برای Undo ذخیره می‌شود.
              </p>
            </div>
          </div>
        </section>

        {/* Optional Interactive Simulator Section */}
        {showSimulator && (
          <section id="interactive-simulator-section" className="liquid-glass rounded-2xl p-6 border border-blue-200/80 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>شبیه‌ساز زنده نام‌گذاری پوشه‌های فونت (Interactive Simulator)</span>
              </h3>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md bg-white border border-slate-200 cursor-pointer"
              >
                بستن
              </button>
            </div>
            <LiveSimulator />
          </section>
        )}

      </main>

      {/* Liquid Glass Footer */}
      <footer className="mt-12 border-t border-white/60 liquid-glass py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Font-FIX Pro v2.0 • Pure Native Windows Engine • Zero Python Required</span>
          </div>
          <div className="text-slate-400">
            طراحی شده با ساختار Liquid Glass مینیمال و نور ملایم Light
          </div>
        </div>
      </footer>
    </div>
  );
}
