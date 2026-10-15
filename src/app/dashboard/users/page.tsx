'use client';

import React from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { MembersTab } from '@/components/MembersTab';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function UserManagementPage() {
  const {
    currentUser,
    members,
    summaryData,
    refreshData,
    openStatement,
    isLoading,
  } = useDashboard();

  if (isLoading && (!members || members.length === 0)) {
    return (
      <GlobalLoader
        message="ইউজার ও সদস্য তালিকা লোড হচ্ছে..."
        subMessage="অনুমোদন, রোল বণ্টন ও আর্থিক হিসাব বিবরণী প্রস্তুত করা হচ্ছে"
      />
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <MembersTab
        currentUser={currentUser}
        members={members}
        cycle={summaryData?.cycle}
        onRefresh={refreshData}
        onOpenStatement={(m: any) => {
          // Find matching calculation result
          const calcResult = summaryData?.calculation?.memberResults?.find(
            (r: any) => r.userId === m.userId
          );
          if (calcResult) {
            openStatement(calcResult);
          }
        }}
      />
    </div>
  );
}
