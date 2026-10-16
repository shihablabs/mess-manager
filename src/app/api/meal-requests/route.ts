import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb, idFilter } from '@/lib/db';
import { MealRequestDoc, MealDoc } from '@/models/types';
import { isMealRequestLate } from '@/billing-engine';
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
  const status = searchParams.get('status');

  let list = store.mealRequests.filter((r) => r.cycleId === cycleId);
  if (status) list = list.filter((r) => r.status === status);

  const enriched = list.map((r) => {
    const user = store.users.find((u) => u._id === r.userId);
    let slotDisplay = 'সারাদিন (সব মিল)';
    if (r.slotId === 'morning') slotDisplay = 'সকালের মিল';
    if (r.slotId === 'lunch') slotDisplay = 'দুপুরের মিল';
    if (r.slotId === 'night') slotDisplay = 'রাতের মিল';

    return {
      ...r,
      userName: user ? user.name : 'সদস্য',
      slotName: slotDisplay,
    };
  });

  return NextResponse.json({ success: true, requests: enriched });
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
      requestId,
      allowUpdate = false,
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
      date,
      startDate,
      endDate,
      slotId = 'both', // 'morning' | 'lunch' | 'night' | 'both' | 'all'
      action = 'off', // 'off' | 'on'
      reason,
      isAdminDirect = false,
      adminUserId,
      isLate: explicitIsLate,
    } = body;

    const isManager = caller.role === 'admin' || caller.role === 'super_admin';

    // Member can only submit for themselves
    if (!isManager && userId && String(userId) !== String(caller.id) && String(userId) !== String(caller.email)) {
      return NextResponse.json(
        { success: false, error: 'সাধারণ সদস্য শুধুমাত্র নিজের মিল পরিবর্তনের আবেদন করতে পারেন (403 Forbidden)' },
        { status: 403 }
      );
    }

    const effectiveUserId = isManager ? (userId || caller.id) : caller.id;
    const effectiveIsAdminDirect = isManager ? Boolean(isAdminDirect) : false;

    const cycleClosedResponse = await assertCycleOpen(cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const fromDate = startDate || date;
    const toDate = endDate || fromDate;

    if (!fromDate) {
      return NextResponse.json({ success: false, error: 'তারিখ নির্বাচন আবশ্যক' }, { status: 400 });
    }

    // DUPLICATE CHECK: On the same date, a member should only have 1 active meal request
    if (db) {
      let existingReq: any = null;
      if (requestId) {
        existingReq = await db.collection('meal_requests').findOne(idFilter(requestId));
      } else {
        existingReq = await db.collection('meal_requests').findOne({
          userId: effectiveUserId,
          status: { $in: ['pending', 'approved'] },
          $or: [
            { date: { $gte: fromDate, $lte: toDate } },
            { startDate: { $lte: toDate }, endDate: { $gte: fromDate } },
            { date: fromDate },
          ],
        });
      }

      // If duplicate request exists and client is not intentionally editing it
      if (existingReq && !requestId && !allowUpdate) {
        const slotBangla =
          existingReq.slotId === 'morning'
            ? 'সকাল'
            : existingReq.slotId === 'lunch'
            ? 'দুপুর'
            : existingReq.slotId === 'night'
            ? 'রাত'
            : 'সারাদিন / উভয়';
        const actionBangla = existingReq.action === 'off' ? 'মিল বন্ধ (Off)' : 'মিল চালু (On)';

        return NextResponse.json(
          {
            success: false,
            code: 'DUPLICATE_MEAL_REQUEST',
            error: `এই তারিখে (${fromDate}) আপনার একটি মিল আবেদন ইতোমধ্যে বিদ্যমান রয়েছে (${slotBangla} - ${actionBangla}, অবস্থা: ${
              existingReq.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষমাণ'
            })। একই দিনে দুইবার আলাদা আবেদন করা যাবে না। আপনি পূর্বের আবেদনটি এডিট করে আপডেট করতে পারেন।`,
            existingRequest: {
              _id: existingReq._id,
              date: existingReq.date,
              startDate: existingReq.startDate || existingReq.date,
              endDate: existingReq.endDate || existingReq.date,
              slotId: existingReq.slotId,
              action: existingReq.action,
              reason: existingReq.reason,
              status: existingReq.status,
            },
          },
          { status: 409 }
        );
      }

      // If updating an existing request
      if (existingReq && (requestId || allowUpdate)) {
        const targetId = existingReq._id;

        // Read dynamic meal slots cutoff deadlines
        const mealSlots = store.mess?.mealSlots || [
          { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
          { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
        ];
        let isLate = explicitIsLate || false;
        if (!isLate) {
          isLate = isMealRequestLate(fromDate, slotId, mealSlots, new Date());
        }

        const updateFields: any = {
          slotId,
          action,
          reason,
          date: fromDate,
          startDate: fromDate,
          endDate: toDate,
          isLate,
          updatedAt: new Date(),
        };

        if (effectiveIsAdminDirect) {
          updateFields.status = 'approved';
        }

        await db.collection('meal_requests').updateOne(idFilter(targetId), {
          $set: updateFields,
        });

        await recordAuditLog({
          messId: existingReq.messId || (store.mess._id as string),
          cycleId: existingReq.cycleId,
          performedByUserId: caller.id,
          action: 'UPDATE_MEAL_REQUEST',
          targetCollection: 'meal_requests',
          targetId: String(targetId),
          previousValue: existingReq,
          newValue: updateFields,
        });

        // If admin direct action, update meals immediately
        if (effectiveIsAdminDirect || existingReq.status === 'approved') {
          const start = new Date(fromDate);
          const end = new Date(toDate);
          const slotsToUpdate =
            slotId === 'both' || slotId === 'all'
              ? ['morning', 'lunch', 'night']
              : [slotId];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            for (const sId of slotsToUpdate) {
              const consumed = action === 'off' ? 0 : 1;
              await db.collection('meals').updateOne(
                {
                  userId: effectiveUserId,
                  cycleId,
                  date: dateStr,
                  slotId: sId,
                },
                {
                  $set: {
                    consumed,
                    weight: 1.0,
                    updatedAt: new Date(),
                  },
                  $setOnInsert: {
                    _id: `meal_${sId[0]}_${effectiveUserId}_${dateStr}`,
                    messId: store.mess._id as string,
                    createdAt: new Date(),
                  },
                },
                { upsert: true }
              );
            }
          }
        }

        return NextResponse.json({
          success: true,
          updated: true,
          request: { ...existingReq, ...updateFields },
          message: effectiveIsAdminDirect
            ? 'মিল সফলভাবে আপডেট করা হয়েছে'
            : isLate
            ? 'বিলম্বিত আবেদন হিসেবে আপডেট সম্পন্ন হয়েছে (ম্যানেজারের অনুমোদনের অপেক্ষায়)'
            : 'মিল আবেদন সফলভাবে সংশোধন / আপডেট করা হয়েছে',
        });
      }
    }

    // Read dynamic meal slots cutoff deadlines from mess configuration (SRS 4.5 & Task 8)
    const mealSlots = store.mess?.mealSlots || [
      { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
    ];

    let isLate = explicitIsLate || false;
    if (!isLate) {
      isLate = isMealRequestLate(fromDate, slotId, mealSlots, new Date());
    }

    const newReq: any = {
      _id: `mr_${Date.now()}`,
      userId: effectiveUserId,
      cycleId,
      messId: store.mess._id as string,
      date: fromDate,
      startDate: fromDate,
      endDate: toDate,
      slotId,
      action,
      isLate,
      status: effectiveIsAdminDirect ? 'approved' : 'pending',
      reason,
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('meal_requests').insertOne(newReq);

      await recordAuditLog({
        messId: newReq.messId,
        cycleId: newReq.cycleId,
        performedByUserId: caller.id,
        action: effectiveIsAdminDirect ? 'DIRECT_UPDATE_MEAL' : 'CREATE_MEAL_REQUEST',
        targetCollection: 'meal_requests',
        targetId: String(newReq._id),
        previousValue: null,
        newValue: newReq,
      });

      // If admin direct action, apply immediately to meals
      if (effectiveIsAdminDirect) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const slotsToUpdate =
          slotId === 'both' || slotId === 'all'
            ? ['morning', 'lunch', 'night']
            : [slotId];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          for (const sId of slotsToUpdate) {
            const consumed = action === 'off' ? 0 : 1;

            await db.collection('meals').updateOne(
              {
                userId: effectiveUserId,
                cycleId,
                date: dateStr,
                slotId: sId,
              },
              {
                $set: {
                  consumed,
                  weight: 1.0,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  _id: `meal_${sId[0]}_${effectiveUserId}_${dateStr}`,
                  messId: store.mess._id as string,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      request: newReq,
      message: isAdminDirect
        ? 'মিল সফলভাবে আপডেট করা হয়েছে'
        : isLate
        ? 'ডেডলাইন পার হয়ে যাওয়ায় বিলম্বিত আবেদন হিসেবে অ্যাডমিনের পর্যালোচনার জন্য জমা হয়েছে'
        : 'মিল পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;
    const isManager = caller.role === 'admin' || caller.role === 'super_admin';

    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      id,
      status,
      adminUserId,
      adminNote,
      startDate: updatedStartDate,
      endDate: updatedEndDate,
      slotId: updatedSlotId,
      action: updatedAction,
      reason: updatedReason,
    } = body;

    // Role Guard: Regular members cannot approve or reject requests
    if (!isManager && status) {
      return NextResponse.json(
        { success: false, error: 'সাধারণ সদস্য আবেদন অনুমোদন বা বাতিল করতে পারেন না (403 Forbidden)' },
        { status: 403 }
      );
    }

    let reqItem: any = store.mealRequests.find((r) => String(r._id) === String(id));
    if (!reqItem && db) {
      reqItem = await db.collection('meal_requests').findOne(idFilter(id));
    }

    if (!reqItem) {
      return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
    }

    // Role Guard: Members can only edit their own requests
    if (!isManager) {
      if (String(reqItem.userId) !== String(caller.id) && String(reqItem.userId) !== String(caller.email)) {
        return NextResponse.json(
          { success: false, error: 'অন্য সদস্যের আবেদন পরিবর্তন করার অনুমতি নেই (403 Forbidden)' },
          { status: 403 }
        );
      }
    }

    const cycleClosedResponse = await assertCycleOpen(reqItem.cycleId, { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    const currentUserId = caller.id;

    if (status === 'approved') {
      const creatorUser = store.users.find((u) => u._id === reqItem.userId);
      const approverEmail = caller.email;
      const selfCheck = checkSelfApproval(
        reqItem.userId,
        currentUserId,
        'meal_request',
        creatorUser?.email,
        approverEmail
      );
      if (selfCheck.forbidden) {
        return NextResponse.json({ success: false, error: selfCheck.message }, { status: 403 });
      }
    }

    const oldStartDate = reqItem.startDate || reqItem.date;
    const oldEndDate = reqItem.endDate || oldStartDate;
    const finalStartDate = updatedStartDate || oldStartDate;
    const finalEndDate = updatedEndDate || oldEndDate;
    const finalStatus = status || reqItem.status;
    const finalSlotId = updatedSlotId || reqItem.slotId;
    const finalAction = updatedAction || reqItem.action;
    const finalReason = updatedReason !== undefined ? updatedReason : reqItem.reason;

    if (db) {
      await db.collection('meal_requests').updateOne(
        idFilter(id),
        {
          $set: {
            status: finalStatus,
            startDate: finalStartDate,
            endDate: finalEndDate,
            date: finalStartDate,
            slotId: finalSlotId,
            action: finalAction,
            reason: finalReason,
            adminNote: adminNote !== undefined ? adminNote : reqItem.adminNote,
            ...(isManager && status ? { reviewedBy: caller.id, reviewedAt: new Date() } : {}),
            updatedAt: new Date(),
          },
        }
      );

      // If approved, update meals in DB for all dates in range
      if (finalStatus === 'approved') {
        const start = new Date(finalStartDate);
        const end = new Date(finalEndDate);
        const slotsToUpdate =
          finalSlotId === 'both' || finalSlotId === 'all'
            ? ['morning', 'lunch', 'night']
            : [finalSlotId];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          for (const sId of slotsToUpdate) {
            const consumed = finalAction === 'off' ? 0 : 1;

            await db.collection('meals').updateOne(
              {
                userId: reqItem.userId,
                cycleId: reqItem.cycleId,
                date: dateStr,
                slotId: sId,
              },
              {
                $set: {
                  consumed,
                  weight: 1.0,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  _id: `meal_${sId[0]}_${reqItem.userId}_${dateStr}`,
                  messId: store.mess._id as string,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }

        // If leave was shortened early (finalEndDate < oldEndDate), restore meals for remaining days to 1
        if (reqItem.action === 'off' && finalEndDate < oldEndDate) {
          const nextDay = new Date(finalEndDate);
          nextDay.setDate(nextDay.getDate() + 1);
          const oldEnd = new Date(oldEndDate);

          for (let d = new Date(nextDay); d <= oldEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            for (const sId of slotsToUpdate) {
              await db.collection('meals').updateOne(
                {
                  userId: reqItem.userId,
                  cycleId: reqItem.cycleId,
                  date: dateStr,
                  slotId: sId,
                },
                {
                  $set: {
                    consumed: 1,
                    weight: 1.0,
                    updatedAt: new Date(),
                  },
                },
                { upsert: true }
              );
            }
          }
        }
      }

      await recordAuditLog({
        messId: reqItem.messId || (store.mess._id as string),
        cycleId: reqItem.cycleId,
        performedByUserId: caller.id,
        action: finalStatus === 'approved' ? 'APPROVE_MEAL_REQUEST' : 'UPDATE_MEAL_REQUEST',
        targetCollection: 'meal_requests',
        targetId: String(id),
        previousValue: reqItem,
        newValue: { status: finalStatus, startDate: finalStartDate, endDate: finalEndDate, adminNote, reviewedBy: caller.id },
      });
    }

    reqItem.status = finalStatus;
    reqItem.startDate = finalStartDate;
    reqItem.endDate = finalEndDate;
    reqItem.date = finalStartDate;
    if (adminNote !== undefined) reqItem.adminNote = adminNote;

    return NextResponse.json({ success: true, message: 'মিল অনুরোধ পর্যালোচনা ও আপডেট সম্পন্ন হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireActiveMember();
    if (!auth.authorized) return auth.response;
    const caller = auth.user;
    const isManager = caller.role === 'admin' || caller.role === 'super_admin';

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'অনুরোধ আইডি আবশ্যক' }, { status: 400 });
    }

    const store = await getStore();
    const db = await getDb();

    let reqItem: any = store.mealRequests.find((r) => String(r._id) === String(id));
    if (!reqItem && db) {
      reqItem = await db.collection('meal_requests').findOne(idFilter(id));
    }

    if (!reqItem) {
      return NextResponse.json({ success: false, error: 'অনুরোধ পাওয়া যায়নি' }, { status: 404 });
    }

    if (!isManager && String(reqItem.userId) !== String(caller.id) && String(reqItem.userId) !== String(caller.email)) {
      return NextResponse.json({ success: false, error: 'অন্যের অনুরোধ বাতিল করার অনুমতি নেই' }, { status: 403 });
    }

    const cycleClosedResponse = await assertCycleOpen(reqItem?.cycleId || '', { db });
    if (cycleClosedResponse) return cycleClosedResponse;

    if (db) {
      await db.collection('meal_requests').deleteOne(idFilter(id));

      // If it was an approved off leave request, restore meals to 1
      if (reqItem && reqItem.action === 'off' && reqItem.status === 'approved') {
        const fromDate = reqItem.startDate || reqItem.date;
        const toDate = reqItem.endDate || fromDate;
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const slotsToUpdate =
          reqItem.slotId === 'both' || reqItem.slotId === 'all'
            ? ['morning', 'lunch', 'night']
            : [reqItem.slotId];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          for (const sId of slotsToUpdate) {
            await db.collection('meals').updateOne(
              {
                userId: reqItem.userId,
                cycleId: reqItem.cycleId,
                date: dateStr,
                slotId: sId,
              },
              {
                $set: {
                  consumed: 1,
                  weight: 1.0,
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
      }

      await recordAuditLog({
        messId: reqItem?.messId || (store.mess._id as string),
        cycleId: reqItem?.cycleId || '',
        performedByUserId: caller.id,
        action: 'DELETE_MEAL_REQUEST',
        targetCollection: 'meal_requests',
        targetId: String(id),
        previousValue: reqItem,
        newValue: null,
      });
    }

    store.mealRequests = store.mealRequests.filter((r) => String(r._id) !== String(id));

    return NextResponse.json({ success: true, message: 'অনুরোধ বাতিল ও মিল পুনরুদ্ধার সম্পন্ন হয়েছে' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
