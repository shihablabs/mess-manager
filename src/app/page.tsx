'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Calendar,
  Users,
  Shield,
  Crown,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt,
  ArrowRightLeft,
  Package,
  FileText,
  Database,
  Printer,
  Clock,
  Zap,
  Check,
  Coffee,
  Sun,
  Moon,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { useSession, signIn } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();

  // Interactive Live Calculator state
  const [calcBazar, setCalcBazar] = useState<number>(15000);
  const [calcMeals, setCalcMeals] = useState<number>(250);
  const [calcUserMeals, setCalcUserMeals] = useState<number>(40);
  const [calcDeposit, setCalcDeposit] = useState<number>(3000);

  // Derived calculations
  const liveMealRate = calcMeals > 0 ? calcBazar / calcMeals : 0;
  const userMealCost = calcUserMeals * liveMealRate;
  const userBalance = calcDeposit - userMealCost;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        {/* Glowing gradient ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-6 shadow-lg shadow-indigo-500/10 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>স্মার্ট মেস ম্যানেজমেন্ট সিস্টেম — ভার্সন ১.০</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            মেসের খাতা-কলমের হিসাবের দিন শেষ,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              এবার সবকিছু ১০০% নির্ভুল ও স্বচ্ছ
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ৫ দিনের স্বয়ংক্রিয় বাজার রোস্টার, সদস্য-থেকে-সদস্য ইনস্ট্যান্ট সোয়াপ, লাইভ মিল রেট এবং এক ক্লিকে পূর্ণাঙ্গ দেনা-পাওনা লেজার।
          </p>

          {/* Action CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            {status === 'authenticated' ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>মেস ড্যাশবোর্ডে প্রবেশ করুন</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>গুগল অ্যাকাউন্ট দিয়ে লগইন করুন</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}

            <a
              href="#features-showcase"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm sm:text-base transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>নতুন ফিচারসমূহ দেখুন</span>
            </a>
          </div>

          {/* Quick Metrics Badges */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/30 transition-all">
              <span className="text-indigo-400 text-xs font-semibold block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> ৫ দিনের রোস্টার
              </span>
              <span className="text-lg sm:text-xl font-bold text-white block">স্লট বণ্টন ও রোটেশন</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">মাসে ৫ দিন করে দায়িত্ব চক্র</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/30 transition-all">
              <span className="text-emerald-400 text-xs font-semibold block mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" /> ইনস্ট্যান্ট সোয়াপ
              </span>
              <span className="text-lg sm:text-xl font-bold text-white block">ডিউটি অদলবদল</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">সদস্য সম্মতিতেই সোয়াপ কার্যকর</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-amber-500/30 transition-all">
              <span className="text-amber-400 text-xs font-semibold block mb-1 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" /> সরাসরি বাজার
              </span>
              <span className="text-lg sm:text-xl font-bold text-white block">আইটেম রসিদ ফর্দ</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">অনুমোদন ঝামেলামুক্ত এন্ট্রি</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-purple-500/30 transition-all">
              <span className="text-purple-400 text-xs font-semibold block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> দৈনিক মিল খাতা
              </span>
              <span className="text-lg sm:text-xl font-bold text-white block">১ লাইনে ৩ বেলার মিল</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">সকাল, দুপুর ও রাতের সুবিন্যস্ত হিসাব</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE FEATURES SHOWCASE */}
      <section id="features-showcase" className="py-16 sm:py-24 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              আধুনিক ও স্বয়ংক্রিয় সুবিধা
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-3">
              মেস পরিচালনার প্রতিটি পদক্ষেপে স্মার্ট ফিচার
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              কাগজে-কলমে বা এক্সেল শিটের ভুলের দিন শেষ। সব হিসাব লাইভ অ্যালগরিদমে নির্ভুলভাবে সম্পন্ন হয়।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: 5-Day Duty Roster & Monthly Rotation */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">৫ দিনের বাজার রোস্টার ও রোটেশন</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  মাসের মোট দিনকে সক্রিয় সদস্যদের মাঝে ৫ দিন মেয়াদী স্লটে সমানভাবে বণ্টন করা হয়। পরবর্তী মাসে সদস্যের ক্রম স্বয়ংক্রিয়ভাবে ১ ধাপ ডানে শিফট হয়ে যায়, যাতে কাউকে প্রতি মাসে একই সময়ে বাজার করতে না হয়।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                <span>স্বয়ংক্রিয় শিফট ও রিভার্স রোটেশন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2: P2P Duty Swap */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">পারস্পরিক ইনস্ট্যান্ট ডিউটি সোয়াপ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  পরীক্ষা বা জরুরি কাজ থাকলে সদস্যরা নিজেদের প্রোফাইল থেকে অন্য সদস্যকে ডিউটি সোয়াপের অনুরোধ পাঠাতে পারেন। উক্ত সদস্য &ldquo;সম্মত (Accept)&rdquo; করলেই স্বয়ংক্রিয়ভাবে স্লট অদলবদল কার্যকর হয়ে যায় (অ্যাডমিনের অনুমতি ছাড়াই)।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                <span>সুপার অ্যাডমিন ডিরেক্ট সোয়াপ সমর্থন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3: Direct Bazar Entry with Itemized Receipt */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-amber-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">সরাসরি বাজার এন্ট্রি ও আইটেম ফর্দ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  অনুমোদনের জটিলতা ছাড়াই বাজার খরচ সরাসরি তালিকায় যুক্ত হয়। একসাথে একাধিক আইটেমের পরিমাণ ও মূল্য লিখে ডিজিটাল রসিদ ফর্দ তৈরি করা যায় এবং ক্রেতার চলতি মাসের মোট খরচ দেখা যায়।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                <span>এক ক্লিকে রসিদ প্রিন্ট সুবিধা</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4: Daily Meal Sheet (1 Row Per Date) */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">১ লাইনে দৈনিক মিল খাতা</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  প্রতিদিনের সকাল (০.৫), দুপুর (১.০) ও রাতের (১.০) মিল একই সারিতে পরিচ্ছন্নভাবে প্রদর্শিত হয়। স্বয়ংক্রিয় ফিল্টারিং এবং সার্চের মাধ্যমে পুরো মাসের মিল হিস্ট্রি এক পলকে যাচাই করা যায়।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-purple-300 font-semibold flex items-center gap-1">
                <span>লাইভ মিল রেট ও ইউনিট অটোমেশন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 5: Friday Fixed Feasts & Cost Sharing */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-rose-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">শুক্রবার ভোজ ও বিশেষ মিল সমবণ্টন</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  শুক্রবার বা ছুটির দিনের স্পেশাল ভোজের খরচ সাধারণ মিল পুলে পড়ে না। শুধুমাত্র যে যে সদস্য ওই ভোজে উপস্থিত ছিলেন, তাঁদের মধ্যেই সম্পূর্ণ খরচ সমানভাবে ভাগ হয়ে যায়।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-rose-300 font-semibold flex items-center gap-1">
                <span>অনুপস্থিত সদস্যদের কোনো চার্জ নেই</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 6: Utility & Khala Bill Exemption */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">খালা বিল ও ইউটিলিটি মওকুফ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  বিদ্যুৎ, পানি, গ্যাস, ওয়াইফাই ও খালা বিল সক্রিয় সদস্যদের মাঝে সমবণ্টন। কোনো সদস্য পুরো মাস মেসে না থাকলে বা বিশেষ পরিস্থিতিতে সুপার অ্যাডমিন তাঁকে ইউটিলিটি চার্জ থেকে সম্পূর্ণ ফ্রি মওকুফ করতে পারেন।
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                <span>পকেট থেকে অগ্রিম বিল পেমেন্ট ট্র্যাকিং</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE SIMULATOR (লাইভ মিল রেট ও ব্যালেন্স সিমুলেটর) */}
      <section className="py-16 sm:py-20 bg-slate-900/40 border-b border-slate-800/80 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              লাইভ সিমুলেটর
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              ইন্টারেক্টিভ মিল রেট ও ব্যালেন্স পরীক্ষা করুন
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              স্লাইডার টেনে ইনপুট পরিবর্তন করে দেখুন তাৎক্ষণিক মিল রেট ও পাওনা/দেনা কিভাবে নির্ণীত হয়।
            </p>
          </div>

          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-slate-950/80 shadow-2xl">
            {/* Sliders / Inputs */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">মেসের মোট বাজার খরচ:</span>
                  <span className="text-indigo-400 font-mono font-bold text-sm">{formatTaka(calcBazar)}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="60000"
                  step="500"
                  value={calcBazar}
                  onChange={(e) => setCalcBazar(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">মেসের মোট মিল ইউনিট:</span>
                  <span className="text-indigo-400 font-mono font-bold text-sm">{calcMeals} ইউনিট</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="5"
                  value={calcMeals}
                  onChange={(e) => setCalcMeals(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">আপনার মোট মিল:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{calcUserMeals} ইউনিট</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={calcUserMeals}
                  onChange={(e) => setCalcUserMeals(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">আপনার মেস একাউন্টে মোট জমা:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{formatTaka(calcDeposit)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="200"
                  value={calcDeposit}
                  onChange={(e) => setCalcDeposit(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Live Output Card */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-xl">
              <div className="text-center pb-4 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-medium">হিসাবকৃত বর্তমান মিল রেট</span>
                <div className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono">
                  {formatTaka(liveMealRate, { decimals: 2 })}
                  <span className="text-xs text-slate-400 font-normal ml-1 font-sans">/ মিল</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                  (৳{calcBazar.toLocaleString()} ÷ {calcMeals} মিল)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80 font-mono">
                  <span className="text-slate-400 font-sans">আপনার মিল খরচ:</span>
                  <span className="text-slate-200 font-bold">{formatTaka(userMealCost)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80 font-mono">
                  <span className="text-slate-400 font-sans">আপনার মোট জমা:</span>
                  <span className="text-emerald-300 font-bold">{formatTaka(calcDeposit)}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-slate-200 font-bold">বর্তমান নিট ব্যালেন্স:</span>
                  <span
                    className={`font-mono font-black text-sm px-3 py-1 rounded-xl ${
                      userBalance >= 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {userBalance >= 0 ? `+${formatTaka(userBalance)}` : formatTaka(userBalance)}{' '}
                    <span className="text-[10px] font-sans font-normal">
                      {userBalance >= 0 ? '(পাওনা)' : '(দেনা)'}
                    </span>
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <span>মেস ড্যাশবোর্ডে আসল হিসাব দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (সহজ ৩ ধাপে মেস পরিচালনা) */}
      <section className="py-16 sm:py-24 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              সহজ ৩টি ধাপ
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              যেভাবে মেস ম্যানেজার কাজ করে
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              কোনো জটিল প্রশিক্ষণ ছাড়াই যে কেউ মেসের দৈনন্দিন হিসাব পরিচালনা করতে পারেন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/60 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/30">
                ০১
              </div>
              <h3 className="text-base font-bold text-white">গুগল দিয়ে লগইন ও মিল নির্ধারণ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                পাসওয়ার্ড মনে রাখার ঝামেলা নেই। গুগল দিয়ে সরাসরি লগইন করে সকাল, দুপুর ও রাতের মিল সহজেই অন/অফ করতে পারবেন।
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/60 relative">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-purple-600/30">
                ০২
              </div>
              <h3 className="text-base font-bold text-white">৫ দিনের বাজার রোস্টার ও এন্ট্রি</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                আপনার নির্ধারিত ৫ দিনে বাজার করে সরাসরি আইটেম ফর্দ এন্ট্রি দিন। কোনো সমস্যা হলে অন্য সদস্যের সাথে তৎক্ষণাৎ ডিউটি সোয়াপ করুন।
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/60 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-emerald-600/30">
                ০৩
              </div>
              <h3 className="text-base font-bold text-white">স্বয়ংক্রিয় ব্যালেন্স ও প্রিন্ট স্টেটমেন্ট</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                মাস শেষে প্লাস-মাইনাস হিসাব স্বয়ংক্রিয়ভাবে তৈরি হয়ে যায়। এক ক্লিকে পূর্ণাঙ্গ একক পাতার পিডিএফ ও প্রিন্ট স্টেটমেন্ট সংগ্রহ করুন।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. USER ROLES (সুপার অ্যাডমিন, মেস ম্যানেজার ও সাধারণ সদস্য) */}
      <section className="py-16 sm:py-24 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              ব্যবহারকারী ভূমিকা ও নিয়ন্ত্রণ ক্ষমতা
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              মেস সিস্টেমে ৩ স্তরের ভূমিকা ও স্বচ্ছ অধিকার বণ্টন রয়েছে:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Super Admin */}
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/10 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Crown className="w-5 h-5 text-purple-400" />
                <span>👑 সুপার অ্যাডমিন (Super Admin)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                মেসের স্থায়ী প্রধান। কোনো ব্যক্তিগত মিল হিসাব ছাড়াই পুরো মেসের সার্বিক নিয়ন্ত্রণ ও তদারকি করেন।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>যেকোনো সদস্যকে মেস ম্যানেজার নিযুক্ত করা।</li>
                <li>৫ দিনের বাজার রোস্টার তৈরি ও পরবর্তী মাসে রোটেশন।</li>
                <li>জরুরি প্রয়োজনে যেকোনো দুই সদস্যের সরাসরি সোয়াপ।</li>
                <li>মেস ইউটিলিটি চার্জ থেকে সদস্যদের ফ্রি মওকুফ সুবিধা।</li>
              </ul>
            </div>

            {/* Mess Manager */}
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-950/10 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>🛡️ মেস ম্যানেজার (Mess Manager)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                চলতি মাসের পরিচালনা ও তদারকির দায়িত্বে থাকা মনোনীত সদস্য।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>বড় বাজার পরিচালনা এবং শুক্রবারের বিশেষ ভোজ শিডিউল।</li>
                <li>দেরিতে আসা মিল অন/অফ রিকোয়েস্ট পর্যালোচনা।</li>
                <li>নগদ জমা গ্রহণ এবং মেস ইউটিলিটি বিলের হিসাব এন্ট্রি।</li>
              </ul>
            </div>

            {/* Member */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/60">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>👤 মেস সদস্য (Border / Member)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                মেসে থাকা যেকোনো সাধারণ সদস্য যিনি গুগল একাউন্ট দিয়ে যুক্ত।
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>দৈনিক সকাল, দুপুর ও রাতের মিল বুকিং বা মিল বন্ধ।</li>
                <li>নিজের ৫ দিনের রোস্টার ডিউটি দেখা ও সহপাঠীর সাথে সোয়াপ।</li>
                <li>বাজারের আইটেম ফর্দ সরাসরি এন্ট্রি দেওয়া।</li>
                <li>নিজের প্লাস/মাইনাস হিসাব ও পিডিএফ স্টেটমেন্ট প্রিন্ট।</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA BANNER */}
      <section className="py-16 sm:py-24 text-center relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
            <Sparkles className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white">
            প্রস্তুত আপনার মেসকে আধুনিক ও স্বয়ংক্রিয় করতে?
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            এখনই লগইন করে আপনার মেসের লাইভ মিল রেট, বাজার তালিকা ও ব্যক্তিগত ব্যালেন্স পরীক্ষা করুন।
          </p>

          <div className="pt-2 flex justify-center">
            {status === 'authenticated' ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-105"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>সরাসরি ড্যাশবোর্ডে প্রবেশ করুন</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>গুগল দিয়ে এখনই লগইন করুন</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 space-y-2 bg-slate-950">
        <p>
          মেস ম্যানেজমেন্ট সিস্টেম — তৈরি করেছেন <strong>শিহাব ল্যাবস</strong> | Next.js (App Router), TypeScript &amp; MongoDB Atlas
        </p>
        <p className="text-[11px] text-slate-600">
          সর্বস্বত্ব সংরক্ষিত © ২০২৬ Developer Zone
        </p>
      </footer>
    </div>
  );
}
