-- Create a storage bucket for chat uploads (photos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own chat files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view files (for displaying in chat)
CREATE POLICY "Chat files are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-uploads');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own chat files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);