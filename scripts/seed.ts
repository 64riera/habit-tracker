import { db } from "@/lib/db/client";
import { categories, habits, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { toISODate } from "@/lib/date";
import { CANONICAL_CATEGORIES } from "@/lib/habits/canonical-categories";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: npm run seed -- <username>  (create the account first from /signup)");
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    console.error(`User "${username}" doesn't exist. Create the account first from /signup.`);
    process.exit(1);
  }
  const userId = user.id;

  const existing = await db.select().from(categories).where(eq(categories.userId, userId));
  if (existing.length > 0) {
    console.log("This user already has data, skipping seed.");
    return;
  }

  const cats = CANONICAL_CATEGORIES.map((c) => ({ ...c, id: nanoid() }));
  const catByName = Object.fromEntries(cats.map((c) => [c.nameEs, c]));

  await db.insert(categories).values(cats.map((c, i) => ({ ...c, userId, sortOrder: i })));

  const today = toISODate(new Date());
  const start = toISODate(new Date(Date.now() - 90 * 86_400_000));

  await db.insert(habits).values([
    {
      id: nanoid(),
      userId,
      categoryId: catByName.Creatividad.id,
      name: "Practice guitar",
      goalType: "duration",
      goalTarget: 20,
      goalUnit: "min",
      frequencyType: "daily",
      startDate: start,
      status: "active",
      sortOrder: 0,
    },
    {
      id: nanoid(),
      userId,
      categoryId: catByName.Fitness.id,
      name: "Strength training",
      goalType: "binary",
      frequencyType: "x_per_week",
      frequencyConfig: JSON.stringify({ timesPerPeriod: 3 }),
      startDate: start,
      status: "active",
      sortOrder: 1,
    },
    {
      id: nanoid(),
      userId,
      categoryId: catByName.Aprendizaje.id,
      name: "Practice English",
      goalType: "duration",
      goalTarget: 15,
      goalUnit: "min",
      frequencyType: "daily",
      startDate: start,
      status: "active",
      sortOrder: 2,
    },
    {
      id: nanoid(),
      userId,
      categoryId: catByName.Estudio.id,
      name: "Study",
      goalType: "quantitative",
      goalTarget: 20,
      goalUnit: "pages",
      frequencyType: "daily",
      startDate: start,
      status: "active",
      sortOrder: 3,
    },
    {
      id: nanoid(),
      userId,
      categoryId: catByName.Bienestar.id,
      name: "Meditate",
      goalType: "duration",
      goalTarget: 10,
      goalUnit: "min",
      frequencyType: "daily",
      startDate: today,
      status: "paused",
      sortOrder: 4,
    },
  ]);

  console.log(`Seed complete for "${username}".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
