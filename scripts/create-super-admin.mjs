import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: No MONGODB_URI found in .env.local');
  process.exit(1);
}

// Password hashing using Node crypto pbkdf2
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

async function main() {
  const args = process.argv.slice(2);
  const username = (args[0] || 'superadmin').trim().toLowerCase();
  const password = args[1] || 'developerzone2026';

  console.log(`\n========================================`);
  console.log(`🚀 Developer Zone - Super Admin Setup`);
  console.log(`========================================`);
  console.log(`Target Username : ${username}`);
  console.log(`Target Password : ${password}`);
  console.log(`Connecting to MongoDB Atlas...`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('mess_manager');

  const { hash, salt } = hashPassword(password);

  // 1. Upsert Super Admin in 'super_admins' collection
  const existingAdmin = await db.collection('super_admins').findOne({ username });
  let adminId = existingAdmin ? existingAdmin._id : new ObjectId();

  await db.collection('super_admins').updateOne(
    { username },
    {
      $set: {
        username,
        name: 'সুপার অ্যাডমিন (System Controller)',
        email: `${username}@developerzone.local`,
        passwordHash: hash,
        salt,
        role: 'super_admin',
        status: 'active',
        isSuperAdmin: true,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        _id: adminId,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`✅ Super Admin account '${username}' created/updated successfully in 'super_admins' collection.`);

  // 2. Remove all super_admin references from resident mess collections
  // Super admin MUST NOT appear in meal sheets, member balances, room rents, or cycles!
  const deletedMemberships = await db.collection('memberships').deleteMany({
    $or: [{ role: 'super_admin' }, { userId: adminId.toString() }, { _id: 'm_shihab' }],
  });
  console.log(`🧹 Cleaned up ${deletedMemberships.deletedCount} super_admin records from 'memberships'.`);

  const deletedMemberCycles = await db.collection('member_cycles').deleteMany({
    $or: [{ _id: 'mc_shihab' }, { userId: adminId.toString() }],
  });
  console.log(`🧹 Cleaned up ${deletedMemberCycles.deletedCount} super_admin records from 'member_cycles'.`);

  // 3. Ensure any Google accounts previously assigned super_admin are normalized to 'member'
  const convertedUsers = await db.collection('users').updateMany(
    { role: 'super_admin' },
    { $set: { role: 'member', updatedAt: new Date() } }
  );
  if (convertedUsers.modifiedCount > 0) {
    console.log(`🔄 Converted ${convertedUsers.modifiedCount} old Google accounts from 'super_admin' to standard 'member'.`);
  }

  // 4. Also ensure super_admins user is present in 'users' collection with authType: 'credentials' for foreign key lookups if needed
  await db.collection('users').updateOne(
    { _id: adminId },
    {
      $set: {
        _id: adminId,
        name: 'সুপার অ্যাডমিন (System Controller)',
        email: `${username}@developerzone.local`,
        username,
        role: 'super_admin',
        authType: 'credentials',
        image: 'https://api.dicebear.com/7.x/bottts/svg?seed=superadmin',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`\n========================================`);
  console.log(`🎉 SUPER ADMIN SETUP COMPLETE!`);
  console.log(`Credentials to Login:`);
  console.log(`• ইউজারনেম/আইডি: ${username}`);
  console.log(`• পাসওয়ার্ড    : ${password}`);
  console.log(`• সাইট ইউআরএল  : https://mess-manager-shihablabs.vercel.app/`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
