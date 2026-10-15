import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('No MONGODB_URI found in .env.local');
  process.exit(1);
}

const client = new MongoClient(uri);

async function check() {
  await client.connect();
  const db = client.db('mess_manager');
  const users = await db.collection('users').find().toArray();
  console.log('=== USERS ===');
  console.dir(users, { depth: null });

  const memberships = await db.collection('memberships').find().toArray();
  console.log('=== MEMBERSHIPS ===');
  console.dir(memberships, { depth: null });

  const memberCycles = await db.collection('member_cycles').find().toArray();
  console.log('=== MEMBER CYCLES ===');
  console.dir(memberCycles, { depth: null });

  await client.close();
}

check().catch(console.error);
