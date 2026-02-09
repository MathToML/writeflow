import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateDailySummary } from "@/inngest/functions/dailySummary";
import { handleAutoProceed } from "@/inngest/functions/autoProceed";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateDailySummary, handleAutoProceed],
});
