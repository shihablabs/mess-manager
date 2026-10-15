import { BillingEngineOutput, MemberBillingResult } from '@/billing-engine/types';

/**
 * Safely extract a member's billing calculation from BillingEngineOutput.
 * Handles Record<string, MemberBillingResult>, Array fallbacks, and nulls without throwing.
 */
export function getMemberBillingResultSafe(
  calculation: BillingEngineOutput | null | undefined,
  userId: string | null | undefined
): MemberBillingResult | null {
  if (!calculation || !userId) return null;

  try {
    // 1. Direct record lookup: memberResults[userId]
    if (calculation.memberResults && typeof calculation.memberResults === 'object') {
      const result = calculation.memberResults[userId];
      if (result) return result;
    }

    // 2. Fallback to allMembersSummary array lookup
    if (Array.isArray(calculation.allMembersSummary)) {
      const found = calculation.allMembersSummary.find((m) => m?.userId === userId);
      if (found) return found;
    }

    // 3. Fallback to Object.values if memberResults is an object
    if (calculation.memberResults && typeof calculation.memberResults === 'object') {
      const values = Object.values(calculation.memberResults);
      if (Array.isArray(values)) {
        const found = values.find((m: any) => m?.userId === userId);
        if (found) return found;
      }
    }
  } catch (err) {
    console.error('Error in getMemberBillingResultSafe:', err);
  }

  return null;
}

/**
 * Safely ensures value is an array before calling array methods.
 */
export function safeArray<T>(val: T[] | null | undefined): T[] {
  return Array.isArray(val) ? val : [];
}
