import { getAdminMessaging } from "./admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification({
  userId,
  title,
  body,
  url,
}: SendPushOptions): Promise<void> {
  const { data: tokens } = await supabaseAdmin
    .from("fcm_tokens")
    .select("token")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) return;

  const messaging = getAdminMessaging();
  const staleTokens: string[] = [];

  for (const { token } of tokens) {
    try {
      await messaging.send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            tag: "ottd-notification",
            renotify: true,
          },
          fcmOptions: {
            link: url ?? "/",
          },
        },
      });
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code: string }).code
          : "";
      // Remove stale/invalid tokens
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        staleTokens.push(token);
      }
    }
  }

  // Clean up stale tokens
  if (staleTokens.length > 0) {
    await supabaseAdmin
      .from("fcm_tokens")
      .delete()
      .eq("user_id", userId)
      .in("token", staleTokens);
  }
}
