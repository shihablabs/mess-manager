import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb, idFilter } from '@/lib/db';
import { BillDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';
import { assertCycleOpen } from '@/lib/cycle-guard';
import { requireActiveMember, requireRole } from '@/lib/guard';

export async function GET(request: Request) {
  const auth = await requireActiveMember();
  if (!auth.authorized) return auth.response;

  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

  const list = store.bills.filter((b) => b.cycleId === cycleId);
  return NextResponse.json({ success: true, bills: list });
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(['admin', 'super_admin']);
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      type,
      amount,
      splitMethod = 'equal',
      paidByUserId,
      applicableCount,
      applicableUserIds,
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'বিলের নাম ও টাকার পরিমাণ আবশ্যক' }, { status: 400 });
    }

    const finalApplicableUserIds = Array.isArray(applicableUserIds) ? applicableUserIds : [];

    if (db) {
      const previousBill = await db.collection('bills').findOne({ cycleId, type });

      await db.collection('bills').updateOne(
        { cycleId, type },
        {
          $set: {
            amount: Number(amount),
            splitMethod,
            applicableCount: applicableCount ? Math.max(1, Number(applicableCount)) : null,
            applicableUserIds: finalApplicableUserIds,
            paidByUserId: paidByUserId && paidByUserId !== 'mess_fund' ? paidByUserId : null,
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

      const newBillData = {
        amount: Number(amount),
        splitMethod,
        applicableCount: applicableCount ? Math.max(1, Number(applicableCount)) : null,
        applicableUserIds: finalApplicableUserIds,
        paidByUserId: paidByUserId && paidByUserId !== 'mess_fund' ? paidByUserId : null,
      };

      await recordAuditLog({
        messId: store.mess._id as string,
        cycleId,
        performedByUserId: caller.id,
        action: previousBill ? 'UPDATE_BILL' : 'CREATE_BILL',
        targetCollection: 'bills',
        targetId: `${cycleId}_${type}`,
        previousValue: previousBill,
        newValue: newBillData,
      });

      // If paid by a specific member out of pocket, automatically credit them with a deposit
      if (paidByUserId && paidByUserId !== 'mess_fund') {
        const payerUser = store.users.find((u) => u._id === paidByUserId);
        await db.collection('deposits').insertOne({
          _id: `dep_${Date.now()}`,
          userId: paidByUserId,
          cycleId,
          messId: store.mess._id as string,
          amount: Number(amount),
          date: new Date().toISOString().split('T')[0],
          type: 'general',
          isPaid: true,
          paidAt: new Date(),
          notes: `${type} বিল নিজ পকেট থেকে পরিশোধ (${payerUser?.name || 'সদস্য'})`,
          createdAt: new Date(),
        } as any);
      }
    }

    return NextResponse.json({ success: true, message: 'বিল সংরক্ষণ করা হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(['admin', 'super_admin']);
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'বিল আইডি প্রয়োজন' }, { status: 400 });
    }
    const db = await getDb();
    if (db) {
      const previousBill = await db.collection('bills').findOne(idFilter(id));
      const cycleClosedResponse = await assertCycleOpen(previousBill?.cycleId, { db });
      if (cycleClosedResponse) return cycleClosedResponse;

      await db.collection('bills').deleteOne(idFilter(id));

      await recordAuditLog({
        messId: previousBill?.messId || 'mess_1',
        cycleId: previousBill?.cycleId,
        performedByUserId: caller.id,
        action: 'DELETE_BILL',
        targetCollection: 'bills',
        targetId: String(id),
        previousValue: previousBill,
        newValue: null,
      });
    }
    return NextResponse.json({ success: true, message: 'বিল সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
