import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { SlotRequestDoc, BazarSlotDoc } from '@/models/types';
import { recordAuditLog } from '@/lib/audit';
import { checkSelfApproval } from '@/lib/self-approval';

export async function GET(request: Request) {
  try {
    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';
    const cycle = store.cycles.find((c) => c._id === cycleId) || store.cycles[0];

    // Auto-initialize slots based on cycle days / buyer count if none exist for this cycle
    let cycleSlots = store.bazarSlots.filter((s) => s.cycleId === cycleId);
    if (cycleSlots.length === 0) {
      store.generateSlots(cycleId, 0, false);
      cycleSlots = store.bazarSlots.filter((s) => s.cycleId === cycleId);
      const db = await getDb();
      if (db && cycleSlots.length > 0) {
        await db.collection('bazar_slots').insertMany(cycleSlots as any[]);
      }
    }

    // Sort slots by slotIndex
    cycleSlots.sort((a, b) => a.slotIndex - b.slotIndex);

    // Calculate total cycle bazar
    const approvedBazars = store.bazars.filter(
      (b) => b.cycleId === cycleId && (b.status === 'approved' || (b as any).isApproved)
    );
    const totalCycleBazar = approvedBazars.reduce((sum, b) => sum + (b.amount || 0), 0);

    const enrichedSlots = cycleSlots.map((s) => {
      // Calculate total bazar spent during this slot's date window
      const slotBazarTotal = approvedBazars
        .filter((b) => b.date >= s.startDate && b.date <= s.endDate)
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      const assignedUsers = s.assignedUserIds.map((uid) => {
        const u = store.users.find((user) => user._id === uid);
        const memberBazarSpent = approvedBazars
          .filter((b) => b.userId === uid)
          .reduce((sum, b) => sum + (b.amount || 0), 0);

        return {
          id: uid,
          name: u ? u.name : 'সদস্য',
          email: u ? u.email : '',
          image: u?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          role: u?.role || 'member',
          spentThisMonth: memberBazarSpent,
        };
      });

      return {
        ...s,
        assignedUsers,
        slotBazarTotal,
      };
    });

    const slotRequests = store.slotRequests.filter((r) => r.cycleId === cycleId);
    const enrichedRequests = slotRequests.map((r) => {
      const fromU = store.users.find((user) => user._id === (r.fromUserId || r.userId));
      const toU = r.toUserId ? store.users.find((user) => user._id === r.toUserId) : null;
      const fromSlot = cycleSlots.find((s) => s.slotIndex === r.fromSlotIndex);
      const toSlot = cycleSlots.find((s) => s.slotIndex === r.toSlotIndex);

      return {
        ...r,
        userName: fromU ? fromU.name : 'সদস্য',
        fromUser: fromU
          ? {
              id: fromU._id,
              name: fromU.name,
              image: fromU.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${fromU._id}`,
            }
          : null,
        toUser: toU
          ? {
              id: toU._id,
              name: toU.name,
              image: toU.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${toU._id}`,
            }
          : null,
        fromSlotDates: fromSlot ? `${fromSlot.startDate} হতে ${fromSlot.endDate}` : `স্লট #${r.fromSlotIndex}`,
        toSlotDates: toSlot ? `${toSlot.startDate} হতে ${toSlot.endDate}` : `স্লট #${r.toSlotIndex}`,
      };
    });

    return NextResponse.json({
      success: true,
      slots: enrichedSlots,
      requests: enrichedRequests,
      cycleSummary: {
        cycleId,
        cycleName: cycle?.name || 'চলতি চক্র',
        startDate: cycle?.startDate || '2026-10-01',
        endDate: cycle?.endDate || '2026-10-31',
        totalBazar: totalCycleBazar,
        totalSlots: enrichedSlots.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      action,
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      fromSlotIndex,
      toSlotIndex,
      slotIndexA,
      slotIndexB,
      toUserId,
      requestId,
      decision, // 'accept' | 'reject'
      reason,
      shiftOffset = 0,
      isReverse = false,
      slotIndex,
      assignedUserId,
      startDate,
      endDate,
    } = body;

    // 1. Auto generate slots: total cycle days ÷ buyer count (remainder to first slots)
    if (action === 'auto_generate' || action === 'generate_slots') {
      store.generateSlots(cycleId, Number(shiftOffset) || 0, isReverse);
      const generated = store.bazarSlots.filter((s) => s.cycleId === cycleId);

      if (db) {
        const prevSlots = await db.collection('bazar_slots').find({ cycleId }).toArray();
        await db.collection('bazar_slots').deleteMany({ cycleId });
        if (generated.length > 0) {
          await db.collection('bazar_slots').insertMany(generated as any[]);
        }

        await recordAuditLog({
          messId: store.mess._id as string,
          cycleId,
          performedByUserId: userId || 'admin',
          action: 'GENERATE_BAZAR_SLOTS',
          targetCollection: 'bazar_slots',
          targetId: cycleId,
          previousValue: { count: prevSlots.length, slots: prevSlots },
          newValue: { count: generated.length, slots: generated },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'চক্রের মোট দিন ও সদস্য অনুপাতে মাসিক বাজার বণ্টন সফলভাবে তৈরি হয়েছে!',
        slots: generated,
      });
    }

    // 2. Rotate / Shift roster order for next month
    if (action === 'rotate_slots') {
      const currentSlots = store.bazarSlots
        .filter((s) => s.cycleId === cycleId)
        .sort((a, b) => a.slotIndex - b.slotIndex);

      if (currentSlots.length < 2) {
        return NextResponse.json({ success: false, error: 'রোটেশন করার জন্য পর্যাপ্ত স্লট নেই' }, { status: 400 });
      }

      // Collect current assigned user IDs
      const currentUsers = currentSlots.map((s) => s.assignedUserIds[0]);

      // If isReverse is requested: reverse the sequence
      // Otherwise shift forward by 1: first member becomes second, second becomes third, last becomes first
      let newUsers: string[] = [];
      if (isReverse) {
        newUsers = [...currentUsers].reverse();
      } else {
        const offset = Number(shiftOffset) || 1;
        const norm = offset % currentUsers.length;
        newUsers = currentUsers.slice(norm).concat(currentUsers.slice(0, norm));
      }

      // Apply new users to slots
      currentSlots.forEach((slot, idx) => {
        slot.assignedUserIds = [newUsers[idx]];
      });

      if (db) {
        for (const slot of currentSlots) {
          await db.collection('bazar_slots').updateOne(
            { cycleId, slotIndex: slot.slotIndex },
            { $set: { assignedUserIds: slot.assignedUserIds, updatedAt: new Date() } }
          );
        }

        await recordAuditLog({
          messId: store.mess._id as string,
          cycleId,
          performedByUserId: userId || 'admin',
          action: 'ROTATE_BAZAR_SLOTS',
          targetCollection: 'bazar_slots',
          targetId: cycleId,
          previousValue: { order: currentUsers },
          newValue: { order: newUsers, isReverse, shiftOffset },
        });
      }

      return NextResponse.json({
        success: true,
        message: isReverse
          ? 'বাজার তালিকা বিপরীতক্রমে (Reverse) সাজানো হয়েছে!'
          : 'পরবর্তী মাসের জন্য বাজার তালিকা ১ ধাপ শিফট/রোটেট করা হয়েছে!',
        slots: currentSlots,
      });
    }

    // 3. Peer-to-Peer Duty Swap Request (Member to Member)
    if (action === 'request_peer_swap') {
      if (!fromSlotIndex || !toSlotIndex) {
        return NextResponse.json({ success: false, error: 'স্লট নম্বর আবশ্যক' }, { status: 400 });
      }

      const newReq: SlotRequestDoc = {
        _id: `sr_${Date.now()}`,
        userId,
        fromUserId: userId,
        toUserId,
        cycleId,
        messId: store.mess._id as string,
        fromSlotIndex: Number(fromSlotIndex),
        toSlotIndex: Number(toSlotIndex),
        status: 'pending',
        reason,
        createdAt: new Date(),
      };

      if (db) {
        await db.collection('slot_requests').insertOne(newReq as any);

        await recordAuditLog({
          messId: newReq.messId,
          cycleId: newReq.cycleId,
          performedByUserId: userId || 'user',
          action: 'REQUEST_SLOT_SWAP',
          targetCollection: 'slot_requests',
          targetId: String(newReq._id),
          previousValue: null,
          newValue: newReq,
        });
      }
      store.slotRequests.unshift(newReq);

      return NextResponse.json({
        success: true,
        request: newReq,
        message: 'বাজার ডিউটি সোয়াপের আবেদন সফলভাবে পাঠানো হয়েছে!',
      });
    }

    // 4. Respond to Peer Swap (Accept / Reject - NO admin required!)
    if (action === 'respond_peer_swap') {
      const reqItem = store.slotRequests.find((r) => r._id === requestId);
      if (!reqItem) {
        return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
      }

      const isAccept = decision === 'accept';
      const status = isAccept ? 'accepted' : 'rejected';

      if (isAccept) {
        const requesterId = reqItem.fromUserId || reqItem.userId;
        const requesterUser = store.users.find((u) => u._id === requesterId);
        const approverEmail = (session?.user as any)?.email;
        const selfCheck = checkSelfApproval(
          requesterId,
          userId,
          'slot_swap',
          requesterUser?.email,
          approverEmail
        );
        if (selfCheck.forbidden) {
          return NextResponse.json({ success: false, error: selfCheck.message }, { status: 403 });
        }

        // Perform the swap between fromSlot and toSlot
        const slotFrom = store.bazarSlots.find(
          (s) => s.cycleId === reqItem.cycleId && s.slotIndex === reqItem.fromSlotIndex
        );
        const slotTo = store.bazarSlots.find(
          (s) => s.cycleId === reqItem.cycleId && s.slotIndex === reqItem.toSlotIndex
        );

        if (slotFrom && slotTo) {
          const tempUsers = [...slotFrom.assignedUserIds];
          slotFrom.assignedUserIds = [...slotTo.assignedUserIds];
          slotTo.assignedUserIds = tempUsers;

          if (db) {
            await db.collection('bazar_slots').updateOne(
              { cycleId: reqItem.cycleId, slotIndex: reqItem.fromSlotIndex },
              { $set: { assignedUserIds: slotFrom.assignedUserIds, updatedAt: new Date() } }
            );
            await db.collection('bazar_slots').updateOne(
              { cycleId: reqItem.cycleId, slotIndex: reqItem.toSlotIndex },
              { $set: { assignedUserIds: slotTo.assignedUserIds, updatedAt: new Date() } }
            );
          }
        }
      }

      const prevReq = { ...reqItem };

      reqItem.status = status;
      reqItem.updatedAt = new Date();

      if (db) {
        await db.collection('slot_requests').updateOne(
          { _id: requestId },
          { $set: { status, updatedAt: new Date() } }
        );

        await recordAuditLog({
          messId: reqItem.messId || (store.mess._id as string),
          cycleId: reqItem.cycleId,
          performedByUserId: userId || reqItem.toUserId || 'user',
          action: isAccept ? 'ACCEPT_SLOT_SWAP' : 'REJECT_SLOT_SWAP',
          targetCollection: 'slot_requests',
          targetId: String(requestId),
          previousValue: prevReq,
          newValue: { status, updatedAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        message: isAccept
          ? 'বাজার ডিউটি সফলভাবে অদলবদল (Swap) হয়েছে!'
          : 'সোয়াপ অনুরোধ বাতিল করা হয়েছে',
      });
    }

    // 5. Super Admin Direct Swap (NO user permission needed)
    if (action === 'admin_direct_swap') {
      const idxA = Number(slotIndexA ?? fromSlotIndex);
      const idxB = Number(slotIndexB ?? toSlotIndex);

      if (!idxA || !idxB) {
        return NextResponse.json({ success: false, error: 'উভয় স্লট নির্বাচন করুন' }, { status: 400 });
      }

      const slotA = store.bazarSlots.find((s) => s.cycleId === cycleId && s.slotIndex === idxA);
      const slotB = store.bazarSlots.find((s) => s.cycleId === cycleId && s.slotIndex === idxB);

      if (!slotA || !slotB) {
        return NextResponse.json({ success: false, error: 'স্লট পাওয়া যায়নি' }, { status: 404 });
      }

      const temp = [...slotA.assignedUserIds];
      slotA.assignedUserIds = [...slotB.assignedUserIds];
      slotB.assignedUserIds = temp;

      if (db) {
        await db.collection('bazar_slots').updateOne(
          { cycleId, slotIndex: idxA },
          { $set: { assignedUserIds: slotA.assignedUserIds, updatedAt: new Date() } }
        );
        await db.collection('bazar_slots').updateOne(
          { cycleId, slotIndex: idxB },
          { $set: { assignedUserIds: slotB.assignedUserIds, updatedAt: new Date() } }
        );

        await recordAuditLog({
          messId: store.mess._id as string,
          cycleId,
          performedByUserId: userId || 'admin',
          action: 'ADMIN_DIRECT_SWAP_SLOTS',
          targetCollection: 'bazar_slots',
          targetId: `${cycleId}_${idxA}_${idxB}`,
          previousValue: {
            slotA: { slotIndex: idxA, assignedUserIds: temp },
            slotB: { slotIndex: idxB, assignedUserIds: slotA.assignedUserIds },
          },
          newValue: {
            slotA: { slotIndex: idxA, assignedUserIds: slotA.assignedUserIds },
            slotB: { slotIndex: idxB, assignedUserIds: slotB.assignedUserIds },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `সুপার অ্যাডমিন কর্তৃক স্লট #${idxA} এবং স্লট #${idxB} এর দায়িত্ব সফলভাবে অদলবদল করা হয়েছে!`,
      });
    }

    // 6. Super Admin Manual Slot Edit
    if (action === 'admin_update_slot') {
      const sIdx = Number(slotIndex);
      const slot = store.bazarSlots.find((s) => s.cycleId === cycleId && s.slotIndex === sIdx);
      if (!slot) {
        return NextResponse.json({ success: false, error: 'স্লট পাওয়া যায়নি' }, { status: 404 });
      }

      if (assignedUserId) slot.assignedUserIds = [assignedUserId];
      if (startDate) slot.startDate = startDate;
      if (endDate) slot.endDate = endDate;

      if (db) {
        const prevSlot = await db.collection('bazar_slots').findOne({ cycleId, slotIndex: sIdx });

        await db.collection('bazar_slots').updateOne(
          { cycleId, slotIndex: sIdx },
          {
            $set: {
              assignedUserIds: slot.assignedUserIds,
              startDate: slot.startDate,
              endDate: slot.endDate,
              updatedAt: new Date(),
            },
          }
        );

        await recordAuditLog({
          messId: store.mess._id as string,
          cycleId,
          performedByUserId: userId || 'admin',
          action: 'ADMIN_UPDATE_SLOT',
          targetCollection: 'bazar_slots',
          targetId: `${cycleId}_${sIdx}`,
          previousValue: prevSlot,
          newValue: {
            assignedUserIds: slot.assignedUserIds,
            startDate: slot.startDate,
            endDate: slot.endDate,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `স্লট #${sIdx} সফলভাবে হালনাগাদ করা হয়েছে!`,
      });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
