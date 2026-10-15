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
});
