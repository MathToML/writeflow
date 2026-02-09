import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/Navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    userName = profile?.name || user.email?.split("@")[0];
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation userName={userName} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
