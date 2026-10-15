import { describe, expect, it } from 'vitest';
import { createAuditLogEntry } from './audit';

describe('Audit Logging System (Task 10 & SRS Section 9)', () => {
  it('correctly constructs audit log entry containing previousValue and newValue for bazar approval', () => {
    const entry = createAuditLogEntry({
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'admin_1',
      performedByUserName: 'Manager Shihab',
      action: 'APPROVE_BAZAR',
      targetCollection: 'bazars',
      targetId: 'b_123',
      previousValue: { status: 'pending', amount: 1500 },
      newValue: { status: 'approved', amount: 1500 },
    });

    expect(entry.messId).toBe('mess_1');
    expect(entry.action).toBe('APPROVE_BAZAR');
    expect(entry.targetCollection).toBe('bazars');
    expect(entry.targetId).toBe('b_123');
    expect(entry.previousValue).toEqual({ status: 'pending', amount: 1500 });
    expect(entry.newValue).toEqual({ status: 'approved', amount: 1500 });
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('handles creation events where previousValue is null (deposit create)', () => {
    const entry = createAuditLogEntry({
      messId: 'mess_1',
      performedByUserId: 'user_1',
      action: 'CREATE_DEPOSIT',
      targetCollection: 'deposits',
      targetId: 'dep_1',
      previousValue: null,
      newValue: { amount: 3000, type: 'general' },
    });

    expect(entry.previousValue).toBeNull();
    expect(entry.newValue).toEqual({ amount: 3000, type: 'general' });
  });

  it('handles deletion events where newValue is null (bill delete)', () => {
    const entry = createAuditLogEntry({
      messId: 'mess_1',
      performedByUserId: 'admin_1',
      action: 'DELETE_BILL',
      targetCollection: 'bills',
      targetId: 'bill_99',
      previousValue: { type: 'ইন্টারনেট', amount: 800 },
      newValue: null,
    });

    expect(entry.previousValue).toEqual({ type: 'ইন্টারনেট', amount: 800 });
    expect(entry.newValue).toBeNull();
  });

  it('records rent payment and room rent audit logs', () => {
    const markRentEntry = createAuditLogEntry({
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'admin_1',
      action: 'MARK_RENT_PAID',
      targetCollection: 'member_cycles',
      targetId: 'user_1',
      previousValue: { rentPaid: false, roomRent: 3500 },
      newValue: { rentPaid: true, roomRent: 3500, paymentMethod: 'bkash' },
    });
    expect(markRentEntry.previousValue).toEqual({ rentPaid: false, roomRent: 3500 });
    expect(markRentEntry.newValue).toEqual({ rentPaid: true, roomRent: 3500, paymentMethod: 'bkash' });

    const updateRentEntry = createAuditLogEntry({
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'admin_1',
      action: 'UPDATE_ROOM_RENT',
      targetCollection: 'member_cycles',
      targetId: 'user_1',
      previousValue: { roomRent: 3500 },
      newValue: { roomRent: 4000 },
    });
    expect(updateRentEntry.previousValue).toEqual({ roomRent: 3500 });
    expect(updateRentEntry.newValue).toEqual({ roomRent: 4000 });
  });

  it('records meal slot configuration audit logs', () => {
    const configEntry = createAuditLogEntry({
      messId: 'mess_1',
      performedByUserId: 'admin_1',
      action: 'UPDATE_MEAL_SLOTS_CONFIG',
      targetCollection: 'messes',
      targetId: 'mess_1',
      previousValue: {
        mealSlots: [
          { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
          { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
        ],
      },
      newValue: {
        mealSlots: [
          { id: 'morning', name: 'সকাল (ব্রেকফাস্ট)', weight: 0.5, cutoffTime: '23:00' },
          { id: 'night', name: 'রাতের খাবার', weight: 1.0, cutoffTime: '17:00' },
        ],
      },
    });
    expect(configEntry.previousValue?.mealSlots[0].cutoffTime).toBe('22:00');
    expect(configEntry.newValue?.mealSlots[0].cutoffTime).toBe('23:00');
  });

  it('records slot swap and slot generation audit logs', () => {
    const slotEntry = createAuditLogEntry({
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'user_1',
      action: 'ACCEPT_SLOT_SWAP',
      targetCollection: 'slot_requests',
      targetId: 'req_1',
      previousValue: { status: 'pending', fromSlotIndex: 1, toSlotIndex: 3 },
      newValue: { status: 'accepted' },
    });
    expect(slotEntry.action).toBe('ACCEPT_SLOT_SWAP');
    expect(slotEntry.previousValue?.status).toBe('pending');
    expect(slotEntry.newValue?.status).toBe('accepted');
  });

  it('records member lifecycle and role changes in audit logs', () => {
    const roleEntry = createAuditLogEntry({
      messId: 'mess_1',
      performedByUserId: 'super_admin',
      action: 'CHANGE_ROLE',
      targetCollection: 'users',
      targetId: 'user_2',
      previousValue: { role: 'member' },
      newValue: { role: 'admin' },
    });
    expect(roleEntry.previousValue).toEqual({ role: 'member' });
    expect(roleEntry.newValue).toEqual({ role: 'admin' });
  });

  it('records cycle closure and snapshot generation audit logs', () => {
    const closeCycleEntry = createAuditLogEntry({
      messId: 'mess_1',
      cycleId: 'cycle_1',
      performedByUserId: 'admin_1',
      action: 'CLOSE_CYCLE',
      targetCollection: 'cycles',
      targetId: 'cycle_1',
      previousValue: { status: 'open', bigBazarCarryToNext: 0 },
      newValue: { status: 'closed', bigBazarCarryToNext: 500, snapshotId: 'snap_123' },
    });
    expect(closeCycleEntry.previousValue).toEqual({ status: 'open', bigBazarCarryToNext: 0 });
    expect(closeCycleEntry.newValue).toEqual({ status: 'closed', bigBazarCarryToNext: 500, snapshotId: 'snap_123' });
  });
});

