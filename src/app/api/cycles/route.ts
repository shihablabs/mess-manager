import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { CycleSnapshotDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';

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
      const settlementType = body.settlementType === 'cycle_end_adjustment' ? 'cycle_end_adjustment' : 'current_rate_final';
      const rentSettlementType = body.rentSettlementType === 'full_month' ? 'full_month' : 'pro_rata';
      const effectiveLeftDate = leftDate || new Date().toISOString().split('T')[0];

      // Calculate running meal rate for 'current_rate_final'
      const currentBilling = store.computeCurrentCycleBilling(cycleId);
      const settledMealRate = settlementType === 'current_rate_final' ? currentBilling.mealRate : null;

      let stayedDays: number | undefined = undefined;
      if (cycle.startDate) {
        const s = new Date(cycle.startDate).getTime();
        const l = new Date(effectiveLeftDate).getTime();
        if (!isNaN(s) && !isNaN(l)) {
          stayedDays = Math.max(1, Math.round((l - s) / (1000 * 60 * 60 * 24)) + 1);
        }
      }

      // Update in-memory store
      const memCycle = store.memberCycles.find((m) => m.userId === memberId && m.cycleId === cycleId);
      if (memCycle) {
        memCycle.isActive = false;
        memCycle.leftDate = effectiveLeftDate;
        memCycle.stayedDays = stayedDays;
        memCycle.settlementType = settlementType;
        memCycle.settledMealRate = settledMealRate;
        memCycle.rentSettlementType = rentSettlementType;
        memCycle.individualSettled = true;
        memCycle.settledAt = new Date();
        memCycle.updatedAt = new Date();
      }

      if (db) {
        const prevMc = await db.collection('member_cycles').findOne({ userId: memberId, cycleId });

        await db.collection('member_cycles').updateOne(
          { userId: memberId, cycleId },
          {
            $set: {
              isActive: false,
              leftDate: effectiveLeftDate,
              stayedDays,
              settlementType,
              settledMealRate,
              rentSettlementType,
              individualSettled: true,
              settledAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        await recordAuditLog({
          messId: cycle.messId || (store.mess._id as string),
          cycleId,
          performedByUserId: adminUserId || 'admin',
          action: 'SETTLE_MEMBER',
          targetCollection: 'member_cycles',
          targetId: `${cycleId}_${memberId}`,
          previousValue: prevMc,
          newValue: {
            isActive: false,
            leftDate: effectiveLeftDate,
            stayedDays,
            settlementType,
            settledMealRate,
            rentSettlementType,
            individualSettled: true,
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: 'সদস্যের হিসাব সফলভাবে নিষ্পত্তি হয়েছে',
        settlementType,
        settledMealRate,
        rentSettlementType,
        stayedDays,
      });
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
        unrecoveredRent: finalBilling.unrecoveredRent || 0,
        memberBalances: finalBilling.allMembersSummary.map((m) => ({
          userId: m.userId,
          name: m.name,
          mealUnits: m.mealUnits,
          mealCost: m.regularMealCost,
          effectiveMealRate: m.effectiveMealRate,
          stayedDays: m.stayedDays,
          settlementType: m.settlementType,
          fixedShare: m.fixedShare,
          utilityShare: m.utilityShare,
          roomRent: m.roomRent,
          unrecoveredRent: m.unrecoveredRent || 0,
          extraShare: m.extraShareNonPool,
          totalDues: m.totalDues,
          totalCredits: m.totalCredits,
          netBalance: m.netBalance,
        })),
        summaryNote: `চক্র সমাপ্তি: মিল রেট ৳${finalBilling.mealRate}, মোট মিল ${finalBilling.totalMealUnits}`,
      };

      // Update in-memory store with frozen cycle state & snapshot (Decision চ)
      cycle.status = 'closed';
      cycle.closedAt = snapshot.closedAt;
      cycle.bigBazarCarryToNext = Number(carryAmount) || 0;
      store.cycleSnapshots.push(snapshot);

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

        await recordAuditLog({
          messId: store.mess._id as string,
          cycleId,
          performedByUserId: adminUserId || 'admin',
          action: 'CLOSE_CYCLE',
          targetCollection: 'cycles',
          targetId: cycleId,
          previousValue: { status: cycle.status, bigBazarCarryToNext: cycle.bigBazarCarryToNext },
          newValue: {
            status: 'closed',
            bigBazarCarryToNext: Number(carryAmount) || 0,
            snapshotId: snapshot._id,
          },
        });
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

        await recordAuditLog({
          messId: cycle?.messId || (store.mess._id as string),
          cycleId,
          performedByUserId: adminUserId || 'admin',
          action: 'REOPEN_CYCLE',
          targetCollection: 'cycles',
          targetId: cycleId,
          previousValue: { status: 'closed' },
          newValue: { status: 'open' },
        });
      }
      return NextResponse.json({ success: true, message: 'চক্র পুনরায় উন্মুক্ত করা হয়েছে' });
    }

    // 4. Update cycle & big bazar configuration (এডমিন/ম্যানেজার বড় বাজার ও চক্র কনফিগারেশন)
    if (action === 'update_cycle_config') {
      const {
        isBigBazarEnabled,
        bigBazarContributionPerMember,
        name,
        startDate,
        endDate,
      } = body;

      if (db) {
        const prevCycle = await db.collection('cycles').findOne({ _id: cycleId });

        const updateDoc: any = { updatedAt: new Date() };
        if (typeof isBigBazarEnabled === 'boolean') updateDoc.isBigBazarEnabled = isBigBazarEnabled;
        if (typeof bigBazarContributionPerMember === 'number') {
          updateDoc.bigBazarContributionPerMember = Number(bigBazarContributionPerMember);
        }
        if (name) updateDoc.name = name;
        if (startDate) updateDoc.startDate = startDate;
        if (endDate) updateDoc.endDate = endDate;

        await db.collection('cycles').updateOne({ _id: cycleId }, { $set: updateDoc });

        await recordAuditLog({
          messId: prevCycle?.messId || (store.mess._id as string),
          cycleId,
          performedByUserId: adminUserId || 'admin',
          action: 'UPDATE_CYCLE_CONFIG',
          targetCollection: 'cycles',
          targetId: cycleId,
          previousValue: prevCycle,
          newValue: updateDoc,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'চলমান চক্র ও বড় বাজার কনফিগারেশন সফলভাবে আপডেট করা হয়েছে',
      });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const { cycleId = store.cycles[0]?._id as string, isBigBazarEnabled, bigBazarContributionPerMember } = body;

    const cycle = store.cycles.find((c) => c._id === cycleId);
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'চক্র পাওয়া যায়নি' }, { status: 404 });
    }

    if (typeof isBigBazarEnabled === 'boolean') {
      cycle.isBigBazarEnabled = isBigBazarEnabled;
    }
    if (typeof bigBazarContributionPerMember === 'number') {
      cycle.bigBazarContributionPerMember = bigBazarContributionPerMember;
    }

    if (db) {
      const prevCycle = await db.collection('cycles').findOne({ _id: cycleId });

      await db.collection('cycles').updateOne(
        { _id: cycleId },
        {
          $set: {
            isBigBazarEnabled: cycle.isBigBazarEnabled,
            bigBazarContributionPerMember: cycle.bigBazarContributionPerMember,
            updatedAt: new Date(),
          },
        }
      );

      await recordAuditLog({
        messId: prevCycle?.messId || (store.mess._id as string),
        cycleId,
        performedByUserId: 'admin',
        action: 'UPDATE_CYCLE_CONFIG',
        targetCollection: 'cycles',
        targetId: cycleId,
        previousValue: {
          isBigBazarEnabled: prevCycle?.isBigBazarEnabled,
          bigBazarContributionPerMember: prevCycle?.bigBazarContributionPerMember,
        },
        newValue: {
          isBigBazarEnabled: cycle.isBigBazarEnabled,
          bigBazarContributionPerMember: cycle.bigBazarContributionPerMember,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'বড় বাজার ও মেস সেটিংস সফলভাবে আপডেট করা হয়েছে!',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

