import { inngest } from "../client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export const handleScheduledMessage = inngest.createFunction(
  { id: "deliver-scheduled-message" },
  { event: "ai/schedule-message" },
  async ({ event, step }) => {
    const { scheduledMessageId, userId, message, deliverAt } = event.data as {
      scheduledMessageId: string;
      userId: string;
      message: string;
      deliverAt: string;
    };

    // 1. Sleep until delivery time
    const now = Date.now();
    const target = new Date(deliverAt).getTime();
    const sleepMs = Math.max(target - now, 0);

    if (sleepMs > 0) {
      await step.sleepUntil("wait-for-delivery", new Date(deliverAt));
    }

    // 2. Check if still pending (not cancelled)
    const sm = await step.run("check-status", async () => {
      const { data } = await supabaseAdmin
        .from("scheduled_messages")
        .select("status")
        .eq("id", scheduledMessageId)
        .single();
      return data;
    });

    if (!sm || sm.status !== "pending") {
      return { skipped: true };
    }

    // 3. Create dump with the scheduled message (triggers Realtime)
    await step.run("deliver-message", async () => {
      await supabaseAdmin.from("dumps").insert({
        user_id: userId,
        type: "text" as const,
        raw_content: "[SCHEDULED_MESSAGE]",
        ai_analysis: {
          response: message,
          toolCalls: [],
        } as unknown as Json,
      });

      // Update status
      await supabaseAdmin
        .from("scheduled_messages")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", scheduledMessageId);
    });

    // 4. Send push notification
    await step.run("send-push", async () => {
      const { sendPushNotification } = await import(
        "@/lib/firebase/sendNotification"
      );
      await sendPushNotification({
        userId,
        title: "OTTD",
        body: message.length > 100 ? message.slice(0, 97) + "..." : message,
      });
    });

    return { success: true };
  },
);
