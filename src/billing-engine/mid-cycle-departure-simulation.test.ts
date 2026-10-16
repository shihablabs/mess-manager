import { describe, expect, it } from 'vitest';
import { calculateBilling } from './index';
import { BillingEngineInput } from './types';

describe('Investigation 2: Mid-Cycle Departure Reconciliation Simulation (SRS Section 5)', () => {
  // Scenario setup:
  // - 6 members
  // - Cycle: 30 days (2026-10-01 to 2026-10-30)
  // - Member 1 leaves on day 15 (stayedDays: 15, ratio: 0.5)
  // - Member 1 consumed 30 meal units
  // - Members 2..6 stay full 30 days, consumed 54 units each (total 270 units)
  // - Total units = 30 + 270 = 300 units
  // - Mess spends 24,000 Tk on meals -> whole pool average rate = 24,000 / 300 = 80 Tk
  // - Total utility bill = 6,000 Tk (shared among 6 members)

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

  it('evaluates current engine behavior under Option 1 (current_rate_final at 50 Tk)', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'user_1',
        name: 'সদস্য ১ (মাঝপথে ছাড়া)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'current_rate_final',
        settledMealRate: 50.0, // locked early when rate was 50
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
      // user_2 to user_6 consumed 54 units each
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

    // (ক) ছাড়া সদস্যের মিল খরচ = তার ইউনিট × ৫০ = 30 × 50 = 1500 Tk
    const member1 = result.memberResults['user_1'];
    expect(member1.regularMealCost).toBe(1500);

    // (খ) বর্তমান ইঞ্জিনে বাকিদের মিল রেট:
    // মেসের মোট পুল রেট = 24,000 / 300 = 80 Tk
    // বর্তমান ইঞ্জিনে বাকি সদস্যরা 80 Tk রেটে দিচ্ছে
    const remainingMember = result.memberResults['user_2'];
    expect(remainingMember.regularMealCost).toBe(54 * 80); // 4320 Tk

    // (গ) সব সদস্যের মোট দেনা বিশ্লেষণ:
    // মেসের মোট অপারেশনাল খরচ = মিল পুল (২৪,০০০) + ইউটিলিটি বিল (৬,০০০) = ৩০,০০০ টাকা
    // সদস্যদের কাছ থেকে মোট অপারেশনাল দেনা আদায়:
    // মিল: ২৩,১০০ টাকা (ঘাটতি ৯০০ টাকা)
    // ইউটিলিটি: ৫,৫০০ টাকা (ঘাটতি ৫০০ টাকা)
    // মোট আদায় = ২৮,৬০০ টাকা (মোট ঘাটতি = ১,৪০০ টাকা)
    // রুম ভাড়া (মালিকের পাওনা): ১,৫০০ + ১৫,০০০ = ১৬,৫০০ টাকা
    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    const totalCollectedUtility =
      result.allMembersSummary.reduce((sum, m) => sum + m.utilityShare, 0);
    const totalRoomRent = result.allMembersSummary.reduce((sum, m) => sum + m.roomRent, 0);
    const totalMemberDues = result.allMembersSummary.reduce((sum, m) => sum + m.totalDues, 0);

    expect(totalCollectedMeal).toBe(23100);
    expect(result.mealPoolTotal - totalCollectedMeal).toBe(900);
    expect(totalRoomRent).toBe(16500);
    expect(totalMemberDues).toBe(16500 + 23100 + 5500); // 45,100 Tk
    expect((result.mealPoolTotal + result.totalUtility) - (totalCollectedMeal + totalCollectedUtility)).toBe(1400);

    // (ঘ) ইউটিলিটি pro-rata আদায়ের ঘাটতি বিশ্লেষণ:
    // মোট ইউটিলিটি বিল = 6,000 Tk
    // বেস শেয়ার = 6,000 / 6 = 1,000 Tk
    // ছাড়া সদস্য (15/30 = 0.5) দিল: 500 Tk
    // বাকি ৫ জন (pro-rata 1.0) দিল: 1,000 Tk করে = 5,000 Tk
    // ছাড়া সদস্যের কমে যাওয়া 500 Tk বাকিদের ভাগে যায়নি!
    // মোট ইউটিলিটি আদায় = 500 + 5,000 = 5,500 Tk (ঘাটতি 500 Tk)
    expect(totalCollectedUtility).toBe(5500);
    const utilityDeficit = result.totalUtility - totalCollectedUtility;
    expect(utilityDeficit).toBe(500);
  });

  it('evaluates current engine behavior under Option 2 (cycle_end_adjustment at floating rate 80 Tk)', () => {
    const members: BillingEngineInput['members'] = [
      {
        userId: 'user_1',
        name: 'সদস্য ১ (মাঝপথে ছাড়া - চক্র শেষে সমন্বয়)',
        roomRent: 3000,
        isActive: false,
        stayedDays: 15,
        settlementType: 'cycle_end_adjustment',
        // No settledMealRate locked
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

    // (ঙ) cycle_end_adjustment-এ সকল সদস্যই ভাসমান ৮0 টাকা রেট পায়:
    // ছাড়া সদস্যের মিল খরচ = 30 × 80 = 2,400 Tk
    // বাকিদের মিল খরচ = 54 × 80 = 4,320 Tk
    // মোট মিল আদায় = 2,400 + (5 × 4,320) = 24,000 Tk = মেসের মোট মিল খরচ!
    const member1 = result.memberResults['user_1'];
    expect(member1.regularMealCost).toBe(2400);

    const totalCollectedMeal =
      result.allMembersSummary.reduce((sum, m) => sum + m.regularMealCost, 0);
    expect(totalCollectedMeal).toBe(24000);
    // শূন্য ঘাটতি
    expect(result.mealPoolTotal - totalCollectedMeal).toBe(0);
  });
});
