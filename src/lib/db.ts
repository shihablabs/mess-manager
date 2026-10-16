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

const MUTATION_METHODS = new Set([
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'bulkWrite',
  'drop',
  'rename',
]);

export function isSimulationOrTest(): boolean {
  return process.env.SIMULATION === '1' || process.env.NODE_ENV === 'test';
}

export function isDatabaseNameSafeForTesting(dbName: string): boolean {
  const lower = dbName.toLowerCase();
  return lower.includes('sim') || lower.includes('test');
}

export function wrapDbWithSafetyGuard(db: Db): Db {
  if (!isSimulationOrTest()) {
    return db;
  }

  // Verify actual connected database name
  const actualDbName = db.databaseName;
  if (isDatabaseNameSafeForTesting(actualDbName)) {
    return db;
  }

  // Not safe! Wrap collection and db write operations to throw before executing
  const originalCollection = db.collection.bind(db);

  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'collection') {
        return (name: string, colOptions?: any) => {
          const col = originalCollection(name, colOptions);
          return new Proxy(col, {
            get(colTarget, colProp, colReceiver) {
              if (MUTATION_METHODS.has(colProp as string)) {
                return () => {
                  throw new Error(
                    `CRITICAL DATABASE SAFETY VIOLATION: Refusing write operation "${String(colProp)}" on production database "${actualDbName}" while in test/simulation mode (NODE_ENV=${process.env.NODE_ENV}, SIMULATION=${process.env.SIMULATION})!`
                  );
                };
              }
              const val = Reflect.get(colTarget, colProp, colReceiver);
              return typeof val === 'function' ? val.bind(colTarget) : val;
            },
          });
        };
      }

      if (prop === 'createCollection' || prop === 'dropCollection' || prop === 'dropDatabase') {
        return () => {
          throw new Error(
            `CRITICAL DATABASE SAFETY VIOLATION: Refusing database mutation "${String(prop)}" on production database "${actualDbName}" while in test/simulation mode!`
          );
        };
      }

      const val = Reflect.get(target, prop, receiver);
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

export async function getDb(dbName = process.env.MONGODB_DB_NAME || 'mess_manager'): Promise<Db | null> {
  try {
    const client = await getMongoClient();
    if (!client) return null;
    const db = client.db(dbName);
    return wrapDbWithSafetyGuard(db);
  } catch (err) {
    console.error('getDb error:', err);
    return null;
  }
}
