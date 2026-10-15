import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { MealRequestDoc, MealDoc } from '@/models/types';

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

    const fromDate = startDate || date;
    const toDate = endDate || fromDate;

    if (!fromDate) {
      return NextResponse.json({ success: false, error: 'তারিখ নির্বাচন আবশ্যক' }, { status: 400 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const currentHour = now.getHours();

    let isLate = explicitIsLate || false;
    if (fromDate < todayStr) {
      isLate = true;
    } else if (fromDate === todayStr) {
      if (slotId === 'morning' || slotId === 'both' || slotId === 'all') {
        isLate = true; // morning cutoff was previous night 10 PM
      } else if (slotId === 'lunch' && currentHour >= 9) {
        isLate = true; // lunch cutoff is 9 AM
      } else if (slotId === 'night' && currentHour >= 16) {
        isLate = true; // night cutoff is 4 PM
      }
    } else if (fromDate === tomorrowStr) {
      if ((slotId === 'morning' || slotId === 'both' || slotId === 'all') && currentHour >= 22) {
        isLate = true; // previous night 10 PM
      }
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
    }

    return NextResponse.json({ success: true, message: 'মিল অনুরোধ পর্যালোচনা সম্পন্ন হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
