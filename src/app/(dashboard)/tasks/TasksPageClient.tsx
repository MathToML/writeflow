"use client";

import { useRouter } from "next/navigation";
import TaskItem, { type TaskItemData } from "@/components/TaskItem";

export default function TasksPageClient({
  pendingTasks,
  completedTasks,
}: {
  pendingTasks: TaskItemData[];
  completedTasks: TaskItemData[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">할 일 목록</h1>

      {/* Pending */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">
          진행할 일 ({pendingTasks.length})
        </h2>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
            모든 일을 끝냈어요! 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onTaskUpdate={refresh} />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">
            완료 ({completedTasks.length})
          </h2>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onTaskUpdate={refresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
