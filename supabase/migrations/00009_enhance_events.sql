-- Enhance events for Google Calendar compatibility
-- Add all-day flag, recurrence rule (RRULE), and recurring event reference

ALTER TABLE public.events ADD COLUMN is_all_day boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN recurrence_rule text;
ALTER TABLE public.events ADD COLUMN recurring_event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX idx_events_recurring ON public.events(recurring_event_id);
