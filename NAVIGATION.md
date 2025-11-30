# 🗺️ GMEOWBASED NAVIGATION GUIDE

> **Current Structure** - Foundation Rebuild Branch  
> **Last Updated**: November 30, 2025

---

## 📱 MOBILE MINIAPPS STRUCTURE

All miniapps live under `/app/app/` directory:

```
app/app/
├── daily-gm/          # Daily GM check-in miniapp
├── leaderboard/       # User rankings and stats
├── quests/            # Quest system and rewards
├── quest-marketplace/ # Browse and claim quests
├── guilds/            # Guild management
├── badges/            # Badge collection and display
├── nfts/              # NFT gallery and management
├── notifications/     # User notifications
└── profile/           # User profile pages
```

### 🎯 Miniapp Entry Points

Each miniapp has a standard structure:
- `page.tsx` - Main entry point (mobile-first layout)
- `layout.tsx` - Optional layout wrapper
- Components in `/components` directory

**Navigation Pattern:**
```
User opens Farcaster → Navigates to miniapp → 
Loads /app/app/{miniapp}/page.tsx → 
Renders mobile-optimized UI
```

---

## 🏗️ PROJECT STRUCTURE

### Core Directories

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── app/               # 📱 MINIAPPS (see above)
│   └── onboard/           # User onboarding flow
│
├── components/            # Reusable UI components
│   ├── ui/               # Base UI primitives (Tailwick)
│   └── [feature]/        # Feature-specific components
│
├── lib/                   # Core utilities and config
│   ├── auth/             # Authentication helpers
│   ├── supabase/         # Database client
│   └── utils/            # General utilities
│
├── hooks/                 # React custom hooks
│
├── types/                 # TypeScript type definitions
│
├── styles/               # Global styles and themes
│   └── gmeowbased-foundation.css  # Tailwick v2.0 base
│
├── contract/             # Smart contracts (Foundry)
│
├── scripts/              # Build and automation scripts
│   ├── tests/           # Test scripts (moved from root)
│   └── automation/      # Automation workflows
│
└── docs-archive/         # Historical documentation
    ├── completed-phases/     # Finished work docs
    └── old-planning-nov-2025/ # 89 old planning docs
```

---

## 🎨 STYLING SYSTEM

**Foundation**: Tailwick v2.0 (Next.js TypeScript variant)

```
styles/
├── gmeowbased-foundation.css   # Main foundation (852 lines)
└── globals.css                 # Global overrides

Components use:
- Tailwind CSS v4 utility classes
- Tailwick component primitives
- CSS modules for component-specific styles
```

**Design System Files:**
- `components/ui/tailwick-primitives.tsx` - Base components
- `tailwind.config.ts` - Tailwind configuration
- `components.json` - shadcn/ui config

---

## 🔐 AUTHENTICATION FLOW

```
User Login
↓
app/onboard/page.tsx (if new user)
↓
Farcaster Connect via @farcaster/auth-kit
↓
Session stored in Supabase
↓
Access miniapps in app/app/*
```

**Auth Files:**
- `lib/auth/farcaster.ts` - Farcaster integration
- `middleware.ts` - Route protection
- `contexts/AuthContext.tsx` - Global auth state

---

## 🔌 API STRUCTURE

```
app/api/
├── auth/              # Authentication endpoints
├── user/             # User data and stats
├── leaderboard/      # Rankings and scores
├── quests/           # Quest management
├── guilds/           # Guild operations
└── nfts/             # NFT metadata
```

**API Pattern:**
```typescript
// Request
GET /api/user/stats?fid=123

// Response
{
  "gms": 42,
  "streak": 7,
  "xp": 1500
}
```

---

## 📦 KEY CONFIGURATION FILES

### Build & Deploy
- `next.config.js` - Next.js configuration
- `vercel.json` - Vercel deployment settings
- `railway.json` - Railway deployment config
- `package.json` - Dependencies and scripts

### Development
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - Linting rules
- `vitest.config.ts` - Test configuration
- `.env.local` - Environment variables (not in git)

### Blockchain
- `foundry.toml` - Foundry/Forge config
- `deployment-{chain}-mainnet.json` - Contract addresses

---

## 🧪 TESTING STRUCTURE

```
__tests__/              # Unit and integration tests
├── api/               # API route tests
├── components/        # Component tests
└── hooks/             # Hook tests

e2e/                   # End-to-end tests (Playwright)

scripts/tests/         # Test automation scripts
├── test-frame-images.sh
└── test-stage5-performance.sh
```

**Run tests:**
```bash
npm test                    # Unit tests (Vitest)
npm run test:e2e           # E2E tests (Playwright)
./scripts/tests/test-*.sh  # Manual test scripts
```

---

## 📚 DOCUMENTATION LOCATION

### Active Documentation (Root)
Keep these in root for quick reference:
- `README.md` - Project overview
- `CHANGELOG.md` - Version history
- `CURRENT-TASK.md` - Current work (NEW - single source of truth)

### Archived Documentation
- `docs-archive/completed-phases/` - Finished work documentation
- `docs-archive/old-planning-nov-2025/` - 89 old planning docs (archived)

### Technical Docs
- `docs/` - Framework documentation (Nextra)
- `reference/` - API reference docs

---

## 🚀 DEPLOYMENT TARGETS

### Production
- **Primary**: Vercel (https://gmeowbased.vercel.app)
- **Alternative**: Railway (configured, ready to deploy)

### Multichain Support (15 chains)
Defined in `lib/gm-utils.ts`:
```typescript
base, optimism, arbitrum, celo, unichain, ink, 
ethereum, avax, berachain, bnb, fraxtal, katana, 
soneium, taiko, hyperevm
```

Contract deployments in `deployment-{chain}-mainnet.json`

---

## 🎯 MOBILE-FIRST NAVIGATION

### How Users Access Miniapps

1. **Farcaster Frame**
   - Users see frame in Farcaster feed
   - Click action button
   - Opens miniapp in Farcaster browser

2. **Direct Link**
   - Share link: `gmeowbased.vercel.app/app/daily-gm`
   - Opens in mobile browser
   - Works in any Farcaster client

3. **Miniapp Navigation**
   - Bottom navigation bar (on mobile)
   - Sidebar navigation (on desktop)
   - Implemented in `app/app/layout.tsx`

### Mobile Optimization
- Viewport: `width=device-width, initial-scale=1`
- Touch targets: Minimum 44px × 44px
- Responsive breakpoints in `tailwind.config.ts`
- Mobile-first CSS in foundation

---

## 🔄 COMMON WORKFLOWS

### Adding New Miniapp
```bash
# 1. Create directory
mkdir -p app/app/my-miniapp

# 2. Create page
cat > app/app/my-miniapp/page.tsx << EOF
export default function MyMiniapp() {
  return <div>Hello Miniapp!</div>
}
EOF

# 3. Add navigation link in app/app/layout.tsx

# 4. Test locally
npm run dev
# Visit: http://localhost:3000/app/my-miniapp
```

### Adding New API Route
```bash
# 1. Create route file
cat > app/api/my-route/route.ts << EOF
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello API' })
}
EOF

# 2. Test
curl http://localhost:3000/api/my-route
```

---

## 🛠️ TROUBLESHOOTING

### Common Issues

**Issue**: Miniapp not loading
- Check `app/app/{miniapp}/page.tsx` exists
- Verify no TypeScript errors: `npm run type-check`
- Check browser console for errors

**Issue**: API not responding
- Verify route exists in `app/api/`
- Check environment variables in `.env.local`
- Review API logs in Vercel dashboard

**Issue**: Styles not applying
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check Tailwind config syntax

---

## 📋 NEXT STEPS

After cleaning workspace:
1. ✅ Documentation organized in `docs-archive/`
2. ✅ Test scripts in `scripts/tests/`
3. ✅ Temp files in `temp-files/`
4. 🎯 Ready to create `CURRENT-TASK.md` for focused work

**No more 89 planning docs. One task at a time.**

---

## 🔗 USEFUL COMMANDS

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build           # Production build
npm run start           # Start production server

# Testing
npm test                # Run unit tests
npm run test:e2e       # Run E2E tests
npm run type-check     # TypeScript validation

# Database
npm run db:push        # Push schema to Supabase
npm run db:studio      # Open Supabase Studio

# Deployment
vercel                 # Deploy to Vercel
railway up             # Deploy to Railway (if configured)
```

---

**Last workspace cleanup**: November 30, 2025  
**Branch**: foundation-rebuild  
**Status**: Clean and organized, ready for focused development
