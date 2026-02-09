"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { extractYouTubeVideoId, getYouTubeThumbnail } from "@/lib/youtube";

interface NoteAttachment {
  storage_path: string;
  signed_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface YouTubeEmbed {
  url: string;
  video_id: string;
  thumbnail_url: string;
}

interface TaskNote {
  text: string;
  created_at: string;
  media_url?: string;
  attachments?: NoteAttachment[];
  youtube?: YouTubeEmbed;
}

interface SelectedFile {
  file: File;
  preview: string;
  base64: string;
}

const ACCEPTED_FILE_TYPES = "image/*,audio/*,.pdf,.doc,.docx,.txt";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    label: "Call",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>,
  },
  errand: {
    label: "Errand",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
  },
  home: {
    label: "Home",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  },
  meeting: {
    label: "Meeting",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  },
  quick: {
    label: "Quick",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  },
  focus: {
    label: "Focus",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  waiting: {
    label: "Waiting",
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-slate-100 text-slate-600 border-slate-200", activeColor: "bg-slate-200 text-slate-800 border-slate-400" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-50 text-blue-600 border-blue-200", activeColor: "bg-blue-100 text-blue-800 border-blue-400" },
  { value: "done", label: "Done", color: "bg-green-50 text-green-600 border-green-200", activeColor: "bg-green-100 text-green-800 border-green-400" },
  { value: "deferred", label: "Deferred", color: "bg-amber-50 text-amber-600 border-amber-200", activeColor: "bg-amber-100 text-amber-800 border-amber-400" },
];

function formatNoteTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [youtubePreview, setYoutubePreview] = useState<{ video_id: string; thumbnail_url: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Detect YouTube URL in note input
  useEffect(() => {
    const videoId = extractYouTubeVideoId(noteInput);
    if (videoId) {
      setYoutubePreview({ video_id: videoId, thumbnail_url: getYouTubeThumbnail(videoId) });
    } else {
      setYoutubePreview(null);
    }
  }, [noteInput]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    const newFiles: SelectedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`${file.name}: must be under 5MB`);
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64,
        };
        reader.readAsDataURL(file);
      });
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";
      newFiles.push({ file, preview, base64 });
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAddNote = async () => {
    const text = noteInput.trim();
    if ((!text && selectedFiles.length === 0) || isUpdating) return;
    setIsUpdating(true);
    try {
      const body: Record<string, unknown> = { taskId: task.id };
      if (selectedFiles.length > 0) {
        body.noteData = {
          text,
          attachments: selectedFiles.map((f) => ({
            base64: f.base64,
            mimeType: f.file.type,
            fileName: f.file.name,
            fileSize: f.file.size,
          })),
        };
      } else {
        body.noteData = { text };
      }

      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setFileError(err.error ?? "Upload failed");
        return;
      }

      setNoteInput("");
      selectedFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setSelectedFiles([]);
      setYoutubePreview(null);
      setFileError(null);
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
        onTaskUpdate();
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const notes = (Array.isArray(task.notes) ? task.notes : []) as TaskNote[];

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden group/task">
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
              {new Date(task.due_date + "T12:00:00").toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {notes.length > 0 && (
            <span className="text-xs text-slate-300">{notes.length}</span>
          )}
          {/* Delete button (visible on hover) */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={isDeleting}
            className="w-4 h-4 text-slate-200 hover:text-red-400 opacity-0 group-hover/task:opacity-100 transition-all disabled:opacity-50"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-500">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-all"
                  >
                    {isDeleting ? "..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-all"
                  >
                    Cancel
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
                      <span className="text-slate-600 break-words min-w-0">{note.text}</span>
                    </div>
                    {/* Legacy media_url */}
                    {note.media_url && !note.attachments?.length && (
                      <div className="mt-1 ml-[4.5rem]">
                        <a href={note.media_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={note.media_url}
                            alt="Attached image"
                            className="max-w-[200px] rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                    {/* Attachments */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="mt-1.5 ml-[4.5rem] flex flex-wrap gap-2">
                        {note.attachments.map((att, j) => {
                          if (att.file_type.startsWith("image/")) {
                            return (
                              <a key={j} href={att.signed_url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={att.signed_url}
                                  alt={att.file_name}
                                  className="max-w-[200px] max-h-[150px] rounded-lg border border-slate-200 hover:opacity-90 transition-opacity object-cover"
                                />
                              </a>
                            );
                          }
                          if (att.file_type.startsWith("audio/")) {
                            return (
                              <div key={j} className="w-full">
                                <div className="text-[10px] text-slate-400 mb-0.5">{att.file_name}</div>
                                <audio controls className="h-8 w-full max-w-[280px]" preload="metadata">
                                  <source src={att.signed_url} type={att.file_type} />
                                </audio>
                              </div>
                            );
                          }
                          // PDF, doc, txt, etc.
                          const isPdf = att.file_type === "application/pdf";
                          return (
                            <a
                              key={j}
                              href={att.signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <span>{isPdf ? "\uD83D\uDCC4" : "\uD83D\uDCCE"}</span>
                              <span className="text-slate-600 truncate max-w-[150px]">{att.file_name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {/* YouTube embed */}
                    {note.youtube && (
                      <div className="mt-1.5 ml-[4.5rem]">
                        <a href={note.youtube.url} target="_blank" rel="noopener noreferrer" className="relative inline-block group">
                          <img
                            src={note.youtube.thumbnail_url}
                            alt="YouTube"
                            className="w-[200px] rounded-lg border border-slate-200 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center group-hover:bg-opacity-100 transition-all">
                              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Note input area */}
            <div className="space-y-2">
              {/* YouTube preview */}
              {youtubePreview && (
                <div className="relative inline-block">
                  <img
                    src={youtubePreview.thumbnail_url}
                    alt="YouTube preview"
                    className="w-[180px] rounded-lg border border-slate-200 opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-600 bg-opacity-80 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected file previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((sf, i) => (
                    <div key={i} className="relative group">
                      {sf.preview ? (
                        <img
                          src={sf.preview}
                          alt={sf.file.name}
                          className="w-16 h-16 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center px-1">
                          <span className="text-lg">{sf.file.type.startsWith("audio/") ? "\uD83C\uDFB5" : sf.file.type === "application/pdf" ? "\uD83D\uDCC4" : "\uD83D\uDCCE"}</span>
                          <span className="text-[9px] text-slate-400 truncate w-full text-center">{sf.file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File error */}
              {fileError && (
                <p className="text-xs text-red-500">{fileError}</p>
              )}

              {/* Input row */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdating}
                  className="px-2 py-1.5 text-sm text-slate-400 hover:text-blue-500 disabled:opacity-40 transition-colors shrink-0"
                  title="Attach file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                </button>
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
                  placeholder="Add a note or YouTube link..."
                  className="flex-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all text-slate-700 placeholder:text-slate-400"
                  disabled={isUpdating}
                />
                <button
                  onClick={handleAddNote}
                  disabled={(!noteInput.trim() && selectedFiles.length === 0) || isUpdating}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {isUpdating ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
