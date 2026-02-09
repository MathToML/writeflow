"use client";

import HabitHeatmap from "@/components/HabitHeatmap";

interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  streak: number;
}

interface HabitLog {
  id: string;
  habit_id: string;
  logged_date: string;
  note: string | null;
  value: number | null;
}

interface HabitsPageClientProps {
  habits: Habit[];
  logs: HabitLog[];
}

export default function HabitsPageClient({
  habits,
  logs,
}: HabitsPageClientProps) {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-6.5rem)] text-center px-4">
        <div className="text-4xl mb-4">🔥</div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          No habits yet
        </h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Tell me about your daily routines in chat — I&apos;ll suggest turning
          them into trackable habits with a heatmap!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Habits</h1>

      <div className="space-y-4">
        {habits.map((habit) => {
          const habitLogs = logs
            .filter((l) => l.habit_id === habit.id)
            .map((l) => ({
              date: l.logged_date,
              value: l.value ?? 1,
              note: l.note,
            }));

          return (
            <div
              key={habit.id}
              className="bg-white rounded-xl border border-slate-100 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{habit.icon ?? "✅"}</span>
                  <div>
                    <h3 className="font-medium text-slate-900">{habit.name}</h3>
                    {habit.description && (
                      <p className="text-xs text-slate-500">
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                    <span>🔥</span>
                    <span>{habit.streak} day streak</span>
                  </div>
                )}
              </div>

              {/* Heatmap */}
              <div className="overflow-x-auto">
                <HabitHeatmap
                  logs={habitLogs}
                  color={habit.color ?? "green"}
                  weeks={16}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
