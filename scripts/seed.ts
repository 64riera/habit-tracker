import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { toISODate } from "@/lib/date";

async function main() {
  const existing = await db.select().from(categories);
  if (existing.length > 0) {
    console.log("Ya hay datos, seed omitido.");
    return;
  }

  const cats = [
    { id: "creatividad", nameEs: "Creatividad", nameEn: "Creativity", color: "var(--color-cat-creatividad)", icon: "🎨" },
    { id: "fitness", nameEs: "Fitness", nameEn: "Fitness", color: "var(--color-cat-fitness)", icon: "💪" },
    { id: "aprendizaje", nameEs: "Aprendizaje", nameEn: "Learning", color: "var(--color-cat-aprendizaje)", icon: "🧠" },
    { id: "estudio", nameEs: "Estudio", nameEn: "Study", color: "var(--color-cat-estudio)", icon: "📚" },
    { id: "bienestar", nameEs: "Bienestar", nameEn: "Wellness", color: "var(--color-cat-bienestar)", icon: "🧘" },
  ];

  await db.insert(categories).values(
    cats.map((c, i) => ({ ...c, sortOrder: i }))
  );

  const today = toISODate(new Date());
  const start = toISODate(new Date(Date.now() - 90 * 86_400_000));

  await db.insert(habits).values([
    {
      id: nanoid(),
      categoryId: "creatividad",
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
      categoryId: "fitness",
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
      categoryId: "aprendizaje",
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
      categoryId: "estudio",
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
      categoryId: "bienestar",
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

  console.log("Seed completo.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
