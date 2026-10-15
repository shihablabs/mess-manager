import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
    const userId = searchParams.get('userId') || (store.users[0]?._id as string);

    const calculation = store.computeCurrentCycleBilling(cycleId);
    const cycle = store.cycles.find((c) => c._id === cycleId);

    const pendingMealRequests = store.mealRequests.filter(
      (r) => r.cycleId === cycleId && r.status === 'pending'
    );
    const pendingBazars = store.bazars.filter(
      (b) => b.cycleId === cycleId && b.status === 'pending'
    );

    return NextResponse.json({
      success: true,
      mess: store.mess,
      cycle,
      bills: store.bills.filter((b) => b.cycleId === cycleId),
      calculation,
      userBalance: calculation.memberResults[userId] || null,
      pendingCounts: {
        mealRequests: pendingMealRequests.length,
        bazars: pendingBazars.length,
      },
      auditLogs: store.auditLogs.slice(-10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
