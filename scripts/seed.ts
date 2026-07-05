import { db } from "@/lib/db/client";
import { categories, habits, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { toISODate } from "@/lib/date";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Uso: npm run seed -- <username>  (crea la cuenta primero desde /signup)");
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    console.error(`No existe el usuario "${username}". Crea la cuenta primero desde /signup.`);
    process.exit(1);
  }
  const userId = user.id;

  const existing = await db.select().from(categories).where(eq(categories.userId, userId));
  if (existing.length > 0) {
    console.log("Ya hay datos para este usuario, seed omitido.");
    return;
  }

  const cats = [
    { id: nanoid(), nameEs: "Creatividad", nameEn: "Creativity", color: "var(--color-cat-creatividad)", icon: "🎨" },
    { id: nanoid(), nameEs: "Fitness", nameEn: "Fitness", color: "var(--color-cat-fitness)", icon: "💪" },
    { id: nanoid(), nameEs: "Aprendizaje", nameEn: "Learning", color: "var(--color-cat-aprendizaje)", icon: "🧠" },
    { id: nanoid(), nameEs: "Estudio", nameEn: "Study", color: "var(--color-cat-estudio)", icon: "📚" },
    { id: nanoid(), nameEs: "Bienestar", nameEn: "Wellness", color: "var(--color-cat-bienestar)", icon: "🧘" },
  ];

  await db.insert(categories).values(cats.map((c, i) => ({ ...c, userId, sortOrder: i })));

  const today = toISODate(new Date());
  const start = toISODate(new Date(Date.now() - 90 * 86_400_000));

  await db.insert(habits).values([
    {
      id: nanoid(),
      userId,
      categoryId: cats[0].id,
      name: "Practicar guitarra",
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
      categoryId: cats[1].id,
      name: "Ejercicio de fuerza",
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
      categoryId: cats[2].id,
      name: "Practicar inglés",
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
      categoryId: cats[3].id,
      name: "Estudiar",
      goalType: "quantitative",
      goalTarget: 20,
      goalUnit: "páginas",
      frequencyType: "daily",
      startDate: start,
      status: "active",
      sortOrder: 3,
    },
    {
      id: nanoid(),
      userId,
      categoryId: cats[4].id,
      name: "Meditar",
      goalType: "duration",
      goalTarget: 10,
      goalUnit: "min",
      frequencyType: "daily",
      startDate: today,
      status: "paused",
      sortOrder: 4,
    },
  ]);

  console.log(`Seed completo para "${username}".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
