import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { getDb, idFilter, userKeyFilter } from '@/lib/db';
import { DepositDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId =
      searchParams.get('cycleId') ||
      (store.cycles[0]?._id as string) ||
      'cycle_1';
    const userId = searchParams.get('userId');

    let list = store.deposits.filter((d) => d.cycleId === cycleId);
    if (userId) list = list.filter((d) => d.userId === userId);

    const enriched = list.map((d) => {
      const user = store.users.find((u) => u._id === d.userId);
      const userDetails = (user as any)?.userDetails || {};
      const effectiveName = (user as any)?.displayName || userDetails.displayName || user?.name || 'সদস্য';
      return {
        ...d,
        userName: effectiveName,
      };
    });

    // Sort newest first
    enriched.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, deposits: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    const currentUserId = (session.user as any).id || session.user.email;
    const userRole = (session.user as any).role;
    const isSuperAdmin = userRole === 'super_admin' || (session.user as any).isSuperAdmin;
    const isManager = userRole === 'admin' || isSuperAdmin;

    const body = await request.json();
    const { action } = body;

    // 1. DELETE DEPOSIT ACTION
    if (action === 'delete_deposit') {
      const depositId = body.depositId || body.id;
      if (!depositId) {
        return NextResponse.json({ success: false, error: 'জমা আইডি প্রদান করুন' }, { status: 400 });
      }

      const targetDeposit = await db.collection('deposits').findOne(idFilter(depositId));
      if (!targetDeposit) {
        return NextResponse.json({ success: false, error: 'জমার রেকর্ড পাওয়া যায়নি' }, { status: 404 });
      }

      // Authorization: Only managers or super admins can delete, or creator if pending
      if (!isManager && targetDeposit.userId !== currentUserId) {
        return NextResponse.json({ success: false, error: 'আপনার এই জমা মুছে ফেলার অনুমতি নেই' }, { status: 403 });
      }

      // If this deposit was linked to house rent, revert rent status in member_cycles
      await db.collection('member_cycles').updateMany(
        { rentDepositId: { $in: [depositId, targetDeposit._id.toString()] } },
        {
          $set: {
            rentPaid: false,
            rentPaidAt: null,
            rentDepositId: null,
            rentNotes: '',
            updatedAt: new Date(),
          },
        }
      );

      // Perform deletion
      await db.collection('deposits').deleteOne(idFilter(depositId));

      await recordAuditLog({
        messId: targetDeposit.messId,
        cycleId: targetDeposit.cycleId,
        performedByUserId: currentUserId,
        performedByUserName: session.user.name || undefined,
        action: 'DELETE_DEPOSIT',
        targetCollection: 'deposits',
        targetId: String(targetDeposit._id),
        previousValue: targetDeposit,
        newValue: null,
      });

      return NextResponse.json({
        success: true,
        message: 'জমার রেকর্ড সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে',
      });
    }

    // 2. APPROVE DEPOSIT ACTION
    if (action === 'approve_deposit') {
      if (!isManager) {
        return NextResponse.json({ success: false, error: 'অনুমোদনের ক্ষমতা কেবল মেস ম্যানেজারের রয়েছে' }, { status: 403 });
      }
      const depositId = body.depositId || body.id;
      if (!depositId) {
        return NextResponse.json({ success: false, error: 'জমা আইডি প্রয়োজন' }, { status: 400 });
      }

      const targetDeposit = await db.collection('deposits').findOne(idFilter(depositId));
      if (!targetDeposit) {
        return NextResponse.json({ success: false, error: 'জমার রেকর্ড খুঁজে পাওয়া যায়নি' }, { status: 404 });
      }

      await db.collection('deposits').updateOne(idFilter(depositId), {
        $set: {
          isPaid: true,
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: currentUserId,
          updatedAt: new Date(),
        },
      });

      // If this was a rent deposit, mark member's rent as paid to prevent duplicate collection
      if (targetDeposit.type === 'rent') {
        await db.collection('member_cycles').updateOne(
          { cycleId: targetDeposit.cycleId, ...userKeyFilter('userId', targetDeposit.userId) },
          {
            $set: {
              rentPaid: true,
              rentPaidAt: new Date(),
              rentDepositId: targetDeposit._id.toString(),
              rentPaidMethod: targetDeposit.paymentMethod || 'cash',
              updatedAt: new Date(),
            },
          }
        );
      }

      await recordAuditLog({
        messId: targetDeposit.messId,
        cycleId: targetDeposit.cycleId,
        performedByUserId: currentUserId,
        performedByUserName: session.user.name || undefined,
        action: 'APPROVE_DEPOSIT',
        targetCollection: 'deposits',
        targetId: String(targetDeposit._id),
        previousValue: { isPaid: targetDeposit.isPaid, status: targetDeposit.status },
        newValue: { isPaid: true, status: 'approved' },
      });

      return NextResponse.json({
        success: true,
        message: 'জমা অনুমোদিত হয়েছে এবং সদস্যের অ্যাকাউন্টে যুক্ত হয়েছে',
      });
    }

    // 3. REJECT DEPOSIT ACTION
    if (action === 'reject_deposit') {
      if (!isManager) {
        return NextResponse.json({ success: false, error: 'বাতিল করার ক্ষমতা কেবল মেস ম্যানেজারের রয়েছে' }, { status: 403 });
      }
      const depositId = body.depositId || body.id;
      if (!depositId) {
        return NextResponse.json({ success: false, error: 'জমা আইডি প্রয়োজন' }, { status: 400 });
      }

      const targetDeposit = await db.collection('deposits').findOne(idFilter(depositId));
      if (!targetDeposit) {
        return NextResponse.json({ success: false, error: 'জমার রেকর্ড খুঁজে পাওয়া যায়নি' }, { status: 404 });
      }

      await db.collection('deposits').updateOne(idFilter(depositId), {
        $set: {
          isPaid: false,
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: currentUserId,
          updatedAt: new Date(),
        },
      });

      await recordAuditLog({
        messId: targetDeposit.messId,
        cycleId: targetDeposit.cycleId,
        performedByUserId: currentUserId,
        performedByUserName: session.user.name || undefined,
        action: 'REJECT_DEPOSIT',
        targetCollection: 'deposits',
        targetId: String(targetDeposit._id),
        previousValue: { isPaid: targetDeposit.isPaid, status: targetDeposit.status },
        newValue: { isPaid: false, status: 'rejected' },
      });

      return NextResponse.json({
        success: true,
        message: 'জমার রিকোয়েস্ট বাতিল করা হয়েছে',
      });
    }

    // 4. CREATE NEW DEPOSIT (Default)
    const store = await getStore();
    const {
      userId,
      cycleId = (store.cycles[0]?._id as string) || 'cycle_1',
      amount,
      type = 'general',
      paymentMethod = 'cash',
      notes,
    } = body;

    if (!userId || userId === 'mess_fund') {
      return NextResponse.json(
        { success: false, error: 'জমা অবশ্যই কোনো সুনির্দিষ্ট সদস্যের নামে হতে হবে যাতে তার বকেয়া সমন্বয় হয়।' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'সঠিক টাকার পরিমাণ আবশ্যক' },
        { status: 400 }
      );
    }

    // Target user check: managers can enter for anyone, regular members enter for themselves
    const effectiveUserId = isManager ? String(userId) : currentUserId;

    // Manager submissions are directly approved; member submissions are pending
    const isApproved = isManager;
    const isPaid = isApproved;
    const status = isApproved ? 'approved' : 'pending';

    const newDeposit: DepositDoc = {
      userId: effectiveUserId,
      cycleId: String(cycleId),
      messId: (store.mess._id as string) || 'mess_1',
      amount: numAmount,
      date: new Date().toISOString().split('T')[0],
      type,
      isPaid,
      status,
      paymentMethod,
      paidAt: isPaid ? new Date() : null,
      approvedBy: isApproved ? currentUserId : undefined,
      approvedAt: isApproved ? new Date() : null,
      notes: notes || '',
      createdAt: new Date(),
    };

    const insertResult = await db.collection('deposits').insertOne(newDeposit as any);
    newDeposit._id = insertResult.insertedId.toString();

    await recordAuditLog({
      messId: newDeposit.messId,
      cycleId: newDeposit.cycleId,
      performedByUserId: currentUserId,
      performedByUserName: session.user.name || undefined,
      action: 'CREATE_DEPOSIT',
      targetCollection: 'deposits',
      targetId: String(newDeposit._id),
      previousValue: null,
      newValue: newDeposit,
    });

    // If manager created an approved rent deposit directly, link with member_cycles to prevent double counting
    if (type === 'rent' && isPaid) {
      await db.collection('member_cycles').updateOne(
        { cycleId: String(cycleId), ...userKeyFilter('userId', effectiveUserId) },
        {
          $set: {
            rentPaid: true,
            rentPaidAt: new Date(),
            rentDepositId: newDeposit._id,
            rentPaidMethod: paymentMethod,
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      deposit: newDeposit,
      message: isApproved
        ? 'জমা সফলভাবে এন্ট্রি হয়েছে এবং সদস্যের ব্যালেন্সে যোগ হয়েছে!'
        : 'জমার রিকোয়েস্ট জমা দেওয়া হয়েছে, মেস ম্যানেজারের অনুমোদনের পর যোগ হবে।',
    });
  } catch (err: any) {
    console.error('Error in POST /api/deposits:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    const currentUserId = (session.user as any).id || session.user.email;
    const userRole = (session.user as any).role;
    const isSuperAdmin = userRole === 'super_admin' || (session.user as any).isSuperAdmin;
    const isManager = userRole === 'admin' || isSuperAdmin;

    const { searchParams } = new URL(request.url);
    let depositId = searchParams.get('id') || searchParams.get('depositId');

    if (!depositId) {
      try {
        const body = await request.json();
        depositId = body.depositId || body.id;
      } catch {
        // query param fallback
      }
    }

    if (!depositId) {
      return NextResponse.json({ success: false, error: 'জমা আইডি প্রদান করুন' }, { status: 400 });
    }

    const targetDeposit = await db.collection('deposits').findOne(idFilter(depositId));
    if (!targetDeposit) {
      return NextResponse.json({ success: false, error: 'জমার রেকর্ড পাওয়া যায়নি' }, { status: 404 });
    }

    if (!isManager && targetDeposit.userId !== currentUserId) {
      return NextResponse.json({ success: false, error: 'আপনার এই জমা মুছে ফেলার অনুমতি নেই' }, { status: 403 });
    }

    // Revert rent if linked
    await db.collection('member_cycles').updateMany(
      { rentDepositId: { $in: [depositId, targetDeposit._id.toString()] } },
      {
        $set: {
          rentPaid: false,
          rentPaidAt: null,
          rentDepositId: null,
          rentNotes: '',
          updatedAt: new Date(),
        },
      }
    );

    await db.collection('deposits').deleteOne(idFilter(depositId));

    await recordAuditLog({
      messId: targetDeposit.messId,
      cycleId: targetDeposit.cycleId,
      performedByUserId: currentUserId,
      performedByUserName: session.user.name || undefined,
      action: 'DELETE_DEPOSIT',
      targetCollection: 'deposits',
      targetId: String(targetDeposit._id),
      previousValue: targetDeposit,
      newValue: null,
    });

    return NextResponse.json({
      success: true,
      message: 'জমার রেকর্ড সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে',
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/deposits:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
