"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { expandRecurrences, rruleToKorean } from "@/lib/recurrence";
import EventFormModal from "@/components/EventFormModal";

// ============ Types ============

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
  attendees: unknown;
  is_all_day?: boolean | null;
  recurrence_rule?: string | null;
}

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  importance: number | null;
}

type ViewMode = "month" | "week" | "list";

// ============ Helpers ============

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime12h(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  // Pad to complete last row
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function groupByDate(events: Event[]): Record<string, Event[]> {
  const grouped: Record<string, Event[]> = {};
  events.forEach((event) => {
    const date = new Date(event.start_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  });
  return grouped;
}

// ============ Month View ============

function MonthView({
  events,
  tasks,
  currentDate,
  onEventClick,
}: {
  events: Event[];
  tasks: Task[];
  currentDate: Date;
  onEventClick: (event: Event) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, Event[]>();
    events.forEach((e) => {
      if (e.status === "cancelled") return;
      const d = new Date(e.start_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(e);
      }
    });
    return map;
  }, [events, year, month]);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(t);
      }
    });
    return map;
  }, [tasks, year, month]);

  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-3 text-center text-xs font-semibold tracking-wider uppercase ${
              i === 0
                ? "text-red-400"
                : i === 6
                ? "text-blue-400"
                : "text-slate-400"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = day ? eventsByDay.get(day) || [] : [];
          const dayTasks = day ? tasksByDay.get(day) || [] : [];
          const dow = idx % 7;
          const isCurrentDay = day ? isToday(day) : false;
          const hasItems = dayEvents.length + dayTasks.length > 0;

          return (
            <div
              key={idx}
              className={`min-h-[100px] p-1.5 border-t border-slate-100 transition-colors ${
                idx % 7 !== 0 ? "border-l border-slate-100" : ""
              } ${
                !day
                  ? "bg-slate-50/40"
                  : isCurrentDay
                  ? "bg-blue-50/50"
                  : "hover:bg-slate-50/80 cursor-pointer"
              }`}
            >
              {day && (
                <>
                  {/* Date number */}
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                        isCurrentDay
                          ? "bg-blue-500 text-white"
                          : dow === 0
                          ? "text-red-400"
                          : dow === 6
                          ? "text-blue-400"
                          : "text-slate-700"
                      }`}
                    >
                      {day}
                    </span>
                    {/* Dot indicators */}
                    {hasItems && (
                      <div className="flex gap-0.5">
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                        {dayTasks.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {/* Event/task items */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[11px] leading-snug px-1.5 py-0.5 rounded-md truncate cursor-pointer bg-blue-100/80 text-blue-700 hover:bg-blue-200/80 font-medium"
                        onClick={() => onEventClick(ev)}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayTasks
                      .slice(0, Math.max(0, 2 - dayEvents.length))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] leading-snug px-1.5 py-0.5 rounded-md truncate bg-violet-100/80 text-violet-700 font-medium"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                    {dayEvents.length + dayTasks.length > 2 && (
                      <div className="text-[11px] text-slate-400 px-1.5 font-medium">
                        +{dayEvents.length + dayTasks.length - 2}개 더
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ Week View ============

const HOUR_START = 6;
const HOUR_END = 23;

function WeekView({
  events,
  tasks,
  currentDate,
  onEventClick,
}: {
  events: Event[];
  tasks: Task[];
  currentDate: Date;
  onEventClick: (event: Event) => void;
}) {
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today = new Date();

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = HOUR_START; i <= HOUR_END; i++) h.push(i);
    return h;
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, { timed: Event[]; allDay: Event[] }>();
    for (let i = 0; i < 7; i++) map.set(i, { timed: [], allDay: [] });

    events.forEach((ev) => {
      if (ev.status === "cancelled") return;
      const sd = new Date(ev.start_at);
      weekDays.forEach((wd, idx) => {
        if (isSameDay(sd, wd)) {
          const bucket = map.get(idx)!;
          if (ev.is_all_day) {
            bucket.allDay.push(ev);
          } else {
            bucket.timed.push(ev);
          }
        }
      });
    });
    return map;
  }, [events, weekDays]);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const td = new Date(t.due_date);
      weekDays.forEach((wd, idx) => {
        if (isSameDay(td, wd)) {
          if (!map.has(idx)) map.set(idx, []);
          map.get(idx)!.push(t);
        }
      });
    });
    return map;
  }, [tasks, weekDays]);

  function getBlockStyle(ev: Event) {
    const start = new Date(ev.start_at);
    const end = ev.end_at
      ? new Date(ev.end_at)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const startH = start.getHours() + start.getMinutes() / 60;
    const endH = end.getHours() + end.getMinutes() / 60;
    const top = (startH - HOUR_START) * 52;
    const height = Math.max((endH - startH) * 52, 24);
    return { top, height };
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-slate-100">
        <div className="py-3" />
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={`py-3 text-center border-l border-slate-100 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {WEEKDAYS[day.getDay()]}
            </div>
            <div
              className={`text-lg font-semibold mt-0.5 mx-auto ${
                isSameDay(day, today)
                  ? "bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  : "text-slate-700"
              }`}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day / tasks row */}
      {(() => {
        const hasAllDay = weekDays.some((_, idx) => {
          const bucket = eventsByDay.get(idx);
          const dayTasks = tasksByDay.get(idx) || [];
          return (bucket?.allDay.length || 0) + dayTasks.length > 0;
        });
        if (!hasAllDay) return null;
        return (
          <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/50">
            <div className="py-2 px-1 text-[11px] text-slate-400 text-right font-medium">
              종일
            </div>
            {weekDays.map((_, dayIdx) => {
              const bucket = eventsByDay.get(dayIdx);
              const allDayEvs = bucket?.allDay || [];
              const dayTasks = tasksByDay.get(dayIdx) || [];
              return (
                <div
                  key={dayIdx}
                  className="border-l border-slate-100 py-1.5 px-1 min-h-[32px] space-y-0.5"
                >
                  {allDayEvs.map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[11px] px-1.5 py-0.5 rounded-md truncate cursor-pointer bg-blue-100/80 text-blue-700 hover:bg-blue-200/80 font-medium"
                      onClick={() => onEventClick(ev)}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="text-[11px] px-1.5 py-0.5 rounded-md truncate bg-violet-100/80 text-violet-700 font-medium"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[520px]">
        <div className="grid grid-cols-[52px_repeat(7,1fr)] relative">
          {/* Hour labels */}
          <div>
            {hours.map((h) => (
              <div
                key={h}
                className="h-[52px] border-t border-slate-100 px-1 text-right"
              >
                <span className="text-[11px] text-slate-400 font-medium -translate-y-2 inline-block">
                  {h === 0
                    ? "12 AM"
                    : h < 12
                    ? `${h} AM`
                    : h === 12
                    ? "12 PM"
                    : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const bucket = eventsByDay.get(dayIdx);
            const timedEvs = bucket?.timed || [];
            const isCurrentDay = isSameDay(day, today);

            return (
              <div
                key={dayIdx}
                className={`border-l border-slate-100 relative ${
                  isCurrentDay ? "bg-blue-50/30" : ""
                }`}
              >
                {hours.map((h) => (
                  <div key={h} className="h-[52px] border-t border-slate-100" />
                ))}
                {timedEvs.map((ev) => {
                  const style = getBlockStyle(ev);
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-0.5 right-0.5 bg-blue-100 border-l-[3px] border-blue-500 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer hover:bg-blue-200/80 shadow-sm"
                      style={{
                        top: `${style.top}px`,
                        height: `${style.height}px`,
                      }}
                      onClick={() => onEventClick(ev)}
                    >
                      <div className="text-[11px] font-semibold text-blue-800 truncate">
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-blue-600">
                        {formatTime12h(new Date(ev.start_at))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ List View ============

function ListView({
  upcomingEvents,
  pastEvents,
  onEdit,
  onDelete,
}: {
  upcomingEvents: Event[];
  pastEvents: Event[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}) {
  const upcomingGrouped = groupByDate(upcomingEvents);
  const pastGrouped = groupByDate(pastEvents);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          다가오는 일정 ({upcomingEvents.length})
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-500 font-medium">예정된 일정이 없어요</p>
            <p className="text-slate-400 text-sm mt-1">
              홈에서 일정을 던져보세요 (예: &ldquo;내일 오후 3시 치과&rdquo;)
            </p>
          </div>
        ) : (
          Object.entries(upcomingGrouped).map(([date, events]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 px-1 uppercase">
                {date}
              </h3>
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl bg-white border shadow-sm transition-shadow hover:shadow-md ${
                    event.status === "cancelled"
                      ? "border-slate-200 opacity-60"
                      : "border-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p
                        className={`font-semibold ${
                          event.status === "cancelled"
                            ? "line-through text-slate-400"
                            : "text-slate-800"
                        }`}
                      >
                        {event.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime12h(new Date(event.start_at))}
                        {event.end_at &&
                          ` - ${formatTime12h(new Date(event.end_at))}`}
                      </p>
                      {event.location && (
                        <p className="text-xs text-slate-400">
                          📍 {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm text-slate-500 mt-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.status === "cancelled" ? (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          취소됨
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(event)}
                            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => onDelete(event)}
                            className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            지난 일정
          </h2>
          {Object.entries(pastGrouped).map(([date, events]) => (
            <div key={date} className="space-y-1.5">
              <h3 className="text-xs text-slate-300 px-1">{date}</h3>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-white/60 rounded-xl text-slate-400 border border-slate-100"
                >
                  <span className="text-xs font-mono w-16 text-slate-400">
                    {formatTime12h(new Date(event.start_at))}
                  </span>
                  <span className="text-sm">{event.title}</span>
                  <span className="text-xs text-green-400 ml-auto">✓</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Main Component ============

export default function CalendarPageClient({
  upcomingEvents,
  pastEvents,
  tasks = [],
}: {
  upcomingEvents: Event[];
  pastEvents: Event[];
  tasks?: Task[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormOpen(true);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (event: Event) => {
    // Extract real ID for recurring event instances
    const realId = event.id.includes("-") && event.id.length > 36
      ? event.id.slice(0, 36)
      : event.id;
    setIsDeleting(true);
    try {
      await fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: realId }),
      });
      setSelectedEvent(null);
      refresh();
    } catch {
      // silent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSaved = () => {
    refresh();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Expand recurring events into the current view range
  const allEvents = useMemo(() => {
    const baseEvents = [...upcomingEvents, ...pastEvents];
    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month + 2, 0);
    const expanded: Event[] = [];

    for (const ev of baseEvents) {
      if (ev.recurrence_rule) {
        const occurrences = expandRecurrences(
          ev.start_at,
          ev.end_at,
          ev.is_all_day ?? false,
          ev.recurrence_rule,
          rangeStart,
          rangeEnd,
        );
        for (const occ of occurrences) {
          expanded.push({
            ...ev,
            id: `${ev.id}-${occ.date.toISOString()}`,
            start_at: occ.date.toISOString(),
            end_at: ev.end_at
              ? new Date(
                  occ.date.getTime() +
                    (new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()),
                ).toISOString()
              : null,
          });
        }
      } else {
        expanded.push(ev);
      }
    }

    return expanded;
  }, [upcomingEvents, pastEvents, year, month]);

  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      return `${year}년 ${month + 1}월`;
    }
    const ws = getWeekStart(currentDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    if (ws.getMonth() === we.getMonth()) {
      return `${ws.getFullYear()}년 ${ws.getMonth() + 1}월 ${ws.getDate()}일 - ${we.getDate()}일`;
    }
    return `${ws.getMonth() + 1}/${ws.getDate()} - ${we.getMonth() + 1}/${we.getDate()}`;
  }, [viewMode, currentDate, year, month]);

  return (
    // Break out of the parent max-w-2xl constraint
    <div className="-mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-16 lg:px-16">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">일정</h1>
            <button
              onClick={handleCreateEvent}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              + 새 일정
            </button>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            {(["month", "week", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  viewMode === mode
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {mode === "month" ? "월간" : mode === "week" ? "주간" : "목록"}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        {viewMode !== "list" && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">
              {headerLabel}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
              >
                오늘
              </button>
              <button
                onClick={goToPrevious}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors text-lg"
              >
                ‹
              </button>
              <button
                onClick={goToNext}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors text-lg"
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        {viewMode !== "list" && (
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> 일정
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> 할일
            </span>
          </div>
        )}

        {/* Selected event detail */}
        {selectedEvent && viewMode !== "list" && (
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-800 text-lg">
                  {selectedEvent.title}
                </p>
                <p className="text-sm text-slate-500">
                  🕐{" "}
                  {selectedEvent.is_all_day
                    ? "종일"
                    : <>
                        {formatTime12h(new Date(selectedEvent.start_at))}
                        {selectedEvent.end_at &&
                          ` - ${formatTime12h(new Date(selectedEvent.end_at))}`}
                      </>}
                </p>
                {selectedEvent.recurrence_rule && (
                  <p className="text-sm text-slate-400">
                    🔁 {rruleToKorean(selectedEvent.recurrence_rule)}
                  </p>
                )}
                {selectedEvent.location && (
                  <p className="text-sm text-slate-400">
                    📍 {selectedEvent.location}
                  </p>
                )}
                {selectedEvent.description && (
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedEvent.description}
                  </p>
                )}
                {/* Edit / Delete buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEditEvent(selectedEvent)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xl shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Views */}
        {viewMode === "month" && (
          <MonthView
            events={allEvents}
            tasks={tasks}
            currentDate={currentDate}
            onEventClick={setSelectedEvent}
          />
        )}

        {viewMode === "week" && (
          <WeekView
            events={allEvents}
            tasks={tasks}
            currentDate={currentDate}
            onEventClick={setSelectedEvent}
          />
        )}

        {viewMode === "list" && (
          <ListView
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </div>

      {/* Event Form Modal */}
      {formOpen && (
        <EventFormModal
          event={editingEvent}
          onClose={() => setFormOpen(false)}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
}
