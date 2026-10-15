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
    const slot = store.mess.mealSlots.find((s) => s.id === r.slotId);
    return {
      ...r,
      userName: user ? user.name : 'সদস্য',
      slotName: slot ? slot.name : r.slotId,
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
      slotId,
      action = 'off',
      reason,
    } = body;

    if (!date || !slotId) {
      return NextResponse.json({ success: false, error: 'তারিখ ও স্লট আবশ্যক' }, { status: 400 });
    }

    let isLate = false;
    const now = new Date();
    const currentHour = now.getHours();

    if (slotId === 'morning' && currentHour >= 22) {
      isLate = true;
    } else if (slotId === 'night' && currentHour >= 16) {
      isLate = true;
    }

    const newReq: MealRequestDoc = {
      _id: `mr_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      date,
      slotId,
      action,
      isLate,
      status: 'pending',
      reason,
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('meal_requests').insertOne(newReq as any);
    }

    return NextResponse.json({ success: true, request: newReq });
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

    const reqItem = store.mealRequests.find((r) => r._id === id);
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
          },
        }
      );

      // If approved, update or insert into meals
      if (status === 'approved') {
        const slotDef = store.mess.mealSlots.find((s) => s.id === reqItem.slotId);
        const weight = slotDef ? slotDef.weight : reqItem.slotId === 'morning' ? 0.5 : 1.0;
        const consumed = reqItem.action === 'off' ? 0 : 1;

        await db.collection('meals').updateOne(
          {
            userId: reqItem.userId,
            cycleId: reqItem.cycleId,
            date: reqItem.date,
            slotId: reqItem.slotId,
          },
          {
            $set: {
              consumed,
              weight,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: `meal_${Date.now()}`,
              messId: store.mess._id as string,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ success: true, message: 'মিল অনুরোধ পর্যালোচনা সম্পন্ন হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
