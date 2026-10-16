import {
  MessDoc,
  UserDoc,
  MembershipDoc,
  CycleDoc,
  MemberCycleDoc,
  BillDoc,
  MealDoc,
  MealRequestDoc,
  BazarDoc,
  FixedEventDoc,
  BazarSlotDoc,
  SlotRequestDoc,
  DepositDoc,
  CycleSnapshotDoc,
  AuditLogDoc,
  UserRole,
} from '../models/types';
import { calculateBilling, generateBazarSlotRanges } from '../billing-engine';
import { BillingEngineInput, BillingEngineOutput, MemberBillingResult } from '../billing-engine/types';
import { getDb, isMongoConfigured } from './db';

export class MessStore {
  mess: MessDoc = {
    _id: 'mess_1',
    name: 'Developer Zone',
    code: 'DEV-ZONE-01',
    currencySymbol: '৳',
    mealSlots: [
      { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00', cutoffDayOffset: -1 },
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00', cutoffDayOffset: 0 },
    ],
    fixedDayDefault: 'friday',
    fixedMealTimeDefault: 'lunch',
    fixedExtraWeightDefault: 0.5,
    allowMembersViewOthersBalance: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users: UserDoc[] = [];
  memberships: MembershipDoc[] = [];

  cycles: CycleDoc[] = [
    {
      _id: 'cycle_1',
      messId: 'mess_1',
      name: 'অক্টোবর ২০২৬',
      month: '2026-10',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'open',
      isBigBazarEnabled: true,
      bigBazarContributionPerMember: 1400,
      bigBazarCarryToNext: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  memberCycles: MemberCycleDoc[] = [];

  bills: BillDoc[] = [];
  meals: MealDoc[] = [];
  mealRequests: MealRequestDoc[] = [];
  bazars: BazarDoc[] = [];
  fixedEvents: FixedEventDoc[] = [];
  bazarSlots: BazarSlotDoc[] = [];
  slotRequests: SlotRequestDoc[] = [];
  deposits: DepositDoc[] = [];
  cycleSnapshots: CycleSnapshotDoc[] = [];
  auditLogs: AuditLogDoc[] = [];

  // Duty roster slot generator: total days ÷ buyer count (remainder to first slots)
  public generateSlots(
    cycleId = 'cycle_1',
    shiftOffset = 0,
    isReverse = false
  ) {
    const cycle = this.cycles.find((c) => c._id === cycleId) || this.cycles[0];
    const cycleStart = cycle?.startDate || '2026-10-01';
    const cycleEnd = cycle?.endDate || '2026-10-31';

    // Get active dining members (excluding super admin)
    const diningUsers = this.users.filter((u) => u.role !== 'super_admin');
    let memberIds = diningUsers.map((u) => u._id as string);
    if (memberIds.length === 0) return;

    // Apply reverse or shift rotation
    if (isReverse) {
      memberIds = [...memberIds].reverse();
    }
    if (shiftOffset > 0 && memberIds.length > 0) {
      const normalizedOffset = shiftOffset % memberIds.length;
      memberIds = memberIds.slice(normalizedOffset).concat(memberIds.slice(0, normalizedOffset));
    }

    // Filter out previous slots for this cycle
    this.bazarSlots = this.bazarSlots.filter((s) => s.cycleId !== cycleId);

    const ranges = generateBazarSlotRanges(cycleStart, cycleEnd, memberIds.length);

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const assignedUserId = memberIds[i % memberIds.length];

      this.bazarSlots.push({
        _id: `slot_${cycleId}_${r.slotIndex}`,
        cycleId,
        messId: this.mess._id as string,
        slotIndex: r.slotIndex,
        startDate: r.startDate,
        endDate: r.endDate,
        capacity: 1,
        assignedUserIds: [assignedUserId],
        createdAt: new Date(),
      });
    }
  }

  // Transforms frozen CycleSnapshot into full BillingEngineOutput
  public snapshotToBillingOutput(snap: CycleSnapshotDoc): BillingEngineOutput {
    let sumDues = 0;
    let sumCredits = 0;
    const memberResults: Record<string, MemberBillingResult> = {};
    const allMembersSummary: MemberBillingResult[] = (snap.memberBalances || []).map((mb) => {
      sumDues += mb.totalDues || 0;
      sumCredits += mb.totalCredits || 0;

      const res: MemberBillingResult = {
        userId: mb.userId,
        name: mb.name,
        isActive: true,
        mealUnits: mb.mealUnits,
        regularMealCost: mb.mealCost,
        effectiveMealRate: mb.effectiveMealRate,
        stayedDays: mb.stayedDays,
        settlementType: mb.settlementType as any,
        fixedShare: mb.fixedShare,
        utilityShare: mb.utilityShare,
        roomRent: mb.roomRent,
        unrecoveredRent: mb.unrecoveredRent || 0,
        extraShareNonPool: mb.extraShare || 0,
        totalDues: mb.totalDues,
        generalDeposits: mb.totalCredits,
        bigBazarDeposits: 0,
        approvedBazarSpentOwnMoney: 0,
        openingCarryCredit: 0,
        totalCredits: mb.totalCredits,
        netBalance: mb.netBalance,
        closingBalance: mb.closingBalance ?? mb.netBalance,
        openingBalance: mb.openingBalance ?? 0,
      };
      memberResults[mb.userId] = res;
      return res;
    });

    return {
      mealRate: snap.mealRate,
      rawMealRate: snap.mealRate,
      remainingMealRate: snap.remainingMealRate,
      totalMealUnits: snap.totalMealUnits,
      mealPoolTotal: snap.mealPoolTotal,
      totalRegularBazar: snap.totalRegularBazar,
      totalExtraBazarPool: 0,
      totalBigBazarCost: snap.totalBigBazar,
      bigBazarCarryToNextCycle: snap.bigBazarCarryToNext,
      totalUtility: snap.totalUtility,
      unrecoveredRent: snap.unrecoveredRent || 0,
      memberResults,
      allMembersSummary,
      totals: {
        totalDues: sumDues,
        totalCredits: sumCredits,
        netBalance: sumCredits - sumDues,
        roundingDifference: snap.roundingDifference ?? 0,
        unrecoveredRent: snap.unrecoveredRent || 0,
      },
    };
  }

  // Real-time calculation helper (or frozen snapshot when cycle is closed)
  public computeCurrentCycleBilling(cycleId = 'cycle_1'): BillingEngineOutput {
    const cycle = this.cycles.find((c) => c._id === cycleId);

    // If cycle is closed, snapshot is the single source of truth (SRS Section 4.7 & Decision চ)
    if (cycle && cycle.status === 'closed') {
      const snap = this.cycleSnapshots.find((s) => s.cycleId === cycleId);
      if (snap) {
        return this.snapshotToBillingOutput(snap);
      }
    }

    // Super admin is strictly an overseer/controller and never part of dining calculations
    const membersInput = this.users
      .filter((u) => u.role !== 'super_admin')
      .filter((u) => {
        const mem = this.memberships.find((m) => m.userId === u._id);
        // Only active memberships participate in dining cycle calculations
        return mem ? mem.status === 'active' : true;
      })
      .map((u) => {
      const mc = this.memberCycles.find((m) => m.userId === u._id && m.cycleId === cycleId);
      return {
        userId: u._id as string,
        name: (u as any).displayName || (u as any).userDetails?.displayName || u.name,
        roomRent: mc ? mc.roomRent : 0,
        isActive: mc ? mc.isActive : false,
        leftDate: mc?.leftDate,
        joinedDate: (u as any)?.joinedDate || (mc as any)?.joinedDate,
        stayedDays: (mc as any)?.stayedDays,
        settlementType: (mc as any)?.settlementType,
        settledMealRate: (mc as any)?.settledMealRate,
        rentSettlementType: (mc as any)?.rentSettlementType || 'pro_rata',
        isUtilityExempt: (mc as any)?.isUtilityExempt ?? false,
        openingBalance: (mc as any)?.openingBalance || 0,
      };
    });

    const mealRecords = this.meals
      .filter((m) => m.cycleId === cycleId)
      .map((m) => ({
        userId: m.userId,
        date: m.date,
        slotId: m.slotId,
        weight: m.weight,
        consumed: m.consumed,
      }));

    const fixedEventsInput = this.fixedEvents
      .filter((e) => e.cycleId === cycleId)
      .map((e) => ({
        id: e._id as string,
        date: e.date,
        mealTime: e.mealTime,
        cost: e.cost,
        extraMealWeight: e.extraMealWeight,
        attendeeUserIds: e.attendeeUserIds,
      }));

    const bazarItemsInput = this.bazars
      .filter((b) => b.cycleId === cycleId)
      .map((b) => ({
        id: b._id as string,
        userId: b.userId,
        amount: b.amount,
        type: b.type,
        splitType: b.splitType,
        customMemberIds: b.customMemberIds,
        isApproved: b.status === 'approved',
        paidFromBigBazarFund: b.paidFromBigBazarFund,
      }));

    const depositsInput = this.deposits
      .filter((d) => d.cycleId === cycleId)
      .map((d) => ({
        userId: d.userId,
        amount: d.amount,
        type: d.type,
        isPaid: Boolean(d.isPaid || d.status === 'approved'),
      }));

    const utilityBillsInput = this.bills
      .filter((b) => b.cycleId === cycleId)
      .map((b) => ({
        id: b._id as string,
        name: b.type,
        amount: b.amount,
        splitMethod: b.splitMethod,
        applicableCount: b.applicableCount,
        applicableUserIds: b.applicableUserIds || [],
      }));

    const bigBazarConfig = {
      isEnabled: cycle ? cycle.isBigBazarEnabled : true,
      perMemberContribution: cycle ? cycle.bigBazarContributionPerMember : 1400,
      leftoverValueCarry: cycle ? cycle.bigBazarCarryToNext : 0,
    };

    const input: BillingEngineInput = {
      members: membersInput,
      mealRecords,
      fixedEvents: fixedEventsInput,
      bazarItems: bazarItemsInput,
      deposits: depositsInput,
      utilityBills: utilityBillsInput,
      bigBazarConfig,
      cycleInfo: {
        startDate: cycle?.startDate,
        endDate: cycle?.endDate,
      },
      options: { roundToInteger: true },
    };

    return calculateBilling(input);
  }
}

// Global instance fallback
let inMemoryStore = new MessStore();

/**
 * Returns store populated with live data from MongoDB Atlas.
 */
export async function getStore(): Promise<MessStore> {
  const store = new MessStore();

  if (!isMongoConfigured()) {
    return inMemoryStore;
  }

  try {
    const db = await getDb();
    if (!db) return inMemoryStore;

    const [
      messes,
      users,
      memberships,
      cycles,
      memberCycles,
      meals,
      mealRequests,
      bazars,
      fixedEvents,
      bazarSlots,
      slotRequests,
      deposits,
      bills,
      auditLogs,
      cycleSnapshots,
    ] = await Promise.all([
      db.collection('messes').find().toArray(),
      db.collection('users').find().toArray(),
      db.collection('memberships').find().toArray(),
      db.collection('cycles').find().toArray(),
      db.collection('member_cycles').find().toArray(),
      db.collection('meals').find().toArray(),
      db.collection('meal_requests').find().toArray(),
      db.collection('bazars').find().toArray(),
      db.collection('fixed_events').find().toArray(),
      db.collection('bazar_slots').find().toArray(),
      db.collection('slot_requests').find().toArray(),
      db.collection('deposits').find().toArray(),
      db.collection('bills').find().toArray(),
      db.collection('audit_logs').find().toArray(),
      db.collection('cycle_snapshots').find().toArray(),
    ]);

    if (messes.length > 0) store.mess = { ...messes[0], _id: messes[0]._id.toString() } as any;
    if (cycles.length > 0) store.cycles = cycles.map((c: any) => ({ ...c, _id: c._id.toString() }));
    if (users.length > 0) store.users = users.map((u: any) => ({ ...u, _id: u._id.toString() }));
    if (memberships.length > 0) store.memberships = memberships.map((m: any) => ({ ...m, _id: m._id.toString() }));
    if (memberCycles.length > 0) store.memberCycles = memberCycles.map((mc: any) => ({ ...mc, _id: mc._id.toString() }));
    if (meals.length > 0) store.meals = meals.map((m: any) => ({ ...m, _id: m._id.toString() }));
    if (mealRequests.length > 0) store.mealRequests = mealRequests.map((r: any) => ({ ...r, _id: r._id.toString() }));
    if (bazars.length > 0) store.bazars = bazars.map((b: any) => ({ ...b, _id: b._id.toString() }));
    if (fixedEvents.length > 0) store.fixedEvents = fixedEvents.map((e: any) => ({ ...e, _id: e._id.toString() }));
    if (bazarSlots.length > 0) store.bazarSlots = bazarSlots.map((s: any) => ({ ...s, _id: s._id.toString() }));
    if (slotRequests.length > 0) store.slotRequests = slotRequests.map((sr: any) => ({ ...sr, _id: sr._id.toString() }));
    if (deposits.length > 0) store.deposits = deposits.map((d: any) => ({ ...d, _id: d._id.toString() }));
    if (bills.length > 0) store.bills = bills.map((b: any) => ({ ...b, _id: b._id.toString() }));
    if (auditLogs.length > 0) store.auditLogs = auditLogs.map((a: any) => ({ ...a, _id: a._id.toString() }));
    if (cycleSnapshots.length > 0) store.cycleSnapshots = cycleSnapshots.map((cs: any) => ({ ...cs, _id: cs._id.toString() }));

    return store;
  } catch (err) {
    console.error('Error fetching live data from MongoDB:', err);
    return inMemoryStore;
  }
}
