# GMEOW Codebase Structure Reference

**Generated**: November 22, 2025  
**Purpose**: Complete architectural map to prevent duplication and ensure consistency  
**Target Audience**: Developers implementing Phase 1 features

---

## 🏗️ High-Level Architecture

```
GMEOW/
├── app/                    # Next.js App Router (pages, API routes)
├── components/             # React components (UI building blocks)
├── lib/                    # Utilities, helpers, business logic
├── types/                  # TypeScript definitions
├── supabase/               # Database schema, migrations
├── docs/                   # Documentation
├── e2e/                    # End-to-end tests (Playwright)
├── __tests__/              # Unit/integration tests (Vitest)
├── public/                 # Static assets
└── scripts/                # Build/automation scripts
```

---

## 📂 App Router Structure (`app/`)

### API Routes (`app/api/`)

#### Frame Endpoints (7 routes)
| Route | Purpose | Key Features | Status |
|-------|---------|-------------|--------|
| `/api/frame/route.tsx` | Main frame metadata handler | 10 frame types, rate limiting, validation | ✅ Live |
| `/api/frame/image/route.tsx` | Dynamic PNG generation (Satori) | Tier styling, 4 frame types | ✅ Live |
| `/api/frame/og/route.tsx` | OG image generation | Generic social cards | ✅ Live |
| `/api/frame/badge/route.ts` | Badge frame metadata | Legacy support | ✅ Live |
| `/api/frame/badgeShare/route.ts` | Badge share frame | Social sharing | ✅ Live |
| `/api/frame/badgeShare/image/route.tsx` | Badge share image | PNG generation | ✅ Live |
| `/api/frame/identify/route.ts` | User identity resolution | Miniapp SDK integration | ✅ Live |

**Frame Type Registry** (10 types):
```typescript
type FrameType = 
  | 'quest'          // Quest discovery/completion
  | 'guild'          // Guild preview/join
  | 'points'         // XP/points display
  | 'referral'       // Referral sharing
  | 'leaderboards'   // Global rankings
  | 'gm'             // Daily GM ritual
  | 'verify'         // Quest verification
  | 'onchainstats'   // Onchain analytics
  | 'badge'          // Badge showcase
  | 'generic'        // Fallback
```

---

#### User/Profile Routes (1 route)
- `/api/user/profile/route.ts` — User profile CRUD operations

#### Admin Routes (14 routes)
```
/api/admin/
├── auth/
│   ├── login/route.ts       — Admin login
│   └── logout/route.ts      — Admin logout
├── badges/
│   ├── route.ts             — Badge management
│   ├── [id]/route.ts        — Single badge operations
│   └── upload/route.ts      — Badge image upload
├── bot/
│   ├── status/route.ts      — Bot health check
│   ├── config/route.ts      — Bot configuration
│   ├── cast/route.ts        — Manual cast posting
│   ├── activity/route.ts    — Bot activity logs
│   └── reset-client/route.ts — Reset Neynar client
├── leaderboard/
│   └── snapshot/route.ts    — Leaderboard snapshots
├── performance/route.ts     — Performance metrics
└── viral/
    ├── tier-upgrades/route.ts         — Tier upgrade tracking
    ├── top-casts/route.ts             — Viral cast tracking
    ├── achievement-stats/route.ts     — Achievement metrics
    ├── notification-stats/route.ts    — Notification metrics
    └── webhook-health/route.ts        — Webhook status
```

---

#### Badge System Routes (8 routes)
```
/api/badges/
├── route.ts                 — List all badges
├── [address]/route.ts       — Badges by wallet
├── registry/route.ts        — Badge registry
├── templates/route.ts       — Badge templates
├── list/route.ts            — Badge listing
├── mint/route.ts            — Badge minting
├── mint-manual/route.ts     — Manual minting (admin)
├── claim/route.ts           — Badge claiming
└── assign/route.ts          — Badge assignment
```

---

#### Neynar Integration Routes (3 routes)
- `/api/neynar/webhook/route.ts` — Webhook handler (cast engagement, reactions)
- `/api/neynar/score/route.ts` — Neynar score fetching
- `/api/neynar/balances/route.ts` — Token balance checking

#### Farcaster Routes (3 routes)
- `/api/farcaster/fid/route.ts` — FID resolution
- `/api/farcaster/assets/route.ts` — Asset fetching
- `/api/farcaster/bulk/route.ts` — Bulk operations

#### Quest Routes (2 routes)
- `/api/quests/verify/route.ts` — Quest verification
- `/api/quests/claim/route.ts` — Quest claiming

#### Leaderboard Routes (2 routes)
- `/api/leaderboard/route.ts` — Leaderboard data
- `/api/leaderboard/sync/route.ts` — Leaderboard synchronization

#### Analytics Routes (3 routes)
```
/api/analytics/
├── summary/route.ts         — Analytics summary
└── badges/route.ts          — Badge analytics
```

#### Viral System Routes (3 routes)
```
/api/viral/
├── leaderboard/route.ts     — Viral leaderboard
├── stats/route.ts           — Viral stats
└── badge-metrics/route.ts   — Badge metrics
```

#### Tips System Routes (3 routes)
```
/api/tips/
├── ingest/route.ts          — Tip ingestion
├── stream/route.ts          — Tip streaming
└── summary/route.ts         — Tip summary
```

#### Webhook Routes (2 routes)
```
/api/webhooks/
├── neynar/cast-engagement/route.ts  — Cast engagement webhook
└── badge-minted/route.ts            — Badge mint webhook
```

#### Utility Routes (10 routes)
- `/api/onboard/status/route.ts` — Onboarding status
- `/api/onboard/complete/route.ts` — Complete onboarding
- `/api/maintenance/auth/route.ts` — Maintenance mode auth
- `/api/manifest/route.ts` — App manifest
- `/api/seasons/route.ts` — Season management
- `/api/snapshot/route.ts` — Data snapshots
- `/api/dashboard/telemetry/route.ts` — Dashboard telemetry
- `/api/telemetry/rank/route.ts` — Rank telemetry
- `/api/cast/badge-share/route.ts` — Badge share cast
- `/api/og/tier-card/route.tsx` — Tier card OG image

#### Cron Jobs (1 route)
- `/api/cron/mint-badges/route.ts` — Automated badge minting

#### Special Routes
- `/api/.well-known/farcaster.json/route.ts` — Farcaster app manifest

**Total API Routes**: ~70 routes

---

### Page Routes (`app/`)

#### Public Pages (6 pages)
```
/
├── page.tsx                 — Homepage
├── loading.tsx              — Loading state
├── layout.tsx               — Root layout
├── providers.tsx            — React context providers
├── gm/page.tsx              — GM ritual page
└── leaderboard/page.tsx     — Leaderboard page
```

#### Profile Pages (2 pages)
```
/profile/
├── page.tsx                 — Current user profile
└── [fid]/badges/page.tsx    — User badge collection
```

#### Quest Pages (5 pages)
```
/Quest/
├── page.tsx                 — Quest hub
├── layout.tsx               — Quest layout
├── CreateQuestView.tsx      — Quest creation form
├── leaderboard/page.tsx     — Quest leaderboard
├── [chain]/[id]/page.tsx    — Single quest detail
└── creator/
    ├── page.tsx             — Creator dashboard
    ├── layout.tsx           — Creator layout
    └── providers.tsx        — Creator providers
```

#### Guild Pages (2 pages)
```
/Guild/
├── page.tsx                 — Guild hub
├── components/TeamBadge.tsx — Team badge component
└── guild/[chain]/[teamname]/page.tsx  — Single guild
```

#### Admin Pages (4 pages)
```
/admin/
├── page.tsx                 — Admin dashboard
├── login/page.tsx           — Admin login
├── login/LoginForm.tsx      — Login form
└── viral/page.tsx           — Viral analytics
```

#### Utility Pages (4 pages)
- `/Dashboard/page.tsx` — User dashboard
- `/Agent/page.tsx` — AI agent interface
- `/maintenance/page.tsx` — Maintenance mode
- `/docs/layout.tsx` — Documentation layout

#### Frame Routes (Public-Facing) (4 routes)
```
/frame/
├── leaderboard/route.tsx           — Leaderboard frame
├── badge/[fid]/route.tsx           — Badge frame
├── quest/[questId]/route.tsx       — Quest frame
└── stats/[fid]/route.tsx           — Stats frame
```

**Total Page Routes**: ~30 pages

---

## 🧩 Component Library (`components/`)

### Layout Components (3 components)
- `PixelHeader.tsx` — Retro pixel header
- `PixelSidebar.tsx` — Navigation sidebar
- `MobileNavigation.tsx` — Mobile nav menu

### User Interface Components (15 components)
```
components/
├── ConnectWallet.tsx        — Wallet connection
├── ChainSwitcher.tsx        — Network switcher
├── GMButton.tsx             — GM action button
├── ContractGMButton.tsx     — Contract GM button
├── GMCountdown.tsx          — GM countdown timer
├── GMHistory.tsx            — GM history display
├── UserProfile.tsx          — User profile card
├── ProfileStats.tsx         — Profile statistics
├── OnchainStats.tsx         — Onchain analytics card
├── ProgressXP.tsx           — XP progress bar
├── TimeEmoji.tsx            — Time-based emoji
├── XPEventOverlay.tsx       — XP gain animation
├── LeaderboardList.tsx      — Leaderboard table
├── ContractLeaderboard.tsx  — Contract leaderboard
└── PixelCard.tsx            — Retro card wrapper
```

### Error Handling (1 component)
- `ErrorBoundary.tsx` — React error boundary

### Miniapp Components (1 component)
- `MiniappReady.tsx` — Miniapp initialization

### Domain-Specific Components (40+ components)
```
components/
├── admin/               — Admin dashboard components (10+)
├── agent/               — AI agent components (5+)
├── badge/               — Badge system components (8+)
├── dashboard/           — Dashboard widgets (6+)
├── Guild/               — Guild components (4+)
├── home/                — Homepage sections (3+)
├── intro/               — Onboarding components (2+)
└── layout/              — Additional layout components (2+)
```

**Total Components**: ~60 components

---

## 🛠️ Utility Library (`lib/`)

### Core Business Logic (15 files)

#### Frame System
- `lib/frame-validation.ts` (229 lines) — Input sanitization, frame spec compliance
- `lib/miniapp-validation.ts` — Miniapp embed validation
- `lib/share.ts` — Social sharing utilities
- `lib/bot-frame-builder.ts` — Bot frame generation

#### Tier & Rewards System (Phase 0)
- `lib/rarity-tiers.ts` (184 lines) — **NEW** Tier calculation, styling configs
- `lib/user-rewards.ts` (167 lines) — **NEW** First-time user rewards

#### Data Fetching
- `lib/neynar.ts` — Neynar API client
- `lib/supabase-server.ts` — Supabase server client
- `lib/supabase-client.ts` — Supabase browser client

#### Utilities
- `lib/gm-utils.ts` — GM ritual helpers, chain configs
- `lib/rate-limit.ts` — API rate limiting (Upstash)
- `lib/error-handler.ts` — Error handling middleware
- `lib/types.ts` — Shared TypeScript types

#### Validation
- `lib/validation/api-schemas.ts` — Zod schemas for API validation

#### Bot System
- `lib/bot-instance/index.ts` — Bot instance management

**Total Lib Files**: ~15 core files + subdirectories

---

## 📊 Database Schema (`supabase/`)

### Core Tables
```sql
-- User Management
user_profiles (fid, neynar_score, onboarded_at, og_nft_eligible)
frame_sessions (session_id, fid, state, created_at, updated_at)

-- Badge System
badges (id, name, description, image_url, tier, rarity)
user_badges (user_id, badge_id, minted_at, tx_hash)
badge_templates (id, type, metadata)

-- Quest System
quests (id, title, description, reward, chain, expires_at)
quest_completions (quest_id, fid, completed_at, verified)

-- Leaderboard
leaderboard (fid, points, xp, rank, season)
leaderboard_history (snapshot_id, fid, rank, timestamp)

-- Analytics
frame_analytics (event_type, frame_type, fid, tier, source, timestamp)
experiments (experiment_id, variant, fid, event, conversion_type)

-- Referrals
referral_codes (code, referrer_fid, created_at)
referrals (code, referrer_fid, referee_fid, created_at)

-- GM System
gm_records (fid, gm_count, streak, last_gm_at)
gm_history (fid, timestamp, chain)

-- Guilds
guilds (id, name, chain, members_count)
guild_members (guild_id, fid, joined_at, role)
```

### Migrations Directory
```
supabase/migrations/
├── 00000000000000_initial_schema.sql
├── [timestamp]_user_profiles.sql
├── [timestamp]_badges.sql
├── [timestamp]_quests.sql
└── ... (20+ migration files)
```

---

## 🎨 Type Definitions (`types/`)

### Core Types
```typescript
// Frame types
type FrameType = 'quest' | 'guild' | 'points' | 'referral' | 'leaderboards' | 
                 'gm' | 'verify' | 'onchainstats' | 'badge' | 'generic'

// Chain types
type ChainKey = 'base' | 'op' | 'arb' | 'zora' | 'degen' | 'unichain'

// Tier types (Phase 0)
type TierName = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

// User types
interface User {
  fid: number
  username: string
  displayName: string
  neynarScore: number
  powerBadge: boolean
}

// Badge types
interface Badge {
  id: string
  name: string
  description: string
  tier: TierName
  imageUrl: string
}
```

---

## 🧪 Test Structure

### E2E Tests (`e2e/`)
```
e2e/
├── gi-15-miniapp-frame-parity.spec.ts  — Frame/miniapp consistency
└── [other test files]
```

### Unit Tests (`__tests__/`)
```
__tests__/
├── api/             — API route tests
├── components/      — Component tests
├── hooks/           — Hook tests
├── lib/             — Utility tests
├── utils/           — Helper tests
└── integration/     — Integration tests
```

**Test Coverage**: ~45% (target: 80% in Phase 1A)

---

## 📖 Documentation (`docs/`)

### Maintenance Documentation
```
docs/maintenance/
├── PHASE-0-IMPLEMENTATION-REPORT.md  — Phase 0 complete report
├── P0-VALIDATION-REPORT-2025-11-22.md — Phase 0 validation
├── MCP-QUICK-REFERENCE.md            — Frame specifications
├── FRAME-DEPLOYMENT-PLAYBOOK.md      — Deployment guide
├── FRAME-VALIDATION-REPORT.md        — Frame inventory
└── NOV 2025/
    └── GI-7-14-AUDIT-REPORT.md       — Comprehensive audit
```

### Feature Documentation
```
docs/features/
├── frame-mint-buttons.md             — Mint button integration
├── bot-frame-display.md              — Bot frame system
└── [other feature docs]
```

### Planning Documentation (NEW - Phase 1)
```
docs/planning/
├── PHASE-1-MASTER-PLAN.md            — **THIS DOCUMENT**
└── GMEOW-STRUCTURE-REFERENCE.md      — Codebase structure map
```

---

## 🚨 Critical Files (DO NOT DUPLICATE)

### Frame System Core
- ✅ `app/api/frame/route.tsx` (2,400+ lines) — Main frame handler, 10 frame types
- ✅ `app/api/frame/image/route.tsx` (600+ lines) — Dynamic PNG generation
- ✅ `lib/frame-validation.ts` (229 lines) — Input validation, sanitization

### Tier & Rewards System (Phase 0)
- ✅ `lib/rarity-tiers.ts` (184 lines) — Tier configs, DO NOT modify styling without review
- ✅ `lib/user-rewards.ts` (167 lines) — Reward logic, DO NOT change point amounts

### Data Layer
- ✅ `lib/neynar.ts` — Neynar client, DO NOT create alternative clients
- ✅ `lib/supabase-server.ts` — Supabase server client, USE THIS for server-side queries
- ✅ `lib/supabase-client.ts` — Supabase browser client, USE THIS for client-side

### Configuration
- ✅ `lib/gm-utils.ts` — Chain configs, USE THIS for chain definitions
- ✅ `lib/types.ts` — Shared types, ADD NEW types here

---

## 🔍 Feature Location Map

### Where to find existing features:

| Feature | Primary Location | Supporting Files |
|---------|-----------------|------------------|
| **Frame Generation** | `app/api/frame/route.tsx` | `lib/frame-validation.ts` |
| **Image Generation** | `app/api/frame/image/route.tsx` | `lib/rarity-tiers.ts` |
| **Tier System** | `lib/rarity-tiers.ts` | Used in `frame/image/route.tsx` |
| **Rewards** | `lib/user-rewards.ts` | Used in `frame/route.tsx` |
| **Badge System** | `app/api/badges/*` | `components/badge/*` |
| **Quest System** | `app/api/quests/*` | `app/Quest/*` |
| **Leaderboard** | `app/api/leaderboard/*` | `app/leaderboard/page.tsx` |
| **GM Ritual** | `app/gm/page.tsx` | `components/GM*.tsx` |
| **User Profiles** | `app/profile/*` | `components/UserProfile.tsx` |
| **Admin Dashboard** | `app/admin/*` | `components/admin/*` |
| **Bot System** | `app/api/admin/bot/*` | `lib/bot-instance/` |

---

## 🔐 Authentication & Security

### Admin Authentication
- Route: `/api/admin/auth/login`
- Middleware: Custom session-based auth
- Protected routes: `/admin/*`, `/api/admin/*`

### API Security
- Rate limiting: `lib/rate-limit.ts` (Upstash Redis)
- Input validation: `lib/validation/api-schemas.ts` (Zod)
- CORS: Configured in Next.js config

### Database Security
- RLS (Row Level Security): Enabled on Supabase tables
- Service role key: Server-side only, never exposed to client
- Anon key: Public API access with RLS restrictions

---

## 📦 Dependencies Overview

### Core Framework
```json
{
  "next": "^14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.3"
}
```

### Frame Generation
```json
{
  "@vercel/og": "^0.6.2",
  "satori": "^0.10.9"
}
```

### API Integration
```json
{
  "@neynar/nodejs-sdk": "^2.2.0",
  "@supabase/supabase-js": "^2.39.0",
  "@upstash/redis": "^1.28.0"
}
```

### Validation & Utilities
```json
{
  "zod": "^3.22.4",
  "date-fns": "^2.30.0"
}
```

### Testing
```json
{
  "@playwright/test": "^1.40.0",
  "vitest": "^1.0.4"
}
```

---

## 🚀 Deployment Architecture

### Vercel Configuration
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "regions": ["iad1"]
}
```

### Environment Variables (Required)
```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Neynar
NEYNAR_API_KEY=xxx
NEYNAR_SIGNER_UUID=xxx

# Rate Limiting
UPSTASH_REDIS_URL=xxx
UPSTASH_REDIS_TOKEN=xxx

# App Config
NEXT_PUBLIC_BASE_URL=https://gmeowhq.art
```

---

## 🎯 Development Guidelines

### When Adding New Features

1. **Check for existing implementations**:
   - Search `lib/` for utility functions
   - Check `app/api/` for similar endpoints
   - Review `components/` for reusable UI

2. **Follow established patterns**:
   - Use `lib/frame-validation.ts` for input sanitization
   - Use `lib/supabase-server.ts` for database queries
   - Use `lib/neynar.ts` for Farcaster data

3. **Avoid duplication**:
   - DON'T create new Neynar clients
   - DON'T create new Supabase clients
   - DON'T duplicate tier calculation logic
   - DON'T hardcode chain configs (use `lib/gm-utils.ts`)

4. **Document changes**:
   - Update this file if adding new core utilities
   - Add JSDoc comments to exported functions
   - Update API documentation in `docs/api/`

5. **Test thoroughly**:
   - Write unit tests for new utilities
   - Add E2E tests for new user flows
   - Test frame rendering with frame validator

---

## 📝 Change Log

### Phase 0 (Completed — November 22, 2025)
- ✅ Added `lib/rarity-tiers.ts` — Tier system
- ✅ Added `lib/user-rewards.ts` — Reward logic
- ✅ Modified `app/api/frame/image/route.tsx` — Tier styling
- ✅ Modified `app/api/frame/route.tsx` — Reward tracking
- ✅ Generated `docs/maintenance/PHASE-0-IMPLEMENTATION-REPORT.md`

### Phase 1 Planning (In Progress — November 22, 2025)
- ✅ Created `docs/planning/PHASE-1-MASTER-PLAN.md`
- ✅ Created `docs/planning/GMEOW-STRUCTURE-REFERENCE.md` (this file)
- 🔄 Frame screenshot capture (18/~30 frames)
- ⬜ Phase 1A implementation pending
- ⬜ Phase 1B implementation pending
- ⬜ Phase 1C implementation pending
- ⬜ Phase 1D implementation pending

---

**Document Version**: 1.0  
**Last Updated**: November 22, 2025  
**Maintainer**: Development Team  
**Review Frequency**: After each major feature addition

