import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ottd",
  isDev: process.env.NODE_ENV !== "production",
});
