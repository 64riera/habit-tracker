import { notFound } from "next/navigation";
import { getGymSessions } from "@/lib/queries/gym";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getServerToday } from "@/lib/settings/date-server";
import { GymSessionForm } from "@/components/gym/gym-session-form";
import { ContentHeader } from "@/components/nav/content-header";
import { DeleteGymSessionButton } from "./delete-gym-session-button";

export default async function SesionGymDetallePage({ params }: { params: Promise<{ id: string }> }) {
  // includeHidden: true — editing must still be able to show/select the
  // session's already-assigned exercise even if it's since been hidden.
  const [{ id }, sessions, exercises, today] = await Promise.all([
    params,
    getGymSessions(),
    getGymExercises(true),
    getServerToday(),
  ]);
  const session = sessions.find((s) => s.id === id);
  if (!session) notFound();

  const initialDraft =
    session.draftDate && session.draftExercises
      ? {
          id: session.id,
          date: session.draftDate,
          exercises: session.draftExercises,
          cardioMinutes: session.draftCardioMinutes,
        }
      : undefined;

  return (
    <div>
      <ContentHeader titleKey="gym.editSession" subtitleKey="screens.gym.subtitle" backHref="/gym" />
      <GymSessionForm session={session} exercises={exercises} today={today} initialDraft={initialDraft} />
      <div className="mt-3">
        <DeleteGymSessionButton sessionId={id} />
      </div>
    </div>
  );
}
