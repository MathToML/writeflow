import { getModel } from "./gemini";
import { TOOL_DECLARATIONS, executeTool } from "./tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Content, Part } from "@google/generative-ai";

const MAX_TOOL_ITERATIONS = 5;

export interface AgentContext {
  userId: string;
  dumpId: string;
  supabase: SupabaseClient<Database>;
  timezone: string;
  currentDateTime: string;
  mediaUrl?: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

interface AgentResult {
  message: string;
  toolCalls: { name: string; args: object }[];
  needsUserInput: boolean;
}

// ── System prompt ──────────────────────────────────────────────────────

type TaskRow = { id: string; title: string; description: string | null; status: string; due_date: string | null; importance: number | null; notes: unknown; completed_at?: string | null };
type EventRow = { id: string; title: string; start_at: string; location: string | null; description: string | null; is_all_day: boolean | null; recurrence_rule: string | null };
type RecordRow = { id: string; title: string; category: string | null };
type ExpenseRow = { id: string; title: string; content: unknown; occurred_at: string | null };
type HabitRow = { id: string; name: string; description: string | null; icon: string | null };
type HabitLogRow = { id: string; habit_id: string; logged_date: string; note: string | null; value: number | null };

interface PersonaFact {
  category: string;
  key: string;
  content: string;
}

function buildSystemPrompt(
  context: AgentContext,
  activeTasks: TaskRow[],
  completedTasks: TaskRow[],
  upcomingEvents: EventRow[],
  pastEvents: EventRow[],
  recentRecords: RecordRow[],
  recentExpenses: ExpenseRow[],
  userName: string,
  personaFacts: PersonaFact[],
  habits: HabitRow[],
  todayHabitLogs: HabitLogRow[],
  recentHabitLogs: HabitLogRow[],
): string {
  const taskLines =
    activeTasks.length > 0
      ? activeTasks
          .map((t) => {
            let line = `- [${t.id}] "${t.title}" (${t.status}${t.due_date ? `, due: ${t.due_date}` : ""}${t.importance ? `, importance: ${t.importance}` : ""})`;
            if (t.description) line += `\n  - desc: ${t.description}`;
            const notes = Array.isArray(t.notes) ? t.notes as { text: string; created_at: string }[] : [];
            if (notes.length > 0) {
              const older = notes.length > 3 ? notes.length - 3 : 0;
              if (older > 0) line += `\n  - ... ${older} older notes`;
              const recent = notes.slice(-3);
              line += "\n" + recent.map((n) => `  - note(${n.created_at.slice(0, 16).replace("T", " ")}): ${n.text}`).join("\n");
            }
            return line;
          })
          .join("\n")
      : "(none)";

  const completedTaskLines =
    completedTasks.length > 0
      ? completedTasks
          .map((t) => {
            let line = `- [${t.id}] "${t.title}" (done${t.completed_at ? `: ${t.completed_at.slice(0, 10)}` : ""})`;
            if (t.description) line += `\n  - desc: ${t.description}`;
            return line;
          })
          .join("\n")
      : "(none)";

  const eventLines =
    upcomingEvents.length > 0
      ? upcomingEvents
          .map((e) => {
            const time = e.is_all_day ? "all day" : e.start_at;
            let line = `- [${e.id}] "${e.title}" @ ${time}`;
            if (e.location) line += ` (${e.location})`;
            if (e.recurrence_rule) line += ` [repeat: ${e.recurrence_rule}]`;
            if (e.description) line += `\n  - desc: ${e.description}`;
            return line;
          })
          .join("\n")
      : "(none)";

  const pastEventLines =
    pastEvents.length > 0
      ? pastEvents
          .map((e) => {
            const time = e.is_all_day ? "all day" : e.start_at;
            let line = `- [${e.id}] "${e.title}" @ ${time}`;
            if (e.location) line += ` (${e.location})`;
            return line;
          })
          .join("\n")
      : "(none)";

  const recordLines =
    recentRecords.length > 0
      ? recentRecords
          .map((r) => `- [${r.id}] "${r.title}" (${r.category ?? "general"})`)
          .join("\n")
      : "(none)";

  return `You are the OTTD (One Thing To Do) AI assistant for ${userName}.
Your mission is to help ${userName} stay calm and focused amid a busy life. You organize their tasks, events, and records — but more importantly, you protect their mental wellness by cutting through overwhelm and gently guiding them to focus on just one thing at a time. You help prevent burnout, ease the pressure of too many responsibilities, and make productivity feel lighter.

## Personality
- Warm, calm, and supportive — like a thoughtful friend, not a demanding boss
- Respond in the same language the user writes in
- **Always respond in 1-2 sentences** — never write more than 3 sentences
- Do NOT include detailed tool result data in responses (OCR text, JSON, etc.)
- Never pile on more stress — reassure and simplify

## Current Time
${(() => {
  const dateStr = context.currentDateTime.split(" ")[0];
  const d = new Date(dateStr + "T12:00:00");
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = WEEKDAYS_FULL[d.getDay()];
  // Show next 10 days as date reference
  const dates = Array.from({ length: 10 }, (_, i) => {
    const wd = new Date(d);
    wd.setDate(d.getDate() + i + 1);
    return `${WEEKDAYS[wd.getDay()]}(${wd.toISOString().slice(5, 10).replace("-", "/")})`;
  }).join(" ");
  return `Today: ${context.currentDateTime} ${dayOfWeek} (${context.timezone})
Next 10 days: ${dates}`;
})()}

## ${userName}'s Current State

### Active Tasks
${taskLines}

### Recently Completed Tasks
${completedTaskLines}

### Upcoming Events
${eventLines}

### Recent Past Events
${pastEventLines}

### Recent Records
${recordLines}

### Recent Expenses (last 5)
${recentExpenses.length > 0
    ? recentExpenses.map((e) => {
        const c = e.content as { amount?: number; currency?: string; expense_category?: string; vendor?: string } | null;
        const amt = c?.amount ? `${c.currency ?? "USD"} ${c.amount.toLocaleString()}` : "";
        const cat = c?.expense_category ?? "";
        const vendor = c?.vendor ? ` @ ${c.vendor}` : "";
        return `- "${e.title}" ${amt} (${cat}${vendor}) ${e.occurred_at?.slice(0, 10) ?? ""}`;
      }).join("\n")
    : "(none)"}

### Habits & Tracking
${(() => {
  if (habits.length === 0) return "(No habits yet — suggest creating one when you notice repeated activities)";
  return habits.map((h) => {
    const todayLog = todayHabitLogs.find((l) => l.habit_id === h.id);
    const weekLogs = recentHabitLogs.filter((l) => l.habit_id === h.id);
    const uniqueDays = new Set(weekLogs.map((l) => l.logged_date)).size;
    const todayStatus = todayLog ? `✓${todayLog.note ? ` (${todayLog.note})` : ""}` : "✗";
    return `- [${h.id}] ${h.icon ?? "✅"} ${h.name} — today: ${todayStatus} | this week: ${uniqueDays}/7 days`;
  }).join("\n");
})()}

### What we know about ${userName}
${personaFacts.length > 0
    ? personaFacts
        .map((f) => `- [${f.category}] ${f.content}`)
        .join("\n")
    : "(Nothing yet — learning through conversation)"}

## Behavior Rules
1. Analyze user input and call appropriate tools
2. **Decision process** — handle step by step:
   - **Clear intent** → Call tools immediately
   - **Ambiguous** → You may ask. When user confirms or \`[AUTO_PROCEED]\` arrives, execute with the most likely interpretation and say "Let me know if that's not right"
   - **Completely unclear** → You may ask. When user confirms or \`[AUTO_PROCEED]\` arrives, save via create_record and say "Saved it for now"
   - (\`[AUTO_PROCEED]\` = system signal sent when user hasn't responded for a few minutes. Process quietly without faking user messages)
3. If there are multiple items, call multiple tools
4. When deciding whether to update existing items or create new ones, look at the task/event lists above (titles, descriptions, notes) comprehensively. Match by context even if titles don't match exactly
5. After tool calls, naturally inform what was done
6. For simple conversation (greetings, questions), respond without tools
7. Date/time rules:
   - "this [weekday]" = use the closest matching date from the "Next 10 days" reference above
   - **Always** check the date reference table above for accurate dates. Never calculate mentally
   - For all-day events, set start_at to "YYYY-MM-DD" format (no time)
8. For timed events, always include timezone offset in start_at/end_at
9. When marking a task as done, give encouragement
10. When user reports task progress, use add_task_note
11. Expressions like "done", "finished", "completed" mean update_task(status: done)
12. If reporting progress AND completion simultaneously, pass status: done with add_task_note
13. All-day events (holidays, anniversaries, etc.) should use is_all_day: true
14. Recurring events should use RRULE format in recurrence_rule (e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR)
15. **Important** When user mentions tasks/events by keyword:
    a. Search the task/event lists above by title, description, and notes to find the most relevant match
    b. If not in current context, use search_history tool
    c. If there's a likely match, go ahead and execute. It's okay if not 100% certain
    d. You can add notes to completed tasks too — don't ignore done tasks
16. When user mentions personal info, save it with update_persona (family names, work, habits, hobbies, health, etc.)
17. If known info changes, call update_persona with the same category/key to update
18. Don't make it obvious when saving persona — just continue the conversation naturally. Don't say "I'll remember that"
19. When user sends an image, analyze and process accordingly:
    - Related to existing task → add_task_note(attach_image: true)
    - New task → create_task then add_task_note(attach_image: true)
    - Event related → create_event or update_event
    - Image only with no instruction → create_record(attach_image: true)
20. Using attach_image: true automatically attaches the current image
21. **Image response rule**: Store detailed content (OCR, dates, prices) only in note/record text. In user response, just say something like "Added the info to your task note." Never list extracted text in the response
22. When user says "delete" or "remove", don't delete directly — guide them to use the delete button on screen
23. If a tool call returns success: false, inform the user about the failure. Never claim success when it didn't succeed
24. **Expense recording rules:**
    - When user mentions spending, purchase, receipt, or price → create_expense
    - Receipt image → analyze and create_expense(attach_image: true) — extract amount, vendor, items, date from the image
    - Text like "점심 김밥 8000원" → create_expense(title: "김밥", amount: 8000, expense_category: "food")
    - Always extract the numeric amount. If currency is ambiguous, default to USD
    - If user mentions a past date ("어제 커피"), set occurred_at accordingly
25. **Habit tracking rules:**
    - When user reports a repeated activity (exercise, reading, meditation, etc.), check if a matching habit exists in the Habits list above
    - If matching habit exists → call log_habit immediately
    - If no matching habit AND this seems like a recurring activity → suggest: "좋은 시작이네요! 이걸 습관 대시보드로 만들어드릴까요? 기록이 쌓이면 히트맵으로 보여드릴게요"
    - When user agrees → create_habit + log_habit in same turn
    - Include streak info in response if available: "3일 연속이에요! 💪"
    - Do NOT create duplicate habits. Match by similar name/activity
26. **Proactive habit suggestions:**
    - If you notice a repeated activity in recent records/tasks/conversation (e.g. running 3+ times, daily coffee, regular meditation), proactively suggest: "최근 기록을 보니 [활동]을 꾸준히 하고 계시네요. 습관 대시보드를 만들어드릴까요?"
    - Never be pushy — just a gentle one-time suggestion. If user declines, don't suggest again
27. When you ask a question that REQUIRES user input before you can proceed (e.g. clarification, confirmation, choice between options), prefix your response with [NEEDS_INPUT]. Do NOT use this for rhetorical questions or when you've already completed the action.
28. **Reminders & delayed messages — MUST use schedule_message tool:**
    - When user asks to be reminded, notified, or messaged after some time → **ALWAYS call schedule_message tool**
    - "remind me in 5 minutes" → schedule_message(message: "Here's your reminder!", delay_seconds: 300)
    - "message me at 3pm" → schedule_message(message: "...", deliver_at: "2026-02-09T15:00:00-05:00")
    - "message me in 5s" → schedule_message(message: "Hey! Here's your message!", delay_seconds: 5)
    - Write the message in a warm, helpful tone as if you're reaching out later
    - You HAVE the schedule_message tool — you MUST call it. Never just say "I've scheduled" without actually calling the tool
    - **CRITICAL**: Do NOT respond with text claiming you scheduled a message. You MUST actually invoke the schedule_message function call. A text-only response about scheduling is WRONG`;
}

// ── Retry helper for transient API errors ──────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

async function sendWithRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chat: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await chat.sendMessage(message);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const isRetryable = status === 503 || status === 429;
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Agent] Retryable error (${status}), attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ── SDK adapter helpers ────────────────────────────────────────────────

interface FunctionCallInfo {
  name: string;
  args: Record<string, unknown>;
}

function extractFunctionCalls(
  sdkType: "vertex" | "genai",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): FunctionCallInfo[] | null {
  if (sdkType === "genai") {
    const calls = result.response.functionCalls?.();
    if (!calls || calls.length === 0) return null;
    return calls.map((c: { name: string; args: Record<string, unknown> }) => ({
      name: c.name,
      args: c.args,
    }));
  } else {
    // Vertex AI: parse from candidates
    const parts =
      result.response?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts
      .filter((p: { functionCall?: unknown }) => p.functionCall)
      .map((p: { functionCall: FunctionCallInfo }) => ({
        name: p.functionCall.name,
        args: p.functionCall.args,
      }));
    return calls.length > 0 ? calls : null;
  }
}

function extractText(
  sdkType: "vertex" | "genai",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): string {
  const fallback = "Done!";
  if (sdkType === "genai") {
    try {
      return result.response.text() || fallback;
    } catch {
      return fallback;
    }
  } else {
    const parts =
      result.response?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("");
    return text || fallback;
  }
}

// ── Main agent runner ──────────────────────────────────────────────────

export async function runAgent(
  message: string,
  history: Content[],
  context: AgentContext,
  imageData?: ImageData,
): Promise<AgentResult> {
  const { type, model } = getModel();

  // 1. Load user context in parallel
  const todayDate = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: activeTasks },
    { data: completedTasks },
    { data: upcomingEvents },
    { data: pastEvents },
    { data: recentRecords },
    { data: recentExpenses },
    { data: profile },
    { data: habits },
    { data: todayHabitLogs },
    { data: recentHabitLogs },
  ] = await Promise.all([
    context.supabase
      .from("tasks")
      .select("id, title, description, status, due_date, importance, notes")
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true })
      .limit(20),
    context.supabase
      .from("tasks")
      .select("id, title, description, status, due_date, importance, notes, completed_at")
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(15),
    context.supabase
      .from("events")
      .select("id, title, start_at, location, description, is_all_day, recurrence_rule")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(10),
    context.supabase
      .from("events")
      .select("id, title, start_at, location, description, is_all_day, recurrence_rule")
      .eq("user_id", context.userId)
      .lt("start_at", new Date().toISOString())
      .order("start_at", { ascending: false })
      .limit(5),
    context.supabase
      .from("records")
      .select("id, title, category")
      .eq("user_id", context.userId)
      .neq("category", "expense")
      .order("updated_at", { ascending: false })
      .limit(10),
    context.supabase
      .from("records")
      .select("id, title, content, occurred_at")
      .eq("user_id", context.userId)
      .eq("category", "expense")
      .order("occurred_at", { ascending: false })
      .limit(5),
    context.supabase
      .from("profiles")
      .select("name, persona")
      .eq("id", context.userId)
      .single(),
    context.supabase
      .from("habits")
      .select("id, name, description, icon")
      .eq("user_id", context.userId)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(20),
    context.supabase
      .from("habit_logs")
      .select("id, habit_id, logged_date, note, value")
      .eq("user_id", context.userId)
      .eq("logged_date", todayDate)
      .limit(20),
    context.supabase
      .from("habit_logs")
      .select("habit_id, logged_date, value")
      .eq("user_id", context.userId)
      .gte("logged_date", sevenDaysAgo)
      .order("logged_date", { ascending: false })
      .limit(50),
  ]);

  const userName =
    profile?.name || "User";

  // Extract persona facts
  const persona = (profile?.persona as { facts?: PersonaFact[] }) ?? {};
  const personaFacts: PersonaFact[] = persona.facts ?? [];

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(
    context,
    activeTasks ?? [],
    completedTasks ?? [],
    upcomingEvents ?? [],
    pastEvents ?? [],
    recentRecords ?? [],
    recentExpenses ?? [],
    userName,
    personaFacts,
    (habits ?? []) as HabitRow[],
    (todayHabitLogs ?? []) as HabitLogRow[],
    (recentHabitLogs ?? []) as HabitLogRow[],
  );

  // 3. Start chat session (both SDKs support the same startChat pattern)
  const tools = [{ functionDeclarations: TOOL_DECLARATIONS }];

  // Both SDKs share the same startChat/sendMessage interface at runtime,
  // but their TS types diverge. Use the GenAI SDK types as canonical.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatOptions: any = {
    history,
    tools,
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
  };
  const chat = model.startChat(chatOptions);

  // 4. Tool call loop
  const toolCalls: { name: string; args: object }[] = [];
  let currentMessage: string | Part[];

  if (imageData) {
    // Build multimodal message with image + text
    const parts: Part[] = [
      { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } },
      { text: message || "Please analyze this image. If there are any tasks, events, or things to record, please process them." },
    ];
    currentMessage = parts;
  } else {
    currentMessage = message;
  }

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const result = await sendWithRetry(chat, currentMessage);

    const functionCalls = extractFunctionCalls(type, result);

    if (!functionCalls || functionCalls.length === 0) {
      // No more tool calls — return text
      let text = extractText(type, result);
      let needsUserInput = false;
      if (text.startsWith("[NEEDS_INPUT]")) {
        needsUserInput = true;
        text = text.replace("[NEEDS_INPUT]", "").trimStart();
      }

      // Safety: detect hallucinated schedule_message (model claims to schedule without tool call)
      const hasScheduleToolCall = toolCalls.some((tc) => tc.name === "schedule_message");
      const claimsScheduled = /schedul|remind|timer|set.*(?:alarm|message)/i.test(text);
      if (i === 0 && !hasScheduleToolCall && claimsScheduled) {
        console.warn("[Agent] Detected hallucinated schedule response — retrying with forced function calling");
        // Create a new chat session with forced function calling mode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const forcedOptions: any = {
          history,
          tools,
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["schedule_message"],
            },
          },
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        };
        try {
          const forcedChat = model.startChat(forcedOptions);
          const forcedResult = await sendWithRetry(forcedChat, message);
          const forcedCalls = extractFunctionCalls(type, forcedResult);
          if (forcedCalls && forcedCalls.length > 0) {
            for (const fc of forcedCalls) {
              console.log(`[Agent] Forced tool call: ${fc.name}`, JSON.stringify(fc.args));
              toolCalls.push({ name: fc.name, args: fc.args });
              await executeTool(fc.name, fc.args, context.supabase, context.userId, context.dumpId, context.mediaUrl);
            }
            const forcedText = extractText(type, forcedResult);
            return { message: forcedText || text, toolCalls, needsUserInput: false };
          }
        } catch (err) {
          console.error("[Agent] Forced function calling failed:", err);
        }
      }

      console.log("[Agent] Final text response (no tool calls). Iteration:", i, "needsUserInput:", needsUserInput);
      return { message: text, toolCalls, needsUserInput };
    }

    // Execute all function calls
    console.log("[Agent] Tool calls detected:", functionCalls.map((fc) => fc.name));
    const functionResponses: Part[] = [];
    for (const fc of functionCalls) {
      console.log(`[Agent] Executing tool: ${fc.name}`, JSON.stringify(fc.args));
      toolCalls.push({ name: fc.name, args: fc.args });
      const toolResult = await executeTool(
        fc.name,
        fc.args,
        context.supabase,
        context.userId,
        context.dumpId,
        context.mediaUrl,
      );
      console.log(`[Agent] Tool result for ${fc.name}:`, JSON.stringify(toolResult));
      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: toolResult as unknown as Record<string, unknown>,
        },
      });
    }

    // Send function results back
    currentMessage = functionResponses;
  }

  // Safety: max iterations
  return {
    message:
      "That was a complex request — I've partially completed it. Let me know and I'll continue where I left off.",
    toolCalls,
    needsUserInput: false,
  };
}
