import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type ContextType = Database["public"]["Enums"]["context_type"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type EventStatus = Database["public"]["Enums"]["event_status"];

// ── Tool declarations for Gemini function calling ──────────────────────

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "create_task",
    description: "Create a new task/todo item for the user",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Task title" },
        description: {
          type: SchemaType.STRING,
          description: "Task description",
        },
        importance: {
          type: SchemaType.INTEGER,
          description: "1 (low) to 5 (urgent)",
        },
        context_type: {
          type: SchemaType.STRING,
          description:
            "One of: computer (PC work), phone (calls/messages), errand (outside), home, meeting, quick (under 5min), focus (deep work), waiting (blocked on others), other",
        },
        due_date: {
          type: SchemaType.STRING,
          description: "YYYY-MM-DD format",
        },
        related_people: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Related people names",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing task. Use to change status, title, importance, due date, etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        task_id: {
          type: SchemaType.STRING,
          description: "UUID of the task to update",
        },
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        status: {
          type: SchemaType.STRING,
          description: "One of: pending, in_progress, done, deferred",
        },
        importance: { type: SchemaType.INTEGER },
        due_date: { type: SchemaType.STRING },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_tasks",
    description: "List user's tasks, optionally filtered by status",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description:
            "Filter: pending, in_progress, done, deferred, or all. Default: active (pending+in_progress)",
        },
      },
    },
  },
  {
    name: "create_event",
    description: "Create a calendar event/schedule",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Event title" },
        description: { type: SchemaType.STRING },
        start_at: {
          type: SchemaType.STRING,
          description:
            "ISO datetime with timezone offset, e.g. 2026-02-07T07:00:00-08:00. For all-day events, use date only: 2026-02-07",
        },
        end_at: {
          type: SchemaType.STRING,
          description: "ISO datetime with timezone offset",
        },
        location: { type: SchemaType.STRING },
        attendees: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        is_all_day: {
          type: SchemaType.BOOLEAN,
          description:
            "True for all-day events (holidays, deadlines without specific time)",
        },
        recurrence_rule: {
          type: SchemaType.STRING,
          description:
            "RRULE format for recurring events. Examples: RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR (every Mon/Wed/Fri), RRULE:FREQ=MONTHLY;BYMONTHDAY=1 (1st of each month), RRULE:FREQ=WEEKLY;INTERVAL=4;BYDAY=SU (every 4 weeks on Sunday)",
        },
      },
      required: ["title", "start_at"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing calendar event",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: {
          type: SchemaType.STRING,
          description: "UUID of the event to update",
        },
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        start_at: { type: SchemaType.STRING },
        end_at: { type: SchemaType.STRING },
        location: { type: SchemaType.STRING },
        status: {
          type: SchemaType.STRING,
          description: "One of: active, cancelled, completed",
        },
        is_all_day: { type: SchemaType.BOOLEAN },
        recurrence_rule: {
          type: SchemaType.STRING,
          description: "RRULE format, or empty string to remove recurrence",
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "list_events",
    description: "List user's upcoming events",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        days_ahead: {
          type: SchemaType.INTEGER,
          description: "Number of days ahead to look. Default 7",
        },
        include_past_today: {
          type: SchemaType.BOOLEAN,
          description: "Include today's past events",
        },
      },
    },
  },
  {
    name: "create_record",
    description:
      "Save a record/note — reference info, contacts, procedures, shopping lists, images, etc. Set attach_image to true to save the current image with the record.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Record title" },
        content: {
          type: SchemaType.STRING,
          description: "The content/details",
        },
        category: {
          type: SchemaType.STRING,
          description:
            "One of: contact, procedure, family, shopping, client, general",
        },
        tags: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        attach_image: {
          type: SchemaType.BOOLEAN,
          description:
            "Set to true to attach the current image to this record.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "create_expense",
    description:
      "Record an expense/spending. Use when user mentions spending money, a receipt, or a purchase. Extracts amount, vendor, and category from text or receipt images.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Short expense title, e.g. 'Starbucks coffee'",
        },
        amount: {
          type: SchemaType.NUMBER,
          description: "Expense amount as a number (e.g. 15000)",
        },
        currency: {
          type: SchemaType.STRING,
          description: "Currency code. Default: USD. Others: EUR, JPY, KRW",
        },
        expense_category: {
          type: SchemaType.STRING,
          description:
            "One of: food, transport, shopping, medical, culture, housing, education, other",
        },
        vendor: {
          type: SchemaType.STRING,
          description: "Store/vendor name if known",
        },
        items: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Individual items purchased",
        },
        occurred_at: {
          type: SchemaType.STRING,
          description:
            "When the expense occurred. YYYY-MM-DD or ISO datetime. Defaults to today.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Additional notes about the expense",
        },
        attach_image: {
          type: SchemaType.BOOLEAN,
          description: "Set to true to attach receipt image",
        },
      },
      required: ["title", "amount"],
    },
  },
  {
    name: "create_habit",
    description:
      "Create a new habit for tracking. Use when user wants to track a recurring activity (exercise, reading, meditation, etc.)",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Habit name, e.g. '달리기', 'Reading', '명상'",
        },
        description: {
          type: SchemaType.STRING,
          description: "Brief description of the habit",
        },
        icon: {
          type: SchemaType.STRING,
          description: "Single emoji icon for the habit. Default: ✅",
        },
        color: {
          type: SchemaType.STRING,
          description:
            "Heatmap color theme. One of: green, blue, purple, orange. Default: green",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "log_habit",
    description:
      "Log an entry for an existing habit. Records that the user performed the habit on a given date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        habit_id: {
          type: SchemaType.STRING,
          description: "UUID of the habit to log",
        },
        logged_date: {
          type: SchemaType.STRING,
          description: "YYYY-MM-DD format. Defaults to today.",
        },
        note: {
          type: SchemaType.STRING,
          description: "Optional note, e.g. '30분', '5km'",
        },
        value: {
          type: SchemaType.NUMBER,
          description:
            "Numeric value (count, duration in minutes, etc.). Default: 1",
        },
      },
      required: ["habit_id"],
    },
  },
  {
    name: "schedule_message",
    description:
      "Schedule a message to be sent to the user after a delay. You MUST call this tool when the user asks for reminders, timers, delayed messages, or follow-ups. Never just say you scheduled something — always call this function.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        message: {
          type: SchemaType.STRING,
          description: "The message to deliver later",
        },
        delay_seconds: {
          type: SchemaType.INTEGER,
          description:
            "Delay in seconds before delivering the message (e.g. 20 for 20 seconds, 300 for 5 minutes)",
        },
        deliver_at: {
          type: SchemaType.STRING,
          description:
            "ISO datetime string for absolute delivery time. Use either this OR delay_seconds.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "search_records",
    description: "Search existing records by keyword or category",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Search keyword",
        },
        category: { type: SchemaType.STRING },
      },
      required: ["query"],
    },
  },
  {
    name: "search_history",
    description:
      "Search past tasks, events, and records by keyword. Use when the user asks about something not in the current context — e.g. past completed tasks, old events, or historical records. Searches up to 1 year of data.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Search keyword (matched against titles and descriptions)",
        },
        type: {
          type: SchemaType.STRING,
          description: "Limit search to: tasks, events, records, or all (default: all)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_persona",
    description:
      "Save or update a personal fact about the user — family, work, habits, preferences, etc. The AI should call this whenever the user shares personal information during conversation. Each fact has a category and key for easy updating.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description:
            "One of: family, work, preference, trait, health, hobby, other",
        },
        key: {
          type: SchemaType.STRING,
          description:
            "Unique identifier within category for upsert, e.g. 'wife_name', 'company', 'morning_routine'",
        },
        content: {
          type: SchemaType.STRING,
          description: "The fact to remember, e.g. 'Wife's name is Jane'",
        },
      },
      required: ["category", "key", "content"],
    },
  },
  {
    name: "add_task_note",
    description:
      "Add a progress note/comment to an existing task. Use when user reports progress or wants to record something about a task. Set attach_image to true to attach the current image.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        task_id: {
          type: SchemaType.STRING,
          description: "UUID of the task to add a note to",
        },
        note: {
          type: SchemaType.STRING,
          description: "The note/comment text to add",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "Optionally update status simultaneously. One of: pending, in_progress, done, deferred",
        },
        attach_image: {
          type: SchemaType.BOOLEAN,
          description:
            "Set to true to attach the current image to this note. The image URL will be added automatically.",
        },
      },
      required: ["task_id", "note"],
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────────────

type ToolResult = { success: boolean; data?: unknown; error?: string };

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  dumpId: string | null,
  mediaUrl?: string,
): Promise<ToolResult> {
  switch (name) {
    case "create_task":
      return createTask(args, supabase, userId, dumpId);
    case "update_task":
      return updateTask(args, supabase, userId);
    case "list_tasks":
      return listTasks(args, supabase, userId);
    case "create_event":
      return createEvent(args, supabase, userId, dumpId);
    case "update_event":
      return updateEvent(args, supabase, userId);
    case "list_events":
      return listEvents(args, supabase, userId);
    case "create_record":
      return createRecord(args, supabase, userId, dumpId, mediaUrl);
    case "create_expense":
      return createExpense(args, supabase, userId, dumpId, mediaUrl);
    case "create_habit":
      return createHabit(args, supabase, userId);
    case "log_habit":
      return logHabit(args, supabase, userId);
    case "schedule_message":
      return scheduleMessage(args, supabase, userId);
    case "search_records":
      return searchRecords(args, supabase, userId);
    case "add_task_note":
      return addTaskNote(args, supabase, userId, mediaUrl);
    case "update_persona":
      return updatePersona(args, supabase, userId);
    case "search_history":
      return searchHistory(args, supabase, userId);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

// ── Individual tool implementations ────────────────────────────────────

async function createTask(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  dumpId: string | null,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      dump_id: dumpId,
      title: args.title as string,
      description: (args.description as string) ?? null,
      importance: (args.importance as number) ?? 3,
      context_type: ((args.context_type as string) ?? "other") as ContextType,
      due_date: (args.due_date as string) ?? null,
      related_people: (args.related_people as string[]) ?? [],
    })
    .select("id, title, status, importance, due_date")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function updateTask(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const taskId = args.task_id as string;
  const updates: Record<string, unknown> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.status !== undefined) {
    updates.status = args.status as TaskStatus;
    if (args.status === "done")
      updates.completed_at = new Date().toISOString();
  }
  if (args.importance !== undefined) updates.importance = args.importance;
  if (args.due_date !== undefined) updates.due_date = args.due_date;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates as Database["public"]["Tables"]["tasks"]["Update"])
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id, title, status, importance, due_date")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function listTasks(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  let query = supabase
    .from("tasks")
    .select("id, title, status, importance, due_date, context_type")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  const status = args.status as string | undefined;
  if (status && status !== "all") {
    query = query.eq("status", status as TaskStatus);
  } else if (!status) {
    query = query.in("status", ["pending", "in_progress"]);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createEvent(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  dumpId: string | null,
): Promise<ToolResult> {
  // Normalize all-day events to noon UTC to prevent timezone day-shift
  let startAt = args.start_at as string;
  let endAt: string | null = (args.end_at as string) ?? null;
  if (args.is_all_day) {
    const dateOnly = startAt.slice(0, 10); // "YYYY-MM-DD"
    startAt = `${dateOnly}T12:00:00Z`;
    endAt = null;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      dump_id: dumpId,
      title: args.title as string,
      description: (args.description as string) ?? null,
      start_at: startAt,
      end_at: endAt,
      location: (args.location as string) ?? null,
      attendees: (args.attendees as string[]) ?? [],
      is_all_day: (args.is_all_day as boolean) ?? false,
      recurrence_rule: (args.recurrence_rule as string) ?? null,
    })
    .select("id, title, start_at, end_at, location, status, is_all_day, recurrence_rule")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function updateEvent(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const eventId = args.event_id as string;
  const updates: Record<string, unknown> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.start_at !== undefined) {
    let startAt = args.start_at as string;
    // Normalize all-day events to noon UTC
    if (args.is_all_day) {
      const dateOnly = startAt.slice(0, 10);
      startAt = `${dateOnly}T12:00:00Z`;
    }
    updates.start_at = startAt;
  }
  if (args.end_at !== undefined) updates.end_at = args.is_all_day ? null : args.end_at;
  if (args.location !== undefined) updates.location = args.location;
  if (args.status !== undefined) updates.status = args.status as EventStatus;
  if (args.is_all_day !== undefined) updates.is_all_day = args.is_all_day;
  if (args.recurrence_rule !== undefined) {
    updates.recurrence_rule = (args.recurrence_rule as string) || null;
  }

  const { data, error } = await supabase
    .from("events")
    .update(updates as Database["public"]["Tables"]["events"]["Update"])
    .eq("id", eventId)
    .eq("user_id", userId)
    .select("id, title, start_at, end_at, location, status, is_all_day, recurrence_rule")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function listEvents(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const daysAhead = (args.days_ahead as number) ?? 7;
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + daysAhead);

  let query = supabase
    .from("events")
    .select("id, title, start_at, end_at, location, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("start_at", future.toISOString())
    .order("start_at", { ascending: true })
    .limit(20);

  if (!args.include_past_today) {
    query = query.gte("start_at", now.toISOString());
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createRecord(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  dumpId: string | null,
  mediaUrl?: string,
): Promise<ToolResult> {
  const attachImage = args.attach_image as boolean | undefined;
  const contentObj: Record<string, unknown> = {};
  if (args.content) contentObj.description = args.content;
  if (attachImage && mediaUrl) contentObj.media_url = mediaUrl;

  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: userId,
      dump_id: dumpId,
      title: args.title as string,
      category: (args.category as string) ?? "general",
      content: (Object.keys(contentObj).length > 0 ? contentObj : {}) as Json,
      tags: (args.tags as string[]) ?? [],
    })
    .select("id, title, category, tags")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createExpense(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  dumpId: string | null,
  mediaUrl?: string,
): Promise<ToolResult> {
  const attachImage = args.attach_image as boolean | undefined;
  const amount = args.amount as number;
  const currency = (args.currency as string) ?? "USD";
  const expenseCategory = (args.expense_category as string) ?? "other";
  const vendor = (args.vendor as string) ?? null;
  const items = (args.items as string[]) ?? [];
  const description = (args.description as string) ?? null;
  const occurredAt = (args.occurred_at as string) ?? new Date().toISOString().slice(0, 10);

  const contentObj: Record<string, unknown> = {
    amount,
    currency,
    expense_category: expenseCategory,
  };
  if (vendor) contentObj.vendor = vendor;
  if (items.length > 0) contentObj.items = items;
  if (description) contentObj.description = description;
  if (attachImage && mediaUrl) contentObj.media_url = mediaUrl;

  // Normalize occurred_at: date-only → noon UTC
  let parsedOccurredAt = occurredAt;
  if (occurredAt.length === 10) {
    parsedOccurredAt = `${occurredAt}T12:00:00Z`;
  }

  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: userId,
      dump_id: dumpId,
      title: args.title as string,
      category: "expense",
      content: contentObj as Json,
      tags: [expenseCategory],
      occurred_at: parsedOccurredAt,
    })
    .select("id, title, category, tags")
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      ...data,
      amount,
      currency,
      expense_category: expenseCategory,
    },
  };
}

async function scheduleMessage(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const message = args.message as string;
  const delaySeconds = args.delay_seconds as number | undefined;
  const deliverAtStr = args.deliver_at as string | undefined;

  // Calculate deliver_at
  let deliverAt: Date;
  if (delaySeconds) {
    deliverAt = new Date(Date.now() + delaySeconds * 1000);
  } else if (deliverAtStr) {
    deliverAt = new Date(deliverAtStr);
  } else {
    return { success: false, error: "Either delay_seconds or deliver_at is required" };
  }

  // Save to DB
  const { data, error } = await supabase
    .from("scheduled_messages")
    .insert({
      user_id: userId,
      message,
      deliver_at: deliverAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Send Inngest event
  try {
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "ai/schedule-message",
      data: {
        scheduledMessageId: data.id,
        userId,
        message,
        deliverAt: deliverAt.toISOString(),
      },
    });
  } catch (inngestErr) {
    console.error("[scheduleMessage] Failed to send Inngest event:", inngestErr);
    return {
      success: false,
      error: "Message saved but delivery scheduling failed. The background job service may be unavailable.",
    };
  }

  return {
    success: true,
    data: { id: data.id, deliver_at: deliverAt.toISOString() },
  };
}

async function searchRecords(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const query = args.query as string;
  let dbQuery = supabase
    .from("records")
    .select("id, title, category, content, tags")
    .eq("user_id", userId)
    .ilike("title", `%${query}%`)
    .limit(10);

  if (args.category) {
    dbQuery = dbQuery.eq("category", args.category as string);
  }

  const { data, error } = await dbQuery;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function addTaskNote(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
  mediaUrl?: string,
): Promise<ToolResult> {
  const taskId = args.task_id as string;
  const noteText = args.note as string;
  const attachImage = args.attach_image as boolean | undefined;

  console.log("[addTaskNote] Called with:", { taskId, noteText: noteText?.slice(0, 100), attachImage, hasMediaUrl: !!mediaUrl });

  // Read current notes
  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select("notes")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.log("[addTaskNote] Fetch error:", fetchError.message);
    return { success: false, error: fetchError.message };
  }

  const currentNotes =
    (currentTask.notes as { text: string; created_at: string; media_url?: string; attachments?: { storage_path: string; signed_url: string; file_name: string; file_type: string; file_size: number }[] }[] | null) ?? [];
  const newNote: { text: string; created_at: string; media_url?: string; attachments?: { storage_path: string; signed_url: string; file_name: string; file_type: string; file_size: number }[] } = {
    text: noteText,
    created_at: new Date().toISOString(),
  };
  if (attachImage && mediaUrl) {
    newNote.media_url = mediaUrl;
    // Also populate attachments array for new schema compatibility
    newNote.attachments = [{
      storage_path: "",
      signed_url: mediaUrl,
      file_name: "image",
      file_type: "image/jpeg",
      file_size: 0,
    }];
  }
  const updatedNotes = [...currentNotes, newNote];

  // Build update
  const updates: Record<string, unknown> = {
    notes: updatedNotes as unknown as Json,
  };
  if (args.status) {
    updates.status = args.status as TaskStatus;
    if (args.status === "done") {
      updates.completed_at = new Date().toISOString();
    }
  }

  console.log("[addTaskNote] Updating task with notes count:", updatedNotes.length, "status update:", args.status ?? "none");

  const { data, error } = await supabase
    .from("tasks")
    .update(updates as Database["public"]["Tables"]["tasks"]["Update"])
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id, title, status, notes")
    .single();

  if (error) {
    console.log("[addTaskNote] Update error:", error.message);
    return { success: false, error: error.message };
  }

  const savedNotes = Array.isArray(data.notes) ? data.notes : [];
  console.log("[addTaskNote] Success! Saved notes count:", savedNotes.length, "has_image:", !!(attachImage && mediaUrl));
  return {
    success: true,
    data: {
      id: data.id,
      title: data.title,
      status: data.status,
      total_notes: savedNotes.length,
      has_image: !!(attachImage && mediaUrl),
    },
  };
}

interface PersonaFact {
  category: string;
  key: string;
  content: string;
  updated_at: string;
}

async function updatePersona(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const category = args.category as string;
  const key = args.key as string;
  const content = args.content as string;

  // Read current persona
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("persona")
    .eq("id", userId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const persona = (profile?.persona as { facts?: PersonaFact[] }) ?? {};
  const facts: PersonaFact[] = persona.facts ?? [];

  // Upsert by category+key
  const existingIndex = facts.findIndex(
    (f) => f.category === category && f.key === key,
  );
  const newFact: PersonaFact = {
    category,
    key,
    content,
    updated_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    facts[existingIndex] = newFact;
  } else {
    facts.push(newFact);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ persona: { facts } as unknown as Json })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: { saved: `${category}/${key}`, content },
  };
}

async function searchHistory(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const query = args.query as string;
  const searchType = (args.type as string) ?? "all";
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = oneYearAgo.toISOString();

  const results: { type: string; id: string; title: string; status?: string; date?: string; details?: string }[] = [];

  // Search tasks
  if (searchType === "all" || searchType === "tasks") {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, due_date, completed_at, description")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", cutoff)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (tasks) {
      for (const t of tasks) {
        results.push({
          type: "task",
          id: t.id,
          title: t.title,
          status: t.status,
          date: t.completed_at ?? t.due_date ?? undefined,
          details: t.description ?? undefined,
        });
      }
    }
  }

  // Search events
  if (searchType === "all" || searchType === "events") {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, start_at, location, description, status")
      .eq("user_id", userId)
      .gte("start_at", cutoff)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("start_at", { ascending: false })
      .limit(10);

    if (events) {
      for (const e of events) {
        results.push({
          type: "event",
          id: e.id,
          title: e.title,
          status: e.status,
          date: e.start_at,
          details: [e.location, e.description].filter(Boolean).join(" | ") || undefined,
        });
      }
    }
  }

  // Search records
  if (searchType === "all" || searchType === "records") {
    const { data: records } = await supabase
      .from("records")
      .select("id, title, category, content, tags")
      .eq("user_id", userId)
      .gte("created_at", cutoff)
      .ilike("title", `%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (records) {
      for (const r of records) {
        results.push({
          type: "record",
          id: r.id,
          title: r.title,
          details: r.category ?? undefined,
        });
      }
    }
  }

  return {
    success: true,
    data: { count: results.length, results },
  };
}

async function createHabit(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name: args.name as string,
      description: (args.description as string) ?? null,
      icon: (args.icon as string) ?? "✅",
      color: (args.color as string) ?? "green",
    })
    .select("id, name, description, icon, color")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function logHabit(
  args: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolResult> {
  const habitId = args.habit_id as string;
  const loggedDate =
    (args.logged_date as string) ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("habit_logs")
    .insert({
      habit_id: habitId,
      user_id: userId,
      logged_date: loggedDate,
      note: (args.note as string) ?? null,
      value: (args.value as number) ?? 1,
    })
    .select("id, habit_id, logged_date, note, value")
    .single();

  if (error) return { success: false, error: error.message };

  // Calculate current streak
  const streak = await calculateStreak(supabase, habitId);

  return {
    success: true,
    data: { ...data, current_streak: streak },
  };
}

async function calculateStreak(
  supabase: SupabaseClient<Database>,
  habitId: string,
): Promise<number> {
  // Get recent logs ordered by date descending
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("logged_date")
    .eq("habit_id", habitId)
    .order("logged_date", { ascending: false })
    .limit(365);

  if (!logs || logs.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [...new Set(logs.map((l) => l.logged_date))];

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (uniqueDates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
