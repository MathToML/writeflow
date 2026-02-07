"use client";

import { useState } from "react";

interface TaskNote {
  text: string;
  created_at: string;
  media_url?: string;
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

const CONTEXT_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  computer: {
    label: "PC",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" /></svg>,
  },
  phone: {
    label: "연락",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>,
  },
  errand: {
    label: "외출",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
  },
  home: {
    label: "집",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  },
  meeting: {
    label: "미팅",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  },
  quick: {
    label: "간단",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  },
  focus: {
    label: "집중",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  waiting: {
    label: "대기",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

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

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (res.ok) {
        setIsDeleted(true);
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRestore = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, restore: true }),
      });
      if (res.ok) {
        setIsDeleted(false);
        onTaskUpdate();
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const notes = (Array.isArray(task.notes) ? task.notes : []) as TaskNote[];

  if (isDeleted) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-400 line-through truncate">{task.title}</span>
        <button
          onClick={handleRestore}
          disabled={isDeleting}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors shrink-0 ml-2"
        >
          {isDeleting ? "..." : "되돌리기"}
        </button>
      </div>
    );
  }

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
          {task.context_type && task.context_type !== "other" && CONTEXT_ICONS[task.context_type] && (
            <span className="inline-flex items-center gap-0.5 text-slate-400" title={CONTEXT_ICONS[task.context_type].label}>
              {CONTEXT_ICONS[task.context_type].icon}
              <span className="text-[10px]">{CONTEXT_ICONS[task.context_type].label}</span>
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

            {/* Status controls + delete */}
            <div className="flex items-center gap-1.5 flex-wrap">
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
              <div className="flex-1" />
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-500">삭제할까요?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-all"
                  >
                    {isDeleting ? "..." : "삭제"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-all"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* Notes list */}
            {notes.length > 0 && (
              <div className="space-y-2">
                {notes.map((note, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex gap-2">
                      <span className="text-slate-400 shrink-0 w-16">
                        {formatNoteTime(note.created_at)}
                      </span>
                      <span className="text-slate-600">{note.text}</span>
                    </div>
                    {note.media_url && (
                      <div className="mt-1 ml-[4.5rem]">
                        <img
                          src={note.media_url}
                          alt="첨부 이미지"
                          className="max-w-[200px] rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
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
