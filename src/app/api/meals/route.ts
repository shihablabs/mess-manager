import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { MealDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';
import { assertCycleOpen } from '@/lib/cycle-guard';
import { requireActiveMember } from '@/lib/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;

    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');

    let list = store.meals.filter((m) => m.cycleId === cycleId);
    if (userId) {
      list = list.filter((m) => m.userId === userId);
    }
    if (date) {
      list = list.filter((m) => m.date === date);
    }

    return NextResponse.json({ success: true, meals: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      date,
      entries = [], // array of { userId: string, morning: number, night: number }
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    // Regular members can only write for their own userId
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      for (const entry of entries) {
        if (String(entry.userId) !== String(caller.id) && String(entry.userId) !== String(caller.email)) {
          return NextResponse.json(
            { success: false, error: 'সাধারণ সদস্য শুধুমাত্র নিজের মিল এন্ট্রি বা পরিবর্তন করতে পারেন (403 Forbidden)' },
            { status: 403 }
          );
        }
      }
    }

    if (!date) {
      return NextResponse.json({ success: false, error: 'তারিখ আবশ্যক' }, { status: 400 });
    }

    if (db && entries.length > 0) {
      for (const entry of entries) {
        const morningCount = Number(entry.morning ?? 0);
        const lunchCount = Number(entry.lunch ?? 0);
        const nightCount = Number(entry.night ?? 0);

        // Morning slot
        await db.collection('meals').updateOne(
          {
            userId: entry.userId,
            cycleId,
            date,
            slotId: 'morning',
          },
          {
            $set: {
              consumed: morningCount,
              weight: 1.0,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: `meal_m_${entry.userId}_${date}`,
              messId: store.mess._id as string,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Lunch slot
        await db.collection('meals').updateOne(
          {
            userId: entry.userId,
            cycleId,
            date,
            slotId: 'lunch',
          },
          {
            $set: {
              consumed: lunchCount,
              weight: 1.0,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: `meal_l_${entry.userId}_${date}`,
              messId: store.mess._id as string,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Night slot
        await db.collection('meals').updateOne(
          {
            userId: entry.userId,
            cycleId,
            date,
            slotId: 'night',
          },
          {
            $set: {
              consumed: nightCount,
              weight: 1.0,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: `meal_n_${entry.userId}_${date}`,
              messId: store.mess._id as string,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      await recordAuditLog({
        messId: store.mess._id as string,
        cycleId,
        performedByUserId: caller.id,
        action: 'UPDATE_MEALS',
        targetCollection: 'meals',
        targetId: date,
        previousValue: { date, count: entries.length },
        newValue: { date, entries },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${date} তারিখের মিল সফলভাবে সংরক্ষণ করা হয়েছে`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const cycleId = searchParams.get('cycleId');

    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      if (userId && String(userId) !== String(caller.id) && String(userId) !== String(caller.email)) {
        return NextResponse.json(
          { success: false, error: 'সাধারণ সদস্য শুধুমাত্র নিজের মিল মুছতে পারেন (403 Forbidden)' },
          { status: 403 }
        );
      }
    }

    if (!date) {
      return NextResponse.json({ success: false, error: 'তারিখ আবশ্যক' }, { status: 400 });
    }

    if (db) {
      const query: any = { date };
      const effectiveUserId = (caller.role !== 'admin' && caller.role !== 'super_admin')
        ? caller.id
        : userId;
      if (effectiveUserId) query.userId = effectiveUserId;
      if (cycleId) query.cycleId = cycleId;

      const previousMeals = await db.collection('meals').find(query).toArray();
      await db.collection('meals').deleteMany(query);

      await recordAuditLog({
        messId: 'mess_1',
        cycleId: cycleId || undefined,
        performedByUserId: caller.id,
        action: 'DELETE_MEALS',
        targetCollection: 'meals',
        targetId: date,
        previousValue: { count: previousMeals.length, meals: previousMeals },
        newValue: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${date} তারিখের মিল সফলভাবে মুছে ফেলা হয়েছে / ০ করা হয়েছে`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
