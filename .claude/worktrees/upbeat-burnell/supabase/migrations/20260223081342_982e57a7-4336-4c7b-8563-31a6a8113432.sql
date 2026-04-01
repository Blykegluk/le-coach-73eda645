-- Make exercise images publicly readable
CREATE POLICY "Exercise images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = 'exercise-images');