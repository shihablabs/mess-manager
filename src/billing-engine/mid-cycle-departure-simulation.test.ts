import { describe, expect, it } from 'vitest';
import { calculateBilling, calculateDepartureMealRateImpact } from './index';
import { BillingEngineInput } from './types';

describe('Mid-Cycle Departure & Rebalancing Reconciliation (SRS Section 5)', () => {
  const cycleInfo = {
    totalDays: 30,
    startDate: '2026-10-01',
    endDate: '2026-10-30',
  };

  const utilityBills = [
    {
      id: 'util_1',
      type: 'wifi' as const,
      name: 'ওয়াইফাই ও গ্যাস বিল',
      amount: 6000,
    },
  ];

  const bazarItems = [
    {
      id: 'bazar_1',
      userId: 'user_2',
      amount: 24000,
      type: 'regular' as const,
      isApproved: true,
    },
  ];

  // Scenario 1: Primary User Requirement (6 members, 1 leaves on 15th with rate 50, units 300, meal 24,000, utility 6,000)
  it('Scenario 1: correctly rebalances meal rate to 83.33 Tk and utility to 545/1091 Tk with ZERO deficit', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'user_1',
        name: 'সদস্য ১ (মাঝপথে ছাড়া)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'current_rate_final',
        settledMealRate: 50.0, // locked early when rate was 50
        rentSettlementType: 'pro_rata',
      },
      { userId: 'user_2', name: 'সদস্য ২', roomRent: 3000, isActive: true },
      { userId: 'user_3', name: 'সদস্য ৩', roomRent: 3000, isActive: true },
      { userId: 'user_4', name: 'সদস্য ৪', roomRent: 3000, isActive: true },
      { userId: 'user_5', name: 'সদস্য ৫', roomRent: 3000, isActive: true },
      { userId: 'user_6', name: 'সদস্য ৬', roomRent: 3000, isActive: true },
    ];

    const mealRecords: BillingEngineInput['mealRecords'] = [
      // user_1 consumed 30 units
      { userId: 'user_1', date: '2026-10-05', slotId: 'night', weight: 30, consumed: 1 },
      // user_2 to user_6 consumed 54 units each (total 270 units)
      { userId: 'user_2', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_3', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_4', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_5', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_6', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
    ];

    const result = calculateBilling({
      cycleInfo,
      members,
      mealRecords,
      bazarItems,
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      deposits: [],
      fixedEvents: [],
      options: { roundToInteger: true },
    });

    // ১. মিল রিব্যালেন্সিং যাচাই:
    // মেসের গড় রেট = 24,000 / 300 = 80 Tk
    expect(result.mealRate).toBe(80);
    // ছাড়া সদস্যের লকড রেট ৫০: খরচ = ৩০ × ৫০ = ১,৫০০ টাকা
    const member1 = result.memberResults['user_1'];
    expect(member1.effectiveMealRate).toBe(50);
    expect(member1.regularMealCost).toBe(1500);

    // বাকিদের রিব্যালেন্সড রেট = (২৪,০০০ − ১,৫০০) / (৩০০ − ৩০) = ২২,৫০০ / ২৭০ = ৮৩.৩৩ টাকা
    expect(result.remainingMealRate).toBe(83.33);

    // বাকি সদস্যরা (user_2 .. user_6): প্রত্যেকে ৫৪ ইউনিট × ৮৩.৩৩৩... = ৪,৫০০ টাকা
    for (const uid of ['user_2', 'user_3', 'user_4', 'user_5', 'user_6']) {
      const rem = result.memberResults[uid];
      expect(rem.effectiveMealRate).toBe(83.33);
      expect(rem.regularMealCost).toBe(4500);
    }

    // মোট মিল আদায় = ১,৫০০ + (৫ × ৪,৫০০) = ২৪,০০০ টাকা (মেসের মোট মিল খরচ, শূন্য ঘাটতি)
    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    expect(totalCollectedMeal).toBe(24000);
    expect(result.mealPoolTotal - totalCollectedMeal).toBe(0);

    // ২. ইউটিলিটি যাচাই (দিনের অনুপাতে: ১৫ দিন বনাম ৩০ দিন):
    // মোট দিন = ১৫ + (৫ × ৩০) = ১৬৫ দিন
    // সদস্য ১: ৬,০০০ × (১৫ / ১৬৫) = ৫৪৫.৪৫ -> ৫৪৫ টাকা
    // বাকিরা: ৬,০০০ × (৩০ / ১৬৫) = ১,০৯০.৯১ -> ১,০৯১ টাকা
    expect(member1.utilityShare).toBe(545);
    for (const uid of ['user_2', 'user_3', 'user_4', 'user_5', 'user_6']) {
      expect(result.memberResults[uid].utilityShare).toBe(1091);
    }

    // মোট ইউটিলিটি আদায় = ৫৪৫ + (৫ × ১,০৯১) = ৬,০০০ টাকা (শূন্য ঘাটতি)
    const totalCollectedUtility =
      result.allMembersSummary.reduce((sum, m) => sum + m.utilityShare, 0);
    expect(totalCollectedUtility).toBe(6000);
    expect(result.totalUtility - totalCollectedUtility).toBe(0);

    // ৩. রুম ভাড়া ও অনাদায়ী ভাড়া যাচাই (Item 5):
    // সদস্য ১ pro_rata: ১৫/৩০ = ১,৫০০ টাকা দেনা, অনাদায়ী ভাড়া = ১,৫০০ টাকা
    expect(member1.roomRent).toBe(1500);
    expect(member1.unrecoveredRent).toBe(1500);
    // বাকিদের ভাড়া ৩,০০০ টাকা করে অপরিবর্তিত
    for (const uid of ['user_2', 'user_3', 'user_4', 'user_5', 'user_6']) {
      expect(result.memberResults[uid].roomRent).toBe(3000);
      expect(result.memberResults[uid].unrecoveredRent).toBe(0);
    }
    expect(result.unrecoveredRent).toBe(1500);
    expect(result.totals.unrecoveredRent).toBe(1500);

    // ৪. মোট দেনা সমতা যাচাই (Item 7):
    // সব সদস্যের মোট অপারেশনাল দেনা = মিল (২৪,০০০) + ইউটিলিটি (৬,০০০) = ৩০,০০০ টাকা
    const totalMemberOperationalDues = totalCollectedMeal + totalCollectedUtility;
    const totalMessOperationalCost = result.mealPoolTotal + result.totalUtility;
    expect(totalMemberOperationalDues).toBe(totalMessOperationalCost);

    // মোট সদস্য দেনা = ১৬,৫০০ (রুম ভাড়া) + ২৪,০০০ (মিল) + ৬,০০০ (ইউটিলিটি) = ৪৬,৫০০ টাকা
    const sumAllDues = result.allMembersSummary.reduce((sum, m) => sum + m.totalDues, 0);
    expect(sumAllDues).toBe(46500);
  });

  // Scenario 2: Two members leave at different times with different locked rates
  it('Scenario 2: handles two members leaving at different times with zero deficit', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'm1',
        name: 'সদস্য ১ (১০ তারিখে ছাড়া)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 10,
        settlementType: 'current_rate_final',
        settledMealRate: 45.0,
      },
      {
        userId: 'm2',
        name: 'সদস্য ২ (২০ তারিখে ছাড়া)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 20,
        settlementType: 'current_rate_final',
        settledMealRate: 60.0,
      },
      { userId: 'm3', name: 'সদস্য ৩', roomRent: 3000, isActive: true },
      { userId: 'm4', name: 'সদস্য ৪', roomRent: 3000, isActive: true },
      { userId: 'm5', name: 'সদস্য ৫', roomRent: 3000, isActive: true },
      { userId: 'm6', name: 'সদস্য ৬', roomRent: 3000, isActive: true },
    ];

    const mealRecords: BillingEngineInput['mealRecords'] = [
      { userId: 'm1', date: '2026-10-05', slotId: 'night', weight: 20, consumed: 1 },
      { userId: 'm2', date: '2026-10-15', slotId: 'night', weight: 40, consumed: 1 },
      { userId: 'm3', date: '2026-10-25', slotId: 'night', weight: 60, consumed: 1 },
      { userId: 'm4', date: '2026-10-25', slotId: 'night', weight: 60, consumed: 1 },
      { userId: 'm5', date: '2026-10-25', slotId: 'night', weight: 60, consumed: 1 },
      { userId: 'm6', date: '2026-10-25', slotId: 'night', weight: 60, consumed: 1 },
    ];

    const result = calculateBilling({
      cycleInfo,
      members,
      mealRecords,
      bazarItems,
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      deposits: [],
      fixedEvents: [],
      options: { roundToInteger: true },
    });

    // m1: 20 * 45 = 900
    // m2: 40 * 60 = 2400
    // Total locked = 3300 Tk, Total locked units = 60
    // Remaining pool = 24000 - 3300 = 20700 Tk
    // Remaining units = 300 - 60 = 240 units
    // Remaining rate = 20700 / 240 = 86.25 Tk
    expect(result.remainingMealRate).toBe(86.25);
    expect(result.memberResults['m1'].regularMealCost).toBe(900);
    expect(result.memberResults['m2'].regularMealCost).toBe(2400);

    // Remaining 4 members: 60 * 86.25 = 5175 each
    for (const uid of ['m3', 'm4', 'm5', 'm6']) {
      expect(result.memberResults[uid].regularMealCost).toBe(5175);
    }

    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    expect(totalCollectedMeal).toBe(24000);
    expect(result.mealPoolTotal - totalCollectedMeal).toBe(0);

    // Utility: stayed days = 10 + 20 + (4 * 30) = 150 days
    // m1 (10/150): 400 Tk
    // m2 (20/150): 800 Tk
    // m3..m6 (30/150): 1200 Tk each
    expect(result.memberResults['m1'].utilityShare).toBe(400);
    expect(result.memberResults['m2'].utilityShare).toBe(800);
    for (const uid of ['m3', 'm4', 'm5', 'm6']) {
      expect(result.memberResults[uid].utilityShare).toBe(1200);
    }

    const totalCollectedUtility =
      result.allMembersSummary.reduce((sum, m) => sum + m.utilityShare, 0);
    expect(totalCollectedUtility).toBe(6000);

    // Item 7: Total operational dues equals mess operational cost
    expect(totalCollectedMeal + totalCollectedUtility).toBe(30000);
  });

  // Scenario 3: Mid-cycle joiner (joinedDate)
  it('Scenario 3: correctly handles a member joining mid-cycle with pro-rata utility and room rent', () => {
    const members: BillingEngineInput['members'] = [
      { userId: 'u1', name: 'Member 1', roomRent: 3000, isActive: true },
      { userId: 'u2', name: 'Member 2', roomRent: 3000, isActive: true },
      { userId: 'u3', name: 'Member 3', roomRent: 3000, isActive: true },
      { userId: 'u4', name: 'Member 4', roomRent: 3000, isActive: true },
      { userId: 'u5', name: 'Member 5', roomRent: 3000, isActive: true },
      {
        userId: 'u_new',
        name: 'নতুন সদস্য (১৫ তারিখে যোগ)',
        roomRent: 3000,
        isActive: true,
        joinedDate: '2026-10-16', // 15 days in Oct (16th to 30th)
      },
    ];

    const mealRecords: BillingEngineInput['mealRecords'] = [
      { userId: 'u1', date: '2026-10-10', slotId: 'all', weight: 50, consumed: 1 },
      { userId: 'u2', date: '2026-10-10', slotId: 'all', weight: 50, consumed: 1 },
      { userId: 'u3', date: '2026-10-10', slotId: 'all', weight: 50, consumed: 1 },
      { userId: 'u4', date: '2026-10-10', slotId: 'all', weight: 50, consumed: 1 },
      { userId: 'u5', date: '2026-10-10', slotId: 'all', weight: 50, consumed: 1 },
      { userId: 'u_new', date: '2026-10-20', slotId: 'all', weight: 25, consumed: 1 },
    ];

    const result = calculateBilling({
      cycleInfo,
      members,
      mealRecords,
      bazarItems,
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      deposits: [],
      fixedEvents: [],
      options: { roundToInteger: true },
    });

    const newMember = result.memberResults['u_new'];
    expect(newMember.stayedDays).toBe(15);
    expect(newMember.proRataRatio).toBe(0.5);

    // New member room rent: 3000 * 0.5 = 1500 Tk, unrecovered rent = 1500 Tk
    expect(newMember.roomRent).toBe(1500);
    expect(newMember.unrecoveredRent).toBe(1500);

    // Utility: 5 members * 30 + 1 * 15 = 165 days
    // New member: 6000 * (15 / 165) = 545 Tk
    // Existing members: 6000 * (30 / 165) = 1091 Tk each
    expect(newMember.utilityShare).toBe(545);
    for (const uid of ['u1', 'u2', 'u3', 'u4', 'u5']) {
      expect(result.memberResults[uid].utilityShare).toBe(1091);
    }

    const totalCollectedUtility =
      result.allMembersSummary.reduce((sum, m) => sum + m.utilityShare, 0);
    expect(totalCollectedUtility).toBe(6000);

    // Total operational dues equals mess operational cost ± rounding difference (Item 7)
    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    expect(Math.abs(totalCollectedMeal - 24000)).toBeLessThanOrEqual(result.allMembersSummary.length);
    expect(Math.abs((totalCollectedMeal + totalCollectedUtility) - 30000)).toBeLessThanOrEqual(result.allMembersSummary.length);
  });

  // Scenario 4: cycle_end_adjustment floating final rate
  it('Scenario 4: correctly applies cycle_end_adjustment at floating rate 80 Tk with zero deficit', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'user_1',
        name: 'সদস্য ১ (মাঝপথে ছাড়া - চক্র শেষে সমন্বয়)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'cycle_end_adjustment',
        rentSettlementType: 'pro_rata',
      },
      { userId: 'user_2', name: 'সদস্য ২', roomRent: 3000, isActive: true },
      { userId: 'user_3', name: 'সদস্য ৩', roomRent: 3000, isActive: true },
      { userId: 'user_4', name: 'সদস্য ৪', roomRent: 3000, isActive: true },
      { userId: 'user_5', name: 'সদস্য ৫', roomRent: 3000, isActive: true },
      { userId: 'user_6', name: 'সদস্য ৬', roomRent: 3000, isActive: true },
    ];

    const mealRecords: BillingEngineInput['mealRecords'] = [
      { userId: 'user_1', date: '2026-10-05', slotId: 'night', weight: 30, consumed: 1 },
      { userId: 'user_2', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_3', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_4', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_5', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
      { userId: 'user_6', date: '2026-10-10', slotId: 'night', weight: 54, consumed: 1 },
    ];

    const result = calculateBilling({
      cycleInfo,
      members,
      mealRecords,
      bazarItems,
      utilityBills,
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      deposits: [],
      fixedEvents: [],
      options: { roundToInteger: true },
    });

    // In cycle_end_adjustment, all members pay the cycle rate of 80 Tk:
    expect(result.mealRate).toBe(80);
    expect(result.remainingMealRate).toBe(80);

    const member1 = result.memberResults['user_1'];
    expect(member1.effectiveMealRate).toBe(80);
    expect(member1.regularMealCost).toBe(30 * 80); // 2400 Tk

    for (const uid of ['user_2', 'user_3', 'user_4', 'user_5', 'user_6']) {
      expect(result.memberResults[uid].regularMealCost).toBe(54 * 80); // 4320 Tk
    }

    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    expect(totalCollectedMeal).toBe(24000);
    expect(result.mealPoolTotal - totalCollectedMeal).toBe(0);

    // Utility: member 1 stayed 15 days, pays 545 Tk; others pay 1091 Tk each
    expect(member1.utilityShare).toBe(545);
    const totalCollectedUtility =
      result.allMembersSummary.reduce((sum, m) => sum + m.utilityShare, 0);
    expect(totalCollectedUtility).toBe(6000);
  });

  // Scenario 5: Room rent options (pro_rata vs full_month) and unrecoveredRent tracking (Item 5)
  it('Scenario 5: supports admin choosing between pro_rata and full_month room rent on departure', () => {
    // Case A: pro_rata (default)
    const membersProRata: BillingEngineInput['members'] = [
      {
        userId: 'm_dep',
        name: 'Departing Member',
        roomRent: 4000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'current_rate_final',
        settledMealRate: 80,
        rentSettlementType: 'pro_rata',
      },
      { userId: 'm_act', name: 'Active Member', roomRent: 4000, isActive: true },
    ];

    const resProRata = calculateBilling({
      cycleInfo,
      members: membersProRata,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    // Departing member pays 4000 * (15/30) = 2000 Tk, unrecovered rent = 2000 Tk
    expect(resProRata.memberResults['m_dep'].roomRent).toBe(2000);
    expect(resProRata.memberResults['m_dep'].unrecoveredRent).toBe(2000);
    // Active member pays full 4000 Tk (unrecovered rent is NOT pushed onto other members)
    expect(resProRata.memberResults['m_act'].roomRent).toBe(4000);
    expect(resProRata.memberResults['m_act'].unrecoveredRent).toBe(0);
    expect(resProRata.unrecoveredRent).toBe(2000);

    // Case B: full_month
    const membersFullMonth: BillingEngineInput['members'] = [
      {
        userId: 'm_dep',
        name: 'Departing Member',
        roomRent: 4000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'current_rate_final',
        settledMealRate: 80,
        rentSettlementType: 'full_month',
      },
      { userId: 'm_act', name: 'Active Member', roomRent: 4000, isActive: true },
    ];

    const resFull = calculateBilling({
      cycleInfo,
      members: membersFullMonth,
      mealRecords: [],
      fixedEvents: [],
      bazarItems: [],
      deposits: [],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    });

    // Departing member pays full 4000 Tk, unrecovered rent = 0 Tk
    expect(resFull.memberResults['m_dep'].roomRent).toBe(4000);
    expect(resFull.memberResults['m_dep'].unrecoveredRent).toBe(0);
    expect(resFull.memberResults['m_act'].roomRent).toBe(4000);
    expect(resFull.unrecoveredRent).toBe(0);
  });

  // Scenario 6: Engine function calculateDepartureMealRateImpact (Item 4)
  it('Scenario 6: calculateDepartureMealRateImpact calculates projected meal rate increase on remaining members', () => {
    // 24,000 meal pool, 300 units, departing member has 30 units and settles at 50 Tk
    const impact = calculateDepartureMealRateImpact({
      mealPoolTotal: 24000,
      totalMealUnits: 300,
      departingMealUnits: 30,
      settledMealRate: 50,
    });

    expect(impact.currentMealRate).toBe(80);
    expect(impact.projectedRemainingMealRate).toBe(83.33);
    expect(impact.rateIncrease).toBe(3.33);
    expect(impact.warningMessage).toContain('এই রেটে ছাড়লে বাকিদের মিল রেট প্রায় ৳3.33 বাড়তে পারে');

    // Case with no increase (settles at or above current rate)
    const noImpact = calculateDepartureMealRateImpact({
      mealPoolTotal: 24000,
      totalMealUnits: 300,
      departingMealUnits: 30,
      settledMealRate: 80,
    });
    expect(noImpact.rateIncrease).toBe(0);
    expect(noImpact.warningMessage).toBe('');
  });

  // Scenario 7: Zero division protection (Item 1 edge case)
  it('Scenario 7: handles zero remaining meal units gracefully without division by zero', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'm_only',
        name: 'একমাত্র সদস্য (ছেড়ে গেছেন)',
        roomRent: 2000,
        isActive: false,
        stayedDays: 10,
        settlementType: 'current_rate_final',
        settledMealRate: 60,
      },
    ];

    const mealRecords = [
      { userId: 'm_only', date: '2026-10-05', slotId: 'all', weight: 20, consumed: 1 },
    ];

    const res = calculateBilling({
      members,
      mealRecords,
      bazarItems: [{ id: 'b1', userId: 'm_only', amount: 1200, type: 'regular', isApproved: true }],
      utilityBills: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      deposits: [],
      fixedEvents: [],
    });

    expect(Number.isFinite(res.mealRate)).toBe(true);
    expect(Number.isFinite(res.remainingMealRate ?? 0)).toBe(true);
    expect(res.remainingMealRate).not.toBeNaN();
  });
});
