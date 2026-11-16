import { drizzle } from "drizzle-orm/mysql2";

let database: ReturnType<typeof drizzle> | null = null;
// Lazy pool creation allows tooling to load without a database URL. Query errors
// propagate to tRPC's sanitized error formatter rather than being logged with parameters.
export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try { database = drizzle(process.env.DATABASE_URL); }
    catch { return null; }
  }
  return database;
}
