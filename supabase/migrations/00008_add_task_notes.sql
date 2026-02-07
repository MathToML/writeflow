-- Add notes JSONB column to tasks for progress tracking
-- Format: [{"text": "...", "created_at": "ISO8601"}]
ALTER TABLE public.tasks ADD COLUMN notes jsonb DEFAULT '[]'::jsonb;
