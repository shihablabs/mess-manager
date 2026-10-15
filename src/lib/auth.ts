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
          const existingUser = await db.collection('users').findOne({ email: user.email });
          if (!existingUser) {
            await db.collection('users').insertOne({
              name: user.name || 'সদস্য',
              email: user.email,
              image: user.image || '',
              role: isSuperAdmin ? 'super_admin' : 'member',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (isSuperAdmin && existingUser.role !== 'super_admin') {
            await db.collection('users').updateOne(
              { email: user.email },
              { $set: { role: 'super_admin', updatedAt: new Date() } }
            );
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
              (session.user as any).id = dbUser._id.toString();
              (session.user as any).role = dbUser.role || 'member';
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
