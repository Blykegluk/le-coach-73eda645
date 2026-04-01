-- Make chat-uploads bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-uploads';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Chat files are publicly viewable" ON storage.objects;

-- Users can only view their own uploaded files
CREATE POLICY "Users can view their own chat files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Exercise images remain publicly viewable
CREATE POLICY "Exercise images are publicly viewable"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = 'exercise-images'
);