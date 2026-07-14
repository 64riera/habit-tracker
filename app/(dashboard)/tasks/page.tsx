import { getTasksWithStatus } from "@/lib/queries/tasks";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { TasksClient } from "./tasks-client";

export default async function TareasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const tasks = await getTasksWithStatus(today);

  return <TasksClient tasks={tasks} today={today} />;
}
