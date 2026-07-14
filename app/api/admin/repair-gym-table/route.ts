import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * TEMPORARY, one-off repair endpoint — remove after use.
 *
 * The production Turso DB's `__drizzle_migrations` ledger is out of sync
 * with the tables that actually exist (pre-existing, not caused by this
 * change — the same "table X already exists" failure reproduces locally
 * for an earlier migration). Because `migrate()` aborts at the first
 * mismatch it hits, every migration after that point — including the one
 * that creates `gym_sessions` — silently never applies on any cold start
 * (instrumentation.ts only logs that failure so it can't crash the app).
 * This runs just that one table's DDL directly and idempotently, so it
 * doesn't depend on the ledger being fixed.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-repair-secret");
  if (!secret || secret !== process.env.ADMIN_REPAIR_SECRET) {
    return new Response("Not found", { status: 404 });
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS gym_sessions (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date text NOT NULL,
      exercises text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  await db.run(sql`CREATE INDEX IF NOT EXISTS gym_sessions_user_idx ON gym_sessions (user_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS gym_sessions_user_date_idx ON gym_sessions (user_id, date)`);

  return Response.json({ ok: true });
}
