<!-- @edit-start 2025-11-13 — README comprehensive update -->
# Gmeowbased Adventure 🐾

> A multi-chain quest platform for Farcaster. Gmeowbased Adventure blends onchain rituals (GM streaks, quest verification, guild coordination) with real-time telemetry, autonomous agent responses, and desktop-first UX powered by Next.js 15, multi-chain smart contracts, and Neynar's social graph.

![Gmeow Command Deck](./screenshots/frame-gm.png)

---

## Table of Contents
- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Component Breakdown](#component-breakdown)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [API Routes](#api-routes)
- [Smart Contracts](#smart-contracts)
- [Autonomous Agent System](#autonomous-agent-system)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Quality Assurance](#quality-assurance)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

Gmeowbased Adventure is a production-grade Farcaster mini-app that transforms social engagement into onchain achievements. Built for launch pilots, guild leaders, and crypto-native communities, it features:

- **Multi-chain GM Streaks**: Daily check-ins tracked across Base, Optimism, Celo, Ink, and Unichain
- **Quest System**: Autonomous verification of social + onchain activities with oracle-signed proofs
- **Autonomous Agent**: NLP-powered bot (FID 1069798) that responds to mentions with personalized stats
- **Real-time Telemetry**: Live event streams for tips, quests, GM activity, and treasury operations
- **Admin Control Center**: Operator dashboard for bot configuration, analytics, and partner snapshots
- **Guild Coordination**: Team-based challenges with shared progress tracking

**Live Deployment**: https://gmeowhq.art  
**Farcaster Mini App**: https://farcaster.xyz/miniapps/uhjwm4MTUVBr/gmeowbased-adventure  
**Manifest**: https://gmeowhq.art/.well-known/farcaster.json

---

## Core Features

### 🎬 Cinematic Onboarding (Mega Intro)
Desktop-locked animated sequence with:
- Warp field animations using CSS keyframes
- Staged storytelling with auto-progression
- Real-time Neynar profile loading
- Power badge detection and display
- Replay mechanism for demo purposes

**Implementation**: `app/page.tsx`, `app/styles/mega-intro.css`, `components/intro/MegaIntro.tsx`

### 🛰️ Command Deck (Homepage)
Main control interface featuring:
- Animated counters with custom `useAnimatedCount` hook
- Momentum bars showing XP progress
- Streak history visualization
- Quest spotlight carousel
- Direct links to analytics, guild, and quest flows

**Implementation**: `app/page.tsx`, `components/home/*`, `hooks/useAnimatedCount.ts`

### 📊 Admin Control Center
Multi-tab dashboard for operators:
- **Stats Response Engine**: Configure bot mention keywords, cooldowns, Neynar score thresholds
- **On-chain Event Matrix**: Aggregated contract events with notification hooks
- **Partner Snapshots**: Allowlist management for partner integrations
- **Health Monitoring**: Real-time status pills for Supabase, Neynar, and blockchain RPC

**Implementation**: `app/admin/page.tsx`, `components/admin/*`

### 🤖 Autonomous Agent (Bot)
Intelligent Farcaster bot (FID 1069798) with:
- **Intent Detection**: Recognizes 7 intent types (stats, tips, streak, quests, leaderboard, gm, help)
- **Neynar Score Gating**: Configurable threshold (default 0.5) to filter low-quality mentions
- **Event Aggregation**: Queries `gmeow_rank_events` for personalized stats
- **Wallet Resolution**: Prioritizes verified addresses over custody wallets
- **Timeframe Parsing**: Understands "today", "this week", "last 7 days", etc.
- **Duplicate Prevention**: Idempotency keys prevent double-posting

**Implementation**: `lib/agent-auto-reply.ts`, `app/api/neynar/webhook/route.ts`, `lib/bot-config.ts`

### 🎯 Quest System
Dynamic quest verification with:
- **Oracle-signed Proofs**: Backend validates social + onchain requirements
- **Multi-chain Support**: Quests can span Base, Optimism, Celo, Ink, Unichain
- **Real-time Notifications**: Miniapp push notifications for completions
- **Leaderboard Integration**: XP rewards automatically sync to rankings
- **Quest Creator Tools**: Admin interface for launching new quests

**Implementation**: `app/Quest/*`, `app/api/quests/*`, `lib/quest-verification.ts`

### 📱 Agent Stream Surface
Mobile-responsive real-time feed:
- Server-Sent Events (SSE) for live updates
- Quest verifications, GM streaks, tips, treasury alerts
- Configurable poll intervals (`NEXT_PUBLIC_AGENT_EVENTS_POLL_MS`)
- Glass morphism UI with responsive breakpoints
- Quick-prompt shortcuts for operators

**Implementation**: `app/Agent/page.tsx`, `components/agent/*`, `app/api/agent/*`

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Command Deck │  │ Admin Panel  │  │ Agent Stream │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Route Handlers)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /api/quests  │  │ /api/neynar  │  │ /api/agent   │     │
│  │ /api/frame   │  │ /api/tips    │  │ /api/admin   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Neynar SDK   │  │ Supabase     │  │ Viem + Wagmi │     │
│  │ (Social)     │  │ (Database)   │  │ (Blockchain) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Farcaster    │  │ PostgreSQL   │  │ Multi-chain  │     │
│  │ Network      │  │ (Supabase)   │  │ RPCs         │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: Farcaster user mentions bot or performs onchain action
2. **Webhook Ingestion**: Neynar webhook hits `/api/neynar/webhook`
3. **Intent Detection**: `buildAgentAutoReply` parses text for intent + timeframe
4. **Data Aggregation**: Queries `gmeow_rank_events` via Supabase
5. **Response Generation**: Formats reply with stats, applies character limit
6. **Publishing**: Neynar SDK posts reply to Farcaster
7. **Telemetry**: Event logged to `gmeow_rank_events` for future queries

---

## Component Breakdown

### Frontend Components

#### `components/intro/MegaIntro.tsx`
**Purpose**: Animated onboarding experience  
**Key Features**:
- Stage progression with `useState` tracking
- Intersection Observer for scroll animations
- Neynar profile fetching via `useSWR`
- Power badge detection and display
- localStorage persistence for replay state

**Dependencies**: `@neynar/react`, `framer-motion`

#### `components/admin/BotStatsConfigPanel.tsx`
**Purpose**: Bot configuration UI  
**Key Features**:
- Form state management for 10+ config fields
- Real-time validation (score threshold 0-1, cooldown > 0)
- Dirty state tracking to enable/disable save button
- `http_set_config` API integration
- Reset to defaults functionality

**Dependencies**: Supabase config functions

#### `components/agent/AgentStreamShell.tsx`
**Purpose**: Real-time event feed container  
**Key Features**:
- SSE connection management
- Auto-reconnect on disconnect
- Poll interval configuration
- Event deduplication by ID
- Responsive grid layout

**Dependencies**: `app/api/agent/events/route.ts`

### Backend Libraries

#### `lib/agent-auto-reply.ts`
**Purpose**: Core autonomous agent logic  
**Exports**:
- `buildAgentAutoReply(input, config)` - Main entry point
- `detectIntent(text)` - NLP intent classification
- `summariseUserEvents(params)` - Event aggregation
- `resolveAddress(user)` - Wallet resolution logic

**Algorithm Flow**:
1. Validate FID exists
2. Fetch Neynar user data + score
3. Check score >= `minNeynarScore` threshold
4. Detect intent (stats/tips/streak/etc)
5. Parse timeframe from natural language
6. Query Supabase for matching events
7. Format reply based on intent type
8. Apply 320-character limit
9. Return formatted text + metadata

**Dependencies**: `@neynar/nodejs-sdk`, `@supabase/supabase-js`

#### `lib/bot-config.ts`
**Purpose**: Bot configuration persistence  
**Key Functions**:
- `loadBotStatsConfig()` - Loads from Supabase or env vars
- `saveBotStatsConfig(config)` - Persists to Supabase
- `sanitiseConfig(raw)` - Validates and normalizes config
- `mergeConfigs(base, override)` - Merge with defaults

**Storage**: Uses Supabase `http_get_config` / `http_set_config` functions with key `app.bot_stats_config`

#### `lib/neynar.ts` & `lib/neynar-server.ts`
**Purpose**: Neynar SDK wrappers  
**Key Functions**:
- `fetchUserByFid(fid)` - Get Farcaster user profile
- `publishCast(params)` - Post cast to Farcaster
- `getNeynarServerClient()` - Singleton SDK instance

**Rate Limiting**: Implements exponential backoff for API errors

#### `lib/supabase-server.ts`
**Purpose**: Supabase client management  
**Key Functions**:
- `getSupabaseServerClient()` - Server-side client singleton
- `isSupabaseConfigured()` - Check env vars present
- Type-safe table helpers

**Security**: Uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations

### API Routes

#### `/api/neynar/webhook` (POST)
**Purpose**: Ingests Farcaster events from Neynar  
**Flow**:
1. Verify HMAC signature
2. Parse webhook payload
3. Filter for `cast.created` events
4. Load bot config
5. Run `buildAgentAutoReply`
6. Check Neynar score threshold
7. Publish reply via Neynar SDK
8. Handle 409 duplicates gracefully
9. Return metadata for debugging

**Webhook Signature Verification**:
```typescript
const signature = req.headers.get('x-neynar-signature')
const hmac = createHmac('sha512', WEBHOOK_SECRET)
hmac.update(JSON.stringify(payload))
const expected = hmac.digest('hex')
// Timing-safe comparison
```

#### `/api/agent/events` (GET)
**Purpose**: SSE stream of rank events  
**Query Params**:
- `since` - ISO timestamp for polling
- `limit` - Max events per response

**Response Format**:
```typescript
{
  events: Array<{
    id: string
    created_at: string
    event_type: 'gm' | 'quest-verify' | 'tip'
    fid: number
    delta: number
    total_points: number
    metadata: Record<string, unknown>
  }>
  nextCursor: string
}
```

#### `/api/quests/[questId]/verify` (POST)
**Purpose**: Oracle-signed quest verification  
**Request Body**:
```typescript
{
  wallet_address: string
  fid: number
  requirements: {
    social?: { type: 'follow' | 'cast' | 'like', target: string }
    onchain?: { chain: string, contract: string, method: string }
  }
}
```

**Response**:
```typescript
{
  verified: boolean
  signature?: string // Oracle signature for onchain claim
  xp_reward: number
  metadata: Record<string, unknown>
}
```

#### `/api/admin/config` (GET/POST)
**Purpose**: Bot configuration management  
**Authentication**: Requires admin session (JWT validation)

**GET**: Returns current config merged with defaults  
**POST**: Validates and persists new config to Supabase

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router, Server Components)
- **Language**: TypeScript 5.4.5
- **Styling**: Tailwind CSS 3.4.1 + Custom CSS
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Animations**: Framer Motion 11.3.21
- **State Management**: React Query (@tanstack/react-query 5.90.2)
- **Lottie Animations**: @lottiefiles/dotlottie-react 0.17.6

### Backend
- **Runtime**: Node.js 22.21.1+
- **API**: Next.js Route Handlers (App Router)
- **Database**: PostgreSQL via Supabase 2.78.0
- **Blockchain**: Viem 2.21.0 + Wagmi 2.17.5
- **Farcaster**: @neynar/nodejs-sdk 3.84.0, @farcaster/miniapp-node 0.1.11
- **Auth**: Jose 5.9.3 (JWT), otplib 12.0.1 (TOTP)

### Infrastructure
- **Hosting**: Vercel (configured in `vercel.json`)
- **Database**: Supabase (PostgreSQL 15)
- **RPC Providers**: Alchemy (Base, Optimism, Celo, Ink, Unichain)
- **CDN**: Vercel Edge Network
- **Webhooks**: Neynar webhook infrastructure

### Smart Contracts
- **Language**: Solidity 0.8.x
- **Chains**: Base, Optimism, Celo, Ink, Unichain
- **Contracts**: `GmeowMultiChain.sol`, `SoulboundBadge.sol`
- **Tools**: Viem for contract interactions

---

## Installation & Setup

### Prerequisites
- Node.js ≥ 22.21.1
- pnpm 10.x (recommended) or npm
- PostgreSQL 15 (via Supabase or self-hosted)
- Neynar API key (https://neynar.com)
- Alchemy API key (https://alchemy.com)
- Farcaster account with custody address (for manifest signing)

### Quick Start

```bash
# Clone repository
git clone https://github.com/0xheycat/gmeow-adventure.git
cd gmeow-adventure

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Run database migrations
pnpm run db:migrate

# Start development server
pnpm run dev
```

Navigate to http://localhost:3000

### Farcaster Manifest Setup

The Farcaster miniapp manifest is located at `/public/.well-known/farcaster.json` and served at `https://gmeowhq.art/.well-known/farcaster.json`.

**⚠️ IMPORTANT**: Before deploying to production, you MUST sign the manifest with your Farcaster custody address.

See [MANIFEST_SETUP.md](./MANIFEST_SETUP.md) for complete instructions on:
- How to sign the manifest using the Farcaster Manifest Tool
- Validating the manifest configuration
- Testing the manifest in Farcaster clients
- Troubleshooting common issues

---

## Environment Configuration

### Required Variables

```env
# Neynar (Farcaster Integration)
NEYNAR_API_KEY=your-api-key-here
NEYNAR_BOT_FID=1069798
NEYNAR_BOT_SIGNER_UUID=your-signer-uuid
NEYNAR_WEBHOOK_SECRET=your-webhook-secret

# Supabase (Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Blockchain RPCs
NEXT_PUBLIC_RPC_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_OP=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_CELO=https://celo-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_UNICHAIN=https://unichain-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_INK=https://ink-mainnet.g.alchemy.com/v2/YOUR_KEY

# Contract Addresses
NEXT_PUBLIC_GM_BASE_ADDRESS=0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F
NEXT_PUBLIC_GM_OP_ADDRESS=0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6
NEXT_PUBLIC_GM_CELO_ADDRESS=0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52
NEXT_PUBLIC_GM_UNICHAIN_ADDRESS=0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f
NEXT_PUBLIC_GM_INK_ADDRESS=0x6081a70c2F33329E49cD2aC673bF1ae838617d26

# OnchainKit (Coinbase SDK)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-key
NEXT_PUBLIC_ONCHAINKIT_APP_NAME=Gmeowbased Adventure
NEXT_PUBLIC_ONCHAINKIT_LOGO=https://gmeowhq.art/logo.png

# Agent Stream Configuration
NEXT_PUBLIC_AGENT_EVENTS_POLL_MS=7000
NEXT_PUBLIC_AGENT_EVENTS_INITIAL_LIMIT=40
NEXT_PUBLIC_AGENT_EVENTS_DELTA_LIMIT=12

# Application
MAIN_URL=https://gmeowhq.art
NEXT_PUBLIC_FRAME_ORIGIN=https://your-domain.com
```

### Optional Variables

```env
# Oracle (for quest verification)
ORACLE_PRIVATE_KEY=0x...

# Maintenance Mode
MAINTENANCE_ENABLED=0
MAINTENANCE_PASSWORD=your-password
MAINTENANCE_TOKEN=your-token

# Admin Auth
ADMIN_ACCESS_CODE=your-admin-code
ADMIN_JWT_SECRET=your-jwt-secret
ADMIN_TOTP_SECRET=your-totp-secret
```

### Database Setup

1. **Create Supabase Project** or set up local PostgreSQL
2. **Run migrations**:
   ```bash
   # Using Supabase CLI
   supabase link --project-ref your-project-ref
   supabase db push
   
   # Or via SQL files
   psql $DATABASE_URL -f scripts/sql/create_rank_events.sql
   psql $DATABASE_URL -f scripts/sql/create_bot_config_functions.sql
   psql $DATABASE_URL -f scripts/sql/create_partner_snapshots.sql
   ```

3. **Seed test data** (development only):
   ```bash
   pnpm dlx tsx scripts/seed-test-data.ts
   ```

### Bot Configuration

1. Navigate to `/admin?tab=bot`
2. Configure mention matchers (default: `@gmeowbased`, `#gmeowbased`)
3. Set Neynar score threshold (0-1, default 0.5)
4. Adjust cooldown periods
5. Click "Save Config"

Configuration persists to Supabase `http_config` table.

---

## API Routes

### Public Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/frame` | GET | Frame metadata dispatcher |
| `/api/manifest` | GET | Farcaster app manifest |
| `/api/leaderboard` | GET | Global rankings |
| `/api/quests` | GET | Quest list |
| `/api/quests/[id]` | GET | Quest details |

### Authenticated Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/config` | GET/POST | Admin | Bot config management |
| `/api/admin/snapshot` | POST | Admin | Partner allowlist snapshots |
| `/api/quests/[id]/verify` | POST | User | Quest verification |

### Webhook Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/neynar/webhook` | POST | HMAC | Farcaster event ingestion |
| `/api/tips/webhook` | POST | HMAC | Tip tracking |

### SSE Streams

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/events` | GET | Real-time rank events |
| `/api/tips/stream` | GET | Live tip feed |

---

## Smart Contracts

### GmeowMultiChain.sol
**Purpose**: Daily GM streak tracking across 5 chains  
**Chains**: Base, Optimism, Celo, Ink, Unichain

**Key Functions**:
```solidity
function gm() external returns (uint256 streak)
function getStreak(address user) external view returns (uint256)
function getLastGM(address user) external view returns (uint256)
```

**Events**:
```solidity
event GM(address indexed user, uint256 streak, uint256 timestamp)
```

**Deployment Addresses**: See Environment Configuration section

### SoulboundBadge.sol
**Purpose**: Non-transferable achievement NFTs

**Key Functions**:
```solidity
function mint(address to, uint256 tokenId, bytes calldata signature) external
function hasBadge(address user, uint256 badgeId) external view returns (bool)
```

**Features**:
- Oracle-signed minting (prevents unauthorized mints)
- Soulbound (transfers disabled except from zero address)
- Metadata URI per badge ID

---

## Autonomous Agent System

### Architecture

The autonomous agent (bot) operates via webhook-driven architecture:

```
Farcaster User → Mentions Bot → Neynar Webhook → /api/neynar/webhook
                                                          ↓
                                                  buildAgentAutoReply()
                                                          ↓
                                        ┌─────────────────┴──────────────────┐
                                        ↓                                     ↓
                                 Intent Detection                    Event Aggregation
                                 (stats/tips/etc)                   (Query Supabase)
                                        ↓                                     ↓
                                        └─────────────────┬──────────────────┘
                                                          ↓
                                                  Format Reply Text
                                                          ↓
                                                   Neynar SDK Post
                                                          ↓
                                                  Reply Published
```

### Intent Detection

The agent recognizes 7 intent types based on keyword matching:

1. **stats**: General stats overview (points, level, tier)
2. **tips**: Tip-giving and receiving history
3. **streak**: Current GM streak status
4. **quests**: Quest completion history
5. **leaderboard**: Rank position and nearby users
6. **gm**: Friendly greeting with quick stats
7. **help**: Usage instructions

**Algorithm**:
```typescript
function detectIntent(text: string): AgentIntentType {
  const lower = text.toLowerCase()
  
  // Check for specific patterns
  if (/tip|tipping|gave|received/i.test(lower)) return 'tips'
  if (/streak|consecutive|daily/i.test(lower)) return 'streak'
  if (/quest|challenge|mission/i.test(lower)) return 'quests'
  if (/leaderboard|rank|position/i.test(lower)) return 'leaderboard'
  if (/^g+m+\s*$/i.test(lower)) return 'gm'
  if (/help|how|what|guide/i.test(lower)) return 'help'
  
  // Default to stats
  return 'stats'
}
```

### Neynar Score Gating

Prevents spam by filtering low-quality mentions:

```typescript
const user = await fetchUserByFid(fid)
const neynarScore = user.experimental?.neynar_user_score ?? 0

if (neynarScore < config.minNeynarScore) {
  return {
    ok: false,
    reason: 'low-score',
    detail: `Score ${neynarScore} < threshold ${config.minNeynarScore}`
  }
}
```

**Threshold**: Configurable in `/admin?tab=bot` (default 0.5)

### Event Aggregation

Queries `gmeow_rank_events` table for user activity:

```sql
SELECT
  SUM(delta) as total_delta,
  COUNT(*) as total_events,
  MAX(created_at) as last_event_at
FROM gmeow_rank_events
WHERE fid = $1
  AND wallet_address = $2
  AND event_type = ANY($3)
  AND created_at >= $4
ORDER BY created_at DESC
LIMIT $5
```

### Reply Formatting

Applies 320-character limit with intelligent truncation:

```typescript
function trimToLimit(text: string, limit = 320): string {
  if (text.length <= limit) return text
  
  // Find last complete sentence before limit
  const truncated = text.slice(0, limit - 3)
  const lastPeriod = truncated.lastIndexOf('.')
  
  if (lastPeriod > limit * 0.7) {
    return truncated.slice(0, lastPeriod + 1)
  }
  
  return truncated + '...'
}
```

### Testing the Agent

**Local Testing** (mock webhook):
```bash
cd scripts
pnpm dlx tsx mock-neynar.ts
```

**Production Testing**:
1. Mention @gmeowbased on Farcaster with "show me my stats"
2. Check response within 15 seconds
3. Verify stats match `/profile` page
4. Test timeframes: "show stats today", "tips this week", etc.

**Debug Webhook**:
```bash
# View recent webhook calls
vercel logs --prod | grep "/api/neynar/webhook"

# Check specific response
curl -X POST https://gmeowhq.art/api/neynar/webhook \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: $SIGNATURE" \
  -d @test-payload.json
```

---

## Development Workflow

### Running Locally

```bash
# Start dev server
pnpm run dev

# In separate terminal, run automation workers
pnpm run tips:worker
pnpm run automation:run
```

### Code Organization

- **Routes**: Place new pages in `app/` directory
- **Components**: Reusable UI in `components/`
- **Libraries**: Business logic in `lib/`
- **API**: Route handlers in `app/api/`
- **Types**: Shared types in `types/` or collocated
- **Styles**: Tailwind classes + CSS modules in `app/styles/`

### Adding a New Feature

1. **Plan**: Document in `planning/2025-11-04/tasks.md`
2. **Implement**: Create feature branch
3. **Test**: Run `pnpm run lint` and `pnpm run build`
4. **Document**: Update README and progress log
5. **Deploy**: Merge to main, Vercel auto-deploys

### Debugging

**Enable verbose logging**:
```typescript
// In lib/neynar.ts
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) console.log('[neynar]', data)
```

**Check Supabase queries**:
```bash
# View recent logs
supabase logs --project-ref your-ref --limit 100

# Monitor real-time
supabase logs --project-ref your-ref --follow
```

**Inspect webhooks**:
```bash
# Local tunnel for webhook testing
pnpm run dev:tunnel

# This exposes localhost:3000 via ngrok
# Update Neynar webhook URL to tunnel URL
```

---

## Project Structure

```
Gmeowbased/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage (Command Deck)
│   ├── layout.tsx                # Root layout + providers
│   ├── globals.css               # Global styles
│   ├── styles/                   # Feature-specific CSS
│   │   ├── mega-intro.css        # Onboarding animations
│   │   └── quest-card.css        # Quest UI styling
│   ├── admin/                    # Admin control center
│   │   └── page.tsx              # Multi-tab dashboard
│   ├── Agent/                    # Agent stream interface
│   │   └── page.tsx              # Real-time event feed
│   ├── Dashboard/                # Ops dashboard
│   ├── Guild/                    # Guild coordination
│   │   ├── page.tsx              # Guild lobby
│   │   └── [guildId]/            # Guild detail routes
│   ├── Quest/                    # Quest hub
│   │   ├── page.tsx              # Quest overview
│   │   ├── [chain]/[questId]/   # Quest details
│   │   └── creator/              # Quest creation tools
│   ├── leaderboard/              # Rankings
│   ├── profile/                  # User profiles
│   └── api/                      # API routes
│       ├── admin/                # Admin endpoints
│       │   ├── config/           # Bot configuration
│       │   └── snapshot/         # Partner snapshots
│       ├── agent/                # Agent stream APIs
│       │   └── events/           # SSE event stream
│       ├── analytics/            # Telemetry endpoints
│       ├── badges/               # Badge minting
│       ├── dashboard/            # Dashboard data
│       ├── farcaster/            # Farcaster auth
│       ├── frame/                # Frame dispatcher
│       ├── gm-card/              # Dynamic OG images
│       ├── leaderboard/          # Ranking APIs
│       ├── neynar/               # Neynar integration
│       │   └── webhook/          # Webhook handler ⭐
│       ├── quests/               # Quest APIs
│       │   └── [questId]/
│       │       └── verify/       # Quest verification
│       ├── seasons/              # Season management
│       ├── telemetry/            # Event logging
│       └── tips/                 # Tip tracking
│           ├── stream/           # SSE tip feed
│           └── webhook/          # Tip ingestion
├── components/                   # React components
│   ├── admin/                    # Admin UI
│   │   ├── AdminHero.tsx         # Status strip
│   │   ├── BotStatsConfigPanel.tsx  # Bot config UI ⭐
│   │   └── ...                   # Other admin components
│   ├── agent/                    # Agent stream UI
│   │   ├── AgentStreamShell.tsx  # Stream container
│   │   └── AgentEventCard.tsx    # Event display
│   ├── home/                     # Homepage components
│   ├── intro/                    # Onboarding flow
│   │   └── MegaIntro.tsx         # Cinematic intro
│   ├── layout/                   # Layout primitives
│   ├── Quest/                    # Quest UI
│   └── ui/                       # Shared UI components
├── contract/                     # Smart contracts
│   ├── GmeowMultiChain.sol       # GM streak contract ⭐
│   └── SoulboundBadge.sol        # Achievement NFTs
├── hooks/                        # Custom React hooks
│   ├── useAnimatedCount.ts       # Counter animations
│   └── ...                       # Other hooks
├── lib/                          # Business logic
│   ├── agent-auto-reply.ts       # Agent engine ⭐
│   ├── bot-config.ts             # Config persistence ⭐
│   ├── bot-config-types.ts       # Config schema ⭐
│   ├── bot-stats.ts              # Stats computation
│   ├── neynar.ts                 # Neynar client
│   ├── neynar-server.ts          # Server-side Neynar
│   ├── neynar-bot.ts             # Bot credentials
│   ├── supabase-server.ts        # Supabase client ⭐
│   ├── wagmi.ts                  # Wagmi config
│   ├── rpc.ts                    # RPC providers
│   ├── quest-verification.ts     # Quest oracle
│   ├── profile-data.ts           # User data helpers
│   ├── leaderboard-aggregator.ts # Ranking logic
│   └── ...                       # Other utilities
├── planning/                     # Design docs (gitignored)
│   ├── 2025-11-04/               # Current sprint
│   │   ├── README.md             # Daily plan
│   │   ├── tasks.md              # Task board
│   │   └── Progress-Gmeow-Adventure.md  # Progress log
│   └── reference/                # API references
├── public/                       # Static assets
│   ├── fonts/                    # Custom fonts
│   ├── lottie/                   # Animation files
│   └── ...                       # Images, icons
├── reference/                    # Legacy code (gitignored)
├── scripts/                      # Automation scripts
│   ├── automation/               # Scheduled tasks
│   │   ├── run-queue.ts          # Task runner
│   │   └── send-gm-reminders.ts  # GM notifications
│   ├── leaderboard/              # Ranking sync
│   ├── sql/                      # Database migrations
│   │   ├── create_rank_events.sql           # Event table ⭐
│   │   ├── create_bot_config_functions.sql  # Config helpers ⭐
│   │   └── ...                   # Other migrations
│   ├── mock-neynar.ts            # Local webhook testing ⭐
│   └── seed-test-data.ts         # Test data generation ⭐
├── supabase/                     # Supabase config
│   ├── config.toml               # Project settings
│   ├── migrations/               # Versioned migrations
│   └── functions/                # Edge functions
├── types/                        # TypeScript types
├── .env.local                    # Environment variables
├── .gitignore                    # Git exclusions
├── DEPLOYMENT.md                 # Deployment guide
├── README.md                     # This file
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── versel.json                   # Vercel config

⭐ = Core autonomous agent components
```

---

## Deployment

### Vercel Deployment

**Prerequisites**:
- Vercel account connected to GitHub
- Environment variables configured in Vercel dashboard

**Steps**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

**Configure Webhook URL**:
After deployment, update Neynar webhook URL to:
```
https://gmeowhq.art/api/neynar/webhook
```

### Environment Variables in Vercel

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Ensure variables are available for **Production** environment
4. Redeploy after adding variables

### Database Migrations

Run migrations after deployment:
```bash
# Using Supabase CLI
supabase db push

# Or via SQL editor in Supabase dashboard
# Copy/paste contents of scripts/sql/*.sql
```

### Post-Deployment Checklist

- [ ] Verify homepage loads at https://gmeowhq.art
- [ ] Test bot mention on Farcaster
- [ ] Check `/admin` authentication
- [ ] Confirm quest verification works
- [ ] Monitor `/api/neynar/webhook` logs
- [ ] Validate multi-chain GM contracts
- [ ] Test Agent stream SSE connection

---

## Quality Assurance

### Linting

```bash
# Run ESLint
pnpm run lint

# Fix auto-fixable issues
pnpm run lint --fix
```

**ESLint Rules**: Configured in `.eslintrc.json`  
**Ignored Paths**: Listed in `.eslintignore`

### Type Checking

```bash
# TypeScript compilation
pnpm run build

# Check types without building
tsc --noEmit
```

### Testing Checklist

**Homepage**:
- [ ] Mega Intro animations render smoothly
- [ ] Counters animate on mount
- [ ] Quest carousel swipes correctly
- [ ] Mobile responsive (320px to 2560px)

**Admin Panel**:
- [ ] All tabs load without errors
- [ ] Bot config saves successfully
- [ ] Status pills update in real-time
- [ ] Partner snapshot form validates correctly

**Agent Stream**:
- [ ] Events load on page mount
- [ ] Auto-refresh works (7s default)
- [ ] Event cards render with correct data
- [ ] Prompt shortcuts copy to clipboard

**Autonomous Agent**:
- [ ] Mention detection works
- [ ] Intent classification accurate
- [ ] Neynar score filtering active
- [ ] Reply posts within 15s
- [ ] Duplicate prevention works
- [ ] Character limit enforced (320)

**Quest System**:
- [ ] Quest list loads
- [ ] Quest details render
- [ ] Verification succeeds for valid requirements
- [ ] XP rewards sync to leaderboard
- [ ] Notifications sent on completion

### Performance Metrics

**Target Metrics**:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- Largest Contentful Paint: < 2.5s

**Monitoring**: Use Vercel Analytics + Web Vitals

---

## Troubleshooting

### Bot Not Responding

**Symptoms**: Mentions to @gmeowbased get no reply

**Checklist**:
1. Verify webhook URL in Neynar dashboard
2. Check `NEYNAR_BOT_SIGNER_UUID` and `NEYNAR_BOT_FID` in env vars
3. Ensure Supabase connection (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
4. Check Neynar score threshold in `/admin?tab=bot` (default 0.5)
5. View logs: `vercel logs --prod | grep "neynar/webhook"`

**Common Issues**:
- **409 Duplicate Cast**: Expected behavior, metadata still returned
- **Low Neynar Score**: User filtered by score threshold, check `meta.neynarScore`
- **Missing Wallet**: User has no verified addresses, bot can't resolve wallet

### Webhook Signature Verification Fails

**Error**: `Invalid signature`

**Fix**:
1. Confirm `NEYNAR_WEBHOOK_SECRET` matches Neynar dashboard
2. Check HMAC algorithm is `sha512`
3. Ensure payload isn't modified before verification
4. Test with `scripts/mock-neynar.ts`

### Supabase Connection Errors

**Error**: `Failed to fetch from Supabase`

**Checklist**:
1. Verify `SUPABASE_URL` and keys are correct
2. Check Supabase project is not paused
3. Ensure `gmeow_rank_events` table exists
4. Run migrations: `supabase db push`
5. Check RLS policies allow service_role access

### Quest Verification Fails

**Error**: `Verification failed`

**Debug Steps**:
1. Check oracle signature validity
2. Verify onchain requirements met (contract method called)
3. Confirm social requirements met (follow/cast/like)
4. View logs: `vercel logs --prod | grep "quests/.*/ verify"`
5. Test oracle locally: `pnpm dlx tsx scripts/test-oracle.ts`

### Agent Stream Not Updating

**Symptoms**: `/Agent` page shows stale data

**Checklist**:
1. Check browser console for SSE errors
2. Verify `NEXT_PUBLIC_AGENT_EVENTS_POLL_MS` is set
3. Ensure Supabase connection works
4. Check `gmeow_rank_events` table has recent data
5. Test API directly: `curl https://gmeowhq.art/api/agent/events`

### Build Failures

**Error**: `Type errors` or `Build failed`

**Steps**:
1. Run `pnpm run lint` to catch syntax issues
2. Fix TypeScript errors: `tsc --noEmit`
3. Clear cache: `rm -rf .next`
4. Reinstall dependencies: `rm -rf node_modules && pnpm install`
5. Check Node.js version: `node --version` (must be ≥ 22.21.1)

---

## Contributing

### Contribution Guidelines

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/your-feature-name`
3. **Make changes**: Follow code style and conventions
4. **Write tests**: Ensure new features are tested
5. **Run quality checks**:
   ```bash
   pnpm run lint
   pnpm run build
   ```
6. **Commit changes**: Use conventional commits
   ```bash
   git commit -m "feat: add new quest verification method"
   ```
7. **Push to fork**: `git push origin feature/your-feature-name`
8. **Open Pull Request**: Describe changes and motivation
9. **Update docs**: Add entry to progress log

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Exports**: Prefer named exports over default
- **Comments**: JSDoc for public APIs, inline comments for complex logic

### Development Principles

1. **Server-first**: Use Server Components when possible
2. **Type safety**: Avoid `any`, use strict types
3. **Error handling**: Always handle errors gracefully
4. **Performance**: Optimize for Core Web Vitals
5. **Accessibility**: ARIA labels, keyboard navigation
6. **Security**: Validate inputs, sanitize outputs

### Reporting Issues

**Before opening an issue**:
- Check existing issues for duplicates
- Try latest version
- Reproduce in clean environment

**Issue template**:
```markdown
## Description
[Clear description of the issue]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g. macOS 14]
- Browser: [e.g. Chrome 120]
- Node.js: [e.g. 22.21.1]
- Version: [e.g. 0.1.1]

## Logs
[Paste relevant logs]
```

---

## License

This project is private and proprietary. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Contact & Support

- **Farcaster**: [@gmeowbased](https://warpcast.com/gmeowbased)
- **Website**: https://gmeowhq.art
- **Warpcast Channel**: `Gmeowbased`
- **Twitter**: [@gmeowHQ](https://twitter.com/gmeowHQ)

**API Support**:
- Neynar: https://docs.neynar.com
- Coinbase OnchainKit: https://onchainkit.xyz
- Alchemy: https://docs.alchemy.com

**Community**:
Join the Warpcast channel for updates, tips, and community support.

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org) by Vercel
- [Neynar](https://neynar.com) for Farcaster infrastructure
- [Supabase](https://supabase.com) for database and auth
- [Viem](https://viem.sh) and [Wagmi](https://wagmi.sh) for blockchain interactions
- [Alchemy](https://alchemy.com) for reliable RPC endpoints
- [OnchainKit](https://onchainkit.xyz) for Coinbase Smart Wallet integration

Special thanks to the Farcaster community for inspiration and feedback.

---

# Manifest deployment 1763956707
