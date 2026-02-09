import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateDailySummary } from "@/inngest/functions/dailySummary";
import { handleAutoProceed } from "@/inngest/functions/autoProceed";
import { handleScheduledMessage } from "@/inngest/functions/scheduleMessage";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateDailySummary, handleAutoProceed, handleScheduledMessage],
});
