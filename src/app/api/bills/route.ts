import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { BillDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';

  const list = store.bills.filter((b) => b.cycleId === cycleId);
  return NextResponse.json({ success: true, bills: list });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { cycleId = 'cycle_1', type, amount, splitMethod = 'equal' } = body;

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'বিলের নাম ও টাকার পরিমাণ আবশ্যক' }, { status: 400 });
    }

    // Check if bill type exists, if so update, otherwise insert
    const existing = store.bills.find((b) => b.cycleId === cycleId && b.type.toLowerCase() === type.toLowerCase());
    if (existing) {
      existing.amount = Number(amount);
      existing.updatedAt = new Date();
      return NextResponse.json({ success: true, bill: existing });
    }

    const newBill: BillDoc = {
      _id: `b_${Date.now()}`,
      cycleId,
      messId: store.mess._id as string,
      type,
      amount: Number(amount),
      splitMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.bills.push(newBill);
    return NextResponse.json({ success: true, bill: newBill });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
