import { getTasksWithStatus } from "@/lib/queries/tasks";
import { getServerToday } from "@/lib/settings/date-server";
import { TasksClient } from "./tasks-client";

export default async function TareasPage() {
  const today = await getServerToday();
  const tasks = await getTasksWithStatus(today);

  return <TasksClient tasks={tasks} today={today} />;
}
