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
} from '@/models/types';
import { calculateBilling } from '@/billing-engine';
import { BillingEngineInput, BillingEngineOutput } from '@/billing-engine/types';

// In-Memory Seed Storage for seamless testing, serverless persistence, and MongoDB mirroring
class MessStore {
  mess: MessDoc = {
    _id: 'mess_1',
    name: 'শান্তিনীড় মেস',
    code: 'SHANTI-01',
    currencySymbol: '৳',
    mealSlots: [
      { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
    ],
    fixedDayDefault: 'friday',
    fixedMealTimeDefault: 'lunch',
    fixedExtraWeightDefault: 0.5,
    allowMembersViewOthersBalance: true,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  users: UserDoc[] = [
    {
      _id: 'user_admin',
      name: 'মুহাম্মদ শিহাব উদ্দিন (Admin)',
      email: 'admin@mess.com',
      image: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      phone: '01700000001',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_1',
      name: 'সদস্য ক (রাফি)',
      email: 'rafi@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rafi',
      phone: '01700000002',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_2',
      name: 'সদস্য খ (তানভীর)',
      email: 'tanvir@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanvir',
      phone: '01700000003',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_3',
      name: 'সদস্য গ (হাসান)',
      email: 'hasan@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hasan',
      phone: '01700000004',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_4',
      name: 'সদস্য ঘ (মাহমুদ)',
      email: 'mahmud@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mahmud',
      phone: '01700000005',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_5',
      name: 'সদস্য ঙ (সাকিব)',
      email: 'sakib@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sakib',
      phone: '01700000006',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'user_6',
      name: 'সদস্য চ (জাহিদ)',
      email: 'zahid@mess.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zahid',
      phone: '01700000007',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
  ];

  memberships: MembershipDoc[] = [
    {
      _id: 'm_admin',
      userId: 'user_admin',
      messId: 'mess_1',
      role: 'admin',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_1',
      userId: 'user_1',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_2',
      userId: 'user_2',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_3',
      userId: 'user_3',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_4',
      userId: 'user_4',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_5',
      userId: 'user_5',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      _id: 'm_6',
      userId: 'user_6',
      messId: 'mess_1',
      role: 'member',
      status: 'active',
      joinedDate: '2026-10-01',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
  ];

  cycles: CycleDoc[] = [
    {
      _id: 'cycle_1',
      messId: 'mess_1',
      name: '১০ অক্টোবর – ১০ নভেম্বর ২০২৬',
      startDate: '2026-10-10',
      endDate: '2026-11-10',
      status: 'open',
      isBigBazarEnabled: true,
      bigBazarContributionPerMember: 1400,
      bigBazarCarryToNext: 0,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
  ];

  memberCycles: MemberCycleDoc[] = [
    {
      _id: 'mc_1',
      userId: 'user_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 3100,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'mc_2',
      userId: 'user_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 3000,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'mc_3',
      userId: 'user_3',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 3000,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'mc_4',
      userId: 'user_4',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 2800,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'mc_5',
      userId: 'user_5',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 2800,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'mc_6',
      userId: 'user_6',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      roomRent: 2400,
      isActive: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
  ];

  bills: BillDoc[] = [
    { _id: 'b_water', cycleId: 'cycle_1', messId: 'mess_1', type: 'পানি', amount: 1000, splitMethod: 'equal', createdAt: new Date(), updatedAt: new Date() },
    { _id: 'b_gas', cycleId: 'cycle_1', messId: 'mess_1', type: 'গ্যাস', amount: 1000, splitMethod: 'equal', createdAt: new Date(), updatedAt: new Date() },
    { _id: 'b_elec', cycleId: 'cycle_1', messId: 'mess_1', type: 'বিদ্যুৎ', amount: 3000, splitMethod: 'equal', createdAt: new Date(), updatedAt: new Date() },
    { _id: 'b_net', cycleId: 'cycle_1', messId: 'mess_1', type: 'ইন্টারনেট', amount: 1000, splitMethod: 'equal', createdAt: new Date(), updatedAt: new Date() },
    { _id: 'b_waste', cycleId: 'cycle_1', messId: 'mess_1', type: 'ময়লা', amount: 100, splitMethod: 'equal', createdAt: new Date(), updatedAt: new Date() },
  ];

  meals: MealDoc[] = [];

  mealRequests: MealRequestDoc[] = [
    {
      _id: 'mr_1',
      userId: 'user_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-18',
      slotId: 'night',
      action: 'off',
      isLate: false,
      status: 'pending',
      reason: 'অফিসে বিশেষ ডিনার আছে',
      createdAt: new Date('2026-10-17T14:00:00Z'),
    },
  ];

  bazars: BazarDoc[] = [
    {
      _id: 'baz_1',
      userId: 'user_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-11',
      amount: 2500,
      description: 'মাছ, শাকসবজি ও ডিম',
      type: 'regular',
      status: 'approved',
      paidFromBigBazarFund: false,
      createdAt: new Date('2026-10-11'),
      updatedAt: new Date('2026-10-11'),
    },
    {
      _id: 'baz_2',
      userId: 'user_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-13',
      amount: 12500,
      description: 'মুরগি, সবজি, মাছ ও ফলমূল',
      type: 'regular',
      status: 'approved',
      paidFromBigBazarFund: false,
      createdAt: new Date('2026-10-13'),
      updatedAt: new Date('2026-10-13'),
    },
    {
      _id: 'baz_big',
      userId: 'user_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-10',
      amount: 8400,
      description: 'মাসের চাল, সয়াবিন তেল, ডাল, পেঁয়াজ, রসুন ও মসলা',
      type: 'big',
      status: 'approved',
      paidFromBigBazarFund: true,
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      _id: 'baz_extra',
      userId: 'user_3',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-14',
      amount: 600,
      description: 'সন্ধ্যার নাস্তা ও মিষ্টি (মেস pool)',
      type: 'extra',
      splitType: 'meal_pool',
      status: 'approved',
      paidFromBigBazarFund: false,
      createdAt: new Date('2026-10-14'),
      updatedAt: new Date('2026-10-14'),
    },
    {
      _id: 'baz_pending',
      userId: 'user_4',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-15',
      amount: 1800,
      description: 'বিকেলের মাছ ও মসলা',
      type: 'regular',
      status: 'pending',
      paidFromBigBazarFund: false,
      createdAt: new Date('2026-10-15'),
      updatedAt: new Date('2026-10-15'),
    },
  ];

  fixedEvents: FixedEventDoc[] = [
    {
      _id: 'fix_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-16',
      title: 'শুক্রবার স্পেশাল গরুর মাংসের ভোজ',
      mealTime: 'lunch',
      cost: 600,
      extraMealWeight: 0,
      attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'],
      createdAt: new Date('2026-10-16'),
      updatedAt: new Date('2026-10-16'),
    },
    {
      _id: 'fix_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-23',
      title: 'শুক্রবার স্পেশাল খাসি ও পোলাও',
      mealTime: 'lunch',
      cost: 600,
      extraMealWeight: 0,
      attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'],
      createdAt: new Date('2026-10-23'),
      updatedAt: new Date('2026-10-23'),
    },
    {
      _id: 'fix_3',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      date: '2026-10-30',
      title: 'শুক্রবার স্পেশাল দেশি মুরগি ভোজ',
      mealTime: 'lunch',
      cost: 600,
      extraMealWeight: 0,
      attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'],
      createdAt: new Date('2026-10-30'),
      updatedAt: new Date('2026-10-30'),
    },
  ];

  bazarSlots: BazarSlotDoc[] = [];

  slotRequests: SlotRequestDoc[] = [];

  deposits: DepositDoc[] = [
    {
      _id: 'dep_1',
      userId: 'user_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      amount: 5000,
      date: '2026-10-10',
      type: 'general',
      isPaid: true,
      notes: 'বিকাশ মারফত জমা',
      createdAt: new Date('2026-10-10'),
    },
    {
      _id: 'dep_big_1',
      userId: 'user_1',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      amount: 1400,
      date: '2026-10-10',
      type: 'big_bazar',
      isPaid: true,
      notes: 'বড় বাজারের কন্ট্রিবিউশন',
      createdAt: new Date('2026-10-10'),
    },
    {
      _id: 'dep_2',
      userId: 'user_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      amount: 6000,
      date: '2026-10-10',
      type: 'general',
      isPaid: true,
      createdAt: new Date('2026-10-10'),
    },
    {
      _id: 'dep_big_2',
      userId: 'user_2',
      cycleId: 'cycle_1',
      messId: 'mess_1',
      amount: 1400,
      date: '2026-10-10',
      type: 'big_bazar',
      isPaid: true,
      createdAt: new Date('2026-10-10'),
    },
  ];

  cycleSnapshots: CycleSnapshotDoc[] = [];

  auditLogs: AuditLogDoc[] = [
    {
      _id: 'log_1',
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'user_admin',
      performedByUserName: 'মুহাম্মদ শিহাব উদ্দিন',
      action: 'সিস্টেম ইনিশিয়ালাইজ ও সাইকেল শুরু করা হয়েছে',
      targetCollection: 'cycles',
      createdAt: new Date('2026-10-10'),
    },
  ];

  constructor() {
    this.seedMeals();
    this.generateDutySlots();
  }

  // Seed default 40 meal units for each member to match SRS Example 5.7
  private seedMeals() {
    // 6 members, each with 40 units
    const memberIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'user_6'];
    for (const uid of memberIds) {
      this.meals.push({
        _id: `m_${uid}_aggregate`,
        userId: uid,
        cycleId: 'cycle_1',
        messId: 'mess_1',
        date: '2026-10-15',
        slotId: 'all',
        weight: 40,
        consumed: true,
        source: 'default',
        updatedAt: new Date(),
      });
    }
  }

  // Generate automated Duty Roster Bazar slots (SRS Section 4.5)
  public generateDutySlots() {
    this.bazarSlots = [];
    const memberIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'user_6'];
    const days = 30; // 30 days cycle
    const numMembers = memberIds.length;
    const daysPerSlot = Math.floor(days / numMembers); // 5 days each

    let startDay = 10;
    for (let i = 0; i < numMembers; i++) {
      const from = `2026-10-${String(startDay).padStart(2, '0')}`;
      const toDay = startDay + daysPerSlot - 1;
      const to = `2026-10-${String(toDay).padStart(2, '0')}`;
      startDay = toDay + 1;

      this.bazarSlots.push({
        _id: `slot_${i + 1}`,
        cycleId: 'cycle_1',
        messId: 'mess_1',
        slotIndex: i + 1,
        startDate: from,
        endDate: to,
        capacity: 1,
        assignedUserIds: [memberIds[i]],
        createdAt: new Date(),
      });
    }
  }

  // Real-time calculation helper
  public computeCurrentCycleBilling(cycleId = 'cycle_1'): BillingEngineOutput {
    const cycle = this.cycles.find((c) => c._id === cycleId);
    const membersInput = this.users
      .filter((u) => u._id !== 'user_admin')
      .map((u) => {
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

// Global singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __messStore: MessStore | undefined;
}

export const getStore = (): MessStore => {
  if (!global.__messStore) {
    global.__messStore = new MessStore();
  }
  return global.__messStore;
};
