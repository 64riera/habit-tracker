import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`Migraciones aplicadas contra ${url}.`);
client.close();
