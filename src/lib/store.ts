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
} from '@/models/types';
import { calculateBilling } from '@/billing-engine';
import { BillingEngineInput, BillingEngineOutput } from '@/billing-engine/types';
import { getDb, isMongoConfigured } from '@/lib/db';

export class MessStore {
  mess: MessDoc = {
    _id: 'mess_1',
    name: 'Developer Zone',
    code: 'DEV-ZONE-01',
    currencySymbol: '৳',
    mealSlots: [
      { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
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

  // Duty roster slot generator
  public generateSlots(
    cycleId = 'cycle_1',
    daysPerSlot = 5,
    shiftOffset = 0,
    isReverse = false
  ) {
    const cycle = this.cycles.find((c) => c._id === cycleId) || this.cycles[0];
    const cycleStart = cycle?.startDate || '2026-10-01';
    const cycleEnd = cycle?.endDate || '2026-10-31';

    // Parse cycle dates
    const startYearMonth = cycleStart.substring(0, 7); // e.g. "2026-10"
    const startDayNum = parseInt(cycleStart.substring(8, 10), 10) || 1;
    const endDayNum = parseInt(cycleEnd.substring(8, 10), 10) || 30;

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

    let currentStart = startDayNum;
    let slotIndex = 1;

    while (currentStart <= endDayNum) {
      let currentEnd = currentStart + daysPerSlot - 1;
      // If remaining days are fewer than daysPerSlot, merge into final slot
      if (currentEnd >= endDayNum || (endDayNum - currentEnd < 3)) {
        currentEnd = endDayNum;
      }

      const fromStr = `${startYearMonth}-${String(currentStart).padStart(2, '0')}`;
      const toStr = `${startYearMonth}-${String(currentEnd).padStart(2, '0')}`;
      const assignedUserId = memberIds[(slotIndex - 1) % memberIds.length];

      this.bazarSlots.push({
        _id: `slot_${cycleId}_${slotIndex}`,
        cycleId,
        messId: this.mess._id as string,
        slotIndex,
        startDate: fromStr,
        endDate: toStr,
        capacity: 1,
        assignedUserIds: [assignedUserId],
        createdAt: new Date(),
      });

      currentStart = currentEnd + 1;
      slotIndex++;
    }
  }

  // Real-time calculation helper
  public computeCurrentCycleBilling(cycleId = 'cycle_1'): BillingEngineOutput {
    const cycle = this.cycles.find((c) => c._id === cycleId);
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
        isUtilityExempt: (mc as any)?.isUtilityExempt ?? false,
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
        isApproved: b.status !== 'rejected',
        paidFromBigBazarFund: b.paidFromBigBazarFund,
      }));

    const depositsInput = this.deposits
      .filter((d) => d.cycleId === cycleId)
      .map((d) => ({
        userId: d.userId,
        amount: d.amount,
        type: d.type,
        isPaid: d.isPaid,
      }));

    const utilityBillsInput = this.bills
      .filter((b) => b.cycleId === cycleId)
      .map((b) => ({
        id: b._id as string,
        name: b.type,
        amount: b.amount,
        splitMethod: b.splitMethod,
        applicableCount: b.applicableCount,
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

    return store;
  } catch (err) {
    console.error('Error fetching live data from MongoDB:', err);
    return inMemoryStore;
  }
}
