import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { MealRequestDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';
  const status = searchParams.get('status');

  let list = store.mealRequests.filter((r) => r.cycleId === cycleId);
  if (status) list = list.filter((r) => r.status === status);

  const enriched = list.map((r) => {
    const user = store.users.find((u) => u._id === r.userId);
    const slot = store.mess.mealSlots.find((s) => s.id === r.slotId);
    return {
      ...r,
      userName: user ? user.name : 'সদস্য',
      slotName: slot ? slot.name : r.slotId,
    };
  });

  return NextResponse.json({ success: true, requests: enriched });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { userId, cycleId = 'cycle_1', date, slotId, action = 'off', reason } = body;

    if (!date || !slotId) {
      return NextResponse.json({ success: false, error: 'তারিখ ও স্লট আবশ্যক' }, { status: 400 });
    }

    // Check cutoff time (SRS Section 4.2 / 6)
    // Morning deadline default: previous night 22:00. Night deadline default: same day 16:00
    let isLate = false;
    const now = new Date();
    const currentHour = now.getHours();

    if (slotId === 'morning' && currentHour >= 22) {
      isLate = true;
    } else if (slotId === 'night' && currentHour >= 16) {
      isLate = true;
    }

    const newReq: MealRequestDoc = {
      _id: `mr_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      date,
      slotId,
      action,
      isLate,
      status: 'pending',
      reason,
      createdAt: new Date(),
    };

    store.mealRequests.unshift(newReq);

    const user = store.users.find((u) => u._id === userId);
    store.auditLogs.unshift({
      _id: `log_${Date.now()}`,
      messId: store.mess._id as string,
      cycleId,
      performedByUserId: userId,
      performedByUserName: user?.name || 'সদস্য',
      action: `মিল ${action === 'off' ? 'বন্ধ (Off)' : 'চালু'} করার অনুরোধ পাঠিয়েছেন (${date}) [${isLate ? 'Late' : 'On-time'}]`,
      targetCollection: 'mealRequests',
      targetId: newReq._id as string,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, request: newReq });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { id, status, adminUserId = 'user_admin', adminNote } = body;

    const reqItem = store.mealRequests.find((r) => r._id === id);
    if (!reqItem) {
      return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
    }

    reqItem.status = status;
    reqItem.adminNote = adminNote;
    reqItem.reviewedBy = adminUserId;
    reqItem.reviewedAt = new Date();

    // If approved, update member meal in store
    if (status === 'approved') {
      const slotDef = store.mess.mealSlots.find((s) => s.id === reqItem.slotId);
      const weight = slotDef ? slotDef.weight : 1;

      // Adjust meal count or add record
      // In aggregate or individual meal:
      // If member turned off, subtract weight; if on, add weight
      const aggregateMeal = store.meals.find(
        (m) => m.userId === reqItem.userId && m.cycleId === reqItem.cycleId
      );
      if (aggregateMeal) {
        if (reqItem.action === 'off') {
          aggregateMeal.weight = Math.max(0, aggregateMeal.weight - weight);
        } else if (reqItem.action === 'on') {
          aggregateMeal.weight += weight;
        }
      }
    }

    const admin = store.users.find((u) => u._id === adminUserId);
    store.auditLogs.unshift({
      _id: `log_${Date.now()}`,
      messId: store.mess._id as string,
      cycleId: reqItem.cycleId,
      performedByUserId: adminUserId,
      performedByUserName: admin?.name || 'Admin',
      action: `মিল অনুরোধ #${id} অবস্থা: ${status}`,
      targetCollection: 'mealRequests',
      targetId: id,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, request: reqItem });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
