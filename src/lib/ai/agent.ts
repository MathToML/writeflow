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
}

interface AgentResult {
  message: string;
  toolCalls: { name: string; args: object }[];
}

// ── System prompt ──────────────────────────────────────────────────────

type TaskRow = { id: string; title: string; status: string; due_date: string | null; importance: number | null; notes: unknown; completed_at?: string | null };
type EventRow = { id: string; title: string; start_at: string; location: string | null; description: string | null; is_all_day: boolean | null; recurrence_rule: string | null };
type RecordRow = { id: string; title: string; category: string | null };

function buildSystemPrompt(
  context: AgentContext,
  activeTasks: TaskRow[],
  completedTasks: TaskRow[],
  upcomingEvents: EventRow[],
  pastEvents: EventRow[],
  recentRecords: RecordRow[],
  userName: string,
): string {
  const taskLines =
    activeTasks.length > 0
      ? activeTasks
          .map((t) => {
            let line = `- [${t.id}] "${t.title}" (${t.status}${t.due_date ? `, 마감: ${t.due_date}` : ""}${t.importance ? `, 중요도: ${t.importance}` : ""})`;
            const notes = Array.isArray(t.notes) ? t.notes as { text: string; created_at: string }[] : [];
            if (notes.length > 0) {
              const older = notes.length > 3 ? notes.length - 3 : 0;
              if (older > 0) line += `\n  - ... 이전 메모 ${older}개`;
              const recent = notes.slice(-3);
              line += "\n" + recent.map((n) => `  - 메모(${n.created_at.slice(0, 16).replace("T", " ")}): ${n.text}`).join("\n");
            }
            return line;
          })
          .join("\n")
      : "(없음)";

  const completedTaskLines =
    completedTasks.length > 0
      ? completedTasks
          .map((t) => `- [${t.id}] "${t.title}" (완료${t.completed_at ? `: ${t.completed_at.slice(0, 10)}` : ""})`)
          .join("\n")
      : "(없음)";

  const eventLines =
    upcomingEvents.length > 0
      ? upcomingEvents
          .map((e) => {
            const time = e.is_all_day ? "종일" : e.start_at;
            let line = `- [${e.id}] "${e.title}" @ ${time}`;
            if (e.location) line += ` (${e.location})`;
            if (e.recurrence_rule) line += ` [반복: ${e.recurrence_rule}]`;
            if (e.description) line += `\n  - 설명: ${e.description}`;
            return line;
          })
          .join("\n")
      : "(없음)";

  const pastEventLines =
    pastEvents.length > 0
      ? pastEvents
          .map((e) => {
            const time = e.is_all_day ? "종일" : e.start_at;
            let line = `- [${e.id}] "${e.title}" @ ${time}`;
            if (e.location) line += ` (${e.location})`;
            return line;
          })
          .join("\n")
      : "(없음)";

  const recordLines =
    recentRecords.length > 0
      ? recentRecords
          .map((r) => `- [${r.id}] "${r.title}" (${r.category ?? "general"})`)
          .join("\n")
      : "(없음)";

  return `당신은 OTTD(One Thing To Do) AI 어시스턴트입니다.
${userName}님의 할 일, 일정, 기록을 관리합니다.

## 성격
- 따뜻하고 친근한 한국어로 대화합니다
- 간결하게 응답합니다 (1-3문장)
- 사용자를 overwhelm하지 않습니다

## 현재 시간
${context.currentDateTime} (${context.timezone})

## ${userName}님의 현재 상태

### 진행 중인 할 일
${taskLines}

### 최근 완료한 할 일
${completedTaskLines}

### 다가오는 일정
${eventLines}

### 최근 지난 일정
${pastEventLines}

### 최근 기록
${recordLines}

## 행동 규칙
1. 사용자 입력을 분석하여 적절한 도구를 호출하세요
2. 여러 항목이 있으면 여러 도구를 호출하세요
3. 기존 항목의 업데이트인지 새 항목인지 반드시 판단하세요 (위의 목록 참조)
4. 도구 호출 후에는 무엇을 했는지 자연스럽게 알려주세요
5. 단순 대화(인사, 질문)에는 도구 없이 답하세요
6. 날짜/시간이 애매하면 현재 시간 기준으로 합리적으로 추론하세요
7. start_at/end_at에는 반드시 타임존 오프셋을 포함하세요
8. task의 status를 done으로 바꿀 때는 격려해주세요
9. 사용자가 할 일의 진행 상황을 알려주면 add_task_note를 사용하세요
10. "다 했어", "완료" 등의 표현은 update_task(status: done)을 사용하세요
11. 진행 상황 보고와 동시에 완료를 의미하면 add_task_note에 status: done을 함께 전달하세요
12. 종일 이벤트(공휴일, 기념일 등 시간 없는 일정)는 is_all_day: true로 설정하세요
13. 반복 일정은 recurrence_rule에 RRULE 형식으로 설정하세요 (예: RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR)
14. 위 목록에 없는 과거 할 일/일정/기록이 필요하면 search_history 도구로 검색하세요`;
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
  const fallback = "처리했어요!";
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
): Promise<AgentResult> {
  const { type, model } = getModel();

  // 1. Load user context in parallel
  const [
    { data: activeTasks },
    { data: completedTasks },
    { data: upcomingEvents },
    { data: pastEvents },
    { data: recentRecords },
    { data: profile },
  ] = await Promise.all([
    context.supabase
      .from("tasks")
      .select("id, title, status, due_date, importance, notes")
      .eq("user_id", context.userId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true })
      .limit(20),
    context.supabase
      .from("tasks")
      .select("id, title, status, due_date, importance, notes, completed_at")
      .eq("user_id", context.userId)
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(5),
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
      .order("updated_at", { ascending: false })
      .limit(10),
    context.supabase
      .from("profiles")
      .select("name")
      .eq("id", context.userId)
      .single(),
  ]);

  const userName =
    profile?.name || "사용자";

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(
    context,
    activeTasks ?? [],
    completedTasks ?? [],
    upcomingEvents ?? [],
    pastEvents ?? [],
    recentRecords ?? [],
    userName,
  );

  // 3. Start chat session (both SDKs support the same startChat pattern)
  const tools = [{ functionDeclarations: TOOL_DECLARATIONS }];

  // Both SDKs share the same startChat/sendMessage interface at runtime,
  // but their TS types diverge. Use the GenAI SDK types as canonical.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatOptions: any = {
    history,
    tools,
    systemInstruction:
      type === "vertex"
        ? { role: "system", parts: [{ text: systemPrompt }] }
        : systemPrompt,
  };
  const chat = model.startChat(chatOptions);

  // 4. Tool call loop
  const toolCalls: { name: string; args: object }[] = [];
  let currentMessage: string | Part[] = message;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await chat.sendMessage(currentMessage as any);

    const functionCalls = extractFunctionCalls(type, result);

    if (!functionCalls || functionCalls.length === 0) {
      // No more tool calls — return text
      const text = extractText(type, result);
      return { message: text, toolCalls };
    }

    // Execute all function calls
    const functionResponses: Part[] = [];
    for (const fc of functionCalls) {
      toolCalls.push({ name: fc.name, args: fc.args });
      const toolResult = await executeTool(
        fc.name,
        fc.args,
        context.supabase,
        context.userId,
        context.dumpId,
      );
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
      "처리가 복잡해서 일부만 완료했어요. 다시 말씀해 주시면 이어서 할게요.",
    toolCalls,
  };
}
