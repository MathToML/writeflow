import { createClient } from "@/lib/supabase/server";
import CalendarPageClient from "./CalendarPageClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date();
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch events + tasks with due_date in parallel
  const [{ data: upcomingEvents }, { data: pastEvents }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_at", now.toISOString().split("T")[0])
        .lte("start_at", thirtyDaysLater.toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_at", thirtyDaysAgo.toISOString())
        .lt("start_at", now.toISOString().split("T")[0])
        .order("start_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, due_date, status, importance")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .not("due_date", "is", null)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true }),
    ]);

  return (
    <CalendarPageClient
      upcomingEvents={upcomingEvents ?? []}
      pastEvents={pastEvents ?? []}
      tasks={tasks ?? []}
    />
  );
}
