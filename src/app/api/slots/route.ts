import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { SlotRequestDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';

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
    const store = getStore();
    const body = await request.json();
    const { action, userId, cycleId = 'cycle_1', fromSlotIndex, toSlotIndex, requestId, status, reason } = body;

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
      store.slotRequests.unshift(newReq);
      return NextResponse.json({ success: true, request: newReq });
    }

    if (action === 'review_request') {
      const reqItem = store.slotRequests.find((r) => r._id === requestId);
      if (!reqItem) {
        return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
      }

      reqItem.status = status;
      if (status === 'approved') {
        // Swap slots
        const fromSlot = store.bazarSlots.find((s) => s.slotIndex === reqItem.fromSlotIndex && s.cycleId === reqItem.cycleId);
        const toSlot = store.bazarSlots.find((s) => s.slotIndex === reqItem.toSlotIndex && s.cycleId === reqItem.cycleId);

        if (fromSlot && toSlot) {
          // Remove from fromSlot
          fromSlot.assignedUserIds = fromSlot.assignedUserIds.filter((id) => id !== reqItem.userId);
          // Add to toSlot
          if (!toSlot.assignedUserIds.includes(reqItem.userId)) {
            toSlot.assignedUserIds.push(reqItem.userId);
          }
        }
      }

      return NextResponse.json({ success: true, request: reqItem });
    }

    if (action === 'auto_generate') {
      store.generateDutySlots();
      return NextResponse.json({ success: true, message: 'বাজারের ডিউটি স্লট সফলভাবে তৈরি হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
