import { describe, it, expect } from 'vitest';
import { calculateBilling } from './index';
import { BillingEngineInput } from './types';

describe('Consecutive Cycles Balance Continuity (Decision ৫)', () => {
  it('correctly persists closingBalance in Cycle 1 and applies as openingBalance in Cycle 2', () => {
    // --- CYCLE 1 ---
    const cycle1Input: BillingEngineInput = {
      members: [
        { userId: 'uA', name: 'সদস্য ক', roomRent: 3000, isActive: true },
        { userId: 'uB', name: 'সদস্য খ', roomRent: 3000, isActive: true },
      ],
      mealRecords: [
        { userId: 'uA', date: '2026-10-01', slotId: 'night', weight: 1.0, consumed: 30 },
        { userId: 'uB', date: '2026-10-01', slotId: 'night', weight: 1.0, consumed: 30 },
      ],
      bazarItems: [
        { id: 'b1', userId: 'uA', amount: 3000, type: 'regular', isApproved: true },
      ],
      deposits: [
        { userId: 'uA', amount: 6000, type: 'general', isPaid: true }, // Overpaid
        { userId: 'uB', amount: 2000, type: 'general', isPaid: true }, // Underpaid
      ],
      utilityBills: [],
      fixedEvents: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    };

    const cycle1Result = calculateBilling(cycle1Input);
    const uA_c1 = cycle1Result.memberResults['uA'];
    const uB_c1 = cycle1Result.memberResults['uB'];

    // Meal: 3000 Tk / 60 units = 50 Tk/unit. Each eats 30 units = 1500 Tk.
    // Total Dues: 3000 rent + 1500 meal = 4500 Tk each.
    expect(uA_c1.totalDues).toBe(4500);
    expect(uB_c1.totalDues).toBe(4500);

    // Credits: uA = 6000 deposit + 3000 own bazar spent = 9000 Tk
    // uB = 2000 deposit = 2000 Tk
    expect(uA_c1.totalCredits).toBe(9000);
    expect(uB_c1.totalCredits).toBe(2000);

    // Closing Balance:
    // uA: 9000 - 4500 = +4500 Tk (Credit / Refund)
    // uB: 2000 - 4500 = -2500 Tk (Due / দেনা)
    expect(uA_c1.netBalance).toBe(4500);
    expect(uA_c1.closingBalance).toBe(4500);
    expect(uB_c1.netBalance).toBe(-2500);
    expect(uB_c1.closingBalance).toBe(-2500);

    // --- CYCLE 2 (Carrying over Cycle 1 balances as openingBalance) ---
    // uA brings +4500 as openingBalance (positive -> credit)
    // uB brings -2500 as openingBalance (negative -> due)
    const cycle2Input: BillingEngineInput = {
      members: [
        {
          userId: 'uA',
          name: 'সদস্য ক',
          roomRent: 3000,
          isActive: true,
          openingBalance: uA_c1.closingBalance, // +4500
        },
        {
          userId: 'uB',
          name: 'সদস্য খ',
          roomRent: 3000,
          isActive: true,
          openingBalance: uB_c1.closingBalance, // -2500
        },
      ],
      mealRecords: [],
      bazarItems: [],
      deposits: [
        // Member B settles his previous dues by depositing 2500 Tk
        { userId: 'uB', amount: 2500, type: 'general', isPaid: true },
      ],
      utilityBills: [],
      fixedEvents: [],
      bigBazarConfig: { isEnabled: false, perMemberContribution: 0, leftoverValueCarry: 0 },
      options: { roundToInteger: true },
    };

    const cycle2Result = calculateBilling(cycle2Input);
    const uA_c2 = cycle2Result.memberResults['uA'];
    const uB_c2 = cycle2Result.memberResults['uB'];

    // Member A:
    // Opening balance +4500 added to credits
    // Total Credits = 4500 Tk
    // Total Dues = 3000 Tk (new cycle rent)
    // Net Balance = 4500 - 3000 = +1500 Tk (still has 1500 Tk advance)
    expect(uA_c2.totalCredits).toBe(4500);
    expect(uA_c2.totalDues).toBe(3000);
    expect(uA_c2.netBalance).toBe(1500);

    // Member B:
    // Opening balance -2500 added to dues (openingDueFromBal = 2500)
    // Total Dues = 3000 rent + 2500 previous due = 5500 Tk
    // Deposit made to clear due = 2500 Tk -> Total Credits = 2500 Tk
    // Net Balance = 2500 - 5500 = -3000 Tk (previous cycle debt is cleared, only current cycle rent remains!)
    expect(uB_c2.totalDues).toBe(5500);
    expect(uB_c2.totalCredits).toBe(2500);
    expect(uB_c2.netBalance).toBe(-3000);
  });
});
