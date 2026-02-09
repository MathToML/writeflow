import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Dump {
  id: string;
  raw_content: string;
  type: string;
  ai_analysis: Record<string, unknown> | null;
  created_at: string;
  media_url?: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dumps } = await supabase
    .from("dumps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Group by date
  const grouped: Record<string, Dump[]> = {};
  (dumps ?? []).forEach((dump) => {
    const date = new Date(dump.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(dump as Dump);
  });

  const TYPE_EMOJI: Record<string, string> = {
    event: "📅",
    task: "✅",
    record: "📝",
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">History</h1>

      {Object.keys(grouped).length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500">No history yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Try adding tasks, events, or notes from home
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateDumps]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-medium text-slate-500 sticky top-14 bg-slate-50 py-2 z-10">
              {date}
            </h2>
            <div className="space-y-2">
              {dateDumps.map((dump) => {
                const analysis = dump.ai_analysis as Record<string, unknown> | null;
                const classType = (analysis?.type as string) || "";
                const classTitle = (analysis?.title as string) || "";
                const emoji = TYPE_EMOJI[classType] || "💭";

                return (
                  <div
                    key={dump.id}
                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(dump.created_at).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              }
                            )}
                          </span>
                          {classType && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              {classType}
                            </span>
                          )}
                        </div>
                        {classTitle && (
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {classTitle}
                          </p>
                        )}
                        {dump.media_url && (
                          <img
                            src={dump.media_url}
                            alt="Attached image"
                            className="mt-2 max-w-[200px] rounded-lg border border-slate-200"
                          />
                        )}
                        <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">
                          {dump.raw_content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
