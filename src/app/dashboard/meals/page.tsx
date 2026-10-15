'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { MealsTab } from '@/components/MealsTab';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function MealsManagementPage() {
  const {
    currentUser,
    members,
    summaryData,
    mealRequests,
    refreshData,
    openMealRequest,
    isLoading,
  } = useDashboard();

  if (isLoading && (!members || members.length === 0)) {
    return (
      <GlobalLoader
        message="মিল খাতার তথ্য লোড হচ্ছে..."
        subMessage="সদস্যদের মিল হাজিরা ও আবেদন লোড করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MealsTab
        currentUser={currentUser}
        members={members}
        cycle={summaryData?.cycle}
        requests={mealRequests}
        onRefresh={refreshData}
        onOpenRequestModal={openMealRequest}
      />
    </div>
  );
}
