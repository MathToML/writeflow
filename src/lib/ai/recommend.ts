import { createHash } from "crypto";
import { getModel } from "./gemini";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

// ── Types ─────────────────────────────────────────────────────────────

export interface LocationSignal {
  isMoving: boolean;
  movementType: "stationary" | "walking" | "driving" | "unknown";
}

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
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Context hash ──────────────────────────────────────────────────────

export function computeContextHash(
  tasks: { id: string; status: string }[],
  todayEvents: { id: string }[],
  locationSignal?: LocationSignal,
): string {
  const now = new Date();
  const data = JSON.stringify({
    t: tasks.map((t) => t.id).sort(),
    s: Object.fromEntries(tasks.map((t) => [t.id, t.status])),
    e: todayEvents.map((e) => e.id).sort(),
    d: now.toISOString().slice(0, 10),
    b: getTimeBucket(now.getHours()),
    m: locationSignal?.isMoving ?? null,
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

// ── Scoring weights ──────────────────────────────────────────────────
// These weights determine how tasks are ranked for OTTD recommendation.
// Higher total score = more likely to be recommended right now.

const SCORE_IN_PROGRESS = 20;        // Continuing a started task feels natural
const SCORE_DUE_TODAY = 50;           // Due today — should be prioritized
const SCORE_OVERDUE = 60;             // Past due — highest urgency
const SCORE_DUE_SOON = 30;           // Due within 3 days
const SCORE_IMPORTANCE_MULTIPLIER = 5; // importance (1-5) * this value
const SCORE_DEFAULT_IMPORTANCE = 3;   // Assumed importance when not set
const SCORE_CONTEXT_COMM = 15;        // Phone/communication: quick to send off
const SCORE_CONTEXT_QUICK = 10;       // Quick tasks: easy wins
const SCORE_CONTEXT_DESK = 5;         // Desk/focus work: default indoor bonus
const SCORE_CONTEXT_ERRAND = 5;       // Errands: base bonus
const SCORE_MOVING_PENALTY = -10;     // Desk work while moving = bad fit
const SCORE_MOVING_BONUS = 20;        // Errands while moving = great fit
const SCORE_OUTING_BONUS = 10;        // Errand + outing event today
const SCORE_WAITING_PENALTY = -5;     // Waiting tasks are deprioritized
const SCORE_MAX_AGE_BONUS = 10;       // Cap for aging bonus (prevents old tasks dominating)
const TOP_CANDIDATES = 5;             // Number of candidates passed to Gemini

// ── Scoring (rule-based candidate selection) ──────────────────────────

export function scoreCandidates(
  tasks: Task[],
  todayEvents: SimpleEvent[],
  locationSignal?: LocationSignal,
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
    if (task.status === "in_progress") score += SCORE_IN_PROGRESS;

    // Due date urgency
    if (task.due_date === today) {
      score += SCORE_DUE_TODAY;
    } else if (task.due_date && task.due_date < today) {
      score += SCORE_OVERDUE;
    } else if (task.due_date) {
      const daysUntil = Math.ceil(
        (new Date(task.due_date).getTime() - now.getTime()) / 86400000,
      );
      if (daysUntil <= 3) score += SCORE_DUE_SOON;
    }

    // Importance
    score += (task.importance ?? SCORE_DEFAULT_IMPORTANCE) * SCORE_IMPORTANCE_MULTIPLIER;

    // Context type scoring
    switch (task.context_type) {
      case "phone":
      case "communication":
        score += SCORE_CONTEXT_COMM;
        break;
      case "quick":
        score += SCORE_CONTEXT_QUICK;
        break;
      case "computer":
      case "desk_work":
      case "focus":
        score += SCORE_CONTEXT_DESK;
        if (locationSignal?.isMoving) score += SCORE_MOVING_PENALTY;
        break;
      case "errand":
      case "location_dependent":
        score += SCORE_CONTEXT_ERRAND;
        if (hasOutingToday) score += SCORE_OUTING_BONUS;
        if (locationSignal?.isMoving) score += SCORE_MOVING_BONUS;
        break;
      case "waiting":
        score += SCORE_WAITING_PENALTY;
        break;
    }

    // Aging bonus: older tasks shouldn't be buried
    const ageHours =
      (now.getTime() - new Date(task.created_at).getTime()) / 3600000;
    if (ageHours > 24) {
      score += Math.min(ageHours / 24, SCORE_MAX_AGE_BONUS);
    }

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_CANDIDATES);
}

// ── Gemini AI recommendation ──────────────────────────────────────────

interface PersonaFact {
  category: string;
  content: string;
}

export async function generateAIRecommendation(
  candidates: ScoredCandidate[],
  todayEvents: SimpleEvent[],
  timezone: string,
  personaFacts?: PersonaFact[],
  locationSignal?: LocationSignal,
): Promise<{ taskId: string; reason: string }> {
  const now = new Date();
  const bucket = getTimeBucket(now.getHours());
  const weekday = WEEKDAYS[now.getDay()];

  const eventLines =
    todayEvents.length > 0
      ? todayEvents
          .map((e) => {
            if (e.is_all_day) return `- "${e.title}" (all day)`;
            const t = new Date(e.start_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: timezone,
            });
            return `- ${t} "${e.title}"${e.location ? ` @ ${e.location}` : ""}`;
          })
          .join("\n")
      : "- None";

  const candidateLines = candidates
    .map((c, i) => {
      const t = c.task;
      const parts = [`"${t.title}"`];
      if (t.status === "in_progress") parts.push("in progress");
      if (t.importance && t.importance >= 4) parts.push(`importance ${t.importance}`);
      if (t.context_type && t.context_type !== "other")
        parts.push(t.context_type);
      if (t.due_date) parts.push(`due: ${t.due_date}`);
      // Include recent note summary
      const notes = Array.isArray(t.notes)
        ? (t.notes as { text: string }[])
        : [];
      if (notes.length > 0) {
        const lastNote = notes[notes.length - 1];
        parts.push(`recent note: "${lastNote.text}"`);
      }
      return `${i + 1}. [${t.id}] ${parts.join(", ")}`;
    })
    .join("\n");

  const prompt = `You are the OTTD recommendation assistant with a "Calm productivity" philosophy.
Even when there are many tasks, suggest "just this one thing right now" — warmly and naturally.
Don't pressure — guide gently like a good friend pointing the way.

## Current Context
- Time: ${now.toLocaleString("en-US", { timeZone: timezone })} (${weekday} ${BUCKET_LABELS[bucket]})
- Timezone: ${timezone}

## Today's Schedule
${eventLines}

## What we know about the user
${personaFacts && personaFacts.length > 0
    ? personaFacts.map((f) => `- [${f.category}] ${f.content}`).join("\n")
    : "- (No information yet)"}

## User's Current Location Context
${locationSignal
    ? `- Movement: ${locationSignal.movementType}
- The user appears to be: ${locationSignal.isMoving ? "outside and moving" : "at a fixed location"}`
    : "- Location data not available"}

## Candidates (by score)
${candidateLines}

## Rules
- Pick the one that feels most natural to do right now
- Use suggestive tone: "How about..." or "This might be a good time to..." instead of "You should..."
- Naturally reflect today's schedule and current time
- Reason should be 1-2 sentences, warm and calm tone
- If there's a task in progress, continuing it may feel most natural
- If there's an outing scheduled, consider recommending related prep tasks first
- If the user is currently moving/outside, prefer errand or location-dependent tasks. Frame it naturally: "Since you're out, how about..."
- During lunch time (11:30-13:00), weave in a warm touch like "Hope you had a good lunch!" in the reason
- Late evening (after 10pm), use a gentle tone and only recommend light tasks

You MUST respond in the following JSON format only:
{"task_id": "UUID of the chosen candidate", "reason": "recommendation reason"}`;

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
  if (task.due_date === today) return "This is due today. How about getting started?";
  if (task.due_date && task.due_date < today)
    return "This is a bit overdue, but it's not too late to tackle it now.";
  if (task.status === "in_progress")
    return "You've already started this one — might be nice to keep the momentum going.";
  if (task.context_type === "phone" || task.context_type === "communication")
    return "Send this off first, then you can work on other things while waiting for a reply.";
  if (task.context_type === "quick")
    return "This is a quick one. How about knocking it out?";
  if (task.context_type === "focus")
    return "This needs some focus. Now might be a good quiet moment for it.";
  if (task.importance && task.importance >= 4)
    return "This is important — a good time to give it your attention.";
  return "This would be a good next thing to work on.";
}

// ── Main entry point ──────────────────────────────────────────────────

export async function getRecommendation(
  supabase: SupabaseClient<Database>,
  userId: string,
  tasks: Task[],
  todayEvents: SimpleEvent[],
  timezone: string,
  locationSignal?: LocationSignal,
): Promise<OTTDRecommendation | null> {
  const candidates = scoreCandidates(tasks, todayEvents, locationSignal);
  if (candidates.length === 0) return null;

  const contextHash = computeContextHash(tasks, todayEvents, locationSignal);

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
    undefined,
    locationSignal,
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
