'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { KPICards } from '@/components/KPICards';
import { DashboardTab } from '@/components/DashboardTab';
import { MealsTab } from '@/components/MealsTab';
import { BazarTab } from '@/components/BazarTab';
import { RosterTab } from '@/components/RosterTab';
import { UtilitiesTab } from '@/components/UtilitiesTab';
import { MembersTab } from '@/components/MembersTab';
import { StatementModal } from '@/components/StatementModal';
import { NewBazarModal } from '@/components/NewBazarModal';
import { NewFixedEventModal } from '@/components/NewFixedEventModal';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DepositModal } from '@/components/DepositModal';
import { AppUser } from '@/lib/session';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Calendar,
  Lightbulb,
  Users,
  BookOpen,
  Lock,
  ArrowRight,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { MemberBillingResult } from '@/billing-engine/types';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Google authenticated user strictly when session is active
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userEmail = session.user.email || '';
      const isSuper = userEmail === 'shihab.warfaze@gmail.com';
      const userRole = (session.user as any).role || (isSuper ? 'super_admin' : 'member');
      const userStatus = (session.user as any).status || (isSuper ? 'active' : 'pending');
      setCurrentUser({
        id: (session.user as any).id || userEmail || 'user',
        name: session.user.name || 'সদস্য',
        email: userEmail,
        role: userRole,
        status: userStatus,
        image: session.user.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      });
    } else if (status === 'unauthenticated') {
      setCurrentUser(null);
    }
  }, [session, status]);

  // Data states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [mealRequests, setMealRequests] = useState<any[]>([]);
  const [bazars, setBazars] = useState<any[]>([]);
  const [fixedEvents, setFixedEvents] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotRequests, setSlotRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);

  // Modals
  const [statementMember, setStatementMember] = useState<MemberBillingResult | null>(null);
  const [isNewBazarOpen, setIsNewBazarOpen] = useState(false);
  const [isFixedEventOpen, setIsFixedEventOpen] = useState(false);
  const [isMealRequestOpen, setIsMealRequestOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Fetch summary and tab data ONLY for authenticated users
  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setIsLoading(true);
      const [sumRes, reqRes, bazRes, fixRes, slotRes, memRes, depRes] = await Promise.all([
        fetch(`/api/summary?userId=${currentUser.id}`),
        fetch('/api/meal-requests'),
        fetch('/api/bazars'),
        fetch('/api/fixed-events'),
        fetch('/api/slots'),
        fetch('/api/members'),
        fetch('/api/deposits'),
      ]);

      const sumJson = await sumRes.json();
      const reqJson = await reqRes.json();
      const bazJson = await bazRes.json();
      const fixJson = await fixRes.json();
      const slotJson = await slotRes.json();
      const memJson = await memRes.json();
      const depJson = await depRes.json();

      if (sumJson.success) setSummaryData(sumJson);
      if (reqJson.success) setMealRequests(reqJson.requests || []);
      if (bazJson.success) setBazars(bazJson.bazars || []);
      if (fixJson.success) setFixedEvents(fixJson.events || []);
      if (slotJson.success) {
        setSlots(slotJson.slots || []);
        setSlotRequests(slotJson.requests || []);
      }
      if (memJson.success) setMembers(memJson.members || []);
      if (depJson.success) setDeposits(depJson.deposits || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (status === 'authenticated' && currentUser?.id) {
      fetchData();
    }
  }, [status, currentUser?.id, fetchData]);

  // Loading state while NextAuth verifies session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">লগইন অবস্থা যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Pending Approval State for new Google Users
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

  // Strictly block unauthenticated visitors from viewing dashboard
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

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full pt-2">
            <button
              onClick={() => signIn('google')}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
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
              <span>গুগল দিয়ে লগইন করুন</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm py-3.5 px-6 rounded-2xl transition-all"
            >
              হোম পেজে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'meals', label: 'মিল হিসাব', icon: Utensils, badge: summaryData?.pendingCounts?.mealRequests },
    { id: 'bazar', label: 'বাজার খরচ', icon: ShoppingBag, badge: summaryData?.pendingCounts?.bazars },
    { id: 'roster', label: 'ডিউটি রোস্টার', icon: Calendar },
    { id: 'utilities', label: 'বিল ও বড় বাজার', icon: Lightbulb },
    { id: 'members', label: 'সদস্য ও দায়িত্ব', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        cycleName={summaryData?.cycle?.name || 'চলমান চক্র'}
        isCycleClosed={summaryData?.cycle?.status === 'closed'}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Quick Guide Link Banner for mobile and desktop */}
        <div className="mb-4 flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 sm:px-4 py-2 text-xs">
          <span className="text-slate-400 truncate mr-2">
            হিসাবের সূত্র বা নিয়মাবলী দেখতে চান?
          </span>
          <Link
            href="/#calculation-guide"
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            গাইড ও নিয়ম দেখুন
          </Link>
        </div>

        {/* Top KPIs Row */}
        <KPICards
          calculation={summaryData?.calculation || null}
          userBalance={summaryData?.userBalance || null}
          pendingCounts={summaryData?.pendingCounts || { mealRequests: 0, bazars: 0 }}
          onNavigateToTab={setActiveTab}
        />

        {/* Tab Navigation Menu (Horizontal scrollable on mobile with smooth scrolling) */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-2 mb-4 sm:mb-6 border-b border-slate-800 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-indigo-500 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Contents */}
        <div className="transition-all duration-200">
          {activeTab === 'dashboard' && (
            <DashboardTab
              calculation={summaryData?.calculation || null}
              currentUserId={currentUser.id}
              onOpenStatement={(m) => setStatementMember(m)}
              auditLogs={summaryData?.auditLogs || []}
            />
          )}

          {activeTab === 'meals' && (
            <MealsTab
              currentUser={currentUser}
              members={members}
              cycle={summaryData?.cycle}
              requests={mealRequests}
              onRefresh={fetchData}
              onOpenRequestModal={() => setIsMealRequestOpen(true)}
            />
          )}

          {activeTab === 'bazar' && (
            <BazarTab
              currentUser={currentUser}
              bazars={bazars}
              fixedEvents={fixedEvents}
              onRefresh={fetchData}
              onOpenNewBazarModal={() => setIsNewBazarOpen(true)}
              onOpenFixedEventModal={() => setIsFixedEventOpen(true)}
            />
          )}

          {activeTab === 'roster' && (
            <RosterTab
              currentUser={currentUser}
              slots={slots}
              requests={slotRequests}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'utilities' && (
            <UtilitiesTab
              currentUser={currentUser}
              bills={summaryData?.bills || []}
              deposits={deposits}
              cycle={summaryData?.cycle}
              onRefresh={fetchData}
              onOpenDepositModal={() => setIsDepositOpen(true)}
            />
          )}

          {activeTab === 'members' && (
            <MembersTab
              currentUser={currentUser}
              members={members}
              cycle={summaryData?.cycle}
              onRefresh={fetchData}
              onOpenStatement={(m) => {
                const billingResult =
                  summaryData?.calculation?.allMembersSummary?.find((res: any) => res.userId === m.userId) ||
                  summaryData?.calculation?.memberResults?.[m.userId];
                if (billingResult) {
                  setStatementMember(billingResult);
                } else {
                  alert('এই সদস্যের চলতি চক্রের হিসাব বিবরণী লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন');
                }
              }}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {statementMember && (
        <StatementModal
          member={statementMember}
          calculation={summaryData?.calculation || null}
          cycleName={summaryData?.cycle?.name || 'চলমান চক্র'}
          currentUser={currentUser}
          onRefresh={fetchData}
          onClose={() => setStatementMember(null)}
        />
      )}

      <NewBazarModal
        currentUser={currentUser}
        isOpen={isNewBazarOpen}
        onClose={() => setIsNewBazarOpen(false)}
        onSuccess={() => {
          setIsNewBazarOpen(false);
          fetchData();
        }}
      />

      <NewFixedEventModal
        members={members}
        isOpen={isFixedEventOpen}
        onClose={() => setIsFixedEventOpen(false)}
        onSuccess={() => {
          setIsFixedEventOpen(false);
          fetchData();
        }}
      />

      <MealRequestModal
        currentUser={currentUser}
        isOpen={isMealRequestOpen}
        onClose={() => setIsMealRequestOpen(false)}
        onSuccess={() => {
          setIsMealRequestOpen(false);
          fetchData();
        }}
      />

      <DepositModal
        members={members}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => {
          setIsDepositOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
