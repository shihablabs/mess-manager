import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { BillDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

  const list = store.bills.filter((b) => b.cycleId === cycleId);
  return NextResponse.json({ success: true, bills: list });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      type,
      amount,
      splitMethod = 'equal',
    } = body;

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'বিলের নাম ও টাকার পরিমাণ আবশ্যক' }, { status: 400 });
    }

    if (db) {
      await db.collection('bills').updateOne(
        { cycleId, type },
        {
          $set: {
            amount: Number(amount),
            splitMethod,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            _id: `bill_${Date.now()}`,
            messId: store.mess._id as string,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true, message: 'বিল সংরক্ষণ করা হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
