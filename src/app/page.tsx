'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Calendar,
  Lightbulb,
  Users,
  Shield,
  Crown,
  CheckCircle2,
  ArrowRight,
  Calculator,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt,
  Scale,
} from 'lucide-react';
import { formatTaka } from '@/lib/money';

export default function HomePage() {
  // Interactive Live Calculator state
  const [calcBazar, setCalcBazar] = useState<number>(12000);
  const [calcMeals, setCalcMeals] = useState<number>(200);
  const [calcUserMeals, setCalcUserMeals] = useState<number>(35);
  const [calcDeposit, setCalcDeposit] = useState<number>(2500);

  // Derived calculations
  const liveMealRate = calcMeals > 0 ? calcBazar / calcMeals : 0;
  const userMealCost = calcUserMeals * liveMealRate;
  const userBalance = calcDeposit - userMealCost;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-slate-800/80">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>আধুনিক, শতভাগ স্বচ্ছ ও স্বয়ংক্রিয় মেস ম্যানেজমেন্ট ইআরপি</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            মেস হিসাবের সকল জটিলতা শেষ,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              এবার স্মার্ট ও নির্ভুল সমাধান
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            লাইভ মিল রেট গণনা, রেগুলার ও ফিক্সড বাজার, বড় বাজার ক্যারি ফরওয়ার্ড, রোস্টার বণ্টন এবং
            সদস্যদের রিয়েল-টাইম দেনা-পাওনা বিবরণী — সবই এক প্ল্যাটফর্মে।
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>মেস ড্যাশবোর্ডে প্রবেশ করুন</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <a
              href="#calculation-guide"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm sm:text-base transition-colors"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>হিসাবের নিয়ম ও গাইড দেখুন</span>
            </a>
          </div>

          {/* Quick Stats Highlights */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-indigo-400 text-xs font-semibold block mb-1">রিয়েল-টাইম</span>
              <span className="text-xl sm:text-2xl font-bold text-white block">লাইভ রেট</span>
              <span className="text-[11px] text-slate-400 mt-1 block">বাজার ও মিলের তাৎক্ষণিক অনুপাত</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-emerald-400 text-xs font-semibold block mb-1">স্বচ্ছতা</span>
              <span className="text-xl sm:text-2xl font-bold text-white block">৪ স্তরের বাজার</span>
              <span className="text-[11px] text-slate-400 mt-1 block">রেগুলার, ফিক্সড, এক্সট্রা ও বড় বাজার</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-amber-400 text-xs font-semibold block mb-1">দায়িত্ব বণ্টন</span>
              <span className="text-xl sm:text-2xl font-bold text-white block">ডিউটি রোস্টার</span>
              <span className="text-[11px] text-slate-400 mt-1 block">স্বয়ংক্রিয় বাজার স্লট ও অদলবদল</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-purple-400 text-xs font-semibold block mb-1">নিরাপত্তা</span>
              <span className="text-xl sm:text-2xl font-bold text-white block">স্ন্যাপশট</span>
              <span className="text-[11px] text-slate-400 mt-1 block">মাস শেষে অপরিবর্তনীয় হিসাব সংরক্ষণ</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-16 sm:py-24 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              মেস পরিচালনার প্রতিটি স্তরে পূর্ণ নিয়ন্ত্রণ
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              কাগজে কলমে বা এক্সেল শিটের ভুলের দিন শেষ। সব হিসাব অ্যালগরিদম দ্বারা নির্ভুলভাবে পরিচালিত হয়।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">স্বয়ংক্রিয় মিল রেট ক্যালকুলেশন</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                প্রতিটি বাজার এন্ট্রি অনুমোদিত হওয়ার সাথে সাথেই লাইভ মিল রেট স্বয়ংক্রিয়ভাবে আপডেট হয়। মিল পুল এবং সদস্যদের মোট মিল ইউনিটের নির্ভুল ভাগ।
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">৪ ধরনের বাজার ব্যবস্থাপনা</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                নিত্যদিনের রেগুলার বাজার, শুক্রবারের স্পেশাল ফিক্সড আয়োজন, তেল-মসলার বড় বাজার এবং নির্দিষ্ট সদস্যদের আলাদা এক্সট্রা খরচ।
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">ডিউটি রোস্টার ও অদলবদল</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                মাসের মোট দিনকে সক্রিয় সদস্যদের মধ্যে সমান স্লটে ভাগ করে দেয়া হয়। কোনো সদস্যের সমস্যা হলে অন্য সদস্যের সাথে স্লট পরিবর্তনের রিকোয়েস্ট পাঠাতে পারেন।
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">ইউটিলিটি বিল ও রুম ভাড়া</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                পানি, গ্যাস, বিদ্যুৎ এবং খালা বিল সক্রিয় সদস্যদের মাঝে সমান ভাগ হয়। প্রতিটি সদস্যের জন্য নির্ধারিত রুম ভাড়া আলাদাভাবে সমন্বয় করা যায়।
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">স্বচ্ছ রিয়েল-টাইম ব্যালেন্স শিট</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                মোট দেনা ও মোট ক্রেডিটের পার্থক্যে তাৎক্ষণিক ব্যালেন্স দেখা যায়। কে টাকা ফেরত পাবেন আর কার কত পরিশোধ করতে হবে তা সবসময় পরিষ্কার।
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">রোল ভিত্তিক এক্সেস ও অডিট ট্রেইল</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                সুপার এডমিন, মেস ম্যানেজার ও সাধারণ সদস্যের আলাদা পারমিশন। কে কখন বাজার এন্ট্রি দিয়েছে বা অনুমোদন করেছে তার সম্পূর্ণ রেকর্ড সংরক্ষিত থাকে।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Mini-Calculator Section */}
      <section className="py-16 sm:py-20 bg-slate-900/40 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              লাইভ টেস্ট করুন
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
              ইন্টারেক্টিভ মিল রেট ও ব্যালেন্স সিমুলেটর
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ইনপুট পরিবর্তন করে দেখুন কিভাবে মিল রেট এবং আপনার দেনা-পাওনা তাৎক্ষণিক পরিবর্তিত হয়।
            </p>
          </div>

          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Sliders / Inputs */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">মেসের মোট বাজার খরচ:</span>
                  <span className="text-indigo-400 font-mono font-bold">{formatTaka(calcBazar)}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="50000"
                  step="500"
                  value={calcBazar}
                  onChange={(e) => setCalcBazar(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">মেসের সর্বমোট মিল ইউনিট:</span>
                  <span className="text-indigo-400 font-mono font-bold">{calcMeals} ইউনিট</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="5"
                  value={calcMeals}
                  onChange={(e) => setCalcMeals(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">আপনার খাওয়া মিল:</span>
                  <span className="text-emerald-400 font-mono font-bold">{calcUserMeals} ইউনিট</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={calcUserMeals}
                  onChange={(e) => setCalcUserMeals(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">আপনার মেস একাউন্টে জমা:</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatTaka(calcDeposit)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="200"
                  value={calcDeposit}
                  onChange={(e) => setCalcDeposit(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Live Output Card */}
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="text-center pb-4 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-medium">হিসাবকৃত মিল রেট</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                  {formatTaka(liveMealRate, { decimals: 2 })}
                  <span className="text-xs text-slate-400 font-normal ml-1">/ মিল</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  (৳{calcBazar.toLocaleString()} ÷ {calcMeals} মিল)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">আপনার মিল খরচ:</span>
                  <span className="font-mono text-slate-200">{formatTaka(userMealCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">আপনার মোট জমা:</span>
                  <span className="font-mono text-emerald-300 font-semibold">{formatTaka(calcDeposit)}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-slate-300 font-bold">আপনার বর্তমান ব্যালেন্স:</span>
                  <span
                    className={`font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg ${
                      userBalance >= 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {formatTaka(userBalance, { showSign: true })}{' '}
                    {userBalance >= 0 ? '(ফেরত পাবেন)' : '(দেনা বাকি)'}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
              >
                <span>ড্যাশবোর্ডে আসল ডাটা দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Calculation Guide & Documentation */}
      <section id="calculation-guide" className="py-16 sm:py-24 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              অফিশিয়াল হিসাব পদ্ধতি ও নিয়মাবলী
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-3">
              ক্যালকুলেশন ডিরেক্টরি — কোন হিসাব কিভাবে হয়?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              সফটওয়্যারটির আর্কিটেকচার প্রতিটি পয়সার হিসাব স্বয়ংক্রিয় ও গাণিতিকভাবে প্রমাণের মাধ্যমে সম্পন্ন করে।
            </p>
          </div>

          <div className="space-y-6">
            {/* Rule 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs">
                  ১
                </div>
                <h3>লাইভ মিল রেট নির্ণয়ের সূত্র (Meal Rate Formula)</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                মেসের মোট অনুমোদিত মিল পুলের খরচকে সকল সদস্যের মোট খাওয়া মিল ইউনিট দিয়ে ভাগ করে মিল রেট বের করা হয়:
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs sm:text-sm text-indigo-300 overflow-x-auto">
                মিল রেট = (অনুমোদিত রেগুলার বাজার + মিল পুল এক্সট্রা বাজার + বড় বাজারের খরচ বাদ ক্যারি) ÷ মোট মিল ইউনিট
              </div>
              <p className="text-[11px] text-slate-400">
                • সকালের মিলকে সাধারণ ওয়েট <strong>০.৫</strong> এবং রাতের মিলকে সাধারণ ওয়েট <strong>১.০</strong> ধরা হয় (মেস সেটিংসে পরিবর্তনযোগ্য)।
              </p>
            </div>

            {/* Rule 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs">
                  ২
                </div>
                <h3>বড় বাজার ও উদ্বৃত্ত ক্যারি ফরওয়ার্ড (Big Bazar & Carry)</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                মাসের শুরুতে তেল, মসলা, চাল ইত্যাদির জন্য প্রতিটি সদস্য নির্দিষ্ট কন্ট্রিবিউশন জমা দেন (যেমন: ৳১,৪০০)।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>বড় বাজারের টাকা সাধারণ মিল ফান্ড থেকে আলাদা থাকে।</li>
                <li>মাস শেষে কেনা মালামাল থেকে যদি কিছু উদ্বৃত্ত অবশিষ্ট থাকে, তবে তার আনুমানিক মূল্য (L_carry) পরবর্তী মাসের চক্রে ক্রেডিট হিসেবে স্থানান্তর করা হয়।</li>
              </ul>
            </div>

            {/* Rule 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs">
                  ৩
                </div>
                <h3>ফিক্সড আয়োজন শেয়ার (Fixed Events / Feast)</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                শুক্রবার বা ছুটির দিনে বিশেষ ভুরিভোজের (যেমন বিরিয়ানি বা খিচুড়ি) খরচ সাধারণ মিল পুলে যুক্ত হয় না।
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs sm:text-sm text-amber-300 overflow-x-auto">
                মাথাপিছু ফিক্সড খরচ = আয়োজনের মোট খরচ ÷ উক্ত আয়োজনে অংশগ্রহণকারী সদস্য সংখ্যা
              </div>
              <p className="text-[11px] text-slate-400">
                • যে সকল সদস্য ওই আয়োজনে উপস্থিত ছিলেন না, তাদের উপর কোনো অতিরিক্ত দেনা ধার্য করা হয় না।
              </p>
            </div>

            {/* Rule 4 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5 text-purple-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs">
                  ৪
                </div>
                <h3>ইউটিলিটি বিল ও রুম ভাড়া বণ্টন</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                মেসের চলতি মাসের পানি, বিদ্যুৎ, গ্যাস, ওয়াইফাই এবং খালা বিলের মোট পরিমাণকে সকল সক্রিয় সদস্যের মাঝে সমানভাবে ভাগ করা হয়। এছাড়া যার যার রুম ভাড়া তার মোট দেনায় ব্যক্তিগতভাবে যোগ হয়।
              </p>
            </div>

            {/* Rule 5 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xs">
                  ৫
                </div>
                <h3>মোট দেনা, ক্রেডিট ও চূড়ান্ত ব্যালেন্সের সমীকরণ</h3>
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-rose-300 overflow-x-auto">
                  মোট দেনা = মিল খরচ + ফিক্সড শেয়ার + ইউটিলিটি শেয়ার + রুম ভাড়া + নন-পুল এক্সট্রা শেয়ার
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-emerald-300 overflow-x-auto">
                  মোট ক্রেডিট = সাধারণ জমা + বড় বাজার ফান্ড জমা + নিজস্ব পকেট থেকে করা অনুমোদিত বাজার খরচ
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-indigo-300 overflow-x-auto font-bold">
                  চূড়ান্ত ব্যালেন্স = মোট ক্রেডিট - মোট দেনা
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                • ব্যালেন্স <strong>পজিটিভ (+)</strong> হলে মেস থেকে ওই টাকা ফেরত পাবেন।
                <br />• ব্যালেন্স <strong>নেগেটিভ (-)</strong> হলে মেসের ফান্ডে ওই পরিমাণ টাকা পরিশোধ করতে হবে।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role & Permissions Directory */}
      <section className="py-16 sm:py-24 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              ব্যবহারকারী ভূমিকা ও নিয়ন্ত্রণ ক্ষমতা
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              সফটওয়্যারটিতে ৩ স্তরের ভূমিকা নির্ধারণ করা রয়েছে:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Super Admin */}
            <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Crown className="w-5 h-5" />
                <span>👑 সুপার এডমিন (Super Admin)</span>
              </div>
              <p className="text-xs text-slate-300">
                মুহাম্মদ শিহাব উদ্দিন (স্থায়ী মালিক)। কেউ তাকে পদচ্যুত করতে পারবে না।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>যেকোনো সদস্যকে মেস ম্যানেজার নিযুক্ত করা ও পদ থেকে সরানো।</li>
                <li>মেসের নিয়ম ও সেটিংস পরিবর্তন করা।</li>
                <li>মাসিক হিসাব চক্র স্থায়ীভাবে বন্ধ বা পুনরায় খোলা।</li>
              </ul>
            </div>

            {/* Mess Manager */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Shield className="w-5 h-5" />
                <span>🛡️ মেস ম্যানেজার (Manager)</span>
              </div>
              <p className="text-xs text-slate-300">
                সুপার এডমিন কর্তৃক মনোনীত সদস্য যিনি চলতি মাসের মেস দেখাশোনা করবেন।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>সদস্যদের বাজার খরচ যাচাই ও অনুমোদন/বাতিল।</li>
                <li>দেরিতে আসা বা অন-টাইম মিল অফ/অন রিকোয়েস্টে সিদ্ধান্ত।</li>
                <li>ডিউটি রোস্টার বণ্টন এবং ইউটিলিটি বিলের হিসাব এন্ট্রি।</li>
              </ul>
            </div>

            {/* Member */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>👤 মেস সদস্য (Member)</span>
              </div>
              <p className="text-xs text-slate-300">
                গুগল দিয়ে লগইন করা বা মেসে থাকা যেকোনো সাধারণ সদস্য।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>নিজের প্রতিদিনের মিল বুকিং বা মিল বন্ধের রিকোয়েস্ট।</li>
                <li>বাজারের ভাউচার ও রসিদের এন্ট্রি পাঠানো।</li>
                <li>ব্যক্তিগত বিস্তারিত স্টেটমেন্ট দেখা ও রোস্টার বদলানো।</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Banner */}
      <section className="py-16 sm:py-20 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            প্রস্তুত আপনার মেসকে স্মার্টভাবে পরিচালনা করতে?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            এখনই লগইন করে আপনার মেসের লাইভ হিসাব ও বাজার শিট পরীক্ষা করুন।
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-105"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>সরাসরি ড্যাশবোর্ডে যান</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 space-y-2">
        <p>
          মেস ম্যানেজমেন্ট সিস্টেম — তৈরি করেছেন <strong>শিহাব ল্যাবস</strong> | Next.js (App Router), TypeScript &amp; MongoDB Atlas
        </p>
        <p className="text-[11px] text-slate-600">
          সর্বস্বত্ব সংরক্ষিত © ২০২৬ শান্তিনীড় মেস ইআরপি
        </p>
      </footer>
    </div>
  );
}
