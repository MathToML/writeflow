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
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400 px-1">
        Tasks ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={
              task.id === highlightId
                ? "ring-1 ring-blue-300 rounded-xl"
                : ""
            }
          >
            <TaskItem task={task} onTaskUpdate={onTaskUpdate} />
          </div>
        ))}
      </div>
    </div>
  );
}
