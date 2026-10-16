import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb } from '@/lib/db';
import { requireRole } from '@/lib/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireRole('super_admin');
    if (!auth.authorized) return auth.response;

    const store = await getStore();
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    // Retrieve complete database state
    let users = store.users;
    let cycles = store.cycles;
    let memberCycles = store.memberCycles;
    let meals = store.meals;
    let bazars = store.bazars;
    let deposits = store.deposits;
    let fixedEvents = store.fixedEvents;
    let bills = store.bills;
    let cycleSnapshots = store.cycleSnapshots;

    if (db) {
      const [
        dbUsers,
        dbCycles,
        dbMemberCycles,
        dbMeals,
        dbBazars,
        dbDeposits,
        dbFixedEvents,
        dbBills,
        dbSnapshots,
      ] = await Promise.all([
        db.collection('users').find().toArray(),
        db.collection('cycles').find().toArray(),
        db.collection('member_cycles').find().toArray(),
        db.collection('meals').find().toArray(),
        db.collection('bazars').find().toArray(),
        db.collection('deposits').find().toArray(),
        db.collection('fixed_events').find().toArray(),
        db.collection('utilities').find().toArray(),
        db.collection('cycle_snapshots').find().toArray(),
      ]);

      if (dbUsers.length > 0) users = dbUsers as any;
      if (dbCycles.length > 0) cycles = dbCycles as any;
      if (dbMemberCycles.length > 0) memberCycles = dbMemberCycles as any;
      if (dbMeals.length > 0) meals = dbMeals as any;
      if (dbBazars.length > 0) bazars = dbBazars as any;
      if (dbDeposits.length > 0) deposits = dbDeposits as any;
      if (dbFixedEvents.length > 0) fixedEvents = dbFixedEvents as any;
      if (dbBills.length > 0) bills = dbBills as any;
      if (dbSnapshots.length > 0) cycleSnapshots = dbSnapshots as any;
    }

    const backupData = {
      app: 'mess-manager',
      version: '2.1',
      exportedAt: new Date().toISOString(),
      mess: store.mess,
      summary: {
        totalCycles: cycles.length,
        totalUsers: users.length,
        totalMeals: meals.length,
        totalBazars: bazars.length,
        totalDeposits: deposits.length,
        totalFixedEvents: fixedEvents.length,
        totalBills: bills.length,
        totalSnapshots: cycleSnapshots.length,
      },
      data: {
        cycles,
        users,
        memberCycles,
        meals,
        bazars,
        deposits,
        fixedEvents,
        bills,
        cycleSnapshots,
      },
    };

    if (download) {
      const dateStr = new Date().toISOString().split('T')[0];
      const jsonStr = JSON.stringify(backupData, null, 2);
      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mess_manager_backup_${dateStr}.json"`,
        },
      });
    }

    return NextResponse.json({ success: true, backup: backupData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole('super_admin');
    if (!auth.authorized) return auth.response;

    const db = await getDb();
    const store = await getStore();
    const payload = await request.json();

    const data = payload.data || payload;

    if (!data.cycles && !data.users) {
      return NextResponse.json(
        { success: false, error: 'অবৈধ ব্যাকআপ ফাইল। সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।' },
        { status: 400 }
      );
    }

    const counts = {
      cycles: 0,
      users: 0,
      memberCycles: 0,
      meals: 0,
      bazars: 0,
      deposits: 0,
      fixedEvents: 0,
      bills: 0,
      cycleSnapshots: 0,
    };

    if (db) {
      // 1. Restore Cycles
      if (Array.isArray(data.cycles) && data.cycles.length > 0) {
        for (const item of data.cycles) {
          const { _id, ...rest } = item;
          await db.collection('cycles').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.cycles++;
        }
      }

      // 2. Restore Users (preserve existing super_admin passwords if not provided)
      if (Array.isArray(data.users) && data.users.length > 0) {
        for (const item of data.users) {
          const { _id, ...rest } = item;
          await db.collection('users').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.users++;
        }
      }

      // 3. Restore Member Cycles
      if (Array.isArray(data.memberCycles) && data.memberCycles.length > 0) {
        for (const item of data.memberCycles) {
          const { _id, ...rest } = item;
          await db.collection('member_cycles').updateOne(
            { userId: item.userId, cycleId: item.cycleId },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.memberCycles++;
        }
      }

      // 4. Restore Meals
      if (Array.isArray(data.meals) && data.meals.length > 0) {
        for (const item of data.meals) {
          const { _id, ...rest } = item;
          await db.collection('meals').updateOne(
            {
              userId: item.userId,
              cycleId: item.cycleId,
              date: item.date,
              slotId: item.slotId,
            },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.meals++;
        }
      }

      // 5. Restore Bazars
      if (Array.isArray(data.bazars) && data.bazars.length > 0) {
        for (const item of data.bazars) {
          const { _id, ...rest } = item;
          await db.collection('bazars').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.bazars++;
        }
      }

      // 6. Restore Deposits
      if (Array.isArray(data.deposits) && data.deposits.length > 0) {
        for (const item of data.deposits) {
          const { _id, ...rest } = item;
          await db.collection('deposits').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.deposits++;
        }
      }

      // 7. Restore Fixed Events
      if (Array.isArray(data.fixedEvents) && data.fixedEvents.length > 0) {
        for (const item of data.fixedEvents) {
          const { _id, ...rest } = item;
          await db.collection('fixed_events').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.fixedEvents++;
        }
      }

      // 8. Restore Utilities / Bills
      if (Array.isArray(data.bills) && data.bills.length > 0) {
        for (const item of data.bills) {
          const { _id, ...rest } = item;
          await db.collection('utilities').updateOne(
            { _id },
            { $set: { ...rest, updatedAt: new Date() } },
            { upsert: true }
          );
          counts.bills++;
        }
      }

      // 9. Restore Cycle Snapshots
      if (Array.isArray(data.cycleSnapshots) && data.cycleSnapshots.length > 0) {
        for (const item of data.cycleSnapshots) {
          const { _id, ...rest } = item;
          await db.collection('cycle_snapshots').updateOne(
            { _id },
            { $set: { ...rest } },
            { upsert: true }
          );
          counts.cycleSnapshots++;
        }
      }
    }

    // Database updated successfully
    return NextResponse.json({
      success: true,
      message: '৬ মাসের ব্যাকআপ ডাটা সফলভাবে ডাটাবেজে রিস্টোর ও সিঙ্ক করা হয়েছে!',
      counts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
