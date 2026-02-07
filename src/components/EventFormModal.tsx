"use client";

import { useState } from "react";

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
  is_all_day?: boolean | null;
  recurrence_rule?: string | null;
}

const RECURRENCE_PRESETS = [
  { label: "반복 없음", value: "" },
  { label: "매일", value: "RRULE:FREQ=DAILY" },
  { label: "매주", value: "__WEEKLY__" },
  { label: "격주", value: "RRULE:FREQ=WEEKLY;INTERVAL=2" },
  { label: "4주마다", value: "RRULE:FREQ=WEEKLY;INTERVAL=4" },
  { label: "매월", value: "RRULE:FREQ=MONTHLY" },
  { label: "매년", value: "RRULE:FREQ=YEARLY" },
];

const WEEKDAY_OPTIONS = [
  { label: "일", value: "SU" },
  { label: "월", value: "MO" },
  { label: "화", value: "TU" },
  { label: "수", value: "WE" },
  { label: "목", value: "TH" },
  { label: "금", value: "FR" },
  { label: "토", value: "SA" },
];

function parseDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function parseTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function EventFormModal({
  event,
  initialDate,
  onClose,
  onSaved,
}: {
  event: EventData | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = event !== null;

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(
    event ? parseDate(event.start_at) : initialDate ?? new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState(
    event && !event.is_all_day ? parseTime(event.start_at) : "09:00",
  );
  const [endTime, setEndTime] = useState(
    event?.end_at && !event.is_all_day ? parseTime(event.end_at) : "10:00",
  );
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day ?? false);
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [recurrencePreset, setRecurrencePreset] = useState(() => {
    if (!event?.recurrence_rule) return "";
    const rule = event.recurrence_rule;
    const match = RECURRENCE_PRESETS.find((p) => p.value === rule);
    if (match) return match.value;
    if (rule.includes("FREQ=WEEKLY") && rule.includes("BYDAY")) return "__WEEKLY__";
    return rule;
  });
  const [weekdays, setWeekdays] = useState<string[]>(() => {
    if (!event?.recurrence_rule) return [];
    const match = event.recurrence_rule.match(/BYDAY=([A-Z,]+)/);
    if (match) return match[1].split(",");
    return [];
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleStartTimeChange = (newStart: string) => {
    const gap = timeToMinutes(endTime) - timeToMinutes(startTime);
    const duration = gap > 0 ? gap : 60; // fallback 1h if end <= start
    setStartTime(newStart);
    setEndTime(minutesToTime(timeToMinutes(newStart) + duration));
  };

  const buildRRule = (): string | null => {
    if (!recurrencePreset) return null;
    if (recurrencePreset === "__WEEKLY__") {
      if (weekdays.length === 0) return null;
      return `RRULE:FREQ=WEEKLY;BYDAY=${weekdays.join(",")}`;
    }
    return recurrencePreset;
  };

  const toggleWeekday = (day: string) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSaving(true);

    const startAt = isAllDay
      ? `${date}T00:00:00`
      : `${date}T${startTime}:00`;
    const endAt = isAllDay
      ? null
      : `${date}T${endTime}:00`;

    const startDateObj = new Date(startAt);
    const endDateObj = endAt ? new Date(endAt) : null;

    const body: Record<string, unknown> = {
      title: title.trim(),
      start_at: startDateObj.toISOString(),
      end_at: endDateObj?.toISOString() ?? null,
      is_all_day: isAllDay,
      location: location.trim() || null,
      description: description.trim() || null,
      recurrence_rule: buildRRule(),
    };

    try {
      if (isEditing) {
        const realId = event.id.includes("-") && event.id.length > 36
          ? event.id.slice(0, 36)
          : event.id;
        await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: realId, ...body }),
        });
      } else {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      onSaved();
      onClose();
    } catch {
      // keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "일정 수정" : "새 일정"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xl"
            >
              ×
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="일정 제목"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            autoFocus
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">종일</span>
          </label>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all"
            />
          </div>

          {!isAllDay && (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-500">시작</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-500">종료</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">장소</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="장소 (선택)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">반복</label>
            <select
              value={recurrencePreset}
              onChange={(e) => setRecurrencePreset(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all bg-white"
            >
              {RECURRENCE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {recurrencePreset === "__WEEKLY__" && (
            <div className="flex gap-1.5">
              {WEEKDAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleWeekday(opt.value)}
                  className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                    weekdays.includes(opt.value)
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSaving}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "저장 중..." : isEditing ? "수정" : "추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
