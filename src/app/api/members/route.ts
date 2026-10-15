import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getDb, isMongoConfigured } from '@/lib/db';
import { UserDoc, MembershipDoc, MemberCycleDoc, UserRole } from '@/models/types';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || (store.cycles[0]?._id as string) || 'cycle_1';

  const members = store.users.map((u) => {
    const mem = store.memberships.find((m) => m.userId === u._id);
    const mc = store.memberCycles.find((m) => m.userId === u._id && m.cycleId === cycleId);
    return {
      userId: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      image: u.image,
      role: (u.role || mem?.role || 'member') as UserRole,
      status: mem?.status || 'active',
      roomRent: mc ? mc.roomRent : 0,
      isActiveInCycle: mc ? mc.isActive : true,
      leftDate: mc?.leftDate,
    };
  });

  return NextResponse.json({ success: true, members });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      action,
      name,
      email,
      phone,
      roomRent = 3000,
      role = 'member',
      userId,
      cycleId = store.cycles[0]?._id as string || 'cycle_1',
    } = body;

    // Add new member manually
    if (action === 'add_member') {
      if (!name || !email) {
        return NextResponse.json({ success: false, error: 'নাম ও ইমেইল আবশ্যক' }, { status: 400 });
      }

      const newUserId = new ObjectId().toString();
      const newUser: UserDoc = {
        _id: newUserId,
        name,
        email,
        phone,
        role: role as UserRole,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newMembership: MembershipDoc = {
        _id: `m_${Date.now()}`,
        userId: newUserId,
        messId: store.mess._id as string,
        role: role as UserRole,
        status: 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newMemberCycle: MemberCycleDoc = {
        _id: `mc_${Date.now()}`,
        userId: newUserId,
        cycleId,
        messId: store.mess._id as string,
        roomRent: Number(roomRent),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (db) {
        await db.collection('users').insertOne({ ...newUser, _id: new ObjectId(newUserId) as any });
        await db.collection('memberships').insertOne(newMembership as any);
        await db.collection('member_cycles').insertOne(newMemberCycle as any);
      }

      return NextResponse.json({ success: true, user: newUser });
    }

    // Role assignment: super_admin can assign 'admin' (Manager) or 'member'
    if (action === 'change_role') {
      if (!userId || !role) {
        return NextResponse.json({ success: false, error: 'ইউজার ও ভূমিকা উল্লেখ করুন' }, { status: 400 });
      }

      if (db) {
        const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
        const targetUser = await db.collection('users').findOne(query);

        if (targetUser?.email === 'shihab.warfaze@gmail.com') {
          return NextResponse.json(
            { success: false, error: 'সুপার এডমিনের ভূমিকা পরিবর্তন করা সম্ভব নয়' },
            { status: 400 }
          );
        }

        await db.collection('users').updateOne(query, {
          $set: { role: role as UserRole, updatedAt: new Date() },
        });

        await db.collection('memberships').updateOne(
          { userId: userId.toString() },
          { $set: { role: role as UserRole, updatedAt: new Date() } }
        );
      }

      return NextResponse.json({ success: true, message: 'ভূমিকা পরিবর্তন সম্পন্ন হয়েছে' });
    }

    // Approve pending member
    if (action === 'approve_member') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'ইউজার আইডি আবশ্যক' }, { status: 400 });
      }

      if (db) {
        await db.collection('memberships').updateOne(
          { userId: userId.toString() },
          { $set: { status: 'active', updatedAt: new Date() } }
        );

        await db.collection('member_cycles').updateOne(
          { userId: userId.toString(), cycleId },
          {
            $set: {
              roomRent: Number(roomRent || 3000),
              isActive: true,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: `mc_${userId}_${cycleId}`,
              messId: store.mess._id as string,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      return NextResponse.json({ success: true, message: 'সদস্য সফলভাবে অনুমোদিত হয়েছে' });
    }

    // Reject pending member
    if (action === 'reject_member') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'ইউজার আইডি আবশ্যক' }, { status: 400 });
      }

      if (db) {
        await db.collection('memberships').updateOne(
          { userId: userId.toString() },
          { $set: { status: 'inactive', updatedAt: new Date() } }
        );
      }

      return NextResponse.json({ success: true, message: 'সদস্য বাতিল করা হয়েছে' });
    }

    // Update room rent
    if (action === 'update_rent' || action === 'update_member') {
      if (db && userId) {
        await db.collection('member_cycles').updateOne(
          { userId: userId.toString(), cycleId },
          {
            $set: { roomRent: Number(roomRent), updatedAt: new Date() },
            $setOnInsert: {
              _id: `mc_${userId}_${cycleId}`,
              messId: store.mess._id as string,
              isActive: true,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      return NextResponse.json({ success: true, message: 'রুম ভাড়া সফলভাবে আপডেট করা হয়েছে' });
    }

    // Member requests settlement (মেম্বার নিজে হিসাব নিষ্পত্তির আবেদন করবে)
    if (action === 'request_settlement') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'ইউজার আইডি আবশ্যক' }, { status: 400 });
      }

      if (db) {
        await db.collection('member_cycles').updateOne(
          { userId: userId.toString(), cycleId },
          {
            $set: {
              settlementRequested: true,
              settlementRequestedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({ success: true, message: 'হিসাব নিষ্পত্তির আবেদন পাঠানো হয়েছে' });
    }

    // Admin confirms settlement (এডমিন হিসাব চূড়ান্ত নিষ্পত্তি করবে)
    if (action === 'confirm_settlement') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'ইউজার আইডি আবশ্যক' }, { status: 400 });
      }

      if (db) {
        await db.collection('member_cycles').updateOne(
          { userId: userId.toString(), cycleId },
          {
            $set: {
              isActive: false,
              individualSettled: true,
              settledAt: new Date(),
              settlementRequested: false,
              leftDate: new Date().toISOString().split('T')[0],
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({ success: true, message: 'সদস্যের হিসাব চূড়ান্ত নিষ্পত্তি সম্পন্ন হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
