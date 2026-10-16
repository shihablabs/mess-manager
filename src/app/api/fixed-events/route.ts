import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { FixedEventDoc } from '@/models/types';
import { calculateFixedEventPerPerson } from '@/billing-engine';
import { assertCycleOpen } from '@/lib/cycle-guard';
import { requireActiveMember, requireRole } from '@/lib/guard';

export async function GET(request: Request) {
  const auth = await requireActiveMember();
  if (!auth.authorized) return auth.response;

  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
  const userId = searchParams.get('userId');

  let events = store.fixedEvents.filter((e) => e.cycleId === cycleId);
  if (userId) {
    events = events.filter((e) => e.attendeeUserIds.includes(userId));
  }
  const enriched = events.map((e) => {
    const attendees = e.attendeeUserIds.map((uid) => {
      const u = store.users.find((user) => user._id === uid);
      return { id: uid, name: u ? u.name : 'সদস্য' };
    });
    return {
      ...e,
      attendees,
      perPersonCost: calculateFixedEventPerPerson(e.cost, e.attendeeUserIds.length),
    };
  });

  return NextResponse.json({ success: true, events: enriched });
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
      title,
      date,
      cost,
      mealTime = 'lunch',
      attendeeUserIds = [],
      extraMealWeight,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    if (!title || !cost || cost <= 0) {
      return NextResponse.json({ success: false, error: 'শিরোনাম ও খরচের পরিমাণ আবশ্যক' }, { status: 400 });
    }

    const defaultWeight = store.mess?.fixedExtraWeightDefault ?? 0.5;
    const finalExtraWeight =
      extraMealWeight !== undefined && extraMealWeight !== null
        ? Number(extraMealWeight)
        : defaultWeight;

    const newEvent: FixedEventDoc = {
      _id: `fix_${Date.now()}`,
      cycleId,
      messId: store.mess._id as string,
      date: date || new Date().toISOString().split('T')[0],
      title,
      mealTime,
      cost: Number(cost),
      extraMealWeight: finalExtraWeight,
      attendeeUserIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('fixed_events').insertOne(newEvent as any);
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
