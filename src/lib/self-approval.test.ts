import { describe, expect, it } from 'vitest';
import { checkSelfApproval } from './self-approval';

describe('Self-Approval Prohibition (Task গ & SRS Anti-Fraud)', () => {
  it('forbids self-approval of deposits with Bengali error message', () => {
    const result = checkSelfApproval('manager_1', 'manager_1', 'deposit');
    expect(result.forbidden).toBe(true);
    expect(result.message).toBe('নিজের জমার আবেদন নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।');
  });

  it('allows approval of deposits when approver is a different user', () => {
    const result = checkSelfApproval('member_1', 'manager_1', 'deposit');
    expect(result.forbidden).toBe(false);
    expect(result.message).toBe('');
  });

  it('forbids self-approval of bazar entries with Bengali error message', () => {
    const result = checkSelfApproval('manager_1', 'manager_1', 'bazar');
    expect(result.forbidden).toBe(true);
    expect(result.message).toBe('নিজের বাজার এন্ট্রি নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।');
  });

  it('allows approval of bazar entries by another manager', () => {
    const result = checkSelfApproval('manager_1', 'manager_2', 'bazar');
    expect(result.forbidden).toBe(false);
  });

  it('forbids self-approval of meal requests with Bengali error message', () => {
    const result = checkSelfApproval('user_123', 'user_123', 'meal_request');
    expect(result.forbidden).toBe(true);
    expect(result.message).toBe('নিজের মিল পরিবর্তনের আবেদন নিজে অনুমোদন করা যাবে না। অন্য কোনো ম্যানেজার বা এডমিনের অনুমোদন প্রয়োজন।');
  });

  it('allows approval of meal requests by another manager', () => {
    const result = checkSelfApproval('user_123', 'manager_1', 'meal_request');
    expect(result.forbidden).toBe(false);
  });

  it('forbids requester from accepting their own slot duty swap request', () => {
    const result = checkSelfApproval('member_a', 'member_a', 'slot_swap');
    expect(result.forbidden).toBe(true);
    expect(result.message).toBe('নিজের বাজার ডিউটি সোয়াপের আবেদন নিজে অনুমোদন বা গ্রহণ করা যাবে না।');
  });

  it('allows recipient peer or another manager to accept slot swap request', () => {
    const result = checkSelfApproval('member_a', 'member_b', 'slot_swap');
    expect(result.forbidden).toBe(false);
  });
});
