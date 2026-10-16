/**
 * Rate Limiter for Super Admin authentication
 * Enforces: 5 failed attempts blocks login for 15 minutes.
 */

interface RateLimitState {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const superAdminAttempts = new Map<string, RateLimitState>();

export const MAX_SUPERADMIN_FAILED_ATTEMPTS = 5;
export const SUPERADMIN_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const SUPERADMIN_WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkSuperAdminRateLimit(identifier: string = 'superadmin'): {
  allowed: boolean;
  remainingMinutes?: number;
  remainingSeconds?: number;
  attempts: number;
} {
  const key = identifier.toLowerCase().trim();
  const record = superAdminAttempts.get(key);
  const now = Date.now();

  if (!record) {
    return { allowed: true, attempts: 0 };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingMs = record.blockedUntil - now;
    return {
      allowed: false,
      remainingMinutes: Math.max(1, Math.ceil(remainingMs / (60 * 1000))),
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      attempts: record.attempts,
    };
  }

  // Check if block or window has expired
  if (record.blockedUntil && record.blockedUntil <= now) {
    superAdminAttempts.delete(key);
    return { allowed: true, attempts: 0 };
  }

  if (now - record.firstAttemptAt > SUPERADMIN_WINDOW_DURATION_MS) {
    superAdminAttempts.delete(key);
    return { allowed: true, attempts: 0 };
  }

  return { allowed: true, attempts: record.attempts };
}

export function recordSuperAdminFailedAttempt(identifier: string = 'superadmin'): {
  blocked: boolean;
  attempts: number;
  remainingMinutes?: number;
} {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  let record = superAdminAttempts.get(key);

  if (!record || (record.blockedUntil && record.blockedUntil <= now) || (now - record.firstAttemptAt > SUPERADMIN_WINDOW_DURATION_MS)) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_SUPERADMIN_FAILED_ATTEMPTS) {
    record.blockedUntil = now + SUPERADMIN_BLOCK_DURATION_MS;
    superAdminAttempts.set(key, record);
    return {
      blocked: true,
      attempts: record.attempts,
      remainingMinutes: 15,
    };
  }

  superAdminAttempts.set(key, record);
  return {
    blocked: false,
    attempts: record.attempts,
  };
}

export function resetSuperAdminRateLimit(identifier?: string) {
  if (identifier) {
    superAdminAttempts.delete(identifier.toLowerCase().trim());
  } else {
    superAdminAttempts.clear();
  }
}
