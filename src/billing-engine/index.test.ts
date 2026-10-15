import { describe, expect, it } from 'vitest';
import { calculateBilling } from './index';
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
});
