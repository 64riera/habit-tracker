import { getAchievementsByHabit } from "@/lib/queries/achievements";
import { LogrosClient } from "./achievements-client";

export default async function LogrosPage() {
  const habitsWithAchievements = await getAchievementsByHabit();
  return <LogrosClient habits={habitsWithAchievements} />;
}
