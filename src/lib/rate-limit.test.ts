import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkSuperAdminRateLimit,
  recordSuperAdminFailedAttempt,
  resetSuperAdminRateLimit,
  MAX_SUPERADMIN_FAILED_ATTEMPTS,
  SUPERADMIN_BLOCK_DURATION_MS,
} from './rate-limit';

describe('Super Admin Login Rate Limiting (SRS & Security Guard)', () => {
  beforeEach(() => {
    resetSuperAdminRateLimit();
  });

  it('allows initial login attempt with 0 attempts', () => {
    const status = checkSuperAdminRateLimit('admin_test');
    expect(status.allowed).toBe(true);
    expect(status.attempts).toBe(0);
  });

  it('tracks consecutive failed attempts up to 4 without blocking', () => {
    const user = 'hacker_user';
    for (let i = 1; i <= 4; i++) {
      const res = recordSuperAdminFailedAttempt(user);
      expect(res.blocked).toBe(false);
      expect(res.attempts).toBe(i);

      const check = checkSuperAdminRateLimit(user);
      expect(check.allowed).toBe(true);
      expect(check.attempts).toBe(i);
    }
  });

  it('blocks for 15 minutes on the 5th failed attempt', () => {
    const user = 'target_admin';

    // 1-4 failed attempts
    for (let i = 1; i <= 4; i++) {
      recordSuperAdminFailedAttempt(user);
    }

    // 5th failed attempt triggers block
    const fifth = recordSuperAdminFailedAttempt(user);
    expect(fifth.blocked).toBe(true);
    expect(fifth.attempts).toBe(5);
    expect(fifth.remainingMinutes).toBe(15);

    // Any subsequent check is rejected
    const check = checkSuperAdminRateLimit(user);
    expect(check.allowed).toBe(false);
    expect(check.remainingMinutes).toBeGreaterThanOrEqual(14);
    expect(check.attempts).toBe(5);
  });

  it('clears attempts when login is successful', () => {
    const user = 'legit_admin';
    recordSuperAdminFailedAttempt(user);
    recordSuperAdminFailedAttempt(user);
    expect(checkSuperAdminRateLimit(user).attempts).toBe(2);

    resetSuperAdminRateLimit(user);
    expect(checkSuperAdminRateLimit(user).allowed).toBe(true);
    expect(checkSuperAdminRateLimit(user).attempts).toBe(0);
  });

  it('unblocks automatically after 15 minutes have elapsed', () => {
    const user = 'time_traveler';
    for (let i = 1; i <= 5; i++) {
      recordSuperAdminFailedAttempt(user);
    }
    expect(checkSuperAdminRateLimit(user).allowed).toBe(false);

    // Mock Date.now to 16 minutes in the future
    const originalNow = Date.now;
    try {
      Date.now = () => originalNow() + SUPERADMIN_BLOCK_DURATION_MS + 1000;
      const statusAfterExpiry = checkSuperAdminRateLimit(user);
      expect(statusAfterExpiry.allowed).toBe(true);
      expect(statusAfterExpiry.attempts).toBe(0);
    } finally {
      Date.now = originalNow;
    }
  });
});
