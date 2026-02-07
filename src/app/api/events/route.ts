import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Enums"]["event_status"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, start_at, end_at, location, description, attendees, is_all_day, recurrence_rule } = body;

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  if (!is_all_day && !start_at) {
    return NextResponse.json(
      { error: "start_at required for timed events" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      title,
      description: description ?? null,
      start_at: is_all_day && !start_at ? new Date().toISOString() : start_at,
      end_at: end_at ?? null,
      location: location ?? null,
      attendees: attendees ?? [],
      is_all_day: is_all_day ?? false,
      recurrence_rule: recurrence_rule ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId required" },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.start_at !== undefined) updateData.start_at = body.start_at;
  if (body.end_at !== undefined) updateData.end_at = body.end_at;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.status !== undefined) updateData.status = body.status as EventStatus;
  if (body.is_all_day !== undefined) updateData.is_all_day = body.is_all_day;
  if (body.recurrence_rule !== undefined) updateData.recurrence_rule = body.recurrence_rule;
  if (body.attendees !== undefined) updateData.attendees = body.attendees;

  const { data, error } = await supabase
    .from("events")
    .update(updateData as Database["public"]["Tables"]["events"]["Update"])
    .eq("id", eventId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId required" },
      { status: 400 },
    );
  }

  // Soft delete: set status to cancelled
  const { data, error } = await supabase
    .from("events")
    .update({ status: "cancelled" as EventStatus })
    .eq("id", eventId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
