"use client";

import TaskItem, { type TaskItemData } from "./TaskItem";

export default function TaskList({
  tasks,
  highlightId,
  onTaskUpdate,
}: {
  tasks: TaskItemData[];
  highlightId?: string;
  onTaskUpdate: () => void;
}) {
  const otherTasks = tasks.filter((t) => t.id !== highlightId);

  if (otherTasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400 px-1">
        할 일 {tasks.length}개
      </h3>
      <div className="space-y-2">
        {otherTasks.map((task) => (
          <TaskItem key={task.id} task={task} onTaskUpdate={onTaskUpdate} />
        ))}
      </div>
    </div>
  );
}
