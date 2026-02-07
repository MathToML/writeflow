-- Normalize all-day events to noon UTC to prevent timezone day-shift.
-- Existing all-day events may be stored as midnight UTC or local-midnight-converted-to-UTC.
-- This migration extracts the UTC date and sets time to 12:00:00 UTC.
UPDATE public.events
SET start_at = date_trunc('day', start_at) + interval '12 hours'
WHERE is_all_day = true;
