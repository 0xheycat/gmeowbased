# Frame System Modularization Plan

**Created**: December 11, 2025, 7:20 AM CST  
**Status**: 🔴 CRITICAL - Code maintainability issue  
**Priority**: HIGH - Must complete before continuing Phase 3  
**Current Problem**: 3000+ line monolithic `route.tsx` file, hard to maintain

---

## 🚨 Problem Statement

### **Current State** (After Subsquid Migration):
```
app/api/frame/route.tsx (3107 lines)
├── All frame handlers in one file
├── Repeated code patterns (FID resolution, wallet lookup, error handling)
├── Mixed concerns (routing, data fetching, rendering, validation)
├── Hard to test individual frame types
├── Slow to navigate and edit
└── High risk of merge conflicts
```

### **What We Have Now** (Good):
✅ Hybrid Subsquid + Supabase architecture (95/5 rule)
✅ Query functions in `lib/subsquid-client.ts`
✅ Zero compilation errors
✅ All 6 data-driven frames working

### **What's Missing** (Bad):
❌ Frame handlers not modularized
❌ Duplicate code everywhere (FID resolution, wallet lookup)
❌ No reusable frame components
❌ Testing is difficult
❌ Onboarding new developers is slow

---

## 🎯 Modularization Goals

### **Primary Objectives**:
1. **Separate Concerns** - Each frame type in its own file
2. **Reusable Utilities** - Shared code extracted to helpers
3. **Consistent Patterns** - Standardize data fetching and rendering
4. **Easy Testing** - Unit test individual frame handlers
5. **Fast Development** - Add new frames quickly with templates

### **Non-Goals** (Keep Simple):
- ❌ Don't change the Subsquid/Supabase architecture (it works!)
- ❌ Don't add heavy frameworks (keep Next.js API route pattern)
- ❌ Don't over-engineer (prefer simple functions over classes)

---

## 📁 Proposed Directory Structure

```
app/api/frame/
├── route.tsx                          # Main router (200 lines) - Routes to handlers
├── handlers/                          # Frame type handlers (one file per type)
│   ├── gm-frame.ts                   # GM Frame handler (150 lines)
│   ├── leaderboard-frame.ts          # Leaderboard handler (120 lines)
│   ├── points-frame.ts               # Points handler (130 lines)
│   ├── guild-frame.ts                # Guild handler (180 lines)
│   ├── badge-frame.ts                # Badge handler (160 lines)
│   ├── referral-frame.ts             # Referral handler (140 lines)
│   ├── quest-frame.ts                # Quest handler (deferred)
│   ├── verify-frame.ts               # Verify handler (static)
│   ├── onchainstats-frame.ts         # OnchainStats handler (static)
│   └── index.ts                      # Export all handlers
├── utils/                             # Shared utilities
│   ├── frame-builder.ts              # buildFrameHtml, buildDynamicFrameImageUrl
│   ├── frame-validation.ts           # Input sanitization, FID validation
│   ├── fid-resolver.ts               # FID→wallet, FID→username (Neynar)
│   ├── error-handler.ts              # Standard error responses
│   ├── response-helpers.ts           # respondJson, createHtmlResponse
│   └── index.ts                      # Export all utils
├── types/                             # TypeScript types
│   ├── frame-handler.ts              # FrameHandler interface, FrameContext
│   ├── frame-params.ts               # FrameParams, FrameButton types
│   └── index.ts                      # Export all types
└── config/
    └── frame-config.ts                # Frame constants, defaults

lib/subsquid-client.ts                 # Keep as-is (query functions)
lib/supabase/queries/
├── gm.ts                              # Keep as-is (wallet lookup)
├── guild.ts                           # Keep as-is (guild metadata)
└── user.ts                            # Keep as-is (user metadata)
```

---

## 🏗️ Architecture Pattern

### **1. Main Router** (`route.tsx`)
```typescript
// Lightweight router - just dispatch to handlers
export async function GET(request: NextRequest) {
  const params = parseFrameParams(request)
  const type = params.type || 'gm'
  
  // Route to appropriate handler
  const handler = frameHandlers[type]
  if (!handler) {
    return handleUnknownFrameType(type, params)
  }
  
  try {
    return await handler(params, context)
  } catch (error) {
    return handleFrameError(error, type, params)
  }
}
```

### **2. Frame Handler Pattern** (Each `handlers/*.ts`)
```typescript
// Example: handlers/gm-frame.ts
import { FrameHandler } from '../types'
import { getGMStats } from '@/lib/subsquid-client'
import { resolveUserIdentity } from '../utils/fid-resolver'
import { buildFrameResponse } from '../utils/frame-builder'

export const gmFrameHandler: FrameHandler = async (params, context) => {
  // Step 1: Validate input
  const fid = validateFID(params.fid)
  if (!fid) return errorResponse('Invalid FID')
  
  // Step 2: Resolve identity (FID → wallet + username)
  const identity = await resolveUserIdentity(fid)
  if (!identity.wallet) return errorResponse('Wallet not found')
  
  // Step 3: Query Subsquid (95% of work)
  const gmStats = await getGMStats({ 
    fid: identity.fid, 
    walletAddress: identity.wallet 
  })
  
  // Step 4: Build frame response
  return buildFrameResponse({
    type: 'gm',
    title: `${gmStats.totalGMs} GMs • ${gmStats.currentStreak} Day Streak`,
    description: buildGMDescription(gmStats, identity),
    imageUrl: buildImageUrl('gm', { ...gmStats, ...identity }),
    buttons: [
      { label: 'View Profile', target: `/profile/${fid}` }
    ],
    metadata: { fid, streak: gmStats.currentStreak }
  })
}
```

### **3. Shared Utilities** (`utils/*.ts`)

#### **FID Resolver** (`utils/fid-resolver.ts`)
```typescript
// Centralize FID→wallet + username resolution
export async function resolveUserIdentity(fid: number): Promise<{
  fid: number
  wallet: string | null
  username: string | null
  displayName: string | null
}> {
  // Step 1: Get wallet from Supabase (5%)
  const wallet = await getWalletFromFid(fid)
  
  // Step 2: Get username from Neynar
  const { username, displayName } = await fetchUserByFid(fid)
  
  return { fid, wallet, username, displayName }
}

// Used by ALL frame handlers - no duplication!
```

#### **Frame Builder** (`utils/frame-builder.ts`)
```typescript
// Standard frame response builder
export function buildFrameResponse(config: FrameConfig): Response {
  const html = buildFrameHtml({
    title: config.title,
    description: config.description,
    image: config.imageUrl,
    buttons: config.buttons,
    fcMeta: buildMetadata(config.metadata),
    // ... standard fields
  })
  return createHtmlResponse(html)
}
```

### **4. Type Safety** (`types/frame-handler.ts`)
```typescript
// Standard interface for all frame handlers
export interface FrameHandler {
  (params: FrameParams, context: FrameContext): Promise<Response>
}

export interface FrameParams {
  type: string
  fid?: number
  user?: string
  id?: string | number
  [key: string]: any
}

export interface FrameContext {
  origin: string
  asJson: boolean
  debugPayload: any
  traces: Trace[]
}

export interface FrameConfig {
  type: string
  title: string
  description: string
  imageUrl: string
  buttons: FrameButton[]
  metadata?: Record<string, string>
}
```

---

## 📋 Implementation Steps

### **Phase 1: Setup Infrastructure** (2 hours)

**Step 1.1**: Create directory structure
```bash
mkdir -p app/api/frame/{handlers,utils,types,config}
touch app/api/frame/handlers/index.ts
touch app/api/frame/utils/index.ts
touch app/api/frame/types/index.ts
```

**Step 1.2**: Create type definitions
- `types/frame-handler.ts` - Core interfaces
- `types/frame-params.ts` - Parameter types
- `types/index.ts` - Export barrel

**Step 1.3**: Create shared utilities (extract from route.tsx)
- `utils/fid-resolver.ts` - FID→wallet, FID→username
- `utils/frame-builder.ts` - buildFrameHtml, buildImageUrl
- `utils/frame-validation.ts` - sanitizeFID, validateParams
- `utils/error-handler.ts` - Standard error responses
- `utils/response-helpers.ts` - respondJson, createHtmlResponse

### **Phase 2: Extract Frame Handlers** (6 hours - 1 hour per frame)

**Priority Order** (Start with simplest):
1. **Points Frame** (easiest - single entity query)
2. **GM Frame** (simple - streak logic)
3. **Badge Frame** (moderate - badge collection)
4. **Referral Frame** (moderate - code lookup)
5. **Guild Frame** (complex - multiple entities)
6. **Leaderboard Frame** (complex - pagination)

**For Each Frame**:
```bash
# Step 1: Create handler file
touch app/api/frame/handlers/points-frame.ts

# Step 2: Extract handler code from route.tsx
# - Copy `if (type === 'points')` block
# - Refactor to use shared utilities
# - Add TypeScript types
# - Test in isolation

# Step 3: Export from handlers/index.ts
echo "export { pointsFrameHandler } from './points-frame'" >> handlers/index.ts

# Step 4: Update route.tsx to use handler
# Replace giant if-block with:
# return await handlers.pointsFrameHandler(params, context)

# Step 5: Test
curl "http://localhost:3001/api/frame?type=points&fid=123"
```

### **Phase 3: Refactor Main Router** (1 hour)

**Step 3.1**: Update `route.tsx` to be a lightweight router
```typescript
// Before: 3107 lines
// After: ~200 lines

import * as handlers from './handlers'

export async function GET(request: NextRequest) {
  const context = buildFrameContext(request)
  const params = parseFrameParams(request)
  const type = params.type || 'gm'
  
  const handler = handlers[`${type}FrameHandler`]
  if (!handler) return handleUnknownFrameType(type)
  
  try {
    return await handler(params, context)
  } catch (error) {
    return handleFrameError(error, type, params)
  }
}
```

### **Phase 4: Testing & Validation** (2 hours)

**Step 4.1**: Test each frame type
```bash
# GM Frame
curl "http://localhost:3001/api/frame?type=gm&fid=3621"

# Leaderboard Frame
curl "http://localhost:3001/api/frame?type=leaderboards&period=weekly"

# Points Frame
curl "http://localhost:3001/api/frame?type=points&fid=3621"

# Guild Frame
curl "http://localhost:3001/api/frame?type=guild&id=1"

# Badge Frame
curl "http://localhost:3001/api/frame?type=badge&fid=3621"

# Referral Frame
curl "http://localhost:3001/api/frame?type=referral&code=GMEOW123"
```

**Step 4.2**: Compare outputs (before vs after)
- Screenshot each frame type
- Verify metadata is identical
- Check performance (response time)

**Step 4.3**: Check for regressions
```bash
# Run type check
npm run type-check

# Check for errors
npm run lint

# Test production build
npm run build
```

---

## 🎯 Success Criteria

### **Code Quality**:
✅ Main `route.tsx` reduced from 3107 → ~200 lines
✅ Each frame handler isolated in own file (~150 lines each)
✅ Zero code duplication (FID resolution, frame building)
✅ All handlers follow same pattern (easy to understand)
✅ TypeScript types for all frame handlers

### **Maintainability**:
✅ New frame types can be added in <30 minutes
✅ Testing individual frames is straightforward
✅ Code navigation is fast (jump to handler file)
✅ Merge conflicts are rare (separate files)

### **Performance**:
✅ No performance regression (same Subsquid queries)
✅ Response times remain <50ms
✅ Build time doesn't increase

### **Architecture**:
✅ Hybrid Subsquid + Supabase pattern preserved
✅ 95/5 rule still applies (95% Subsquid, 5% Supabase)
✅ No breaking changes to frame URLs or responses

---

## 📊 File Size Comparison

### **Before Modularization**:
```
app/api/frame/route.tsx              3107 lines  ❌ MONOLITH
lib/subsquid-client.ts                860 lines
Total                                3967 lines
```

### **After Modularization**:
```
app/api/frame/
├── route.tsx                          200 lines  ✅ Router only
├── handlers/
│   ├── gm-frame.ts                   150 lines  ✅ Isolated
│   ├── leaderboard-frame.ts          120 lines  ✅ Isolated
│   ├── points-frame.ts               130 lines  ✅ Isolated
│   ├── guild-frame.ts                180 lines  ✅ Isolated
│   ├── badge-frame.ts                160 lines  ✅ Isolated
│   ├── referral-frame.ts             140 lines  ✅ Isolated
│   └── index.ts                       20 lines  ✅ Barrel export
├── utils/
│   ├── fid-resolver.ts                80 lines  ✅ Reusable
│   ├── frame-builder.ts              120 lines  ✅ Reusable
│   ├── frame-validation.ts            60 lines  ✅ Reusable
│   ├── error-handler.ts               50 lines  ✅ Reusable
│   ├── response-helpers.ts            40 lines  ✅ Reusable
│   └── index.ts                       20 lines  ✅ Barrel export
├── types/
│   ├── frame-handler.ts               60 lines  ✅ Type safety
│   ├── frame-params.ts                40 lines  ✅ Type safety
│   └── index.ts                       10 lines  ✅ Barrel export
└── config/
    └── frame-config.ts                 30 lines  ✅ Constants

lib/subsquid-client.ts                 860 lines  ✅ Unchanged

Total                                ~2460 lines  ✅ 40% reduction
```

**Benefits**:
- 🎯 **40% fewer lines** (removed duplication)
- 📁 **13 focused files** vs 1 giant file
- 🧪 **Easy to test** (each handler isolated)
- 🚀 **Fast to navigate** (VS Code jump to file)
- 👥 **Team-friendly** (parallel development)

---

## 🚀 Quick Start Template

### **Adding a New Frame Type** (After Modularization):

```typescript
// 1. Create handler file: app/api/frame/handlers/new-frame.ts
import { FrameHandler } from '../types'
import { resolveUserIdentity } from '../utils/fid-resolver'
import { buildFrameResponse } from '../utils/frame-builder'
import { getNewStats } from '@/lib/subsquid-client'

export const newFrameHandler: FrameHandler = async (params, context) => {
  // Validate
  const fid = validateFID(params.fid)
  if (!fid) return errorResponse('Invalid FID')
  
  // Resolve identity (FID → wallet + username)
  const identity = await resolveUserIdentity(fid)
  
  // Query Subsquid (95%)
  const stats = await getNewStats({ 
    fid, 
    walletAddress: identity.wallet 
  })
  
  // Build response
  return buildFrameResponse({
    type: 'new',
    title: 'New Frame Title',
    description: buildDescription(stats, identity),
    imageUrl: buildImageUrl('new', { ...stats, ...identity }),
    buttons: [{ label: 'Action', target: '/path' }],
    metadata: { fid, customField: stats.value }
  })
}

// 2. Export from handlers/index.ts
export { newFrameHandler } from './new-frame'

// 3. Done! Router automatically picks it up
```

**Time to add new frame**: ~30 minutes (vs 2+ hours before)

---

## 🎓 Developer Experience Improvements

### **Before** (Monolithic):
```typescript
// Developer wants to update GM Frame
// 1. Open route.tsx (3107 lines) 😰
// 2. Search for "type === 'gm'" 🔍
// 3. Scroll through hundreds of lines 📜
// 4. Make change, hope no side effects 🤞
// 5. Test entire frame system 🧪
// 6. Wait 10 seconds for compilation ⏳
```

### **After** (Modular):
```typescript
// Developer wants to update GM Frame
// 1. Open handlers/gm-frame.ts (150 lines) ✅
// 2. See entire GM logic in one screen 👀
// 3. Make change, types prevent errors 💪
// 4. Test just GM frame 🎯
// 5. Hot reload in 1 second ⚡
```

---

## 📈 Timeline & Effort

### **Total Effort**: 11 hours (1.5 days)

| Phase | Task | Time | Complexity |
|-------|------|------|------------|
| 1 | Setup infrastructure | 2h | Low |
| 2.1 | Extract Points Frame | 1h | Low |
| 2.2 | Extract GM Frame | 1h | Low |
| 2.3 | Extract Badge Frame | 1h | Medium |
| 2.4 | Extract Referral Frame | 1h | Medium |
| 2.5 | Extract Guild Frame | 1h | High |
| 2.6 | Extract Leaderboard Frame | 1h | High |
| 3 | Refactor main router | 1h | Medium |
| 4 | Testing & validation | 2h | Medium |

**Parallel Work Possible**:
- Multiple developers can extract different frames simultaneously
- Utils can be built while extracting handlers
- Testing can happen incrementally

---

## ⚠️ Risks & Mitigations

### **Risk 1**: Breaking existing frame URLs
- **Mitigation**: Keep same URL structure, test all endpoints
- **Validation**: Compare JSON responses before/after

### **Risk 2**: Performance regression
- **Mitigation**: Same Subsquid queries, just better organized
- **Validation**: Measure response times, should be identical

### **Risk 3**: Type errors during refactor
- **Mitigation**: Incremental migration, test after each frame
- **Validation**: Run `npm run type-check` frequently

### **Risk 4**: Lost functionality
- **Mitigation**: Systematic extraction, review each handler
- **Validation**: Screenshot comparison, metadata verification

---

## 🎯 Next Steps

### **Immediate Action** (Start Now):
1. ✅ Review this plan with team
2. 🔨 Phase 1: Setup infrastructure (2 hours)
3. 🔨 Phase 2: Extract first 2 frames (Points + GM) (2 hours)
4. 🧪 Test extracted frames
5. 📊 Review progress, adjust approach if needed
6. 🔁 Continue with remaining frames

### **Success Metrics**:
- Line count: 3107 → ~200 (main router)
- Files: 1 monolith → 13 focused files
- Time to add new frame: 2+ hours → ~30 minutes
- Developer onboarding: 2 days → 2 hours

---

## 📚 References

- Current monolith: `app/api/frame/route.tsx` (3107 lines)
- Query layer: `lib/subsquid-client.ts` (works great, keep as-is)
- Subsquid migration doc: `FRAME-SUBSQUID-MIGRATION.md`

---

**Status**: 🔴 READY TO START  
**Owner**: Frame System Team  
**Blocker**: This is blocking efficient Phase 3 progress  
**Estimated Completion**: December 12, 2025 (1.5 days from now)
