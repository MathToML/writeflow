interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
  is_all_day?: boolean | null;
  recurrence_rule?: string | null;
}

export default function TodaySchedule({
  events,
  onEventClick,
}: {
  events: Event[];
  onEventClick?: (event: Event) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-sm text-slate-400 text-center">
          No events today
        </p>
      </div>
    );
  }

  const now = new Date();

  // Separate all-day and timed events
  const allDayEvents = events.filter((e) => e.is_all_day);
  const timedEvents = events.filter((e) => !e.is_all_day);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-500 px-1">Today&apos;s Schedule</h3>
      <div className="space-y-1.5">
        {/* All-day events */}
        {allDayEvents.map((event) => {
          const isCancelled = event.status === "cancelled";
          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                onEventClick ? "cursor-pointer" : ""
              } ${
                isCancelled
                  ? "bg-slate-50 opacity-50 line-through"
                  : "bg-blue-50 border border-blue-100 hover:bg-blue-100/50"
              }`}
            >
              <span className="text-xs font-medium text-blue-500 w-14 shrink-0">
                All day
              </span>
              <span className={`text-sm ${isCancelled ? "text-slate-400" : "text-slate-800"}`}>
                {event.title}
              </span>
            </div>
          );
        })}

        {/* Timed events */}
        {timedEvents.map((event) => {
          const startTime = new Date(event.start_at);
          const isPast = startTime < now;
          const isCancelled = event.status === "cancelled";

          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                onEventClick ? "cursor-pointer" : ""
              } ${
                isCancelled
                  ? "bg-slate-50 opacity-50 line-through"
                  : isPast
                  ? "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  : "bg-white border border-slate-100 shadow-sm hover:shadow-md"
              }`}
            >
              <span className="text-xs font-mono text-slate-500 w-14 shrink-0">
                {startTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <span
                className={`text-sm ${isPast ? "text-slate-400" : "text-slate-800"}`}
              >
                {event.title}
              </span>
              {isPast && !isCancelled && (
                <span className="text-xs text-green-500 ml-auto">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
