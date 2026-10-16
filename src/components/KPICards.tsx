'use client';

import React from 'react';
import { BillingEngineOutput, MemberBillingResult } from '@/billing-engine/types';
import { formatTaka } from '@/lib/money';
import { Utensils, Wallet, ShoppingBag, Activity } from '@/components/icons';
import { AppUser } from '@/lib/session';
import { useLanguage } from '@/context/LanguageContext';

interface KPICardsProps {
  calculation: BillingEngineOutput | null;
  userBalance: MemberBillingResult | null;
  pendingCounts: { mealRequests: number; bazars: number };
  currentUser?: AppUser | null;
  onNavigateToTab?: (tab: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  calculation,
  userBalance,
  pendingCounts,
  currentUser,
  onNavigateToTab,
}) => {
  const { t, language } = useLanguage();

  if (!calculation) return null;

  const messTotalBazar =
    calculation.totalRegularBazar +
    calculation.totalBigBazarCost +
    calculation.totalExtraBazarPool;
  const pendingTotal = (pendingCounts?.mealRequests || 0) + (pendingCounts?.bazars || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Live Meal Rate */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] glow-indigo border border-slate-800/80 hover:border-indigo-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">
            {language === 'en' ? 'Live Meal Rate' : 'লাইভ মিল রেট'}
          </span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatTaka(calculation.mealRate, { decimals: 2 })}
          </span>
          <span className="text-xs text-indigo-300 font-medium">{t('kpi.perUnit')}</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>
            {language === 'en' ? 'Total Meals: ' : 'মোট মিল: '}
            <strong className="text-slate-200">{calculation.totalMealUnits}</strong>
          </span>
          <span>
            {language === 'en' ? 'Meal Pool: ' : 'মিল পুল: '}
            <strong className="text-slate-200">{formatTaka(calculation.mealPoolTotal)}</strong>
          </span>
        </div>
      </div>

      {/* 2. Total Mess Meals */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] glow-indigo border border-slate-800/80 hover:border-cyan-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">
            {language === 'en' ? 'Total Mess Meals' : 'মেসের মোট মিল'}
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {calculation.totalMealUnits}
          </span>
          <span className="text-xs text-cyan-300 font-medium">
            {language === 'en' ? 'Units Consumed' : 'ইউনিট মিল'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>
            {language === 'en' ? 'Active Members: ' : 'সক্রিয় সদস্য: '}
            <strong className="text-slate-200">{calculation.allMembersSummary.length} জন</strong>
          </span>
          <span className="text-cyan-400 font-medium">
            {language === 'en' ? 'Running Cycle' : 'চলতি চক্র'}
          </span>
        </div>
      </div>

      {/* 3. Total Mess Bazar */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] border border-slate-800/80 hover:border-amber-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">
            {language === 'en' ? 'Mess Total Bazar' : 'মেসের মোট বাজার'}
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatTaka(messTotalBazar)}
          </span>
          <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
            {language === 'en' ? 'Approved' : 'অনুমোদিত'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>
            {language === 'en' ? 'Regular: ' : 'রেগুলার: '}
            <strong className="text-slate-200">{formatTaka(calculation.totalRegularBazar)}</strong>
          </span>
          <span>
            {language === 'en' ? 'Big Bazar: ' : 'বড় বাজার: '}
            <strong className="text-slate-200">{formatTaka(calculation.totalBigBazarCost)}</strong>
          </span>
        </div>
      </div>

      {/* 4. Mess Fund & Total Deposits */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] border border-slate-800/80 hover:border-emerald-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">
            {language === 'en' ? 'Total Mess Fund & Deposits' : 'মেস ফান্ড ও মোট জমা'}
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {formatTaka(calculation.totals.totalCredits)}
          </span>
          {pendingTotal > 0 && (
            <span
              onClick={() => onNavigateToTab?.('meals')}
              className="text-[10px] text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold cursor-pointer transition-colors"
            >
              {pendingTotal}টি রিকোয়েস্ট
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>
            {language === 'en' ? 'Total Expenses: ' : 'মেস খরচ: '}
            <strong className="text-slate-200">{formatTaka(calculation.totals.totalDues)}</strong>
          </span>
          <span className="text-emerald-400 font-medium">
            {language === 'en' ? 'Verified' : 'অনুমোদিত জমা'}
          </span>
        </div>
      </div>
    </div>
  );
};

