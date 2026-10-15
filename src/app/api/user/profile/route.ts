import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { UserDoc } from '@/models/types';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || (session.user as any).id;

    if (!requestedUserId) {
      return NextResponse.json({ success: false, error: 'ইউজার আইডি পাওয়া যায়নি' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    const user = await db.collection('users').findOne({
      $or: [
        { _id: new ObjectId(requestedUserId) as any },
        { _id: requestedUserId as any },
        { email: requestedUserId },
      ],
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'ইউজার পাওয়া যায়নি' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        _id: user._id.toString(),
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/user/profile:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const body = await request.json();
    const currentUserId = (session.user as any).id;
    const isSuperAdmin = (session.user as any).role === 'super_admin' || (session.user as any).isSuperAdmin;

    const targetUserId = body.userId || currentUserId;

    // Only self or Super Admin can edit profile
    if (targetUserId !== currentUserId && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'আপনার অন্য সদস্যের প্রোফাইল পরিবর্তনের অনুমতি নেই' }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'ডাটাবেজ সংযোগে সমস্যা' }, { status: 500 });
    }

    const updateFields: Partial<UserDoc> = {
      updatedAt: new Date(),
    };

    if (body.name && typeof body.name === 'string') updateFields.name = body.name.trim();
    if (body.phone !== undefined) updateFields.phone = String(body.phone).trim();
    if (body.whatsapp !== undefined) updateFields.whatsapp = String(body.whatsapp).trim();
    if (body.dob !== undefined) updateFields.dob = String(body.dob).trim();
    if (body.address !== undefined) updateFields.address = String(body.address).trim();
    if (body.bio !== undefined) updateFields.bio = String(body.bio).trim();
    if (body.bloodGroup !== undefined) updateFields.bloodGroup = String(body.bloodGroup).trim();
    if (body.emergencyContact !== undefined) updateFields.emergencyContact = String(body.emergencyContact).trim();
    if (body.occupation !== undefined) updateFields.occupation = String(body.occupation).trim();

    const filter = {
      $or: [
        { _id: new ObjectId(targetUserId) as any },
        { _id: targetUserId as any },
      ],
    };

    const updateResult = await db.collection('users').updateOne(filter, { $set: updateFields });

    const updatedUser = await db.collection('users').findOne(filter);

    return NextResponse.json({
      success: true,
      message: 'প্রোফাইল তথ্য সফলভাবে সংরক্ষণ করা হয়েছে',
      user: updatedUser ? { ...updatedUser, _id: updatedUser._id.toString() } : null,
    });
  } catch (err: any) {
    console.error('Error in POST /api/user/profile:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
