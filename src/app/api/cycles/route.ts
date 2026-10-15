import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { CycleSnapshotDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';

  const cycle = store.cycles.find((c) => c._id === cycleId);
  const snapshot = store.cycleSnapshots.find((s) => s.cycleId === cycleId);

  return NextResponse.json({
    success: true,
    cycle,
    snapshot,
    allCycles: store.cycles,
  });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { action, cycleId = 'cycle_1', adminUserId = 'user_admin', carryAmount = 0, memberId, leftDate } = body;

    const cycle = store.cycles.find((c) => c._id === cycleId);
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'চক্র পাওয়া যায়নি' }, { status: 404 });
    }

    // 1. Settle individual member leaving mid-cycle (SRS Section 4.10)
    if (action === 'settle_member') {
      const mc = store.memberCycles.find((m) => m.userId === memberId && m.cycleId === cycleId);
      if (!mc) {
        return NextResponse.json({ success: false, error: 'সদস্যের তথ্য পাওয়া যায়নি' }, { status: 404 });
      }

      mc.isActive = false;
      mc.leftDate = leftDate || new Date().toISOString().split('T')[0];
      mc.individualSettled = true;
      mc.settledAt = new Date();

      const member = store.users.find((u) => u._id === memberId);
      store.auditLogs.unshift({
        _id: `log_${Date.now()}`,
        messId: store.mess._id as string,
        cycleId,
        performedByUserId: adminUserId,
        performedByUserName: 'Admin',
        action: `${member?.name || 'সদস্য'}-এর মেস ছাড়ার হিসাব নিষ্পত্তি (Individual Settlement) করা হয়েছে`,
        targetCollection: 'memberCycles',
        targetId: mc._id as string,
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, message: 'সদস্যের হিসাব সফলভাবে নিষ্পত্তি হয়েছে' });
    }

    // 2. Close Cycle and create snapshot (SRS Section 7.6)
    if (action === 'close_cycle') {
      if (cycle.status === 'closed') {
        return NextResponse.json({ success: false, error: 'এই চক্রটি ইতোমধ্যে বন্ধ করা হয়েছে' }, { status: 400 });
      }

      // Compute final calculation
      cycle.bigBazarCarryToNext = Number(carryAmount) || 0;
      const finalBilling = store.computeCurrentCycleBilling(cycleId);

      const snapshot: CycleSnapshotDoc = {
        _id: `snap_${Date.now()}`,
        cycleId,
        messId: store.mess._id as string,
        closedAt: new Date(),
        closedBy: adminUserId,
        mealRate: finalBilling.mealRate,
        totalMealUnits: finalBilling.totalMealUnits,
        mealPoolTotal: finalBilling.mealPoolTotal,
        totalRegularBazar: finalBilling.totalRegularBazar,
        totalBigBazar: finalBilling.totalBigBazarCost,
        bigBazarCarryToNext: finalBilling.bigBazarCarryToNextCycle,
        totalUtility: finalBilling.totalUtility,
        memberBalances: finalBilling.allMembersSummary.map((m) => ({
          userId: m.userId,
          name: m.name,
          mealUnits: m.mealUnits,
          mealCost: m.regularMealCost,
          fixedShare: m.fixedShare,
          utilityShare: m.utilityShare,
          roomRent: m.roomRent,
          extraShare: m.extraShareNonPool,
          totalDues: m.totalDues,
          totalCredits: m.totalCredits,
          netBalance: m.netBalance,
        })),
        summaryNote: `চক্র সমাপ্তি: মিল রেট ৳${finalBilling.mealRate}, মোট মিল ${finalBilling.totalMealUnits}`,
      };

      store.cycleSnapshots.push(snapshot);
      cycle.status = 'closed';
      cycle.closedAt = new Date();

      store.auditLogs.unshift({
        _id: `log_${Date.now()}`,
        messId: store.mess._id as string,
        cycleId,
        performedByUserId: adminUserId,
        performedByUserName: 'Admin',
        action: `হিসাব চক্র #${cycleId} বন্ধ করা হয়েছে এবং চূড়ান্ত স্ন্যাপশট সংরক্ষিত হয়েছে`,
        targetCollection: 'cycles',
        targetId: cycleId,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'চক্র সফলভাবে বন্ধ হয়েছে এবং হিসাবের স্ন্যাপশট সংরক্ষিত হয়েছে',
        snapshot,
      });
    }

    // 3. Re-open cycle (if admin permits)
    if (action === 'reopen_cycle') {
      cycle.status = 'open';
      cycle.closedAt = null;
      return NextResponse.json({ success: true, message: 'চক্র পুনরায় উন্মুক্ত করা হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
