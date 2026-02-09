import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Register FCM token
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = (await request.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Upsert: if (user_id, token) already exists, update timestamp
  const { error } = await supabaseAdmin.from("fcm_tokens").upsert(
    {
      user_id: user.id,
      token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Delete FCM token (opt-out)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = (await request.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  await supabaseAdmin
    .from("fcm_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  return NextResponse.json({ success: true });
}
