'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { BazarTab } from '@/components/BazarTab';
import { GlobalLoader } from '@/components/GlobalLoader';

import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';

export default function BazarExpensesPage() {
  const {
    currentUser,
    bazars,
    fixedEvents,
    members,
    refreshData,
    openNewBazar,
    openFixedEvent,
    isLoading,
  } = useDashboard();

  if (isLoading && (!bazars || bazars.length === 0)) {
    return (
      <GlobalLoader
        message="বাজার ভাউচার ও খরচ লোড হচ্ছে..."
        subMessage="মেসের অনুমোদিত ও অপেক্ষমাণ ভাউচার প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MasterErrorBoundary fallbackTitle="বাজার খরচ ও ভাউচার লোড করতে সমস্যা হয়েছে">
        <BazarTab
          currentUser={currentUser}
          bazars={bazars}
          fixedEvents={fixedEvents}
          members={members}
          onRefresh={refreshData}
          onOpenNewBazarModal={openNewBazar}
          onOpenFixedEventModal={openFixedEvent}
        />
      </MasterErrorBoundary>
    </div>
  );
}
