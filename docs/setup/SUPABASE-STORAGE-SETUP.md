# Supabase Storage Setup - Profile Images

**Created**: December 5, 2025  
**Purpose**: Avatar and cover image upload for Edit Profile feature

## Storage Buckets Required

### 1. Avatars Bucket
- **Name**: `avatars`
- **Public**: Yes (read-only)
- **Max file size**: 10MB
- **Allowed types**: image/*
- **Path structure**: `{fid}/avatar-{timestamp}.{ext}`

### 2. Covers Bucket
- **Name**: `covers`
- **Public**: Yes (read-only)
- **Max file size**: 10MB
- **Allowed types**: image/*
- **Path structure**: `{fid}/cover-{timestamp}.{ext}`

## Setup Instructions

### Via Supabase Dashboard

1. Navigate to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Create `avatars` bucket:
   - Name: `avatars`
   - Public bucket: ✅ Enabled
   - File size limit: 10485760 bytes (10MB)
   - Allowed MIME types: `image/*`
4. Create `covers` bucket with same settings

### Via SQL (Alternative)

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create covers bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true);

-- Set up RLS policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Repeat for covers bucket
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'covers'
  AND auth.role() = 'authenticated'
);
```

## Current Implementation

### Files Created
1. **lib/storage/image-upload-service.ts** (165 lines)
   - `uploadImage()` - Upload to Supabase Storage
   - `deleteImage()` - Remove old images
   - `getImageUrl()` - Get public URL
   - Validation: file type, size (10MB max)

2. **app/api/storage/upload/route.ts** (100 lines)
   - POST endpoint for signed upload URLs
   - Rate limiting: 20/min
   - Authentication required
   - File validation (type, size)

3. **components/profile/ProfileEditModal.tsx** (UPDATED)
   - Replaced `https://placeholder.com` with real upload
   - Flow: Get signed URL → Upload file → Get public URL
   - Preview: Local preview + Supabase URL on success

### Environment Variables Required

```env
# Already configured in .env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Upload Flow

1. User selects image in ProfileEditModal
2. Client creates local preview (FileReader)
3. Client calls `/api/storage/upload` with metadata
4. Server generates signed upload URL (5min expiry)
5. Client uploads file directly to Supabase Storage
6. Server returns public URL
7. Public URL saved in profile (avatar_url or cover_image_url)

## Security Features

✅ **Client-side**:
- File type validation (image/* only)
- File size validation (10MB max)
- Preview before upload
- Error handling

✅ **Server-side**:
- Rate limiting (20 uploads/min)
- Authentication required
- Signed URLs (5min expiry)
- Unique filenames (FID + timestamp)

✅ **Storage-level**:
- Public read (anyone can view)
- Authenticated write (logged-in users only)
- Automatic overwrite (upsert: true)
- Cache-Control: 3600s (1 hour)

## Testing

### Manual Test
1. Go to `/profile/your-fid`
2. Click "Edit Profile" (owner only)
3. Upload avatar or cover image
4. Check preview appears immediately
5. Click "Save Changes"
6. Verify image updates in profile

### Check Storage
```sql
-- List all avatars
SELECT * FROM storage.objects WHERE bucket_id = 'avatars';

-- List all covers
SELECT * FROM storage.objects WHERE bucket_id = 'covers';

-- Check storage usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(LENGTH(metadata->>'size')::int) as total_bytes
FROM storage.objects
GROUP BY bucket_id;
```

## Troubleshooting

### Issue: Upload fails with 403
**Cause**: RLS policies not configured  
**Fix**: Run SQL policies above or enable in Dashboard

### Issue: Images not loading
**Cause**: Bucket not public  
**Fix**: Set `public: true` in bucket settings

### Issue: Upload URL expired
**Cause**: 5min expiry exceeded  
**Fix**: Request new signed URL, uploads are time-sensitive

## Future Enhancements

- [ ] Image transformation (resize, crop, optimize)
- [ ] CDN integration for faster loading
- [ ] Old image cleanup (delete previous avatar/cover)
- [ ] Direct upload from URL (paste image URL)
- [ ] Image moderation (NSFW detection)
- [ ] Storage quota per user (100MB limit)

## References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Signed Upload URLs](https://supabase.com/docs/guides/storage/uploads/signed-upload-urls)
- [RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
