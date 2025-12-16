# Frame Route Architecture Audit
**Date**: December 12, 2025  
**Scope**: Main frame route modularization and cleanup

## 🎯 Current Architecture

### Main Route: `app/api/frame/route.tsx`
- **Current Size**: 1473 lines
- **Purpose**: Universal frame endpoint dispatcher
- **Pattern**: Modular handlers (✅ Complete as of Dec 12, 2025)

### Modular System: `lib/frames/`
- **Handlers**: 11 frame types (all functional)
- **Utils**: Hybrid data fetching (Subsquid + Supabase)
- **Pattern**: Clean separation of concerns

### Image Routes: `app/api/frame/image/{type}/`
- **Routes**: 11 image generators
- **Status**: All working (600x400 PNG)
- **Pattern**: Modular, one route per frame type

### Legacy Routes: `app/frame/`
- **Status**: 9 redirect routes (legacy)
- **Function**: Redirect to modular system
- **Action**: Can be deprecated/removed

---

## 🔍 Issues Identified

### 1. ❌ Direct Neynar API Usage in Main Route
**Location**: Lines 295-380  
**Problem**: 
- `neynarFetchRaw()` - Direct API calls
- `mapNeynarUserToOverlay()` - 327 lines of mapping logic
- `fallbackResolveNeynarProfile()` - Profile resolution

**Impact**:
- Breaks hybrid pattern
- Should be in `lib/frames/neynar.ts`
- Used by: Currently ONLY in main route (handlers don't call it)

**Action**: Move to `lib/frames/neynar.ts`

---

### 2. ❌ Direct RPC Contract Fetching in Main Route
**Location**: Lines 387-470  
**Problem**:
- `fetchQuestOnChain()` - Direct viem contract reads
- `fetchUserStatsOnChain()` - Direct RPC calls
- `createPublicClient()` - Direct viem usage

**Impact**:
- Breaks modular pattern
- Should be in `lib/frames/contract-data.ts`
- Used by: Currently UNUSED (handlers use hybrid-data.ts)

**Action**: Remove or move to lib/frames

---

### 3. ❌ Large Helper Functions in Main Route
**Location**: Lines 311-1263  
**Problem**:
- `mapNeynarUserToOverlay()` - 327 lines
- `getComposeText()` - 209 lines  
- `buildFrameHtml()` - 414 lines

**Impact**:
- Main route too large (1473 lines)
- Should be extracted to separate modules

**Action**: Extract to dedicated files

---

### 4. ❌ Commented/Deprecated Code
**Location**: Throughout file  
**Problem**:
```tsx
// Line 136: "REMOVED: Old FRAME_HANDLERS" 
// Line 179: "DEPRECATED Phase 1E: toAbsoluteUrl"
// Line 489-560: "DEPRECATED: Button plan types"
// Line 1427-1472: "DEPRECATED: POST HANDLER"
```

**Impact**:
- Clutter and confusion
- Reduces readability
- 200+ lines of dead code

**Action**: Remove all commented code

---

### 5. ⚠️ Legacy Redirect Routes
**Location**: `app/frame/*/route.tsx`  
**Problem**:
- 9 redirect routes pointing to main route
- Example: `/frame/gm` → `/api/frame?type=gm`
- Redundant with modular system

**Impact**:
- Maintenance burden
- Potential confusion about which route to use

**Action**: Document as legacy, consider deprecation

---

### 6. ✅ Good: Modular Handler System
**Location**: Lines 1373-1390  
**Pattern**:
```tsx
const modularHandler = getFrameHandler(type)
if (modularHandler) {
  return await modularHandler({ req, url, params, traces, origin, defaultFrameImage, asJson })
}
```

**Status**: Working perfectly, all 11 handlers functional

---

## 📋 Recommended Refactoring Plan

### Phase 1: Extract Large Functions (High Priority)
**Goal**: Reduce main route from 1473 → ~523 lines

1. **Create `lib/frames/neynar-profile.ts`** (327 lines)
   - Move `mapNeynarUserToOverlay()`
   - Move `fallbackResolveNeynarProfile()`
   - Move `neynarFetchRaw()`
   - Export: `resolveNeynarProfile()`

2. **Create `lib/frames/compose-text.ts`** (209 lines)
   - Move `getComposeText()`
   - Export: `generateComposeText()`

3. **Create `lib/frames/html-builder.ts`** (414 lines)
   - Move `buildFrameHtml()`
   - Export: `buildFrameHtml()`

**Savings**: ~950 lines removed

---

### Phase 2: Remove Unused Contract Functions (Medium Priority)
**Goal**: Clean up unused RPC code

4. **Analyze Usage**:
   ```bash
   # Check if fetchQuestOnChain is used
   grep -r "fetchQuestOnChain" lib/frames/
   # Result: NOT USED (handlers use hybrid-data.ts)
   ```

5. **Action**: Remove lines 387-470
   - `fetchQuestOnChain()` - UNUSED
   - `fetchUserStatsOnChain()` - UNUSED
   - These were replaced by `lib/frames/hybrid-data.ts`

**Savings**: ~83 lines removed

---

### Phase 3: Remove Deprecated Code (Low Priority)
**Goal**: Clean up comments and dead code

6. **Remove**:
   - Line 136: Old FRAME_HANDLERS comment
   - Lines 179-194: toAbsoluteUrl function
   - Lines 489-560: Button plan types
   - Lines 1427-1472: POST handler comments

**Savings**: ~200 lines removed

---

### Phase 4: Document Architecture (Documentation)

7. **Create Architecture Docs**:
   - Document modular pattern
   - Document hybrid data fetching
   - Document image generation
   - Mark `app/frame/` as legacy

---

## 📊 Expected Outcomes

### File Size Reduction
```
Current:  1473 lines
Phase 1:  -950 lines → 523 lines
Phase 2:  -83 lines  → 440 lines  
Phase 3:  -200 lines → 240 lines
```

### Final State
- **Main Route**: ~240 lines (routing + validation only)
- **Modular Handlers**: 11 handlers in `lib/frames/handlers/`
- **Utilities**: Clean, organized in `lib/frames/`
- **Pattern**: Pure hybrid modular architecture

---

## 🎯 Migration Strategy

### Step 1: Create New Files (Non-Breaking)
1. Create `lib/frames/neynar-profile.ts`
2. Create `lib/frames/compose-text.ts`
3. Create `lib/frames/html-builder.ts`
4. Copy functions into new files
5. Test imports

### Step 2: Update Main Route (Breaking)
1. Import new modules
2. Replace function calls
3. Test all 11 handlers
4. Verify all image routes

### Step 3: Remove Old Code (Cleanup)
1. Remove old function definitions
2. Remove deprecated comments
3. Remove unused contract functions
4. Final test

### Step 4: Verify (Testing)
```bash
# Test all handlers
for type in gm points badge quest guild onchainstats referral nft badgecollection verify leaderboard
do curl -s "http://localhost:3000/api/frame?type=$type" | grep -q 'fc:frame:image' && echo "✅ $type" || echo "❌ $type"
done

# Test all images
for type in gm points badge quest guild onchainstats referral nft badgecollection verify leaderboard
do curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/frame/image/$type"
done
```

---

## 🚨 Risk Assessment

### Low Risk
- ✅ Extracting functions (non-breaking if done correctly)
- ✅ Removing deprecated comments
- ✅ Removing unused contract functions (not called anywhere)

### Medium Risk
- ⚠️ Updating imports (must test all handlers)
- ⚠️ Changing function signatures (breaking change)

### High Risk
- ❌ Removing `app/frame/` routes (breaking for external links)
- ❌ Changing API response format

---

## ✅ Current Status Summary

### Working ✅
- All 11 modular handlers
- All 11 image routes
- Hybrid data system (Subsquid + Supabase)
- Rate limiting & validation
- Error handling

### Needs Cleanup ⚠️
- Main route too large (1473 lines)
- Direct Neynar usage in main route
- Unused contract fetch functions
- Deprecated code comments
- Legacy redirect routes

### Priority
1. **High**: Extract large functions → ~240 line main route
2. **Medium**: Remove unused contract code
3. **Low**: Remove deprecated comments
4. **Low**: Document legacy routes

---

## 📝 Next Actions

1. ✅ Extract `buildFrameHtml()` → `lib/frames/html-builder.ts`
2. ✅ Extract `getComposeText()` → `lib/frames/compose-text.ts`
3. ✅ Extract Neynar functions → `lib/frames/neynar-profile.ts`
4. ❌ Remove unused `fetchQuestOnChain()` and `fetchUserStatsOnChain()`
5. ❌ Remove deprecated comments
6. ✅ Test all handlers after extraction
7. ✅ Update documentation

**Estimated Time**: 2-3 hours for complete refactor
**Risk Level**: Low (non-breaking if tested properly)
**Benefits**: Clean, maintainable, professional modular architecture

