import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database, Json } from "@/types/database";

interface TaskNote {
  text: string;
  created_at: string;
}

type TaskStatus = Database["public"]["Enums"]["task_status"];

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status, note } = await request.json();

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId required" },
      { status: 400 },
    );
  }

  if (!status && !note) {
    return NextResponse.json(
      { error: "status or note required" },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};

  // Status update
  if (status) {
    updateData.status = status as TaskStatus;
    if (status === "done") {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
  }

  // Note append
  if (note) {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("notes")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    const currentNotes = (currentTask?.notes as TaskNote[] | null) ?? [];
    const newNote: TaskNote = {
      text: note,
      created_at: new Date().toISOString(),
    };
    updateData.notes = [...currentNotes, newNote] as unknown as Json;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData as Database["public"]["Tables"]["tasks"]["Update"])
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count today's completed tasks for achievement feedback
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "done")
    .gte("completed_at", todayStart.toISOString());

  return NextResponse.json({ task: data, todayCompleted: count ?? 0 });
}
