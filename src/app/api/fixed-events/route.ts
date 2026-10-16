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
  const statusFilter = searchParams.get('status'); // 'approved', 'pending', 'rejected', or undefined (all)

  let events = store.fixedEvents.filter((e) => e.cycleId === cycleId);
  if (userId) {
    events = events.filter((e) => (e.attendeeUserIds || []).includes(userId) || e.buyerUserId === userId);
  }
  if (statusFilter) {
    events = events.filter((e) => (e.status || 'approved') === statusFilter);
  }

  const enriched = events.map((e) => {
    const attendees = (e.attendeeUserIds || []).map((uid) => {
      const u = store.users.find((user) => user._id === uid);
      return { id: uid, name: u ? u.name : 'সদস্য', role: u?.role || 'member', image: u?.image };
    });
    const buyerUser = e.buyerUserId ? store.users.find((u) => u._id === e.buyerUserId) : null;
    const requesterUser = e.requestedBy ? store.users.find((u) => u._id === e.requestedBy) : null;
    const reviewerUser = e.reviewedBy ? store.users.find((u) => u._id === e.reviewedBy) : null;

    return {
      ...e,
      status: e.status || 'approved',
      buyer: buyerUser
        ? { id: buyerUser._id, name: buyerUser.name, image: buyerUser.image, role: buyerUser.role }
        : null,
      buyerName: buyerUser ? buyerUser.name : 'মেস সদস্য',
      requester: requesterUser
        ? { id: requesterUser._id, name: requesterUser.name, image: requesterUser.image }
        : null,
      reviewerName: reviewerUser ? reviewerUser.name : null,
      attendees,
      perPersonCost: calculateFixedEventPerPerson(e.cost, (e.attendeeUserIds || []).length),
    };
  });

  return NextResponse.json({ success: true, events: enriched });
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveMember();
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
      cycleId = (store.cycles[0]?._id as string) || 'cycle_1',
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const isManager = caller.role === 'admin' || caller.role === 'super_admin';

    // Ordinary members can ONLY organize feasts in their own name!
    const effectiveBuyerUserId = isManager && buyerUserId ? buyerUserId : caller.id;

    // Calculate total cost from items or numeric cost
    const itemsTotal =
      Array.isArray(items) && items.length > 0
        ? items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0)
        : 0;

    const finalCost = itemsTotal > 0 ? itemsTotal : Number(cost);

    if (!title || !finalCost || finalCost <= 0) {
      return NextResponse.json(
        { success: false, error: 'শিরোনাম ও বৈধ খরচের পরিমাণ আবশ্যক' },
        { status: 400 }
      );
    }

    if (!attendeeUserIds || attendeeUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'অন্তত একজন উপস্থিত সদস্য নির্বাচন করুন' },
        { status: 400 }
      );
    }

    const defaultWeight = store.mess?.fixedExtraWeightDefault ?? 0.5;
    const finalExtraWeight =
      extraMealWeight !== undefined && extraMealWeight !== null
        ? Number(extraMealWeight)
        : defaultWeight;

    const eventId = `fix_${Date.now()}`;
    const linkedBazarId = `baz_fix_${Date.now()}`;
    const eventDate = date || new Date().toISOString().split('T')[0];

    // Filter valid items if provided
    const validItems: FixedEventItem[] | undefined =
      Array.isArray(items) && items.length > 0
        ? items
            .filter((it: any) => it.name && Number(it.amount) > 0)
            .map((it: any) => ({ name: String(it.name).trim(), amount: Number(it.amount) }))
        : undefined;

    // Status: Managers directly approve; Ordinary members create a pending request
    const eventStatus = isManager ? 'approved' : 'pending';

    // Create linked BazarDoc so buyer gets credited once approved
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
      status: eventStatus,
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
      status: eventStatus,
      requestedBy: caller.id,
      reviewedBy: isManager ? caller.id : undefined,
      reviewedAt: isManager ? new Date() : undefined,
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
        action: isManager ? 'CREATE_FIXED_EVENT' : 'REQUEST_FIXED_EVENT',
        targetCollection: 'fixed_events',
        targetId: String(newEvent._id),
        previousValue: null,
        newValue: newEvent,
      });
    }

    store.fixedEvents.unshift(newEvent);
    store.bazars.unshift(linkedBazar);

    return NextResponse.json({
      success: true,
      event: newEvent,
      bazar: linkedBazar,
      message: isManager
        ? 'বিশেষ ভোজ সফলভাবে যোগ করা হয়েছে!'
        : 'বিশেষ ভোজের আবেদন জমা হয়েছে। মেস ম্যানেজার অনুমোদন করলে তা কার্যকর হবে।',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(['admin', 'super_admin']);
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      id,
      status, // 'approved' | 'rejected'
      adminNote,
      title,
      cost,
      date,
      mealTime,
      buyerUserId,
      items,
      attendeeUserIds,
      extraMealWeight,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ইভেন্ট আইডি আবশ্যক' }, { status: 400 });
    }

    const targetEvent = store.fixedEvents.find((e) => String(e._id) === String(id));
    if (!targetEvent && !db) {
      return NextResponse.json({ success: false, error: 'ইভেন্ট খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }

    const cycleClosedResponse = await assertCycleOpen(targetEvent?.cycleId || '', { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    // Calculate items total if items provided
    let finalCost = targetEvent?.cost || 0;
    let validItems = targetEvent?.items;
    if (items && Array.isArray(items)) {
      validItems = items
        .filter((it: any) => it.name && Number(it.amount) > 0)
        .map((it: any) => ({ name: String(it.name).trim(), amount: Number(it.amount) }));
      const itemsTotal = validItems.reduce((sum: number, it: any) => sum + it.amount, 0);
      if (itemsTotal > 0) finalCost = itemsTotal;
    } else if (cost && Number(cost) > 0) {
      finalCost = Number(cost);
    }

    const finalStatus = status || targetEvent?.status || 'approved';
    const finalTitle = title ? String(title).trim() : targetEvent?.title;
    const finalDate = date || targetEvent?.date;
    const finalMealTime = mealTime || targetEvent?.mealTime || 'lunch';
    const finalBuyerUserId = buyerUserId || targetEvent?.buyerUserId;
    const finalAttendeeIds = attendeeUserIds || targetEvent?.attendeeUserIds || [];
    const finalExtraWeight =
      extraMealWeight !== undefined ? Number(extraMealWeight) : (targetEvent?.extraMealWeight ?? 0.5);

    const updateDoc: Partial<FixedEventDoc> = {
      status: finalStatus as any,
      title: finalTitle,
      cost: finalCost,
      date: finalDate,
      mealTime: finalMealTime,
      buyerUserId: finalBuyerUserId,
      attendeeUserIds: finalAttendeeIds,
      extraMealWeight: finalExtraWeight,
      items: validItems,
      reviewedBy: caller.id,
      reviewedAt: new Date(),
      adminNote: adminNote !== undefined ? adminNote : targetEvent?.adminNote,
      updatedAt: new Date(),
    };

    const linkedBazarId = targetEvent?.bazarId;

    if (db) {
      await db.collection('fixed_events').updateOne(idFilter(id), { $set: updateDoc });

      // Synchronize linked BazarDoc status and details
      if (linkedBazarId) {
        await db.collection('bazars').updateOne(idFilter(linkedBazarId), {
          $set: {
            status: finalStatus,
            amount: finalCost,
            date: finalDate,
            userId: finalBuyerUserId,
            description: `[বিশেষ ভোজ] ${finalTitle}`,
            items: validItems?.map((it) => ({ name: it.name, price: it.amount })),
            updatedAt: new Date(),
          },
        });
      }

      await recordAuditLog({
        messId: targetEvent?.messId || (store.mess._id as string),
        cycleId: targetEvent?.cycleId || '',
        performedByUserId: caller.id,
        action: 'UPDATE_FIXED_EVENT',
        targetCollection: 'fixed_events',
        targetId: String(id),
        previousValue: targetEvent,
        newValue: { ...targetEvent, ...updateDoc },
      });
    }

    // Update in-memory store
    const memIdx = store.fixedEvents.findIndex((e) => String(e._id) === String(id));
    if (memIdx !== -1) {
      store.fixedEvents[memIdx] = { ...store.fixedEvents[memIdx], ...updateDoc } as FixedEventDoc;
    }

    if (linkedBazarId) {
      const bazIdx = store.bazars.findIndex((b) => String(b._id) === String(linkedBazarId));
      if (bazIdx !== -1) {
        store.bazars[bazIdx] = {
          ...store.bazars[bazIdx],
          status: finalStatus as any,
          amount: finalCost,
          date: finalDate,
          userId: finalBuyerUserId,
          description: `[বিশেষ ভোজ] ${finalTitle}`,
          items: validItems?.map((it) => ({ name: it.name, price: it.amount })),
          updatedAt: new Date(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'approved'
          ? 'বিশেষ ভোজ অনুমোদন করা হয়েছে!'
          : status === 'rejected'
          ? 'বিশেষ ভোজ বাতিল করা হয়েছে'
          : 'বিশেষ ভোজ সফলভাবে আপডেট করা হয়েছে',
      event: { ...targetEvent, ...updateDoc },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireActiveMember();
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

    const isManager = caller.role === 'admin' || caller.role === 'super_admin';
    const isOwner =
      targetEvent?.requestedBy === caller.id || targetEvent?.buyerUserId === caller.id;

    // Ordinary members can ONLY delete their own pending request
    if (!isManager && (!isOwner || (targetEvent?.status && targetEvent.status !== 'pending'))) {
      return NextResponse.json(
        { success: false, error: 'অনুমোদিত ভোজ কেবল ম্যানেজার বা অ্যাডমিন মুছে ফেলতে পারেন' },
        { status: 403 }
      );
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
