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

const CLASSIFICATION_PROMPT = `You are an AI assistant that classifies user brain dumps.

Analyze the user's input and classify each item as one of:
1. "event" - Something happening at a specific date/time (appointments, meetings, reservations, etc.)
2. "task" - Something to do (may or may not have a deadline)
3. "record" - A note/memo (reference info, contacts, procedures, things to remember, etc.)

Important: User input may contain multiple items.
- If multiple items, respond with a JSON array: [{ ... }, { ... }]
- If a single item, respond with a single JSON object: { ... }

JSON format for each item (pure JSON only, no code blocks):
{
  "type": "event | task | record",
  "title": "Concise title",
  "description": "Details (if needed)",
  "startAt": "ISO datetime with timezone offset (for events, e.g. 2026-02-07T07:00:00+09:00)",
  "endAt": "ISO datetime with timezone offset (for events, optional)",
  "location": "Location (if any)",
  "importance": 3,
  "contextType": "location_dependent|desk_work|communication|errand|quick|other",
  "dueDate": "YYYY-MM-DD (for tasks, if applicable)",
  "category": "contact|procedure|family|shopping|client|general",
  "tags": ["tag1"],
  "relatedPeople": ["person name"],
  "aiReasoning": "One-line explanation for the classification"
}

Important:
- importance is on a 1 (low) to 5 (urgent) scale
- contextType is only for tasks
- category is only for records
- If date/time is ambiguous, infer reasonably (e.g. "tomorrow" → current date + 1)
- startAt/endAt must include the user's timezone offset (e.g. +09:00)
- Respond with JSON only (no other text)

Current date/time: {{currentDateTime}}
User timezone: {{timezone}}`;

export async function classifyDump(
  rawContent: string,
  currentDateTime: string,
  timezone: string = "Asia/Seoul"
): Promise<ClassificationResult[]> {
  const prompt = CLASSIFICATION_PROMPT
    .replace("{{currentDateTime}}", currentDateTime)
    .replace("{{timezone}}", timezone);

  const fullPrompt = `${prompt}\n\nUser input: ${rawContent}`;
  const { type, model } = getModel();

  let responseText: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (model as any).generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });

  responseText =
    typeof result.response.text === "function"
      ? result.response.text()
      : result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Support both single object and array responses
  if (Array.isArray(parsed)) {
    return parsed as ClassificationResult[];
  }
  return [parsed as ClassificationResult];
}
