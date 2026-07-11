export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { migrate } = await import("drizzle-orm/libsql/migrator");

  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });

  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } catch (error) {
    // Don't let a migration mismatch (e.g. the __drizzle_migrations
    // ledger being out of sync with the tables' real state) take down the
    // whole instance: that used to break EVERY request, including login,
    // on every cold start. If the schema is already up to date this is
    // harmless; if it isn't, the affected queries will fail with a clear
    // error instead of crashing the whole app.
    console.error("Failed to apply the database migration:", error);
  } finally {
    client.close();
  }
}
