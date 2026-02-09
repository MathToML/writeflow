-- Add occurred_at column to records for tracking actual event dates (e.g. receipt date)
ALTER TABLE public.records
  ADD COLUMN occurred_at timestamptz;

-- Partial index for expense queries: filter by category + sort by occurred_at
CREATE INDEX idx_records_expense_occurred
  ON public.records(user_id, category, occurred_at DESC)
  WHERE category = 'expense';
