import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { BazarDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');

  let list = store.bazars.filter((b) => b.cycleId === cycleId);
  if (userId) list = list.filter((b) => b.userId === userId);
  if (type) list = list.filter((b) => b.type === type);
  if (status) list = list.filter((b) => b.status === status);

  const enriched = list.map((b) => {
    const user = store.users.find((u) => u._id === b.userId);
    return {
      ...b,
      userName: user ? user.name : 'সদস্য',
    };
  });

  return NextResponse.json({ success: true, bazars: enriched });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      amount,
      description,
      type = 'regular',
      splitType = 'meal_pool',
      customMemberIds,
      paidFromBigBazarFund = false,
    } = body;

    const user = store.users.find((u) => u._id === userId);
    const membership = store.memberships.find((m) => m.userId === userId);
    const isManagerOrAdmin =
      user?.role === 'super_admin' ||
      user?.role === 'admin' ||
      membership?.role === 'super_admin' ||
      membership?.role === 'admin';

    const todayStr = new Date().toISOString().split('T')[0];

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
        return todayStr >= s.startDate && todayStr <= s.endDate;
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

    // Direct addition for legitimate bazars (Approved directly as requested)
    const newEntry: BazarDoc = {
      _id: `baz_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      date: todayStr,
      amount: Number(amount),
      description,
      type,
      splitType,
      customMemberIds,
      status: 'approved',
      paidFromBigBazarFund,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('bazars').insertOne(newEntry as any);
    }

    return NextResponse.json({
      success: true,
      bazar: newEntry,
      message: 'বাজার সফলভাবে সরাসরি যুক্ত ও অনুমোদিত হয়েছে',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const { id, status, adminUserId } = body;

    const item = store.bazars.find((b) => b._id === id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'বাজারের এন্ট্রি পাওয়া যায়নি' }, { status: 404 });
    }

    if (db) {
      await db.collection('bazars').updateOne(
        { _id: id },
        {
          $set: {
            status,
            reviewedBy: adminUserId || 'admin',
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ success: true, message: 'বাজার অনুমোদিত / প্রত্যাখ্যাত হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
