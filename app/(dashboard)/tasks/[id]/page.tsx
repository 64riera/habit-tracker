import { notFound } from "next/navigation";
import { getTasks } from "@/lib/queries/tasks";
import { TaskForm } from "@/components/task/task-form";
import { ContentHeader } from "@/components/nav/content-header";
import { DeleteTaskButton } from "./delete-task-button";

export default async function TareaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, tasks] = await Promise.all([params, getTasks()]);
  const task = tasks.find((t) => t.id === id);
  if (!task) notFound();

  return (
    <div>
      <ContentHeader titleKey="screens.tareas.title" subtitleKey="screens.tareas.subtitle" backHref="/tasks" />
      <TaskForm task={task} />
      <div className="mt-3">
        <DeleteTaskButton taskId={id} />
      </div>
    </div>
  );
}
