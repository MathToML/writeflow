import { getModel } from "./gemini";
import type { GenerativeModel } from "@google/generative-ai";

export interface ClassificationResult {
  type: "event" | "task" | "record";
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  importance?: number;
  contextType?:
    | "location_dependent"
    | "desk_work"
    | "communication"
    | "errand"
    | "quick"
    | "other";
  dueDate?: string;
  category?: string;
  tags?: string[];
  relatedPeople?: string[];
  aiReasoning?: string;
}

const CLASSIFICATION_PROMPT = `당신은 사용자의 brain dump를 분류하는 AI 어시스턴트입니다.

사용자가 입력한 내용을 분석하여 다음 중 하나로 분류하세요:
1. "event" - 특정 날짜/시간에 발생하는 일정 (약속, 미팅, 예약 등)
2. "task" - 해야 할 일 (기한이 있을 수도 없을 수도 있음)
3. "record" - 기록/메모 (참조 정보, 연락처, 절차, 기억해둘 것 등)

중요: 사용자 입력에 여러 항목이 포함될 수 있습니다.
- 여러 항목이면 JSON 배열로 응답하세요: [{ ... }, { ... }]
- 단일 항목이면 하나의 JSON 객체로 응답하세요: { ... }

각 항목의 JSON 형식 (코드블록 없이 순수 JSON만):
{
  "type": "event | task | record",
  "title": "간결한 제목",
  "description": "상세 내용 (필요한 경우)",
  "startAt": "ISO datetime with timezone offset (event인 경우, 예: 2026-02-07T07:00:00+09:00)",
  "endAt": "ISO datetime with timezone offset (event인 경우, 선택)",
  "location": "장소 (있는 경우)",
  "importance": 3,
  "contextType": "location_dependent|desk_work|communication|errand|quick|other",
  "dueDate": "YYYY-MM-DD (task인 경우, 있으면)",
  "category": "contact|procedure|family|shopping|client|general",
  "tags": ["태그1"],
  "relatedPeople": ["관련 인물"],
  "aiReasoning": "분류 근거 한 줄 설명"
}

중요:
- importance는 1(낮음)~5(긴급) 스케일
- contextType은 task인 경우만 설정
- category는 record인 경우만 설정
- 날짜/시간이 애매하면 합리적으로 추론 (예: "내일" → 현재 날짜+1)
- startAt/endAt에는 반드시 사용자 타임존 오프셋을 포함할 것 (예: +09:00)
- 응답에 JSON만 포함할 것 (다른 텍스트 없이)

현재 날짜/시간: {{currentDateTime}}
사용자 타임존: {{timezone}}`;

export async function classifyDump(
  rawContent: string,
  currentDateTime: string,
  timezone: string = "Asia/Seoul"
): Promise<ClassificationResult[]> {
  const prompt = CLASSIFICATION_PROMPT
    .replace("{{currentDateTime}}", currentDateTime)
    .replace("{{timezone}}", timezone);

  const fullPrompt = `${prompt}\n\n사용자 입력: ${rawContent}`;
  const { type, model } = getModel();

  let responseText: string;

  if (type === "vertex") {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });
    const response = await result.response;
    responseText =
      response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    const genaiModel = model as GenerativeModel;
    const result = await genaiModel.generateContent(fullPrompt);
    responseText = result.response.text();
  }

  const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Support both single object and array responses
  if (Array.isArray(parsed)) {
    return parsed as ClassificationResult[];
  }
  return [parsed as ClassificationResult];
}
