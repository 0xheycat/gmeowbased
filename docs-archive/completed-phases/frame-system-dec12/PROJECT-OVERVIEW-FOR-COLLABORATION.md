# Gmeowbased Project Overview - For Collaboration
**Date**: December 10, 2025  
**For**: Friend/Collaborator Onboarding  
**Author**: @heycat

---

## 📌 Quick Summary

**Gmeowbased** is a **Farcaster mini-app (miniapp)** that turns social engagement into onchain achievements. Think of it as a **gamified quest platform** where users can:

- Say GM daily and build streaks (like Duolingo but for crypto)
- Complete quests (social + onchain activities)
- Join guilds (team-based challenges)
- Earn badges & NFTs
- Compete on leaderboards
- Get tips from others

**Live Site**: https://gmeowhq.art  
**Farcaster Miniapp**: https://farcaster.xyz/miniapps/uhjwm4MTUVBr/gmeowbased-adventure

---

## 🎯 What Problem Does It Solve?

**For Users**:
- Makes crypto social interactions rewarding (not just posting into void)
- Gamifies daily habits (GM streaks = Duolingo for web3)
- Multi-chain support (Base, Optimism, Celo, Ink, Unichain)
- No wallet required to start (low barrier to entry)

**For Communities**:
- Guild system for coordinated activities
- Leaderboards for competition
- Autonomous bot for engagement (@gmeowbased mentions)
- Real-time analytics dashboard

---

## 🏗️ Technical Architecture

### High-Level Stack

```
Frontend: Next.js 15 (React 18) + TailwindCSS
Backend: Next.js API Routes + Supabase (PostgreSQL)
Blockchain: Foundry + Solidity (Base mainnet)
Social: Farcaster (Neynar SDK)
Hosting: Vercel
```

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 15)                  │
│                                                           │
│  📱 Pages:                                               │
│  ├── Homepage (Command Deck) - Main dashboard           │
│  ├── Dashboard - User stats & achievements              │
│  ├── Quest Hub - Browse & complete quests               │
│  ├── Leaderboard - 9 categories (Quest/Guild/Badges)   │
│  ├── Guild System - Team coordination                   │
│  ├── Profile - User history & rewards                   │
│  ├── Admin Panel - Bot config & analytics               │
│  └── Agent Stream - Real-time event feed                │
│                                                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Route Handlers)                  │
│                                                           │
│  🔌 Endpoints (40+ routes):                             │
│  ├── /api/frame/* - Farcaster frame actions            │
│  ├── /api/quests/* - Quest CRUD & verification         │
│  ├── /api/neynar/webhook - Bot auto-replies            │
│  ├── /api/agent/* - Telemetry streams                  │
│  ├── /api/admin/* - Analytics & configuration          │
│  ├── /api/guild/* - Guild management                   │
│  ├── /api/leaderboard/* - Rankings & stats             │
│  └── /api/user/* - Profile & history                   │
│                                                           │
└──────────┬──────────────────────┬────────────────────┬──┘
           │                      │                    │
           ▼                      ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
│  SUPABASE (DB)   │  │  NEYNAR (SOCIAL) │  │ SMART CONTRACTS│
│                  │  │                  │  │  (BASE CHAIN)  │
│ - users          │  │ - Farcaster API │  │                │
│ - quests         │  │ - Social graph  │  │ - GmeowCore    │
│ - guilds         │  │ - User profiles │  │ - GmeowGuild   │
│ - leaderboard    │  │ - Cast actions  │  │ - GmeowNFT     │
│ - viral_events   │  │ - Bot mentions  │  │ - Proxy        │
│ - tips (planned) │  │                  │  │                │
└──────────────────┘  └──────────────────┘  └────────────────┘
```

---

## 📂 Project Structure

### Repository Layout

```
Gmeowbased/
│
├── 📱 app/                          # Next.js App Router
│   ├── page.tsx                     # Homepage (Command Deck)
│   ├── layout.tsx                   # Root layout + providers
│   ├── globals.css                  # Global styles (SINGLE CSS FILE!)
│   ├── Dashboard/                   # User dashboard
│   ├── Guild/                       # Guild system
│   ├── leaderboard/                 # Rankings
│   ├── admin/                       # Admin panel
│   ├── Agent/                       # Event stream
│   └── api/                         # API routes
│       ├── frame/                   # Farcaster frames
│       ├── quests/                  # Quest system
│       ├── neynar/                  # Bot webhook
│       ├── guild/                   # Guild APIs
│       ├── admin/                   # Analytics
│       └── agent/                   # Telemetry
│
├── 🎨 components/                   # React components
│   ├── intro/                       # Onboarding flow
│   ├── quest/                       # Quest UI
│   ├── guild/                       # Guild UI
│   ├── leaderboard/                 # Rankings UI
│   ├── layout/                      # Layout system
│   └── ui/                          # Shared UI primitives
│
├── 🔧 lib/                          # Business logic
│   ├── agent-auto-reply.ts          # Bot NLP engine
│   ├── quest-verification.ts        # Quest oracle
│   ├── supabase-server.ts           # DB client
│   ├── neynar.ts                    # Farcaster SDK
│   ├── gmeow-utils.ts               # Contract helpers
│   └── profile-data.ts              # User data
│
├── ⛓️ contract/                     # Smart contracts (Solidity)
│   ├── src/
│   │   ├── GmeowCore.sol            # Main logic (GM, points)
│   │   ├── GmeowGuild.sol           # Guild coordination
│   │   ├── GmeowNFT.sol             # Badge minting
│   │   └── GmeowProxy.sol           # Upgradeable proxy
│   ├── test/                        # Foundry tests
│   └── script/                      # Deployment scripts
│
├── 📊 supabase/                     # Database
│   └── migrations/                  # SQL migrations (30+ files)
│
├── 🧪 __tests__/                    # Test suites
│   ├── api/                         # API tests
│   ├── components/                  # Component tests
│   ├── contracts/                   # Contract tests
│   └── integration/                 # E2E tests
│
├── 📚 docs/                         # Documentation
│   ├── architecture/                # System design docs
│   ├── guides/                      # Setup guides
│   └── features/                    # Feature specs
│
└── 🔧 Config files
    ├── package.json                 # Dependencies (150+ packages)
    ├── next.config.js               # Next.js config
    ├── foundry.toml                 # Foundry config
    ├── tsconfig.json                # TypeScript config
    └── tailwind.config.ts           # TailwindCSS config
```

---

## 🎮 Core Features

### 1. **GM Streak System** ⭐
- Daily check-ins tracked onchain
- Streak multipliers (7/30/100 days = 10%/25%/50% bonus)
- Multi-chain support (5 networks)
- 48-hour grace period
- **Implementation**: Smart contract `GmeowCore.sol` + API `/api/frame/gm`

### 2. **Quest System** 🎯
- Social quests (recast, like, follow)
- Onchain quests (swap, bridge, LP)
- Autonomous verification (oracle-signed proofs)
- XP rewards (10-100 per quest)
- **Implementation**: `/api/quests/*` + `lib/quest-verification.ts`

### 3. **Guild Coordination** 🏰
- Team-based challenges
- Shared progress tracking
- Guild leaderboards
- 5-50 members per guild
- **Implementation**: Smart contract `GmeowGuild.sol` + `/app/Guild/*`

### 4. **Autonomous Bot** 🤖
- Responds to @gmeowbased mentions
- Intent detection (7 types: stats/tips/streak/quests/leaderboard/gm/help)
- Personalized stats replies
- Neynar score gating (0.5+ threshold)
- **Implementation**: `/api/neynar/webhook` + `lib/agent-auto-reply.ts`

### 5. **Leaderboard System** 🏆
- 9 categories (All/Quest/Viral/Guild/Referral/Streak/Badge/Tip/NFT)
- Tier system (Bronze → Diamond)
- Updates every 6 hours
- Multi-chain aggregation
- **Implementation**: `/app/leaderboard/page.tsx` + `/api/leaderboard/*`

### 6. **Admin Dashboard** 📊
- Bot configuration (intent detection, score threshold)
- Real-time analytics (GM activity, quest completions)
- Partner snapshots (guild performance)
- Webhook health monitoring
- **Implementation**: `/app/admin/page.tsx` + `/api/admin/*`

### 7. **Tip System** 💰 (DELAYED - Planned)
- USDC tips on Base L2
- Ko-fi-inspired preset amounts ($1/$5/$10/$25/$50)
- 280-character messages
- Milestone celebrations (100/500/1000)
- **Status**: Research complete, implementation delayed
- **Docs**: `docs/features/TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md`

---

## 🛠️ Technology Stack

### Frontend
```
Next.js 15.5.6          # React framework
React 18                # UI library
TypeScript 5.8          # Type safety
TailwindCSS 4.1         # Styling (SINGLE CSS FILE!)
@farcaster/miniapp-sdk  # Miniapp integration
@reown/appkit           # Wallet connection
```

### Backend
```
Next.js API Routes      # Serverless functions
Supabase               # PostgreSQL database
Neynar SDK             # Farcaster social graph
Viem + Wagmi           # Ethereum interactions
Edge Runtime           # Fast API responses
```

### Blockchain
```
Foundry                # Smart contract framework
Solidity 0.8.28        # Contract language
Base L2                # Deployment network
ERC-1967 Proxy         # Upgradeable contracts
OpenZeppelin           # Security libraries
```

### Testing & Quality
```
Vitest                 # Unit tests (85%+ coverage)
Playwright             # E2E tests
ESLint + Prettier      # Code quality
Sentry                 # Error tracking
Lighthouse CI          # Performance monitoring
```

---

## 🗄️ Database Schema

### Key Tables (Supabase PostgreSQL)

1. **users** - User profiles & stats
2. **quests** - Quest definitions
3. **quest_completions** - User progress
4. **guilds** - Guild metadata
5. **guild_members** - Membership
6. **leaderboard_calculations** - Rankings (cached)
7. **viral_tier_history** - Tier upgrades
8. **gmeow_rank_events** - All user events (GM/Quest/Tip)

**Total Migrations**: 30+ SQL files  
**RLS Policies**: Row-level security enabled  
**Indexes**: 50+ for query optimization

---

## 🔐 Smart Contracts (Base Mainnet)

### Architecture

```
GmeowProxy (ERC-1967)
    ↓ delegates to
GmeowCore (Implementation)
    ├── GM functionality
    ├── Point system
    ├── Streak tracking
    └── Multi-chain support

GmeowGuild (Standalone)
    ├── Guild creation
    ├── Member management
    ├── Challenge coordination
    └── Guild rewards

GmeowNFT (ERC-721)
    ├── Badge minting
    ├── Achievement NFTs
    ├── Soulbound options
    └── Metadata storage
```

### Deployment Status
- ✅ **GmeowCore**: Deployed + verified on Base
- ✅ **GmeowGuild**: Deployed + verified on Base
- ✅ **GmeowNFT**: Deployed + verified on Base
- ✅ **GmeowProxy**: Deployed + verified on Base

**Verification**: All contracts verified on Basescan

---

## 📊 Current Status (December 10, 2025)

### What's Working ✅

1. **Homepage (100/100)** - Command Deck UI complete
2. **GM System (100/100)** - Farcaster frames + smart contract
3. **Quest System (95/100)** - CRUD + verification working
4. **Guild System (90/100)** - Core functionality ready
5. **Leaderboard (95/100)** - 9 categories live
6. **Bot System (90/100)** - Auto-replies working
7. **Admin Dashboard (90/100)** - Analytics + config ready
8. **Onboarding Flow (100/100)** - 3-stage intro + skip option

### In Progress 🔄

1. **API Security** - Adding Request-ID headers (idempotency)
2. **Dashboard Polish** - 100/100 quality target
3. **Mobile Optimization** - Touch targets, responsive layout
4. **Performance** - Bundle size optimization

### Delayed ⏸️

1. **Tip System** - Research complete, implementation delayed
   - Reason: Focus on core security + 10 DAU target first
   - Documentation ready: 1500+ lines
   - Timeline: After Week 1 Critical Security complete

### Not Started ❌

1. **Airdrop Checker** - Active research phase
   - 25 airdrops documented (Base + HyperEVM)
   - Contract research ongoing
   - Implementation: TBD

---

## 🎯 Current Goal

**Mission**: **10 Daily Active Users (DAU) by December 24, 2025**

**Strategy**:
1. ✅ Build mobile-first UI (375px → desktop)
2. 🔄 Implement API security (Request-ID headers)
3. 🔄 Polish Dashboard to 100/100 quality
4. ⏳ Launch marketing campaign
5. ⏳ Onboard first 10 users

**Timeline**: 15 days remaining (Dec 10 → Dec 24)

---

## 🚀 How to Run Locally

### Prerequisites
```bash
Node.js 22.21.1+
pnpm 10.20.0+
Foundry (for contracts)
Supabase CLI
```

### Setup

```bash
# 1. Clone repository
git clone https://github.com/0xheycat/gmeowbased.git
cd gmeowbased

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# - NEYNAR_API_KEY
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - NEXT_PUBLIC_MAIN_URL

# 4. Run Supabase locally (optional)
supabase start

# 5. Start dev server
pnpm dev

# 6. Open browser
http://localhost:3000
```

### Test Smart Contracts

```bash
cd contract
forge install
forge test
forge coverage
```

---

## 📚 Key Documentation Files

### Architecture
- `README.md` - Main project overview (1200+ lines)
- `FOUNDATION-REBUILD-ROADMAP.md` - Current roadmap
- `docs/architecture/` - System design docs

### Features
- `docs/features/TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md` - Tip system spec
- `docs/migration/ACTIVE-AIRDROP-CONTRACTS.md` - Airdrop research
- `CURRENT-TASK.md` - Daily task tracking (3200+ lines)

### Development
- `DEPLOYMENT-GUIDE-BASE-MAINNET.md` - Contract deployment
- `API-SECURITY-ENHANCEMENT-ANALYSIS.md` - Security audit
- `MOBILE-MINIAPP-FIX.md` - Mobile optimization

### Testing
- `FRONTEND-TEST-CHECKLIST.md` - QA checklist
- `GUILD-REAL-EXECUTION-TEST-RESULTS.md` - Integration tests
- `production-test-results.json` - Test results

---

## 🎨 Design Principles

1. **Mobile-First** - 375px base, then scale up
2. **Accessibility** - WCAG AAA compliance
3. **Performance** - <3s load time, <100ms API response
4. **Security** - 10-layer API protection
5. **Single CSS File** - All styles in `app/globals.css`
6. **Type Safety** - Strict TypeScript, no `any`

---

## 🤝 How to Contribute

### Areas for Improvement

1. **Frontend**
   - Mobile responsive fixes (touch targets, layout)
   - Performance optimization (bundle size, re-renders)
   - Accessibility improvements (ARIA labels, keyboard nav)

2. **Backend**
   - API security enhancements (Request-ID, rate limiting)
   - Database query optimization (indexes, caching)
   - Error handling improvements (user-friendly messages)

3. **Smart Contracts**
   - Gas optimization
   - Security audits
   - Multi-chain deployment

4. **Features**
   - Tip system implementation (1 hour remaining)
   - Airdrop checker (contract integration)
   - Advanced guild features (tournaments, challenges)

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes
# 3. Run tests
pnpm test
pnpm test:e2e

# 4. Lint & format
pnpm lint

# 5. Build
pnpm build

# 6. Commit
git commit -m "feat: your feature description"

# 7. Push
git push origin feature/your-feature

# 8. Create PR
```

---

## 🐛 Known Issues

1. **API Idempotency** - Missing Request-ID headers (in progress)
2. **Mobile Touch Targets** - Some buttons <44px (fixing)
3. **Bundle Size** - Main bundle 127KB (optimizing)
4. **Tip System** - Implementation delayed (documented)

---

## 📞 Contact & Support

- **Developer**: @heycat
- **Farcaster Bot**: @gmeowbased (FID 1069798)
- **Website**: https://gmeowhq.art
- **Repository**: https://github.com/0xheycat/gmeowbased

---

## 🎯 What I Need Help With

### Priority 1: API Security
- Implement Request-ID headers across all endpoints
- Add idempotency keys for POST requests
- Rate limiting configuration
- Error handling standardization

### Priority 2: Dashboard Polish
- Mobile responsive fixes
- Performance optimization (re-renders)
- Accessibility improvements
- Visual polish (animations, transitions)

### Priority 3: User Acquisition
- Marketing strategy
- Community engagement
- Guild partnerships
- Referral system activation

### Priority 4: Feature Development
- Tip system completion (1 hour)
- Airdrop checker integration
- Advanced guild features
- NFT badge system enhancement

---

## 📈 Metrics & Goals

### Current Metrics
- **Users**: ~50 registered
- **Daily Active Users (DAU)**: 2-3
- **Quests Created**: 15+
- **Guilds Active**: 3
- **GM Streaks**: 10+ users with 7+ days

### Target Metrics (Dec 24, 2025)
- **DAU**: 10+ users
- **Quest Completion Rate**: 60%+
- **Avg Session Duration**: 5+ minutes
- **Return Rate**: 40%+

---

## 🔗 Useful Links

- **Live App**: https://gmeowhq.art
- **Farcaster Miniapp**: https://farcaster.xyz/miniapps/uhjwm4MTUVBr/gmeowbased-adventure
- **GitHub**: https://github.com/0xheycat/gmeowbased
- **Base Explorer**: Search "Gmeow" on basescan.org
- **Documentation**: `/docs` folder in repository

---

## 💡 Summary for Your Friend

**TL;DR**: Gmeowbased is a **production-ready Farcaster miniapp** (gamified social platform) with:

- **Tech Stack**: Next.js 15 + Supabase + Smart Contracts (Base L2)
- **Features**: GM streaks, quests, guilds, leaderboards, autonomous bot
- **Status**: 70% complete, 15 days to 10 DAU target
- **Need Help With**: API security, dashboard polish, user acquisition, feature development

**Code Quality**:
- ✅ 0 TypeScript errors
- ✅ 85%+ test coverage
- ✅ WCAG AAA accessibility
- ✅ Production-ready deployment

**Scale**: 150+ npm packages, 30+ DB migrations, 40+ API routes, 100+ components

Let me know what areas you'd like to focus on! 🚀
