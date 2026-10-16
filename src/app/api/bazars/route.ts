import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { BazarDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkSelfApproval } from '@/lib/self-approval';
import { assertCycleOpen } from '@/lib/cycle-guard';
import { requireActiveMember, requireRole } from '@/lib/guard';

export async function GET(request: Request) {
  const auth = await requireActiveMember();
  if (!auth.authorized) return auth.response;

  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');

  let list = store.bazars.filter((b) => b.cycleId === cycleId);
  if (userId) list = list.filter((b) => b.userId === userId);
  if (type) list = list.filter((b) => b.type === type);

  const enriched = list.map((b) => {
    const user = store.users.find((u) => u._id === b.userId);
    return {
      ...b,
      userName: user ? user.name : 'সদস্য',
      userImage: user?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.userId}`,
      userRole: user?.role || 'member',
    };
  });

  return NextResponse.json({ success: true, bazars: enriched });
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
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      amount,
      description,
      items,
      date,
      type = 'regular',
      splitType = 'meal_pool',
      customMemberIds,
      paidFromBigBazarFund = false,
    } = body;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const isManagerOrAdmin = caller.role === 'super_admin' || caller.role === 'admin';

    // Member can only submit for themselves
    if (!isManagerOrAdmin && userId && String(userId) !== String(caller.id) && String(userId) !== String(caller.email)) {
      return NextResponse.json(
        { success: false, error: 'সাধারণ সদস্য শুধুমাত্র নিজের বাজারের তথ্য জমা দিতে পারেন (403 Forbidden)' },
        { status: 403 }
      );
    }

    const effectiveUserId = isManagerOrAdmin ? (userId || caller.id) : caller.id;

    const todayStr = new Date().toISOString().split('T')[0];
    const entryDate = date || todayStr;

    // 1. Big Bazar Constraint: Only Admin/Manager can manage Big Bazar
    if (type === 'big') {
      if (!isManagerOrAdmin) {
        return NextResponse.json(
          {
            success: false,
            error:
              'বড় বাজার শুধুমাত্র মেস অ্যাডমিন / ম্যানেজার পরিচালনা ও এন্ট্রি করতে পারেন (সাধারণত ১০-১৫ তারিখের মধ্যে)।',
          },
          { status: 403 }
        );
      }
    }

    // 2. Regular Bazar Constraint: Allowed directly ONLY IF member's duty roster is active today (or Admin)
    if (type === 'regular' && !isManagerOrAdmin) {
      const activeSlotForUser = store.bazarSlots.find((s) => {
        if (s.cycleId !== cycleId) return false;
        if (!s.assignedUserIds.includes(userId)) return false;
        return entryDate >= s.startDate && entryDate <= s.endDate;
      });

      // If duty slots exist in this cycle and user is NOT on duty today
      const anySlotsInCycle = store.bazarSlots.some((s) => s.cycleId === cycleId);
      if (anySlotsInCycle && !activeSlotForUser) {
        return NextResponse.json(
          {
            success: false,
            error:
              'আপনার রেগুলার বাজারের শিডিউল আজ সক্রিয় নেই। রোস্টার অনুযায়ী আপনার নির্ধারিত ডিউটি চলাকালীন সময়েই কেবল সরাসরি রেগুলার বাজার তুলতে পারবেন। অন্যথায় মেস অ্যাডমিনের মাধ্যমে এন্ট্রি করতে হবে।',
          },
          { status: 403 }
        );
      }
    }

    // Calculate total amount from items if not directly provided
    const itemsTotal = Array.isArray(items)
      ? items.reduce((s: number, it: any) => s + (Number(it.price) || 0), 0)
      : 0;
    const finalAmount = Number(amount) > 0 ? Number(amount) : itemsTotal;

    // Bazar entries are always pending until manager/admin approval (SRS Rule 3)
    const newEntry: BazarDoc = {
      _id: `baz_${Date.now()}`,
      userId: effectiveUserId,
      cycleId,
      messId: store.mess._id as string,
      date: entryDate,
      amount: finalAmount,
      description,
      items: Array.isArray(items) && items.length > 0 ? items : undefined,
      type,
      splitType,
      customMemberIds,
      status: 'pending',
      paidFromBigBazarFund,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('bazars').insertOne(newEntry as any);
      await recordAuditLog({
        messId: newEntry.messId,
        cycleId: newEntry.cycleId,
        performedByUserId: caller.id,
        action: 'CREATE_BAZAR',
        targetCollection: 'bazars',
        targetId: String(newEntry._id),
        previousValue: null,
        newValue: newEntry,
      });
    }
    store.bazars.unshift(newEntry);

    return NextResponse.json({
      success: true,
      bazar: newEntry,
      message: 'বাজারের খরচ সফলভাবে জমা হয়েছে এবং মেস ম্যানেজারের অনুমোদনের অপেক্ষায় রয়েছে',
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
    const { id, status, adminUserId, amount, description, type, date } = body;

    const currentUserId = caller.id;

    const item = store.bazars.find((b) => b._id === id);
    if (!item && !db) {
      return NextResponse.json({ success: false, error: 'বাজারের এন্ট্রি পাওয়া যায়নি' }, { status: 404 });
    }

    if (db) {
      const prevItem = await db.collection('bazars').findOne({ _id: id as any });
      const targetCycleId = prevItem?.cycleId || item?.cycleId;
      const cycleClosedResponse = await assertCycleOpen(targetCycleId, { db });
      if (cycleClosedResponse) return cycleClosedResponse;
      const creatorUserId = prevItem?.userId || item?.userId;

      if (status === 'approved') {
        const creatorUser = store.users.find((u) => u._id === creatorUserId);
        const approverEmail = caller.email;
        const selfCheck = checkSelfApproval(
          creatorUserId,
          currentUserId,
          'bazar',
          creatorUser?.email,
          approverEmail
        );
        if (selfCheck.forbidden) {
          return NextResponse.json({ success: false, error: selfCheck.message }, { status: 403 });
        }
      }

      const updateDoc: any = { updatedAt: new Date() };
      if (status) {
        updateDoc.status = status;
        updateDoc.reviewedBy = caller.id;
        updateDoc.reviewedAt = new Date();
      }
      if (typeof amount === 'number' && amount > 0) updateDoc.amount = Number(amount);
      if (description) updateDoc.description = description;
      if (type) updateDoc.type = type;
      if (date) updateDoc.date = date;

      await db.collection('bazars').updateOne({ _id: id as any }, { $set: updateDoc });

      await recordAuditLog({
        messId: prevItem?.messId || (store.mess._id as string),
        cycleId: prevItem?.cycleId,
        performedByUserId: caller.id,
        action: status ? (status === 'approved' ? 'APPROVE_BAZAR' : 'REJECT_BAZAR') : 'UPDATE_BAZAR',
        targetCollection: 'bazars',
        targetId: String(id),
        previousValue: prevItem,
        newValue: updateDoc,
      });
    }

    return NextResponse.json({ success: true, message: 'বাজারের তথ্য সফলভাবে আপডেট করা হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'বাজারের আইডি আবশ্যক' }, { status: 400 });
    }

    if (db) {
      const prevItem = await db.collection('bazars').findOne({ _id: id as any });
      if (!prevItem) {
        return NextResponse.json({ success: false, error: 'বাজারের এন্ট্রি পাওয়া যায়নি' }, { status: 404 });
      }

      const cycleClosedResponse = await assertCycleOpen(prevItem?.cycleId, { db });
      if (cycleClosedResponse) return cycleClosedResponse;

      if (caller.role !== 'admin' && caller.role !== 'super_admin') {
        if (String(prevItem.userId) !== String(caller.id) && String(prevItem.userId) !== String(caller.email)) {
          return NextResponse.json(
            { success: false, error: 'অন্য সদস্যের বাজার ডিলিট করার অনুমতি নেই (403 Forbidden)' },
            { status: 403 }
          );
        }
        if (prevItem.status === 'approved') {
          return NextResponse.json(
            { success: false, error: 'অনুমোদিত বাজার শুধুমাত্র মেস ম্যানেজার বা সুপার অ্যাডমিন ডিলিট করতে পারেন' },
            { status: 403 }
          );
        }
      }

      await db.collection('bazars').deleteOne({ _id: id as any });

      await recordAuditLog({
        messId: prevItem?.messId || 'mess_1',
        cycleId: prevItem?.cycleId,
        performedByUserId: caller.id,
        action: 'DELETE_BAZAR',
        targetCollection: 'bazars',
        targetId: String(id),
        previousValue: prevItem,
        newValue: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'বাজারের এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
