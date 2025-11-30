# Production Badge System Fix - November 19, 2025

## Issues Discovered

User FID 18139 attempted to stake for a badge and encountered **two critical production errors**:

### 1. Redis URL Contains Whitespace/Newlines
```
[Upstash Redis] The redis url contains whitespace or newline, which can cause errors!
[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!
[Cache] External cache GET error: o [UrlError]: Upstash Redis client was passed an invalid URL. 
You should pass a URL starting with https. Received: "https://driving-turtle-38422.upstash.io\n".
```

**Root Cause**: Environment variables in Vercel contain literal newline characters.

### 2. Badge Registry File Not Found
```
Failed to load badge registry: Error: ENOENT: no such file or directory, 
open '/var/task/planning/badge/badge-registry.json'
```

**Root Cause**: Vercel's serverless environment (`/var/task/`) doesn't include files from `planning/` directory.

---

## Fixes Applied

### Fix #1: Embedded Badge Registry (Commit 29a463c)

**Problem**: Filesystem reads don't work in Vercel's serverless environment.

**Solution**: Created `lib/badge-registry-data.ts` with embedded badge registry data.

**Files Changed**:
- ✅ Created: `lib/badge-registry-data.ts` - Embedded badge registry with all 5 badges
- ✅ Modified: `lib/badges.ts` - Replaced `readFileSync()` with `BADGE_REGISTRY` import
- ✅ Removed: Dependencies on `fs` and `path` modules

**Code Change**:
```typescript
// BEFORE (failed in production)
import { readFileSync } from 'fs'
import { join } from 'path'

const registryPath = join(process.cwd(), 'planning', 'badge', 'badge-registry.json')
const content = readFileSync(registryPath, 'utf-8')
const registry = JSON.parse(content)

// AFTER (works in production)
import { BADGE_REGISTRY } from '@/lib/badge-registry-data'

const registry = BADGE_REGISTRY
```

### Fix #2: Redis URL Whitespace Removal (Commit e5b007d)

**Problem**: Environment variables contain literal newline characters.

**Solution**: Added `.trim()` and `.replace(/[\r\n]/g, '')` to all Redis URL references.

**Files Changed**:
- ✅ Modified: `lib/rate-limit.ts` - Enhanced whitespace removal + logging
- ✅ Modified: `lib/cache.ts` - Added `.trim()` to URL checks

**Code Change**:
```typescript
// BEFORE (failed with whitespace)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// AFTER (removes all whitespace/newlines)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/[\r\n]/g, '')
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/[\r\n]/g, '')

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})
```

---

## ⚠️ REQUIRED: Update Vercel Environment Variables

The code now handles whitespace removal, but **you should still clean the environment variables in Vercel**:

### Steps:
1. Go to: https://vercel.com/[your-team]/gmeowhq-art/settings/environment-variables
2. Edit `UPSTASH_REDIS_REST_URL`:
   - Current value has a newline at the end
   - Remove any whitespace/newlines
   - Should be: `https://driving-turtle-38422.upstash.io` (no trailing whitespace)
3. Edit `UPSTASH_REDIS_REST_TOKEN`:
   - Remove any whitespace/newlines
   - Should be a clean token string
4. Edit `REDIS_URL` (if present):
   - Remove any whitespace/newlines
5. Click "Save" and **redeploy** the production environment

---

## Testing

### Before Fix:
```bash
curl -X POST "https://gmeowhq.art/api/badges/assign" \
  -H "Content-Type: application/json" \
  -d '{"fid": 18139, "badgeId": "neon-initiate"}'

# Result: {"error":"internal_error","message":"Internal server error"}
```

### After Fix (Once Vercel Env Vars Updated):
```bash
curl -X POST "https://gmeowhq.art/api/badges/assign" \
  -H "Content-Type: application/json" \
  -d '{"fid": 18139, "badgeId": "neon-initiate", "metadata": {"reason": "test"}}'

# Expected: {"success": true, "badge": {...}}
```

---

## Badge System Overview

### Available Badges (from registry):

| Badge ID | Name | Tier | Points Cost | Chain | Auto-Assign |
|----------|------|------|-------------|-------|-------------|
| `neon-initiate` | Neon Initiate | Common | 0 | Base | ✅ Yes (onboarding) |
| `pulse-runner` | Pulse Runner | Rare | 180 | Ink | ✅ Yes (Neynar score 0.3-0.5) |
| `signal-luminary` | Signal Luminary | Epic | 360 | Unichain | ✅ Yes (Neynar score 0.5-0.8) |
| `warp-navigator` | Warp Navigator | Legendary | 520 | Optimism | ✅ Yes (Neynar score 0.8-1.0) |
| `gmeow-vanguard` | Gmeow Vanguard | Mythic | 777 | Base | ✅ Yes (Neynar score ≥1.0) |

### API Endpoints:

#### POST /api/badges/assign
Manually assign a badge to a user.

**Request**:
```json
{
  "fid": 18139,
  "badgeId": "neon-initiate",
  "metadata": {
    "reason": "testing",
    "assignedBy": "manual"
  }
}
```

**Response**:
```json
{
  "success": true,
  "badge": {
    "id": "uuid",
    "fid": 18139,
    "badgeId": "neon-initiate",
    "badgeType": "neon_initiate",
    "tier": "common",
    "assignedAt": "2025-11-19T...",
    "minted": false
  }
}
```

#### GET /api/badges/user/{fid}
Get all badges for a user.

#### GET /api/user/points/{fid}
Get user's point balance.

---

## Deployment Timeline

- **2025-11-19 21:55 UTC**: User reported errors on FID 18139
- **2025-11-19 22:10 UTC**: Identified both root causes
- **2025-11-19 22:25 UTC**: Applied Fix #1 (badge registry) - Commit 29a463c
- **2025-11-19 22:40 UTC**: Applied Fix #2 (Redis whitespace) - Commit e5b007d
- **Next**: Update Vercel env vars and test

---

## Related Issues

- Stage 5.19a: Test execution progress (97/150 tests passing)
- Badge assignment required for onboarding completion testing
- User FID: 18139, Address: 0x8a3094e44577579d6f41F6214a86C250b7dBDC4e

---

## Next Steps

1. ✅ Code fixes deployed (commits 29a463c, e5b007d)
2. ⏳ **Update Vercel environment variables** (manual step required)
3. ⏳ Test badge assignment on production
4. ⏳ Verify cache functionality working
5. ⏳ Test with user FID 18139
6. ⏳ Continue Stage 5.19a test execution
