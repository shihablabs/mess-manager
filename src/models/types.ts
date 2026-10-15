import { ObjectId } from 'mongodb';

export type UserRole = 'admin' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'inactive';
export type CycleStatus = 'open' | 'closed';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type BazarType = 'regular' | 'fixed' | 'extra' | 'big';
export type ExtraBazarSplit = 'meal_pool' | 'all_equal' | 'custom_members';
export type DepositType = 'general' | 'big_bazar';

// 1. Messes
export interface MealSlotDefinition {
  id: string; // e.g. 'morning', 'night'
  name: string; // e.g. 'সকাল', 'রাত'
  weight: number; // e.g. 0.5, 1.0
  cutoffTime?: string; // e.g. "22:00" for night before, "16:00" for dinner
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
  name: string;
  email: string;
  image?: string;
  phone?: string;
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
  isActive: boolean;
  leftDate?: string | null;
  individualSettled?: boolean;
  settledAt?: Date | null;
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
  consumed: boolean; // default true (খাবে)
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

// 9. Bazars
export interface BazarDoc {
  _id?: ObjectId | string;
  userId: string; // buyer
  cycleId: string;
  messId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
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
  userId: string;
  cycleId: string;
  messId: string;
  fromSlotIndex: number;
  toSlotIndex: number;
  status: RequestStatus;
  reason?: string;
  createdAt: Date;
}

// 13. Deposits
export interface DepositDoc {
  _id?: ObjectId | string;
  userId: string;
  cycleId: string;
  messId: string;
  amount: number;
  date: string;
  type: DepositType; // 'general' | 'big_bazar'
  isPaid: boolean;
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
  totalMealUnits: number;
  mealPoolTotal: number;
  totalRegularBazar: number;
  totalBigBazar: number;
  bigBazarCarryToNext: number;
  totalUtility: number;
  memberBalances: Array<{
    userId: string;
    name: string;
    mealUnits: number;
    mealCost: number;
    fixedShare: number;
    utilityShare: number;
    roomRent: number;
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
