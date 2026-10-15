import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { SlotRequestDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

  const slots = store.bazarSlots.filter((s) => s.cycleId === cycleId);
  const enrichedSlots = slots.map((s) => {
    const assignedUsers = s.assignedUserIds.map((uid) => {
      const u = store.users.find((user) => user._id === uid);
      return { id: uid, name: u ? u.name : 'সদস্য' };
    });
    return {
      ...s,
      assignedUsers,
    };
  });

  const slotRequests = store.slotRequests.filter((r) => r.cycleId === cycleId);
  const enrichedRequests = slotRequests.map((r) => {
    const u = store.users.find((user) => user._id === r.userId);
    return {
      ...r,
      userName: u ? u.name : 'সদস্য',
    };
  });

  return NextResponse.json({
    success: true,
    slots: enrichedSlots,
    requests: enrichedRequests,
  });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      action,
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      fromSlotIndex,
      toSlotIndex,
      requestId,
      status,
      reason,
      numMembers = 6,
      daysPerSlot = 3,
    } = body;

    // Generate roster
    if (action === 'generate_slots') {
      store.generateSlots(Number(numMembers), Number(daysPerSlot));
      if (db) {
        await db.collection('bazar_slots').deleteMany({ cycleId });
        if (store.bazarSlots.length > 0) {
          await db.collection('bazar_slots').insertMany(store.bazarSlots as any[]);
        }
      }
      return NextResponse.json({ success: true, slots: store.bazarSlots });
    }

    if (action === 'request_change') {
      const newReq: SlotRequestDoc = {
        _id: `sr_${Date.now()}`,
        userId,
        cycleId,
        messId: store.mess._id as string,
        fromSlotIndex,
        toSlotIndex,
        status: 'pending',
        reason,
        createdAt: new Date(),
      };
      if (db) {
        await db.collection('slot_requests').insertOne(newReq as any);
      }
      return NextResponse.json({ success: true, request: newReq });
    }

    if (action === 'review_request') {
      if (db) {
        await db.collection('slot_requests').updateOne(
          { _id: requestId },
          { $set: { status, updatedAt: new Date() } }
        );
      }
      return NextResponse.json({ success: true, message: 'অনুরোধ পর্যালোচনা সম্পন্ন হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
