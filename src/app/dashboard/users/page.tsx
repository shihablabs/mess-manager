'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { MembersTab } from '@/components/MembersTab';
import { GlobalLoader } from '@/components/GlobalLoader';

import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { getMemberBillingResultSafe } from '@/lib/safe-utils';

import { ShieldAlert, ArrowLeft } from '@/components/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserManagementPage() {
  const router = useRouter();
  const {
    currentUser,
    members,
    summaryData,
    refreshData,
    openStatement,
    isLoading,
  } = useDashboard();

  if (isLoading && (!members || members.length === 0)) {
    return (
      <GlobalLoader
        message="ইউজার ও সদস্য তালিকা লোড হচ্ছে..."
        subMessage="অনুমোদন, রোল বণ্টন ও আর্থিক হিসাব বিবরণী প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  // Strict RBAC Guard: Only Super Admin and Mess Manager are authorized
  const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              সংরক্ষিত প্রশাসনিক এলাকা (403 Forbidden)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              প্রবেশাধিকার সংরক্ষিত
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              সদস্য অনুমোদন, রুম ভাড়া নির্ধারণ ও রোল ম্যানেজমেন্ট শুধুমাত্র <strong>সুপার অ্যাডমিন</strong> ও <strong>মেস ম্যানেজারের</strong> জন্য সংরক্ষিত।
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরে যান</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MasterErrorBoundary fallbackTitle="ইউজার ও সদস্য তালিকা লোড করতে সমস্যা হয়েছে">
        <MembersTab
          currentUser={currentUser}
          members={members}
          cycle={summaryData?.cycle}
          onRefresh={refreshData}
          onOpenStatement={(m: any) => {
            const calcResult = getMemberBillingResultSafe(summaryData?.calculation, m.userId);
            if (calcResult) {
              openStatement(calcResult);
            }
          }}
        />
      </MasterErrorBoundary>
    </div>
  );
}
