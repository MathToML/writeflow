import { inngest } from "../client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runAgent } from "@/lib/ai/agent";
import { dumpsToGeminiHistory } from "@/lib/ai/history";
import type { Json } from "@/types/database";

export const handleAutoProceed = inngest.createFunction(
  { id: "auto-proceed-question" },
  { event: "ai/auto-proceed" },
  async ({ event, step }) => {
    const { pendingQuestionId, userId, timezone } = event.data as {
      pendingQuestionId: string;
      userId: string;
      dumpId: string;
      timezone: string;
    };

    // 1. Wait 2 minutes
    await step.sleep("wait-for-user", "2m");

    // 2. Check if still pending
    const pq = await step.run("check-status", async () => {
      const { data } = await supabaseAdmin
        .from("pending_questions")
        .select("status")
        .eq("id", pendingQuestionId)
        .single();
      return data;
    });

    if (!pq || pq.status !== "pending") {
      return { skipped: true };
    }

    // 3. Reconstruct history from today's dumps
    const history = await step.run("build-history", async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: dumps } = await supabaseAdmin
        .from("dumps")
        .select("raw_content, ai_analysis")
        .eq("user_id", userId)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: true });
      return dumpsToGeminiHistory(dumps ?? []);
    });

    // 4. Run agent with [AUTO_PROCEED]
    const result = await step.run("run-agent", async () => {
      const now = new Date();
      const currentDateTime = now
        .toLocaleString("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "");

      // Create a placeholder dump for the auto-proceed message
      const { data: autoDump } = await supabaseAdmin
        .from("dumps")
        .insert({
          user_id: userId,
          type: "text" as const,
          raw_content: "[AUTO_PROCEED]",
        })
        .select("id")
        .single();

      const dumpId = autoDump?.id ?? "auto-proceed";

      const agentResult = await runAgent("[AUTO_PROCEED]", history, {
        userId,
        dumpId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabaseAdmin as any,
        timezone,
        currentDateTime,
      });

      // Update the dump with AI response
      if (autoDump?.id) {
        await supabaseAdmin
          .from("dumps")
          .update({
            ai_analysis: {
              response: agentResult.message,
              toolCalls: agentResult.toolCalls,
            } as unknown as Json,
          })
          .eq("id", autoDump.id);
      }

      return {
        message: agentResult.message,
        toolCalls: agentResult.toolCalls,
      };
    });

    // 5. Update pending question status
    await step.run("update-status", async () => {
      await supabaseAdmin
        .from("pending_questions")
        .update({
          status: "auto_proceeded",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", pendingQuestionId);
    });

    return { success: true, message: result.message };
  },
);
