import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import dns from 'dns';
import path from 'path';
import * as dotenv from 'dotenv';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SIM_DB_NAME = 'mess_manager_sim';
if (!SIM_DB_NAME.includes('sim')) {
  throw new Error("Safety check failed: database must contain 'sim'");
}
process.env.MONGODB_DB_NAME = SIM_DB_NAME;

let currentSession: any = {
  user: { id: 'u1', name: 'কামাল (ম্যানেজার)', email: 'manager1@mess.com', role: 'admin' },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

import { getDb } from './db';
import { POST as mealsPOST } from '../app/api/meals/route';
import { POST as mealReqPOST, PATCH as mealReqPATCH } from '../app/api/meal-requests/route';
import { POST as bazarsPOST, PATCH as bazarsPATCH, DELETE as bazarsDELETE } from '../app/api/bazars/route';
import { POST as depositsPOST } from '../app/api/deposits/route';
import { POST as billsPOST, DELETE as billsDELETE } from '../app/api/bills/route';
import { POST as fixedEventsPOST } from '../app/api/fixed-events/route';
import { POST as slotsPOST } from '../app/api/slots/route';
import { POST as rentPOST } from '../app/api/rent/route';
import { POST as membersPOST } from '../app/api/members/route';
import { POST as cyclesPOST, PATCH as cyclesPATCH } from '../app/api/cycles/route';

function makeReq(body: any, method = 'POST', url = 'http://localhost:3000/api'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Central assertCycleOpen Guard on Closed Cycles', () => {
  beforeEach(async () => {
    const db = await getDb(SIM_DB_NAME);
    if (!db || !db.databaseName.includes('sim')) {
      throw new Error('Not connected to simulation database!');
    }

    // Set up a closed cycle
    await db.collection('cycles').deleteMany({ _id: 'cycle_closed_test' as any });
    await db.collection('cycles').insertOne({
      _id: 'cycle_closed_test' as any,
      messId: 'mess_1',
      name: 'বন্ধ চক্র টেস্ট',
      status: 'closed',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed dummy items linked to closed cycle
    await db.collection('bazars').deleteMany({ _id: 'bazar_closed_test' as any });
    await db.collection('bazars').insertOne({
      _id: 'bazar_closed_test' as any,
      cycleId: 'cycle_closed_test',
      userId: 'u1',
      amount: 500,
      status: 'pending',
      type: 'regular',
    });

    await db.collection('deposits').deleteMany({ _id: 'deposit_closed_test' as any });
    await db.collection('deposits').insertOne({
      _id: 'deposit_closed_test' as any,
      cycleId: 'cycle_closed_test',
      userId: 'u1',
      amount: 1000,
      status: 'pending',
      type: 'general',
      isPaid: false,
    });

    await db.collection('bills').deleteMany({ _id: 'bill_closed_test' as any });
    await db.collection('bills').insertOne({
      _id: 'bill_closed_test' as any,
      cycleId: 'cycle_closed_test',
      type: 'বিদ্যুৎ বিল',
      amount: 1200,
    });

    await db.collection('meal_requests').deleteMany({ _id: 'mr_closed_test' as any });
    await db.collection('meal_requests').insertOne({
      _id: 'mr_closed_test' as any,
      cycleId: 'cycle_closed_test',
      userId: 'u1',
      date: '2026-09-15',
      slotId: 'morning',
      status: 'pending',
      action: 'off',
    });
  });

  it('1. blocks meals mutation on closed cycle', async () => {
    const res = await mealsPOST(makeReq({ cycleId: 'cycle_closed_test', date: '2026-09-10', entries: [{ userId: 'u1', morning: 1 }] }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('CYCLE_CLOSED');
  });

  it('2. blocks meal-requests on closed cycle (POST & PATCH)', async () => {
    const postRes = await mealReqPOST(makeReq({ cycleId: 'cycle_closed_test', userId: 'u1', date: '2026-09-12', slotId: 'night', action: 'off' }));
    expect(postRes.status).toBe(403);
    expect((await postRes.json()).code).toBe('CYCLE_CLOSED');

    const patchRes = await mealReqPATCH(makeReq({ id: 'mr_closed_test', status: 'approved' }));
    expect(patchRes.status).toBe(403);
    expect((await patchRes.json()).code).toBe('CYCLE_CLOSED');
  });

  it('3. blocks bazars mutation on closed cycle (POST, PATCH, DELETE)', async () => {
    const postRes = await bazarsPOST(makeReq({ cycleId: 'cycle_closed_test', userId: 'u1', amount: 500, type: 'regular', date: '2026-09-15' }));
    expect(postRes.status).toBe(403);
    expect((await postRes.json()).code).toBe('CYCLE_CLOSED');

    const patchRes = await bazarsPATCH(makeReq({ id: 'bazar_closed_test', status: 'approved' }));
    expect(patchRes.status).toBe(403);
    expect((await patchRes.json()).code).toBe('CYCLE_CLOSED');

    const delRes = await bazarsDELETE(new Request('http://localhost:3000/api/bazars?id=bazar_closed_test', { method: 'DELETE' }));
    expect(delRes.status).toBe(403);
    expect((await delRes.json()).code).toBe('CYCLE_CLOSED');
  });

  it('4. blocks deposits mutation on closed cycle (create, approve, reject, delete)', async () => {
    const createRes = await depositsPOST(makeReq({ cycleId: 'cycle_closed_test', userId: 'u1', amount: 500, type: 'general' }));
    expect(createRes.status).toBe(403);
    expect((await createRes.json()).code).toBe('CYCLE_CLOSED');

    const approveRes = await depositsPOST(makeReq({ action: 'approve_deposit', depositId: 'deposit_closed_test' }));
    expect(approveRes.status).toBe(403);
    expect((await approveRes.json()).code).toBe('CYCLE_CLOSED');

    const rejectRes = await depositsPOST(makeReq({ action: 'reject_deposit', depositId: 'deposit_closed_test' }));
    expect(rejectRes.status).toBe(403);
    expect((await rejectRes.json()).code).toBe('CYCLE_CLOSED');

    const delRes = await depositsPOST(makeReq({ action: 'delete_deposit', depositId: 'deposit_closed_test' }));
    expect(delRes.status).toBe(403);
    expect((await delRes.json()).code).toBe('CYCLE_CLOSED');
  });

  it('5. blocks bills mutation on closed cycle (POST & DELETE)', async () => {
    const postRes = await billsPOST(makeReq({ cycleId: 'cycle_closed_test', type: 'ওয়াইফাই বিল', amount: 800 }));
    expect(postRes.status).toBe(403);
    expect((await postRes.json()).code).toBe('CYCLE_CLOSED');

    const delRes = await billsDELETE(new Request('http://localhost:3000/api/bills?id=bill_closed_test', { method: 'DELETE' }));
    expect(delRes.status).toBe(403);
    expect((await delRes.json()).code).toBe('CYCLE_CLOSED');
  });

  it('6. blocks fixed-events creation on closed cycle', async () => {
    const res = await fixedEventsPOST(makeReq({ cycleId: 'cycle_closed_test', title: 'বিশেষ ভোজ', cost: 1500, date: '2026-09-20' }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CYCLE_CLOSED');
  });

  it('7. blocks slots actions on closed cycle', async () => {
    const res = await slotsPOST(makeReq({ action: 'auto_generate', cycleId: 'cycle_closed_test' }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CYCLE_CLOSED');
  });

  it('8. blocks rent actions on closed cycle', async () => {
    const res = await rentPOST(makeReq({ action: 'mark_rent_paid', cycleId: 'cycle_closed_test', userId: 'u1', amount: 3000 }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CYCLE_CLOSED');
  });

  it('9. blocks cycle-related member actions on closed cycle', async () => {
    const res = await membersPOST(makeReq({ action: 'update_rent', cycleId: 'cycle_closed_test', userId: 'u1', roomRent: 3500 }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CYCLE_CLOSED');
  });

  it('10. blocks cycle config updates on closed cycle (POST & PATCH)', async () => {
    const postRes = await cyclesPOST(makeReq({ action: 'update_cycle_config', cycleId: 'cycle_closed_test', name: 'নতুন নাম' }));
    expect(postRes.status).toBe(403);
    expect((await postRes.json()).code).toBe('CYCLE_CLOSED');

    const patchRes = await cyclesPATCH(makeReq({ cycleId: 'cycle_closed_test', isBigBazarEnabled: false }));
    expect(patchRes.status).toBe(403);
    expect((await patchRes.json()).code).toBe('CYCLE_CLOSED');
  });

  it('11. ALLOWS reopen_cycle on closed cycle as the only valid exception', async () => {
    const res = await cyclesPOST(makeReq({ action: 'reopen_cycle', cycleId: 'cycle_closed_test' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const db = await getDb(SIM_DB_NAME);
    const updated = await db?.collection('cycles').findOne({ _id: 'cycle_closed_test' as any });
    expect(updated?.status).toBe('open');
  });
});
