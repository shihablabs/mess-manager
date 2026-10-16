import { describe, it, expect, vi, beforeEach } from 'vitest';
import dns from 'dns';
import path from 'path';
import * as dotenv from 'dotenv';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SIM_DB_NAME = 'mess_manager_sim';
process.env.MONGODB_DB_NAME = SIM_DB_NAME;

let currentSession: any = null;

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

import { GET as backupGET, POST as backupPOST } from '../app/api/backup/route';
import { GET as membersGET, POST as membersPOST } from '../app/api/members/route';
import { GET as cyclesGET, POST as cyclesPOST, PATCH as cyclesPATCH } from '../app/api/cycles/route';
import { GET as settingsGET, POST as settingsPOST } from '../app/api/settings/route';
import { GET as billsGET, POST as billsPOST, DELETE as billsDELETE } from '../app/api/bills/route';
import { GET as fixedEventsGET, POST as fixedEventsPOST } from '../app/api/fixed-events/route';
import { GET as slotsGET, POST as slotsPOST } from '../app/api/slots/route';
import { GET as exportGET } from '../app/api/export/route';
import { GET as mealsGET, POST as mealsPOST, DELETE as mealsDELETE } from '../app/api/meals/route';
import { GET as mealReqGET, POST as mealReqPOST, PATCH as mealReqPATCH } from '../app/api/meal-requests/route';
import { GET as bazarsGET, POST as bazarsPOST, PATCH as bazarsPATCH, DELETE as bazarsDELETE } from '../app/api/bazars/route';
import { GET as summaryGET } from '../app/api/summary/route';
import { GET as depositsGET, POST as depositsPOST } from '../app/api/deposits/route';

function makeReq(body: any = {}, method = 'POST', url = 'http://localhost:3000/api'): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

describe('Central Security Guard & RBAC Verification (SRS Step ১, ২, ৩, ৫)', () => {
  describe('১. Unauthenticated Access (401 Unauthorized)', () => {
    beforeEach(() => {
      currentSession = null; // No session
    });

    it('rejects /api/backup (GET & POST) with 401', async () => {
      const getRes = await backupGET(makeReq({}, 'GET', 'http://localhost:3000/api/backup'));
      expect(getRes.status).toBe(401);

      const postRes = await backupPOST(makeReq({ data: {} }));
      expect(postRes.status).toBe(401);
    });

    it('rejects /api/members (GET & POST) with 401', async () => {
      const getRes = await membersGET(makeReq({}, 'GET', 'http://localhost:3000/api/members'));
      expect(getRes.status).toBe(401);

      const postRes = await membersPOST(makeReq({ action: 'add_member', name: 'টেস্ট' }));
      expect(postRes.status).toBe(401);
    });

    it('rejects /api/cycles (GET, POST & PATCH) with 401', async () => {
      const getRes = await cyclesGET(makeReq({}, 'GET', 'http://localhost:3000/api/cycles'));
      expect(getRes.status).toBe(401);

      const postRes = await cyclesPOST(makeReq({ action: 'create_cycle' }));
      expect(postRes.status).toBe(401);

      const patchRes = await cyclesPATCH(makeReq({ isBigBazarEnabled: false }, 'PATCH'));
      expect(patchRes.status).toBe(401);
    });

    it('rejects /api/settings (GET & POST) with 401', async () => {
      const getRes = await settingsGET();
      expect(getRes.status).toBe(401);

      const postRes = await settingsPOST(makeReq({ action: 'update_meal_slots' }));
      expect(postRes.status).toBe(401);
    });

    it('rejects /api/bills (GET, POST & DELETE) with 401', async () => {
      const getRes = await billsGET(makeReq({}, 'GET', 'http://localhost:3000/api/bills'));
      expect(getRes.status).toBe(401);

      const postRes = await billsPOST(makeReq({ type: 'ওয়াইফাই', amount: 500 }));
      expect(postRes.status).toBe(401);

      const delRes = await billsDELETE(makeReq({}, 'DELETE', 'http://localhost:3000/api/bills?id=b1'));
      expect(delRes.status).toBe(401);
    });

    it('rejects /api/fixed-events (GET & POST) with 401', async () => {
      const getRes = await fixedEventsGET(makeReq({}, 'GET', 'http://localhost:3000/api/fixed-events'));
      expect(getRes.status).toBe(401);

      const postRes = await fixedEventsPOST(makeReq({ title: 'ফিস্ট', cost: 1000 }));
      expect(postRes.status).toBe(401);
    });

    it('rejects /api/slots (GET & POST) with 401', async () => {
      const getRes = await slotsGET(makeReq({}, 'GET', 'http://localhost:3000/api/slots'));
      expect(getRes.status).toBe(401);

      const postRes = await slotsPOST(makeReq({ action: 'auto_generate' }));
      expect(postRes.status).toBe(401);
    });

    it('rejects /api/export with 401', async () => {
      const getRes = await exportGET(makeReq({}, 'GET', 'http://localhost:3000/api/export'));
      expect(getRes.status).toBe(401);
    });

    it('rejects /api/meals (GET, POST, DELETE) with 401', async () => {
      const getRes = await mealsGET(makeReq({}, 'GET', 'http://localhost:3000/api/meals'));
      expect(getRes.status).toBe(401);

      const postRes = await mealsPOST(makeReq({ date: '2026-10-15', entries: [] }));
      expect(postRes.status).toBe(401);

      const delRes = await mealsDELETE(makeReq({}, 'DELETE', 'http://localhost:3000/api/meals?date=2026-10-15'));
      expect(delRes.status).toBe(401);
    });

    it('rejects /api/meal-requests (GET, POST, PATCH) with 401', async () => {
      const getRes = await mealReqGET(makeReq({}, 'GET', 'http://localhost:3000/api/meal-requests'));
      expect(getRes.status).toBe(401);

      const postRes = await mealReqPOST(makeReq({ date: '2026-10-15' }));
      expect(postRes.status).toBe(401);

      const patchRes = await mealReqPATCH(makeReq({ id: 'mr1', status: 'approved' }, 'PATCH'));
      expect(patchRes.status).toBe(401);
    });

    it('rejects /api/bazars (GET, POST, PATCH, DELETE) with 401', async () => {
      const getRes = await bazarsGET(makeReq({}, 'GET', 'http://localhost:3000/api/bazars'));
      expect(getRes.status).toBe(401);

      const postRes = await bazarsPOST(makeReq({ amount: 500 }));
      expect(postRes.status).toBe(401);

      const patchRes = await bazarsPATCH(makeReq({ id: 'baz1', status: 'approved' }, 'PATCH'));
      expect(patchRes.status).toBe(401);

      const delRes = await bazarsDELETE(makeReq({}, 'DELETE', 'http://localhost:3000/api/bazars?id=baz1'));
      expect(delRes.status).toBe(401);
    });

    it('rejects /api/summary with 401', async () => {
      const getRes = await summaryGET(makeReq({}, 'GET', 'http://localhost:3000/api/summary'));
      expect(getRes.status).toBe(401);
    });

    it('rejects /api/deposits (GET & POST) with 401', async () => {
      const getRes = await depositsGET(makeReq({}, 'GET', 'http://localhost:3000/api/deposits'));
      expect(getRes.status).toBe(401);

      const postRes = await depositsPOST(makeReq({ amount: 1000 }));
      expect(postRes.status).toBe(401);
    });
  });

  describe('২. Regular Member Attempting Protected Actions (403 Forbidden)', () => {
    beforeEach(() => {
      currentSession = {
        user: {
          id: 'member_rahim',
          name: 'রহিম (সাধারণ সদস্য)',
          email: 'rahim@mess.com',
          role: 'member',
          status: 'active',
        },
      };
    });

    it('blocks regular member from /api/backup (only super_admin allowed)', async () => {
      const getRes = await backupGET(makeReq({}, 'GET', 'http://localhost:3000/api/backup'));
      expect(getRes.status).toBe(403);

      const postRes = await backupPOST(makeReq({ data: {} }));
      expect(postRes.status).toBe(403);
    });

    it('blocks member from promoting themselves or anyone to admin (change_role)', async () => {
      // Trying to make himself admin
      const selfPromoteRes = await membersPOST(makeReq({
        action: 'change_role',
        userId: 'member_rahim',
        role: 'admin',
      }));
      expect(selfPromoteRes.status).toBe(403);

      // Trying to change someone else's role
      const otherRes = await membersPOST(makeReq({
        action: 'change_role',
        userId: 'other_member',
        role: 'admin',
      }));
      expect(otherRes.status).toBe(403);
    });

    it('blocks member from administrative member actions (add, approve, reject, delete)', async () => {
      const addRes = await membersPOST(makeReq({ action: 'add_member', name: 'নতুন', email: 'n@m.com' }));
      expect(addRes.status).toBe(403);

      const appRes = await membersPOST(makeReq({ action: 'approve_member', userId: 'u2' }));
      expect(appRes.status).toBe(403);

      const rejRes = await membersPOST(makeReq({ action: 'reject_member', userId: 'u2' }));
      expect(rejRes.status).toBe(403);

      const delRes = await membersPOST(makeReq({ action: 'delete_member', userId: 'u2' }));
      expect(delRes.status).toBe(403);
    });

    it('blocks member from cycles management (create, close, reopen, config, settle)', async () => {
      const createRes = await cyclesPOST(makeReq({ action: 'create_cycle', name: 'চক্র', startDate: '2026-11-01', endDate: '2026-11-30' }));
      expect(createRes.status).toBe(403);

      const patchRes = await cyclesPATCH(makeReq({ isBigBazarEnabled: false }, 'PATCH'));
      expect(patchRes.status).toBe(403);
    });

    it('blocks member from updating mess settings (POST /api/settings)', async () => {
      const res = await settingsPOST(makeReq({ action: 'update_meal_slots', mealSlots: [] }));
      expect(res.status).toBe(403);
    });

    it('blocks member from writing or deleting bills (/api/bills)', async () => {
      const postRes = await billsPOST(makeReq({ type: 'গ্যাস বিল', amount: 500 }));
      expect(postRes.status).toBe(403);

      const delRes = await billsDELETE(makeReq({}, 'DELETE', 'http://localhost:3000/api/bills?id=b1'));
      expect(delRes.status).toBe(403);
    });

    it('blocks member from creating fixed events (/api/fixed-events)', async () => {
      const res = await fixedEventsPOST(makeReq({ title: 'ফিস্ট', cost: 2000 }));
      expect(res.status).toBe(403);
    });

    it('blocks member from slots auto_generation and rotation (/api/slots)', async () => {
      const genRes = await slotsPOST(makeReq({ action: 'auto_generate' }));
      expect(genRes.status).toBe(403);

      const rotRes = await slotsPOST(makeReq({ action: 'rotate_slots' }));
      expect(rotRes.status).toBe(403);
    });

    it('blocks member from /api/export', async () => {
      const res = await exportGET(makeReq({}, 'GET', 'http://localhost:3000/api/export'));
      expect(res.status).toBe(403);
    });

    it('blocks member from editing meals for other members', async () => {
      const res = await mealsPOST(makeReq({
        date: '2026-10-15',
        entries: [
          { userId: 'other_member_id', morning: 1, night: 1 },
        ],
      }));
      expect(res.status).toBe(403);
    });

    it('blocks member from approving meal requests (/api/meal-requests PATCH)', async () => {
      const res = await mealReqPATCH(makeReq({ id: 'mr1', status: 'approved' }, 'PATCH'));
      expect(res.status).toBe(403);
    });

    it('blocks member from big bazar submission or submitting bazar for others', async () => {
      // Big bazar by member is forbidden
      const bigRes = await bazarsPOST(makeReq({ type: 'big', amount: 2000 }));
      expect(bigRes.status).toBe(403);

      // Submitting for other member is forbidden
      const otherRes = await bazarsPOST(makeReq({ userId: 'other_member_id', amount: 200 }));
      expect(otherRes.status).toBe(403);
    });

    it('blocks member from approving bazars (/api/bazars PATCH)', async () => {
      const res = await bazarsPATCH(makeReq({ id: 'baz1', status: 'approved' }, 'PATCH'));
      expect(res.status).toBe(403);
    });

    it('blocks member from approving or rejecting deposits (/api/deposits)', async () => {
      const appRes = await depositsPOST(makeReq({ action: 'approve_deposit', depositId: 'd1' }));
      expect(appRes.status).toBe(403);

      const rejRes = await depositsPOST(makeReq({ action: 'reject_deposit', depositId: 'd1' }));
      expect(rejRes.status).toBe(403);
    });

    it('blocks member from depositing into another user account', async () => {
      const res = await depositsPOST(makeReq({ userId: 'other_member_id', amount: 500 }));
      expect(res.status).toBe(403);
    });
  });

  describe('৩. Account Inactivity Guard (403 Forbidden)', () => {
    it('blocks pending member from active member endpoints', async () => {
      currentSession = {
        user: {
          id: 'pending_user',
          name: 'অপেক্ষমাণ সদস্য',
          email: 'pending@mess.com',
          role: 'member',
          status: 'pending',
        },
      };

      const memRes = await membersGET(makeReq({}, 'GET', 'http://localhost:3000/api/members'));
      expect(memRes.status).toBe(403);

      const sumRes = await summaryGET(makeReq({}, 'GET', 'http://localhost:3000/api/summary'));
      expect(sumRes.status).toBe(403);

      const mealRes = await mealsGET(makeReq({}, 'GET', 'http://localhost:3000/api/meals'));
      expect(mealRes.status).toBe(403);

      const depRes = await depositsGET(makeReq({}, 'GET', 'http://localhost:3000/api/deposits'));
      expect(depRes.status).toBe(403);
    });
  });

  describe('৪. Self-Role Modification Prevention (SRS Rule: কেউ নিজের ভূমিকা বদলাতে পারবে না)', () => {
    it('prevents manager from changing their own role', async () => {
      currentSession = {
        user: {
          id: 'manager_kamal',
          name: 'কামাল (ম্যানেজার)',
          email: 'kamal@mess.com',
          role: 'admin',
          status: 'active',
        },
      };

      const res = await membersPOST(makeReq({
        action: 'change_role',
        userId: 'manager_kamal',
        role: 'member',
      }));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('কেউ নিজের ভূমিকা নিজে পরিবর্তন করতে পারবে না');
    });
  });

  describe('৫. Authorized Roles Operations (200 OK)', () => {
    it('allows active member to view their dashboard data and submit for self', async () => {
      currentSession = {
        user: {
          id: 'member_rahim',
          name: 'রহিম',
          email: 'rahim@mess.com',
          role: 'member',
          status: 'active',
        },
      };

      const getSummary = await summaryGET(makeReq({}, 'GET', 'http://localhost:3000/api/summary'));
      expect(getSummary.status).toBe(200);

      const getMembers = await membersGET(makeReq({}, 'GET', 'http://localhost:3000/api/members'));
      expect(getMembers.status).toBe(200);

      const getMeals = await mealsGET(makeReq({}, 'GET', 'http://localhost:3000/api/meals'));
      expect(getMeals.status).toBe(200);

      const getDeposits = await depositsGET(makeReq({}, 'GET', 'http://localhost:3000/api/deposits'));
      expect(getDeposits.status).toBe(200);
    });

    it('allows manager to access managerial endpoints', async () => {
      currentSession = {
        user: {
          id: 'manager_kamal',
          name: 'কামাল',
          email: 'kamal@mess.com',
          role: 'admin',
          status: 'active',
        },
      };

      const exportRes = await exportGET(makeReq({}, 'GET', 'http://localhost:3000/api/export'));
      expect(exportRes.status).toBe(200);
    });

    it('allows super_admin to download database backup', async () => {
      currentSession = {
        user: {
          id: 'super_admin_id',
          name: 'সুপার অ্যাডমিন',
          email: 'superadmin@mess.com',
          role: 'super_admin',
          status: 'active',
        },
      };

      const backupRes = await backupGET(makeReq({}, 'GET', 'http://localhost:3000/api/backup'));
      expect(backupRes.status).toBe(200);
      const json = await backupRes.json();
      expect(json.success).toBe(true);
    });
  });
});
