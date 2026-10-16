import { ObjectId } from 'mongodb';

export type UserRole = 'super_admin' | 'admin' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'inactive' | 'rejected';
export type CycleStatus = 'open' | 'closed';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type BazarType = 'regular' | 'fixed' | 'extra' | 'big';
export type ExtraBazarSplit = 'meal_pool' | 'all_equal' | 'custom_members';
export type DepositType = 'general' | 'big_bazar' | 'rent' | 'utility';

// User personal and contact details model
export interface UserDetails {
  displayName?: string;
  phone?: string;
  whatsapp?: string;
  dob?: string; // Date of birth: YYYY-MM-DD
  address?: string; // Location / Address
  bio?: string;
  about?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  occupation?: string;
}

// 1. Messes
export interface MealSlotDefinition {
  id: string; // e.g. 'morning', 'night'
  name: string; // e.g. 'সকাল', 'রাত'
  weight: number; // e.g. 0.5, 1.0
  cutoffTime?: string; // e.g. "22:00" for night before, "16:00" for dinner
  cutoffDayOffset?: number; // e.g. -1 for previous day (night before), 0 for same day
}

export interface MessDoc {
  _id?: ObjectId | string;
  name: string;
  code: string;
  currencySymbol?: string; // default "৳"
  mealSlots: MealSlotDefinition[];
  fixedDayDefault?: string; // e.g. "friday"
  fixedMealTimeDefault?: 'morning' | 'lunch' | 'dinner';
  fixedExtraWeightDefault?: number; // default 0.5
  allowMembersViewOthersBalance?: boolean; // default true
  createdAt: Date;
  updatedAt: Date;
}

// 2. Users
export interface UserDoc {
  _id?: ObjectId | string;
  name: string; // Editable display name
  displayName?: string; // Dedicated display name
  email: string;
  role?: UserRole;
  image?: string;
  phone?: string;
  whatsapp?: string;
  dob?: string; // Date of birth: YYYY-MM-DD
  address?: string; // Present / Permanent address
  bio?: string; // Bio or description
  bloodGroup?: string; // e.g. 'A+', 'B+', 'O+', etc.
  emergencyContact?: string; // Emergency phone number / person
  occupation?: string; // Profession / Student / Job
  userDetails?: UserDetails; // Embedded user details object
  createdAt: Date;
  updatedAt: Date;
}

// 3. Memberships
export interface MembershipDoc {
  _id?: ObjectId | string;
  userId: string;
  messId: string;
  role: UserRole;
  status: MembershipStatus;
  joinedDate: string; // YYYY-MM-DD
  leftDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 4. Cycles
export interface CycleDoc {
  _id?: ObjectId | string;
  messId: string;
  name: string; // e.g. "অক্টোবর ২০২৬"
  month?: string; // e.g. "2026-10"
  startDate: string; // YYYY-MM-DD (e.g. 2026-10-10)
  endDate: string; // YYYY-MM-DD (e.g. 2026-11-10)
  status: CycleStatus;
  isBigBazarEnabled: boolean;
  bigBazarContributionPerMember: number;
  bigBazarCarryToNext: number; // carry forward value
  openingCarryCreditPerMember?: number;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 5. MemberCycles
export interface MemberCycleDoc {
  _id?: ObjectId | string;
  userId: string;
  cycleId: string;
  messId: string;
  roomRent: number;
  rentPaid?: boolean;
  rentPaidAt?: Date | string | null;
  rentDepositId?: string | null;
  rentPaidMethod?: 'cash' | 'bkash' | 'nagad' | 'bank' | 'other';
  rentAmount?: number;
  isActive: boolean;
  isUtilityExempt?: boolean;
  leftDate?: string | null;
  individualSettled?: boolean;
  settledAt?: Date | null;
  settlementRequested?: boolean;
  settlementType?: 'current_rate_final' | 'cycle_end_adjustment';
  settledMealRate?: number | null;
  stayedDays?: number;
  rentSettlementType?: 'pro_rata' | 'full_month'; // 'pro_rata' (default) or 'full_month'
  createdAt: Date;
  updatedAt: Date;
}

// 6. Bills (Utilities)
export interface BillDoc {
  _id?: ObjectId | string;
  cycleId: string;
  messId: string;
  type: string; // 'পানি', 'গ্যাস', 'বিদ্যুৎ', 'ইন্টারনেট', 'ময়লা', custom
  amount: number;
  splitMethod: 'equal';
  applicableCount?: number | null; // headcount if divided among a specific number of members
  applicableUserIds?: string[]; // Selected member userIds. If empty, applies to all active members
  paidByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 7. Meals
export interface MealDoc {
  _id?: ObjectId | string;
  userId: string;
  cycleId: string;
  messId: string;
  date: string; // YYYY-MM-DD
  slotId: string; // 'morning' | 'night'
  weight: number;
  consumed: boolean | number; // boolean or count (e.g. 1, 2, 0)
  source: 'default' | 'request' | 'admin';
  updatedAt: Date;
}

// 8. MealRequests
export interface MealRequestDoc {
  _id?: ObjectId | string;
  userId: string;
  cycleId: string;
  messId: string;
  date: string; // YYYY-MM-DD
  slotId: string;
  action: 'off' | 'on' | 'update';
  isLate: boolean;
  status: RequestStatus;
  reason?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface BazarItemDetail {
  name: string;
  qty?: string;
  price: number;
}

// 9. Bazars
export interface BazarDoc {
  _id?: ObjectId | string;
  userId: string; // buyer
  cycleId: string;
  messId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  items?: BazarItemDetail[]; // Itemized multi-item breakdown
  type: BazarType;
  splitType?: ExtraBazarSplit; // for extra
  customMemberIds?: string[]; // for extra with custom_members
  status: RequestStatus; // pending, approved, rejected
  paidFromBigBazarFund?: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 10. FixedEvents
export interface FixedEventDoc {
  _id?: ObjectId | string;
  cycleId: string;
  messId: string;
  date: string;
  title: string; // e.g. "শুক্রবার স্পেশাল মাংস"
  mealTime: 'morning' | 'lunch' | 'dinner';
  cost: number;
  extraMealWeight: number; // default 0.5
  attendeeUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 11. BazarSlots (Duty Roster)
export interface BazarSlotDoc {
  _id?: ObjectId | string;
  cycleId: string;
  messId: string;
  slotIndex: number;
  startDate: string;
  endDate: string;
  capacity: number; // default 1
  assignedUserIds: string[];
  createdAt: Date;
}

// 12. SlotRequests
export interface SlotRequestDoc {
  _id?: ObjectId | string;
  userId: string; // requester userId
  fromUserId?: string;
  toUserId?: string; // target member for peer-to-peer swap
  cycleId: string;
  messId: string;
  fromSlotIndex: number;
  toSlotIndex: number;
  status: RequestStatus | 'accepted' | 'rejected' | 'pending';
  reason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type DepositStatus = 'approved' | 'pending' | 'rejected';

// 13. Deposits
export interface DepositDoc {
  _id?: ObjectId | string;
  userId: string;
  cycleId: string;
  messId: string;
  amount: number;
  date: string;
  type: DepositType; // 'general' | 'big_bazar' | 'utility' | 'rent'
  isPaid: boolean;
  status?: DepositStatus; // 'approved' | 'pending' | 'rejected'
  paymentMethod?: string;
  paidAt?: Date | string | null;
  approvedBy?: string;
  approvedAt?: Date | null;
  rejectedBy?: string;
  notes?: string;
  createdAt: Date;
}

// 14. CycleSnapshots
export interface CycleSnapshotDoc {
  _id?: ObjectId | string;
  cycleId: string;
  messId: string;
  closedAt: Date;
  closedBy: string;
  mealRate: number;
  remainingMealRate?: number;
  roundingDifference?: number;
  totalMealUnits: number;
  mealPoolTotal: number;
  totalRegularBazar: number;
  totalBigBazar: number;
  bigBazarCarryToNext: number;
  totalUtility: number;
  unrecoveredRent?: number;
  memberBalances: Array<{
    userId: string;
    name: string;
    mealUnits: number;
    mealCost: number;
    effectiveMealRate?: number;
    stayedDays?: number;
    settlementType?: string;
    fixedShare: number;
    utilityShare: number;
    roomRent: number;
    unrecoveredRent?: number;
    extraShare: number;
    totalDues: number;
    totalCredits: number;
    netBalance: number;
  }>;
  summaryNote?: string;
}

// 15. AuditLogs
export interface AuditLogDoc {
  _id?: ObjectId | string;
  messId: string;
  cycleId?: string;
  performedByUserId: string;
  performedByUserName: string;
  action: string;
  targetCollection: string;
  targetId?: string;
  previousValue?: any;
  newValue?: any;
  createdAt: Date;
}
