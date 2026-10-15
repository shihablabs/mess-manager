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
import { SUPER_ADMIN_EMAIL } from '@/lib/session';

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

  users: UserDoc[] = [
    {
      _id: '6ad084c58790b3c278c86efa',
      name: 'Shihab Uddin',
      email: SUPER_ADMIN_EMAIL,
      image: 'https://lh3.googleusercontent.com/a/ACg8ocJYyl_ytE7bX3w_IDsC1mzZRx63hG2MnjbhemMnBZ0rLUm47utI=s96-c',
      role: 'super_admin',
      phone: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  memberships: MembershipDoc[] = [
    {
      _id: 'm_shihab',
      userId: '6ad084c58790b3c278c86efa',
      messId: 'mess_1',
      role: 'super_admin',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

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

  memberCycles: MemberCycleDoc[] = [
    {
      _id: 'mc_shihab',
      userId: '6ad084c58790b3c278c86efa',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

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
  public generateSlots(numMembers: number, daysPerSlot = 3) {
    this.bazarSlots = [];
    const activeMemberCycles = this.memberCycles.filter((mc) => mc.isActive);
    const memberIds = activeMemberCycles.map((mc) => mc.userId);
    if (memberIds.length === 0) return;

    let startDay = 1;
    for (let i = 0; i < Math.min(numMembers, memberIds.length); i++) {
      const from = `2026-10-${String(startDay).padStart(2, '0')}`;
      const toDay = startDay + daysPerSlot - 1;
      const to = `2026-10-${String(toDay).padStart(2, '0')}`;
      startDay = toDay + 1;

      this.bazarSlots.push({
        _id: `slot_${i + 1}`,
        cycleId: this.cycles[0]?._id as string || 'cycle_1',
        messId: this.mess._id as string,
        slotIndex: i + 1,
        startDate: from,
        endDate: to,
        capacity: 1,
        assignedUserIds: [memberIds[i % memberIds.length]],
        createdAt: new Date(),
      });
    }
  }

  // Real-time calculation helper
  public computeCurrentCycleBilling(cycleId = 'cycle_1'): BillingEngineOutput {
    const cycle = this.cycles.find((c) => c._id === cycleId);
    const membersInput = this.users.map((u) => {
      const mc = this.memberCycles.find((m) => m.userId === u._id && m.cycleId === cycleId);
      return {
        userId: u._id as string,
        name: u.name,
        roomRent: mc ? mc.roomRent : 0,
        isActive: mc ? mc.isActive : true,
        leftDate: mc?.leftDate,
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
        isPaid: d.isPaid,
      }));

    const utilityBillsInput = this.bills
      .filter((b) => b.cycleId === cycleId)
      .map((b) => ({
        id: b._id as string,
        name: b.type,
        amount: b.amount,
        splitMethod: b.splitMethod,
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
