import { inngest } from "../client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const generateDailySummary = inngest.createFunction(
  { id: "generate-daily-summary" },
  { cron: "TZ=Asia/Seoul 0 0 * * *" },
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const yesterdayStart = `${yesterdayStr}T00:00:00+09:00`;
    const yesterdayEnd = `${yesterdayStr}T23:59:59+09:00`;

    // Get all users who had dumps yesterday
    const userIds = await step.run("get-active-users", async () => {
      const { data } = await supabaseAdmin
        .from("dumps")
        .select("user_id")
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd);

      const uniqueIds = [...new Set(data?.map((d) => d.user_id) ?? [])];
      return uniqueIds;
    });

    if (!userIds || userIds.length === 0) return { processed: 0 };

    for (const userId of userIds) {
      await step.run(`summary-${userId}`, async () => {
        // Get yesterday's dumps count
        const { count: dumpCount } = await supabaseAdmin
          .from("dumps")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", yesterdayStart)
          .lte("created_at", yesterdayEnd);

        // Get completed tasks count
        const { count: completedCount } = await supabaseAdmin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("deleted_at", null)
          .eq("status", "done")
          .gte("completed_at", yesterdayStart)
          .lte("completed_at", yesterdayEnd);

        await supabaseAdmin.from("daily_summaries").upsert(
          {
            user_id: userId,
            date: yesterdayStr,
            summary_text: `${dumpCount ?? 0} entries, ${completedCount ?? 0} tasks completed`,
            stats: {
              dumps: dumpCount ?? 0,
              completed: completedCount ?? 0,
            },
          },
          { onConflict: "user_id,date" }
        );
      });
    }

    return { processed: userIds.length };
  }
);
