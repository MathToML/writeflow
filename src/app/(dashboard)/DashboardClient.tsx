"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import OneThingCard from "@/components/OneThingCard";
import TodaySchedule from "@/components/TodaySchedule";
import TaskList from "@/components/TaskList";
import BrainDumpChat from "@/components/BrainDumpChat";
import EventFormModal, { type EventData } from "@/components/EventFormModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  importance: number | null;
  context_type: string | null;
  due_date: string | null;
  status: string;
  notes: unknown;
}

interface Event {
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

interface Dump {
  id: string;
  raw_content: string;
  ai_analysis: unknown;
  created_at: string;
}

interface DashboardClientProps {
  events: Event[];
  upcomingEvents: Event[];
  tasks: Task[];
  recommendation: { task: Task; reason: string } | null;
  hasCandidates: boolean;
  todayCompleted: number;
  dumps: Dump[];
}

export default function DashboardClient({
  events,
  upcomingEvents,
  tasks,
  recommendation: serverRecommendation,
  hasCandidates,
  todayCompleted,
  dumps,
}: DashboardClientProps) {
  const router = useRouter();
  const now = new Date();

  const refresh = () => router.refresh();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showOTTD, setShowOTTD] = useState(!!serverRecommendation);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // AI recommendation state
  const [aiRecommendation, setAiRecommendation] = useState<{
    task: Task;
    reason: string;
  } | null>(serverRecommendation);
  const [isLoadingOTTD, setIsLoadingOTTD] = useState(false);

  // Fetch AI recommendation on cache miss
  const fetchRecommendation = useCallback(async () => {
    if (aiRecommendation || !hasCandidates) return;
    setIsLoadingOTTD(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (data.recommendation) {
        setAiRecommendation(data.recommendation);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsLoadingOTTD(false);
    }
  }, [aiRecommendation, hasCandidates]);

  // Auto-fetch when OTTD is shown but no recommendation yet
  useEffect(() => {
    if (showOTTD && !aiRecommendation && hasCandidates) {
      fetchRecommendation();
    }
  }, [showOTTD, aiRecommendation, hasCandidates, fetchRecommendation]);

  const handleEventClick = (event: Event) => {
    setEditingEvent(event as EventData);
    setEventFormOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventFormOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    refresh();
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)]">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">
        {/* 1. Date / Time Header */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-2xl font-bold text-slate-900">
            {now.toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
          <p className="text-4xl font-light text-slate-400 tabular-nums">
            {now.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
          {todayCompleted > 0 && (
            <p className="text-sm text-green-600 font-medium">
              오늘 {todayCompleted}개 완료
            </p>
          )}
        </div>

        {/* 2. Today's Schedule */}
        <TodaySchedule events={events} onEventClick={handleEventClick} />

        {/* 3. Upcoming Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-slate-400">
              다가오는 일정
            </h3>
            <button
              onClick={handleCreateEvent}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              + 새 일정
            </button>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-1">
              {upcomingEvents.map((event) => {
                const startDate = new Date(event.start_at);
                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex items-center gap-3 p-2.5 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <span className="text-xs font-mono text-slate-400 w-32 shrink-0">
                      {startDate.toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {event.is_all_day
                        ? "종일"
                        : startDate.toLocaleTimeString("ko-KR", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                    </span>
                    <span className="text-sm flex-1">{event.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                      className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-300 px-1">예정된 일정이 없어요</p>
          )}
        </div>

        {/* 4. Task List */}
        <TaskList
          tasks={tasks}
          highlightId={showOTTD && aiRecommendation ? aiRecommendation.task.id : undefined}
          onTaskUpdate={refresh}
        />

        {/* 5. OneThingCard / Loading / Empty */}
        {showOTTD && aiRecommendation ? (
          <div className="animate-in">
            <OneThingCard
              task={aiRecommendation.task}
              reason={aiRecommendation.reason}
              onComplete={refresh}
              onDefer={() => setShowOTTD(false)}
            />
          </div>
        ) : showOTTD && isLoadingOTTD ? (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl text-center space-y-3 animate-in">
            <div className="text-3xl animate-bounce">🤔</div>
            <p className="text-slate-600 font-medium">
              어떤 걸 하면 좋을지 생각하고 있어요...
            </p>
            <div className="flex justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse [animation-delay:0.4s]" />
            </div>
          </div>
        ) : showOTTD && !hasCandidates ? (
          <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-2xl text-center space-y-2 animate-in">
            <div className="text-3xl">🌿</div>
            <p className="text-slate-600 font-medium">아직 추천이 없어요</p>
            <p className="text-slate-400 text-sm">
              할 일을 추가하면 AI가 추천해드릴게요
            </p>
          </div>
        ) : tasks.length === 0 && !showOTTD ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
            <div className="text-4xl mb-3">🌿</div>
            <p className="text-slate-600 font-medium">
              지금은 할 일이 없어요
            </p>
            <p className="text-slate-400 text-sm mt-1">
              아래에 무엇이든 던져보세요
            </p>
          </div>
        ) : null}
      </div>

      {/* Bottom Action Area */}
      <div className="shrink-0">
        {/* OTTD Button - visible only when chat is closed */}
        {!isChatOpen && (
          <div className="pb-2">
            <button
              onClick={() => setShowOTTD((prev) => !prev)}
              className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] ${
                showOTTD
                  ? "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110"
              }`}
            >
              {showOTTD ? "✕ 추천 닫기" : "🎯 What's OTTD?"}
            </button>
          </div>
        )}

        {/* Chat + Input */}
        <BrainDumpChat
          dumps={dumps}
          onDumpCreated={refresh}
          isChatOpen={isChatOpen}
          onChatOpenChange={setIsChatOpen}
        />
      </div>

      {/* Event Form Modal */}
      {eventFormOpen && (
        <EventFormModal
          event={editingEvent}
          onClose={() => setEventFormOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
