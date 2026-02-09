"use client";

import { useMemo, useState } from "react";

interface HabitHeatmapProps {
  logs: { date: string; value: number; note?: string | null }[];
  color?: string;
  weeks?: number;
}

const COLOR_SCALES: Record<string, string[]> = {
  green: ["bg-slate-100", "bg-green-200", "bg-green-400", "bg-green-600", "bg-green-800"],
  blue: ["bg-slate-100", "bg-blue-200", "bg-blue-400", "bg-blue-600", "bg-blue-800"],
  purple: ["bg-slate-100", "bg-purple-200", "bg-purple-400", "bg-purple-600", "bg-purple-800"],
  orange: ["bg-slate-100", "bg-orange-200", "bg-orange-400", "bg-orange-600", "bg-orange-800"],
};

function getIntensity(value: number): number {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  if (value <= 4) return 3;
  return 4;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function HabitHeatmap({
  logs,
  color = "green",
  weeks = 16,
}: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
    note?: string | null;
  } | null>(null);

  const scale = COLOR_SCALES[color] ?? COLOR_SCALES.green;

  // Build grid data: 7 rows × N columns
  const grid = useMemo(() => {
    // Map date -> aggregated value & note
    const dateMap = new Map<string, { value: number; note: string | null }>();
    for (const log of logs) {
      const existing = dateMap.get(log.date);
      if (existing) {
        existing.value += log.value;
        if (log.note && !existing.note) existing.note = log.note;
      } else {
        dateMap.set(log.date, { value: log.value, note: log.note ?? null });
      }
    }

    // Calculate date range: end on today, start from `weeks` weeks ago (aligned to Monday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun
    // Grid ends on Saturday of this week
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek));

    const totalDays = weeks * 7;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    const columns: { date: string; value: number; note: string | null; row: number; col: number }[][] = [];

    for (let w = 0; w < weeks; w++) {
      const col: typeof columns[number] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = cellDate.toISOString().slice(0, 10);
        const entry = dateMap.get(dateStr);
        const isFuture = cellDate > today;
        col.push({
          date: dateStr,
          value: isFuture ? -1 : (entry?.value ?? 0),
          note: entry?.note ?? null,
          row: d,
          col: w,
        });
      }
      columns.push(col);
    }

    return columns;
  }, [logs, weeks]);

  return (
    <div className="relative">
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[13px] text-[9px] text-slate-400 leading-[13px] select-none"
            >
              {label}
            </div>
          ))}
        </div>
        {/* Grid */}
        {grid.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-0.5">
            {col.map((cell) => (
              <div
                key={cell.date}
                className={`w-[13px] h-[13px] rounded-sm ${
                  cell.value < 0
                    ? "bg-transparent"
                    : scale[getIntensity(cell.value)]
                }`}
                onMouseEnter={(e) => {
                  if (cell.value < 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    date: cell.date,
                    value: cell.value,
                    note: cell.note,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-slate-800 text-white rounded shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 4 }}
        >
          <div className="font-medium">{tooltip.date}</div>
          {tooltip.value > 0 ? (
            <div>
              {tooltip.value}x{tooltip.note ? ` — ${tooltip.note}` : ""}
            </div>
          ) : (
            <div className="text-slate-400">No activity</div>
          )}
        </div>
      )}
    </div>
  );
}
