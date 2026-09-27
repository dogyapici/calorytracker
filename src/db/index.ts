import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse one pool across hot reloads in development and across invocations on serverless.
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Enough for a page's parallel queries plus background prefetches without waiting for a free connection.
    max: process.env.NODE_ENV === "production" ? 8 : 10,
  });
globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
