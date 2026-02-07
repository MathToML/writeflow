import { createClient } from "@/lib/supabase/server";
import TasksPageClient from "./TasksPageClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: pendingTasks }, { data: completedTasks }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .in("status", ["pending", "in_progress"])
      .order("importance", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <TasksPageClient
      pendingTasks={pendingTasks ?? []}
      completedTasks={completedTasks ?? []}
    />
  );
}
