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
    // No dejar que un desajuste de migraciones (p. ej. el registro de
    // __drizzle_migrations desincronizado del estado real de las tablas)
    // tumbe la instancia entera: eso rompia CADA request, incluido el
    // login, en cada arranque en frio. Si el esquema ya esta al dia esto
    // es inofensivo; si no lo esta, las queries afectadas fallaran con un
    // error claro en vez de tirar toda la app.
    console.error("No se pudo aplicar la migracion de la base de datos:", error);
  } finally {
    client.close();
  }
}
