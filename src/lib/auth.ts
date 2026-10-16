import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

import { checkSuperAdminRateLimit, recordSuperAdminFailedAttempt, resetSuperAdminRateLimit } from '@/lib/rate-limit';

export function verifyPassword(password: string, hash: string, salt: string) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Google Provider - STRICTLY for resident members and mess managers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),

    // 2. Credentials Provider - STRICTLY for System Super Admin (configured via script)
    CredentialsProvider({
      id: 'super-admin-credentials',
      name: 'Super Admin Login',
      credentials: {
        username: { label: 'ইউজারনেম বা আইডি', type: 'text' },
        password: { label: 'পাসওয়ার্ড', type: 'password' },
      },
      async authorize(credentials) {
        const username = (credentials?.username || '').trim().toLowerCase();
        if (!username || !credentials?.password) return null;

        // Rate limit check: 5 failed attempts blocks for 15 minutes
        const rateCheck = checkSuperAdminRateLimit(username);
        if (!rateCheck.allowed) {
          throw new Error(
            `অতিরিক্ত ৫ বার ভুল চেষ্টার কারণে একাউন্ট ১৫ মিনিটের জন্য সাময়িকভাবে ব্লক করা হয়েছে। দয়া করে ${rateCheck.remainingMinutes} মিনিট পর আবার চেষ্টা করুন।`
          );
        }

        try {
          const db = await getDb();
          if (!db) return null;

          const admin = await db.collection('super_admins').findOne({
            username,
          });

          if (!admin || !admin.passwordHash || !admin.salt) {
            recordSuperAdminFailedAttempt(username);
            return null;
          }

          const isValid = verifyPassword(credentials.password, admin.passwordHash, admin.salt);
          if (!isValid) {
            recordSuperAdminFailedAttempt(username);
            return null;
          }

          // Successful login: reset rate limit attempts
          resetSuperAdminRateLimit(username);

          return {
            id: admin._id.toString(),
            name: admin.name || 'সুপার অ্যাডমিন',
            email: admin.email || `${admin.username}@developerzone.local`,
            image: 'https://api.dicebear.com/7.x/bottts/svg?seed=superadmin',
            role: 'super_admin',
            status: 'active',
          } as any;
        } catch (err: any) {
          if (err.message && err.message.includes('অতিরিক্ত ৫ বার ভুল চেষ্টা')) {
            throw err;
          }
          console.error('Error during super admin authorization:', err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Super Admin credentials login
      if (account?.provider === 'super-admin-credentials') {
        return true;
      }

      // Google Sign-in: Strictly for standard resident members & managers
      if (account?.provider === 'google') {
        if (!user.email) return false;
        try {
          const db = await getDb();
          if (db) {
            let dbUser = await db.collection('users').findOne({ email: user.email });
            let userId: string;

            if (!dbUser) {
              const defaultName = user.name || 'সদস্য';
              const insertResult = await db.collection('users').insertOne({
                name: defaultName,
                displayName: defaultName,
                email: user.email,
                image: user.image || '',
                role: 'member', // Google login is ALWAYS member by default
                phone: '',
                whatsapp: '',
                dob: '',
                address: '',
                bio: '',
                bloodGroup: '',
                emergencyContact: '',
                occupation: '',
                userDetails: {
                  displayName: defaultName,
                  phone: '',
                  whatsapp: '',
                  dob: '',
                  address: '',
                  bio: '',
                  about: '',
                  bloodGroup: '',
                  emergencyContact: '',
                  occupation: '',
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              userId = insertResult.insertedId.toString();
            } else {
              userId = dbUser._id.toString();
              // Prevent Google user from holding super_admin role
              if (dbUser.role === 'super_admin') {
                await db.collection('users').updateOne(
                  { email: user.email },
                  { $set: { role: 'member', updatedAt: new Date() } }
                );
              }
              // Backfill userDetails if missing
              if (!dbUser.userDetails) {
                await db.collection('users').updateOne(
                  { _id: dbUser._id },
                  {
                    $set: {
                      displayName: dbUser.displayName || dbUser.name,
                      userDetails: {
                        displayName: dbUser.displayName || dbUser.name,
                        phone: dbUser.phone || '',
                        whatsapp: dbUser.whatsapp || '',
                        dob: dbUser.dob || '',
                        address: dbUser.address || '',
                        bio: dbUser.bio || '',
                        about: dbUser.bio || '',
                        bloodGroup: dbUser.bloodGroup || '',
                        emergencyContact: dbUser.emergencyContact || '',
                        occupation: dbUser.occupation || '',
                      },
                    },
                  }
                );
              }
            }

            // Ensure resident membership exists for Google user
            const existingMembership = await db.collection('memberships').findOne({
              $or: [{ userId }, { userId: dbUser?._id }],
            });

            const mess = await db.collection('messes').findOne();
            const messId = mess ? mess._id.toString() : 'mess_1';

            if (!existingMembership) {
              await db.collection('memberships').insertOne({
                userId,
                messId,
                role: 'member',
                status: 'pending', // Requires admin approval
                joinedDate: new Date().toISOString().split('T')[0],
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Ensure member_cycles record exists for active/open cycle
            const activeCycle = await db.collection('cycles').findOne({ status: 'open' });
            if (activeCycle) {
              const cycleId = activeCycle._id.toString();
              const existingMemberCycle = await db.collection('member_cycles').findOne({
                userId,
                cycleId,
              });
              if (!existingMemberCycle) {
                await db.collection('member_cycles').insertOne({
                  userId,
                  cycleId,
                  messId,
                  roomRent: 3000,
                  isActive: false, // Inactive until approved by admin
                  rentPaid: false,
                  rentPaidAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
          }
        } catch (err) {
          console.error('Error recording Google user in MongoDB on signIn:', err);
        }
        return true;
      }

      return false;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'member';
        token.status = (user as any).status || 'pending';
        token.isSuperAdmin = (user as any).role === 'super_admin';
      }

      // Sync latest role and membership status from DB for Google members
      if (token.email && !token.isSuperAdmin) {
        try {
          const db = await getDb();
          if (db) {
            const dbUser = await db.collection('users').findOne({ email: token.email });
            if (dbUser) {
              token.id = dbUser._id.toString();
              if (dbUser.name) {
                token.name = dbUser.name;
              }
              // Google users can only be 'member' or promoted to 'admin' (manager)
              token.role = dbUser.role === 'super_admin' ? 'member' : (dbUser.role || 'member');
              const membership = await db.collection('memberships').findOne({
                $or: [{ userId: dbUser._id.toString() }, { userId: dbUser._id }],
              });
              token.status = membership?.status || 'pending';
            }
          }
        } catch (err) {
          console.error('Error syncing user token from MongoDB:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        if (token.name) {
          session.user.name = token.name;
        }
        (session.user as any).role = token.role || 'member';
        (session.user as any).status =
          token.status || (token.role === 'super_admin' ? 'active' : 'pending');
        (session.user as any).isSuperAdmin = token.role === 'super_admin';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
