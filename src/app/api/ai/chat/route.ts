import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/ai/agent";
import { NextResponse } from "next/server";
import type { Json } from "@/types/database";
import type { Content } from "@google/generative-ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, timezone, history } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const userTimezone = timezone || "Asia/Seoul";

  // 1. Save raw dump (always preserved regardless of AI outcome)
  const { data: dump, error: dumpError } = await supabase
    .from("dumps")
    .insert({
      user_id: user.id,
      type: "text" as const,
      raw_content: message,
    })
    .select()
    .single();

  if (dumpError || !dump) {
    return NextResponse.json(
      { error: dumpError?.message ?? "Failed to save dump" },
      { status: 500 },
    );
  }

  // 2. Format current datetime in user's timezone
  const now = new Date();
  const currentDateTime = now
    .toLocaleString("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");

  // 3. Convert client history to Gemini Content format
  const geminiHistory: Content[] = (
    (history as { role: string; content: string }[]) ?? []
  ).map((h) => ({
    role: h.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: h.content }],
  }));

  // 4. Run agent
  try {
    const result = await runAgent(message, geminiHistory, {
      userId: user.id,
      dumpId: dump.id,
      supabase,
      timezone: userTimezone,
      currentDateTime,
    });

    // 5. Store AI response in dump
    await supabase
      .from("dumps")
      .update({
        ai_analysis: {
          response: result.message,
          toolCalls: result.toolCalls,
        } as unknown as Json,
      })
      .eq("id", dump.id);

    return NextResponse.json({
      message: result.message,
      dumpId: dump.id,
    });
  } catch (error) {
    // AI failure — dump is preserved
    await supabase
      .from("dumps")
      .update({
        ai_analysis: {
          error:
            error instanceof Error ? error.message : "Agent failed",
        } as unknown as Json,
      })
      .eq("id", dump.id);

    return NextResponse.json({
      message: "죄송해요, 처리 중 문제가 생겼어요. 다시 시도해 주세요.",
      dumpId: dump.id,
    });
  }
}
