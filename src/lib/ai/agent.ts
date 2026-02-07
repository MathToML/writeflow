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
}

// ── System prompt ──────────────────────────────────────────────────────

type TaskRow = { id: string; title: string; description: string | null; status: string; due_date: string | null; importance: number | null; notes: unknown; completed_at?: string | null };
type EventRow = { id: string; title: string; start_at: string; location: string | null; description: string | null; is_all_day: boolean | null; recurrence_rule: string | null };
type RecordRow = { id: string; title: string; category: string | null };

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
  userName: string,
  personaFacts: PersonaFact[],
): string {
  const taskLines =
    activeTasks.length > 0
      ? activeTasks
          .map((t) => {
            let line = `- [${t.id}] "${t.title}" (${t.status}${t.due_date ? `, 마감: ${t.due_date}` : ""}${t.importance ? `, 중요도: ${t.importance}` : ""})`;
            if (t.description) line += `\n  - 설명: ${t.description}`;
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
          .map((t) => {
            let line = `- [${t.id}] "${t.title}" (완료${t.completed_at ? `: ${t.completed_at.slice(0, 10)}` : ""})`;
            if (t.description) line += `\n  - 설명: ${t.description}`;
            return line;
          })
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

### ${userName}님에 대해 알고 있는 것
${personaFacts.length > 0
    ? personaFacts
        .map((f) => `- [${f.category}] ${f.content}`)
        .join("\n")
    : "(아직 없음 — 대화를 통해 알아가는 중이에요)"}

## 행동 규칙
1. 사용자 입력을 분석하여 적절한 도구를 호출하세요
2. 여러 항목이 있으면 여러 도구를 호출하세요
3. 기존 항목의 업데이트인지 새 항목인지 반드시 판단하세요 (위의 목록 참조). 제목이 정확히 일치하지 않으면 함부로 매칭하지 마세요
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
14. **중요** 사용자가 키워드로 태스크를 언급할 때 (예: "팔로알토에 넣어줘"):
    a. 먼저 진행 중/완료 목록에서 **정확히** 일치하는 항목을 찾으세요
    b. 정확히 일치하는 게 없으면 반드시 search_history 도구로 검색하세요
    c. 한국어로 검색해서 못 찾으면 영어로도 검색하세요 (예: "팔로알토" → "Palo Alto", "빅토리아" → "Victoria")
    d. 비슷한 이름이라도 다른 항목에 넣지 마세요 (예: "Los Altos" ≠ "Palo Alto")
    e. 검색 후에도 확실하지 않으면 사용자에게 확인하세요
    f. 완료된 태스크에도 노트를 추가할 수 있으니, done 상태라고 무시하지 마세요
15. 사용자가 개인 정보를 언급하면 update_persona로 저장하세요 (가족 이름, 직장, 습관, 취미, 건강 등)
16. 이미 알고 있는 정보가 변경되면 같은 category/key로 update_persona를 호출하여 갱신하세요
17. 저장할 때 티내지 말고 자연스럽게 대화를 이어가세요 — "기억해둘게요" 같은 말은 하지 마세요
18. 사용자가 이미지를 보내면 내용을 분석하고 상황에 맞게 처리하세요:
    - 기존 할 일과 관련 → add_task_note(attach_image: true)로 이미지와 분석 내용을 노트로 추가
    - 새 할 일 → create_task 후 add_task_note(attach_image: true)로 이미지 첨부
    - 일정 관련 → create_event 또는 update_event
    - 사용자의 의도가 불분명하면 물어보세요
    - 아무 지시 없이 이미지만 보내면 create_record(attach_image: true)로 기록 저장
19. attach_image: true를 사용하면 현재 이미지가 자동으로 첨부됩니다
20. 이미지 분석 시 상세 내용(OCR, 장소, 날짜, 가격 등)은 노트/기록에 저장하되, 사용자에게는 무엇을 했는지만 간결하게 알려주세요. 추출한 텍스트를 응답에 그대로 나열하지 마세요
21. 사용자가 "삭제해", "지워줘" 등의 표현을 쓰면 직접 삭제하지 말고, 화면에서 삭제 버튼을 사용하라고 안내하세요`;
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
  imageData?: ImageData,
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
      .order("updated_at", { ascending: false })
      .limit(10),
    context.supabase
      .from("profiles")
      .select("name, persona")
      .eq("id", context.userId)
      .single(),
  ]);

  const userName =
    profile?.name || "사용자";

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
    userName,
    personaFacts,
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
  let currentMessage: string | Part[];

  if (imageData) {
    // Build multimodal message with image + text
    const parts: Part[] = [
      { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } },
      { text: message || "이 이미지를 분석해주세요. 할 일, 일정, 또는 기록할 내용이 있으면 처리해주세요." },
    ];
    currentMessage = parts;
  } else {
    currentMessage = message;
  }

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
        context.mediaUrl,
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
