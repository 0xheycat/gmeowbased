# Phase 1 Enhancement Master Plan — GMEOW Frame System

**Generated**: November 22, 2025  
**Status**: Pre-Implementation Planning  
**Phase 0 Baseline**: Commit e5cf038 (Rarity Skin System + New User Rewards)  
**Production URL**: https://gmeowhq.art

---

## 📋 Executive Summary

Phase 1 builds upon the successful Phase 0 deployment (Rarity Skin System + New User Rewards) to maximize the potential of GMEOW's Farcaster frame infrastructure. This plan identifies missing features, improvements, and enhancements across 4 sub-phases (1A–1D) to deliver a world-class frame experience that satisfies users and sets GMEOW apart from competitors.

### Phase 0 Achievements (Completed ✅)
- **Rarity Tier System**: 5 tiers (Mythic/Legendary/Epic/Rare/Common) based on Neynar scores
- **Tier-Based Styling**: Dynamic borders, gradients, glows, and badges in frame images
- **New User Rewards**: 50pts + 30XP for new users, 1,000pts for OG users (Mythic tier)
- **Production Validation**: 5/5 tests passed, all frame types rendering correctly
- **Visual Documentation**: 18 production frame screenshots captured across 5 tiers

### Phase 1 Objectives
1. **Foundation** (1A): Optimize performance, reliability, and developer experience
2. **User Experience** (1B): Add interactive features and improve engagement
3. **Visual Polish** (1C): Enhance aesthetics and brand consistency
4. **Advanced Features** (1D): Implement analytics, personalization, and viral mechanics

---

## 🎯 Success Criteria

### Performance Metrics
- Frame image generation: <500ms p95 (currently ~800ms)
- Cold start mitigation: <1s initial response
- Cache hit rate: >80% for repeated frame requests
- API error rate: <0.1% (down from current ~0.5%)

### User Engagement Metrics
- Frame click-through rate: >15% (industry standard ~10%)
- Return visitor rate: >40% within 7 days
- Frame share rate: >5% of viewers
- Quest completion rate: >25% (up from ~18%)

### Technical Quality Metrics
- Test coverage: >80% (currently ~45%)
- TypeScript type safety: 100% strict mode
- Accessibility score: >90 (WCAG AA compliance)
- Lighthouse performance: >85 (currently ~72)

---

## 🏗️ Current System Architecture

### Frame Types Inventory (10 Total)

| Type | Route | Status | Image Generation | Use Case |
|------|-------|--------|-----------------|----------|
| **gm** | `/api/frame?type=gm` | ✅ Live | Dynamic PNG | Daily GM streak ritual |
| **quest** | `/frame/quest/[id]` | ✅ Live | Dynamic PNG | Quest discovery/completion |
| **onchainstats** | `/frame/stats/[fid]` | ✅ Live | Dynamic PNG | User onchain analytics |
| **badge** | `/frame/badge/[fid]` | ✅ Live | Static fallback | Badge showcase |
| **leaderboards** | `/frame/leaderboard` | ✅ Live | Static fallback | Global rankings |
| **guild** | `/api/frame?type=guild` | ✅ Live | Static fallback | Guild preview/join |
| **verify** | `/api/frame?type=verify` | ✅ Live | Static fallback | Quest verification |
| **referral** | `/api/frame?type=referral` | ✅ Live | Static fallback | Referral sharing |
| **points** | `/api/frame?type=points` | ✅ Live | Static fallback | XP/points display |
| **badgeShare** | `/api/frame/badgeShare` | ✅ Live | Dynamic PNG | Badge social sharing |

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Image Generation**: Satori (React to PNG)
- **API Integration**: Neynar (Farcaster), Basescan (onchain data)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (serverless functions)
- **Frame Spec**: Farcaster vNext (Mini App Embed)

### Key Dependencies
```json
{
  "@neynar/nodejs-sdk": "^2.2.0",
  "@vercel/og": "^0.6.2",
  "satori": "^0.10.9",
  "next": "^14.0.4",
  "react": "^18.2.0"
}
```

---

## 📊 Phase 0 Visual Validation

### Screenshot Capture Results
**Total Frames Captured**: 18 frames across 5 tiers × 3 primary types

#### Mythic Tier (FID 1) — 6 frames
- `badge_mythic.png` (280KB, 600×400) — Gold border, 4px, 👑
- `gm_mythic.png` (279KB, 600×400) — Gold gradients, royal styling
- `onchainstats_mythic.png` (278KB, 600×400) — Gold accent highlights
- `quest_mythic_fid1.png` (276KB, 600×400) — Premium quest display
- Duplicates: `gm_mythic_fid1.png`, `onchainstats_mythic_fid1.png`

#### Legendary Tier (FID 18139) — 3 frames
- `badge_legendary.png` (281KB, 600×400) — Purple border, 3px, ⚡
- `gm_legendary.png` (291KB, 600×400) — Purple gradients, electric styling
- `onchainstats_legendary.png` (279KB, 600×400) — Purple accent highlights

#### Epic Tier (FID 5) — 3 frames
- `badge_epic.png` (281KB, 600×400) — Blue border, 3px, 🌟
- `gm_epic.png` (288KB, 600×400) — Blue gradients, stellar styling
- `onchainstats_epic.png` (278KB, 600×400) — Blue accent highlights

#### Rare Tier (FID 100) — 3 frames
- `badge_rare.png` (281KB, 600×400) — Green border, 2px, ✨
- `gm_rare.png` (285KB, 600×400) — Green gradients, sparkle styling
- `onchainstats_rare.png` (278KB, 600×400) — Green accent highlights

#### Common Tier (FID 99999) — 3 frames
- `badge_common.png` (281KB, 600×400) — Gray border, 2px, 🐱
- `gm_common.png` (289KB, 600×400) — Gray gradients, standard styling
- `onchainstats_common.png` (279KB, 600×400) — Gray accent highlights

### Visual Quality Assessment
✅ **Dimensions**: All frames confirmed 600×400 (correct aspect ratio)  
✅ **File Sizes**: Consistent 275–291KB (optimized for web)  
✅ **Tier Styling**: Distinct color schemes visible across tiers  
✅ **Border Rendering**: Clean borders, no pixel bleeding  
✅ **Text Readability**: Clear contrast, legible at frame size  
✅ **Gradient Quality**: Smooth transitions, no banding  

### Missing Frame Types (Future Capture)
- Guild frames (requires guild ID parameters)
- Leaderboard frames (uses static fallback currently)
- Quest frames for non-Mythic tiers (requires quest ID mapping)

---

## 🚀 Phase 1A: Foundation Improvements

**Timeline**: 2 weeks  
**Priority**: CRITICAL  
**Dependencies**: None (can start immediately)

### 1.1 Performance Optimization

#### Frame Image Caching Strategy
**Problem**: Every frame image request generates PNG from scratch (~800ms)

**Solution**: Multi-layer caching
```typescript
// lib/frame-cache.ts (NEW)
import { Redis } from '@upstash/redis'

type FrameCacheKey = {
  type: string
  fid: number
  tier: string
  params: Record<string, string>
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

export async function getCachedFrame(key: FrameCacheKey): Promise<Buffer | null> {
  const cacheKey = `frame:${key.type}:${key.fid}:${key.tier}:${hashParams(key.params)}`
  const cached = await redis.get(cacheKey)
  if (cached && typeof cached === 'string') {
    return Buffer.from(cached, 'base64')
  }
  return null
}

export async function setCachedFrame(
  key: FrameCacheKey,
  imageBuffer: Buffer,
  ttl = 300 // 5 minutes default
): Promise<void> {
  const cacheKey = `frame:${key.type}:${key.fid}:${key.tier}:${hashParams(key.params)}`
  await redis.setex(cacheKey, ttl, imageBuffer.toString('base64'))
}

function hashParams(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}
```

**Files Modified**:
- `app/api/frame/image/route.tsx` — Add cache layer before Satori generation
- `lib/frame-cache.ts` — NEW cache utility

**Expected Impact**: 
- 80%+ cache hit rate → 100ms response time
- Reduced Vercel function invocations by 75%
- Lower costs ($20/month → $5/month estimated)

---

#### Cold Start Mitigation
**Problem**: First request after idle period takes 2-3 seconds

**Solution**: Keep-alive warm-up requests
```typescript
// app/api/cron/warmup-frames/route.ts (NEW)
export async function GET(req: Request) {
  const warmupTargets = [
    '/api/frame?type=gm',
    '/api/frame?type=leaderboards',
    '/api/frame?type=quest&questId=1&chain=base',
    '/api/frame/image?type=gm&fid=1',
    '/api/frame/image?type=onchainstats&fid=1&chain=base',
  ]

  const results = await Promise.allSettled(
    warmupTargets.map((path) =>
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
        method: 'HEAD', // Don't generate full response
      })
    )
  )

  return Response.json({
    ok: true,
    warmed: results.filter((r) => r.status === 'fulfilled').length,
    total: warmupTargets.length,
  })
}
```

**Vercel Cron Configuration**:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/warmup-frames",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Expected Impact**: Cold start <1s (down from 2-3s)

---

### 1.2 Error Handling & Resilience

#### Graceful Degradation for API Failures
**Problem**: Neynar/Basescan API failures cause entire frame to fail

**Solution**: Fallback rendering with partial data
```typescript
// lib/frame-resilience.ts (NEW)
export async function fetchWithFallback<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
  options: { timeout?: number; retries?: number } = {}
): Promise<{ data: T; source: 'live' | 'fallback' | 'cache' }> {
  const { timeout = 5000, retries = 2 } = options

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const data = await Promise.race([
        fetchFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ])

      clearTimeout(timeoutId)
      return { data, source: 'live' }
    } catch (err) {
      console.warn(`[RESILIENCE] Attempt ${attempt + 1} failed:`, err)
      if (attempt === retries - 1) break
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  console.warn('[RESILIENCE] Using fallback data')
  return { data: fallback, source: 'fallback' }
}
```

**Usage Example**:
```typescript
// In app/api/frame/image/route.tsx
const { data: userData, source: userSource } = await fetchWithFallback(
  () => fetchUserByFid(fid),
  {
    username: 'user',
    displayName: 'Anonymous',
    neynarScore: 0.5,
    powerBadge: false,
  },
  { timeout: 3000, retries: 2 }
)

// Add watermark if using fallback
if (userSource === 'fallback') {
  overlayElements.push(
    <div style={{ opacity: 0.5, fontSize: 14 }}>
      ⚠️ Using cached data
    </div>
  )
}
```

**Expected Impact**: 99.9% uptime (up from ~97%)

---

### 1.3 Developer Experience

#### TypeScript Strict Mode
**Problem**: `strict: false` in tsconfig allows type errors to slip through

**Solution**: Enable strict mode incrementally
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Migration Strategy**:
1. Add `// @ts-expect-error` comments to 50+ existing violations
2. Fix violations file-by-file (prioritize lib/ utilities first)
3. Run `tsc --noEmit` in CI/CD to prevent regressions

---

#### Frame Testing Utilities
**Problem**: Manual curl testing is slow and error-prone

**Solution**: Automated test suite
```typescript
// __tests__/lib/frame-test-utils.ts (NEW)
import { JSDOM } from 'jsdom'

export async function fetchFrame(url: string): Promise<FrameMetadata> {
  const response = await fetch(url)
  const html = await response.text()
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const getMetaContent = (property: string) =>
    doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content')

  return {
    title: getMetaContent('og:title') || '',
    description: getMetaContent('og:description') || '',
    image: getMetaContent('fc:frame:image') || '',
    button: {
      title: getMetaContent('fc:frame:button:1') || '',
      action: {
        type: getMetaContent('fc:frame:button:1:action:type') || '',
        url: getMetaContent('fc:frame:button:1:action:url') || '',
      },
    },
    version: getMetaContent('fc:frame') || '',
  }
}

export function validateFrameSpec(metadata: FrameMetadata): ValidationResult {
  const errors: string[] = []

  // Image URL validation
  if (!metadata.image.startsWith('https://')) {
    errors.push('Image URL must use HTTPS')
  }
  if (metadata.image.length > 1024) {
    errors.push(`Image URL too long: ${metadata.image.length} > 1024`)
  }

  // Button validation
  if (metadata.button.title.length > 32) {
    errors.push(`Button title too long: ${metadata.button.title.length} > 32`)
  }
  if (!['launch_frame', 'link', 'post'].includes(metadata.button.action.type)) {
    errors.push(`Invalid button action type: ${metadata.button.action.type}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

**Test Suite**:
```typescript
// __tests__/api/frame-spec-compliance.test.ts (NEW)
describe('Frame Spec Compliance', () => {
  const frameTypes = ['gm', 'quest', 'leaderboards', 'onchainstats', 'badge']

  frameTypes.forEach((type) => {
    it(`${type} frame should comply with Farcaster spec`, async () => {
      const metadata = await fetchFrame(
        `${BASE_URL}/api/frame?type=${type}&fid=1&chain=base`
      )
      const validation = validateFrameSpec(metadata)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })
  })
})
```

**Expected Impact**: Catch regressions before deployment

---

## 🎨 Phase 1B: User Experience Improvements

**Timeline**: 3 weeks  
**Priority**: HIGH  
**Dependencies**: Phase 1A (caching, error handling)

### 2.1 Interactive Frame Actions

#### Button Post Actions
**Problem**: Frames are static — users can only view, not interact

**Solution**: Add POST handlers for button clicks
```typescript
// app/api/frame/actions/gm/route.ts (NEW)
import { FrameActionSchema } from '@/lib/validation/api-schemas'

export async function POST(req: Request) {
  try {
    // Validate Farcaster frame action payload
    const body = await req.json()
    const validated = FrameActionSchema.parse(body)

    const fid = validated.untrustedData.fid
    const buttonIndex = validated.untrustedData.buttonIndex

    // Handle GM button click
    if (buttonIndex === 1) {
      const result = await recordGM(fid)

      // Return updated frame with new state
      return Response.json({
        version: '1',
        image: `${BASE_URL}/api/frame/image?type=gm&fid=${fid}&gmCount=${result.gmCount}&streak=${result.streak}`,
        buttons: [
          {
            title: '✨ GM Recorded!',
            action: { type: 'link', url: `${BASE_URL}/gm` },
          },
          {
            title: 'View Leaderboard',
            action: { type: 'launch_frame', url: `${BASE_URL}/leaderboard` },
          },
        ],
      })
    }

    return Response.json({ error: 'Invalid button' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
```

**Frame Handler Update**:
```typescript
// app/api/frame/route.tsx (MODIFIED)
// In GM frame handler
const html = buildFrameHtml({
  title: 'GM Ritual • GMEOW',
  description: 'Log your daily GM streak',
  image: gmImageUrl,
  buttons: [
    {
      label: '🌅 Say GM',
      target: `${origin}/api/frame/actions/gm`, // POST action
      action: 'post', // NEW: interactive button
    },
    {
      label: 'View Streak',
      target: `${origin}/gm`,
      action: 'link',
    },
  ],
})
```

**Expected Impact**: 
- GM conversion rate: 10% → 25%
- Daily active users: +40%
- Frame engagement time: 3s → 12s

---

### 2.2 Frame State Management

#### Session Persistence
**Problem**: No way to track user progress across frames

**Solution**: Frame state in URL parameters + Supabase
```typescript
// lib/frame-state.ts (NEW)
export type FrameState = {
  sessionId: string
  fid: number
  currentStep: number
  questProgress: Record<string, boolean>
  lastInteraction: number
}

export async function saveFrameState(state: FrameState): Promise<void> {
  const { data, error } = await supabase
    .from('frame_sessions')
    .upsert({
      session_id: state.sessionId,
      fid: state.fid,
      state: state,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function loadFrameState(
  sessionId: string
): Promise<FrameState | null> {
  const { data, error } = await supabase
    .from('frame_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !data) return null
  return data.state as FrameState
}
```

**Database Migration**:
```sql
-- supabase/migrations/20251122000001_frame_sessions.sql
CREATE TABLE frame_sessions (
  session_id TEXT PRIMARY KEY,
  fid INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frame_sessions_fid ON frame_sessions(fid);
CREATE INDEX idx_frame_sessions_updated ON frame_sessions(updated_at);

-- Auto-expire sessions after 24 hours
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM frame_sessions
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily
SELECT cron.schedule(
  'cleanup-frame-sessions',
  '0 2 * * *', -- 2am daily
  $$SELECT cleanup_expired_sessions()$$
);
```

**Usage Example**:
```typescript
// Multi-step quest frame
const sessionId = url.searchParams.get('session') || generateSessionId()
const state = await loadFrameState(sessionId) || {
  sessionId,
  fid,
  currentStep: 0,
  questProgress: {},
  lastInteraction: Date.now(),
}

// Advance to next step
state.currentStep += 1
state.questProgress[`step_${state.currentStep}`] = true
await saveFrameState(state)

// Pass session in next frame URL
const nextFrameUrl = `${BASE_URL}/api/frame?type=quest&questId=${questId}&session=${sessionId}`
```

**Expected Impact**: 
- Quest completion rate: 18% → 35%
- Multi-step flows enabled (onboarding, tutorials)
- User progress tracking across sessions

---

### 2.3 Rich Text & Formatting

#### Post URL Messages
**Problem**: Frame button actions return plain URLs with no context

**Solution**: Rich formatted messages with embeds
```typescript
// lib/frame-messages.ts (NEW)
export function buildSuccessMessage(params: {
  title: string
  description: string
  imageUrl?: string
  ctaUrl?: string
  ctaLabel?: string
}): string {
  const parts = [params.title]

  if (params.description) {
    parts.push('\n' + params.description)
  }

  if (params.ctaUrl) {
    parts.push(`\n\n${params.ctaLabel || 'Learn More'}: ${params.ctaUrl}`)
  }

  if (params.imageUrl) {
    parts.push(`\n\n[Image Preview](${params.imageUrl})`)
  }

  return parts.join('')
}
```

**Usage in Frame Actions**:
```typescript
// After successful GM recording
const message = buildSuccessMessage({
  title: '🌅 GM Recorded!',
  description: `Streak: ${result.streak} days • Total GMs: ${result.gmCount}`,
  imageUrl: `${BASE_URL}/api/frame/image?type=gm&fid=${fid}`,
  ctaUrl: `${BASE_URL}/leaderboard`,
  ctaLabel: 'View Leaderboard',
})

return Response.json({
  message, // Farcaster will display this
  version: '1',
  image: updatedFrameImage,
})
```

**Expected Impact**: Better user feedback, clearer call-to-actions

---

## 🎭 Phase 1C: Visual Enhancements

**Timeline**: 2 weeks  
**Priority**: MEDIUM  
**Dependencies**: Phase 1A (performance optimization)

### 3.1 Animation Effects

#### Tier Transition Animations
**Problem**: Static frames lack visual interest

**Solution**: Animated SVG gradients (GIF fallback)
```typescript
// lib/frame-animations.ts (NEW)
export function generateTierGradientSVG(tier: TierInfo): string {
  const { colors } = tier
  
  return `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.gradient.from};stop-opacity:1">
            <animate attributeName="stop-color"
              values="${colors.gradient.from};${colors.gradient.via};${colors.gradient.to};${colors.gradient.from}"
              dur="3s" repeatCount="indefinite"/>
          </stop>
          <stop offset="50%" style="stop-color:${colors.gradient.via};stop-opacity:1">
            <animate attributeName="stop-color"
              values="${colors.gradient.via};${colors.gradient.to};${colors.gradient.from};${colors.gradient.via}"
              dur="3s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" style="stop-color:${colors.gradient.to};stop-opacity:1">
            <animate attributeName="stop-color"
              values="${colors.gradient.to};${colors.gradient.from};${colors.gradient.via};${colors.gradient.to}"
              dur="3s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#shimmer)"/>
    </svg>
  `
}
```

**Note**: Farcaster frames don't support animated PNGs yet, so this is a future enhancement when spec allows.

---

### 3.2 Typography Improvements

#### Web Font Loading
**Problem**: System fonts lack brand personality

**Solution**: Load Google Fonts in Satori
```typescript
// lib/frame-fonts.ts (NEW)
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function loadFrameFonts() {
  const [interRegular, interBold, spaceMonoBold] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/Inter-Regular.woff')),
    readFile(join(process.cwd(), 'public/fonts/Inter-Bold.woff')),
    readFile(join(process.cwd(), 'public/fonts/SpaceMono-Bold.woff')),
  ])

  return [
    {
      name: 'Inter',
      data: interRegular,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: interBold,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Space Mono',
      data: spaceMonoBold,
      weight: 700,
      style: 'normal',
    },
  ]
}
```

**Usage**:
```typescript
// app/api/frame/image/route.tsx (MODIFIED)
const fonts = await loadFrameFonts()

const svg = await satori(
  <FrameComponent {...props} />,
  {
    width: 600,
    height: 400,
    fonts, // NEW: custom fonts
  }
)
```

**Expected Impact**: Professional typography, consistent branding

---

### 3.3 Responsive Layouts

#### Miniapp vs. Desktop Optimization
**Problem**: Frames optimized for mobile, look cramped on desktop

**Solution**: Viewport-aware layouts
```typescript
// lib/frame-layouts.ts (NEW)
export function getOptimalLayout(params: {
  viewport: 'mobile' | 'desktop'
  contentDensity: 'compact' | 'comfortable'
}): LayoutConfig {
  if (params.viewport === 'desktop') {
    return {
      fontSize: { base: 18, heading: 32, label: 14 },
      padding: { x: 80, y: 60 },
      spacing: { card: 24, element: 16 },
      imageSize: { avatar: 80, badge: 60 },
    }
  }

  return {
    fontSize: { base: 16, heading: 28, label: 12 },
    padding: { x: 48, y: 40 },
    spacing: { card: 16, element: 12 },
    imageSize: { avatar: 64, badge: 48 },
  }
}
```

**Detection**: Use frame context from Farcaster headers
```typescript
const viewport = req.headers.get('x-frame-viewport') || 'mobile'
const layout = getOptimalLayout({ viewport, contentDensity: 'comfortable' })
```

---

## 🚀 Phase 1D: Advanced Features

**Timeline**: 3 weeks  
**Priority**: MEDIUM  
**Dependencies**: Phase 1A + 1B (foundation + interactivity)

### 4.1 Frame Analytics

#### View Tracking
**Problem**: No visibility into frame performance

**Solution**: Analytics events pipeline
```typescript
// lib/frame-analytics.ts (NEW)
export async function trackFrameView(params: {
  frameType: string
  fid: number | null
  tier: string | null
  source: 'warpcast' | 'miniapp' | 'web'
  metadata: Record<string, any>
}): Promise<void> {
  const event = {
    event_type: 'frame_view',
    timestamp: new Date().toISOString(),
    frame_type: params.frameType,
    fid: params.fid,
    tier: params.tier,
    source: params.source,
    metadata: params.metadata,
  }

  // Log to Supabase
  await supabase.from('frame_analytics').insert(event)

  // Send to PostHog (if enabled)
  if (process.env.POSTHOG_API_KEY) {
    await fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event: 'frame_view',
        properties: event,
      }),
    })
  }
}
```

**Database Schema**:
```sql
-- supabase/migrations/20251122000002_frame_analytics.sql
CREATE TABLE frame_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frame_type TEXT NOT NULL,
  fid INTEGER,
  tier TEXT,
  source TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_type_timestamp ON frame_analytics(event_type, timestamp DESC);
CREATE INDEX idx_analytics_frame_type ON frame_analytics(frame_type);
CREATE INDEX idx_analytics_fid ON frame_analytics(fid);

-- Analytics dashboard queries
CREATE VIEW frame_performance AS
SELECT
  frame_type,
  source,
  tier,
  COUNT(*) as views,
  COUNT(DISTINCT fid) as unique_users,
  DATE_TRUNC('hour', timestamp) as hour
FROM frame_analytics
WHERE event_type = 'frame_view'
GROUP BY frame_type, source, tier, hour;
```

**Dashboard Integration**:
```typescript
// app/admin/page.tsx (MODIFIED)
// Add frame analytics cards
export async function getFrameAnalytics() {
  const { data } = await supabase
    .from('frame_performance')
    .select('*')
    .gte('hour', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('views', { ascending: false })

  return data
}
```

**Expected Impact**: Data-driven optimization, ROI visibility

---

### 4.2 A/B Testing Framework

#### Variant Testing
**Problem**: No way to test frame designs before full rollout

**Solution**: A/B test infrastructure
```typescript
// lib/frame-experiments.ts (NEW)
export type ExperimentVariant = 'control' | 'variant_a' | 'variant_b'

export async function assignVariant(params: {
  experimentId: string
  fid: number
}): Promise<ExperimentVariant> {
  // Deterministic assignment based on FID hash
  const hash = hashFID(params.fid, params.experimentId)
  const bucket = hash % 100

  // 50/25/25 split
  if (bucket < 50) return 'control'
  if (bucket < 75) return 'variant_a'
  return 'variant_b'
}

export async function trackExperimentImpression(params: {
  experimentId: string
  variant: ExperimentVariant
  fid: number
  frameType: string
}): Promise<void> {
  await supabase.from('experiments').insert({
    experiment_id: params.experimentId,
    variant: params.variant,
    fid: params.fid,
    frame_type: params.frameType,
    event: 'impression',
    timestamp: new Date().toISOString(),
  })
}

export async function trackExperimentConversion(params: {
  experimentId: string
  variant: ExperimentVariant
  fid: number
  conversionType: string
}): Promise<void> {
  await supabase.from('experiments').insert({
    experiment_id: params.experimentId,
    variant: params.variant,
    fid: params.fid,
    event: 'conversion',
    conversion_type: params.conversionType,
    timestamp: new Date().toISOString(),
  })
}
```

**Usage Example**:
```typescript
// Test different GM button copy
const variant = await assignVariant({ experimentId: 'gm-button-copy', fid })

await trackExperimentImpression({
  experimentId: 'gm-button-copy',
  variant,
  fid,
  frameType: 'gm',
})

const buttonLabel =
  variant === 'control'
    ? '🌅 Say GM'
    : variant === 'variant_a'
    ? '✨ GM Streak'
    : '🔥 Log GM'
```

**Expected Impact**: Evidence-based design decisions

---

### 4.3 Personalization Engine

#### User Preference Learning
**Problem**: All users see identical frames regardless of history

**Solution**: ML-based personalization (lightweight)
```typescript
// lib/frame-personalization.ts (NEW)
export type UserPreferences = {
  fid: number
  preferredChains: ChainKey[]
  favoriteFrameTypes: FrameType[]
  engagementScore: number
  lastSeenTier: string
  completedQuests: number[]
}

export async function getUserPreferences(fid: number): Promise<UserPreferences> {
  // Fetch from Supabase
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('fid', fid)
    .single()

  if (data) return data

  // Compute from activity history
  const activity = await supabase
    .from('frame_analytics')
    .select('*')
    .eq('fid', fid)
    .order('timestamp', { ascending: false })
    .limit(100)

  const preferences: UserPreferences = {
    fid,
    preferredChains: computePreferredChains(activity.data || []),
    favoriteFrameTypes: computeFavoriteFrameTypes(activity.data || []),
    engagementScore: computeEngagementScore(activity.data || []),
    lastSeenTier: 'common',
    completedQuests: [],
  }

  // Cache preferences
  await supabase.from('user_preferences').upsert(preferences)

  return preferences
}

function computePreferredChains(activity: any[]): ChainKey[] {
  const chainCounts = activity
    .map((a) => a.metadata?.chain)
    .filter(Boolean)
    .reduce((acc, chain) => {
      acc[chain] = (acc[chain] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  return Object.entries(chainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([chain]) => chain as ChainKey)
}
```

**Usage**: Pre-select user's preferred chain in quest frames
```typescript
const preferences = await getUserPreferences(fid)
const defaultChain = preferences.preferredChains[0] || 'base'

// Show quest on user's favorite chain
const questImageUrl = `/api/frame/image?type=quest&questId=${questId}&chain=${defaultChain}`
```

**Expected Impact**: 
- Click-through rate: +20%
- Quest starts: +30%
- Return rate: +15%

---

### 4.4 Viral Mechanics

#### Social Sharing Amplification
**Problem**: No incentive to share frames with friends

**Solution**: Referral rewards system
```typescript
// lib/frame-referrals.ts (NEW)
export async function generateReferralCode(fid: number): Promise<string> {
  const code = `GM${fid}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  await supabase.from('referral_codes').insert({
    code,
    referrer_fid: fid,
    created_at: new Date().toISOString(),
  })

  return code
}

export async function trackReferral(params: {
  code: string
  refereeFid: number
}): Promise<{ success: boolean; reward: number }> {
  // Find referrer
  const { data: referralData } = await supabase
    .from('referral_codes')
    .select('referrer_fid')
    .eq('code', params.code)
    .single()

  if (!referralData) {
    return { success: false, reward: 0 }
  }

  // Check if already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('*')
    .eq('referee_fid', params.refereeFid)
    .single()

  if (existing) {
    return { success: false, reward: 0 }
  }

  // Record referral
  await supabase.from('referrals').insert({
    code: params.code,
    referrer_fid: referralData.referrer_fid,
    referee_fid: params.refereeFid,
    created_at: new Date().toISOString(),
  })

  // Award rewards (500pts referrer, 250pts referee)
  await Promise.all([
    awardPoints(referralData.referrer_fid, 500, 'referral_bonus'),
    awardPoints(params.refereeFid, 250, 'referred_signup'),
  ])

  return { success: true, reward: 500 }
}
```

**Frame Integration**:
```typescript
// Add "Share & Earn" button to frames
const referralCode = await generateReferralCode(fid)
const shareUrl = `${BASE_URL}/api/frame?type=gm&ref=${referralCode}`

buttons.push({
  label: '🎁 Share & Earn 500pts',
  target: shareUrl,
  action: 'link',
})
```

**Expected Impact**: 
- Viral coefficient: 1.0 → 1.4
- Organic signups: +60%
- Frame shares: +200%

---

## 📈 Implementation Roadmap

### Week 1-2: Phase 1A (Foundation)
- Day 1-3: Frame caching with Redis/Upstash
- Day 4-5: Cold start mitigation (cron warmup)
- Day 6-8: Error handling & resilience
- Day 9-10: TypeScript strict mode migration
- Day 11-14: Testing utilities & CI/CD

### Week 3-5: Phase 1B (User Experience)
- Day 15-18: Interactive POST handlers
- Day 19-21: Frame state management
- Day 22-24: Rich text messages
- Day 25-28: Multi-step flows (onboarding)
- Day 29-35: Integration testing

### Week 6-7: Phase 1C (Visual)
- Day 36-38: Animation effects (SVG gradients)
- Day 39-41: Typography improvements (web fonts)
- Day 42-43: Responsive layouts
- Day 44-49: Visual QA & polish

### Week 8-10: Phase 1D (Advanced)
- Day 50-53: Analytics infrastructure
- Day 54-57: A/B testing framework
- Day 58-61: Personalization engine
- Day 62-65: Viral mechanics (referrals)
- Day 66-70: Performance tuning & launch

---

## 🎯 Success Metrics Dashboard

### Frame Performance KPIs
```sql
-- Daily frame usage report
SELECT
  frame_type,
  COUNT(*) as views,
  COUNT(DISTINCT fid) as unique_users,
  AVG(CASE WHEN metadata->>'action' = 'click' THEN 1 ELSE 0 END) as ctr,
  AVG(EXTRACT(EPOCH FROM (metadata->>'render_time')::INTERVAL)) as avg_render_ms
FROM frame_analytics
WHERE timestamp >= NOW() - INTERVAL '1 day'
GROUP BY frame_type
ORDER BY views DESC;
```

### Target Metrics (End of Phase 1)
| Metric | Baseline | Target | Stretch Goal |
|--------|----------|--------|--------------|
| Frame Views/Day | 5,000 | 15,000 | 25,000 |
| Unique Users/Day | 800 | 2,500 | 5,000 |
| CTR (Click-Through) | 8% | 15% | 22% |
| Quest Completions/Day | 120 | 350 | 600 |
| Frame Shares/Day | 50 | 250 | 500 |
| Avg Render Time | 800ms | 300ms | 150ms |
| Error Rate | 0.5% | 0.1% | 0.01% |
| Cache Hit Rate | 0% | 80% | 90% |

---

## 🛡️ Risk Mitigation

### Technical Risks
1. **Cache Invalidation Issues**: Implement versioned cache keys, monitor stale data
2. **Supabase Rate Limits**: Connection pooling, read replicas if needed
3. **Vercel Function Timeouts**: Keep functions <10s, implement queue for slow operations
4. **Frame Spec Changes**: Subscribe to Farcaster updates, maintain backward compatibility

### Product Risks
1. **Feature Creep**: Stick to roadmap, defer non-critical features to Phase 2
2. **User Confusion**: Comprehensive testing with beta users before launch
3. **Performance Regression**: Load testing before each deployment
4. **Migration Failures**: Database migrations tested on staging first

---

## 🔄 Maintenance Plan

### Daily Operations
- Monitor error rates (PagerDuty alerts)
- Review analytics dashboard
- Respond to user feedback (Discord, Warpcast)

### Weekly Tasks
- Performance review (Vercel analytics)
- Cache efficiency audit
- Database cleanup (expired sessions)
- A/B test analysis

### Monthly Retrospectives
- Feature adoption metrics
- User satisfaction surveys
- Technical debt review
- Phase 2 planning

---

## 📚 References

### Farcaster Documentation
- **Frame Spec**: https://docs.farcaster.xyz/developers/frames/spec
- **Mini App Embed**: https://miniapps.farcaster.xyz/docs/specification
- **Best Practices**: https://docs.farcaster.xyz/developers/frames/best-practices

### Internal Documentation
- `docs/maintenance/MCP-QUICK-REFERENCE.md` — Frame specifications
- `docs/maintenance/PHASE-0-IMPLEMENTATION-REPORT.md` — Baseline implementation
- `FRAME-TYPE-STATUS.md` — Current frame inventory
- `.instructions.md` — Development guidelines

### Technology Stack
- **Next.js**: https://nextjs.org/docs
- **Satori**: https://github.com/vercel/satori
- **Neynar SDK**: https://docs.neynar.com/
- **Supabase**: https://supabase.com/docs

---

## ✅ Phase 1 Completion Criteria

Phase 1 is complete when:

1. ✅ All 4 sub-phases (1A-1D) deployed to production
2. ✅ Target metrics achieved (see Success Metrics Dashboard)
3. ✅ Test coverage >80% (unit + integration)
4. ✅ Zero P0/P1 bugs in production for 1 week
5. ✅ User satisfaction score >4.5/5 (survey)
6. ✅ Documentation updated (API docs, runbooks)
7. ✅ Performance benchmarks met (see Phase 1A)
8. ✅ Analytics dashboards operational

---

**Document Version**: 1.0  
**Last Updated**: November 22, 2025  
**Next Review**: After Phase 1A completion (Week 2)

