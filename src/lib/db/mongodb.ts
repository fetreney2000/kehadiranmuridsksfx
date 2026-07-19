/**
 * MongoDB client singleton — cached across serverless invocations
 * to avoid exhausting Atlas M0 connection limits.
 *
 * Pattern: standard Next.js + MongoDB serverless singleton via globalThis.
 * Lazy initialization — URI is only checked when the client is first used.
 */

import { MongoClient, type Db } from "mongodb";

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  return uri;
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    if (process.env.NODE_ENV === "development") {
      if (!globalThis._mongoClientPromise) {
        client = new MongoClient(getUri(), options);
        globalThis._mongoClientPromise = client.connect();
      }
      clientPromise = globalThis._mongoClientPromise;
    } else {
      client = new MongoClient(getUri(), options);
      clientPromise = client.connect();
    }
  }
  return clientPromise;
}

export default getClientPromise;

export async function getDb(): Promise<Db> {
  const c = await getClientPromise();
  return c.db();
}