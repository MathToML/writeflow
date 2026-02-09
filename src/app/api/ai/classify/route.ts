import { createClient } from "@/lib/supabase/server";
import { classifyDump } from "@/lib/ai/classify";
import { NextResponse } from "next/server";
import type { Json } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rawContent, timezone } = await request.json();

  if (!rawContent || typeof rawContent !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const userTimezone = timezone || "Asia/Seoul";

  // 1. Save raw brain dump
  const { data: dump, error: dumpError } = await supabase
    .from("dumps")
    .insert({ user_id: user.id, type: "text" as const, raw_content: rawContent })
    .select()
    .single();

  if (dumpError || !dump) {
    return NextResponse.json(
      { error: dumpError?.message ?? "Failed to save dump" },
      { status: 500 }
    );
  }

  // 2. AI classification (raw dump preserved even on failure)
  try {
    // Format current datetime in the user's timezone
    const now = new Date();
    const currentDateTime = now.toLocaleString("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).replace(",", "");
    const classifications = await classifyDump(rawContent, currentDateTime, userTimezone);

    // 3. Update dump with AI analysis result
    await supabase
      .from("dumps")
      .update({ ai_analysis: JSON.parse(JSON.stringify(classifications)) as Json })
      .eq("id", dump.id);

    // 4. Save to corresponding table based on classification
    const createdItems = [];

    for (const classification of classifications) {
      switch (classification.type) {
        case "event": {
          const { data } = await supabase
            .from("events")
            .insert({
              user_id: user.id,
              dump_id: dump.id,
              title: classification.title,
              description: classification.description,
              start_at: classification.startAt!,
              end_at: classification.endAt,
              location: classification.location,
              attendees: classification.relatedPeople || [],
            })
            .select()
            .single();
          createdItems.push({ type: "event" as const, data });
          break;
        }
        case "task": {
          const { data } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              dump_id: dump.id,
              title: classification.title,
              description: classification.description,
              importance: classification.importance || 3,
              context_type: classification.contextType || "other",
              due_date: classification.dueDate,
              related_people: classification.relatedPeople || [],
            })
            .select()
            .single();
          createdItems.push({ type: "task" as const, data });
          break;
        }
        case "record": {
          const { data } = await supabase
            .from("records")
            .insert({
              user_id: user.id,
              dump_id: dump.id,
              category: classification.category || "general",
              title: classification.title,
              content: {
                description: classification.description,
              },
              tags: classification.tags || [],
            })
            .select()
            .single();
          createdItems.push({ type: "record" as const, data });
          break;
        }
      }
    }

    return NextResponse.json({
      dump,
      classifications,
      createdItems,
      // Backward compat
      classification: classifications[0] ?? null,
      createdItem: createdItems[0] ?? null,
    });
  } catch (aiError) {
    // Raw dump is preserved even when AI classification fails
    await supabase
      .from("dumps")
      .update({
        ai_analysis: {
          error: aiError instanceof Error ? aiError.message : "Classification failed",
        } as Json,
      })
      .eq("id", dump.id);

    return NextResponse.json(
      {
        dump,
        classification: null,
        error: "AI classification failed, but your input was saved",
      },
      { status: 200 }
    );
  }
}
