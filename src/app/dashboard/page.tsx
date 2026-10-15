'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPICards } from '@/components/KPICards';
import { DashboardTab } from '@/components/DashboardTab';
import { GlobalLoader } from '@/components/GlobalLoader';
import { Sparkles, Crown, Shield, ArrowRight, Utensils, ShoppingBag } from '@/components/icons';
import Link from 'next/link';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { getMemberBillingResultSafe } from '@/lib/safe-utils';

export default function DashboardOverviewPage() {
  const {
    currentUser,
    summaryData,
    members,
    isLoading,
    openStatement,
    openMealRequest,
    openNewBazar,
  } = useDashboard();

  if (isLoading && !summaryData) {
    return (
      <GlobalLoader
        message="ড্যাশবোর্ড ও আর্থিক তথ্য লোড হচ্ছে..."
        subMessage="মেস হিসাবের লাইভ সামারি প্রস্তুত করা হচ্ছে"
      />
    );
  }

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* 1. Welcome Greeting Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-2xl font-black text-white">
              স্বাগতম, {currentUser?.name || 'সদস্য'}!
            </span>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                সুপার অ্যাডমিন পোর্টাল
              </span>
            ) : isManager ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                মেস ম্যানেজার
              </span>
            ) : (
              <span className="text-xs text-slate-400">👤 মেস সদস্য</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isSuperAdmin
              ? 'আপনি সিস্টেমের সকল সদস্য ও আর্থিক হিসাব পূর্ণাঙ্গভাবে নিরীক্ষা ও নিয়ন্ত্রণ করছেন।'
              : 'চলতি মাসের আপনার ব্যক্তিগত হিসাব, মেস মিল রেট এবং লাইভ খরচ নিচে প্রদর্শিত হচ্ছে।'}
          </p>
        </div>

        {/* Quick Route Navigations */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/meals"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>মিল খাতা</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
          <Link
            href="/dashboard/bazar"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>বাজার খরচ</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      {summaryData?.calculation && currentUser && (
        <MasterErrorBoundary fallbackTitle="কেপিআই কার্ড লোড করতে সমস্যা হয়েছে">
          <KPICards
            calculation={summaryData.calculation}
            userBalance={
              getMemberBillingResultSafe(summaryData.calculation, currentUser.id) ||
              summaryData?.userBalance ||
              null
            }
            pendingCounts={summaryData.pendingCounts || { mealRequests: 0, bazars: 0 }}
            currentUser={currentUser}
          />
        </MasterErrorBoundary>
      )}

      {/* 3. Dashboard Master Table & Activity */}
      <MasterErrorBoundary fallbackTitle="মাস্টার ব্যালেন্স শিট লোড করতে সমস্যা হয়েছে">
        <DashboardTab
          calculation={summaryData?.calculation || null}
          currentUserId={currentUser?.id || ''}
          onOpenStatement={openStatement}
          auditLogs={summaryData?.auditLogs || []}
          members={members}
        />
      </MasterErrorBoundary>
    </div>
  );
}
