import {
  BazarItemInput,
  BillingEngineInput,
  BillingEngineOutput,
  MemberBillingResult,
} from './types';

/**
 * Pure Billing Engine function
 * Computes meal rates, dues, credits, and net balances according to SRS Section 5.
 * Strictly pure with no DB or side-effects.
 */
export function calculateBilling(input: BillingEngineInput): BillingEngineOutput {
  const {
    members,
    mealRecords,
    fixedEvents,
    bazarItems,
    deposits,
    utilityBills,
    bigBazarConfig,
    options = { roundToInteger: true },
  } = input;

  const activeMembers = members.filter((m) => m.isActive);
  const activeCount = activeMembers.length || 1;

  // 1. Calculate Bazar pool components
  const approvedBazars = bazarItems.filter((b) => b.isApproved);

  const regularBazarTotal = approvedBazars
    .filter((b) => b.type === 'regular')
    .reduce((sum, b) => sum + b.amount, 0);

  const extraBazarPoolTotal = approvedBazars
    .filter((b) => b.type === 'extra' && (b.splitType === 'meal_pool' || !b.splitType))
    .reduce((sum, b) => sum + b.amount, 0);

  const bigBazarTotalCost = bigBazarConfig.isEnabled
    ? approvedBazars.filter((b) => b.type === 'big').reduce((sum, b) => sum + b.amount, 0)
    : 0;

  const carryOver = bigBazarConfig.isEnabled ? (bigBazarConfig.leftoverValueCarry || 0) : 0;
  const bigBazarUsedInPool = Math.max(0, bigBazarTotalCost - carryOver);

  const mealPoolTotal = regularBazarTotal + extraBazarPoolTotal + bigBazarUsedInPool;

  // 2. Calculate Meal Units per member
  // Base meals consumed
  const memberMealUnitsMap = new Map<string, number>();
  members.forEach((m) => memberMealUnitsMap.set(m.userId, 0));

  for (const record of mealRecords) {
    if (record.consumed && memberMealUnitsMap.has(record.userId)) {
      const current = memberMealUnitsMap.get(record.userId) || 0;
      const count = typeof (record as any).consumed === 'number' ? (record as any).consumed : (record.consumed ? 1 : 0);
      memberMealUnitsMap.set(record.userId, current + record.weight * count);
    }
  }

  // Add extra meal weight from attended fixed events (default 0.5 unless explicitly specified)
  for (const event of fixedEvents) {
    const extraWeight =
      event.extraMealWeight !== undefined && event.extraMealWeight !== null
        ? event.extraMealWeight
        : 0.5;
    if (extraWeight > 0) {
      for (const attendeeId of event.attendeeUserIds) {
        if (memberMealUnitsMap.has(attendeeId)) {
          const current = memberMealUnitsMap.get(attendeeId) || 0;
          memberMealUnitsMap.set(attendeeId, current + extraWeight);
        }
      }
    }
  }

  // Calculate total meal units among active members
  let totalMealUnits = 0;
  for (const m of activeMembers) {
    totalMealUnits += memberMealUnitsMap.get(m.userId) || 0;
  }

  // 3. Meal Rate (Section 5.2)
  const rawMealRate = totalMealUnits > 0 ? mealPoolTotal / totalMealUnits : 0;
  const mealRate = Math.round(rawMealRate * 100) / 100; // 2 decimal places

  // 4. Utility bills (distributed according to applicableUserIds / headcount / non-exempt active members)
  const totalUtility = utilityBills.reduce((sum, u) => sum + u.amount, 0);
  const memberUtilityShareMap = new Map<string, number>();
  members.forEach((m) => memberUtilityShareMap.set(m.userId, 0));

  for (const bill of utilityBills) {
    if (!bill.amount || bill.amount <= 0) continue;

    const isSpecific = bill.applicableUserIds && bill.applicableUserIds.length > 0;
    const targetMembers = isSpecific
      ? activeMembers.filter((m) => bill.applicableUserIds!.includes(m.userId))
      : activeMembers;

    // Apply utility exemption (m.isUtilityExempt)
    const nonExemptTargets = targetMembers.filter((m) => !m.isUtilityExempt);

    const divisor =
      bill.applicableCount && bill.applicableCount > 0
        ? bill.applicableCount
        : nonExemptTargets.length;

    if (divisor > 0 && nonExemptTargets.length > 0) {
      const perMember = bill.amount / divisor;
      for (const m of nonExemptTargets) {
        if (memberUtilityShareMap.has(m.userId)) {
          const current = memberUtilityShareMap.get(m.userId) || 0;
          memberUtilityShareMap.set(m.userId, current + perMember);
        }
      }
    }
  }

  // 5. Fixed Bazar shares
  const memberFixedShareMap = new Map<string, number>();
  members.forEach((m) => memberFixedShareMap.set(m.userId, 0));

  for (const event of fixedEvents) {
    const attendeesCount = event.attendeeUserIds.length;
    if (attendeesCount > 0 && event.cost > 0) {
      const perAttendeeCost = event.cost / attendeesCount;
      for (const attendeeId of event.attendeeUserIds) {
        if (memberFixedShareMap.has(attendeeId)) {
          const current = memberFixedShareMap.get(attendeeId) || 0;
          memberFixedShareMap.set(attendeeId, current + perAttendeeCost);
        }
      }
    }
  }

  // 6. Extra Bazar Non-Pool shares
  const memberExtraNonPoolMap = new Map<string, number>();
  members.forEach((m) => memberExtraNonPoolMap.set(m.userId, 0));

  const extraNonPoolBazars = approvedBazars.filter(
    (b) => b.type === 'extra' && b.splitType && b.splitType !== 'meal_pool'
  );

  for (const item of extraNonPoolBazars) {
    if (item.splitType === 'all_equal') {
      const perMember = item.amount / activeCount;
      for (const m of activeMembers) {
        const current = memberExtraNonPoolMap.get(m.userId) || 0;
        memberExtraNonPoolMap.set(m.userId, current + perMember);
      }
    } else if (item.splitType === 'custom_members' && item.customMemberIds?.length) {
      const perMember = item.amount / item.customMemberIds.length;
      for (const uid of item.customMemberIds) {
        if (memberExtraNonPoolMap.has(uid)) {
          const current = memberExtraNonPoolMap.get(uid) || 0;
          memberExtraNonPoolMap.set(uid, current + perMember);
        }
      }
    }
  }

  // 7. Credits: deposits & approved personal bazar spending (strictly member-attributed per SRS)
  const memberDepositsMap = new Map<string, { general: number; bigBazar: number }>();
  members.forEach((m) => memberDepositsMap.set(m.userId, { general: 0, bigBazar: 0 }));

  for (const dep of deposits) {
    if (dep.isPaid && memberDepositsMap.has(dep.userId)) {
      const entry = memberDepositsMap.get(dep.userId)!;
      if (dep.type === 'big_bazar') {
        entry.bigBazar += dep.amount;
      } else {
        entry.general += dep.amount;
      }
    }
  }

  const memberApprovedBazarSpendingMap = new Map<string, number>();
  members.forEach((m) => memberApprovedBazarSpendingMap.set(m.userId, 0));

  for (const item of approvedBazars) {
    // If it's not paid from big bazar fund, it counts as personal out-of-pocket spending
    if (!item.paidFromBigBazarFund && memberApprovedBazarSpendingMap.has(item.userId)) {
      const current = memberApprovedBazarSpendingMap.get(item.userId) || 0;
      memberApprovedBazarSpendingMap.set(item.userId, current + item.amount);
    }
  }

  // 8. Compile per-member results
  const memberResults: Record<string, MemberBillingResult> = {};
  const allMembersSummary: MemberBillingResult[] = [];

  let sumRawDues = 0;
  let sumRoundedDues = 0;
  let sumCredits = 0;

  for (const member of members) {
    const units = memberMealUnitsMap.get(member.userId) || 0;
    const rawMealCost = units * mealRate;
    const fixedShare = memberFixedShareMap.get(member.userId) || 0;
    const utilShare = (member.isActive && !member.isUtilityExempt) ? (memberUtilityShareMap.get(member.userId) || 0) : 0;
    const extraNonPool = memberExtraNonPoolMap.get(member.userId) || 0;
    const rent = member.roomRent || 0;

    const rawTotalDues = rent + utilShare + rawMealCost + fixedShare + extraNonPool;

    const dep = memberDepositsMap.get(member.userId) || { general: 0, bigBazar: 0 };
    const bazarSpent = memberApprovedBazarSpendingMap.get(member.userId) || 0;
    const openingCredit = member.openingCarryCredit || 0;

    const totalCredits = dep.general + dep.bigBazar + bazarSpent + openingCredit;

    const finalMealCost = options.roundToInteger ? Math.round(rawMealCost) : Number(rawMealCost.toFixed(2));
    const finalFixedShare = options.roundToInteger ? Math.round(fixedShare) : Number(fixedShare.toFixed(2));
    const finalUtilShare = options.roundToInteger ? Math.round(utilShare) : Number(utilShare.toFixed(2));
    const finalExtraNonPool = options.roundToInteger ? Math.round(extraNonPool) : Number(extraNonPool.toFixed(2));

    const computedDues = options.roundToInteger
      ? rent + finalUtilShare + finalMealCost + finalFixedShare + finalExtraNonPool
      : Number(rawTotalDues.toFixed(2));

    const netBalance = totalCredits - computedDues;

    sumRawDues += rawTotalDues;
    sumRoundedDues += computedDues;
    sumCredits += totalCredits;

    const res: MemberBillingResult = {
      userId: member.userId,
      name: member.name,
      isActive: member.isActive,
      isUtilityExempt: member.isUtilityExempt ?? false,
      mealUnits: units,
      regularMealCost: finalMealCost,
      fixedShare: finalFixedShare,
      utilityShare: finalUtilShare,
      roomRent: rent,
      extraShareNonPool: finalExtraNonPool,
      totalDues: computedDues,
      generalDeposits: dep.general,
      bigBazarDeposits: dep.bigBazar,
      approvedBazarSpentOwnMoney: bazarSpent,
      openingCarryCredit: openingCredit,
      totalCredits,
      netBalance,
    };

    memberResults[member.userId] = res;
    allMembersSummary.push(res);
  }

  const roundingDifference = Number((sumRoundedDues - sumRawDues).toFixed(2));

  return {
    mealPoolTotal,
    totalRegularBazar: regularBazarTotal,
    totalExtraBazarPool: extraBazarPoolTotal,
    totalBigBazarCost: bigBazarTotalCost,
    bigBazarCarryToNextCycle: carryOver,
    totalMealUnits,
    mealRate,
    rawMealRate,
    totalUtility,
    memberResults,
    allMembersSummary,
    totals: {
      totalDues: sumRoundedDues,
      totalCredits: sumCredits,
      netBalance: sumCredits - sumRoundedDues,
      roundingDifference,
    },
  };
}

/**
 * Calculates per person cost for a fixed event (Pure Engine function)
 * Avoids ad-hoc UI or API division and arbitrary Math.round
 */
export function calculateFixedEventPerPerson(cost: number, attendeeCount: number): number {
  if (!cost || cost <= 0 || !attendeeCount || attendeeCount <= 0) return 0;
  return Math.round((cost / attendeeCount) * 100) / 100;
}

/**
 * Calculates per person cost for a utility bill based on applicable members and exemptions (Pure Engine function)
 * Avoids ad-hoc UI or API division and arbitrary Math.round
 */
export function calculateUtilityBillPerPerson(
  bill: { amount: number; applicableUserIds?: string[]; applicableCount?: number | null },
  members: Array<{ userId?: string; _id?: string; id?: string; isActive?: boolean; isUtilityExempt?: boolean }>
): number {
  if (!bill.amount || bill.amount <= 0) return 0;
  if (bill.applicableCount && bill.applicableCount > 0) {
    return Math.round((bill.amount / bill.applicableCount) * 100) / 100;
  }
  const getUid = (m: any) => String(m.userId || m._id || m.id || '');
  const active = members.filter((m) => m.isActive !== false);
  const isSpecific = bill.applicableUserIds && bill.applicableUserIds.length > 0;
  const targets = isSpecific
    ? active.filter((m) => bill.applicableUserIds!.includes(getUid(m)))
    : active;
  const nonExempt = targets.filter((m) => !m.isUtilityExempt);
  if (nonExempt.length === 0) return 0;
  return Math.round((bill.amount / nonExempt.length) * 100) / 100;
}


