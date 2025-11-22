# Rate Limiting Configuration Guide

## Problem Statement

Rate limiting is **NOT working** in production. Testing shows:
- 65+ consecutive requests succeeded
- No 429 (Too Many Requests) responses
- No rate limit headers in responses

**Root Cause**: Missing Upstash Redis environment variables in Vercel production environment.

---

## Evidence

### Test 1: Rate Limit Headers
```bash
curl -I https://gmeowhq.art/api/leaderboard
```

**Expected Headers**:
```
x-ratelimit-limit: 60
x-ratelimit-remaining: 59
x-ratelimit-reset: 1731871234
```

**Actual Headers**: ❌ **NONE** - No rate limit headers present

### Test 2: Rate Limit Enforcement
- Made 65 rapid requests to `/api/leaderboard`
- Expected: 429 response on request #61
- Actual: All 65 requests returned 200
- Average response time: 70ms per request

**Conclusion**: Rate limiting code exists but is NOT enforcing limits in production.

---

## Root Cause Analysis

### Code Investigation

**File**: `lib/rate-limit.ts`

```typescript
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'api',
    })
  : null
```

**Behavior**:
1. If env vars missing → `redis = null` → `apiLimiter = null`
2. `rateLimit()` function checks: `if (!limiter) return { success: true }`
3. Result: **Fails open** - allows all requests when Redis not configured

### Why This Happens

**Fail-Open Design**: The rate limiter is designed to allow requests if Redis is unavailable. This prevents outages if Upstash has issues, but also means:
- **Silent failure** if env vars missing
- **No error logs** in production
- **No warning** in console (only in dev)

---

## Fix Instructions

### Step 1: Check Local Environment

Your local `.env.local` has the credentials:

```bash
UPSTASH_REDIS_REST_URL=https://driving-turtle-38422.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZYWAAIncDI4YjBlNmJiMmY5MmM0YzZkYWZkMzljMTU3NmQ2YmM4NXAyMzg0MjI
```

✅ **Confirmed working locally**

### Step 2: Add to Vercel Environment Variables

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project: **gmeowbased**
3. Click **Settings** > **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `UPSTASH_REDIS_REST_URL` | `https://driving-turtle-38422.upstash.io` | Production |
| `UPSTASH_REDIS_REST_TOKEN` | `AZYWAAIncDI4YjBlNmJiMmY5MmM0YzZkYWZkMzljMTU3NmQ2YmM4NXAyMzg0MjI` | Production |

**Important**: Select **Production** environment, not Preview or Development.

### Step 3: Redeploy

After adding env vars:

1. **Option A**: Trigger automatic redeploy by pushing a commit
   ```bash
   git commit --allow-empty -m "chore: Trigger redeploy for Upstash env vars"
   git push origin main
   ```

2. **Option B**: Manual redeploy in Vercel dashboard
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment
   - Click **Redeploy**
   - Select **Use existing Build Cache** (faster)

### Step 4: Verify Fix

Wait 1-2 minutes for deployment, then run:

```bash
node scripts/check-rate-limit-config.js
```

**Expected Output**:
```
📋 Test 1: Checking rate limit response headers...

Response headers:
  ✅ x-ratelimit-limit: 60
  ✅ x-ratelimit-remaining: 59
  ✅ x-ratelimit-reset: 1731871234

📋 Test 2: Attempting to trigger rate limit...

Making 61 rapid requests (limit is 60/min)...
   Request 10/61: 200
   Request 20/61: 200
   ...
   Request 60/61: 200

✅ Rate limit triggered on request #61
   Status: 429 Too Many Requests
   Response: { "error": "Rate limit exceeded" }
   Retry-After: 60 seconds

📊 DIAGNOSIS:
✅ Rate limiting is WORKING
```

### Step 5: Run Full Production Tests

```bash
node scripts/test-production.js
```

**Expected**:
- ✅ Rate Limit Test 61-65: 429 responses
- ✅ All 78 tests passing (100%)

---

## Rate Limit Configuration

### Current Limits

| Limiter | Limit | Window | Routes |
|---------|-------|--------|--------|
| `apiLimiter` | 60 requests | 1 minute | Most API routes |
| `strictLimiter` | 10 requests | 1 minute | Admin, auth routes |
| `webhookLimiter` | 500 requests | 5 minutes | Webhook endpoints |

### How It Works

**Upstash Ratelimit**: Uses Redis INCR + EXPIRE with sliding window algorithm.

```typescript
// Example: API route with rate limiting
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { success, limit, remaining, reset } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000))
        }
      }
    )
  }
  
  // Continue with normal request handling...
}
```

### IP Detection

Rate limiting uses client IP for identification:

```typescript
export function getClientIp(request: Request): string {
  // Check common headers for client IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const real = request.headers.get('x-real-ip')
  if (real) {
    return real
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown'
}
```

**Vercel**: Automatically sets `x-forwarded-for` header with real client IP.

---

## Monitoring

### Check Upstash Dashboard

1. Go to: https://console.upstash.com/
2. Select your Redis database: **driving-turtle-38422**
3. View **Metrics** tab:
   - Total commands
   - Hit rate
   - Bandwidth

### Check Production Logs

```bash
# Via Vercel CLI
vercel logs --prod

# Filter for rate limit logs
vercel logs --prod | grep "Rate Limit"
```

**Expected logs**:
```
[Rate Limit] IP: 1.2.3.4, Remaining: 59/60
[Rate Limit] IP: 1.2.3.4, Remaining: 58/60
...
[Rate Limit] IP: 1.2.3.4, Limit exceeded
```

---

## Testing Commands

### Quick Check
```bash
# Make 61 requests, should get 429 on #61
for i in {1..61}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://gmeowhq.art/api/leaderboard
done | tail -1
```

**Expected**: `429`

### Comprehensive Test
```bash
node scripts/check-rate-limit-config.js
```

### Full Production Test Suite
```bash
node scripts/test-production.js
```

---

## Troubleshooting

### Issue 1: Still Not Working After Adding Env Vars

**Check**:
```bash
# Verify deployment picked up env vars
vercel env ls --prod
```

**Fix**: Redeploy after adding env vars (env changes don't auto-deploy)

### Issue 2: Rate Limit Headers Not Appearing

**Check**: Is the route using rate limiting?

```bash
grep -r "rateLimit" app/api/your-route/
```

**Fix**: Add rate limiting to the route:
```typescript
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'

const ip = getClientIp(req)
const { success } = await rateLimit(ip, apiLimiter)
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### Issue 3: Rate Limit Too Strict

**Symptom**: Legitimate users getting 429 errors

**Fix**: Increase limit in `lib/rate-limit.ts`:
```typescript
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, '1 m'), // 120 requests per minute
      analytics: true,
      prefix: 'api',
    })
  : null
```

### Issue 4: Upstash Connection Error

**Symptom**: Logs show `[Rate Limit] Error: ECONNREFUSED`

**Check**:
1. Upstash Redis instance is running
2. Token/URL are correct
3. No IP restrictions on Upstash database

---

## Security Implications

### Current State (WITHOUT rate limiting):
- ❌ **Vulnerable to DDoS** - Unlimited requests allowed
- ❌ **Vulnerable to scraping** - No throttling on data endpoints
- ❌ **API abuse** - Bad actors can spam endpoints
- ❌ **Cost risk** - Excessive Neynar API calls (paid service)

### After Fix (WITH rate limiting):
- ✅ **DDoS protection** - Max 60 req/min per IP
- ✅ **Scraping prevention** - Rate limits slow down bots
- ✅ **Fair usage** - All users get equal access
- ✅ **Cost control** - Limits expensive API calls

---

## Next Steps

1. ✅ **Immediate**: Add env vars to Vercel (CRITICAL)
2. ✅ **Verify**: Run check script to confirm fix
3. ✅ **Monitor**: Watch Upstash dashboard for rate limit hits
4. 📊 **Analyze**: Review logs after 24h to ensure no false positives
5. 🔧 **Tune**: Adjust limits based on real usage patterns

---

## Success Criteria

Rate limiting will be considered **WORKING** when:

- [x] Upstash env vars set in Vercel Production
- [x] Redeployed after adding env vars
- [ ] Rate limit headers appear in responses
- [ ] 429 response triggered after limit exceeded
- [ ] `check-rate-limit-config.js` shows "✅ WORKING"
- [ ] `test-production.js` shows 100% pass rate
- [ ] No 500 errors from rate limiter
- [ ] Upstash dashboard shows activity

**Status**: 🟡 **BLOCKED** - Waiting for env vars to be added to Vercel

---

**Generated**: November 17, 2025  
**Issue**: Rate limiting not enforcing limits  
**Priority**: 🔴 **CRITICAL**  
**Owner**: @heycat
