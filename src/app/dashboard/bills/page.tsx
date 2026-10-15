'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { UtilitiesTab } from '@/components/UtilitiesTab';
import { GlobalLoader } from '@/components/GlobalLoader';

import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';

export default function BillsUtilitiesPage() {
  const {
    currentUser,
    summaryData,
    deposits,
    refreshData,
    openDeposit,
    isLoading,
  } = useDashboard();

  if (isLoading && (!deposits || deposits.length === 0)) {
    return (
      <GlobalLoader
        message="ইউটিলিটি বিল ও ফিক্সড খরচের তথ্য লোড হচ্ছে..."
        subMessage="বাড়ি ভাড়া, গ্যাস, বিদ্যুৎ ও বুয়া বিল প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MasterErrorBoundary fallbackTitle="ইউটিলিটি বিল ও বড় বাজার ফান্ড লোড করতে সমস্যা হয়েছে">
        <UtilitiesTab
          currentUser={currentUser}
          bills={summaryData?.bills || []}
          deposits={deposits}
          cycle={summaryData?.cycle}
          onRefresh={refreshData}
          onOpenDepositModal={openDeposit}
        />
      </MasterErrorBoundary>
    </div>
  );
}
