import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { UserDoc } from '@/models/types';
import { getStore } from '@/lib/store';

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

    const userDetails = (user as any).userDetails || {};
    const normalizedName = user.displayName || userDetails.displayName || user.name || 'সদস্য';

    const normalizedUser = {
      ...user,
      _id: user._id.toString(),
      name: normalizedName,
      displayName: normalizedName,
      phone: user.phone || userDetails.phone || '',
      whatsapp: user.whatsapp || userDetails.whatsapp || '',
      dob: user.dob || userDetails.dob || '',
      address: user.address || userDetails.address || '',
      bio: user.bio || userDetails.bio || userDetails.about || '',
      about: (user as any).about || userDetails.about || user.bio || userDetails.bio || '',
      bloodGroup: user.bloodGroup || userDetails.bloodGroup || '',
      emergencyContact: user.emergencyContact || userDetails.emergencyContact || '',
      occupation: user.occupation || userDetails.occupation || '',
      userDetails: {
        displayName: normalizedName,
        phone: user.phone || userDetails.phone || '',
        whatsapp: user.whatsapp || userDetails.whatsapp || '',
        dob: user.dob || userDetails.dob || '',
        address: user.address || userDetails.address || '',
        bio: user.bio || userDetails.bio || userDetails.about || '',
        about: (user as any).about || userDetails.about || user.bio || userDetails.bio || '',
        bloodGroup: user.bloodGroup || userDetails.bloodGroup || '',
        emergencyContact: user.emergencyContact || userDetails.emergencyContact || '',
        occupation: user.occupation || userDetails.occupation || '',
      },
    };

    return NextResponse.json({
      success: true,
      user: normalizedUser,
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

    const displayName = (body.displayName || body.name || '').trim();
    const phone = body.phone !== undefined ? String(body.phone).trim() : '';
    const whatsapp = body.whatsapp !== undefined ? String(body.whatsapp).trim() : '';
    const dob = body.dob !== undefined ? String(body.dob).trim() : '';
    const address = body.address !== undefined ? String(body.address).trim() : '';
    const bio = body.bio !== undefined ? String(body.bio).trim() : '';
    const about = body.about !== undefined ? String(body.about).trim() : bio;
    const bloodGroup = body.bloodGroup !== undefined ? String(body.bloodGroup).trim() : '';
    const emergencyContact = body.emergencyContact !== undefined ? String(body.emergencyContact).trim() : '';
    const occupation = body.occupation !== undefined ? String(body.occupation).trim() : '';

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (displayName) {
      updateFields.name = displayName;
      updateFields.displayName = displayName;
    }
    if (body.phone !== undefined) updateFields.phone = phone;
    if (body.whatsapp !== undefined) updateFields.whatsapp = whatsapp;
    if (body.dob !== undefined) updateFields.dob = dob;
    if (body.address !== undefined) updateFields.address = address;
    if (body.bio !== undefined) updateFields.bio = bio;
    if (body.about !== undefined) updateFields.about = about;
    if (body.bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
    if (body.emergencyContact !== undefined) updateFields.emergencyContact = emergencyContact;
    if (body.occupation !== undefined) updateFields.occupation = occupation;

    // Embedded userDetails object
    updateFields.userDetails = {
      displayName: displayName || undefined,
      phone,
      whatsapp,
      dob,
      address,
      bio,
      about,
      bloodGroup,
      emergencyContact,
      occupation,
    };

    const filter = {
      $or: [
        { _id: new ObjectId(targetUserId) as any },
        { _id: targetUserId as any },
      ],
    };

    await db.collection('users').updateOne(filter, { $set: updateFields });

    const updatedUser = await db.collection('users').findOne(filter);

    // Sync in-memory store
    try {
      const store = await getStore();
      const existingUser = store.users.find((u) => u._id === targetUserId);
      if (existingUser) {
        if (displayName) {
          existingUser.name = displayName;
          existingUser.displayName = displayName;
        }
        if (phone) existingUser.phone = phone;
        if (whatsapp) existingUser.whatsapp = whatsapp;
        if (dob) existingUser.dob = dob;
        existingUser.userDetails = updateFields.userDetails;
      }
    } catch (storeErr) {
      // Non-fatal store sync
    }

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
