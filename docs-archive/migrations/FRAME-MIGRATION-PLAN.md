# 🚀 Frame API Migration Plan: OnchainKit → Frog Framework

**Migration Timeline:** December 5-11, 2025 (2-6 days)  
**Status:** Planning Phase  
**Current Progress:** Quests 97% | Dashboard 60% | Leaderboard 97%  
**Security Target:** 4-5 Layer Security Architecture

---

## 📊 Executive Summary

This document outlines the comprehensive migration strategy from our current OnchainKit-based Frame implementation to the modern Frog framework. The migration will enhance security, improve maintainability, and support our event-driven architecture with proper type safety and state management.

### Why Migrate to Frog?

1. **Modern Framework**: Built specifically for Farcaster Frames v2 (vNext)
2. **Type Safety**: First-class TypeScript support with automatic type inference
3. **Developer Experience**: Simplified routing, middleware, and state management
4. **Security**: Native support for multi-layer validation and authentication
5. **Performance**: Optimized for Vercel Edge Functions
6. **Future-Proof**: Aligned with Farcaster's latest Frame specifications

---

## 🏗️ Current Architecture Analysis

### Existing Frame Routes (`/app/frame/*`)
```
/app/frame/
├── badge/[fid]/route.tsx       - Badge showcase frames
├── gm/route.tsx                - Daily GM / streak frames  
├── guild/route.tsx             - Guild membership frames
├── leaderboard/route.tsx       - Leaderboard frames
├── points/route.tsx            - Points balance frames
├── quest/[questId]/route.tsx   - Quest detail frames
├── referral/route.tsx          - Referral code frames
├── stats/[fid]/route.tsx       - User stats frames
└── verify/route.tsx            - Quest verification frames
```

### API Frame Handler (`/app/api/frame/*`)
```
/app/api/frame/
├── route.tsx                   - Monolithic frame handler (3000+ lines)
├── badge/route.ts              - Badge API endpoint
├── badgeShare/                 - Badge sharing endpoints
├── identify/route.ts           - User identification
├── image/route.tsx             - Dynamic OG image generation
└── og/route.tsx                - OpenGraph meta generation
```

### Frame Types Supported
```typescript
type FrameType = 
  | 'quest'          // Quest details & verification (97% complete)
  | 'guild'          // Guild membership & benefits
  | 'points'         // User points balance
  | 'referral'       // Referral code sharing
  | 'leaderboards'   // Global & chain-specific rankings (97% complete)
  | 'gm'             // Daily GM ritual & streaks
  | 'verify'         // Quest verification status
  | 'onchainstats'   // User onchain statistics
  | 'badge'          // Badge showcase
  | 'generic'        // Generic fallback
```

---

## 🗄️ Database Schema Review

### Critical Tables for Frame Migration

#### 1. **`gmeow_rank_events`** (Event System Core)
**Current Event Types:**
```sql
event_type: 'gm' | 'quest-verify' | 'quest-create' | 'tip' | 
            'stats-query' | 'stake' | 'unstake'
```

**Columns:**
- `id` (uuid) - Primary key
- `created_at` (timestamptz) - Event timestamp (UTC)
- `event_type` (text) - Event category
- `chain` (text) - Blockchain network
- `wallet_address` (text) - User wallet
- `fid` (bigint) - Farcaster ID
- `quest_id` (bigint) - Quest reference (nullable)
- `delta` (bigint) - Points change
- `total_points` (bigint) - New total after event
- `previous_points` (bigint) - Previous total
- `level` (int) - User level
- `tier_name` (text) - Rank tier
- `tier_percent` (numeric) - Progress in tier
- `metadata` (jsonb) - Additional event data

**Migration Needs:**
- ✅ Add new event types: `frame-interaction`, `frame-view`, `frame-error`
- ✅ Add session tracking: `session_id`, `frame_type`, `interaction_type`
- ✅ Add security fields: `verified_signature`, `trusted_source`

#### 2. **`frame_sessions`** (State Management)
**Current Schema:**
```sql
session_id (text) PK - UUID session identifier
fid (int) - Farcaster user ID
state (jsonb) - Frame interaction state
created_at (timestamptz) - Session start
updated_at (timestamptz) - Last activity
```

**Migration Needs:**
- ✅ Add `frame_type` (text) - quest | gm | leaderboard | etc
- ✅ Add `interaction_count` (int) - Number of interactions
- ✅ Add `last_interaction_type` (text) - button | input | link
- ✅ Add `expires_at` (timestamptz) - Session expiration (1 hour default)
- ✅ Add `metadata` (jsonb) - Additional session context

#### 3. **`unified_quests`** (97% Complete)
**Current Status:** Production-ready, needs frame integration
- ✅ Multi-step tasks support
- ✅ Image uploads (cover, badge, thumbnail)
- ✅ Difficulty levels & tags
- ✅ Creator earnings tracking
- ⚠️ **Missing:** Frame-specific metadata, verification webhooks

#### 4. **`user_profiles`** (Core User Data)
**Current Status:** Complete, needs frame context enrichment
- ✅ FID, wallet, verified addresses
- ✅ Points, XP, levels
- ⚠️ **Missing:** `last_frame_interaction`, `frame_stats` jsonb

#### 5. **`leaderboard_calculations`** (97% Complete)
**Current Status:** Auto-calculated with multiple components
- ✅ `base_points`, `viral_xp`, `guild_bonus`, `streak_bonus`
- ✅ Global rank, period-based (daily, weekly, all_time)
- ⚠️ **Missing:** Frame view tracking for real-time updates

---

## 🛡️ Security Architecture (4-5 Layers)

### Layer 1: Request Validation
```typescript
// Frog middleware for basic validation
app.use('/*', async (c, next) => {
  // Validate Farcaster signature
  const isValid = await validateFrameSignature(c.req)
  if (!isValid) return c.error({ message: 'Invalid signature' })
  
  // Rate limiting (100 req/min per FID)
  const rateLimited = await checkRateLimit(c.var.fid)
  if (rateLimited) return c.error({ message: 'Too many requests' })
  
  await next()
})
```

### Layer 2: Authentication & Authorization
```typescript
// Verify FID ownership and permissions
app.use('/*', async (c, next) => {
  const fid = c.var.fid
  const profile = await getUserProfile(fid)
  
  if (!profile) return c.error({ message: 'User not found' })
  
  // Check if user is banned or suspended
  if (profile.status === 'banned') {
    return c.error({ message: 'Account suspended' })
  }
  
  c.set('profile', profile)
  await next()
})
```

### Layer 3: Input Sanitization
```typescript
import { z } from 'zod'

const questIdSchema = z.number().int().positive().max(2147483647)
const chainSchema = z.enum(['base', 'op', 'celo', 'unichain', 'ink'])

// Validate all user inputs
function sanitizeQuestId(input: unknown): number | null {
  const parsed = questIdSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}
```

### Layer 4: Database Security
```typescript
// Use Row Level Security (RLS) policies
// Enable RLS on all tables
ALTER TABLE frame_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own sessions"
ON frame_sessions FOR ALL
USING (fid = auth.uid()::bigint);

// Use Supabase service role only for admin operations
// Use anon key with RLS for user operations
```

### Layer 5: Monitoring & Alerting
```typescript
// Log all security events to gmeow_rank_events
await logSecurityEvent({
  event_type: 'security-validation',
  fid: c.var.fid,
  metadata: {
    validation_result: 'signature_mismatch',
    ip_address: c.req.header('x-forwarded-for'),
    user_agent: c.req.header('user-agent'),
    frame_type: c.req.param('frameType')
  }
})

// Alert on suspicious patterns
if (failedAttempts > 10) {
  await sendSecurityAlert({
    severity: 'high',
    fid: c.var.fid,
    reason: 'Multiple validation failures'
  })
}
```

---

## 🎯 Migration Strategy

### Phase 1: Foundation (Day 1-2)
**Goal:** Install Frog, set up basic routing, migrate 1-2 simple frames

#### Tasks:
1. ✅ **Install Frog Framework**
   ```bash
   pnpm add frog hono
   pnpm add -D @types/hono
   ```

2. ✅ **Create Base Frog App** (`/app/api/frog/[[...routes]]/route.tsx`)
   ```typescript
   import { Frog } from 'frog'
   import { handle } from 'frog/vercel'
   
   export const app = new Frog({
     basePath: '/api/frog',
     imageOptions: { width: 1200, height: 630 },
     title: 'Gmeowbased'
   })
   
   // Basic health check
   app.frame('/', (c) => {
     return c.res({
       image: (
         <div style={{ display: 'flex', flexDirection: 'column' }}>
           <h1>Gmeowbased Frames</h1>
         </div>
       ),
       intents: [
         <Button value="quests">Quests</Button>,
         <Button value="gm">Send GM</Button>
       ]
     })
   })
   
   export const GET = handle(app)
   export const POST = handle(app)
   ```

3. ✅ **Migrate Simple Frame: GM**
   - Copy logic from `/app/frame/gm/route.tsx`
   - Implement Frog route: `/api/frog/gm`
   - Add button interactions for streak tracking

4. ✅ **Add Database Integration**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   
   app.use('/*', async (c, next) => {
     const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!
     )
     c.set('supabase', supabase)
     await next()
   })
   ```

5. ✅ **Implement Event Logging**
   ```typescript
   async function logFrameEvent(
     fid: number,
     event_type: string,
     metadata: Record<string, any>
   ) {
     await supabase.from('gmeow_rank_events').insert({
       event_type,
       fid,
       chain: 'base',
       wallet_address: metadata.wallet_address,
       delta: 0,
       total_points: 0,
       metadata
     })
   }
   ```

### Phase 2: Core Frames (Day 3-4)
**Goal:** Migrate quest & leaderboard frames (97% complete features)

#### Tasks:
6. ✅ **Migrate Quest Frames**
   - Dynamic route: `/api/frog/quest/:questId`
   - Fetch from `unified_quests` table
   - Show multi-step task progress
   - Verification buttons

7. ✅ **Migrate Leaderboard Frames**
   - Route: `/api/frog/leaderboard`
   - Support filters: chain, period (daily/weekly/all_time)
   - Use `leaderboard_calculations` table
   - Pagination support (top 10, 20, 50)

8. ✅ **Add Session Management**
   ```typescript
   async function createFrameSession(fid: number, frame_type: string) {
     const session_id = crypto.randomUUID()
     await supabase.from('frame_sessions').insert({
       session_id,
       fid,
       frame_type,
       state: {},
       expires_at: new Date(Date.now() + 3600000) // 1 hour
     })
     return session_id
   }
   ```

9. ✅ **Implement Multi-Step Quest Flow**
   ```typescript
   app.frame('/quest/:questId/task/:taskIndex', async (c) => {
     const quest = await getQuest(c.req.param('questId'))
     const taskIndex = parseInt(c.req.param('taskIndex'))
     const task = quest.tasks[taskIndex]
     
     return c.res({
       image: <TaskImage task={task} />,
       intents: [
         <Button value="verify">Verify Task</Button>,
         taskIndex > 0 && <Button value="back">← Back</Button>,
         <Button value="skip">Skip →</Button>
       ]
     })
   })
   ```

### Phase 3: Advanced Features (Day 5)
**Goal:** Add security layers, error handling, analytics

#### Tasks:
10. ✅ **Implement Security Middleware**
    - Signature validation
    - Rate limiting (Upstash Redis)
    - Input sanitization (Zod schemas)
    - CSRF protection

11. ✅ **Add Error Handling**
    ```typescript
    app.onError((err, c) => {
      console.error('Frame error:', err)
      
      // Log to database
      logFrameEvent(c.var.fid, 'frame-error', {
        error: err.message,
        stack: err.stack,
        frame_type: c.req.param('frameType')
      })
      
      return c.res({
        image: <ErrorImage message="Something went wrong" />,
        intents: [<Button value="retry">Try Again</Button>]
      })
    })
    ```

12. ✅ **Add Analytics Tracking**
    ```typescript
    app.use('/*', async (c, next) => {
      const startTime = Date.now()
      await next()
      const duration = Date.now() - startTime
      
      // Track frame views
      await logFrameEvent(c.var.fid, 'frame-view', {
        frame_type: c.req.param('frameType'),
        duration_ms: duration,
        button_clicked: c.buttonValue
      })
    })
    ```

### Phase 4: Migration & Testing (Day 6)
**Goal:** Complete migration, comprehensive testing, deploy

#### Tasks:
13. ✅ **Migrate Remaining Frames**
    - Badge frames
    - Points frames
    - Referral frames
    - Stats frames
    - Verify frames

14. ✅ **Update Database Schema**
    ```sql
    -- Add new columns to gmeow_rank_events
    ALTER TABLE gmeow_rank_events 
    ADD COLUMN IF NOT EXISTS session_id uuid,
    ADD COLUMN IF NOT EXISTS frame_type text,
    ADD COLUMN IF NOT EXISTS interaction_type text;
    
    -- Add new columns to frame_sessions
    ALTER TABLE frame_sessions 
    ADD COLUMN IF NOT EXISTS frame_type text,
    ADD COLUMN IF NOT EXISTS interaction_count int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_interaction_type text,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '1 hour');
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_rank_events_session 
    ON gmeow_rank_events(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_rank_events_frame_type 
    ON gmeow_rank_events(frame_type, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_frame_sessions_expires 
    ON frame_sessions(expires_at) 
    WHERE expires_at > now();
    ```

15. ✅ **Testing Strategy**
    ```typescript
    // Unit tests for Frog routes
    import { testClient } from 'hono/testing'
    
    describe('Frog Quest Frames', () => {
      it('should render quest frame', async () => {
        const res = await testClient(app).quest.$get({ 
          param: { questId: '1' } 
        })
        expect(res.status).toBe(200)
      })
      
      it('should handle invalid quest ID', async () => {
        const res = await testClient(app).quest.$get({ 
          param: { questId: 'invalid' } 
        })
        expect(res.status).toBe(400)
      })
    })
    ```

16. ✅ **Deploy Frog Frames**
    - Update Vercel environment variables
    - Test on staging environment
    - Gradual rollout (10% → 50% → 100%)
    - Monitor error rates and performance

17. ✅ **Deprecate Old Frame Routes**
    ```typescript
    // Add deprecation notice to old routes
    export async function GET(req: Request) {
      return NextResponse.json({
        error: 'This frame endpoint is deprecated',
        message: 'Please use /api/frog/* endpoints instead',
        migration_guide: 'https://docs.gmeowhq.art/frames/migration'
      }, { status: 410 }) // 410 Gone
    }
    ```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Audit current frame usage (analytics)
- [ ] Document all frame routes and parameters
- [ ] Create backup of production database
- [ ] Set up staging environment for testing
- [ ] Install Frog framework and dependencies

### Database Migration
- [ ] Create new event types in `gmeow_rank_events`
- [ ] Add session tracking columns to `frame_sessions`
- [ ] Add frame metadata to `user_profiles`
- [ ] Create database indexes for performance
- [ ] Test RLS policies for security

### Frame Migration (Priority Order)
1. [ ] **GM Frame** (Simple, high traffic) - Day 1
2. [ ] **Quest Frames** (97% complete, core feature) - Day 3
3. [ ] **Leaderboard Frames** (97% complete, core feature) - Day 3
4. [ ] **Points Frame** (Medium complexity) - Day 4
5. [ ] **Badge Frame** (Medium complexity) - Day 4
6. [ ] **Referral Frame** (Low complexity) - Day 5
7. [ ] **Stats Frame** (Low complexity) - Day 5
8. [ ] **Verify Frame** (Low traffic) - Day 5
9. [ ] **Guild Frame** (Low traffic) - Day 5

### Security Implementation
- [ ] Add signature validation middleware
- [ ] Implement rate limiting (100 req/min per FID)
- [ ] Add input sanitization (Zod schemas)
- [ ] Enable RLS policies on all tables
- [ ] Set up monitoring and alerting

### Testing
- [ ] Unit tests for all Frog routes
- [ ] Integration tests with Supabase
- [ ] E2E tests with Playwright (frame interactions)
- [ ] Load testing (handle 1000+ concurrent users)
- [ ] Security testing (penetration testing)

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor error rates and performance metrics
- [ ] Deprecate old frame routes (after 2 weeks)

### Post-Migration
- [ ] Update documentation (API docs, migration guide)
- [ ] Clean up deprecated code
- [ ] Archive old frame routes to `/backups`
- [ ] Optimize database queries and indexes
- [ ] Review and improve error handling

---

## 🔄 Event Types Evolution

### Current Events (`gmeow_rank_events`)
```typescript
type CurrentEventType = 
  | 'gm'             // Daily GM sent
  | 'quest-verify'   // Quest verification completed
  | 'quest-create'   // New quest created
  | 'tip'            // Tip sent/received
  | 'stats-query'    // Stats viewed
  | 'stake'          // Tokens staked
  | 'unstake'        // Tokens unstaked
```

### New Events (Post-Migration)
```typescript
type NewEventType = CurrentEventType
  | 'frame-view'          // Frame rendered
  | 'frame-interaction'   // Button/input interaction
  | 'frame-error'         // Frame error occurred
  | 'session-start'       // New frame session created
  | 'session-end'         // Frame session ended
  | 'quest-task-verify'   // Individual task verified (multi-step)
  | 'quest-task-skip'     // Task skipped
  | 'leaderboard-view'    // Leaderboard viewed
  | 'badge-share'         // Badge shared
  | 'referral-click'      // Referral code clicked
```

### Event Metadata Structure
```typescript
interface FrameEventMetadata {
  // Core fields
  frame_type: FrameType
  session_id: string
  interaction_type?: 'button' | 'input' | 'link'
  button_value?: string
  input_value?: string
  
  // Performance metrics
  duration_ms?: number
  render_time_ms?: number
  
  // Security context
  signature_valid: boolean
  rate_limited: boolean
  ip_address?: string
  user_agent?: string
  
  // Feature-specific data
  quest_id?: number
  task_index?: number
  chain?: ChainKey
  period?: 'daily' | 'weekly' | 'all_time'
  
  // Error tracking
  error?: string
  error_stack?: string
}
```

---

## 📊 Progress Tracking

### Current Implementation Status

#### Quests System: **97% Complete** ✅
- ✅ Quest creation wizard (multi-step)
- ✅ Task management (verification, skipping)
- ✅ Image uploads (cover, badge, thumbnail)
- ✅ Creator earnings tracking
- ✅ Difficulty levels & tags
- ⚠️ **Missing 3%:** Frame integration, real-time verification webhooks

#### Dashboard: **60% Complete** ⚠️
- ✅ User stats display
- ✅ Points balance
- ✅ XP tracking
- ✅ Level progression
- ⚠️ **Missing 40%:** 
  - Frame-based interactions
  - Real-time updates
  - Social feed integration
  - Quest discovery UI

#### Leaderboard: **97% Complete** ✅
- ✅ Global rankings
- ✅ Chain-specific rankings
- ✅ Period filters (daily, weekly, all-time)
- ✅ Pagination
- ✅ Auto-calculation system
- ⚠️ **Missing 3%:** Frame views, real-time rank updates

---

## 🚨 Risk Mitigation

### Risk 1: Frame Breakage During Migration
**Mitigation:**
- Gradual rollout (10% → 50% → 100%)
- Keep old endpoints active for 2 weeks
- Monitor error rates continuously
- Rollback plan ready (< 5 minutes)

### Risk 2: Database Performance Issues
**Mitigation:**
- Create indexes before migration
- Test queries with production-scale data
- Use database connection pooling
- Monitor query performance (p95 < 100ms)

### Risk 3: Security Vulnerabilities
**Mitigation:**
- Security audit before deployment
- Rate limiting from day 1
- Signature validation on all routes
- Monitor for suspicious patterns

### Risk 4: User Experience Degradation
**Mitigation:**
- A/B testing with 10% users first
- Collect user feedback
- Monitor frame load times (< 2s)
- Maintain feature parity with old system

---

## 📈 Success Metrics

### Performance
- [ ] Frame render time < 2 seconds (p95)
- [ ] Database query time < 100ms (p95)
- [ ] API response time < 500ms (p95)
- [ ] Error rate < 0.1%

### Security
- [ ] 100% signature validation rate
- [ ] 0 security incidents
- [ ] Rate limiting effective (< 1% false positives)
- [ ] All inputs sanitized

### User Experience
- [ ] Feature parity with old system (100%)
- [ ] User satisfaction score > 4.5/5
- [ ] Frame interaction rate +20%
- [ ] Quest completion rate +15%

### Code Quality
- [ ] Test coverage > 80%
- [ ] TypeScript strict mode enabled
- [ ] No `any` types in production code
- [ ] ESLint warnings = 0

---

## 🔗 Resources

### Documentation
- [Frog Framework Docs](https://frog.fm/)
- [Farcaster Frames v2 Spec](https://docs.farcaster.xyz/frames/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

### Internal Docs
- `/docs/frames/` - Frame architecture docs
- `/docs/api/` - API documentation
- `/docs/security/` - Security guidelines

### Tools
- [Frame Validator](https://warpcast.com/~/developers/frames)
- [Frog Debugger](https://frog.fm/debugger)
- [Supabase Studio](https://supabase.com/dashboard)

---

## 🎯 Next Steps

1. **Review this plan** with the team
2. **Set up staging environment** for testing
3. **Install Frog framework** (Day 1)
4. **Create database migration scripts** (Day 1)
5. **Start Phase 1 migration** (GM frame)

---

**Document Version:** 1.0  
**Last Updated:** December 5, 2025  
**Author:** Gmeowbased Team  
**Status:** ✅ Ready for Review
