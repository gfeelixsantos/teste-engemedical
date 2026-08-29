
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const uri = process.env.DATABASE_URI;
const dbName = process.env.DATABASE_CLUSTER || 'engemedical-agendamento';

const mongo = new MongoClient(uri!, {
  serverApi: ServerApiVersion.v1,
  ssl: true,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 60000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 10000,
});

let dbInstance: Db | null = null;
export let isConnected = false;

export async function connectdb(): Promise<MongoClient> {
  try {
    if (!isConnected) {
      await mongo.connect();
      isConnected = true;
    }
    return mongo;
  }
  catch (e) {
    throw new Error(`Unable to connect to MongoDB: ${e}`);
  }
}

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = mongo.db(dbName);
  }
  return dbInstance;
}
