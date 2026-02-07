import { createHash } from "crypto";
import { getModel } from "./gemini";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

// ── Types ─────────────────────────────────────────────────────────────

interface ScoredCandidate {
  task: Task;
  score: number;
}

interface OTTDRecommendation {
  task: Task;
  reason: string;
}

interface OTTDCache {
  task_id: string;
  reason: string;
  context_hash: string;
  created_at: string;
}

interface SimpleEvent {
  id: string;
  title: string;
  start_at: string;
  is_all_day?: boolean | null;
  location?: string | null;
}

// ── Time bucket ───────────────────────────────────────────────────────

type TimeBucket = "morning" | "afternoon" | "evening";

function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

const BUCKET_LABELS: Record<TimeBucket, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// ── Context hash ──────────────────────────────────────────────────────

export function computeContextHash(
  tasks: { id: string; status: string }[],
  todayEvents: { id: string }[],
): string {
  const now = new Date();
  const data = JSON.stringify({
    t: tasks.map((t) => t.id).sort(),
    s: Object.fromEntries(tasks.map((t) => [t.id, t.status])),
    e: todayEvents.map((e) => e.id).sort(),
    d: now.toISOString().slice(0, 10),
    b: getTimeBucket(now.getHours()),
  });
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

// ── Cache read/write ──────────────────────────────────────────────────

export async function getCachedRecommendation(
  supabase: SupabaseClient<Database>,
  userId: string,
  contextHash: string,
): Promise<OTTDCache | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  if (!profile?.preferences) return null;
  const prefs = profile.preferences as Record<string, unknown>;
  const cache = prefs.ottd_cache as OTTDCache | undefined;
  if (!cache || cache.context_hash !== contextHash) return null;
  return cache;
}

export async function cacheRecommendation(
  supabase: SupabaseClient<Database>,
  userId: string,
  contextHash: string,
  taskId: string,
  reason: string,
): Promise<void> {
  // Read current preferences to merge
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
  const newPrefs = {
    ...currentPrefs,
    ottd_cache: {
      task_id: taskId,
      reason,
      context_hash: contextHash,
      created_at: new Date().toISOString(),
    },
  };

  await supabase
    .from("profiles")
    .update({ preferences: newPrefs as unknown as Json })
    .eq("id", userId);
}

// ── Scoring (rule-based candidate selection) ──────────────────────────

export function scoreCandidates(
  tasks: Task[],
  todayEvents: SimpleEvent[],
): ScoredCandidate[] {
  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  );
  if (activeTasks.length === 0) return [];

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Check if there's an upcoming outing event today
  const hasOutingToday = todayEvents.some(
    (e) => !e.is_all_day && e.location,
  );

  const scored: ScoredCandidate[] = activeTasks.map((task) => {
    let score = 0;

    // In-progress bonus: continuing is natural
    if (task.status === "in_progress") score += 20;

    // Due date urgency
    if (task.due_date === today) {
      score += 50;
    } else if (task.due_date && task.due_date < today) {
      score += 60;
    } else if (task.due_date) {
      const daysUntil = Math.ceil(
        (new Date(task.due_date).getTime() - now.getTime()) / 86400000,
      );
      if (daysUntil <= 3) score += 30;
    }

    // Importance
    score += (task.importance ?? 3) * 5;

    // Context type scoring
    switch (task.context_type) {
      case "communication":
        score += 15;
        break;
      case "quick":
        score += 10;
        break;
      case "desk_work":
        score += 5;
        break;
      case "errand":
      case "location_dependent":
        score += 5;
        // Bonus if there's an outing today
        if (hasOutingToday) score += 10;
        break;
    }

    // Aging bonus: older tasks shouldn't be buried
    const ageHours =
      (now.getTime() - new Date(task.created_at).getTime()) / 3600000;
    if (ageHours > 24) {
      score += Math.min(ageHours / 24, 10);
    }

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

// ── Gemini AI recommendation ──────────────────────────────────────────

export async function generateAIRecommendation(
  candidates: ScoredCandidate[],
  todayEvents: SimpleEvent[],
  timezone: string,
): Promise<{ taskId: string; reason: string }> {
  const now = new Date();
  const bucket = getTimeBucket(now.getHours());
  const weekday = WEEKDAYS[now.getDay()];

  const eventLines =
    todayEvents.length > 0
      ? todayEvents
          .map((e) => {
            if (e.is_all_day) return `- "${e.title}" (종일)`;
            const t = new Date(e.start_at).toLocaleTimeString("ko-KR", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            return `- ${t} "${e.title}"${e.location ? ` @ ${e.location}` : ""}`;
          })
          .join("\n")
      : "- 없음";

  const candidateLines = candidates
    .map((c, i) => {
      const t = c.task;
      const parts = [`"${t.title}"`];
      if (t.status === "in_progress") parts.push("진행 중");
      if (t.importance && t.importance >= 4) parts.push(`중요도 ${t.importance}`);
      if (t.context_type && t.context_type !== "other")
        parts.push(t.context_type);
      if (t.due_date) parts.push(`마감: ${t.due_date}`);
      // Include recent note summary
      const notes = Array.isArray(t.notes)
        ? (t.notes as { text: string }[])
        : [];
      if (notes.length > 0) {
        const lastNote = notes[notes.length - 1];
        parts.push(`최근 메모: "${lastNote.text}"`);
      }
      return `${i + 1}. [${t.id}] ${parts.join(", ")}`;
    })
    .join("\n");

  const prompt = `당신은 "Calm productivity" 철학의 OTTD 추천 어시스턴트입니다.
할 일이 많더라도 "지금 이것 하나만" — 따뜻하고 자연스럽게 제안합니다.
압박하지 않고, 좋은 친구가 부드럽게 방향을 잡아주듯 안내합니다.

## 현재 상황
- 시간: ${now.toLocaleString("ko-KR", { timeZone: timezone })} (${weekday} ${BUCKET_LABELS[bucket]})
- 타임존: ${timezone}

## 오늘의 일정
${eventLines}

## 추천 후보 (점수순)
${candidateLines}

## 규칙
- 후보 중 지금 하기에 가장 자연스러운 하나를 골라주세요
- "해야 해요" 대신 "하면 좋겠어요", "어떨까요" 등 제안형
- 오늘의 일정과 시간대를 자연스럽게 반영
- 이유는 1-2문장, 따뜻하고 평온한 톤
- 진행 중인 작업이 있다면 이어하는 것이 자연스러울 수 있어요
- 외출 일정이 있다면 그 전에 외출 관련 할 일을 먼저 추천할 수도 있어요

반드시 아래 JSON 형식으로만 응답하세요:
{"task_id": "선택한 후보의 UUID", "reason": "추천 이유"}`;

  try {
    const { model } = getModel();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      typeof result.response.text === "function"
        ? result.response.text()
        : result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*?"task_id"[\s\S]*?"reason"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Verify the task_id is in our candidates
      const valid = candidates.some((c) => c.task.id === parsed.task_id);
      if (valid) {
        return { taskId: parsed.task_id, reason: parsed.reason };
      }
    }
  } catch {
    // Fallback to top candidate with rule-based reason
  }

  // Fallback: return top candidate with generic reason
  const top = candidates[0];
  return {
    taskId: top.task.id,
    reason: fallbackReason(top.task),
  };
}

function fallbackReason(task: Task): string {
  const today = new Date().toISOString().slice(0, 10);
  if (task.due_date === today) return "오늘 마감이에요. 가볍게 시작해볼까요?";
  if (task.due_date && task.due_date < today)
    return "마감이 조금 지났지만, 지금 해도 충분해요.";
  if (task.status === "in_progress")
    return "하던 일을 이어서 하면 좋겠어요.";
  if (task.context_type === "communication")
    return "먼저 보내두면 답을 기다리는 동안 다른 일을 할 수 있어요.";
  if (task.context_type === "quick")
    return "금방 끝나는 일이에요. 가볍게 해치워볼까요?";
  if (task.importance && task.importance >= 4)
    return "중요한 일이니 지금 집중해보면 좋겠어요.";
  return "다음으로 하기 좋은 일이에요.";
}

// ── Main entry point ──────────────────────────────────────────────────

export async function getRecommendation(
  supabase: SupabaseClient<Database>,
  userId: string,
  tasks: Task[],
  todayEvents: SimpleEvent[],
  timezone: string,
): Promise<OTTDRecommendation | null> {
  const candidates = scoreCandidates(tasks, todayEvents);
  if (candidates.length === 0) return null;

  const contextHash = computeContextHash(tasks, todayEvents);

  // Check cache
  const cached = await getCachedRecommendation(supabase, userId, contextHash);
  if (cached) {
    const cachedTask = tasks.find((t) => t.id === cached.task_id);
    if (cachedTask) {
      return { task: cachedTask, reason: cached.reason };
    }
    // Cached task no longer in active list — regenerate
  }

  // Generate new recommendation via Gemini
  const { taskId, reason } = await generateAIRecommendation(
    candidates,
    todayEvents,
    timezone,
  );

  // Cache the result
  await cacheRecommendation(supabase, userId, contextHash, taskId, reason);

  const selectedTask = tasks.find((t) => t.id === taskId) ?? candidates[0].task;
  return { task: selectedTask, reason };
}

// Keep legacy function for backward compatibility
export function recommendOneTask(tasks: Task[]) {
  const candidates = scoreCandidates(tasks, []);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  return {
    task: top.task,
    score: top.score,
    reason: fallbackReason(top.task),
  };
}
