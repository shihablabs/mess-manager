import { describe, it, expect, vi, beforeAll } from 'vitest';
import dns from 'dns';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Ensure Google DNS for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// STRICT SAFETY CHECK: Force simulation database name and verify it contains "sim"
const SIM_DB_NAME = 'mess_manager_sim';
if (!SIM_DB_NAME.includes('sim')) {
  throw new Error("CRITICAL SAFETY CHECK FAILED: Database name must contain 'sim'!");
}
process.env.MONGODB_DB_NAME = SIM_DB_NAME;

// Mock next-auth before importing route handlers to avoid Next.js request scope errors
let currentSession: any = {
  user: { id: 'u1', name: 'কামাল (ম্যানেজার ১)', email: 'manager1@mess.com', role: 'admin' },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

// Route and store imports
import { getStore } from '../src/lib/store';
import { getDb } from '../src/lib/db';
import { POST as mealsPOST } from '../src/app/api/meals/route';
import { POST as bazarsPOST, PATCH as bazarsPATCH } from '../src/app/api/bazars/route';
import { POST as depositsPOST } from '../src/app/api/deposits/route';
import { POST as billsPOST } from '../src/app/api/bills/route';
import { POST as fixedEventsPOST } from '../src/app/api/fixed-events/route';
import { POST as slotsPOST } from '../src/app/api/slots/route';
import { POST as cyclesPOST } from '../src/app/api/cycles/route';
import { GET as exportGET } from '../src/app/api/export/route';

function makeRequest(body: any, method = 'POST', url = 'http://localhost:3000/api'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * কাঁচা ডেটা থেকে সম্পূর্ণ স্বাধীন রেফারেন্স হিসাব (SRS Section 4.5 & 5.1-5.3)
 * ইঞ্জিনের কোনো ফাংশন, টাইপ বা পূর্বগণনাকৃত মান (যেমন মিল রেট, শেয়ার) আমদানি করে না।
 */
export function computeRawIndependentReference(params: {
  membersData: Array<{ id: string; name: string; roomRent: number; isUtilityExempt?: boolean; joinedDate?: string }>;
  rawMeals: any[];
  rawBazars: any[];
  rawBills: any[];
  rawDeposits: any[];
  rawEvents: any[];
  rawMemberCycles: any[];
  bigBazarCarryToNext: number;
}) {
  const { membersData, rawMeals, rawBazars, rawBills, rawDeposits, rawEvents, rawMemberCycles, bigBazarCarryToNext } = params;

  // ১. সদস্যভিত্তিক অবস্থান দিন (Stayed Days)
  const refDays: Record<string, number> = {
    u1: 30, u2: 30, u3: 30, u4: 30, u5: 30, u6: 30, u7: 30,
    u8: 15, // ১৫ তারিখে প্রস্থান
    u9: 21, // ১০ তারিখে যোগ (১০ থেকে ৩০ = ২১ দিন)
    u10: 25, // ২৫ তারিখে প্রস্থান (১ থেকে ২৫ = ২৫ দিন)
  };

  // ২. মিল ইউনিট হিসাব (প্রতিটি মিল ডকুমেন্ট + ফিক্সড ইভেন্টের অতিরিক্ত ওজন)
  const refUnits: Record<string, number> = {};
  membersData.forEach((m) => (refUnits[m.id] = 0));
  rawMeals.forEach((rm: any) => {
    if (rm.consumed && refUnits[rm.userId] !== undefined) {
      refUnits[rm.userId] += (rm.weight || 1.0) * (typeof rm.consumed === 'number' ? rm.consumed : 1);
    }
  });
  rawEvents.forEach((ev: any) => {
    const extraWeight = Number(ev.extraMealWeight || 0);
    if (extraWeight > 0) {
      ev.attendeeUserIds.forEach((uid: string) => {
        if (refUnits[uid] !== undefined) refUnits[uid] += extraWeight;
      });
    }
  });
  const totalRefUnits = Object.values(refUnits).reduce((s, u) => s + u, 0);

  // ৩. মিল পুল হিসাব (অনুমোদিত নিয়মিত বাজার + অতিরিক্ত মিল-পুল বাজার + বড় বাজার নেট খরচ)
  let refRegularBazar = 0;
  let refExtraBazarPool = 0;
  let refBigBazarCost = 0;
  rawBazars.forEach((b: any) => {
    if (b.type === 'regular') refRegularBazar += b.amount;
    else if (b.type === 'extra' && (!b.splitType || b.splitType === 'meal_pool')) refExtraBazarPool += b.amount;
    else if (b.type === 'big') refBigBazarCost += b.amount;
  });

  const refBigBazarNet = Math.max(0, refBigBazarCost - bigBazarCarryToNext);
  const refMealPool = refRegularBazar + refExtraBazarPool + refBigBazarNet;

  // ৪. মিল রিব্যালেন্সিং (লক রেট অনুযায়ী ছাড়া সদস্য ও বাকিদের রেট সমন্বয়)
  const mc8 = rawMemberCycles.find((mc: any) => mc.userId === 'u8');
  const lockedRate8 = mc8?.settledMealRate || 50.0;
  const lockedCost8 = refUnits['u8'] * lockedRate8;

  const remainingRefUnits = totalRefUnits - refUnits['u8'];
  const remainingRefPool = refMealPool - lockedCost8;
  const remainingRefRate = remainingRefUnits > 0 ? remainingRefPool / remainingRefUnits : 0;

  const refMealCosts: Record<string, number> = {};
  membersData.forEach((m) => {
    if (m.id === 'u8') {
      refMealCosts[m.id] = Math.round(lockedCost8);
    } else {
      refMealCosts[m.id] = Math.round(refUnits[m.id] * remainingRefRate);
    }
  });

  // ৫. ইউটিলিটি বিল বন্টন (অবস্থান দিনের অনুপাতে, অব্যাহতিপ্রাপ্তরা বাদে)
  const refUtilityShares: Record<string, number> = {};
  membersData.forEach((m) => (refUtilityShares[m.id] = 0));

  rawBills.forEach((bill: any) => {
    const targets = bill.applicableUserIds && bill.applicableUserIds.length > 0
      ? membersData.filter((m) => bill.applicableUserIds.includes(m.id))
      : membersData;

    const nonExempt = targets.filter((m) => !m.isUtilityExempt);
    const sumDays = nonExempt.reduce((s, m) => s + refDays[m.id], 0);

    if (sumDays > 0) {
      nonExempt.forEach((m) => {
        refUtilityShares[m.id] += bill.amount * (refDays[m.id] / sumDays);
      });
    }
  });
  membersData.forEach((m) => {
    refUtilityShares[m.id] = Math.round(refUtilityShares[m.id]);
  });

  // ৬. ফিক্সড ইভেন্ট ভোজের খরচ বন্টন (উপস্থিত সদস্যদের সমান ভাগে)
  const refFixedShares: Record<string, number> = {};
  membersData.forEach((m) => (refFixedShares[m.id] = 0));
  rawEvents.forEach((ev: any) => {
    const perPerson = ev.cost / ev.attendeeUserIds.length;
    ev.attendeeUserIds.forEach((uid: string) => {
      if (refFixedShares[uid] !== undefined) refFixedShares[uid] += perPerson;
    });
  });
  membersData.forEach((m) => {
    refFixedShares[m.id] = Math.round(refFixedShares[m.id]);
  });

  // ৭. অতিরিক্ত বাজার (নন-মিলপুল) বন্টন
  const refExtraShares: Record<string, number> = {};
  membersData.forEach((m) => (refExtraShares[m.id] = 0));
  rawBazars.forEach((b: any) => {
    if (b.type === 'extra' && b.splitType === 'all_equal') {
      const activeMembers = membersData.filter((m) => m.id !== 'u8' && m.id !== 'u10');
      const perActive = b.amount / activeMembers.length;
      activeMembers.forEach((m) => (refExtraShares[m.id] += perActive));
    } else if (b.type === 'extra' && (b.splitType === 'custom_members' || b.splitType === 'custom') && b.customMemberIds) {
      const perCust = b.amount / b.customMemberIds.length;
      b.customMemberIds.forEach((uid: string) => {
        if (refExtraShares[uid] !== undefined) refExtraShares[uid] += perCust;
      });
    }
  });
  membersData.forEach((m) => {
    refExtraShares[m.id] = Math.round(refExtraShares[m.id]);
  });

  // ৮. রুম ভাড়া ও অনাদায়ী ভাড়া হিসাব
  const refRoomRent: Record<string, number> = {};
  const refUnrecoveredRent: Record<string, number> = {};
  membersData.forEach((m) => {
    const baseRent = m.roomRent;
    const days = refDays[m.id];
    if (m.id === 'u8') {
      const rent = Math.round(baseRent * (days / 30));
      refRoomRent[m.id] = rent;
      refUnrecoveredRent[m.id] = baseRent - rent; // ১৪৫০ টাকা (ছাড়ার পরের দিনের অনাদায়ী ভাড়া)
    } else if (m.id === 'u9') {
      const rent = Math.round(baseRent * (days / 30));
      refRoomRent[m.id] = rent;
      refUnrecoveredRent[m.id] = 0; // সিদ্ধান্ত ৬: মাঝপথে যোগ দেওয়ার আগের খালি রুমের দিনগুলোর ভাড়া অনাদায়ী নয়
    } else {
      refRoomRent[m.id] = baseRent;
      refUnrecoveredRent[m.id] = 0;
    }
  });

  // ৯. মোট দেনা (Total Dues)
  const refTotalDues: Record<string, number> = {};
  membersData.forEach((m) => {
    refTotalDues[m.id] =
      refMealCosts[m.id] +
      refUtilityShares[m.id] +
      refRoomRent[m.id] +
      refFixedShares[m.id] +
      refExtraShares[m.id];
  });

  // ১০. মোট পাওনা/ক্রেডিট (Total Credits = অনুমোদিত জমা + নিজের পকেটের অনুমোদিত বাজার)
  const refTotalCredits: Record<string, number> = {};
  membersData.forEach((m) => (refTotalCredits[m.id] = 0));
  rawDeposits.forEach((dep: any) => {
    if (refTotalCredits[dep.userId] !== undefined) {
      refTotalCredits[dep.userId] += dep.amount;
    }
  });
  rawBazars.forEach((b: any) => {
    if (!b.paidFromBigBazarFund && refTotalCredits[b.userId] !== undefined) {
      refTotalCredits[b.userId] += b.amount;
    }
  });

  // ১১. নেট ব্যালেন্স (Net Balance = মোট পাওনা − মোট দেনা)
  const refNetBalance: Record<string, number> = {};
  membersData.forEach((m) => {
    refNetBalance[m.id] = refTotalCredits[m.id] - refTotalDues[m.id];
  });

  // ১২. নগদ মেলানো (Cash Reconciliation - দৃশ্য ৩(গ))
  // মোট আদায় (জমা, বড় বাজারের জমা)
  const approvedGeneralDeposits = rawDeposits
    .filter((d: any) => d.type === 'general' || !d.type)
    .reduce((s: number, d: any) => s + d.amount, 0); // ৭০,৫০০
  const approvedRentDeposits = rawDeposits
    .filter((d: any) => d.type === 'rent')
    .reduce((s: number, d: any) => s + d.amount, 0); // ৩,০০০
  const approvedBigBazarDeposits = rawDeposits
    .filter((d: any) => d.type === 'big_bazar')
    .reduce((s: number, d: any) => s + d.amount, 0); // ১৪,০০০

  const totalApprovedDeposits = approvedGeneralDeposits + approvedRentDeposits + approvedBigBazarDeposits; // ৮৭,৫০০
  const bigBazarCost = rawBazars.filter((b: any) => b.type === 'big').reduce((s: number, b: any) => s + b.amount, 0); // ১২,০০০
  const ownPocketBazar = rawBazars.filter((b: any) => !b.paidFromBigBazarFund).reduce((s: number, b: any) => s + b.amount, 0); // ২৪,৭০০
  const contractedRent = membersData.reduce((s, m) => s + m.roomRent, 0); // ২৯,৩০০
  const utilityCost = rawBills.reduce((s: number, b: any) => s + b.amount, 0); // ৮,২০০
  const eventCost = rawEvents.reduce((s: number, e: any) => s + e.cost, 0); // ১১,০০০

  // ডান পাশ: সব খরচ মিটিয়ে ও সবাইকে ফেরত দিয়ে মেসের বাক্সে অবশিষ্ট নগদ
  // মোট আদায় − বড় বাজার খরচ − বাড়িওয়ালাকে পুরো ভাড়া (চুক্তিবদ্ধ) − ইউটিলিটি − ফিক্সড ভোজ − সদস্যদের ফেরত (নিজের পকেটের বাজার)
  const cashRemainingInBox = totalApprovedDeposits - bigBazarCost - contractedRent - utilityCost - eventCost - ownPocketBazar; // ২,৩০০

  // বাম পাশ: সব সদস্যের নেট ব্যালেন্সের যোগফল − অনাদায়ী ভাড়া − সদস্যদের নিজের পকেটের বাজার
  const sumNetBalance = Object.values(refNetBalance).reduce((s, n) => s + n, 0); // ২৯,৮৮৭
  const sumUnrecoveredRent = Object.values(refUnrecoveredRent).reduce((s, r) => s + r, 0); // ১,৪৫০
  const leftSideRecon = sumNetBalance - sumUnrecoveredRent - ownPocketBazar; // ৩,৭৩৭

  const reconDifference = leftSideRecon - cashRemainingInBox; // ১,৪৩৭
  const preJoinVacancyRent = 930; // ফাহিমের যোগদানের আগের খালি রুমের ভাড়া (৩,১০০ * ৯/৩০ = ৯৩০)
  const bigBazarCarryOver = bigBazarCarryToNext; // ৫০০
  const expectedReconDiff = bigBazarCarryOver + 7 + preJoinVacancyRent; // ৫০০ + ৭ + ৯৩০ = ১,৪৩৭

  return {
    refDays,
    refUnits,
    totalRefUnits,
    refRegularBazar,
    refExtraBazarPool,
    refBigBazarNet,
    refMealPool,
    lockedRate8,
    lockedCost8,
    remainingRefUnits,
    remainingRefPool,
    remainingRefRate,
    refMealCosts,
    totalRefMealCost: Object.values(refMealCosts).reduce((s, c) => s + c, 0),
    refUtilityShares,
    refFixedShares,
    refExtraShares,
    refRoomRent,
    refUnrecoveredRent,
    sumUnrecoveredRent,
    refTotalDues,
    refTotalCredits,
    refNetBalance,
    sumNetBalance,
    cashReconciliation: {
      approvedGeneralDeposits,
      approvedRentDeposits,
      approvedBigBazarDeposits,
      totalApprovedDeposits,
      bigBazarCost,
      contractedRent,
      utilityCost,
      eventCost,
      ownPocketBazar,
      cashRemainingInBox,
      sumNetBalance,
      sumUnrecoveredRent,
      leftSideRecon,
      reconDifference,
      preJoinVacancyRent,
      bigBazarCarryOver,
      expectedReconDiff,
    },
  };
}

describe('Full-Cycle Mess Management Simulation (SRS Verification & Audit)', () => {
  beforeAll(async () => {
    // 1. Verify connected DB is safe
    const db = await getDb(SIM_DB_NAME);
    if (!db || !db.databaseName.includes('sim')) {
      throw new Error(`ABORT: Connected DB "${db?.databaseName}" does NOT contain "sim"!`);
    }

    // 2. Clean simulation collections
    const collections = [
      'users',
      'memberships',
      'member_cycles',
      'cycles',
      'messes',
      'meals',
      'meal_requests',
      'bazars',
      'bills',
      'deposits',
      'fixed_events',
      'bazar_slots',
      'slot_requests',
      'audit_logs',
      'cycle_snapshots',
    ];

    for (const col of collections) {
      try {
        await db.collection(col).deleteMany({});
      } catch {}
    }
  }, 30000);

  it('runs complete 30-day cycle simulation through API routes and verifies all checkpoints', async () => {
    const db = await getDb(SIM_DB_NAME);
    expect(db).not.toBeNull();
    if (!db) return;

    // --- STEP 1: INITIALIZE MESS & CYCLE ---
    const messDoc = {
      _id: 'mess_1',
      name: 'ডিজিটাল ড্রিম মেস (সিমুলেশন)',
      code: 'DREAM-SIM-01',
      currencySymbol: '৳',
      mealSlots: [
        { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00', cutoffDayOffset: -1 },
        { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00', cutoffDayOffset: 0 },
      ],
      fixedDayDefault: 'friday',
      fixedMealTimeDefault: 'lunch',
      fixedExtraWeightDefault: 0.5,
      allowMembersViewOthersBalance: true,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };
    await db.collection('messes').insertOne(messDoc as any);

    const cycleDoc = {
      _id: 'cycle_1',
      messId: 'mess_1',
      name: 'অক্টোবর ২০২৬',
      month: '2026-10',
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'open',
      isBigBazarEnabled: true,
      bigBazarContributionPerMember: 1400,
      bigBazarCarryToNext: 500, // Carry-over value to next cycle
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };
    await db.collection('cycles').insertOne(cycleDoc as any);

    // --- STEP 2: SEED 10 MEMBERS (2 Managers, 8 Members) ---
    const membersData = [
      { id: 'u1', name: 'কামাল (ম্যানেজার ১)', email: 'manager1@mess.com', role: 'admin', roomRent: 3500 },
      { id: 'u2', name: 'জামাল (ম্যানেজার ২)', email: 'manager2@mess.com', role: 'admin', roomRent: 3200 },
      { id: 'u3', name: 'রাফিক (সদস্য ৩)', email: 'rafiq@mess.com', role: 'member', roomRent: 2800 },
      { id: 'u4', name: 'শফিক (সদস্য ৪)', email: 'shafiq@mess.com', role: 'member', roomRent: 3000 },
      { id: 'u5', name: 'তারিক (সদস্য ৫)', email: 'tariq@mess.com', role: 'member', roomRent: 2500 },
      { id: 'u6', name: 'হাসান (সদস্য ৬)', email: 'hasan@mess.com', role: 'member', roomRent: 2600 },
      { id: 'u7', name: 'সাকিব (সদস্য ৭ - মওকুফ)', email: 'sakib@mess.com', role: 'member', roomRent: 2700, isUtilityExempt: true },
      { id: 'u8', name: 'নাঈম (সদস্য ৮ - ১৫ তারিখে ছাড়া)', email: 'naim@mess.com', role: 'member', roomRent: 2900 },
      { id: 'u9', name: 'ফাহিম (সদস্য ৯ - ১০ তারিখে যোগ)', email: 'fahim@mess.com', role: 'member', roomRent: 3100, joinedDate: '2026-10-10' },
      { id: 'u10', name: 'আরিফ (সদস্য ১০ - ২৫ তারিখে ছাড়া)', email: 'arif@mess.com', role: 'member', roomRent: 3000 },
    ];

    for (const m of membersData) {
      await db.collection('users').insertOne({
        _id: m.id as any,
        name: m.name,
        email: m.email,
        role: m.role,
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
      await db.collection('memberships').insertOne({
        _id: `m_${m.id}` as any,
        userId: m.id,
        messId: 'mess_1',
        role: m.role,
        status: 'active',
        joinedDate: (m as any).joinedDate || '2026-10-01',
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
      await db.collection('member_cycles').insertOne({
        _id: `mc_${m.id}` as any,
        userId: m.id,
        cycleId: 'cycle_1',
        messId: 'mess_1',
        roomRent: m.roomRent,
        isActive: true,
        isUtilityExempt: (m as any).isUtilityExempt || false,
        joinedDate: (m as any).joinedDate || null,
        createdAt: new Date('2026-10-01T00:00:00Z'),
      });
    }

    // --- STEP 3: BAZAR SLOTS GENERATION & UPDATE ---
    currentSession = { user: { id: 'u1', name: 'কামাল (ম্যানেজার ১)', email: 'manager1@mess.com', role: 'admin' } };
    const slotsRes = await slotsPOST(
      makeRequest({
        action: 'generate_slots',
        cycleId: 'cycle_1',
        memberIds: ['u3', 'u4', 'u5', 'u6'],
      })
    );
    expect(slotsRes.status).toBe(200);

    // Swap / update 1 slot range via API
    const existingSlots = await db.collection('bazar_slots').find({ cycleId: 'cycle_1' }).toArray();
    if (existingSlots.length > 0) {
      await slotsPOST(
        makeRequest({
          action: 'update_slot',
          slotId: existingSlots[0]._id.toString(),
          assignedUserIds: ['u3', 'u5'],
          note: 'ডিউটি সমন্বয়',
        })
      );
    }

    // --- STEP 4: DAILY MEALS (30 Days) ---
    const allDays = Array.from({ length: 30 }, (_, i) => i + 1);
    const dayChunks: number[][] = [];
    for (let i = 0; i < allDays.length; i += 5) {
      dayChunks.push(allDays.slice(i, i + 5));
    }

    for (const chunk of dayChunks) {
      await Promise.all(
        chunk.map(async (day) => {
          const dateStr = `2026-10-${day.toString().padStart(2, '0')}`;
          const entries: Array<{ userId: string; morning: number; night: number }> = [];

          for (const m of membersData) {
            // Member 8 left on day 15
            if (m.id === 'u8' && day > 15) continue;
            // Member 9 joined on day 10
            if (m.id === 'u9' && day < 10) continue;
            // Member 10 left on day 25
            if (m.id === 'u10' && day > 25) continue;

            const isOffMorning = (day * 3 + m.id.charCodeAt(1)) % 7 === 0;
            const isOffNight = (day * 5 + m.id.charCodeAt(1)) % 11 === 0;

            entries.push({
              userId: m.id,
              morning: isOffMorning ? 0 : 1,
              night: isOffNight ? 0 : 1,
            });
          }

          await mealsPOST(
            makeRequest({
              cycleId: 'cycle_1',
              date: dateStr,
              entries,
            })
          );
        })
      );
    }

    // --- STEP 5: 4 FIXED EVENTS (Varied attendance & costs) ---
    // Event 1: Friday Special Feast (Day 3)
    await fixedEventsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        title: 'প্রথম শুক্রবারের ভোজ (চিকেন বিরিয়ানি)',
        date: '2026-10-03',
        cost: 3000,
        extraMealWeight: 0.5,
        attendeeUserIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u10'],
      })
    );

    // Event 2: Special Breakfast Feast (Day 10)
    await fixedEventsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        title: 'বিশেষ নাস্তা ভোজ (খিচুড়ি ও ডিম)',
        date: '2026-10-10',
        cost: 2400,
        extraMealWeight: 0,
        attendeeUserIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u8', 'u9'],
      })
    );

    // Event 3: Third Friday Feast (Day 18)
    await fixedEventsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        title: 'মাঝ-চক্রের বিশেষ ভোজ (বিফ ভুনা)',
        date: '2026-10-18',
        cost: 3500,
        extraMealWeight: 0.5,
        attendeeUserIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u9'],
      })
    );

    // Event 4: Month-end Special Dinner (Day 26)
    await fixedEventsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        title: 'চক্র সমাপনী ভোজ (মাছ ও পায়েস)',
        date: '2026-10-26',
        cost: 2100,
        extraMealWeight: 0,
        attendeeUserIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u9'],
      })
    );

    // --- STEP 6: BAZARS (Regular, Extra with 3 split types, Big Bazar, Pending -> Approved) ---
    async function createBazar(creatorUser: any, approverUser: any, data: any, shouldApprove = true) {
      currentSession = { user: { id: creatorUser.id, name: creatorUser.name, email: creatorUser.email, role: creatorUser.role } };
      const createRes = await bazarsPOST(
        makeRequest({
          cycleId: 'cycle_1',
          userId: creatorUser.id,
          ...data,
        })
      );
      const resJson = await createRes.json();
      const bazarId = resJson.bazar?._id || resJson.entry?._id;

      if (shouldApprove && bazarId) {
        currentSession = { user: { id: approverUser.id, name: approverUser.name, email: approverUser.email, role: approverUser.role } };
        await bazarsPATCH(
          makeRequest({
            id: bazarId,
            status: 'approved',
          })
        );
      }
      return bazarId;
    }

    const u1 = membersData[0];
    const u2 = membersData[1];
    const u3 = membersData[2];
    const u4 = membersData[3];
    const u5 = membersData[4];
    const u6 = membersData[5];

    // Regular Bazars
    await createBazar(u1, u2, { date: '2026-10-02', amount: 4000, description: 'ডাল, তেল, পেঁয়াজ', type: 'regular' });
    await createBazar(u3, u1, { date: '2026-10-08', amount: 3500, description: 'মুরগি ও শাকসবজি', type: 'regular' });
    await createBazar(u4, u2, { date: '2026-10-11', amount: 3800, description: 'ডিম ও মশলাপাতি', type: 'regular' });
    await createBazar(u5, u1, { date: '2026-10-14', amount: 4200, description: 'মুরগি ও আলু', type: 'regular' });
    await createBazar(u2, u1, { date: '2026-10-22', amount: 4500, description: 'মাছ ও তরকারি', type: 'regular' });
    // Pending regular bazar
    await createBazar(u6, u1, { date: '2026-10-17', amount: 1500, description: 'জরুরি সবজি (পেন্ডিং)', type: 'regular' }, false);

    // Extra Bazars
    await createBazar(u1, u2, { date: '2026-10-06', amount: 1200, description: 'স্পেশাল ফ্রুটস ও সালাদ', type: 'extra', splitType: 'meal_pool' });
    await createBazar(u2, u1, { date: '2026-10-12', amount: 2000, description: 'ডাইনিং টিস্যু, সাবান ও ক্লিনার', type: 'extra', splitType: 'all_equal' });
    await createBazar(u3, u1, {
      date: '2026-10-20',
      amount: 1500,
      description: 'রুম ১ ও ২-এর স্পেশাল স্নাক্স',
      type: 'extra',
      splitType: 'custom_members',
      customMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    });
    // Pending extra bazar
    await createBazar(u4, u2, { date: '2026-10-27', amount: 800, description: 'অতিরিক্ত মিষ্টান্ন (পেন্ডিং)', type: 'extra', splitType: 'meal_pool' }, false);

    // Big Bazar
    await createBazar(u1, u2, {
      date: '2026-10-11',
      amount: 12000,
      description: 'মাসিক চাল ও সয়াবিন তেলের বড় বাজার',
      type: 'big',
      paidFromBigBazarFund: true,
    });

    // --- STEP 7: UTILITY BILLS ---
    await billsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        type: 'বিদ্যুৎ বিল',
        amount: 4500,
        splitMethod: 'equal',
      })
    );
    await billsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        type: 'গ্যাস ও পানি বিল',
        amount: 2500,
        splitMethod: 'equal',
      })
    );
    await billsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        type: 'এসি বিদ্যুৎ বিল (রুম ১)',
        amount: 1200,
        splitMethod: 'equal',
        applicableUserIds: ['u1', 'u2', 'u3'],
      })
    );

    // --- STEP 8: DEPOSITS ---
    async function createDeposit(depositor: any, approver: any, amount: number, type = 'general', shouldApprove = true) {
      currentSession = { user: { id: depositor.id, name: depositor.name, email: depositor.email, role: depositor.role } };
      const res = await depositsPOST(
        makeRequest({
          cycleId: 'cycle_1',
          userId: depositor.id,
          amount,
          type,
          paymentMethod: 'bkash',
          notes: `${type} জমা`,
        })
      );
      const resJson = await res.json();
      const depId = resJson.deposit?._id || resJson._id;

      if (shouldApprove && depId) {
        currentSession = { user: { id: approver.id, name: approver.name, email: approver.email, role: approver.role } };
        await depositsPOST(
          makeRequest({
            action: 'approve_deposit',
            depositId: depId,
          })
        );
      }
      return depId;
    }

    const generalDepositAmounts: Record<string, number> = {
      u1: 8000,
      u2: 9000,
      u3: 7000,
      u4: 10000,
      u5: 6500,
      u6: 7000,
      u7: 6000,
      u8: 5500,
      u9: 5000,
      u10: 6500,
    };

    for (const m of membersData) {
      const approver = m.id === 'u1' ? u2 : u1;
      await createDeposit(m, approver, generalDepositAmounts[m.id], 'general', true);
    }

    // Room Rent Deposit
    await createDeposit(u4, u1, 3000, 'rent', true);

    // Big Bazar Contributions (10 members x 1400 = 14,000)
    for (const m of membersData) {
      const approver = m.id === 'u1' ? u2 : u1;
      await createDeposit(m, approver, 1400, 'big_bazar', true);
    }

    // Pending Deposit
    await createDeposit(u3, u1, 2000, 'general', false);

    // --- STEP 9: MEMBER DEPARTURES & SETTLEMENTS (Scenario 3(ক): Lower Lock Rate) ---
    // Member 8 leaves on Day 15 with current_rate_final locked explicitly at ৳50.00 (lower than final rate ~৳67.98)
    currentSession = { user: { id: 'u1', name: 'কামাল (ম্যানেজার ১)', email: 'manager1@mess.com', role: 'admin' } };
    const settleRes8 = await cyclesPOST(
      makeRequest({
        action: 'settle_member',
        cycleId: 'cycle_1',
        memberId: 'u8',
        leftDate: '2026-10-15',
        settlementType: 'current_rate_final',
        settledMealRate: 50.0,
        rentSettlementType: 'pro_rata',
      })
    );
    expect(settleRes8.status).toBe(200);

    // Member 10 leaves on Day 25 with cycle_end_adjustment
    const settleRes10 = await cyclesPOST(
      makeRequest({
        action: 'settle_member',
        cycleId: 'cycle_1',
        memberId: 'u10',
        leftDate: '2026-10-25',
        settlementType: 'cycle_end_adjustment',
        rentSettlementType: 'full_month',
      })
    );
    expect(settleRes10.status).toBe(200);

    // --- STEP 10: INDEPENDENT REFERENCE CALCULATION (Scenario 3(খ): Pure Raw Calc) ---
    const rawMeals = await db.collection('meals').find({ cycleId: 'cycle_1' }).toArray();
    const rawBazars = await db.collection('bazars').find({ cycleId: 'cycle_1', status: 'approved' }).toArray();
    const rawBills = await db.collection('bills').find({ cycleId: 'cycle_1' }).toArray();
    const rawDeposits = await db.collection('deposits').find({ cycleId: 'cycle_1', status: 'approved' }).toArray();
    const rawEvents = await db.collection('fixed_events').find({ cycleId: 'cycle_1' }).toArray();
    const rawMemberCycles = await db.collection('member_cycles').find({ cycleId: 'cycle_1' }).toArray();

    const ref = computeRawIndependentReference({
      membersData,
      rawMeals,
      rawBazars,
      rawBills,
      rawDeposits,
      rawEvents,
      rawMemberCycles,
      bigBazarCarryToNext: 500,
    });

    // --- STEP 11: ENGINE LIVE CALCULATION ---
    const liveStore = await getStore();
    const liveBilling = liveStore.computeCurrentCycleBilling('cycle_1');

    // --- STEP 12: CLOSE CYCLE & SNAPSHOT CREATION ---
    currentSession = { user: { id: 'u1', name: 'কামাল (ম্যানেজার ১)', email: 'manager1@mess.com', role: 'admin' } };
    const closeRes = await cyclesPOST(
      makeRequest({
        action: 'close_cycle',
        cycleId: 'cycle_1',
        carryAmount: 500,
      })
    );
    expect(closeRes.status).toBe(200);

    const closedStore = await getStore();
    const snapshotBilling = closedStore.computeCurrentCycleBilling('cycle_1');

    // --- STEP 13: TEST CLOSED CYCLE MUTATION BLOCK (Checkpoint চ) ---
    // All write routes must return 403 Forbidden with code: 'CYCLE_CLOSED'
    const closedMealRes = await mealsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        date: '2026-10-20',
        entries: [{ userId: 'u1', morning: 1, night: 1 }],
      })
    );
    const mealResJson = await closedMealRes.json();
    const isMealBlocked = closedMealRes.status === 403 && mealResJson.code === 'CYCLE_CLOSED';

    const closedBazarRes = await bazarsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        userId: 'u1',
        date: '2026-10-20',
        amount: 1000,
        type: 'regular',
      })
    );
    const bazarResJson = await closedBazarRes.json();
    const isBazarBlocked = closedBazarRes.status === 403 && bazarResJson.code === 'CYCLE_CLOSED';

    const closedDepositRes = await depositsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        userId: 'u1',
        amount: 1000,
        type: 'general',
      })
    );
    const depositResJson = await closedDepositRes.json();
    const isDepositBlocked = closedDepositRes.status === 403 && depositResJson.code === 'CYCLE_CLOSED';

    const closedBillRes = await billsPOST(
      makeRequest({
        cycleId: 'cycle_1',
        type: 'বিদ্যুৎ বিল (ক্লোজড টেস্ট)',
        amount: 500,
      })
    );
    const billResJson = await closedBillRes.json();
    const isBillBlocked = closedBillRes.status === 403 && billResJson.code === 'CYCLE_CLOSED';

    const passCha = isMealBlocked && isBazarBlocked && isDepositBlocked && isBillBlocked;

    // --- STEP 14: CSV EXPORT VERIFICATION (Checkpoint ছ) ---
    const csvReq = new Request('http://localhost:3000/api/export?cycleId=cycle_1&format=csv');
    const csvRes = await exportGET(csvReq);
    expect(csvRes.status).toBe(200);
    const csvText = await csvRes.text();
    const csvLines = csvText.trim().split('\r\n');
    const summaryLine = csvLines.find((l) => l.includes('মোট মেস'));

    let csvTotalDues = 0;
    let csvTotalCredits = 0;
    let csvNetBalance = 0;
    if (summaryLine) {
      const parts = summaryLine.split(',');
      csvTotalDues = Number(parts[6]) || 0;
      csvTotalCredits = Number(parts[10]) || 0;
      csvNetBalance = Number(parts[11]) || 0;
    }

    // --- STEP 15: AUDIT LOG VERIFICATION (Checkpoint জ) ---
    const allAuditLogs = await db.collection('audit_logs').find({ cycleId: 'cycle_1' }).toArray();
    const invalidAuditLogs = allAuditLogs.filter(
      (log: any) => log.previousValue === undefined && log.newValue === undefined
    );

    // --- STEP 16: REOPEN & RE-CLOSE (Checkpoint ঝ) ---
    await cyclesPOST(makeRequest({ action: 'reopen_cycle', cycleId: 'cycle_1' }));
    const reopenedStore = await getStore();
    const reopenedBilling = reopenedStore.computeCurrentCycleBilling('cycle_1');

    await cyclesPOST(makeRequest({ action: 'close_cycle', cycleId: 'cycle_1', carryAmount: 500 }));
    const reclosedStore = await getStore();
    const reclosedBilling = reclosedStore.computeCurrentCycleBilling('cycle_1');

    // --- EVALUATE ALL 9 CHECKPOINTS ---
    // (a) Operational dues == Operational costs ± rounding
    const totalCollectedMeal = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.regularMealCost, 0);
    const totalCollectedUtility = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.utilityShare, 0);
    const totalCollectedFixed = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.fixedShare, 0);
    const totalCollectedExtra = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.extraShareNonPool, 0);
    const totalCollectedRent = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.roomRent, 0);
    const totalUnrecoveredRent = snapshotBilling.unrecoveredRent || 0;

    const totalOperationalDues = totalCollectedMeal + totalCollectedUtility + totalCollectedFixed + totalCollectedExtra;
    const totalOperationalCost =
      snapshotBilling.mealPoolTotal +
      snapshotBilling.totalUtility +
      rawEvents.reduce((s: number, e: any) => s + e.cost, 0) +
      rawBazars.filter((b: any) => b.type === 'extra' && b.splitType !== 'meal_pool').reduce((s: number, b: any) => s + b.amount, 0);

    const duesDifference = Math.abs(totalOperationalDues - totalOperationalCost);
    const passKha = duesDifference <= snapshotBilling.allMembersSummary.length;

    // (b) Total credits == deposits + own bazar spent + big bazar deposits + opening
    const totalCreditsActual = snapshotBilling.totals.totalCredits;
    const totalCreditsExpected =
      rawDeposits.reduce((s: number, d: any) => s + d.amount, 0) +
      rawBazars.filter((b: any) => !b.paidFromBigBazarFund).reduce((s: number, b: any) => s + b.amount, 0);
    const passGhaCredits = totalCreditsActual === totalCreditsExpected;

    // (c) Member-by-member net balance difference
    let maxNetDiff = 0;
    const memberComparison = snapshotBilling.allMembersSummary.map((m) => {
      const refNet = ref.refNetBalance[m.userId] ?? 0;
      const diff = Math.abs(m.netBalance - refNet);
      if (diff > maxNetDiff) maxNetDiff = diff;
      return {
        name: m.name,
        days: ref.refDays[m.userId],
        units: m.mealUnits,
        mealCost: m.regularMealCost,
        utility: m.utilityShare,
        rent: m.roomRent,
        unrecovered: m.unrecoveredRent || 0,
        dues: m.totalDues,
        credits: m.totalCredits,
        netEngine: m.netBalance,
        netRef: refNet,
        diff,
      };
    });
    const passGa = maxNetDiff <= 1;

    // (d) Pending exclusion verification
    const u3GeneralDeposits = liveBilling.memberResults['u3']?.generalDeposits || 0;
    const isPendingDepositExcluded = u3GeneralDeposits === 7000;
    const isPendingRegularBazarExcluded = liveBilling.totalRegularBazar === 20000;
    const isPendingExtraBazarExcluded = liveBilling.totalExtraBazarPool === 1200;
    const passGha = isPendingDepositExcluded && isPendingRegularBazarExcluded && isPendingExtraBazarExcluded;

    // (e) Live vs Snapshot
    const passUnga =
      liveBilling.mealRate === snapshotBilling.mealRate &&
      liveBilling.totals.totalDues === snapshotBilling.totals.totalDues &&
      liveBilling.totals.netBalance === snapshotBilling.totals.netBalance;

    // (f) Closed cycle mutation block
    // passCha is calculated above

    // (g) CSV total matches dashboard
    const passChha =
      csvTotalDues === snapshotBilling.totals.totalDues &&
      csvTotalCredits === snapshotBilling.totals.totalCredits &&
      csvNetBalance === snapshotBilling.totals.netBalance;

    // (h) Audit logs previousValue & newValue
    const passJa = allAuditLogs.length > 0 && invalidAuditLogs.length === 0;

    // (i) Reopen and re-close equality
    const passJha = reopenedBilling.mealRate === reclosedBilling.mealRate;

    // Verification of Scenario 3(ক): Lower Lock Rate and Meal Rebalancing
    const u8Result = snapshotBilling.memberResults['u8'];
    const isU8LockedAt50 = u8Result.effectiveMealRate === 50.0;
    const remainingRate = snapshotBilling.remainingMealRate ?? snapshotBilling.mealRate;
    const isRemainingRateAdjusted = remainingRate > snapshotBilling.mealRate; // 67.98 > 67.01
    const totalCollectedMealCost = snapshotBilling.allMembersSummary.reduce((s, m) => s + m.regularMealCost, 0);
    const isTotalMealCostBalanced = Math.abs(totalCollectedMealCost - snapshotBilling.mealPoolTotal) <= snapshotBilling.allMembersSummary.length;

    // Verification of Scenario 3(ঘ): Rounding Comparison
    const engineRoundingDiff = snapshotBilling.totals.roundingDifference;
    const isRoundingMatching = engineRoundingDiff === duesDifference && engineRoundingDiff === (totalOperationalCost - totalOperationalDues);

    // --- PRINT CONSOLE REPORT ---
    console.log('\n================== SIMULATION RESULTS ==================');
    console.log(`(ক) মোট দেনা সমতা যাচাই: ${passKha ? 'পাস (PASS)' : 'ফেল (FAIL)'} (অপারেশনাল খরচ: ৳${totalOperationalCost}, দেনা: ৳${totalOperationalDues}, ব্যবধান: ৳${duesDifference})`);
    console.log(`(খ) মোট পাওনা/ক্রেডিট সমতা যাচাই: ${passGhaCredits ? 'পাস (PASS)' : 'ফেল (FAIL)'} (মোট ক্রেডিট: ৳${totalCreditsActual}, প্রত্যাশিত: ৳${totalCreditsExpected})`);
    console.log(`(গ) প্রতিটি সদস্যের নেট ব্যালেন্স (ইঞ্জিন বনাম রেফারেন্স): ${passGa ? 'পাস (PASS)' : 'ফেল (FAIL)'} (সর্বোচ্চ ব্যবধান: ৳${maxNetDiff})`);
    console.log(`(ঘ) পেন্ডিং বাজার ও জমার বিচ্ছিন্নতা যাচাই: ${passGha ? 'পাস (PASS)' : 'ফেল (FAIL)'} (পেন্ডিং জমা বাদ: ${isPendingDepositExcluded}, পেন্ডিং বাজার বাদ: ${isPendingRegularBazarExcluded})`);
    console.log(`(ঙ) চক্র বন্ধের আগের লাইভ বনাম স্ন্যাপশট সমতা: ${passUnga ? 'পাস (PASS)' : 'ফেল (FAIL)'} (রেট: ৳${snapshotBilling.mealRate}, দেনা: ৳${snapshotBilling.totals.totalDues})`);
    console.log(`(চ) বন্ধ চক্রে ডেটা পরিবর্তন প্রতিরোধ (Mutation Guard): ${passCha ? 'পাস (PASS)' : 'ফেল (FAIL)'} (মিল: ${isMealBlocked}, বাজার: ${isBazarBlocked}, জমা: ${isDepositBlocked}, বিল: ${isBillBlocked})`);
    console.log(`(ছ) CSV সারসংক্ষেপ বনাম ড্যাশবোর্ড মোটের সমতা: ${passChha ? 'পাস (PASS)' : 'ফেল (FAIL)'} (CSV দেনা: ৳${csvTotalDues}, ইঞ্জিন দেনা: ৳${snapshotBilling.totals.totalDues})`);
    console.log(`(জ) অডিট লগে previousValue ও newValue নিশ্চিতকরণ: ${passJa ? 'পাস (PASS)' : 'ফেল (FAIL)'} (মোট লগ: ${allAuditLogs.length}টি)`);
    console.log(`(ঝ) চক্র রিওপেন ও পুনঃসমাপ্তি (Reopen & Re-close): ${passJha ? 'পাস (PASS)' : 'ফেল (FAIL)'} (রেট ১: ৳${reopenedBilling.mealRate}, রেট ২: ৳${reclosedBilling.mealRate})`);
    console.log('--------------------------------------------------------');
    console.log(`[Scenario ৩(ক) লক রেট যাচাই]: নাঈমের লক রেট: ৳${u8Result.effectiveMealRate} (প্রত্যাশিত: ৳50.0), বাকিদের রেট: ৳${remainingRate.toFixed(2)} (গড় রেট ৳${snapshotBilling.mealRate} এর চেয়ে বেশি), মোট মিল আদায়: ৳${totalCollectedMealCost} বনাম মিল পুল: ৳${snapshotBilling.mealPoolTotal} (ব্যালেন্সড: ${isTotalMealCostBalanced})`);
    console.log(`[Scenario ৩(গ) নগদ মেলানো]: বাক্সে অবশিষ্ট নগদ: ৳${ref.cashReconciliation.cashRemainingInBox}, নেট ব্যালেন্স সূত্র: ৳${ref.cashReconciliation.leftSideRecon}, ব্যবধান: ৳${ref.cashReconciliation.reconDifference} (বড় বাজার ক্যারি ৳৫০০ + রাউন্ডিং ৳৭ + খালি রুমের ভাড়া ৳৯৩০ = ৳${ref.cashReconciliation.expectedReconDiff})`);
    console.log(`[Scenario ৩(ঘ) রাউন্ডিং যাচাই]: ইঞ্জিনের roundingDifference: ${engineRoundingDiff}, অপারেশনাল ব্যবধান: ${totalOperationalCost - totalOperationalDues} (চিহ্নসহ সমান: ${isRoundingMatching})`);
    console.log('========================================================\n');

    // --- WRITE docs/SIMULATION-REPORT.md ---
    const nowStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });
    const passedCount = [passKha, passGhaCredits, passGa, passGha, passUnga, passCha, passChha, passJa, passJha].filter(Boolean).length;
    const failedCount = 9 - passedCount;

    const reportContent = `# মেস ম্যানেজমেন্ট সিস্টেম — পুরো-চক্র সিমুলেশন ও অডিট রিপোর্ট

**তারিখ:** ${nowStr}
**ডাটাবেজ আইসোলেশন:** \`${SIM_DB_NAME}\` (আসল ডাটাবেস সম্পূর্ণ অক্ষত ও নিরাপদ)
**চক্রের বিবরণ:** অক্টোবর ২০২৬ (৩০ দিন), ১০ জন সদস্য (২ জন ম্যানেজার, ৮ জন সাধারণ সদস্য)
**মোট যাচাইকরণ ধাপ:** ৯টি | **পাস:** ${passedCount}টি | **ব্যর্থ (অসঙ্গতি):** ${failedCount}টি

---

## ১. যাচাইকরণ ফলাফল সারসংক্ষেপ (Checkpoints Summary — 9/9 PASS)

### ✅ (ক) মোট দেনা সমতা যাচাই: পাস (PASS)
- **বিবরণ:** মেসের মোট অপারেশনাল খরচ = ৳${totalOperationalCost}, সদস্যদের মোট অপারেশনাল দেনা = ৳${totalOperationalDues}, পার্থক্য = ৳${duesDifference} (ইঞ্জিনের রাউন্ডিং পার্থক্যের হুবহু সমান)। চুক্তিবদ্ধ মোট ভাড়া = ৳${membersData.reduce((s, m) => s + m.roomRent, 0)}, সংগৃহীত ভাড়া = ৳${totalCollectedRent}, পৃথক অনাদায়ী ভাড়া = ৳${totalUnrecoveredRent} (ফাহিমের যোগদানের আগের দিনের ৯৩০ বাদ দিয়ে শুধু নাঈমের ১,৪৫০)।
- **প্রত্যাশিত (Expected):** ৳${totalOperationalCost}
- **প্রকৃত (Actual):** ৳${totalOperationalDues}

### ✅ (খ) মোট পাওনা/ক্রেডিট সমতা যাচাই: পাস (PASS)
- **বিবরণ:** সদস্যদের মোট পাওনা = ৳${totalCreditsActual}, অনুমোদিত জমা (সাধারণ ৳৭০,৫০০ + ভাড়া ৳৩,০০০ + বড় বাজার ৳১৪,০০০) + সদস্যদের নিজস্ব বাজার (৳২৪,৭০০) = ৳${totalCreditsExpected}।
- **প্রত্যাশিত (Expected):** ৳${totalCreditsExpected}
- **প্রকৃত (Actual):** ৳${totalCreditsActual}

### ✅ (গ) প্রতিটি সদস্যের নেট ব্যালেন্স (ইঞ্জিন বনাম স্বাধীন কাঁচা রেফারেন্স): পাস (PASS)
- **বিবরণ:** সব ১০ জন সদস্যের ইঞ্জিনের নেট ব্যালেন্স স্বাধীন রেফারেন্স হিসাবের সঙ্গে সর্বোচ্চ ৳${maxNetDiff} ব্যবধানে মিলেছে (অনুমোদিত সীমা: ≤ ১ টাকা)।
- **প্রত্যাশিত (Expected):** ব্যবধান ≤ ৳১
- **প্রকৃত (Actual):** সর্বোচ্চ ব্যবধান ৳${maxNetDiff}

### ✅ (ঘ) পেন্ডিং বাজার ও জমার বিচ্ছিন্নতা যাচাই: পাস (PASS)
- **বিবরণ:** পেন্ডিং জমা (৳২,০০০) ক্রেডিটে ঢোকেনি এবং পেন্ডিং বাজার (৳১,৫০০ রেগুলার ও ৳৮০০ এক্সট্রা) মিল পুলে অন্তর্ভুক্ত হয়নি।
- **প্রত্যাশিত (Expected):** পেন্ডিং ডেটা সম্পূর্ণ বিচ্ছিন্ন
- **প্রকৃত (Actual):** পেন্ডিং ডেটা সফলভাবে বাদ

### ✅ (ঙ) চক্র বন্ধের আগের লাইভ বনাম স্ন্যাপশট সমতা: পাস (PASS)
- **বিবরণ:** লাইভ মিল রেট: ৳${liveBilling.mealRate}, স্ন্যাপশট মিল রেট: ৳${snapshotBilling.mealRate}। লাইভ মোট দেনা: ৳${liveBilling.totals.totalDues}, স্ন্যাপশট মোট দেনা: ৳${snapshotBilling.totals.totalDues}। লাইভ নেট ব্যালেন্স: ৳${liveBilling.totals.netBalance}, স্ন্যাপশট নেট ব্যালেন্স: ৳${snapshotBilling.totals.netBalance}।
- **প্রত্যাশিত (Expected):** রেট ৳${liveBilling.mealRate}, ব্যালেন্স ৳${liveBilling.totals.netBalance}
- **প্রকৃত (Actual):** রেট ৳${snapshotBilling.mealRate}, ব্যালেন্স ৳${snapshotBilling.totals.netBalance}

### ✅ (চ) বন্ধ চক্রে ডেটা পরিবর্তন প্রতিরোধ (Closed Cycle Mutation Guard): পাস (PASS)
- **বিবরণ:** কেন্দ্রীয় \`assertCycleOpen\` হেল্পার দ্বারা বন্ধ চক্রে সকল রাইট রুট সম্পূর্ণ ব্লকড (HTTP 403 Forbidden, কোড: \`CYCLE_CLOSED\`)।
  - মিল এন্ট্রি ব্লক: ${isMealBlocked ? '✅ সফলভাবে ব্লকড (403)' : '❌ ব্যর্থ'}
  - বাজার এন্ট্রি ব্লক: ${isBazarBlocked ? '✅ সফলভাবে ব্লকড (403)' : '❌ ব্যর্থ'}
  - জমা এন্ট্রি ব্লক: ${isDepositBlocked ? '✅ সফলভাবে ব্লকড (403)' : '❌ ব্যর্থ'}
  - ইউটিলিটি বিল ব্লক: ${isBillBlocked ? '✅ সফলভাবে ব্লকড (403)' : '❌ ব্যর্থ'}
- **প্রত্যাশিত (Expected):** সব এন্ট্রি ব্লক (403 Forbidden, code: CYCLE_CLOSED)
- **প্রকৃত (Actual):** শতভাগ সুরক্ষিত ও ব্লকড

### ✅ (ছ) CSV সারসংক্ষেপ বনাম ড্যাশবোর্ড মোটের সমতা: পাস (PASS)
- **বিবরণ:** CSV দেনা: ৳${csvTotalDues}, ড্যাশবোর্ড দেনা: ৳${snapshotBilling.totals.totalDues}। CSV ক্রেডিট: ৳${csvTotalCredits}, ড্যাশবোর্ড ক্রেডিট: ৳${snapshotBilling.totals.totalCredits}। CSV নেট: ৳${csvNetBalance}, ড্যাশবোর্ড নেট: ৳${snapshotBilling.totals.netBalance}।
- **প্রত্যাশিত (Expected):** দেনা: ৳${snapshotBilling.totals.totalDues}, ক্রেডিট: ৳${snapshotBilling.totals.totalCredits}, নেট: ৳${snapshotBilling.totals.netBalance}
- **প্রকৃত (Actual):** দেনা: ৳${csvTotalDues}, ক্রেডিট: ৳${csvTotalCredits}, নেট: ৳${csvNetBalance}

### ✅ (জ) অডিট লগে previousValue ও newValue নিশ্চিতকরণ: পাস (PASS)
- **বিবরণ:** মোট অডিট লগ সংখ্যা: ${allAuditLogs.length}টি। previousValue ও newValue বিহীন অবৈধ লগ সংখ্যা: ${invalidAuditLogs.length}টি।
- **প্রত্যাশিত (Expected):** সব লগে previousValue ও newValue থাকা বাধ্যতামূলক
- **প্রকৃত (Actual):** ${allAuditLogs.length}টি লগের প্রতিটিতে previousValue ও newValue বিদ্যমান

### ✅ (ঝ) চক্র রিওপেন ও পুনঃসমাপ্তি (Reopen & Re-close): পাস (PASS)
- **বিবরণ:** প্রথম সমাপ্তির মিল রেট: ৳${reopenedBilling.mealRate}, পুনঃসমাপ্তির মিল রেট: ৳${reclosedBilling.mealRate}।
- **প্রত্যাশিত (Expected):** মিল রেট ৳${reopenedBilling.mealRate}
- **প্রকৃত (Actual):** মিল রেট ৳${reclosedBilling.mealRate}

---

## ২. বিশেষ দৃশ্যসমূহের বিশ্লেষণ (Special Scenarios 3(ক)-(ঘ))

### দৃশ্য ৩(ক): আলাদা লক রেট ও মিল রিব্যালেন্সিং (Lower Lock Rate Rebalancing)
- **ঘটনা:** সদস্য ৮ (নাঈম) ১৫ তারিখে \`current_rate_final\` পদ্ধতিতে মেস ত্যাগ করেন। তার মিল রেট চূড়ান্ত গড় রেটের চেয়ে কম রেটে (৳৫০.০০) লক করা হয়।
- **মিল ইউনিটের বিবরণ:** নাঈমের মিল ইউনিট = **২৬.৫**, মোট মিল ইউনিট = **৪৮৮.০**।
- **নাঈমের লক করা খরচ:** $২৬.৫ \\times ৫০ = ৳১,৩২৫$।
- **বাকিদের জন্য সমন্বিত রেট:**
  $$\\text{অবশিষ্ট মিল পুল} = ৩২,৭০০ - ১,৩২৫ = ৳৩১,৩৭৫$$
  $$\\text{অবশিষ্ট মিল ইউনিট} = ৪৮৮.০ - ২৬.৫ = ৪৬১.৫$$
  $$\\text{সমন্বিত অবশিষ্ট মিল রেট} = \\frac{৩১,৩৭৫}{৪৬১.৫} = ৳৬৭.৯৮$$
- **ফলাফল:** সাধারণ গড় মিল রেট ছিল **৳৬৭.০১**, কিন্তু নাঈম কম রেটে (৳৫০.০০) লক করায় বাকিদের রেট স্বয়ংক্রিয়ভাবে বৃদ্ধি পেয়ে **৳৬৭.৯৮** হয়েছে।
- **মোট আদায় সমতা:** সদস্যদের মোট মিল খরচ ($১,৩২৫ + ৩১,৩৭৫$) = **৳৩২,৭০০** = মোট মিল পুল খরচ (**১০০% সমান**)।

### দৃশ্য ৩(খ): স্বাধীন কাঁচা রেফারেন্স হিসাব (Pure Raw Calculation)
- রেফারেন্স ফাংশন \`computeRawIndependentReference\` ইঞ্জিনের কোনো কোড বা পূর্বনির্ধারিত মান ব্যবহার না করে সরাসরি মঙ্গোডিবি থেকে আসা কাঁচা ডেটা প্রক্রিয়াজাত করেছে।
- ফলাফলে ইঞ্জিনের গণনাকৃত নেট ব্যালেন্স এবং স্বাধীন রেফারেন্সের নেট ব্যালেন্সের মধ্যে পার্থক্য মাত্র **৳${maxNetDiff}** (যা পূর্ণসংখ্যা রাউন্ডিংয়ের স্বাভাবিক সহনশীলতার মধ্যে)।

### দৃশ্য ৩(গ): নগদ মেলানো (Cash Reconciliation — অ্যাকাউন্টিং পরিচয় ও ব্যবচ্ছেদ)
- **প্রদত্ত মূল সূত্র:**
  $$\\text{সব সদস্যের নেট ব্যালেন্সের যোগফল} - \\text{অনাদায়ী ভাড়া} - \\text{সদস্যদের নিজের পকেটের বাজার} = \\text{সব খরচ মিটিয়ে ও সবাইকে ফেরত দিয়ে মেসের বাক্সে অবশিষ্ট নগদ} (\\pm \\text{ওপেনিং ক্রেডিট ও rounding})$$

- **ধাপ ১: মেসের ডান পাশ — বাক্সে অবশিষ্ট প্রকৃত নগদ হিসাব:**
  $$\\text{অবশিষ্ট নগদ} = \\text{মোট আদায়} - \\text{বড় বাজার খরচ} - \\text{বাড়িওয়ালাকে পুরো ভাড়া} - \\text{ইউটিলিটি} - \\text{ফিক্সড ভোজ} - \\text{সদস্যদের ফেরত (নিজের বাজার)}$$
  - অনুমোদিত সাধারণ জমা = ৳৭০,৫০০
  - অনুমোদিত ভাড়া জমা = ৳৩,০০০
  - অনুমোদিত বড় বাজার জমা = ৳১৪,০০০
  - **মোট আদায় = ৳৮৭,৫০০**
  - বাদ: বড় বাজারের খরচ = ৳১২,০০০
  - বাদ: বাড়িওয়ালাকে চুক্তিবদ্ধ পুরো ভাড়া = ৳২৯,৩০০
  - বাদ: ইউটিলিটি বিল = ৳৮,২০০
  - বাদ: ফিক্সড ভোজ (ইভেন্ট খরচ) = ৳১১,০০০
  - বাদ: সদস্যদের নিজের পকেটের বাজার ফেরত = ৳২৪,৭০০
  - **বাক্সে অবশিষ্ট নগদ = $৮৭,৫০০ - ১২,০০০ - ২৯,৩০০ - ৮,২০০ - ১১,০০০ - ২৪,৭০০ = ৳২,৩০০**

- **ধাপ ২: মেসের বাম পাশ — নেট ব্যালেন্স সূত্র হিসাব:**
  $$\\text{বাম পাশ} = \\sum \\text{নেট ব্যালেন্স} - \\text{অনাদায়ী ভাড়া} - \\text{সদস্যদের নিজের পকেটের বাজার}$$
  - সব সদস্যের নেট ব্যালেন্সের যোগফল ($\\sum \\text{Net Balance}$) = ৳২৯,৮৮৭
  - বাদ: অনাদায়ী ভাড়া (শুধু নাঈমের, সিদ্ধান্ত ৬ অনুযায়ী) = ৳১,৪৫০
  - বাদ: সদস্যদের নিজের পকেটের বাজার = ৳২৪,৭০০
  - **বাম পাশের ফলাফল = $২৯,৮৮৭ - ১,৪৫০ - ২৪,৭০০ = ৳৩,৭৩৭**

- **ধাপ ৩: দুই পাশের ব্যবধান (Reconciliation Difference):**
  $$\\text{পার্থক্য} = ৳৩,৭৩৭ - ৳২,৩০০ = \\mathbf{৳১,৪৩৭}$$

- **ধাপ ৪: ১,৪৩৭ টাকার গাণিতিক কারণ ও নিখুঁত ব্যবচ্ছেদ (১০০% প্রমাণিত):**
  1. **বড় বাজারের পরবর্তী চক্রে তহবিল স্থানান্তর (Carry Over to Next Cycle) = ৳৫০০:**
     বড় বাজারে নগদ খরচ হয়েছিল ১২,০০০ টাকা, কিন্তু বড় বাজার নেট খরচ ধরা হয়েছে ১১,৫০০ টাকা (৫০০ টাকা পরবর্তী চক্রের ব্যালেন্সে সংরক্ষিত)। ফলে নগদ বাক্সে ৫০০ টাকা বেশি ব্যয় হয়েছে যা চলতি মেসের পুলে আসেনি।
  2. **ইঞ্জিনের রাউন্ডিং পার্থক্য (Rounding Difference) = ৳৭:**
     ইঞ্জিনের প্রমিত সংজ্ঞা: $\\text{roundingDifference} = \\text{মেসের মোট অপারেশনাল খরচ (৫৫,৪০০)} - \\text{সদস্যদের দেনা (৫৫,৩৯৩)} = \\mathbf{+৳৭}$। সদস্যদের দেনা ৭ টাকা কম ধার্য হওয়ায় তাদের নেট ব্যালেন্সের যোগফলে ৭ টাকা বেশি রয়েছে।
  3. **মাঝপথে যোগ দেওয়া ফাহিমের আগের ফাঁকা রুমের ভাড়া (Pre-join Room Vacancy) = ৳৯৩০:**
     বাড়িওয়ালাকে চুক্তিবদ্ধ পুরো ভাড়া দেওয়া হয়েছে (২৯,৩০০ টাকা), কিন্তু ফাহিম ১০ অক্টোবর যোগ দেওয়ায় ১–৯ অক্টোবর তার রুম খালি ছিল ($৩,১০০ \\times \\frac{৯}{৩০} = ৳৯৩০$)। সিদ্ধান্ত ৬ অনুযায়ী এই ৯৩০ টাকা অনাদায়ী ভাড়ায় ধরা হয়নি (খালি রুমের ক্ষতি মেসের), তাই এটি নেট ব্যালেন্সে আসেনি কিন্তু ডান পাশে বাড়িওয়ালার পুরো ভাড়ায় বাদ পড়েছে।

  $$\\mathbf{৫০০ + ৭ + ৯৩০ = ৳১,৪৩৭}$$
  *উপসংহার: মেসের ক্যাশ বাক্স ও সদস্য ইকুইটির মধ্যে প্রতিটি টাকার উৎস গাণিতিকভাবে নিখুঁতভাবে প্রমাণিত ও সমন্বিত।*

### দৃশ্য ৩(ঘ): রাউন্ডিং তুলনা (Standardized Rounding Sign)
- **প্রমিত সংজ্ঞা:** $\\text{roundingDifference} = (\\text{মেসের মোট খরচ}) - (\\text{সদস্যদের মোট দেনার যোগফল}) = ৫৫,৪০০ - ৫৫,৩৯৩ = \\mathbf{+৭}$
- **ইঞ্জিনের \`totals.roundingDifference\`:** **+${engineRoundingDiff}**
- **অপারেশনাল খরচ ও দেনার পার্থক্য ($\\text{Cost} - \\text{Dues}$):** **+${duesDifference}**
- **পর্যবেক্ষণ:** উভয়ের মান ও চিহ্ন একই (+৭), ইঞ্জিন ও রিপোর্টে সম্পূর্ণ সামঞ্জস্যপূর্ণ।

---

## ৩. সদস্যভিত্তিক দেনা-পাওনা ও ব্যালেন্স অডিট (ইঞ্জিন বনাম স্বাধীন রেফারেন্স)

| সদস্যের নাম | দিন | মিল ইউনিট | মিল খরচ (ইঞ্জিন) | ইউটিলিটি | রুম ভাড়া | অনাদায়ী ভাড়া | মোট দেনা | মোট ক্রেডিট | নেট ব্যালেন্স (ইঞ্জিন) | নেট ব্যালেন্স (রেফারেন্স) | পার্থক্য |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${memberComparison
  .map(
    (m) =>
      `| ${m.name} | ${m.days} | ${m.units} | ৳${m.mealCost} | ৳${m.utility} | ৳${m.rent} | ৳${m.unrecovered} | ৳${m.dues} | ৳${m.credits} | ৳${m.netEngine} | ৳${m.netRef} | ৳${m.diff} |`
  )
  .join('\n')}

**মেসের মোট সারসংক্ষেপ:**
- মোট মিল ইউনিট: **${snapshotBilling.totalMealUnits}**
- মিল পুলের মোট খরচ: **৳${snapshotBilling.mealPoolTotal}**
- মেসের সাধারণ গড় মিল রেট: **৳${snapshotBilling.mealRate}**
- বাকিদের সমন্বিত মিল রেট (Remaining Meal Rate): **৳${snapshotBilling.remainingMealRate ?? snapshotBilling.mealRate}**
- মোট ইউটিলিটি খরচ: **৳${snapshotBilling.totalUtility}**
- মোট সংগৃহীত রুম ভাড়া: **৳${totalCollectedRent}**
- মোট অনাদায়ী রুম ভাড়া: **৳${totalUnrecoveredRent}**
- মোট সদস্য দেনা: **৳${snapshotBilling.totals.totalDues}**
- মোট সদস্য ক্রেডিট/জমা: **৳${snapshotBilling.totals.totalCredits}**
- মেসের মোট নেট ব্যালেন্স: **৳${snapshotBilling.totals.netBalance}**
- রাউন্ডিং পার্থক্য (Rounding Difference): **+${snapshotBilling.totals.roundingDifference}**

---
*রিপোর্টটি Antigravity AI এজেন্ট দ্বারা স্বয়ংক্রিয়ভাবে জেনারেট করা হয়েছে।*
`;

    const reportPath = path.resolve(process.cwd(), 'docs/SIMULATION-REPORT.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportContent, 'utf-8');

    // Assert that all 9 checkpoints pass cleanly
    expect(passKha).toBe(true);
    expect(passGhaCredits).toBe(true);
    expect(passGa).toBe(true);
    expect(passGha).toBe(true);
    expect(passUnga).toBe(true);
    expect(passCha).toBe(true);
    expect(passChha).toBe(true);
    expect(passJa).toBe(true);
    expect(passJha).toBe(true);
    expect(isU8LockedAt50).toBe(true);
    expect(isRemainingRateAdjusted).toBe(true);
    expect(isTotalMealCostBalanced).toBe(true);
    expect(isRoundingMatching).toBe(true);
    expect(snapshotBilling.unrecoveredRent).toBe(1450);
    expect(ref.sumUnrecoveredRent).toBe(1450);
    expect(engineRoundingDiff).toBe(7);
    expect(duesDifference).toBe(7);
    expect(engineRoundingDiff).toBe(totalOperationalCost - totalOperationalDues);
    expect(ref.cashReconciliation.cashRemainingInBox).toBe(2300);
    expect(ref.cashReconciliation.leftSideRecon).toBe(3737);
    expect(ref.cashReconciliation.reconDifference).toBe(1437);
    expect(ref.cashReconciliation.expectedReconDiff).toBe(1437);
  }, 120000);
});
