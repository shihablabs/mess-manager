import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb, idFilter } from '@/lib/db';
import { FixedEventDoc, BazarDoc, FixedEventItem } from '@/models/types';
import { calculateFixedEventPerPerson } from '@/billing-engine';
import { assertCycleOpen } from '@/lib/cycle-guard';
import { requireActiveMember, requireRole } from '@/lib/guard';
import { recordAuditLog } from '@/lib/audit';

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
      return { id: uid, name: u ? u.name : 'সদস্য', role: u?.role || 'member' };
    });
    const buyerUser = e.buyerUserId ? store.users.find((u) => u._id === e.buyerUserId) : null;
    return {
      ...e,
      buyer: buyerUser ? { id: buyerUser._id, name: buyerUser.name, image: buyerUser.image, role: buyerUser.role } : null,
      buyerName: buyerUser ? buyerUser.name : 'মেস ম্যানেজার',
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
      buyerUserId,
      items,
      extraMealWeight,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    // Calculate total cost from items or numeric cost
    const itemsTotal = Array.isArray(items) && items.length > 0
      ? items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0)
      : 0;

    const finalCost = itemsTotal > 0 ? itemsTotal : Number(cost);

    if (!title || !finalCost || finalCost <= 0) {
      return NextResponse.json({ success: false, error: 'শিরোনাম ও বৈধ খরচের পরিমাণ আবশ্যক' }, { status: 400 });
    }

    if (!attendeeUserIds || attendeeUserIds.length === 0) {
      return NextResponse.json({ success: false, error: 'অন্তত একজন উপস্থিত সদস্য নির্বাচন করুন' }, { status: 400 });
    }

    const defaultWeight = store.mess?.fixedExtraWeightDefault ?? 0.5;
    const finalExtraWeight =
      extraMealWeight !== undefined && extraMealWeight !== null
        ? Number(extraMealWeight)
        : defaultWeight;

    const effectiveBuyerUserId = buyerUserId || caller.id;
    const eventId = `fix_${Date.now()}`;
    const linkedBazarId = `baz_fix_${Date.now()}`;
    const eventDate = date || new Date().toISOString().split('T')[0];

    // Filter valid items if provided
    const validItems: FixedEventItem[] | undefined = Array.isArray(items) && items.length > 0
      ? items
          .filter((it: any) => it.name && Number(it.amount) > 0)
          .map((it: any) => ({ name: String(it.name).trim(), amount: Number(it.amount) }))
      : undefined;

    // Create linked BazarDoc so buyer gets credited
    const linkedBazar: BazarDoc = {
      _id: linkedBazarId,
      userId: effectiveBuyerUserId,
      cycleId,
      messId: store.mess._id as string,
      date: eventDate,
      amount: finalCost,
      description: `[বিশেষ ভোজ] ${title}`,
      items: validItems?.map((it) => ({ name: it.name, price: it.amount })),
      type: 'fixed',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newEvent: FixedEventDoc = {
      _id: eventId,
      cycleId,
      messId: store.mess._id as string,
      date: eventDate,
      title,
      mealTime,
      cost: finalCost,
      extraMealWeight: finalExtraWeight,
      attendeeUserIds,
      buyerUserId: effectiveBuyerUserId,
      items: validItems,
      bazarId: linkedBazarId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('fixed_events').insertOne(newEvent as any);
      await db.collection('bazars').insertOne(linkedBazar as any);
      await recordAuditLog({
        messId: store.mess._id as string,
        cycleId,
        performedByUserId: caller.id,
        action: 'CREATE_FIXED_EVENT',
        targetCollection: 'fixed_events',
        targetId: String(newEvent._id),
        previousValue: null,
        newValue: newEvent,
      });
    }

    store.fixedEvents.unshift(newEvent);
    store.bazars.unshift(linkedBazar);

    return NextResponse.json({ success: true, event: newEvent, bazar: linkedBazar });
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
      return NextResponse.json({ success: false, error: 'ইভেন্ট আইডি আবশ্যক' }, { status: 400 });
    }

    const store = await getStore();
    const db = await getDb();

    const targetEvent = store.fixedEvents.find((e) => String(e._id) === String(id));
    if (!targetEvent && !db) {
      return NextResponse.json({ success: false, error: 'ইভেন্ট খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }

    const cycleClosedResponse = await assertCycleOpen(targetEvent?.cycleId || '', { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const linkedBazarId = targetEvent?.bazarId;

    if (db) {
      await db.collection('fixed_events').deleteOne(idFilter(id));
      if (linkedBazarId) {
        await db.collection('bazars').deleteOne(idFilter(linkedBazarId));
      }
      await recordAuditLog({
        messId: targetEvent?.messId || (store.mess._id as string),
        cycleId: targetEvent?.cycleId || '',
        performedByUserId: caller.id,
        action: 'DELETE_FIXED_EVENT',
        targetCollection: 'fixed_events',
        targetId: String(id),
        previousValue: targetEvent,
        newValue: null,
      });
    }

    store.fixedEvents = store.fixedEvents.filter((e) => String(e._id) !== String(id));
    if (linkedBazarId) {
      store.bazars = store.bazars.filter((b) => String(b._id) !== String(linkedBazarId));
    }

    return NextResponse.json({
      success: true,
      message: 'বিশেষ ভোজ ও সংযুক্ত বাজার এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
