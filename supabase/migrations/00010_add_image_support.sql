-- Add media_url column to dumps for image storage
ALTER TABLE public.dumps ADD COLUMN media_url text;

-- Create storage bucket for dump images (private, 5MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dump-images',
  'dump-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage RLS policies
-- Path convention: dump-images/{user_id}/{dump_id}.{ext}
CREATE POLICY "Users can upload own dump images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dump-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own dump images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dump-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own dump images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dump-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
