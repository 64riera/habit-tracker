import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * TEMPORARY, one-off repair endpoint — remove after use.
 *
 * The production `__drizzle_migrations` ledger is missing entries for
 * migrations 0012+ (0012 tried to CREATE TABLE finance_categories, which
 * already existed via some earlier path, so migrate() has aborted at that
 * point on every cold start since — instrumentation.ts only logs the
 * failure so it doesn't crash the app, but no migration after 0012 has
 * ever actually run automatically; 0014's gym_sessions table had to be
 * created by hand via a similar temporary endpoint last time).
 *
 * migrate() only ever looks at the SINGLE most recent ledger row
 * (`ORDER BY created_at DESC LIMIT 1`) and reapplies every migration newer
 * than it — so the fix is just recording migration 0014 (already applied,
 * by hand) as done, with its real folderMillis timestamp from
 * drizzle/meta/_journal.json. Once this row exists, the next cold start's
 * automatic migrate() call resumes cleanly at 0015 (this session's
 * gym_exercises catalog) on its own, and so will every migration after it.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-repair-secret");
  if (!secret || secret !== process.env.ADMIN_REPAIR_SECRET) {
    return new Response("Not found", { status: 404 });
  }

  await db.run(
    sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (
      '203f7271e2cc7b09ecbb8970b591c0fb23d1f0627e5064f33f019ed7c7e16e9c',
      1784048342686
    )`
  );

  return Response.json({ ok: true });
}
