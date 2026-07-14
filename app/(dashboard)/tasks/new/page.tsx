import { TaskForm } from "@/components/task/task-form";
import { ContentHeader } from "@/components/nav/content-header";

export default function NuevaTareaPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="tasks.newTask" subtitleKey="tasks.newTaskSubtitle" backHref="/tasks" />
      <TaskForm />
    </div>
  );
}
