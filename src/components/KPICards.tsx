'use client';

import React from 'react';
import { BillingEngineOutput, MemberBillingResult } from '@/billing-engine/types';
import { formatTaka } from '@/lib/money';
import { Utensils, Wallet, ShoppingBag, Clock, Crown, ShieldCheck } from '@/components/icons';
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

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isRefundable = (userBalance?.netBalance ?? 0) >= 0;
  const messTotalBazar =
    calculation.totalRegularBazar +
    calculation.totalBigBazarCost +
    calculation.totalExtraBazarPool;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Meal Rate */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] glow-indigo">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">{t('kpi.liveMealRate')}</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatTaka(calculation.mealRate, { decimals: 2 })}
          </span>
          <span className="text-xs text-slate-400">{t('kpi.perUnit')}</span>
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

      {/* 2. My Balance (For Members) OR System Overview (For Super Admin) */}
      {isSuperAdmin ? (
        <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] glow-indigo">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-300 font-semibold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              {t('kpi.superAdminOverview')}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {calculation.allMembersSummary.length}
            </span>
            <span className="text-xs text-purple-300 font-medium">
              {language === 'en' ? ' Active Members' : ' জন সক্রিয় সদস্য'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div>
              <span>{language === 'en' ? 'Total Deposits: ' : 'মোট জমা: '}</span>
              <strong className="text-emerald-400 font-mono">{formatTaka(calculation.totals.totalCredits)}</strong>
            </div>
            <div className="text-right">
              <span>{language === 'en' ? 'Total Expenses: ' : 'মোট খরচ: '}</span>
              <strong className="text-rose-400 font-mono">{formatTaka(calculation.totals.totalDues)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] ${
            isRefundable ? 'glow-emerald' : 'glow-rose'
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all pointer-events-none ${
              isRefundable
                ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
                : 'bg-rose-500/10 group-hover:bg-rose-500/20'
            }`}
          />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">{t('kpi.myBalance')}</span>
            <div
              className={`p-2 rounded-xl border ${
                isRefundable
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isRefundable ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {userBalance ? formatTaka(userBalance.netBalance, { showSign: true }) : '৳০'}
            </span>
            <span className="text-xs text-slate-400">
              {isRefundable
                ? (language === 'en' ? '(Refundable)' : '(ফেরত পাবেন)')
                : (language === 'en' ? '(Due remaining)' : '(দেনা বাকি)')}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>
              {language === 'en' ? 'Total Deposits: ' : 'মোট জমা: '}
              <strong className="text-slate-200">{formatTaka(userBalance?.totalCredits || 0)}</strong>
            </span>
            <span>
              {language === 'en' ? 'Total Expenses: ' : 'মোট খরচ: '}
              <strong className="text-slate-200">{formatTaka(userBalance?.totalDues || 0)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3. Bazar Card: Member sees THEIR OWN bazar; Super Admin sees overall mess bazar */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">
            {isSuperAdmin
              ? (language === 'en' ? 'Mess Total Approved Bazar' : 'মেসের অনুমোদিত মোট বাজার')
              : (language === 'en' ? 'My Approved Bazar' : 'আমার অনুমোদিত মোট বাজার')}
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isSuperAdmin
              ? formatTaka(messTotalBazar)
              : formatTaka(userBalance?.approvedBazarSpentOwnMoney || 0)}
          </span>
          {!isSuperAdmin && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
              {t('kpi.yourContribution')}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          {isSuperAdmin ? (
            <>
              <span>
                {language === 'en' ? 'Regular: ' : 'রেগুলার: '}
                <strong className="text-slate-200">{formatTaka(calculation.totalRegularBazar)}</strong>
              </span>
              <span>
                {language === 'en' ? 'Big Bazar: ' : 'বড় বাজার: '}
                <strong className="text-slate-200">{formatTaka(calculation.totalBigBazarCost)}</strong>
              </span>
            </>
          ) : (
            <>
              <span>
                {language === 'en' ? 'Mess Total: ' : 'মেসের মোট বাজার: '}
                <strong className="text-slate-200">{formatTaka(messTotalBazar)}</strong>
              </span>
              <span>
                {language === 'en' ? 'Regular: ' : 'রেগুলার: '}
                <strong className="text-slate-300">{formatTaka(calculation.totalRegularBazar)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 4. Pending Requests & Tasks */}
      <div
        onClick={() => onNavigateToTab?.('meals')}
        className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px] cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">{t('kpi.pendingRequests')}</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {pendingCounts.mealRequests + pendingCounts.bazars}
          </span>
          <span className="text-xs text-slate-400">
            {language === 'en' ? ' Requests' : 'টি রিকোয়েস্ট'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span>
            {language === 'en' ? 'Meal Requests: ' : 'মিল রিকোয়েস্ট: '}
            <strong className="text-cyan-300">{pendingCounts.mealRequests}</strong>
          </span>
          <span>
            {language === 'en' ? 'Bazar Entries: ' : 'বাজার ভাউচার: '}
            <strong className="text-cyan-300">{pendingCounts.bazars}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
