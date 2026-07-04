import { db } from "./lib/db/client.ts";
import { habits } from "./lib/db/schema.ts";
import { eq } from "drizzle-orm";

const all = await db.select().from(habits);
const water = all.filter(h => h.name === "Beber agua");
if (water.length > 1) {
  for (const h of water.slice(1)) {
    await db.delete(habits).where(eq(habits.id, h.id));
    console.log("deleted duplicate", h.id);
  }
}
process.exit(0);
