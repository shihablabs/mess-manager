import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getDb } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const db = await getDb();
        if (db) {
          const isSuperAdmin = user.email === 'shihab.warfaze@gmail.com';
          let dbUser = await db.collection('users').findOne({ email: user.email });
          let userId: string;

          if (!dbUser) {
            const insertResult = await db.collection('users').insertOne({
              name: user.name || 'সদস্য',
              email: user.email,
              image: user.image || '',
              role: isSuperAdmin ? 'super_admin' : 'member',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            userId = insertResult.insertedId.toString();
          } else {
            userId = dbUser._id.toString();
            if (isSuperAdmin && dbUser.role !== 'super_admin') {
              await db.collection('users').updateOne(
                { email: user.email },
                { $set: { role: 'super_admin', updatedAt: new Date() } }
              );
            }
          }

          // Check or create membership
          const existingMembership = await db.collection('memberships').findOne({
            $or: [{ userId }, { userId: dbUser?._id }],
          });

          if (!existingMembership) {
            const mess = await db.collection('messes').findOne();
            const messId = mess ? mess._id.toString() : 'mess_1';
            await db.collection('memberships').insertOne({
              userId,
              messId,
              role: isSuperAdmin ? 'super_admin' : 'member',
              status: isSuperAdmin ? 'active' : 'pending',
              joinedDate: new Date().toISOString().split('T')[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      } catch (err) {
        console.error('Error recording user in MongoDB on signIn:', err);
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        try {
          const db = await getDb();
          if (db) {
            const dbUser = await db.collection('users').findOne({ email: session.user.email });
            if (dbUser) {
              const userId = dbUser._id.toString();
              const membership = await db.collection('memberships').findOne({
                $or: [{ userId }, { userId: dbUser._id }],
              });

              (session.user as any).id = userId;
              (session.user as any).role = dbUser.role || 'member';
              (session.user as any).status =
                membership?.status || (dbUser.role === 'super_admin' ? 'active' : 'pending');
            }
          }
        } catch (err) {
          console.error('Error fetching user profile for session:', err);
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
