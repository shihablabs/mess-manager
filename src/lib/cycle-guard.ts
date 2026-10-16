import { NextResponse } from 'next/server';
import { Db } from 'mongodb';
import { getDb, idFilter } from './db';
import { getStore } from './store';

export interface CycleGuardOptions {
  db?: Db | null;
  errorMessage?: string;
}

/**
 * Central Cycle Status Guard (SRS Section 4.7 & Checkpoint চ)
 * Prevents any modification/write mutation to a closed cycle.
 * Returns a 403 Forbidden response with code: 'CYCLE_CLOSED' if closed, or null if open.
 */
export async function assertCycleOpen(
  cycleId?: string | null,
  options?: CycleGuardOptions
): Promise<NextResponse | null> {
  if (!cycleId) return null;

  const cycleIdStr = String(cycleId).trim();
  if (!cycleIdStr) return null;

  try {
    const db = options?.db !== undefined ? options.db : await getDb();
    if (db) {
      const cycle = await db.collection('cycles').findOne(idFilter(cycleIdStr));
      if (cycle && cycle.status === 'closed') {
        return NextResponse.json(
          {
            success: false,
            error:
              options?.errorMessage ||
              'এই চক্রটি ইতোমধ্যে সমাপ্ত/বন্ধ করা হয়েছে। বন্ধ চক্রে কোনো নতুন তথ্য এন্ট্রি, পরিবর্তন বা মুছে ফেলা যাবে না।',
            code: 'CYCLE_CLOSED',
          },
          { status: 403 }
        );
      }
    } else {
      const store = await getStore();
      const cycle = store.cycles.find((c) => c._id === cycleIdStr);
      if (cycle && cycle.status === 'closed') {
        return NextResponse.json(
          {
            success: false,
            error:
              options?.errorMessage ||
              'এই চক্রটি ইতোমধ্যে সমাপ্ত/বন্ধ করা হয়েছে। বন্ধ চক্রে কোনো নতুন তথ্য এন্ট্রি, পরিবর্তন বা মুছে ফেলা যাবে না।',
            code: 'CYCLE_CLOSED',
          },
          { status: 403 }
        );
      }
    }
  } catch (err) {
    console.error('assertCycleOpen error:', err);
  }

  return null;
}
