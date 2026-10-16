import { describe, it, expect } from 'vitest';
import { getDb, isMongoConfigured } from './db';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

describe('MongoDB Connection Test', () => {
  it('should detect MongoDB is configured', () => {
    expect(isMongoConfigured()).toBe(true);
  });

  it('should successfully connect to MongoDB Atlas and ping database', async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    if (db) {
      const pingResult = await db.command({ ping: 1 });
      expect(pingResult.ok).toBe(1);
      console.log('MongoDB Atlas Ping Result:', pingResult);
      const collections = await db.listCollections().toArray();
      console.log('Existing Collections:', collections.map(c => c.name));
    }
  }, 15000);

  it('blocks write operations to production database mess_manager when in test mode', async () => {
    // Explicitly connect to production database 'mess_manager'
    const prodDb = await getDb('mess_manager');
    expect(prodDb).not.toBeNull();
    expect(prodDb?.databaseName).toBe('mess_manager');

    // 1. insertOne must throw
    expect(() => {
      prodDb?.collection('users').insertOne({ name: 'safety_test_user' } as any);
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);

    // 2. deleteOne must throw
    expect(() => {
      prodDb?.collection('users').deleteOne({ name: 'safety_test_user' });
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);

    // 3. updateOne must throw
    expect(() => {
      prodDb?.collection('users').updateOne({ name: 'x' }, { $set: { name: 'y' } });
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);

    // 4. createCollection must throw
    expect(() => {
      (prodDb as any)?.createCollection('dangerous_col');
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);

    // 5. Read operations are allowed without throwing
    const count = await prodDb?.collection('users').countDocuments();
    expect(typeof count).toBe('number');
  });

  it('allows write operations when database contains "sim" or "test"', async () => {
    const simDb = await getDb('mess_manager_sim');
    expect(simDb).not.toBeNull();
    expect(simDb?.databaseName).toBe('mess_manager_sim');

    // Insert to temp test collection
    const res = await simDb?.collection('safety_test').insertOne({ test: true, createdAt: new Date() });
    expect(res?.acknowledged).toBe(true);

    // Clean up
    await simDb?.collection('safety_test').deleteMany({ test: true });
  });
});
