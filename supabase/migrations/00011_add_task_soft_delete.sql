-- Soft delete support for tasks
ALTER TABLE public.tasks ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted tasks
CREATE INDEX idx_tasks_deleted_at ON public.tasks (deleted_at) WHERE deleted_at IS NULL;
