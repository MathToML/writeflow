// RRULE parser and occurrence expander for Google Calendar-compatible recurrence
//
// Supported RRULE properties:
//   FREQ: DAILY, WEEKLY, MONTHLY, YEARLY
//   INTERVAL: number (default 1)
//   BYDAY: MO,TU,WE,TH,FR,SA,SU
//   BYMONTHDAY: 1-31
//   COUNT: max occurrences
//   UNTIL: end date (ISO or YYYYMMDD)

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

interface RRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byDay: number[] | null;
  byMonthDay: number[] | null;
  count: number | null;
  until: Date | null;
}

export function parseRRule(rule: string): RRule | null {
  // Strip "RRULE:" prefix if present
  const raw = rule.replace(/^RRULE:/i, "");
  const parts = raw.split(";");
  const map: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) map[key.toUpperCase()] = value;
  }

  const freq = map.FREQ as RRule["freq"];
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
    return null;
  }

  const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1;

  let byDay: number[] | null = null;
  if (map.BYDAY) {
    byDay = map.BYDAY.split(",")
      .map((d) => DAY_MAP[d.toUpperCase()])
      .filter((n) => n !== undefined);
  }

  let byMonthDay: number[] | null = null;
  if (map.BYMONTHDAY) {
    byMonthDay = map.BYMONTHDAY.split(",").map((d) => parseInt(d, 10));
  }

  const count = map.COUNT ? parseInt(map.COUNT, 10) : null;

  let until: Date | null = null;
  if (map.UNTIL) {
    // Support YYYYMMDD or ISO format
    if (map.UNTIL.length === 8) {
      const y = map.UNTIL.slice(0, 4);
      const m = map.UNTIL.slice(4, 6);
      const d = map.UNTIL.slice(6, 8);
      until = new Date(`${y}-${m}-${d}T23:59:59`);
    } else {
      until = new Date(map.UNTIL);
    }
  }

  return { freq, interval, byDay, byMonthDay, count, until };
}

export interface ExpandedOccurrence {
  date: Date;
  isAllDay: boolean;
  originalStartAt: string;
  originalEndAt: string | null;
}

// Expand a recurring event into occurrences within a date range
export function expandRecurrences(
  startAt: string,
  endAt: string | null,
  isAllDay: boolean,
  recurrenceRule: string,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 200,
): ExpandedOccurrence[] {
  const rrule = parseRRule(recurrenceRule);
  if (!rrule) return [];

  const eventStart = new Date(startAt);
  const occurrences: ExpandedOccurrence[] = [];
  let generated = 0;

  // For WEEKLY+BYDAY, generate by iterating days
  if (rrule.freq === "WEEKLY" && rrule.byDay && rrule.byDay.length > 0) {
    const cursor = new Date(eventStart);
    // Start from the beginning of the week containing eventStart
    cursor.setDate(cursor.getDate() - cursor.getDay());

    while (cursor <= rangeEnd && generated < maxOccurrences) {
      if (rrule.until && cursor > rrule.until) break;
      if (rrule.count !== null && generated >= rrule.count) break;

      for (const dayNum of rrule.byDay) {
        const occurrence = new Date(cursor);
        occurrence.setDate(cursor.getDate() + dayNum);

        if (occurrence < eventStart) continue;
        if (occurrence > rangeEnd) break;
        if (rrule.until && occurrence > rrule.until) break;
        if (rrule.count !== null && generated >= rrule.count) break;

        if (occurrence >= rangeStart) {
          // Copy time from original event
          occurrence.setHours(
            eventStart.getHours(),
            eventStart.getMinutes(),
            eventStart.getSeconds(),
          );
          occurrences.push({
            date: new Date(occurrence),
            isAllDay,
            originalStartAt: startAt,
            originalEndAt: endAt,
          });
        }
        generated++;
      }

      // Advance by interval weeks
      cursor.setDate(cursor.getDate() + 7 * rrule.interval);
    }
  }
  // DAILY
  else if (rrule.freq === "DAILY") {
    const cursor = new Date(eventStart);
    while (cursor <= rangeEnd && generated < maxOccurrences) {
      if (rrule.until && cursor > rrule.until) break;
      if (rrule.count !== null && generated >= rrule.count) break;

      if (cursor >= rangeStart) {
        occurrences.push({
          date: new Date(cursor),
          isAllDay,
          originalStartAt: startAt,
          originalEndAt: endAt,
        });
      }
      generated++;
      cursor.setDate(cursor.getDate() + rrule.interval);
    }
  }
  // WEEKLY (no BYDAY — repeat on same weekday as start)
  else if (rrule.freq === "WEEKLY") {
    const cursor = new Date(eventStart);
    while (cursor <= rangeEnd && generated < maxOccurrences) {
      if (rrule.until && cursor > rrule.until) break;
      if (rrule.count !== null && generated >= rrule.count) break;

      if (cursor >= rangeStart) {
        occurrences.push({
          date: new Date(cursor),
          isAllDay,
          originalStartAt: startAt,
          originalEndAt: endAt,
        });
      }
      generated++;
      cursor.setDate(cursor.getDate() + 7 * rrule.interval);
    }
  }
  // MONTHLY
  else if (rrule.freq === "MONTHLY") {
    const cursor = new Date(eventStart);
    const targetDays = rrule.byMonthDay ?? [eventStart.getDate()];

    while (cursor <= rangeEnd && generated < maxOccurrences) {
      if (rrule.until && cursor > rrule.until) break;
      if (rrule.count !== null && generated >= rrule.count) break;

      for (const day of targetDays) {
        const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), day);
        occurrence.setHours(
          eventStart.getHours(),
          eventStart.getMinutes(),
          eventStart.getSeconds(),
        );

        // Skip invalid dates (e.g. Feb 31)
        if (occurrence.getDate() !== day) continue;
        if (occurrence < eventStart) continue;
        if (occurrence > rangeEnd) break;
        if (rrule.until && occurrence > rrule.until) break;
        if (rrule.count !== null && generated >= rrule.count) break;

        if (occurrence >= rangeStart) {
          occurrences.push({
            date: new Date(occurrence),
            isAllDay,
            originalStartAt: startAt,
            originalEndAt: endAt,
          });
        }
        generated++;
      }

      cursor.setMonth(cursor.getMonth() + rrule.interval);
    }
  }
  // YEARLY
  else if (rrule.freq === "YEARLY") {
    const cursor = new Date(eventStart);
    while (cursor <= rangeEnd && generated < maxOccurrences) {
      if (rrule.until && cursor > rrule.until) break;
      if (rrule.count !== null && generated >= rrule.count) break;

      if (cursor >= rangeStart) {
        occurrences.push({
          date: new Date(cursor),
          isAllDay,
          originalStartAt: startAt,
          originalEndAt: endAt,
        });
      }
      generated++;
      cursor.setFullYear(cursor.getFullYear() + rrule.interval);
    }
  }

  return occurrences;
}

// Format RRULE to human-readable English text
export function rruleToKorean(rule: string): string {
  const rrule = parseRRule(rule);
  if (!rrule) return "";

  const dayNames: Record<number, string> = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
  };

  let text = "";

  if (rrule.freq === "DAILY") {
    text = rrule.interval === 1 ? "Every day" : `Every ${rrule.interval} days`;
  } else if (rrule.freq === "WEEKLY") {
    const prefix = rrule.interval === 1 ? "Every week" : `Every ${rrule.interval} weeks`;
    if (rrule.byDay && rrule.byDay.length > 0) {
      const days = rrule.byDay.map((d) => dayNames[d]).join(", ");
      text = `${prefix} on ${days}`;
    } else {
      text = prefix;
    }
  } else if (rrule.freq === "MONTHLY") {
    const prefix = rrule.interval === 1 ? "Every month" : `Every ${rrule.interval} months`;
    if (rrule.byMonthDay && rrule.byMonthDay.length > 0) {
      text = `${prefix} on the ${rrule.byMonthDay.join(", ")}`;
    } else {
      text = prefix;
    }
  } else if (rrule.freq === "YEARLY") {
    text = rrule.interval === 1 ? "Every year" : `Every ${rrule.interval} years`;
  }

  return text;
}
