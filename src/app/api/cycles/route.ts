import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { CycleSnapshotDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

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
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      action,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      adminUserId,
      carryAmount = 0,
      memberId,
      leftDate,
    } = body;

    const cycle = store.cycles.find((c) => c._id === cycleId);
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'চক্র পাওয়া যায়নি' }, { status: 404 });
    }

    // 1. Settle individual member leaving mid-cycle
    if (action === 'settle_member') {
      if (db) {
        await db.collection('member_cycles').updateOne(
          { userId: memberId, cycleId },
          {
            $set: {
              isActive: false,
              leftDate: leftDate || new Date().toISOString().split('T')[0],
              individualSettled: true,
              settledAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }
      return NextResponse.json({ success: true, message: 'সদস্যের হিসাব সফলভাবে নিষ্পত্তি হয়েছে' });
    }

    // 2. Close Cycle and create snapshot
    if (action === 'close_cycle') {
      if (cycle.status === 'closed') {
        return NextResponse.json({ success: false, error: 'এই চক্রটি ইতোমধ্যে বন্ধ করা হয়েছে' }, { status: 400 });
      }

      cycle.bigBazarCarryToNext = Number(carryAmount) || 0;
      const finalBilling = store.computeCurrentCycleBilling(cycleId);

      const snapshot: CycleSnapshotDoc = {
        _id: `snap_${Date.now()}`,
        cycleId,
        messId: store.mess._id as string,
        closedAt: new Date(),
        closedBy: adminUserId || 'admin',
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

      if (db) {
        await db.collection('cycle_snapshots').insertOne(snapshot as any);
        await db.collection('cycles').updateOne(
          { _id: cycleId },
          {
            $set: {
              status: 'closed',
              closedAt: new Date(),
              bigBazarCarryToNext: Number(carryAmount) || 0,
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'চক্র সফলভাবে বন্ধ হয়েছে এবং হিসাবের স্ন্যাপশট সংরক্ষিত হয়েছে',
        snapshot,
      });
    }

    // 3. Re-open cycle
    if (action === 'reopen_cycle') {
      if (db) {
        await db.collection('cycles').updateOne(
          { _id: cycleId },
          { $set: { status: 'open', closedAt: null, updatedAt: new Date() } }
        );
      }
      return NextResponse.json({ success: true, message: 'চক্র পুনরায় উন্মুক্ত করা হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
