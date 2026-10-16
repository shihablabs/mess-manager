'use client';

import React, { useMemo, useState } from 'react';
import { MemberBillingResult } from '@/billing-engine/types';
import { formatTaka, formatMealUnits } from '@/lib/money';
import {
  FileText,
  Wallet,
  Utensils,
  Home,
  CheckCircle,
  Clock,
  Printer,
  Plus,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from '@/components/icons';

interface MemberFinancialStatementCardProps {
  memberResult: MemberBillingResult;
  mealRate: number;
  cycleName?: string;
  deposits?: any[];
  title?: string;
  subtitle?: string;
  isViewingSelf?: boolean;
  onOpenDeposit?: () => void;
  onOpenStatement?: (memberResult: MemberBillingResult) => void;
  showMemberPicker?: boolean;
  allMembers?: any[];
  onSelectMemberId?: (userId: string) => void;
  className?: string;
}

export const MemberFinancialStatementCard: React.FC<MemberFinancialStatementCardProps> = ({
  memberResult,
  mealRate,
  cycleName = 'চলতি চক্র',
  deposits = [],
  title,
  subtitle,
  isViewingSelf = true,
  onOpenDeposit,
  onOpenStatement,
  showMemberPicker = false,
  allMembers = [],
  onSelectMemberId,
  className = '',
}) => {
  const isPlus = (memberResult?.netBalance ?? 0) >= 0;
  const netBalance = memberResult?.netBalance ?? 0;
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Filter and sort this specific member's deposits
  const memberDeposits = useMemo(() => {
    if (!deposits || !memberResult?.userId) return [];
    const list = deposits.filter(
      (d) => String(d.userId) === String(memberResult.userId)
    );
    return list.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [deposits, memberResult?.userId]);

  if (!memberResult) return null;

  // Helper for Payment Method badge
  const getMethodBadge = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'bkash':
        return { label: 'বিকাশ (bKash)', bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30' };
      case 'nagad':
        return { label: 'নগদ (Nagad)', bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
      case 'rocket':
        return { label: 'রকেট (Rocket)', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'bank':
        return { label: 'ব্যাংক', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'cash':
      default:
        return { label: 'নগদ ক্যাশ', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
  };

  // Helper for Deposit Type badge
  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'rent':
        return { label: 'বাসা ভাড়া', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'utility':
        return { label: 'ইউটিলিটি বিল', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'big_bazar':
        return { label: 'বড় বাজার ফান্ড', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'general':
      default:
        return { label: 'মেস জমা', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
  };

  // Helper for formatting date
  const formatDepositDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = [
          'জানু',
          'ফেব্রু',
          'মার্চ',
          'এপ্রিল',
          'মে',
          'জুন',
          'জুলাই',
          'আগস্ট',
          'সেপ্টে',
          'অক্টো',
          'নভে',
          'ডিসে',
        ];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${monthNames[m] || parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`glass-panel rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 shadow-2xl p-5 sm:p-7 space-y-6 relative overflow-hidden ${className}`}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div
        className={`absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isPlus ? 'bg-emerald-500/5' : 'bg-rose-500/5'
        }`}
      />

      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{title || `${memberResult.name}-এর ব্যক্তিগত আর্থিক হিসাব বিবরণী`}</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {cycleName}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {subtitle ||
              'নির্ধারিত বাসা ভাড়া, ইউটিলিটি, মিল খরচ এবং আপনার জমাকৃত প্রতিটি কিস্তির স্বচ্ছ লাইভ হিসাব।'}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {showMemberPicker && allMembers.length > 0 && onSelectMemberId && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[11px] text-slate-400">সদস্য বাছাই:</span>
              <select
                value={memberResult.userId}
                onChange={(e) => onSelectMemberId(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                {allMembers
                  .filter((m) => m.role !== 'super_admin')
                  .map((m) => (
                    <option key={m.userId || m._id} value={m.userId || m._id} className="bg-slate-900">
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {onOpenStatement && (
            <button
              onClick={() => onOpenStatement(memberResult)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm"
              title="স্টেটমেন্ট প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>প্রিন্ট / PDF</span>
            </button>
          )}

          {onOpenDeposit && (
            <button
              onClick={onOpenDeposit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title="মেসের ফান্ডে নতুন টাকা জমা এন্ট্রি করুন"
            >
              <Plus className="w-4 h-4" />
              <span>টাকা জমা দিন</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. REASSURING PERSONAL STATUS BANNER */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isPlus
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/90 border-emerald-500/30'
            : 'bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-900/90 border-indigo-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                isPlus
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {isPlus ? <CheckCircle className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {isPlus
                    ? 'চমৎকার! আপনার কোনো বকেয়া নেই'
                    : 'চলতি মাসের ব্যক্তিগত ব্যালেন্স স্থিতি'}
                </h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPlus
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isPlus ? 'উদ্বৃত্ত / ফেরত পাবেন' : 'পরিশোধ বাকি'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isPlus
                  ? `মেস ফান্ডে আপনার মোট ${formatTaka(netBalance)} টাকা অগ্রিম (পাওনা) জমা রয়েছে।`
                  : `চলতি মাসে পরিশোধের জন্য নিট বাকি: ${formatTaka(Math.abs(netBalance))} — নির্ধারিত মেস অ্যাকাউন্টে জমা দিয়ে ক্লিয়ার করুন।`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onOpenDeposit && (
              <button
                onClick={onOpenDeposit}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>টাকা জমা দিন</span>
              </button>
            )}
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              {showFullDetails ? (
                <>
                  <span>সংক্ষিপ্ত করুন</span>
                  <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                </>
              ) : (
                <>
                  <span>বিস্তারিত হিসাব</span>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. 4-PILLAR CLEAN PERSONAL SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {/* A. Total Credits */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              আপনার মোট জমা
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">{memberDeposits.length} কিস্তি</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatTaka(memberResult.totalCredits)}
          </div>
          <p className="text-[10px] text-slate-400">ক্যাশ/বিকাশে মেস ফান্ডে জমা</p>
        </div>

        {/* B. Meal Cost */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Utensils className="w-3.5 h-3.5 text-indigo-400" />
              খাবারের মিল খরচ
            </span>
            <span className="text-[10px] text-indigo-300 font-semibold font-mono">{formatMealUnits(memberResult.mealUnits)} মিল</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatTaka(memberResult.regularMealCost)}
          </div>
          <p className="text-[10px] text-slate-400">{formatMealUnits(memberResult.mealUnits)} মিল × ৳{formatTaka(mealRate, { decimals: 2 })}</p>
        </div>

        {/* C. Room Rent & Utility */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Home className="w-3.5 h-3.5 text-amber-400" />
              বাসা ভাড়া ও বিল
            </span>
            <span className="text-[10px] text-amber-300 font-semibold">ফিক্সড</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatTaka(memberResult.roomRent + memberResult.utilityShare)}
          </div>
          <p className="text-[10px] text-slate-400">ভাড়া {formatTaka(memberResult.roomRent)} + ইউটিলিটি</p>
        </div>

        {/* D. Net Balance */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border space-y-1 ${
            isPlus
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-indigo-950/30 border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={`flex items-center gap-1 ${isPlus ? 'text-emerald-300' : 'text-indigo-300'}`}>
              {isPlus ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              বর্তমান স্থিতি
            </span>
            <span className={`text-[10px] font-bold ${isPlus ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isPlus ? 'পাওনা' : 'বাকি'}
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isPlus ? 'text-emerald-400' : 'text-indigo-300'
            }`}
          >
            {isPlus ? `+${formatTaka(netBalance)}` : `-${formatTaka(Math.abs(netBalance))}`}
          </div>
          <p className="text-[10px] text-slate-300">
            {isPlus ? '✓ মেস থেকে পাবেন' : 'মেসে জমা দেওয়া বাকি'}
          </p>
        </div>
      </div>

      {/* 4. DUAL-COLUMN BREAKDOWN (COLLAPSIBLE) */}
      {showFullDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10 pt-2 border-t border-slate-800/80">
        {/* ================= LEFT COLUMN: EXPENSES BREAKDOWN ================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  ১. খরচের পূর্ণাঙ্গ হিসাব (Expenses Breakdown)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">টাকার অঙ্ক</span>
            </div>

            {/* A. HOUSE RENT (বাসা ভাড়া - High Priority, Distinctly Separated) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">নির্ধারিত বাসা / রুম ভাড়া</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ডিফল্ট ফিক্সড
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">চলতি মাসের মাসিক সিট বা রুমের নির্দিষ্ট ভাড়া</p>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-amber-300 shrink-0">
                {formatTaka(memberResult.roomRent)}
              </span>
            </div>

            {/* B. UTILITIES & STAFF (মেস ইউটিলিটি ও খালা বিল) */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">মেস ইউটিলিটি ও খালা বিল</span>
                    {memberResult.isUtilityExempt && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        মওকুফ (Free)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {memberResult.isUtilityExempt
                      ? 'অ্যাডমিন কর্তৃক এই মাসে বিল মওকুফ করা হয়েছে'
                      : 'বিদ্যুৎ, গ্যাস, পানি, খালা বিল ও ইন্টারনেটের সমবণ্টন'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-slate-200 shrink-0">
                {formatTaka(memberResult.utilityShare)}
              </span>
            </div>

            {/* C. MEAL CONSUMPTION (খাবারের মিল খরচ) */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">খাবারের মিল খরচ</span>
                    <span className="text-[10px] text-indigo-300 font-mono font-medium">
                      ({formatMealUnits(memberResult.mealUnits)} টি মিল)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {formatMealUnits(memberResult.mealUnits)} মিল × {formatTaka(mealRate, { decimals: 2 })} লাইভ রেট
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-slate-200 shrink-0">
                {formatTaka(memberResult.regularMealCost)}
              </span>
            </div>

            {/* D. FIXED EVENTS / FEAST (ফিক্সড মিল ও স্পেশাল ভোজ) */}
            {memberResult.fixedShare > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">ফিক্সড মিল / বিশেষ ভোজ</span>
                    <p className="text-[11px] text-slate-400">উপস্থিত বিশেষ ভোজ ও স্পেশাল আইটেমের অংশ</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-slate-200 shrink-0">
                  {formatTaka(memberResult.fixedShare)}
                </span>
              </div>
            )}

            {/* E. EXTRA NON-POOL BAZAR (অতিরিক্ত বাজার শেয়ার) */}
            {memberResult.extraShareNonPool > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">অতিরিক্ত বাজার শেয়ার</span>
                    <p className="text-[11px] text-slate-400">নন-মিল আইটেমের সমবণ্টন</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-slate-200 shrink-0">
                  {formatTaka(memberResult.extraShareNonPool)}
                </span>
              </div>
            )}
          </div>

          {/* Subtotal Total Dues Bar */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-black text-amber-300">
            <span>মোট মেস খরচ ও দাবি (Total Dues)</span>
            <span className="font-mono text-sm">{formatTaka(memberResult.totalDues)}</span>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ITEMIZED DEPOSITS (২০০, ৩০০, ৫০০ টাকা ইত্যাদি) ================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  ২. জমাকৃত প্রতিটি কিস্তির হিসাব (Itemized Deposits)
                </h4>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">
                {memberDeposits.length}টি এন্ট্রি
              </span>
            </div>

            {/* List of Individual Installments (200, 300, 500, etc.) */}
            {memberDeposits.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {memberDeposits.map((dep, idx) => {
                  const methodBadge = getMethodBadge(dep.paymentMethod);
                  const typeBadge = getTypeBadge(dep.type);
                  const isApproved = dep.isPaid || dep.status === 'approved';
                  const isPending = dep.status === 'pending';

                  return (
                    <div
                      key={dep._id || dep.id || idx}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="text-center font-mono shrink-0 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                          {formatDepositDate(dep.date || dep.createdAt)}
                        </div>
                        <div className="truncate space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${methodBadge.bg}`}
                            >
                              {methodBadge.label}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${typeBadge.bg}`}
                            >
                              {typeBadge.label}
                            </span>
                            {isPending ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> অপেক্ষমাণ
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> অনুমোদিত
                              </span>
                            )}
                          </div>
                          {dep.notes && (
                            <p className="text-[11px] text-slate-400 truncate italic">
                              &ldquo;{dep.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          +{formatTaka(dep.amount)}
                        </div>
                        <span className="text-[9px] text-slate-500 block">জমা</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
                <Info className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  চলতি চক্রে এখনও আপনার কোনো জমার এন্ট্রি নেই।
                </p>
                {onOpenDeposit && (
                  <button
                    onClick={onOpenDeposit}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    টাকা জমা এন্ট্রি করুন
                  </button>
                )}
              </div>
            )}

            {/* Approved Personal Bazar Spent */}
            {memberResult.approvedBazarSpentOwnMoney > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">
                    নিজ পকেট থেকে মেস বাজার খরচ
                  </span>
                  <p className="text-[11px] text-slate-400">অনুমোদিত ব্যক্তিগত অর্থায়নে বাজার</p>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  +{formatTaka(memberResult.approvedBazarSpentOwnMoney)}
                </span>
              </div>
            )}

            {/* Opening Carry Credit */}
            {(memberResult.openingCarryCredit || 0) > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">
                    পূর্ববর্তী চক্রের অবশিষ্ট জমা
                  </span>
                  <p className="text-[11px] text-slate-400">পূর্বের মাস থেকে ক্যারি-ফরোয়ার্ড</p>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  +{formatTaka(memberResult.openingCarryCredit)}
                </span>
              </div>
            )}
          </div>

          {/* Subtotal Total Credits Bar */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-black text-emerald-300">
            <span>মোট পরিশোধ ও ক্রেডিট (Total Credits)</span>
            <span className="font-mono text-sm">{formatTaka(memberResult.totalCredits)}</span>
          </div>
        </div>
      </div>
      )}

      {/* [UX CLEANUP]: ব্যবহারকারীকে অনাবশ্যক সূত্র দেখানো বাদ দেওয়া হয়েছে — কার্ডের উপরে ইতিমধ্যে 'বর্তমান অবস্থা ও নিট ব্যালেন্স' স্পষ্টভাবে প্রদর্শিত হচ্ছে */}
      {/* 
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 ${
          isPlus
            ? 'bg-emerald-950/30 border-emerald-500/40'
            : 'bg-rose-950/30 border-rose-500/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isPlus
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isPlus ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>হিসাব নিষ্পত্তি সূত্র:</span>
              <span className="font-mono text-xs text-slate-300 font-medium">
                [ মোট ক্রেডিট {formatTaka(memberResult.totalCredits)} ] - [ মোট দেনা {formatTaka(memberResult.totalDues)} ]
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isPlus
                ? 'মেস থেকে আপনি এই টাকা ফেরত বা আগামী চক্রে সমন্বয় পাবেন।'
                : 'মেসের বকেয়া পরিশোধ করতে দ্রুত নির্ধারিত একাউন্টে জমা দিন।'}
            </p>
          </div>
        </div>

        <div className="text-right self-end sm:self-center shrink-0">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
            {isPlus ? 'নিট পাওনা ব্যালেন্স' : 'নিট বকেয়া ব্যালেন্স'}
          </span>
          <span
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isPlus ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPlus ? `+${formatTaka(netBalance)}` : `-${formatTaka(Math.abs(netBalance))}`}
          </span>
        </div>
      </div>
      */}
    </div>
  );
};
