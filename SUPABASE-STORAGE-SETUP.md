# Supabase Storage Setup Guide

## Required Storage Buckets

The application requires three storage buckets to be created in your Supabase project:

### 1. `avatars` Bucket
**Purpose:** Store user profile avatar images

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `avatars`
4. Public bucket: ✅ Yes
5. File size limit: 10 MB
6. Allowed MIME types: `image/*`

**Policies:**
```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "User Update Own Files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

### 2. `covers` Bucket
**Purpose:** Store user profile cover images

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `covers`
4. Public bucket: ✅ Yes
5. File size limit: 10 MB
6. Allowed MIME types: `image/*`

**Policies:**
```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "User Update Own Files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'covers' AND auth.role() = 'authenticated');
```

### 3. `badges` Bucket
**Purpose:** Store badge images and templates

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `badges`
4. Public bucket: ✅ Yes
5. File size limit: 10 MB
6. Allowed MIME types: `image/*`

**Policies:**
```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'badges');

-- Allow service role to upload (for badge creation)
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'badges');
```

## Quick Setup via SQL

Run this in your Supabase SQL Editor to create all policies at once:

```sql
-- Avatars bucket policies
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

-- Covers bucket policies
CREATE POLICY "covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "covers_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'covers');

CREATE POLICY "covers_authenticated_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'covers');

-- Badges bucket policies
CREATE POLICY "badges_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'badges');

CREATE POLICY "badges_service_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'badges');
```

## Testing Storage

After creating the buckets, test them with this cURL command:

```bash
# Replace with your actual Supabase URL and service key
SUPABASE_URL="https://your-project.supabase.co"
SERVICE_KEY="your-service-role-key"

# Test creating a signed upload URL
curl -X POST "$SUPABASE_URL/storage/v1/object/avatars/test.jpg/sign" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 300}'
```

Expected response:
```json
{
  "signedURL": "https://your-project.supabase.co/storage/v1/object/sign/avatars/test.jpg?token=..."
}
```

## Troubleshooting

### Error: "Storage bucket does not exist"
**Solution:** Create the bucket in Supabase Dashboard → Storage

### Error: "Permission denied"
**Solution:** 
1. Check that the bucket is set to "Public"
2. Verify storage policies are created (see SQL above)
3. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

### Error: "Failed to generate upload URL"
**Possible causes:**
1. Bucket doesn't exist
2. Invalid Supabase credentials
3. Storage policies not configured
4. Network/firewall issues

**Debug steps:**
1. Check Supabase Dashboard → Storage → Verify buckets exist
2. Check `.env.local` → Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Test with cURL command above
4. Check Supabase logs for detailed errors

## Environment Variables Required

```bash
# In .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## File Organization

Files are stored with this structure:
```
avatars/
  └── {fid}/
      └── avatar-{timestamp}.{ext}

covers/
  └── {fid}/
      └── cover-{timestamp}.{ext}

badges/
  └── {badge_id}/
      └── badge-{tier}-{timestamp}.{ext}
```

This organization:
- Keeps user files isolated by FID
- Prevents filename collisions with timestamps
- Makes it easy to find/delete user files
- Supports multiple file versions

## Security Notes

1. **Public Access**: Buckets are public because profile images need to be viewable by anyone
2. **Size Limits**: 10MB enforced at API level to prevent abuse
3. **File Types**: Only images allowed (`image/*`)
4. **Authentication**: Upload requires service role key (server-side only)
5. **Rate Limiting**: Upload endpoint is rate-limited to prevent spam

## Monitoring

Check storage usage in Supabase Dashboard:
- **Storage** → View total storage used
- **Logs** → Filter by "storage" to see upload/access logs
- **Settings** → Configure storage limits and billing alerts

## Backup Strategy

Consider setting up automated backups:
1. Use Supabase's built-in backup feature
2. Or sync to external storage (S3, Cloudflare R2, etc.)
3. Set retention policy based on legal requirements
