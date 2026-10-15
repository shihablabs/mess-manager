import { MongoClient, Db, ObjectId } from 'mongodb';
import dns from 'dns';

// Fix for Windows / ISP DNS servers failing MongoDB Atlas SRV query (ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setServers is restricted
}

/**
 * Safely parse a string as a MongoDB ObjectId without throwing BSONError
 */
export function safeObjectId(id: unknown): ObjectId | null {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();
  if (/^[0-9a-fA-F]{24}$/.test(cleanId)) {
    try {
      return new ObjectId(cleanId);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Creates a safe query filter for MongoDB _id (matches ObjectId or string)
 */
export function idFilter(id: string): any {
  const oid = safeObjectId(id);
  return oid ? { $or: [{ _id: oid }, { _id: id }] } : { _id: id };
}

/**
 * Creates a safe query filter for user fields like userId
 */
export function userKeyFilter(key: string, id: string): any {
  const oid = safeObjectId(id);
  return oid ? { $or: [{ [key]: oid }, { [key]: id }] } : { [key]: id };
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb'));
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    if ((dns as any).setDefaultResultOrder) {
      (dns as any).setDefaultResultOrder('ipv4first');
    }
  } catch {
    // Ignore in environments where setServers is restricted
  }

  const uri = process.env.MONGODB_URI!;

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch((err) => {
        global._mongoClientPromise = undefined;
        throw err;
      });
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect().catch((err) => {
        clientPromise = null;
        throw err;
      });
    }
    return clientPromise;
  }
}

export async function getDb(dbName = 'mess_manager'): Promise<Db | null> {
  try {
    const client = await getMongoClient();
    if (!client) return null;
    return client.db(dbName);
  } catch (err) {
    console.error('getDb error:', err);
    return null;
  }
}
