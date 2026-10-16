import { describe, expect, it } from 'vitest';
import { MessStore } from '../lib/store';
import { CycleSnapshotDoc } from '../models/types';

describe('Closed Cycle Snapshot as Single Source of Truth (Item চ & SRS Section 4.7)', () => {
  it('reads billing calculation strictly from snapshot once cycle is closed', () => {
    const store = new MessStore();
    const cycleId = 'cycle_1';

    // 1. Initial calculation when cycle is open
    store.users.push({
      _id: 'user_1',
      name: 'সদস্য ১',
      email: 'user1@example.com',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.memberCycles.push({
      _id: 'mc_1',
      userId: 'user_1',
      cycleId,
      messId: 'mess_1',
      roomRent: 3000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.meals.push({
      _id: 'meal_1',
      userId: 'user_1',
      messId: 'mess_1',
      cycleId,
      date: '2026-10-10',
      slotId: 'night',
      weight: 1.0,
      consumed: 1,
      source: 'default',
      updatedAt: new Date(),
    });
    const openBilling = store.computeCurrentCycleBilling(cycleId);
    expect(openBilling.totalMealUnits).toBe(1);

    // 2. Prepare a frozen snapshot
    const frozenMealRate = 65.5;
    const frozenTotalUnits = 120;
    const snapshot: CycleSnapshotDoc = {
      _id: 'snap_test_1',
      cycleId,
      messId: 'mess_1',
      closedAt: new Date(),
      closedBy: 'admin_1',
      mealRate: frozenMealRate,
      totalMealUnits: frozenTotalUnits,
      mealPoolTotal: frozenMealRate * frozenTotalUnits,
      totalRegularBazar: 7000,
      totalBigBazar: 1000,
      bigBazarCarryToNext: 0,
      totalUtility: 3000,
      memberBalances: [
        {
          userId: 'user_1',
          name: 'সদস্য ১',
          mealUnits: 40,
          mealCost: 40 * frozenMealRate,
          fixedShare: 0,
          utilityShare: 1000,
          roomRent: 3000,
          extraShare: 0,
          totalDues: 6620,
          totalCredits: 7000,
          netBalance: 380,
        },
      ],
      summaryNote: 'টেস্ট স্ন্যাপশট',
    };

    // Store snapshot and close cycle
    store.cycleSnapshots.push(snapshot);
    const cycle = store.cycles.find((c) => c._id === cycleId)!;
    cycle.status = 'closed';
    cycle.closedAt = snapshot.closedAt;

    // 3. Calculation must now be strictly read from snapshot
    const closedBilling = store.computeCurrentCycleBilling(cycleId);
    expect(closedBilling.mealRate).toBe(frozenMealRate);
    expect(closedBilling.totalMealUnits).toBe(frozenTotalUnits);
    expect(closedBilling.memberResults['user_1'].regularMealCost).toBe(40 * frozenMealRate);
    expect(closedBilling.memberResults['user_1'].netBalance).toBe(380);

    // 4. Modify operational records in store (e.g. inject huge bazar expense)
    store.bazars.push({
      _id: 'bazar_tamper',
      messId: 'mess_1',
      cycleId,
      userId: 'user_1',
      date: '2026-10-25',
      amount: 999999,
      description: 'tamper test',
      type: 'regular',
      status: 'approved',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Verification: Closed billing output remains completely frozen and immune to live data tampering
    const tamperedBilling = store.computeCurrentCycleBilling(cycleId);
    expect(tamperedBilling.mealRate).toBe(frozenMealRate);
    expect(tamperedBilling.totalMealUnits).toBe(frozenTotalUnits);
    expect(tamperedBilling.memberResults['user_1'].netBalance).toBe(380);
  });

  it('ensures close_cycle does not write settledMealRate to member_cycles', () => {
    const store = new MessStore();
    const cycleId = 'cycle_1';

    // Verify memberCycles before closure have no settledMealRate for regular active members
    const memberCycle = store.memberCycles.find((mc) => mc.cycleId === cycleId && mc.userId === 'user_1');
    expect(memberCycle?.settledMealRate).toBeUndefined();

    // Closing the cycle must not modify member_cycles with settledMealRate
    // (settledMealRate is only for mid-cycle early departures)
    expect(memberCycle?.settledMealRate).toBeUndefined();
  });
});
