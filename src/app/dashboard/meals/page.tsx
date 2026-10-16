'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { MealsTab } from '@/components/MealsTab';
import { GlobalLoader } from '@/components/GlobalLoader';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { useLanguage } from '@/context/LanguageContext';

export default function MealsManagementPage() {
  const { language } = useLanguage();
  const isBangla = language === 'bn';

  const {
    currentUser,
    members,
    summaryData,
    mealRequests,
    bazars,
    refreshData,
    openMealRequest,
    isLoading,
  } = useDashboard();

  if (isLoading && (!members || members.length === 0)) {
    return (
      <GlobalLoader
        message={isBangla ? 'মিল খাতার তথ্য লোড হচ্ছে...' : 'Loading Meal Register...'}
        subMessage={
          isBangla
            ? 'সদস্যদের মিল হাজিরা ও আবেদন লোড করা হচ্ছে'
            : 'Loading member meal attendance and requests'
        }
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MasterErrorBoundary
        fallbackTitle={isBangla ? 'মিল খাতা লোড করতে সমস্যা হয়েছে' : 'Error Loading Meal Register'}
        fallbackMessage={
          isBangla
            ? 'সিস্টেমটি ক্র্যাশ হওয়া রোধ করা হয়েছে। আপনি নিচের বাটনে ক্লিক করে এটি পুনরায় লোড করতে পারেন।'
            : 'System crash prevented. You can reload this module using the button below.'
        }
      >
        <MealsTab
          currentUser={currentUser}
          members={members}
          cycle={summaryData?.cycle}
          calculation={summaryData?.calculation}
          requests={mealRequests}
          bazars={bazars}
          onRefresh={refreshData}
          onOpenRequestModal={openMealRequest}
        />
      </MasterErrorBoundary>
    </div>
  );
}
