import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { BazarDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  let list = store.bazars.filter((b) => b.cycleId === cycleId);
  if (type) list = list.filter((b) => b.type === type);
  if (status) list = list.filter((b) => b.status === status);

  const enriched = list.map((b) => {
    const user = store.users.find((u) => u._id === b.userId);
    return {
      ...b,
      userName: user ? user.name : 'সদস্য',
    };
  });

  return NextResponse.json({ success: true, bazars: enriched });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      amount,
      description,
      type = 'regular',
      splitType = 'meal_pool',
      customMemberIds,
      paidFromBigBazarFund = false,
    } = body;

    if (!amount || amount <= 0 || !description) {
      return NextResponse.json({ success: false, error: 'টাকা ও বিবরণ আবশ্যক' }, { status: 400 });
    }

    const newEntry: BazarDoc = {
      _id: `baz_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      date: new Date().toISOString().split('T')[0],
      amount: Number(amount),
      description,
      type,
      splitType,
      customMemberIds,
      status: 'pending',
      paidFromBigBazarFund,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('bazars').insertOne(newEntry as any);
    }

    return NextResponse.json({ success: true, bazar: newEntry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const { id, status, adminUserId } = body;

    const item = store.bazars.find((b) => b._id === id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'বাজারের এন্ট্রি পাওয়া যায়নি' }, { status: 404 });
    }

    if (db) {
      await db.collection('bazars').updateOne(
        { _id: id },
        {
          $set: {
            status,
            reviewedBy: adminUserId || 'admin',
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ success: true, message: 'বাজার অনুমোদিত / প্রত্যাখ্যাত হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
