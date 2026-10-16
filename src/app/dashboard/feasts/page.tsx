'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { FeastsTab } from '@/components/FeastsTab';
import { GlobalLoader } from '@/components/GlobalLoader';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';

export default function FeastsPage() {
  const {
    currentUser,
    fixedEvents,
    members,
    currentCycleId,
    refreshData,
    openFixedEvent,
    isLoading,
  } = useDashboard();

  if (isLoading && (!fixedEvents || fixedEvents.length === 0)) {
    return (
      <GlobalLoader
        message="বিশেষ ভোজ তালিকা ও হিসাব লোড হচ্ছে..."
        subMessage="মেসের স্পেশাল আয়োজন, অংশগ্রহণকারী ও ব্যক্তিগত কাটাকাটি হিসাব প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MasterErrorBoundary fallbackTitle="বিশেষ ভোজের তথ্য লোড করতে সমস্যা হয়েছে">
        <FeastsTab
          events={fixedEvents || []}
          members={members || []}
          currentUser={currentUser}
          currentCycleId={currentCycleId}
          onRefresh={refreshData}
          onOpenCreateModal={openFixedEvent}
        />
      </MasterErrorBoundary>
    </div>
  );
}
