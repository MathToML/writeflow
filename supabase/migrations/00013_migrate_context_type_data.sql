-- Migrate old context_type values to new ones
UPDATE public.tasks SET context_type = 'computer' WHERE context_type = 'desk_work';
UPDATE public.tasks SET context_type = 'phone' WHERE context_type = 'communication';
UPDATE public.tasks SET context_type = 'errand' WHERE context_type = 'location_dependent';
