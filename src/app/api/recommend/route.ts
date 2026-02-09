import { createClient } from "@/lib/supabase/server";
import {
  scoreCandidates,
  computeContextHash,
  getCachedRecommendation,
  cacheRecommendation,
  generateAIRecommendation,
  type LocationSignal,
} from "@/lib/ai/recommend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { timezone, locationSignal } = (await request.json().catch(() => ({}))) as {
    timezone?: string;
    locationSignal?: LocationSignal;
  };
  const tz = timezone || "Asia/Seoul";

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch active tasks + today's events + persona + today's completed count in parallel
  const [{ data: tasks }, { data: todayEvents }, { data: profile }, { count: todayCompleted }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, title, start_at, is_all_day, location")
        .eq("user_id", user.id)
        .gte("start_at", todayStart.toISOString())
        .lte("start_at", todayEnd.toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("persona")
        .eq("id", user.id)
        .single(),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("status", "done")
        .gte("completed_at", todayStart.toISOString()),
    ]);

  const activeTasks = tasks ?? [];
  const events = todayEvents ?? [];

  // Wellness check: time-aware caring messages
  const userHour = parseInt(
    now.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }),
    10,
  );
  const completed = todayCompleted ?? 0;

  // Late night (0-5AM): suggest sleep
  if (userHour >= 0 && userHour < 5) {
    return NextResponse.json({
      recommendation: null,
      wellness: "Rest well tonight — it's the best thing for tomorrow's productivity. Good night 🌙",
    });
  }

  // Completed a lot today (5+): suggest rest
  if (completed >= 5) {
    return NextResponse.json({
      recommendation: null,
      wellness: `You've already completed ${completed} tasks today! That's a great day. It's okay to take a break ☕`,
    });
  }

  // Score candidates
  const candidates = scoreCandidates(activeTasks, events, locationSignal);
  if (candidates.length === 0) {
    return NextResponse.json({ recommendation: null });
  }

  // Check cache first
  const contextHash = computeContextHash(activeTasks, events, locationSignal);
  const cached = await getCachedRecommendation(supabase, user.id, contextHash);
  if (cached) {
    const cachedTask = activeTasks.find((t) => t.id === cached.task_id);
    if (cachedTask) {
      return NextResponse.json({
        recommendation: { task: cachedTask, reason: cached.reason },
      });
    }
  }

  // Extract persona facts
  const persona = (profile?.persona as { facts?: { category: string; content: string }[] }) ?? {};
  const personaFacts = persona.facts ?? [];

  // Generate AI recommendation
  const { taskId, reason } = await generateAIRecommendation(
    candidates,
    events,
    tz,
    personaFacts,
    locationSignal,
  );

  // Cache result
  await cacheRecommendation(supabase, user.id, contextHash, taskId, reason);

  const selectedTask =
    activeTasks.find((t) => t.id === taskId) ?? candidates[0].task;

  return NextResponse.json({
    recommendation: { task: selectedTask, reason },
  });
}
