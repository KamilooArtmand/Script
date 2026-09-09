import React from 'react';
import { Sparkles, Cpu, Layers, Undo2, MousePointerClick, ShieldCheck, CheckCircle2, Files } from 'lucide-react';

export default function PersianSynopsis() {
  const missions = [
    {
      title: 'نام‌گذاری دوگانه: پوشه‌ها + تک‌تک فایل‌ها',
      description:
        'نه تنها پوشه‌ها، بلکه تک‌تک فایل‌های فونت درون هر پوشه و زیرپوشه‌ها را بر اساس شماره نسخه خود فایل بازنام‌گذاری می‌کند (مثلاً Font.ttf به Font 1.02.ttf).',
      icon: Files,
      color: 'text-rose-600 bg-rose-50 border-rose-200/80',
    },
    {
      title: 'استخراج مستقیم باینری فونت‌ها (شامل WOFF و WOFF2)',
      description:
        'خواندن بایت‌به‌بایت ساختار جداول درون فونت (name و head) با دکومپرس خودکار zlib برای WOFF 1.0، بازگشایی WOFF2 و ارث‌بری هوشمند نسخه از پوشه یا فونت‌های همتا در پسوندهای TTF, OTF, WOFF, WOFF2, TTC.',
      icon: Cpu,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
    },
    {
      title: 'تغییر نام هوشمند و ممانعت از تکرار (Idempotency)',
      description:
        'تشخیص نسخه موجود در نام فایل‌ها و پوشه‌ها؛ اگر فایلی یا پوشه‌ای قبلاً برچسب ورژن داشته باشد، آن را بازنویسی استاندارد می‌کند و از تکرار نام ممانعت می‌ورزد.',
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    },
    {
      title: 'پیمایش آبشاری امن (Bottom-Up Traversal)',
      description:
        'ابتدا عمیق‌ترین زیرپوشه‌ها و فایل‌های درون آن‌ها را برچسب‌گذاری می‌کند تا تغییر نام پوشه‌های بالادستی باعث گم‌شدن یا ارور در مسیر فایل‌ها نشود.',
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
    },
    {
      title: 'سیستم ثبت لاگ و بازگردانی سریع (Undo / Rollback)',
      description:
        'تمام تغییرات فایل‌ها و پوشه‌ها در فایل font_fix_audit.json ثبت می‌شوند؛ با اجرای سوییچ --undo تمام نام‌ها در چند ثانیه به نام‌های اصلی بازمی‌گردند.',
      icon: Undo2,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
    },
    {
      title: 'اجرای بی‌نیاز به پایتون یا نرم‌افزار جانبی (Zero-Setup)',
      description:
        'مبتنی بر هسته داخلی Windows PowerShell و فریم‌ورک .NET سیستم عامل، بدون نیاز به نصب هیچ‌گونه ابزار اضافی، pip یا حقوق دسترسی ادمین.',
      icon: CheckCircle2,
      color: 'text-teal-600 bg-teal-50 border-teal-200/80',
    },
  ];

  return (
    <section id="persian-synopsis" className="liquid-glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden" dir="rtl">
      {/* Specular light highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>سیناپس و ماموریت ارتقاءیافته اسکریپت</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Font-FIX Pro چه ماموریت و خدماتی انجام می‌دهد؟
          </h2>
        </div>

        <div className="text-xs text-slate-500 bg-white/70 backdrop-blur border border-slate-200/80 px-3 py-2 rounded-xl text-right max-w-xs shadow-2xs">
          ساماندهی استاندارد همزمان پوشه‌ها و تک‌تک فایل‌های فونت با تشخیص متادیتا بدون هیچ خطای سیستمی
        </div>
      </div>

      {/* Synopsis text overview */}
      <div className="bg-gradient-to-br from-white/90 to-blue-50/40 border border-white p-4 sm:p-5 rounded-xl shadow-2xs mb-6 text-sm text-slate-700 leading-relaxed">
        <p className="font-medium">
          <strong className="text-slate-900 font-bold">هدف اصلی:</strong> این اسکریپت تمام پوشه‌ها، زیرپوشه‌ها و <strong className="text-blue-700 font-bold">تک‌تک فایل‌های فونت</strong> (.ttf, .otf, .woff, .woff2, .ttc) را پیمایش کرده، متادیتای باینری هر فایل را جداگانه استخراج می‌کند و علاوه بر الصاق نسخه به انتهای نام پوشه‌ها، <strong className="text-emerald-700 font-bold">نام تک‌تک فایل‌های فونت داخل پوشه‌ها</strong> را نیز با شماره نسخه دقیق خود فایل بازنام‌گذاری می‌نماید (بدون تکرار و با امکان بازگردانی ۱۰۰٪ با سوییچ Undo).
        </p>
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
