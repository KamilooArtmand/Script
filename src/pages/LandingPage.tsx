import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Code2, Sparkles, FolderSync, ArrowRight, Github } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeLang, setActiveLang] = useState<'en' | 'fa' | 'ku' | 'ar'>('en');

  const content = {
    en: {
      title: 'Kamiloo Developer Tools',
      subtitle: 'A free & public repository of premium Python and PowerShell scripts',
      description: 'Discover world-class utility scripts designed for modern developers. Everything here is open-source, fast, and optimized for seamless workflows.',
      tools: 'Available Tools',
      fontFixDesc: 'Intelligent typography normalization engine. Automatically extracts weights, formats camelCase, and maps weights to CSS standards.',
      explore: 'Explore Tool',
    },
    fa: {
      title: 'ابزارهای توسعه‌دهنده کامیلو',
      subtitle: 'مخزن عمومی و رایگان اسکریپت‌های پریمیوم پایتون و پاورشل',
      description: 'کشف اسکریپت‌های کاربردی در سطح جهانی که برای توسعه‌دهندگان مدرن طراحی شده‌اند. همه چیز در اینجا متن‌باز، سریع و بهینه‌شده است.',
      tools: 'ابزارهای موجود',
      fontFixDesc: 'موتور هوشمند استانداردسازی تایپوگرافی. استخراج خودکار وزن‌ها، اصلاح کلمات چسبیده و تبدیل به استانداردهای CSS.',
      explore: 'مشاهده ابزار',
    },
    ku: {
      title: 'ئامرازەکانی گەشەپێدەری کامیلو',
      subtitle: 'کۆگایەکی گشتی و بێبەرامبەر بۆ سکریپتەکانی پایسۆن و پاوەرشێڵ',
      description: 'دۆزینەوەی سکریپتە ئاست بەرزەکان کە بۆ گەشەپێدەرانی مۆدێرن دروستکراون. هەموو شتێک لێرە سەرچاوە کراوەیە، خێرا و گونجاوە بۆ کارکردنی ئاسان.',
      tools: 'ئامرازە بەردەستەکان',
      fontFixDesc: 'ماتۆڕی زیرەکی ستانداردکردنی فۆنتەکان. دەرکێشانی ئۆتۆماتیکی کێشەکان و گۆڕینیان بۆ ستانداردی CSS.',
      explore: 'بینینی ئامراز',
    },
    ar: {
      title: 'أدوات المطور كاميلو',
      subtitle: 'مستودع عام ومجاني لنصوص بايثون وباورشيل المميزة',
      description: 'اكتشف نصوص برمجية عالمية المستوى مصممة للمطورين العصريين. كل شيء هنا مفتوح المصدر وسريع ومُحسّن لسير عمل سلس.',
      tools: 'الأدوات المتاحة',
      fontFixDesc: 'محرك ذكي لتوحيد وتنسيق الخطوط. يستخرج الأوزان تلقائيًا ويحولها إلى معايير CSS القياسية.',
      explore: 'استكشاف الأداة',
    }
  };

  const t = content[activeLang];
  const isRtl = activeLang !== 'en';

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={`min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-50/40 text-slate-800 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
      
      {/* Background Liquid Ambient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-300/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[32rem] h-[32rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 liquid-glass border-b border-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-md ring-2 ring-white">
              <Github className="w-5 h-5" />
            </div>
            <h1 className="font-extrabold text-lg tracking-tight text-slate-900">
              Kamiloo<span className="text-blue-600">.</span>Dev
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
            {(['en', 'fa', 'ku', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeLang === lang 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 relative z-10" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Source Collection</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            {t.title}
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-4">
            {t.subtitle}
          </p>
          
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
            {t.description}
          </p>
        </section>

        {/* Tools Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Terminal className="w-6 h-6 text-indigo-600" />
              {t.tools}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Font Fix Widget */}
            <div 
              onClick={() => navigate('/font-fix')}
              className="group cursor-pointer liquid-glass-card rounded-3xl p-1 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="bg-white/60 p-6 rounded-[1.35rem] h-full flex flex-col relative z-10 border border-white/60">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-5 ring-4 ring-white/50">
                  <FolderSync className="w-6 h-6" />
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                  Font-FIX Pro
                </h4>
                
                <div className="flex gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                    PowerShell
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    Batch
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
                    Python
                  </span>
                </div>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
                  {t.fontFixDesc}
                </p>
                
                <div className="mt-auto flex items-center justify-between text-blue-600 font-semibold text-sm group-hover:text-indigo-700 transition-colors">
                  <span>{t.explore}</span>
                  <ArrowRight className={`w-4 h-4 transition-transform group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'} ${isRtl ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Placeholder for future tools */}
            <div className="liquid-glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-dashed border-slate-300/60 opacity-60 min-h-[300px]">
              <Code2 className="w-10 h-10 text-slate-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-600 mb-2">More Tools Coming Soon</h4>
              <p className="text-slate-500 text-sm">Up to 50 premium scripts will be published here.</p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
