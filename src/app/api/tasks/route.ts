import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database, Json } from "@/types/database";
import { detectYouTubeEmbed, type YouTubeEmbed } from "@/lib/youtube";

interface NoteAttachment {
  storage_path: string;
  signed_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface TaskNote {
  text: string;
  created_at: string;
  media_url?: string;
  attachments?: NoteAttachment[];
  youtube?: YouTubeEmbed;
}

interface NoteAttachmentInput {
  base64: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type TaskStatus = Database["public"]["Enums"]["task_status"];

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status, note, noteData, restore } = await request.json();

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId required" },
      { status: 400 },
    );
  }

  // Restore a soft-deleted task
  if (restore) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ deleted_at: null } as Database["public"]["Tables"]["tasks"]["Update"])
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ task: data });
  }

  if (!status && !note && !noteData) {
    return NextResponse.json(
      { error: "status, note, or noteData required" },
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

  // Note append (supports legacy `note` string and new `noteData` with attachments)
  const noteText = noteData?.text ?? note;
  if (noteText || noteData?.attachments?.length) {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("notes")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    const currentNotes = (currentTask?.notes as TaskNote[] | null) ?? [];
    const newNote: TaskNote = {
      text: noteText ?? "",
      created_at: new Date().toISOString(),
    };

    // Upload attachments if present
    if (noteData?.attachments?.length) {
      const attachments: NoteAttachment[] = [];
      for (const att of noteData.attachments as NoteAttachmentInput[]) {
        if (!ALLOWED_MIME_TYPES.has(att.mimeType)) {
          return NextResponse.json(
            { error: `Unsupported file type: ${att.mimeType}` },
            { status: 400 },
          );
        }
        if (att.fileSize > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File too large: ${att.fileName} (max 5MB)` },
            { status: 400 },
          );
        }

        const buffer = Buffer.from(att.base64, "base64");
        const safeName = att.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${taskId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(storagePath, buffer, { contentType: att.mimeType });

        if (uploadError) {
          return NextResponse.json(
            { error: `Upload failed: ${uploadError.message}` },
            { status: 500 },
          );
        }

        const { data: signedUrlData } = await supabase.storage
          .from("task-attachments")
          .createSignedUrl(storagePath, 365 * 24 * 60 * 60); // 1 year

        attachments.push({
          storage_path: storagePath,
          signed_url: signedUrlData?.signedUrl ?? "",
          file_name: att.fileName,
          file_type: att.mimeType,
          file_size: att.fileSize,
        });
      }
      newNote.attachments = attachments;
    }

    // Detect YouTube embed in note text
    if (noteText) {
      const youtube = detectYouTubeEmbed(noteText);
      if (youtube) {
        newNote.youtube = youtube;
      }
    }

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
    .is("deleted_at", null)
    .eq("status", "done")
    .gte("completed_at", todayStart.toISOString());

  return NextResponse.json({ task: data, todayCompleted: count ?? 0 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await request.json();

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() } as Database["public"]["Tables"]["tasks"]["Update"])
    .eq("id", taskId)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
