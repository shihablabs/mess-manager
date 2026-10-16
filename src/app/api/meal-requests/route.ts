import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { MealRequestDoc, MealDoc } from '@/models/types';
import { isMealRequestLate } from '@/billing-engine';
import { recordAuditLog } from '@/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkSelfApproval } from '@/lib/self-approval';
import { assertCycleOpen } from '@/lib/cycle-guard';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
  const status = searchParams.get('status');

  let list = store.mealRequests.filter((r) => r.cycleId === cycleId);
  if (status) list = list.filter((r) => r.status === status);

  const enriched = list.map((r) => {
    const user = store.users.find((u) => u._id === r.userId);
    let slotDisplay = 'সারাদিন (সব মিল)';
    if (r.slotId === 'morning') slotDisplay = 'সকালের মিল';
    if (r.slotId === 'lunch') slotDisplay = 'দুপুরের মিল';
    if (r.slotId === 'night') slotDisplay = 'রাতের মিল';

    return {
      ...r,
      userName: user ? user.name : 'সদস্য',
      slotName: slotDisplay,
    };
  });

  return NextResponse.json({ success: true, requests: enriched });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      date,
      startDate,
      endDate,
      slotId = 'both', // 'morning' | 'lunch' | 'night' | 'both' | 'all'
      action = 'off', // 'off' | 'on'
      reason,
      isAdminDirect = false,
      adminUserId,
      isLate: explicitIsLate,
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const fromDate = startDate || date;
    const toDate = endDate || fromDate;

    if (!fromDate) {
      return NextResponse.json({ success: false, error: 'তারিখ নির্বাচন আবশ্যক' }, { status: 400 });
    }

    // Read dynamic meal slots cutoff deadlines from mess configuration (SRS 4.5 & Task 8)
    const mealSlots = store.mess?.mealSlots || [
      { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
    ];

    let isLate = explicitIsLate || false;
    if (!isLate) {
      isLate = isMealRequestLate(fromDate, slotId, mealSlots, new Date());
    }

    const newReq: any = {
      _id: `mr_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      date: fromDate,
      startDate: fromDate,
      endDate: toDate,
      slotId,
      action,
      isLate,
      status: isAdminDirect ? 'approved' : 'pending',
      reason,
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('meal_requests').insertOne(newReq);

      await recordAuditLog({
        messId: newReq.messId,
        cycleId: newReq.cycleId,
        performedByUserId: userId || 'user',
        action: isAdminDirect ? 'DIRECT_UPDATE_MEAL' : 'CREATE_MEAL_REQUEST',
        targetCollection: 'meal_requests',
        targetId: String(newReq._id),
        previousValue: null,
        newValue: newReq,
      });

      // If admin direct action, apply immediately to meals
      if (isAdminDirect) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const slotsToUpdate =
          slotId === 'both' || slotId === 'all'
            ? ['morning', 'lunch', 'night']
            : [slotId];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          for (const sId of slotsToUpdate) {
            const consumed = action === 'off' ? 0 : 1;

            await db.collection('meals').updateOne(
              {
                userId,
                cycleId,
                date: dateStr,
                slotId: sId,
              },
              {
                $set: {
                  consumed,
                  weight: 1.0,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  _id: `meal_${sId[0]}_${userId}_${dateStr}`,
                  messId: store.mess._id as string,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      request: newReq,
      message: isAdminDirect
        ? 'মিল সফলভাবে আপডেট করা হয়েছে'
        : isLate
        ? 'ডেডলাইন পার হয়ে যাওয়ায় বিলম্বিত আবেদন হিসেবে অ্যাডমিনের পর্যালোচনার জন্য জমা হয়েছে'
        : 'মিল পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const { id, status, adminUserId, adminNote } = body;

    const reqItem: any = store.mealRequests.find((r) => r._id === id);
    if (!reqItem) {
      return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
    }

    const cycleClosedResponse = await assertCycleOpen(reqItem.cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id || adminUserId || 'admin';

    if (status === 'approved') {
      const creatorUser = store.users.find((u) => u._id === reqItem.userId);
      const approverEmail = (session?.user as any)?.email;
      const selfCheck = checkSelfApproval(
        reqItem.userId,
        currentUserId,
        'meal_request',
        creatorUser?.email,
        approverEmail
      );
      if (selfCheck.forbidden) {
        return NextResponse.json({ success: false, error: selfCheck.message }, { status: 403 });
      }
    }

    if (db) {
      await db.collection('meal_requests').updateOne(
        { _id: id },
        {
          $set: {
            status,
            adminNote,
            reviewedBy: adminUserId || 'admin',
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // If approved, update meals in DB for all dates in range
      if (status === 'approved') {
        const fromDate = reqItem.startDate || reqItem.date;
        const toDate = reqItem.endDate || fromDate;
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const slotsToUpdate =
          reqItem.slotId === 'both' || reqItem.slotId === 'all'
            ? ['morning', 'lunch', 'night']
            : [reqItem.slotId];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          for (const sId of slotsToUpdate) {
            const consumed = reqItem.action === 'off' ? 0 : 1;

            await db.collection('meals').updateOne(
              {
                userId: reqItem.userId,
                cycleId: reqItem.cycleId,
                date: dateStr,
                slotId: sId,
              },
              {
                $set: {
                  consumed,
                  weight: 1.0,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  _id: `meal_${sId[0]}_${reqItem.userId}_${dateStr}`,
                  messId: store.mess._id as string,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
      }

      await recordAuditLog({
        messId: reqItem.messId || (store.mess._id as string),
        cycleId: reqItem.cycleId,
        performedByUserId: adminUserId || 'admin',
        action: status === 'approved' ? 'APPROVE_MEAL_REQUEST' : 'REJECT_MEAL_REQUEST',
        targetCollection: 'meal_requests',
        targetId: String(id),
        previousValue: reqItem,
        newValue: { status, adminNote, reviewedBy: adminUserId || 'admin' },
      });
    }

    return NextResponse.json({ success: true, message: 'মিল অনুরোধ পর্যালোচনা সম্পন্ন হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
