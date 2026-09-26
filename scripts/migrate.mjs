import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Preview deployments (one per pull request) share the production database, so only the
// production deployment may change its schema. Otherwise an unmerged PR could migrate it.
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`Skipping migrations on Vercel ${process.env.VERCEL_ENV} deployment`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
await pool.end();
console.log("Migrations applied");
