-- Fix Supabase Storage RLS for badge uploads
-- Run this in Supabase Dashboard → SQL Editor

-- Option 1: Disable RLS on badge-art bucket (simplest)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'badge-art';

-- Option 2: Add RLS policies (more secure)
-- Allows service role to upload
CREATE POLICY "Allow service role uploads" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'badge-art');

-- Allows everyone to read (since bucket is public)
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'badge-art');

-- Allows service role to update
CREATE POLICY "Allow service role updates" ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id = 'badge-art');

-- Allows service role to delete
CREATE POLICY "Allow service role deletes" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'badge-art');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%badge-art%';
