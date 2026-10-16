import { describe, expect, it } from 'vitest';
import { calculateBilling, calculateUtilityBillPerPerson } from './index';
import { BillingEngineInput } from './types';

describe('Billing Engine (SRS Section 5 Calculation Engine)', () => {
  it('correctly calculates Example 5.7 from the SRS document', () => {
    // 6 members
    const members = [
      { userId: 'user_1', name: 'সদস্য ক', roomRent: 3100, isActive: true },
      { userId: 'user_2', name: 'সদস্য খ', roomRent: 3000, isActive: true },
      { userId: 'user_3', name: 'সদস্য গ', roomRent: 3000, isActive: true },
      { userId: 'user_4', name: 'সদস্য ঘ', roomRent: 2800, isActive: true },
      { userId: 'user_5', name: 'সদস্য ঙ', roomRent: 2800, isActive: true },
      { userId: 'user_6', name: 'সদস্য চ', roomRent: 2400, isActive: true },
    ];

    // Meal records: User 1 has 40 units, other 5 have 40 units each = 240 total
    const mealRecords = [
      { userId: 'user_1', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
      { userId: 'user_2', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
      { userId: 'user_3', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
      { userId: 'user_4', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
      { userId: 'user_5', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
      { userId: 'user_6', date: '2026-10-15', slotId: 'all', weight: 40, consumed: true },
    ];

    // Fixed Events: User 1 attended 3 fixed events, cost per attendee 150 each = 450 total
    // (extraMealWeight: 0 here to keep base meal units exactly at 40 as in table 5.7)
    const fixedEvents = [
      {
        id: 'fix_1',
        date: '2026-10-16',
        mealTime: 'lunch' as const,
        cost: 600,
        extraMealWeight: 0,
        attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'], // 600 / 4 = 150
      },
      {
        id: 'fix_2',
        date: '2026-10-23',
        mealTime: 'lunch' as const,
        cost: 600,
        extraMealWeight: 0,
        attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'], // 600 / 4 = 150
      },
      {
        id: 'fix_3',
        date: '2026-10-30',
        mealTime: 'lunch' as const,
        cost: 600,
        extraMealWeight: 0,
        attendeeUserIds: ['user_1', 'user_2', 'user_3', 'user_4'], // 600 / 4 = 150
      },
    ];

    // Bazar items:
    // Regular bazar = 15000 (User 1 spent 2500 of it from own money)
    // Big bazar = 8400 (paid from collected big bazar fund)
    // Extra bazar (pool) = 600
    const bazarItems = [
      {
        id: 'b_1',
        userId: 'user_1',
        amount: 2500,
        type: 'regular' as const,
        isApproved: true,
        paidFromBigBazarFund: false,
      },
      {
        id: 'b_2',
        userId: 'user_2',
        amount: 12500,
        type: 'regular' as const,
        isApproved: true,
        paidFromBigBazarFund: false,
      },
      {
        id: 'b_big',
        userId: 'user_2',
        amount: 8400,
        type: 'big' as const,
        isApproved: true,
        paidFromBigBazarFund: true,
      },
      {
        id: 'b_extra',
        userId: 'user_3',
        amount: 600,
        type: 'extra' as const,
        splitType: 'meal_pool' as const,
        isApproved: true,
        paidFromBigBazarFund: false,
      },
    ];

    // Deposits: User 1 paid 5000 general deposit + 1400 big bazar contribution
    const deposits = [
      { userId: 'user_1', amount: 5000, type: 'general' as const, isPaid: true },
      { userId: 'user_1', amount: 1400, type: 'big_bazar' as const, isPaid: true },
    ];

    // Utility bills: Total 6,100
    const utilityBills = [
      { id: 'u_1', name: 'Water', amount: 1000 },
      { id: 'u_2', name: 'Gas', amount: 1000 },
      { id: 'u_3', name: 'Electricity', amount: 3000 },
      { id: 'u_4', name: 'Internet', amount: 1000 },
      { id: 'u_5', name: 'Waste', amount: 100 },
    ];

    const bigBazarConfig = {
      isEnabled: true,
      perMemberContribution: 1400,
      leftoverValueCarry: 0,
    };

    const input: BillingEngineInput = {
      members,
      mealRecords,
      fixedEvents,
      bazarItems,
      deposits,
      utilityBills,
      bigBazarConfig,
      options: { roundToInteger: true },
    };

    const result = calculateBilling(input);

    // Verify Pool and Rate
    expect(result.totalRegularBazar).toBe(15000);
    expect(result.totalBigBazarCost).toBe(8400);
    expect(result.totalExtraBazarPool).toBe(600);
    expect(result.mealPoolTotal).toBe(24000);
    expect(result.totalMealUnits).toBe(240);
    expect(result.mealRate).toBe(100);

    // Verify Member ক (user_1) according to Table 5.7
    const user1 = result.memberResults['user_1'];
    expect(user1).toBeDefined();
    expect(user1.mealUnits).toBe(40);
    expect(user1.regularMealCost).toBe(4000);
    expect(user1.fixedShare).toBe(450);
    expect(user1.utilityShare).toBe(1017); // 6100 / 6 = 1016.666 -> rounded to 1017
    expect(user1.roomRent).toBe(3100);
    expect(user1.totalDues).toBe(8567);

    // Credits: 5000 (deposit) + 2500 (bazar spent) + 1400 (big bazar deposit) = 8900
    expect(user1.generalDeposits).toBe(5000);
    expect(user1.approvedBazarSpentOwnMoney).toBe(2500);
    expect(user1.bigBazarDeposits).toBe(1400);
    expect(user1.totalCredits).toBe(8900);

    // Net Balance: 8900 - 8567 = +333
    expect(user1.netBalance).toBe(333);
  });

  it('handles zero meal units gracefully without division by zero', () => {
    const input: BillingEngineInput = {
      members: [{ userId: 'u1', name: 'User 1', roomRent: 3000, isActive: true }],
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    };

    const res = calculateBilling(input);
    expect(res.mealRate).toBe(0);
    expect(res.memberResults['u1'].totalDues).toBe(3000);
    expect(res.memberResults['u1'].netBalance).toBe(-3000);
  });

  it('correctly adjusts meal units and meal rate with and without fixed event extraMealWeight', () => {
    const baseMembers = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true },
    ];
    const baseMeals = [
      { userId: 'u1', date: '2026-10-01', slotId: 'night', weight: 20, consumed: true },
      { userId: 'u2', date: '2026-10-01', slotId: 'night', weight: 20, consumed: true },
    ];
    const baseBazar = [
      { id: 'b1', userId: 'u1', amount: 4000, type: 'regular' as const, isApproved: true },
    ];

    // Scenario 1: Without fixed event
    const resWithout = calculateBilling({
      members: baseMembers,
      mealRecords: baseMeals,
      fixedEvents: [],
      bazarItems: baseBazar,
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(resWithout.totalMealUnits).toBe(40);
    expect(resWithout.mealRate).toBe(100);
    expect(resWithout.memberResults['u1'].mealUnits).toBe(20);
    expect(resWithout.memberResults['u2'].mealUnits).toBe(20);
    expect(resWithout.memberResults['u1'].fixedShare).toBe(0);

    // Scenario 2: With fixed event (default extraMealWeight 0.5 for each attendee, cost 600)
    const resWith = calculateBilling({
      members: baseMembers,
      mealRecords: baseMeals,
      fixedEvents: [
        {
          id: 'fe1',
          date: '2026-10-05',
          mealTime: 'lunch',
          cost: 600,
          extraMealWeight: 0.5,
          attendeeUserIds: ['u1', 'u2'],
        },
      ],
      bazarItems: baseBazar,
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    // 20 + 0.5 = 20.5 for each member -> Total meal units = 41
    expect(resWith.totalMealUnits).toBe(41);
    expect(resWith.memberResults['u1'].mealUnits).toBe(20.5);
    expect(resWith.memberResults['u2'].mealUnits).toBe(20.5);

    // Meal rate: 4000 / 41 = 97.56
    expect(resWith.mealRate).toBe(97.56);

    // Fixed event cost: 600 / 2 = 300 per attendee
    expect(resWith.memberResults['u1'].fixedShare).toBe(300);
    expect(resWith.memberResults['u2'].fixedShare).toBe(300);
  });

  it('correctly calculates utility bills for: all active, selected 2 members, and exempt member', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u3', name: 'User 3', roomRent: 2000, isActive: true, isUtilityExempt: true }, // exempt
      { userId: 'u4', name: 'User 4', roomRent: 2000, isActive: true, isUtilityExempt: false },
    ];

    const utilityBills = [
      // 1. Applies to all (empty applicableUserIds) -> split among u1, u2, u4 (3 non-exempt)
      { id: 'b_all', name: 'WiFi', amount: 3000 },
      // 2. Applies to selected 2 members (u1, u2) -> split between u1, u2 (500 each)
      { id: 'b_two', name: 'AC Cleaning', amount: 1000, applicableUserIds: ['u1', 'u2'] },
      // 3. Applies to u2 and exempt member u3 -> only u2 pays (600)
      { id: 'b_exempt_test', name: 'Special Item', amount: 600, applicableUserIds: ['u2', 'u3'] },
    ];

    const result = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    // u1: 1000 (from WiFi) + 500 (from AC) = 1500
    expect(result.memberResults['u1'].utilityShare).toBe(1500);

    // u2: 1000 (from WiFi) + 500 (from AC) + 600 (from Special Item) = 2100
    expect(result.memberResults['u2'].utilityShare).toBe(2100);

    // u3 (exempt): 0
    expect(result.memberResults['u3'].utilityShare).toBe(0);

    // u4: 1000 (from WiFi) = 1000
    expect(result.memberResults['u4'].utilityShare).toBe(1000);

    // Total utility across mess
    expect(result.totalUtility).toBe(4600);
  });

  it('excludes pending bazar entries from calculations until approved', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true },
    ];
    const mealRecords = [
      { userId: 'u1', date: '2026-10-01', slotId: 'all', weight: 10, consumed: true },
      { userId: 'u2', date: '2026-10-01', slotId: 'all', weight: 10, consumed: true },
    ];

    // Case 1: Bazar is pending (isApproved: false)
    const pendingResult = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems: [
        {
          id: 'b_pending',
          userId: 'u1',
          amount: 5000,
          type: 'regular',
          isApproved: false, // pending
        },
      ],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(pendingResult.totalRegularBazar).toBe(0);
    expect(pendingResult.mealPoolTotal).toBe(0);
    expect(pendingResult.mealRate).toBe(0);
    expect(pendingResult.memberResults['u1'].approvedBazarSpentOwnMoney).toBe(0);
    expect(pendingResult.memberResults['u1'].totalCredits).toBe(0);

    // Case 2: Bazar is approved (isApproved: true)
    const approvedResult = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems: [
        {
          id: 'b_approved',
          userId: 'u1',
          amount: 5000,
          type: 'regular',
          isApproved: true, // approved
        },
      ],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(approvedResult.totalRegularBazar).toBe(5000);
    expect(approvedResult.mealPoolTotal).toBe(5000);
    expect(approvedResult.mealRate).toBe(250); // 5000 / 20 meal units
    expect(approvedResult.memberResults['u1'].approvedBazarSpentOwnMoney).toBe(5000);
    expect(approvedResult.memberResults['u1'].totalCredits).toBe(5000);
  });

  it('strictly attributes deposits to individual members and rejects unassigned/mess_fund deposits', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true },
    ];

    const deposits = [
      { userId: 'u1', amount: 3000, type: 'general' as const, isPaid: true },
      { userId: 'u2', amount: 2000, type: 'general' as const, isPaid: true },
      { userId: 'mess_fund', amount: 5000, type: 'general' as const, isPaid: true }, // Should be ignored
    ];

    const result = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits,
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(result.memberResults['u1'].generalDeposits).toBe(3000);
    expect(result.memberResults['u1'].totalCredits).toBe(3000);
    expect(result.memberResults['u2'].generalDeposits).toBe(2000);
    expect(result.memberResults['u2'].totalCredits).toBe(2000);
    // Total credits should strictly be 3000 + 2000 = 5000 (mess_fund is not added)
    expect(result.totals.totalCredits).toBe(5000);
  });

  it('correctly calculates big bazar: enabled vs disabled, and with vs without carry-over', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true },
    ];
    const mealRecords = [
      { userId: 'u1', date: '2026-10-01', slotId: 'all', weight: 10, consumed: true },
      { userId: 'u2', date: '2026-10-01', slotId: 'all', weight: 10, consumed: true },
    ];
    const bigBazarItem = {
      id: 'bb_1',
      userId: 'u1',
      amount: 2400,
      type: 'big' as const,
      isApproved: true,
      paidFromBigBazarFund: true,
    };
    const deposits = [
      { userId: 'u1', amount: 1400, type: 'big_bazar' as const, isPaid: true },
      { userId: 'u2', amount: 1400, type: 'big_bazar' as const, isPaid: true },
    ];

    // Case 1: Big bazar enabled WITH carry-over (e.g. 200 leftover from previous cycle)
    const resEnabledWithCarry = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems: [bigBazarItem],
      deposits,
      utilityBills: [],
      bigBazarConfig: {
        isEnabled: true,
        perMemberContribution: 1400,
        leftoverValueCarry: 200,
      },
    });

    // Per SRS formula 5.2: Meal Pool includes (S_big - L_carry) = 2400 - 200 = 2200
    expect(resEnabledWithCarry.totalBigBazarCost).toBe(2400);
    expect(resEnabledWithCarry.mealPoolTotal).toBe(2200);
    expect(resEnabledWithCarry.mealRate).toBe(110); // 2200 / 20 meal units
    expect(resEnabledWithCarry.bigBazarCarryToNextCycle).toBe(200);

    // Case 2: Big bazar enabled WITHOUT carry-over
    const resEnabledNoCarry = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems: [bigBazarItem],
      deposits,
      utilityBills: [],
      bigBazarConfig: {
        isEnabled: true,
        perMemberContribution: 1400,
        leftoverValueCarry: 0,
      },
    });

    expect(resEnabledNoCarry.totalBigBazarCost).toBe(2400);
    expect(resEnabledNoCarry.mealPoolTotal).toBe(2400);
    expect(resEnabledNoCarry.mealRate).toBe(120); // 2400 / 20
    expect(resEnabledNoCarry.bigBazarCarryToNextCycle).toBe(0);

    // Case 3: Big bazar disabled
    const resDisabled = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems: [bigBazarItem],
      deposits,
      utilityBills: [],
      bigBazarConfig: {
        isEnabled: false,
        perMemberContribution: 0,
        leftoverValueCarry: 0,
      },
    });

    // When disabled, big bazar cost is 0, item is treated as regular bazar
    expect(resDisabled.totalBigBazarCost).toBe(0);
    expect(resDisabled.totalRegularBazar).toBe(2400);
    expect(resDisabled.mealPoolTotal).toBe(2400);
    expect(resDisabled.bigBazarCarryToNextCycle).toBe(0);
  });

  it('handles member leaving mid-cycle or inactive members accurately', () => {
    const members = [
      { userId: 'u1', name: 'Active Member', roomRent: 3000, isActive: true },
      { userId: 'u2', name: 'Departed Member', roomRent: 1500, isActive: false, leftDate: '2026-10-15' },
    ];

    // Departed member only consumed 5 meals before leaving, Active consumed 25
    const mealRecords = [
      { userId: 'u1', date: '2026-10-10', slotId: 'all', weight: 25, consumed: true },
      { userId: 'u2', date: '2026-10-05', slotId: 'all', weight: 5, consumed: true },
    ];

    const bazarItems = [
      { id: 'b1', userId: 'u1', amount: 3000, type: 'regular' as const, isApproved: true },
    ];

    // Utility bill: applies to active members (u1)
    const utilityBills = [
      { id: 'util_1', name: 'Gas', amount: 1000 },
    ];

    const result = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems,
      deposits: [
        { userId: 'u2', amount: 2000, type: 'general' as const, isPaid: true },
      ],
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    // Meal rate: 3000 / 30 units = 100
    expect(result.mealRate).toBe(100);

    // Active member u1: 25 * 100 = 2500 meal + 1000 utility (active only) + 3000 rent = 6500
    expect(result.memberResults['u1'].utilityShare).toBe(1000);
    expect(result.memberResults['u1'].regularMealCost).toBe(2500);
    expect(result.memberResults['u1'].totalDues).toBe(6500);

    // Departed member u2: 5 * 100 = 500 meal + 0 utility (inactive) + 1500 rent = 2000 dues
    expect(result.memberResults['u2'].utilityShare).toBe(0);
    expect(result.memberResults['u2'].regularMealCost).toBe(500);
    expect(result.memberResults['u2'].totalDues).toBe(2000);
    // Deposited 2000 -> net balance = 2000 - 2000 = 0
    expect(result.memberResults['u2'].netBalance).toBe(0);
  });

  it('ensures the sum of all members net balances matches mess totals within rounding difference', () => {
    const members = [
      { userId: 'u1', name: 'Member 1', roomRent: 3100, isActive: true },
      { userId: 'u2', name: 'Member 2', roomRent: 3000, isActive: true },
      { userId: 'u3', name: 'Member 3', roomRent: 2800, isActive: true },
      { userId: 'u4', name: 'Member 4', roomRent: 2900, isActive: true },
      { userId: 'u5', name: 'Member 5', roomRent: 2700, isActive: true },
    ];

    const mealRecords = [
      { userId: 'u1', date: '2026-10-01', slotId: 'all', weight: 33.3, consumed: true },
      { userId: 'u2', date: '2026-10-01', slotId: 'all', weight: 28.5, consumed: true },
      { userId: 'u3', date: '2026-10-01', slotId: 'all', weight: 41.2, consumed: true },
      { userId: 'u4', date: '2026-10-01', slotId: 'all', weight: 19.7, consumed: true },
      { userId: 'u5', date: '2026-10-01', slotId: 'all', weight: 35.1, consumed: true },
    ];

    const bazarItems = [
      { id: 'b1', userId: 'u1', amount: 8735, type: 'regular' as const, isApproved: true },
      { id: 'b2', userId: 'u3', amount: 5640, type: 'regular' as const, isApproved: true },
    ];

    const utilityBills = [
      { id: 'u1', name: 'Electricity', amount: 3777 },
      { id: 'u2', name: 'WiFi', amount: 1250 },
    ];

    const deposits = [
      { userId: 'u1', amount: 5000, type: 'general' as const, isPaid: true },
      { userId: 'u2', amount: 8000, type: 'general' as const, isPaid: true },
      { userId: 'u3', amount: 4000, type: 'general' as const, isPaid: true },
      { userId: 'u4', amount: 6500, type: 'general' as const, isPaid: true },
      { userId: 'u5', amount: 7000, type: 'general' as const, isPaid: true },
    ];

    const result = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems,
      deposits,
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    const sumMemberNet = result.allMembersSummary.reduce((sum, m) => sum + m.netBalance, 0);
    const expectedNet = result.totals.totalCredits - result.totals.totalDues;

    expect(result.totals.netBalance).toBe(expectedNet);
    // Integer rounding difference per member is at most 1 Tk per member
    expect(Math.abs(sumMemberNet - expectedNet)).toBeLessThanOrEqual(members.length);
  });

  it('correctly accounts for room rent and rent deposits without double-counting', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 3000, isActive: true },
    ];

    // Case 1: Rent not yet paid -> totalDues includes roomRent, netBalance is -3000
    const unpaidResult = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(unpaidResult.memberResults['u1'].roomRent).toBe(3000);
    expect(unpaidResult.memberResults['u1'].totalDues).toBe(3000);
    expect(unpaidResult.memberResults['u1'].totalCredits).toBe(0);
    expect(unpaidResult.memberResults['u1'].netBalance).toBe(-3000);

    // Case 2: Rent paid once via single deposit -> roomRent dues 3000 offset by deposit 3000 -> netBalance 0
    const paidResult = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [
        { userId: 'u1', amount: 3000, type: 'rent' as const, isPaid: true },
      ],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(paidResult.memberResults['u1'].roomRent).toBe(3000);
    expect(paidResult.memberResults['u1'].totalDues).toBe(3000);
    expect(paidResult.memberResults['u1'].totalCredits).toBe(3000);
    expect(paidResult.memberResults['u1'].netBalance).toBe(0);
  });

  it('correctly calculates pro-rata room rent and utility for mid-cycle departure', () => {
    // 30 days cycle, member stayed 15 days
    const members = [
      {
        userId: 'u_full',
        name: 'Full Member',
        roomRent: 3000,
        isActive: true,
      },
      {
        userId: 'u_half',
        name: 'Half Member',
        roomRent: 3000,
        isActive: false,
        stayedDays: 15,
        totalDaysInCycle: 30,
        leftDate: '2026-10-25',
      },
    ];

    const utilityBills = [
      { id: 'b1', name: 'Electricity', amount: 1000 }, // 500 per member base
    ];

    const result = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      cycleInfo: { totalDays: 30 },
    });

    const full = result.memberResults['u_full'];
    const half = result.memberResults['u_half'];

    // Full member: rent 3000, utility 1000 * (30/45) = 667
    expect(full.roomRent).toBe(3000);
    expect(full.utilityShare).toBe(667);
    expect(full.totalDues).toBe(3667);

    // Half member: rent 3000 * (15/30) = 1500, utility 1000 * (15/45) = 333
    expect(half.stayedDays).toBe(15);
    expect(half.proRataRatio).toBe(0.5);
    expect(half.roomRent).toBe(1500);
    expect(half.unrecoveredRent).toBe(1500);
    expect(half.utilityShare).toBe(333);
    expect(half.totalDues).toBe(1833);

    // Sum of utility collected equals total utility bill (zero deficit)
    expect(full.utilityShare + half.utilityShare).toBe(1000);
  });

  it('correctly applies "current_rate_final" locked meal rate vs "cycle_end_adjustment" floating rate', () => {
    const members = [
      {
        userId: 'u_locked',
        name: 'Settled Locked Member',
        roomRent: 0,
        isActive: false,
        settlementType: 'current_rate_final' as const,
        settledMealRate: 50.0, // settled early when rate was 50
      },
      {
        userId: 'u_floating',
        name: 'Settled Floating Member',
        roomRent: 0,
        isActive: false,
        settlementType: 'cycle_end_adjustment' as const,
      },
    ];

    // Each member consumed 10 meals
    const mealRecords = [
      { userId: 'u_locked', date: '2026-10-15', slotId: 'all', weight: 10, consumed: true },
      { userId: 'u_floating', date: '2026-10-15', slotId: 'all', weight: 10, consumed: true },
    ];

    // Later bazars increased total bazar to 1600 for 20 meals -> overall rate was 1600 / 20 = 80
    const bazarItems = [
      { id: 'b1', userId: 'u_floating', amount: 1600, type: 'regular' as const, isApproved: true },
    ];

    const result = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems,
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(result.mealRate).toBe(80);
    // Rebalanced rate for remaining/floating members: (1600 - 500) / 10 = 110
    expect(result.remainingMealRate).toBe(110);

    // Locked member pays at their settledMealRate of 50: 10 * 50 = 500
    expect(result.memberResults['u_locked'].regularMealCost).toBe(500);

    // Floating member adjusts to the rebalanced final cycle meal rate of 110: 10 * 110 = 1100
    expect(result.memberResults['u_floating'].regularMealCost).toBe(1100);

    // Total meal cost collected matches total meal pool (1600) with zero deficit
    const totalCollectedMeal =
      result.memberResults['u_locked'].regularMealCost +
      result.memberResults['u_floating'].regularMealCost;
    expect(totalCollectedMeal).toBe(1600);
  });

  it('correctly handles legacy utility bills with applicableCount and no applicableUserIds (Task খ)', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u3', name: 'User 3', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u4', name: 'User 4', roomRent: 2000, isActive: true, isUtilityExempt: true }, // exempt
    ];

    // Legacy bill: has applicableCount: 3, but NO applicableUserIds
    const legacyBill = {
      id: 'b_legacy',
      name: 'Old Electricity Bill',
      amount: 1500,
      applicableCount: 3,
    };

    // calculateUtilityBillPerPerson should divide by applicableCount: 1500 / 3 = 500
    const perPerson = calculateUtilityBillPerPerson(legacyBill, members);
    expect(perPerson).toBe(500);

    // calculateBilling should charge the 3 non-exempt members 500 each, and exempt member 0
    const result = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [legacyBill],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(result.memberResults['u1'].utilityShare).toBe(500);
    expect(result.memberResults['u2'].utilityShare).toBe(500);
    expect(result.memberResults['u3'].utilityShare).toBe(500);
    expect(result.memberResults['u4'].utilityShare).toBe(0);
  });

  it('prioritizes applicableUserIds over legacy applicableCount when both exist (Task খ)', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u2', name: 'User 2', roomRent: 2000, isActive: true, isUtilityExempt: false },
      { userId: 'u3', name: 'User 3', roomRent: 2000, isActive: true, isUtilityExempt: false },
    ];

    // Bill with specific 2 members, but stale applicableCount: 5 left in document
    const specificBill = {
      id: 'b_specific',
      name: 'AC Bill',
      amount: 2000,
      applicableUserIds: ['u1', 'u2'],
      applicableCount: 5, // should be ignored in favor of applicableUserIds
    };

    // 2000 / 2 = 1000 per person
    const perPerson = calculateUtilityBillPerPerson(specificBill, members);
    expect(perPerson).toBe(1000);

    const result = calculateBilling({
      members,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [specificBill],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
    });

    expect(result.memberResults['u1'].utilityShare).toBe(1000);
    expect(result.memberResults['u2'].utilityShare).toBe(1000);
    expect(result.memberResults['u3'].utilityShare).toBe(0);
  });

  it('enforces rounding rules: meal rate to 2 decimals, integer member costs, and rounding difference (Task ঘ)', () => {
    const members = [
      { userId: 'u1', name: 'User 1', roomRent: 3000, isActive: true },
      { userId: 'u2', name: 'User 2', roomRent: 3000, isActive: true },
      { userId: 'u3', name: 'User 3', roomRent: 3000, isActive: true },
    ];

    // Total bazar 1000 for 17 meal units -> raw meal rate = 1000 / 17 = 58.823529...
    // Rounded to 2 decimals: 58.82
    const mealRecords = [
      { userId: 'u1', date: '2026-10-01', slotId: 'all', weight: 6, consumed: true },
      { userId: 'u2', date: '2026-10-01', slotId: 'all', weight: 6, consumed: true },
      { userId: 'u3', date: '2026-10-01', slotId: 'all', weight: 5, consumed: true },
    ];

    const bazarItems = [
      { id: 'b1', userId: 'u1', amount: 1000, type: 'regular' as const, isApproved: true },
    ];

    // Utility bill 1000 for 3 members -> raw 333.333..., integer rounded 333 each
    const utilityBills = [
      { id: 'ub1', name: 'Water', amount: 1000 },
    ];

    const result = calculateBilling({
      members,
      mealRecords,
      fixedEvents: [],
      bazarItems,
      deposits: [],
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    // 1. Meal rate must be rounded to two decimal places
    expect(result.mealRate).toBe(58.82);

    // 2. Member individual costs must be integers
    // u1: 6 * 58.82 = 352.92 -> Math.round is 353
    expect(result.memberResults['u1'].regularMealCost).toBe(353);
    // u3: 5 * 58.82 = 294.1 -> Math.round is 294
    expect(result.memberResults['u3'].regularMealCost).toBe(294);

    // Utility per person rounded to integer: 1000 / 3 = 333
    expect(result.memberResults['u1'].utilityShare).toBe(333);
    expect(result.memberResults['u2'].utilityShare).toBe(333);
    expect(result.memberResults['u3'].utilityShare).toBe(333);

    // calculateUtilityBillPerPerson returns integer by default
    const utilPerPerson = calculateUtilityBillPerPerson(utilityBills[0], members);
    expect(utilPerPerson).toBe(333);

    // 3. Rounding difference must be tracked in totals
    expect(result.totals.roundingDifference).toBeDefined();
    expect(typeof result.totals.roundingDifference).toBe('number');

    // Utility rounding difference: 333 * 3 = 999 vs 1000 bill = -1
    expect(result.totals.utilityRoundingDifference).toBe(-1);
  });
});



