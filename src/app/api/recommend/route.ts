import { createClient } from "@/lib/supabase/server";
import {
  scoreCandidates,
  computeContextHash,
  getCachedRecommendation,
  cacheRecommendation,
  generateAIRecommendation,
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

  const { timezone } = (await request.json().catch(() => ({}))) as {
    timezone?: string;
  };
  const tz = timezone || "Asia/Seoul";

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch active tasks + today's events + persona in parallel
  const [{ data: tasks }, { data: todayEvents }, { data: profile }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
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
    ]);

  const activeTasks = tasks ?? [];
  const events = todayEvents ?? [];

  // Score candidates
  const candidates = scoreCandidates(activeTasks, events);
  if (candidates.length === 0) {
    return NextResponse.json({ recommendation: null });
  }

  // Check cache first
  const contextHash = computeContextHash(activeTasks, events);
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
  );

  // Cache result
  await cacheRecommendation(supabase, user.id, contextHash, taskId, reason);

  const selectedTask =
    activeTasks.find((t) => t.id === taskId) ?? candidates[0].task;

  return NextResponse.json({
    recommendation: { task: selectedTask, reason },
  });
}
