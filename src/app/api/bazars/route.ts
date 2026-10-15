import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { BazarDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  let list = store.bazars.filter((b) => b.cycleId === cycleId);
  if (type) list = list.filter((b) => b.type === type);
  if (status) list = list.filter((b) => b.status === status);

  // attach user name
  const enriched = list.map((b) => {
    const user = store.users.find((u) => u._id === b.userId);
    return {
      ...b,
      userName: user ? user.name : 'অজানা সদস্য',
    };
  });

  return NextResponse.json({ success: true, bazars: enriched });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { userId, cycleId = 'cycle_1', amount, description, type = 'regular', splitType = 'meal_pool', customMemberIds, paidFromBigBazarFund = false } = body;

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
      status: 'pending', // all member entries start as pending
      paidFromBigBazarFund,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.bazars.unshift(newEntry);

    const user = store.users.find((u) => u._id === userId);
    store.auditLogs.unshift({
      _id: `log_${Date.now()}`,
      messId: store.mess._id as string,
      cycleId,
      performedByUserId: userId,
      performedByUserName: user?.name || 'সদস্য',
      action: `নতুন বাজার এন্ট্রি (৳${amount}) তৈরি হয়েছে [pending]`,
      targetCollection: 'bazars',
      targetId: newEntry._id as string,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, bazar: newEntry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { id, status, adminUserId = 'user_admin' } = body;

    const item = store.bazars.find((b) => b._id === id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'বাজারের এন্ট্রি পাওয়া যায়নি' }, { status: 404 });
    }

    item.status = status;
    item.reviewedBy = adminUserId;
    item.reviewedAt = new Date();
    item.updatedAt = new Date();

    const admin = store.users.find((u) => u._id === adminUserId);
    store.auditLogs.unshift({
      _id: `log_${Date.now()}`,
      messId: store.mess._id as string,
      cycleId: item.cycleId,
      performedByUserId: adminUserId,
      performedByUserName: admin?.name || 'Admin',
      action: `বাজার এন্ট্রি #${id} অবস্থা পরিবর্তিত: ${status}`,
      targetCollection: 'bazars',
      targetId: id,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, bazar: item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
