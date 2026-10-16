'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPICards } from '@/components/KPICards';
import { DashboardTab } from '@/components/DashboardTab';
import { GlobalLoader } from '@/components/GlobalLoader';
import { Sparkles, Crown, Shield, ArrowRight, Utensils, ShoppingBag } from '@/components/icons';
import Link from 'next/link';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { getMemberBillingResultSafe } from '@/lib/safe-utils';
import { MemberFinancialStatementCard } from '@/components/MemberFinancialStatementCard';

export default function DashboardOverviewPage() {
  const {
    currentUser,
    summaryData,
    members,
    deposits,
    isLoading,
    openStatement,
    openMealRequest,
    openNewBazar,
    openDeposit,
  } = useDashboard();

  const [selectedAdminMemberId, setSelectedAdminMemberId] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin';

  // Dining members list (non super_admin)
  const diningMembers = useMemo(() => {
    return (members || []).filter((m) => m.role !== 'super_admin');
  }, [members]);

  // Determine active personal statement for the user
  const activeBillingResult = useMemo(() => {
    if (!summaryData?.calculation) return null;

    if (isSuperAdmin) {
      const activeId =
        selectedAdminMemberId ||
        diningMembers[0]?.userId ||
        diningMembers[0]?._id;
      if (!activeId) return null;
      return getMemberBillingResultSafe(summaryData.calculation, activeId);
    }

    return (
      getMemberBillingResultSafe(summaryData.calculation, currentUser?.id || '') ||
      summaryData?.userBalance ||
      null
    );
  }, [
    summaryData?.calculation,
    summaryData?.userBalance,
    isSuperAdmin,
    selectedAdminMemberId,
    diningMembers,
    currentUser?.id,
  ]);

  if (isLoading && !summaryData) {
    return (
      <GlobalLoader
        message="ড্যাশবোর্ড ও আর্থিক তথ্য লোড হচ্ছে..."
        subMessage="মেস হিসাবের লাইভ সামারি প্রস্তুত করা হচ্ছে"
      />
    );
  }

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
              ? 'সুপার অ্যাডমিন হিসেবে সিস্টেমের সকল সদস্যের হিসাব নিরীক্ষা এবং যে কোনো সদস্যের আর্থিক লেজার সরাসরি পরিদর্শন করতে পারেন।'
              : 'চলতি মাসের আপনার ব্যক্তিগত আর্থিক হিসাব বিবরণী, বাসা ভাড়া এবং জমাকৃত প্রতিটি কিস্তির হিসাব নিচে প্রদর্শিত হচ্ছে।'}
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

      {/* 2. MEMBER'S PERSONAL FINANCIAL STATEMENT (সদস্যের ব্যক্তিগত আর্থিক হিসাব বিবরণী) */}
      {activeBillingResult && (
        <MasterErrorBoundary fallbackTitle="ব্যক্তিগত আর্থিক বিবরণী লোড করতে সমস্যা হয়েছে">
          <MemberFinancialStatementCard
            memberResult={activeBillingResult}
            mealRate={summaryData?.calculation?.mealRate || 0}
            cycleName={summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}
            deposits={deposits}
            isViewingSelf={!isSuperAdmin}
            showMemberPicker={isSuperAdmin}
            allMembers={diningMembers}
            onSelectMemberId={setSelectedAdminMemberId}
            onOpenDeposit={openDeposit}
            onOpenStatement={openStatement}
            title={
              isSuperAdmin
                ? `${activeBillingResult.name}-এর ব্যক্তিগত আর্থিক হিসাব বিবরণী`
                : 'আপনার ব্যক্তিগত আর্থিক হিসাব বিবরণী'
            }
            subtitle={
              isSuperAdmin
                ? 'সুপার অ্যাডমিন মোডে সদস্যের নির্ধারিত বাসা ভাড়া, ইউটিলিটি, মিল খরচ ও সকল জমার কিস্তি সরাসরি নিরীক্ষা করছেন।'
                : 'আপনার নির্ধারিত বাসা ভাড়া, মেস ইউটিলিটি, মিল খরচ এবং জমাকৃত প্রতিটি কিস্তির (২০০, ৩০০, ৫০০ ইত্যাদি) স্বচ্ছ হিসাব।'
            }
          />
        </MasterErrorBoundary>
      )}

      {/* 3. KPI Summary Cards */}
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

      {/* 4. Dashboard Master Table & Activity */}
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
