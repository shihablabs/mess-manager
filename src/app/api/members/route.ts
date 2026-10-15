import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { UserDoc, MembershipDoc, MemberCycleDoc } from '@/models/types';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycleId') || 'cycle_1';

  const members = store.users.map((u) => {
    const mem = store.memberships.find((m) => m.userId === u._id);
    const mc = store.memberCycles.find((m) => m.userId === u._id && m.cycleId === cycleId);
    return {
      userId: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      image: u.image,
      role: mem?.role || 'member',
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
    const store = getStore();
    const body = await request.json();
    const { action, name, email, phone, roomRent = 3000, role = 'member', userId, cycleId = 'cycle_1' } = body;

    // Add new member
    if (action === 'add_member') {
      if (!name || !email) {
        return NextResponse.json({ success: false, error: 'নাম ও ইমেইল আবশ্যক' }, { status: 400 });
      }

      const newUserId = `user_${Date.now()}`;
      const newUser: UserDoc = {
        _id: newUserId,
        name,
        email,
        phone,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(newUser);

      const newMembership: MembershipDoc = {
        _id: `m_${Date.now()}`,
        userId: newUserId,
        messId: store.mess._id as string,
        role,
        status: 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.memberships.push(newMembership);

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
      store.memberCycles.push(newMemberCycle);

      return NextResponse.json({ success: true, user: newUser });
    }

    // Update room rent or status
    if (action === 'update_member') {
      const mc = store.memberCycles.find((m) => m.userId === userId && m.cycleId === cycleId);
      if (mc && roomRent !== undefined) {
        mc.roomRent = Number(roomRent);
        mc.updatedAt = new Date();
      }

      const mem = store.memberships.find((m) => m.userId === userId);
      if (mem && role) {
        mem.role = role;
        mem.updatedAt = new Date();
      }

      return NextResponse.json({ success: true, message: 'সদস্যের তথ্য হালনাগাদ করা হয়েছে' });
    }

    return NextResponse.json({ success: false, error: 'অবৈধ একশন' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
