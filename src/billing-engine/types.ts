export type ExtraBazarSplitType = 'meal_pool' | 'all_equal' | 'custom_members';

export type BazarType = 'regular' | 'fixed' | 'extra' | 'big';

export interface MemberInput {
  userId: string;
  name: string;
  roomRent: number;
  isActive: boolean;
  isUtilityExempt?: boolean; // When true, utility bills are waived (e.g. absent whole month)
  leftDate?: string | null;
  openingCarryCredit?: number; // credit from previous cycle carry-over
}

export interface MealSlotConfig {
  id: string;
  name: string;
  weight: number; // e.g., morning 0.5, night 1.0
}

export interface MemberMealRecord {
  userId: string;
  date: string;
  slotId: string;
  weight: number;
  consumed: boolean | number;
}

export interface FixedEventInput {
  id: string;
  date: string;
  mealTime: 'morning' | 'lunch' | 'dinner';
  cost: number;
  extraMealWeight: number; // default 0.5
  attendeeUserIds: string[];
}

export interface BazarItemInput {
  id: string;
  userId: string; // who paid
  amount: number;
  type: BazarType;
  splitType?: ExtraBazarSplitType;
  customMemberIds?: string[]; // if splitType === 'custom_members'
  isApproved: boolean;
  paidFromBigBazarFund?: boolean; // if big bazar, paid from collected fund vs member pocket
}

export interface BigBazarConfigInput {
  isEnabled: boolean;
  perMemberContribution: number;
  leftoverValueCarry: number; // L_carry
}

export interface DepositInput {
  userId: string;
  amount: number;
  type: 'general' | 'big_bazar' | 'rent' | 'utility';
  isPaid: boolean;
}

export interface UtilityBillInput {
  id: string;
  name: string;
  amount: number;
  splitMethod?: 'equal'; // default equal among active members
  applicableCount?: number | null; // headcount if divided among a specific number of members
  applicableUserIds?: string[]; // Selected member userIds. If empty/omitted, applies to all active members
}

export interface BillingEngineInput {
  members: MemberInput[];
  mealRecords: MemberMealRecord[];
  fixedEvents: FixedEventInput[];
  bazarItems: BazarItemInput[];
  deposits: DepositInput[];
  utilityBills: UtilityBillInput[];
  bigBazarConfig: BigBazarConfigInput;
  options?: {
    roundToInteger?: boolean; // default true for final summary
  };
}

export interface MemberBillingResult {
  userId: string;
  name: string;
  isActive: boolean;
  isUtilityExempt?: boolean;
  mealUnits: number;
  regularMealCost: number;
  fixedShare: number;
  utilityShare: number;
  roomRent: number;
  extraShareNonPool: number;
  totalDues: number;
  
  generalDeposits: number;
  bigBazarDeposits: number;
  approvedBazarSpentOwnMoney: number;
  openingCarryCredit: number;
  totalCredits: number;
  
  netBalance: number; // totalCredits - totalDues (+ means refund, - means payable)
}

export interface BillingEngineOutput {
  mealPoolTotal: number;
  totalRegularBazar: number;
  totalExtraBazarPool: number;
  totalBigBazarCost: number;
  bigBazarCarryToNextCycle: number;
  totalMealUnits: number;
  mealRate: number; // rounded to 2 decimal places
  rawMealRate: number;
  totalUtility: number;
  
  memberResults: Record<string, MemberBillingResult>;
  allMembersSummary: MemberBillingResult[];
  
  totals: {
    totalDues: number;
    totalCredits: number;
    netBalance: number;
    roundingDifference: number;
  };
}
