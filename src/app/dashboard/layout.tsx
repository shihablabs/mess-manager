'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Navbar } from '@/components/Navbar';
import { GlobalLoader } from '@/components/GlobalLoader';
import { StatementModal } from '@/components/StatementModal';
import { NewBazarModal } from '@/components/NewBazarModal';
import { NewFixedEventModal } from '@/components/NewFixedEventModal';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DepositModal } from '@/components/DepositModal';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { ShieldAlert, Clock } from 'lucide-react';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { getMemberBillingResultSafe } from '@/lib/safe-utils';

function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const {
    currentUser,
    summaryData,
    members,
    isLoading,
    refreshData,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    statementMember,
    closeStatement,
    openStatement,
    isNewBazarOpen,
    openNewBazar,
    closeNewBazar,
    isFixedEventOpen,
    openFixedEvent,
    closeFixedEvent,
    isMealRequestOpen,
    openMealRequest,
    closeMealRequest,
    isDepositOpen,
    openDeposit,
    closeDeposit,
    cycles,
    currentCycleId,
    setCurrentCycleId,
  } = useDashboard();

  // 1. Session Verification Loading
  if (status === 'loading') {
    return (
      <GlobalLoader
        message="লগইন অবস্থা ও ড্যাশবোর্ড যাচাই করা হচ্ছে..."
        subMessage="Developer Zone • মেস ম্যানেজার সুরক্ষিত প্রবেশদ্বার"
        fullScreen={true}
      />
    );
  }

  // 2. Pending Approval State for new Google Users
  if (status === 'authenticated' && currentUser?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar currentUser={currentUser} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/10">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-semibold">
              অ্যাডমিন অনুমোদনের অপেক্ষায়
            </span>
            <h2 className="text-2xl font-black text-white mt-2">আপনার অ্যাকাউন্টটি পর্যালোচনায় আছে</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              স্বাগতম, <strong>{currentUser.name}</strong>! Developer Zone মেসে যুক্ত হওয়ার জন্য ধন্যবাদ। মেসের আর্থিক গোপনীয়তা রক্ষার স্বার্থে নতুন সদস্যের ক্ষেত্রে মেস সুপার অ্যাডমিন বা ম্যানেজারের অনুমোদন প্রয়োজন হয়।
            </p>
            <p className="text-xs text-slate-500">
              অ্যাডমিন আপনার অ্যাকাউন্ট অনুমোদন করা মাত্রই আপনি ড্যাশবোর্ড ও মিল খাতা দেখতে পারবেন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 px-5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              স্ট্যাটাস রিফ্রেশ করুন
            </button>
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs py-3.5 px-5 rounded-xl transition-all"
            >
              হোম পেজে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Strictly block unauthenticated visitors
  if (status === 'unauthenticated' || !session || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/10">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">লগইন ছাড়া ড্যাশবোর্ড দেখা যাবে না</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              মেসের ড্যাশবোর্ড, সদস্য তালিকা, মিল খাতা ও আর্থিক হিসাব শুধুমাত্র মেসের সদস্যদের জন্য সংরক্ষিত। অনুগ্রহ করে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
            <button
              onClick={() => signIn('google')}
              className="w-full sm:flex-1 flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
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
              <span>গুগল দিয়ে লগইন করুন (মেম্বার)</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm py-3.5 px-6 rounded-2xl transition-all"
            >
              হোম পেজ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Find user's statement calculation safely
  const myStatementResult = getMemberBillingResultSafe(
    summaryData?.calculation,
    currentUser?.id
  ) || summaryData?.userBalance || null;

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* 1. Sticky Desktop / Drawer Mobile Sidebar */}
      <DashboardSidebar
        currentUser={currentUser}
        pendingCounts={summaryData?.pendingCounts || { mealRequests: 0, bazars: 0 }}
        cycleName={summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onOpenMealRequest={openMealRequest}
        onOpenNewBazar={openNewBazar}
        onOpenFixedEvent={openFixedEvent}
        onOpenDeposit={openDeposit}
      />

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <DashboardHeader
          currentUser={currentUser}
          cycleName={summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}
          isCycleClosed={summaryData?.cycle?.status === 'closed'}
          isLoading={isLoading}
          cycles={cycles}
          currentCycleId={currentCycleId}
          onSelectCycle={(cId) => setCurrentCycleId(cId)}
          onRefresh={refreshData}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenMyStatement={() => {
            if (myStatementResult) {
              openStatement(myStatementResult);
            } else if (currentUser?.role === 'super_admin') {
              // Super admin has no dining statement
              alert('সুপার অ্যাডমিন হিসেবে আপনি কেবল সিস্টেম ম্যানেজ করবেন, আপনার কোনো মেস মিল বা বাজার হিসাব নেই।');
            }
          }}
          onOpenMealRequest={openMealRequest}
          onOpenNewBazar={openNewBazar}
          onOpenDeposit={openDeposit}
        />

        {/* Dynamic Route Content wrapped with MasterErrorBoundary */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 overflow-y-auto">
          <MasterErrorBoundary onReset={refreshData}>
            {children}
          </MasterErrorBoundary>
        </main>
      </div>

      {/* 3. Global Dashboard Modals */}
      {statementMember && (
        <StatementModal
          member={statementMember}
          calculation={summaryData?.calculation || null}
          cycleName={summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}
          currentUser={currentUser || undefined}
          onRefresh={refreshData}
          onClose={closeStatement}
        />
      )}

      {currentUser && (
        <NewBazarModal
          currentUser={currentUser}
          members={members}
          isOpen={isNewBazarOpen}
          onClose={closeNewBazar}
          onSuccess={() => {
            closeNewBazar();
            refreshData();
          }}
        />
      )}

      <NewFixedEventModal
        members={members}
        isOpen={isFixedEventOpen}
        onClose={closeFixedEvent}
        onSuccess={() => {
          closeFixedEvent();
          refreshData();
        }}
      />

      {currentUser && (
        <MealRequestModal
          currentUser={currentUser}
          isOpen={isMealRequestOpen}
          onClose={closeMealRequest}
          onSuccess={() => {
            closeMealRequest();
            refreshData();
          }}
        />
      )}

      <DepositModal
        members={members}
        isOpen={isDepositOpen}
        onClose={closeDeposit}
        onSuccess={() => {
          closeDeposit();
          refreshData();
        }}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutShell>{children}</DashboardLayoutShell>
    </DashboardProvider>
  );
}
