'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { BazarTab } from '@/components/BazarTab';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function BazarExpensesPage() {
  const {
    currentUser,
    bazars,
    fixedEvents,
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
      <BazarTab
        currentUser={currentUser}
        bazars={bazars}
        fixedEvents={fixedEvents}
        onRefresh={refreshData}
        onOpenNewBazarModal={openNewBazar}
        onOpenFixedEventModal={openFixedEvent}
      />
    </div>
  );
}
