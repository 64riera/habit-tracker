import { getAchievementsByHabit } from "@/lib/queries/achievements";
import { LogrosClient } from "./logros-client";

export default async function LogrosPage() {
  const habitsWithAchievements = await getAchievementsByHabit();
  return <LogrosClient habits={habitsWithAchievements} />;
}
