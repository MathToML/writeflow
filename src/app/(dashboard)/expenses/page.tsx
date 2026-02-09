import { createClient } from "@/lib/supabase/server";
import ExpensesPageClient from "./ExpensesPageClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { data: expenses } = await supabase
    .from("records")
    .select("id, title, content, tags, occurred_at, created_at")
    .eq("user_id", user.id)
    .eq("category", "expense")
    .gte("occurred_at", monthStart.toISOString())
    .lte("occurred_at", monthEnd.toISOString())
    .order("occurred_at", { ascending: false });

  return (
    <ExpensesPageClient
      expenses={expenses ?? []}
      currentMonth={now.toISOString()}
    />
  );
}
