import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getServerToday } from "@/lib/settings/date-server";
import { GymSessionForm } from "@/components/gym/gym-session-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function NuevaSesionGymPage() {
  const [exercises, today] = await Promise.all([getGymExercises(), getServerToday()]);

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="gym.newSession" subtitleKey="gym.newSessionSubtitle" backHref="/gym" />
      <GymSessionForm exercises={exercises} today={today} />
    </div>
  );
}
