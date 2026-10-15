import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { FixedEventDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';

  const events = store.fixedEvents.filter((e) => e.cycleId === cycleId);
  const enriched = events.map((e) => {
    const attendees = e.attendeeUserIds.map((uid) => {
      const u = store.users.find((user) => user._id === uid);
      return { id: uid, name: u ? u.name : 'সদস্য' };
    });
    return {
      ...e,
      attendees,
      perPersonCost: e.attendeeUserIds.length > 0 ? Math.round(e.cost / e.attendeeUserIds.length) : 0,
    };
  });

  return NextResponse.json({ success: true, events: enriched });
}

export async function POST(request: Request) {
  try {
    const store = getStore();
    const body = await request.json();
    const { title, date, cost, mealTime = 'lunch', attendeeUserIds = [], extraMealWeight = 0, cycleId = 'cycle_1' } = body;

    if (!title || !cost || cost <= 0) {
      return NextResponse.json({ success: false, error: 'শিরোনাম ও খরচের পরিমাণ আবশ্যক' }, { status: 400 });
    }

    const newEvent: FixedEventDoc = {
      _id: `fix_${Date.now()}`,
      cycleId,
      messId: store.mess._id as string,
      date: date || new Date().toISOString().split('T')[0],
      title,
      mealTime,
      cost: Number(cost),
      extraMealWeight: Number(extraMealWeight),
      attendeeUserIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.fixedEvents.push(newEvent);

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
