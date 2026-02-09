import { createClient } from "@/lib/supabase/server";
import HabitsPageClient from "./HabitsPageClient";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, description, icon, color, created_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  // Fetch logs for past 16 weeks (for heatmap)
  const sixteenWeeksAgo = new Date();
  sixteenWeeksAgo.setDate(sixteenWeeksAgo.getDate() - 16 * 7);
  const cutoffDate = sixteenWeeksAgo.toISOString().slice(0, 10);

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("id, habit_id, logged_date, note, value")
    .eq("user_id", user.id)
    .gte("logged_date", cutoffDate)
    .order("logged_date", { ascending: false });

  // Compute current streak per habit
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habitsWithStreaks = (habits ?? []).map((habit) => {
    const habitLogs = (logs ?? []).filter((l) => l.habit_id === habit.id);
    const uniqueDates = [...new Set(habitLogs.map((l) => l.logged_date))].sort(
      (a, b) => b.localeCompare(a)
    );

    let streak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().slice(0, 10);
      if (uniqueDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    return { ...habit, streak };
  });

  return (
    <HabitsPageClient
      habits={habitsWithStreaks}
      logs={logs ?? []}
    />
  );
}
