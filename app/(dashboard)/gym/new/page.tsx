import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getGymRoutines } from "@/lib/queries/gym-routines";
import { getGymSessionDraft } from "@/lib/queries/gym";
import { getServerToday } from "@/lib/settings/date-server";
import { GymSessionForm } from "@/components/gym/gym-session-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function NuevaSesionGymPage() {
  const [exercises, routines, today, draft] = await Promise.all([
    getGymExercises(),
    getGymRoutines(),
    getServerToday(),
    getGymSessionDraft(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="gym.newSession" subtitleKey="gym.newSessionSubtitle" backHref="/gym" />
      <GymSessionForm
        exercises={exercises}
        routines={routines}
        today={today}
        initialDraft={draft && { id: draft.id, date: draft.date, exercises: draft.exercises }}
      />
    </div>
  );
}
