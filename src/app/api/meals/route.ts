import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { MealDoc } from '@/models/types';

export async function GET(request: Request) {
  try {
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
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      date,
      entries = [], // array of { userId: string, morning: number, night: number }
    } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: 'তারিখ আবশ্যক' }, { status: 400 });
    }

    if (db && entries.length > 0) {
      for (const entry of entries) {
        const morningCount = Number(entry.morning ?? 0);
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
              weight: 0.5,
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
    }

    return NextResponse.json({
      success: true,
      message: `${date} তারিখের মিল সফলভাবে সংরক্ষণ করা হয়েছে`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
