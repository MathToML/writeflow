import { createClient } from "@/lib/supabase/server";
import {
  computeContextHash,
  getCachedRecommendation,
  scoreCandidates,
} from "@/lib/ai/recommend";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // Upcoming events: next 7 days (excluding today)
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  // Fetch all data in parallel
  const [
    { data: events },
    { data: upcomingEvents },
    { data: tasks },
    { count: todayCompleted },
    { data: dumps },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("start_at", todayStart.toISOString())
      .lte("start_at", todayEnd.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("start_at", todayEnd.toISOString())
      .lte("start_at", weekEnd.toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("status", "done")
      .gte("completed_at", todayStart.toISOString()),
    supabase
      .from("dumps")
      .select("id, raw_content, ai_analysis, created_at, type, media_url")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .order("created_at", { ascending: true }),
  ]);

  const activeTasks = tasks ?? [];
  const todayEvents = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    is_all_day: e.is_all_day,
    location: e.location,
  }));

  // Check OTTD cache — fast path if situation hasn't changed
  let recommendation: {
    task: (typeof activeTasks)[number];
    reason: string;
  } | null = null;

  const hasCandidates = scoreCandidates(activeTasks, todayEvents).length > 0;

  if (hasCandidates) {
    const contextHash = computeContextHash(activeTasks, todayEvents);
    const cached = await getCachedRecommendation(
      supabase,
      user.id,
      contextHash,
    );
    if (cached) {
      const cachedTask = activeTasks.find((t) => t.id === cached.task_id);
      if (cachedTask) {
        recommendation = { task: cachedTask, reason: cached.reason };
      }
    }
  }

  return (
    <DashboardClient
      events={events ?? []}
      upcomingEvents={upcomingEvents ?? []}
      tasks={activeTasks}
      recommendation={recommendation}
      hasCandidates={hasCandidates}
      todayCompleted={todayCompleted ?? 0}
      dumps={dumps ?? []}
    />
  );
}
