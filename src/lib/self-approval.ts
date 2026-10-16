export type ApprovalEntityType = 'deposit' | 'bazar' | 'meal_request' | 'slot_swap';

export interface SelfApprovalCheckResult {
  forbidden: boolean;
  message: string;
}

/**
 * Validates that an entity cannot be approved by its own creator/requester.
 * (Item গ & SRS Section 9 Anti-Fraud Enforcement)
 */
export function checkSelfApproval(
  creatorId: string | undefined | null,
  approverId: string | undefined | null,
  entityType: ApprovalEntityType
): SelfApprovalCheckResult {
  if (!creatorId || !approverId) {
    return { forbidden: false, message: '' };
  }

  const isSelf = String(creatorId).trim() === String(approverId).trim();
  if (!isSelf) {
    return { forbidden: false, message: '' };
  }

  const messages: Record<ApprovalEntityType, string> = {
    deposit: 'নিজের জমার আবেদন নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।',
    bazar: 'নিজের বাজার এন্ট্রি নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।',
    meal_request: 'নিজের মিল পরিবর্তনের আবেদন নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।',
    slot_swap: 'নিজের বাজার ডিউটি সোয়াপের আবেদন নিজে অনুমোদন বা গ্রহণ করা যাবে না।',
  };

  return {
    forbidden: true,
    message: messages[entityType] || 'নিজের এন্ট্রি নিজে অনুমোদন করা নিষিদ্ধ।',
  };
}
