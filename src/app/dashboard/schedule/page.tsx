'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { RosterTab } from '@/components/RosterTab';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function ScheduleRosterPage() {
  const {
    currentUser,
    slots,
    slotRequests,
    refreshData,
    isLoading,
  } = useDashboard();

  if (isLoading && (!slots || slots.length === 0)) {
    return (
      <GlobalLoader
        message="ডিউটি রোস্টার ও বাজার শিডিউল লোড হচ্ছে..."
        subMessage="সদস্যদের দায়িত্ব বণ্টন প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <RosterTab
        currentUser={currentUser}
        slots={slots}
        requests={slotRequests}
        onRefresh={refreshData}
      />
    </div>
  );
}
