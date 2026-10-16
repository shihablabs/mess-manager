'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { UtilitiesTab } from '@/components/UtilitiesTab';
import { GlobalLoader } from '@/components/GlobalLoader';

import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { useLanguage } from '@/context/LanguageContext';

export default function BillsUtilitiesPage() {
  const { language } = useLanguage();
  const isBangla = language === 'bn';

  const {
    currentUser,
    summaryData,
    members,
    deposits,
    refreshData,
    openDeposit,
    isLoading,
  } = useDashboard();

  if (isLoading && (!deposits || deposits.length === 0)) {
    return (
      <GlobalLoader
        message={isBangla ? 'ইউটিলিটি বিল ও ফিক্সড খরচের তথ্য লোড হচ্ছে...' : 'Loading Utility Bills & Expenses...'}
        subMessage={
          isBangla
            ? 'বাড়ি ভাড়া, গ্যাস, বিদ্যুৎ ও বুয়া বিল প্রস্তুত করা হচ্ছে'
            : 'Preparing house rent, utilities, and deposit records'
        }
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MasterErrorBoundary
        fallbackTitle={isBangla ? 'ইউটিলিটি বিল ও বড় বাজার ফান্ড লোড করতে সমস্যা হয়েছে' : 'Error Loading Utility Bills'}
        fallbackMessage={
          isBangla
            ? 'সিস্টেমটি ক্র্যাশ হওয়া রোধ করা হয়েছে। আপনি নিচের বাটনে ক্লিক করে এটি পুনরায় লোড করতে পারেন।'
            : 'System crash prevented. You can reload this module using the button below.'
        }
      >
        <UtilitiesTab
          currentUser={currentUser}
          members={members}
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
