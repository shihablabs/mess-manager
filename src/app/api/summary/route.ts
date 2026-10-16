import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { requireActiveMember } from '@/lib/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

    // Managers can view any user's balance; regular members always see their own
    const effectiveUserId = (caller.role === 'admin' || caller.role === 'super_admin')
      ? (searchParams.get('userId') || caller.id)
      : caller.id;

    const calculation = store.computeCurrentCycleBilling(cycleId);
    const cycle = store.cycles.find((c) => c._id === cycleId);

    const pendingMealRequests = store.mealRequests.filter(
      (r) => r.cycleId === cycleId && r.status === 'pending'
    );

    return NextResponse.json({
      success: true,
      mess: store.mess,
      cycle,
      bills: store.bills.filter((b) => b.cycleId === cycleId),
      calculation,
      userBalance: calculation.memberResults[effectiveUserId] || null,
      pendingCounts: {
        mealRequests: pendingMealRequests.length,
        bazars: 0,
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
