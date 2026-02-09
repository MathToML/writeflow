-- Create task-attachments bucket for file uploads on task notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', false, 5242880,
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

-- RLS: {user_id}/... path convention
CREATE POLICY "Users upload own task attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own task attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own task attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
