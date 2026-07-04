export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { migrate } = await import("drizzle-orm/libsql/migrator");

  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });

  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  client.close();
}
