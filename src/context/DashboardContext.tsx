'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AppUser } from '@/lib/session';
import { MemberBillingResult } from '@/billing-engine/types';

interface DashboardContextType {
  currentUser: AppUser | null;
  summaryData: any;
  members: any[];
  bazars: any[];
  fixedEvents: any[];
  mealRequests: any[];
  slots: any[];
  slotRequests: any[];
  deposits: any[];
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Mobile sidebar drawer state
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // Modal states and triggers
  statementMember: MemberBillingResult | null;
  openStatement: (member: MemberBillingResult) => void;
  closeStatement: () => void;

  isNewBazarOpen: boolean;
  openNewBazar: () => void;
  closeNewBazar: () => void;

  isFixedEventOpen: boolean;
  openFixedEvent: () => void;
  closeFixedEvent: () => void;

  isMealRequestOpen: boolean;
  openMealRequest: () => void;
  closeMealRequest: () => void;

  isDepositOpen: boolean;
  openDeposit: () => void;
  closeDeposit: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Data states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [mealRequests, setMealRequests] = useState<any[]>([]);
  const [bazars, setBazars] = useState<any[]>([]);
  const [fixedEvents, setFixedEvents] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotRequests, setSlotRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);

  // Modals state
  const [statementMember, setStatementMember] = useState<MemberBillingResult | null>(null);
  const [isNewBazarOpen, setIsNewBazarOpen] = useState(false);
  const [isFixedEventOpen, setIsFixedEventOpen] = useState(false);
  const [isMealRequestOpen, setIsMealRequestOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Sync authenticated user strictly when session is active
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userEmail = session.user.email || '';
      const isSuper = (session.user as any).isSuperAdmin || (session.user as any).role === 'super_admin';
      const userRole = (session.user as any).role || (isSuper ? 'super_admin' : 'member');
      const userStatus = (session.user as any).status || (isSuper ? 'active' : 'pending');
      setCurrentUser({
        id: (session.user as any).id || userEmail || 'user',
        name: session.user.name || (isSuper ? 'সুপার অ্যাডমিন' : 'সদস্য'),
        email: userEmail,
        role: userRole,
        status: userStatus,
        image: session.user.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      });
    } else if (status === 'unauthenticated') {
      setCurrentUser(null);
    }
  }, [session, status]);

  // Fetch summary and tab data ONLY for authenticated users
  const refreshData = useCallback(async () => {
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
      refreshData();
    }
  }, [status, currentUser?.id, refreshData]);

  return (
    <DashboardContext.Provider
      value={{
        currentUser,
        summaryData,
        members,
        bazars,
        fixedEvents,
        mealRequests,
        slots,
        slotRequests,
        deposits,
        isLoading,
        refreshData,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        statementMember,
        openStatement: (member) => setStatementMember(member),
        closeStatement: () => setStatementMember(null),
        isNewBazarOpen,
        openNewBazar: () => setIsNewBazarOpen(true),
        closeNewBazar: () => setIsNewBazarOpen(false),
        isFixedEventOpen,
        openFixedEvent: () => setIsFixedEventOpen(true),
        closeFixedEvent: () => setIsFixedEventOpen(false),
        isMealRequestOpen,
        openMealRequest: () => setIsMealRequestOpen(true),
        closeMealRequest: () => setIsMealRequestOpen(false),
        isDepositOpen,
        openDeposit: () => setIsDepositOpen(true),
        closeDeposit: () => setIsDepositOpen(false),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
