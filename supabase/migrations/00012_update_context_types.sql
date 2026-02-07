-- Add new context_type values
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'computer';
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'phone';
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'home';
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'focus';
ALTER TYPE public.context_type ADD VALUE IF NOT EXISTS 'waiting';
