import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/ai/agent";
import { NextResponse } from "next/server";
import type { Json } from "@/types/database";
import type { Database } from "@/types/database";
import type { Content } from "@google/generative-ai";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_SIZE = 7_000_000; // ~5MB binary

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, timezone, history, image } = await request.json() as {
    message?: string;
    timezone?: string;
    history?: { role: string; content: string }[];
    image?: { base64: string; mimeType: string };
  };

  const hasImage = !!image;
  const hasText = !!message && typeof message === "string" && message.trim().length > 0;

  if (!hasText && !hasImage) {
    return NextResponse.json({ error: "Message or image required" }, { status: 400 });
  }

  // Validate image
  if (image) {
    if (!VALID_IMAGE_TYPES.includes(image.mimeType)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }
    if (image.base64.length > MAX_BASE64_SIZE) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }
  }

  const userTimezone = timezone || "Asia/Seoul";
  const textContent = message?.trim() || (hasImage ? "[Image]" : "");

  // Resolve any pending questions — user has responded
  if (textContent !== "[AUTO_PROCEED]") {
    await supabase
      .from("pending_questions")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "pending");
  }

  // 1. Save raw dump
  const { data: dump, error: dumpError } = await supabase
    .from("dumps")
    .insert({
      user_id: user.id,
      type: (hasImage ? "image" : "text") as Database["public"]["Enums"]["dump_type"],
      raw_content: textContent,
    })
    .select()
    .single();

  if (dumpError || !dump) {
    return NextResponse.json(
      { error: dumpError?.message ?? "Failed to save dump" },
      { status: 500 },
    );
  }

  // 2. Upload image to Storage if present
  let mediaUrl: string | null = null;
  if (image && dump) {
    const ext = image.mimeType.split("/")[1];
    const path = `${user.id}/${dump.id}.${ext}`;
    const buffer = Buffer.from(image.base64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("dump-images")
      .upload(path, buffer, {
        contentType: image.mimeType,
        upsert: false,
      });

    if (!uploadError) {
      // Private bucket — use signed URL (1 year)
      const { data: signedData } = await supabase.storage
        .from("dump-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      mediaUrl = signedData?.signedUrl || null;

      await supabase
        .from("dumps")
        .update({ media_url: mediaUrl })
        .eq("id", dump.id);
    }
  }

  // 3. Format current datetime in user's timezone
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

  // 4. Convert client history to Gemini Content format
  const geminiHistory: Content[] = (
    (history ?? [])
  ).map((h) => ({
    role: h.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: h.content }],
  }));

  // 5. Run agent
  console.log("[Chat API] Running agent. hasImage:", hasImage, "mediaUrl:", mediaUrl ? "set" : "null");
  try {
    const result = await runAgent(
      message?.trim() || "",
      geminiHistory,
      {
        userId: user.id,
        dumpId: dump.id,
        supabase,
        timezone: userTimezone,
        currentDateTime,
        mediaUrl: mediaUrl || undefined,
      },
      image ? { base64: image.base64, mimeType: image.mimeType } : undefined,
    );

    // 6. Store AI response in dump
    await supabase
      .from("dumps")
      .update({
        ai_analysis: {
          response: result.message,
          toolCalls: result.toolCalls,
        } as unknown as Json,
      })
      .eq("id", dump.id);

    // 7. If AI needs user input, create pending question + schedule auto-proceed
    if (result.needsUserInput) {
      const { data: pq } = await supabase
        .from("pending_questions")
        .insert({
          user_id: user.id,
          dump_id: dump.id,
          timezone: userTimezone,
        })
        .select("id")
        .single();

      if (pq) {
        const { inngest } = await import("@/inngest/client");
        await inngest.send({
          name: "ai/auto-proceed",
          data: {
            pendingQuestionId: pq.id,
            userId: user.id,
            dumpId: dump.id,
            timezone: userTimezone,
          },
        });
      }
    }

    console.log("[Chat API] Agent result. toolCalls:", result.toolCalls.map((tc) => tc.name), "message:", result.message.slice(0, 100), "needsUserInput:", result.needsUserInput);
    return NextResponse.json({
      message: result.message,
      dumpId: dump.id,
      mediaUrl,
      needsUserInput: result.needsUserInput,
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
      message: "Sorry, something went wrong. Please try again.",
      dumpId: dump.id,
      mediaUrl,
    });
  }
}
