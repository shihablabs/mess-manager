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
import { INITIAL_SUPER_ADMIN, AppUser } from '@/lib/session';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Calendar,
  Lightbulb,
  Users,
  BookOpen,
} from 'lucide-react';
import { MemberBillingResult } from '@/billing-engine/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_SUPER_ADMIN);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Google authenticated user if present
  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: (session.user as any).id || session.user.email || 'user',
        name: session.user.name || 'সদস্য',
        email: session.user.email || '',
        role:
          (session.user as any).role ||
          (session.user.email === 'shihab.warfaze@gmail.com' ? 'super_admin' : 'member'),
        image:
          session.user.image ||
          'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      });
    }
  }, [session]);

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

  // Fetch summary and tab data
  const fetchData = useCallback(async () => {
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
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        মেস ম্যানেজমেন্ট সিস্টেম — তৈরি করেছেন শিহাব ল্যাবস | Next.js (App Router), TypeScript &amp; MongoDB
      </footer>

      {/* Modals */}
      <StatementModal
        member={statementMember}
        calculation={summaryData?.calculation || null}
        cycleName={summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}
        onClose={() => setStatementMember(null)}
      />

      <NewBazarModal
        currentUser={currentUser}
        isOpen={isNewBazarOpen}
        onClose={() => setIsNewBazarOpen(false)}
        onSuccess={fetchData}
      />

      <NewFixedEventModal
        members={members}
        isOpen={isFixedEventOpen}
        onClose={() => setIsFixedEventOpen(false)}
        onSuccess={fetchData}
      />

      <MealRequestModal
        currentUser={currentUser}
        isOpen={isMealRequestOpen}
        onClose={() => setIsMealRequestOpen(false)}
        onSuccess={fetchData}
      />

      <DepositModal
        members={members}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
