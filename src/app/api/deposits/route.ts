import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { DepositDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';
  const userId = searchParams.get('userId');

  let list = store.deposits.filter((d) => d.cycleId === cycleId);
  if (userId) list = list.filter((d) => d.userId === userId);

  const enriched = list.map((d) => {
    const user = store.users.find((u) => u._id === d.userId);
    return {
      ...d,
      userName: user ? user.name : 'সদস্য',
    };
  });

  return NextResponse.json({ success: true, deposits: enriched });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { userId, cycleId = 'cycle_1', amount, type = 'general', notes } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'সদস্য ও সঠিক টাকার পরিমাণ আবশ্যক' }, { status: 400 });
    }

    const newDeposit: DepositDoc = {
      _id: `dep_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      type,
      isPaid: true,
      notes,
      createdAt: new Date(),
    };

    store.deposits.unshift(newDeposit);

    const user = store.users.find((u) => u._id === userId);
    store.auditLogs.unshift({
      _id: `log_${Date.now()}`,
      messId: store.mess._id as string,
      cycleId,
      performedByUserId: 'user_admin',
      performedByUserName: 'Admin',
      action: `${user?.name || 'সদস্য'}-এর জন্য জমা এন্ট্রি করা হয়েছে (৳${amount}, ${type === 'big_bazar' ? 'বড় বাজার' : 'সাধারণ'})`,
      targetCollection: 'deposits',
      targetId: newDeposit._id as string,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, deposit: newDeposit });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
