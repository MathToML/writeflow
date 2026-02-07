"use client";

import { useState } from "react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  importance: number | null;
  context_type: string | null;
  due_date: string | null;
}

interface OneThingCardProps {
  task: Task;
  reason: string;
  onComplete: () => void;
  onDefer: () => void;
}

const ENCOURAGEMENTS = [
  "첫 걸음을 뗐어요! 🎉",
  "좋은 흐름이에요! 💪",
  "오늘도 해내고 있어요! ✨",
  "정말 대단해요! 🌟",
  "멈추지 않는 당신, 최고예요! 🏆",
];

export default function OneThingCard({
  task,
  reason,
  onComplete,
  onDefer,
}: OneThingCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, status: "done" }),
      });
      const data = await res.json();
      setTodayCount(data.todayCompleted);
      setCompleted(true);
      setTimeout(() => onComplete(), 2500);
    } catch {
      setIsCompleting(false);
    }
  };

  const handleDefer = () => {
    onDefer();
  };

  if (completed) {
    const msg =
      ENCOURAGEMENTS[Math.min(todayCount - 1, ENCOURAGEMENTS.length - 1)];
    return (
      <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-300">
        <div className="text-4xl">🎯</div>
        <p className="text-xl font-bold text-green-800">{msg}</p>
        <p className="text-green-600 text-sm">
          오늘 {todayCount}개 완료했어요
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            지금 이것 하나만
          </p>
          <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
        </div>
        <span className="text-2xl">🎯</span>
      </div>

      {task.description && (
        <p className="text-slate-600 text-sm">{task.description}</p>
      )}

      <p className="text-blue-700 text-sm italic">&ldquo;{reason}&rdquo;</p>

      {task.due_date && (
        <p className="text-xs text-slate-500">
          마감: {new Date(task.due_date).toLocaleDateString("ko-KR")}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all active:scale-[0.98]"
        >
          {isCompleting ? "처리 중..." : "했어요 ✓"}
        </button>
        <button
          onClick={handleDefer}
          className="px-4 py-3 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-sm"
        >
          지금은 아니에요
        </button>
      </div>
    </div>
  );
}
