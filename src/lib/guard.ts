import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { getDb, safeObjectId } from '@/lib/db';

export interface GuardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'pending' | 'inactive' | 'rejected';
  isSuperAdmin: boolean;
}

export type GuardResult =
  | { authorized: true; user: GuardUser; response?: never }
  | { authorized: false; response: NextResponse; user?: never };

/**
 * 1. requireUser(): Verifies authenticated session.
 * Always resolves userId and role from session, never from request body/query.
 * Returns 401 Unauthorized if no active session.
 */
export async function requireUser(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'অননুমোদিত অ্যাক্সেস (401 Unauthorized)। অনুগ্রহ করে লগইন করুন।',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 }
      ),
    };
  }

  const sessionUser = session.user as any;
  const isSuper =
    sessionUser.role === 'super_admin' ||
    Boolean(sessionUser.isSuperAdmin);

  const role: UserRole = isSuper
    ? 'super_admin'
    : (sessionUser.role || 'member');

  const status =
    role === 'super_admin'
      ? 'active'
      : (sessionUser.status || 'active');

  const user: GuardUser = {
    id: String(sessionUser.id || sessionUser._id || session.user.email || 'user'),
    name: session.user.name || (isSuper ? 'সুপার অ্যাডমিন' : 'সদস্য'),
    email: session.user.email || '',
    role,
    status: status as any,
    isSuperAdmin: isSuper,
  };

  return {
    authorized: true,
    user,
  };
}

/**
 * 2. requireRole(): Verifies that authenticated user has one of the required roles.
 * Returns 401 if unauthenticated, 403 Forbidden if role does not match.
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<GuardResult> {
  const auth = await requireUser();
  if (!auth.authorized) {
    return auth;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(auth.user.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'অ্যাক্সেস অস্বীকৃত (403 Forbidden)। এই কার্যক্রম পরিচালনার অনুমতি শুধুমাত্র নির্দিষ্ট ভূমিকার জন্য সংরক্ষিত।',
          code: 'FORBIDDEN_ROLE',
          requiredRoles: roles,
          currentRole: auth.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: auth.user,
  };
}

/**
 * 3. requireActiveMember(): Verifies user is logged in and is an active member.
 * Super Admin and Mess Manager are always considered active.
 * For regular members, pending/inactive/rejected accounts receive 403 Forbidden.
 */
export async function requireActiveMember(): Promise<GuardResult> {
  const auth = await requireUser();
  if (!auth.authorized) {
    return auth;
  }

  const { user } = auth;

  // Super Admin & Manager are active by definition
  if (user.role === 'super_admin' || user.role === 'admin') {
    return { authorized: true, user };
  }

  // Check explicit status in session
  if (user.status && user.status !== 'active') {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'আপনার মেম্বারশিপ অ্যাকাউন্ট এখনও সক্রিয় নয়। মেস ম্যানেজারের অনুমোদনের অপেক্ষা করুন।',
          code: 'ACCOUNT_NOT_ACTIVE',
          status: user.status,
        },
        { status: 403 }
      ),
    };
  }

  // If status not on session, check database membership status if connected
  try {
    const db = await getDb();
    if (db) {
      const oid = safeObjectId(user.id);
      const membership = await db.collection('memberships').findOne({
        $or: [
          { userId: user.id },
          ...(oid ? [{ userId: oid }] : []),
        ],
      });

      if (membership && membership.status && membership.status !== 'active') {
        return {
          authorized: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'আপনার মেম্বারশিপ অ্যাকাউন্ট এখনও সক্রিয় নয়। মেস ম্যানেজারের অনুমোদনের অপেক্ষা করুন।',
              code: 'ACCOUNT_NOT_ACTIVE',
              status: membership.status,
            },
            { status: 403 }
          ),
        };
      }
    }
  } catch (err) {
    // Non-fatal DB lookup error
  }

  return { authorized: true, user };
}

/**
 * Helper: checks if the caller can mutate data for targetUserId.
 * Managers and Super Admins can mutate anyone.
 * Regular members can ONLY mutate their own userId.
 */
export function canManageOrSelf(currentUser: GuardUser, targetUserId?: string | null): boolean {
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return true;
  }
  if (!targetUserId) return false;
  return (
    String(targetUserId) === String(currentUser.id) ||
    String(targetUserId) === String(currentUser.email)
  );
}

/**
 * Helper: returns 403 NextResponse if caller is a regular member attempting to mutate another user's data.
 */
export function assertCanManageOrSelf(
  currentUser: GuardUser,
  targetUserId?: string | null,
  customMessage?: string
): NextResponse | null {
  if (!canManageOrSelf(currentUser, targetUserId)) {
    return NextResponse.json(
      {
        success: false,
        error: customMessage || 'অন্য সদস্যের তথ্য পরিবর্তন করার অনুমতি আপনার নেই (403 Forbidden)।',
        code: 'FORBIDDEN_TARGET_USER',
      },
      { status: 403 }
    );
  }
  return null;
}
