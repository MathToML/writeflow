"use client";

import { useState } from "react";

interface TaskNote {
  text: string;
  created_at: string;
}

export interface TaskItemData {
  id: string;
  title: string;
  description: string | null;
  importance: number | null;
  context_type: string | null;
  due_date: string | null;
  status: string;
  notes: unknown;
}

const CONTEXT_LABELS: Record<string, string> = {
  location_dependent: "📍 장소",
  desk_work: "💻 책상",
  communication: "💬 소통",
  errand: "🚶 외출",
  quick: "⚡ 간단",
  other: "",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "대기", color: "bg-slate-100 text-slate-600 border-slate-200", activeColor: "bg-slate-200 text-slate-800 border-slate-400" },
  { value: "in_progress", label: "진행 중", color: "bg-blue-50 text-blue-600 border-blue-200", activeColor: "bg-blue-100 text-blue-800 border-blue-400" },
  { value: "done", label: "완료", color: "bg-green-50 text-green-600 border-green-200", activeColor: "bg-green-100 text-green-800 border-green-400" },
  { value: "deferred", label: "보류", color: "bg-amber-50 text-amber-600 border-amber-200", activeColor: "bg-amber-100 text-amber-800 border-amber-400" },
];

function formatNoteTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "방금";
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function TaskItem({
  task,
  onTaskUpdate,
}: {
  task: TaskItemData;
  onTaskUpdate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDone, setIsDone] = useState(task.status === "done");
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [noteInput, setNoteInput] = useState("");

  const handleToggleDone = async () => {
    if (isUpdating) return;
    const newStatus = isDone ? "pending" : "done";
    setIsDone(!isDone);
    setCurrentStatus(newStatus);
    setIsUpdating(true);
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, status: newStatus }),
      });
      onTaskUpdate();
    } catch {
      setIsDone(isDone);
      setCurrentStatus(task.status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating || newStatus === currentStatus) return;
    setCurrentStatus(newStatus);
    setIsDone(newStatus === "done");
    setIsUpdating(true);
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, status: newStatus }),
      });
      onTaskUpdate();
    } catch {
      setCurrentStatus(task.status);
      setIsDone(task.status === "done");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    const text = noteInput.trim();
    if (!text || isUpdating) return;
    setIsUpdating(true);
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, note: text }),
      });
      setNoteInput("");
      onTaskUpdate();
    } catch {
      // keep input for retry
    } finally {
      setIsUpdating(false);
    }
  };

  const notes = (Array.isArray(task.notes) ? task.notes : []) as TaskNote[];

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Always-visible row */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleDone}
          disabled={isUpdating}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all duration-200 flex items-center justify-center ${
            isDone
              ? "bg-green-500 border-green-500"
              : "border-slate-300 hover:border-blue-400"
          }`}
        >
          {isDone && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Title area - clickable for expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span
            className={`text-sm font-medium truncate transition-all duration-300 ${
              isDone ? "line-through text-slate-400" : "text-slate-800"
            }`}
          >
            {task.title}
          </span>
        </button>

        {/* Metadata */}
        <div className="flex items-center gap-2 shrink-0">
          {task.context_type && CONTEXT_LABELS[task.context_type] && (
            <span className="text-xs text-slate-400">
              {CONTEXT_LABELS[task.context_type]}
            </span>
          )}
          {task.due_date && (
            <span className="text-xs text-slate-400 font-mono">
              {new Date(task.due_date).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {notes.length > 0 && (
            <span className="text-xs text-slate-300">{notes.length}</span>
          )}
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Expandable panel */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-slate-50 space-y-3">
            {/* Description */}
            {task.description && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Status controls */}
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={isUpdating}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                    currentStatus === opt.value ? opt.activeColor : opt.color
                  } ${isUpdating ? "opacity-50" : "hover:opacity-80"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Notes list */}
            {notes.length > 0 && (
              <div className="space-y-1.5">
                {notes.map((note, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-slate-400 shrink-0 w-16">
                      {formatNoteTime(note.created_at)}
                    </span>
                    <span className="text-slate-600">{note.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Note input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder="진행 상황을 메모하세요..."
                className="flex-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all text-slate-700 placeholder:text-slate-400"
                disabled={isUpdating}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteInput.trim() || isUpdating}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                {isUpdating ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  "추가"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
