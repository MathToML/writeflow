import type { Content } from "@google/generative-ai";

interface DumpForHistory {
  raw_content: string;
  ai_analysis: unknown;
}

export function dumpsToGeminiHistory(dumps: DumpForHistory[]): Content[] {
  const history: Content[] = [];
  for (const dump of dumps) {
    // User message
    history.push({
      role: "user",
      parts: [{ text: dump.raw_content }],
    });
    // AI response
    const analysis = dump.ai_analysis as { response?: string } | null;
    if (analysis?.response) {
      history.push({
        role: "model",
        parts: [{ text: analysis.response }],
      });
    }
  }
  return history;
}
