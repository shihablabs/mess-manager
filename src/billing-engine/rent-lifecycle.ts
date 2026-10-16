export interface RentDepositStateInput {
  depositId: string;
  depositType: string;
  status: 'pending' | 'approved' | 'rejected';
  isPaid: boolean;
  paymentMethod?: string;
}

export interface RentCycleSyncResult {
  shouldMarkPaid: boolean;
  shouldRevertPaid: boolean;
  rentPaid: boolean;
  rentDepositId: string | null;
  rentPaidMethod?: string;
}

/**
 * Determines how a deposit lifecycle action affects a member's cycle rent status.
 *
 * Rules (Item ক & SRS):
 * 1. Pending member-submitted deposits MUST NOT set rentPaid to true.
 * 2. Only approved & paid rent deposits set rentPaid to true and link rentDepositId.
 * 3. Rejecting or deleting a rent deposit must revert rentPaid to false and clear rentDepositId.
 */
export function resolveRentDepositCycleEffect(
  input: RentDepositStateInput,
  action: 'create' | 'approve' | 'reject' | 'delete'
): RentCycleSyncResult {
  if (input.depositType !== 'rent') {
    return {
      shouldMarkPaid: false,
      shouldRevertPaid: false,
      rentPaid: false,
      rentDepositId: null,
    };
  }

  if (action === 'delete' || action === 'reject') {
    return {
      shouldMarkPaid: false,
      shouldRevertPaid: true,
      rentPaid: false,
      rentDepositId: null,
    };
  }

  if (action === 'approve' || (action === 'create' && input.isPaid && input.status === 'approved')) {
    return {
      shouldMarkPaid: true,
      shouldRevertPaid: false,
      rentPaid: true,
      rentDepositId: input.depositId,
      rentPaidMethod: input.paymentMethod || 'cash',
    };
  }

  // Pending creation or other states: MUST NOT be marked paid
  return {
    shouldMarkPaid: false,
    shouldRevertPaid: false,
    rentPaid: false,
    rentDepositId: null,
  };
}
