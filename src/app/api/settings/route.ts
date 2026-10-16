import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MealSlotDefinition } from '@/models/types';

import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const store = await getStore();
    return NextResponse.json({
      success: true,
      mess: store.mess,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const { action = 'update_meal_slots', mealSlots } = body;

    if (action === 'update_meal_slots') {
      if (!Array.isArray(mealSlots) || mealSlots.length === 0) {
        return NextResponse.json(
          { success: false, error: 'কমপক্ষে একটি মিল স্লট থাকতে হবে' },
          { status: 400 }
        );
      }

      // Validate each slot definition
      const sanitizedSlots: MealSlotDefinition[] = mealSlots.map((slot: any, idx: number) => {
        const id = String(slot.id || `slot_${idx + 1}`).trim().toLowerCase();
        const name = String(slot.name || '').trim();
        const weight = Number(slot.weight) > 0 ? Number(slot.weight) : 1.0;
        const cutoffTime = String(slot.cutoffTime || (id === 'morning' ? '22:00' : '16:00')).trim();
        const cutoffDayOffset =
          slot.cutoffDayOffset !== undefined && slot.cutoffDayOffset !== null
            ? Number(slot.cutoffDayOffset)
            : (id === 'morning' ? -1 : 0);

        if (!name) {
          throw new Error('প্রত্যেকটি স্লটের নাম পূরণ করা আবশ্যক');
        }

        return {
          id,
          name,
          weight,
          cutoffTime,
          cutoffDayOffset,
        };
      });

      const previousSlots = store.mess.mealSlots || [];

      // Update in-memory store
      store.mess.mealSlots = sanitizedSlots;
      store.mess.updatedAt = new Date();

      if (db) {
        await db.collection('messes').updateOne(
          { _id: store.mess._id as any },
          {
            $set: {
              mealSlots: sanitizedSlots,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Record audit log with previousValue & newValue
        await recordAuditLog({
          messId: String(store.mess._id),
          cycleId: store.cycles[0]?._id ? String(store.cycles[0]._id) : undefined,
          performedByUserId: (session?.user as any)?.id || 'admin',
          performedByUserName: session?.user?.name || 'Admin',
          action: 'UPDATE_MEAL_SLOTS_CONFIG',
          targetCollection: 'messes',
          targetId: String(store.mess._id),
          previousValue: { mealSlots: previousSlots },
          newValue: { mealSlots: sanitizedSlots },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'মিল স্লটের নাম, ওজন ও বন্ধের সময় (Cutoff Time) সফলভাবে সংরক্ষিত হয়েছে!',
        mealSlots: sanitizedSlots,
      });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
