import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, idFilter, userKeyFilter, safeObjectId } from '@/lib/db';
import { getStore } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    // Determine target cycle safely
    let cycleId = searchParams.get('cycleId');
    let targetCycle: any;

    if (cycleId) {
      targetCycle = await db.collection('cycles').findOne(idFilter(cycleId));
    }

    if (!targetCycle) {
      targetCycle = (await db.collection('cycles').findOne({ status: 'open' })) || (await db.collection('cycles').findOne());
      cycleId = targetCycle ? targetCycle._id.toString() : 'cycle_1';
    }

    // Fetch members and their cycle settings
    const users = await db.collection('users').find({ role: { $ne: 'super_admin' } }).toArray();

    // Query member_cycles matching any variation of cycleId
    const possibleCycleIds = Array.from(new Set([cycleId, targetCycle?._id?.toString()].filter(Boolean) as string[]));
    const memberCycles = await db.collection('member_cycles').find({ cycleId: { $in: possibleCycleIds } }).toArray();
    const memberships = await db.collection('memberships').find().toArray();

    let totalRentDue = 0;
    let totalRentCollected = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const rentList = users
      .filter((u: any) => {
        const userIdStr = u._id.toString();
        const mem = memberships.find((m: any) => m.userId === userIdStr || m.userId === u._id);
        return mem ? mem.status === 'active' : true;
      })
      .map((u: any) => {
        const userIdStr = u._id.toString();
        const mc = memberCycles.find((m: any) => m.userId === userIdStr || m.userId === u._id);
        const userDetails = u.userDetails || {};
        const effectiveName = u.displayName || userDetails.displayName || u.name || 'সদস্য';
        const roomRent = mc ? Number(mc.roomRent || 0) : 3000;
        const isPaid = Boolean(mc?.rentPaid);
        const isActive = mc ? Boolean(mc.isActive) : true;

        if (isActive) {
          totalRentDue += roomRent;
          if (isPaid) {
            totalRentCollected += roomRent;
            paidCount++;
          } else {
            pendingCount++;
          }
        }

        return {
          userId: userIdStr,
          name: effectiveName,
          displayName: effectiveName,
          email: u.email,
          phone: u.phone || userDetails.phone || '',
          whatsapp: u.whatsapp || userDetails.whatsapp || '',
          image: u.image || '',
          roomRent,
          rentPaid: isPaid,
          rentPaidAt: mc?.rentPaidAt || null,
          rentDepositId: mc?.rentDepositId || null,
          rentPaidMethod: mc?.rentPaidMethod || 'cash',
          rentNotes: mc?.rentNotes || '',
          isActive,
        };
      });

    return NextResponse.json({
      success: true,
      cycle: targetCycle ? { ...targetCycle, _id: targetCycle._id.toString() } : null,
      summary: {
        totalRentDue,
        totalRentCollected,
        totalRentPending: Math.max(0, totalRentDue - totalRentCollected),
        paidCount,
        pendingCount,
        totalMembers: rentList.filter((m: any) => m.isActive).length,
      },
      members: rentList,
    });
  } catch (err: any) {
    console.error('Error in GET /api/rent:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const isSuperAdmin = userRole === 'super_admin' || (session.user as any).isSuperAdmin;
    const isManager = userRole === 'admin' || isSuperAdmin;

    if (!isManager) {
      return NextResponse.json({ success: false, error: 'কেবলমাত্র সুপার অ্যাডমিন ও মেস ম্যানেজার বাসা ভাড়া নিয়ন্ত্রণ করতে পারেন' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, cycleId, amount, paymentMethod = 'cash', notes, paidAt } = body;

    if (!userId || !cycleId) {
      return NextResponse.json({ success: false, error: 'ইউজার ও সাইকেল আইডি আবশ্যক' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    const userIdStr = String(userId);
    const cycleIdStr = String(cycleId);

    const cycle = await db.collection('cycles').findOne(idFilter(cycleIdStr));
    const messId = cycle?.messId || 'mess_1';

    const possibleCycleIds = Array.from(new Set([cycleIdStr, cycle?._id?.toString()].filter(Boolean) as string[]));
    const mcFilter = {
      cycleId: { $in: possibleCycleIds },
      ...userKeyFilter('userId', userIdStr),
    };

    // 1. MARK RENT AS PAID (Interactive modal action)
    if (action === 'mark_rent_paid') {
      const existingMc = await db.collection('member_cycles').findOne(mcFilter);
      const roomRent = amount ? Number(amount) : (existingMc?.roomRent || 3000);

      // Determine payment date & timestamp
      const parsedDate = paidAt ? new Date(paidAt) : new Date();
      const effectivePaidAt = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
      const dateStr = effectivePaidAt.toISOString().split('T')[0];

      // Create a deposit record for the rent paid (automatically credits member's account)
      const depositResult = await db.collection('deposits').insertOne({
        userId: userIdStr,
        cycleId: cycleIdStr,
        messId,
        amount: roomRent,
        date: dateStr,
        type: 'general', // General credit offsets the roomRent in billing engine
        isPaid: true,
        notes: notes || `বাসা ভাড়া পরিশোধ (${cycle?.name || 'চলতি মাস'}) - ${paymentMethod}`,
        paymentMethod,
        paidAt: effectivePaidAt,
        createdAt: new Date(),
      });

      const rentDepositId = depositResult.insertedId.toString();

      if (existingMc) {
        await db.collection('member_cycles').updateOne(mcFilter, {
          $set: {
            rentPaid: true,
            rentPaidAt: effectivePaidAt,
            rentDepositId,
            rentPaidMethod: paymentMethod,
            rentNotes: notes || '',
            roomRent,
            updatedAt: new Date(),
          },
        });
      } else {
        await db.collection('member_cycles').insertOne({
          userId: userIdStr,
          cycleId: cycleIdStr,
          messId,
          roomRent,
          rentPaid: true,
          rentPaidAt: effectivePaidAt,
          rentDepositId,
          rentPaidMethod: paymentMethod,
          rentNotes: notes || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Record audit log
      await db.collection('audit_logs').insertOne({
        messId,
        cycleId: cycleIdStr,
        performedByUserId: (session.user as any).id,
        performedByUserName: session.user.name || 'Admin',
        action: 'MARK_RENT_PAID',
        targetCollection: 'member_cycles',
        targetId: userIdStr,
        newValue: { amount: roomRent, rentDepositId, paymentMethod, paidAt: effectivePaidAt, notes },
        createdAt: new Date(),
      });

      // Sync store
      try {
        const store = await getStore();
        const storeMc = store.memberCycles.find((m) => m.userId === userIdStr && possibleCycleIds.includes(m.cycleId));
        if (storeMc) {
          (storeMc as any).rentPaid = true;
          (storeMc as any).rentPaidAt = effectivePaidAt;
          (storeMc as any).rentDepositId = rentDepositId;
          (storeMc as any).rentPaidMethod = paymentMethod;
          (storeMc as any).rentNotes = notes || '';
        }
      } catch (e) {
        // non-fatal
      }

      return NextResponse.json({
        success: true,
        message: `বাসা ভাড়া ৳${roomRent.toLocaleString('bn-BD')} সফলভাবে আদায় ও জমা হিসেবে রেকর্ড হয়েছে!`,
        rentDepositId,
      });
    }

    // 2. REVERT RENT PAID TO UNPAID (In case of mistake)
    if (action === 'revert_rent_paid') {
      const existingMc = await db.collection('member_cycles').findOne(mcFilter);
      if (existingMc?.rentDepositId) {
        // Delete or remove the linked deposit
        await db.collection('deposits').deleteOne(idFilter(existingMc.rentDepositId));
      }

      await db.collection('member_cycles').updateOne(mcFilter, {
        $set: {
          rentPaid: false,
          rentPaidAt: null,
          rentDepositId: null,
          rentNotes: null,
          updatedAt: new Date(),
        },
      });

      // Record audit log
      await db.collection('audit_logs').insertOne({
        messId,
        cycleId: cycleIdStr,
        performedByUserId: (session.user as any).id,
        performedByUserName: session.user.name || 'Admin',
        action: 'REVERT_RENT_PAID',
        targetCollection: 'member_cycles',
        targetId: userIdStr,
        createdAt: new Date(),
      });

      // Sync store
      try {
        const store = await getStore();
        const storeMc = store.memberCycles.find((m) => m.userId === userIdStr && possibleCycleIds.includes(m.cycleId));
        if (storeMc) {
          (storeMc as any).rentPaid = false;
          (storeMc as any).rentPaidAt = null;
          (storeMc as any).rentDepositId = null;
        }
      } catch (e) {
        // non-fatal
      }

      return NextResponse.json({
        success: true,
        message: 'বাসা ভাড়া সফলভাবে বকেয়া হিসেবে রিভার্স করা হয়েছে',
      });
    }

    // 3. UPDATE ROOM RENT AMOUNT
    if (action === 'update_room_rent') {
      const newRent = Number(body.roomRent);
      if (isNaN(newRent) || newRent < 0) {
        return NextResponse.json({ success: false, error: 'সঠিক টাকার পরিমাণ দিন' }, { status: 400 });
      }

      await db.collection('member_cycles').updateOne(
        mcFilter,
        {
          $set: { roomRent: newRent, updatedAt: new Date() },
          $setOnInsert: {
            userId: userIdStr,
            cycleId: cycleIdStr,
            messId,
            isActive: true,
            rentPaid: false,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: 'সদস্যের বাসা ভাড়া সফলভাবে আপডেট হয়েছে',
      });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ অ্যাকশন' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/rent:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
