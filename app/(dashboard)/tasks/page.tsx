import { getTasksWithStatus } from "@/lib/queries/tasks";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { TaskForm } from "@/components/task/task-form";
import { TasksClient } from "./tasks-client";

export default async function TareasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const tasks = await getTasksWithStatus(today);

  return (
    <div>
      <TasksClient tasks={tasks} today={today} />
      <div id="crear-tarea" className="mt-6 scroll-mt-6 border-t border-border pt-5">
        <TaskForm />
      </div>
    </div>
  );
}
