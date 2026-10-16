import { describe, expect, it } from 'vitest';
import { resolveRentDepositCycleEffect } from './rent-lifecycle';

describe('Rent Deposit Lifecycle & Cycle Linking (Task ক)', () => {
  it('member-submitted pending rent deposit does NOT mark rentPaid as true', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_101',
        depositType: 'rent',
        status: 'pending',
        isPaid: false,
        paymentMethod: 'bkash',
      },
      'create'
    );

    expect(result.shouldMarkPaid).toBe(false);
    expect(result.rentPaid).toBe(false);
    expect(result.rentDepositId).toBeNull();
    expect(result.shouldRevertPaid).toBe(false);
  });

  it('manager-created pre-approved rent deposit marks rentPaid as true and links rentDepositId', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_102',
        depositType: 'rent',
        status: 'approved',
        isPaid: true,
        paymentMethod: 'cash',
      },
      'create'
    );

    expect(result.shouldMarkPaid).toBe(true);
    expect(result.rentPaid).toBe(true);
    expect(result.rentDepositId).toBe('dep_102');
    expect(result.rentPaidMethod).toBe('cash');
  });

  it('approving a previously pending rent deposit marks rentPaid as true', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_103',
        depositType: 'rent',
        status: 'approved',
        isPaid: true,
        paymentMethod: 'nagad',
      },
      'approve'
    );

    expect(result.shouldMarkPaid).toBe(true);
    expect(result.rentPaid).toBe(true);
    expect(result.rentDepositId).toBe('dep_103');
    expect(result.rentPaidMethod).toBe('nagad');
  });

  it('rejecting a rent deposit reverts rentPaid to false and clears rentDepositId', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_104',
        depositType: 'rent',
        status: 'rejected',
        isPaid: false,
      },
      'reject'
    );

    expect(result.shouldRevertPaid).toBe(true);
    expect(result.rentPaid).toBe(false);
    expect(result.rentDepositId).toBeNull();
  });

  it('deleting a rent deposit reverts rentPaid to false and clears rentDepositId', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_105',
        depositType: 'rent',
        status: 'approved',
        isPaid: true,
      },
      'delete'
    );

    expect(result.shouldRevertPaid).toBe(true);
    expect(result.rentPaid).toBe(false);
    expect(result.rentDepositId).toBeNull();
  });

  it('non-rent deposits do not affect cycle rent state', () => {
    const result = resolveRentDepositCycleEffect(
      {
        depositId: 'dep_106',
        depositType: 'general',
        status: 'approved',
        isPaid: true,
      },
      'approve'
    );

    expect(result.shouldMarkPaid).toBe(false);
    expect(result.shouldRevertPaid).toBe(false);
  });
});
