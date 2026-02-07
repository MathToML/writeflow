import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateDailySummary } from "@/inngest/functions/dailySummary";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateDailySummary],
});
