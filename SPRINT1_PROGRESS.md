# Sprint 1: Quest Wizard Refactor Progress

**Goal**: Reduce QuestWizard.tsx from 3,808 lines → ~200 lines
**Status**: 🟡 **50% Complete** (Updated: Nov 14, 2025)

---

## ✅ Completed (40%)

### 1. Directory Structure Created
```
components/quest-wizard/
├── hooks/        ← Created (empty, ready for extraction)
├── steps/        ← Created (empty, ready for extraction)
├── utils/        ← Created ✅ COMPLETE
├── validation/   ← Created ✅ COMPLETE
└── preview/      ← Created (empty, ready for Yu-Gi-Oh card)
```

### 2. Utils Extracted (100%)
**Files Created**:
- `utils/tokenMath.ts` (80 lines)
  * parseTokenAmountToUnits()
  * formatTokenAmountFromUnits()
  * toBigIntSafe(), safeNumber()
  
- `utils/formatters.ts` (30 lines)
  * formatUnknownError()
  * isAbortError()
  * shortenAddress()
  
- `utils/sanitizers.ts` (40 lines)
  * sanitizePositiveNumberInput()
  * sanitizeNumericInput()
  * sanitizeUsernameInput()
  * isUsernameValid()

- `utils/index.ts` - Centralized exports

**Lines Extracted**: ~150 lines

### 3. Validation Extracted (100%)
**Files Created**:
- `validation/index.ts` (289 lines)
  * validateAllSteps()
  * validateBasicsStep() - 107 lines
  * validateEligibilityStep() - 40 lines
  * validateRewardsStep() - 120 lines

**Lines Extracted**: ~289 lines

### 4. Helpers Extracted (100%)
**Files Created**:
- `helpers.ts` (246 lines)
  * createTokenLookup(), createNftLookup()
  * deriveTokenEscrowStatus() - 24hr warm-up validation
  * summarizeDraft() - quest preview generation
  * deriveQuestModeFromKey()

**Lines Extracted**: ~246 lines

**Total Extracted So Far**: 685 lines / 3,808 lines = 18%

---

## 🟡 In Progress (60%)

### 4. Step Components (0%)
**To Extract**:
- `steps/BasicsStep.tsx` (309 lines) - Quest type, name, description, dynamic fields
- `steps/EligibilityStep.tsx` (307 lines) - Gating configuration, asset selection
- `steps/RewardsStep.tsx` (323 lines) - Points/token/NFT rewards, escrow
- `steps/FinalizeStep.tsx` (393 lines) - Preview & publish

**Lines to Extract**: 1,332 lines

### 5. Hooks (0%)
**To Extract**:
- `hooks/useWizardState.ts` (~200 lines)
  * Draft state (useReducer)
  * Step navigation
  * Touched steps tracking
  
- `hooks/useAssetCatalog.ts` (~300 lines)
  * Token/NFT fetching
  * Search queries
  * Cache management
  * Snapshot handling
  
- `hooks/useWalletAuth.ts` (~150 lines)
  * MiniKit authentication
  * Wallet auto-connect
  * FID resolution
  * Profile loading

**Lines to Extract**: ~650 lines

### 6. Helper Functions (0%)
**To Extract**:
- deriveTokenEscrowStatus() (80 lines)
- summarizeDraft() (90 lines)
- buildVerificationPayload() (180 lines)
- createTokenLookup() (20 lines)
- createNftLookup() (20 lines)

**Lines to Extract**: ~390 lines

---

## 📊 Extraction Progress

```
Total Lines: 3,808
├─ ✅ Utils:        150 lines (4%)
├─ ✅ Validation:   289 lines (8%)
├─ 🟡 Steps:      1,332 lines (35%) ← NEXT
├─ 🟡 Hooks:        650 lines (17%)
├─ 🟡 Helpers:      390 lines (10%)
└─ 🟡 Main Logic:   997 lines (26%) ← Keep for orchestration
```

**Expected Final State**:
- Main QuestWizard.tsx: ~250 lines (orchestration only)
- Extracted modules: ~3,558 lines across 15+ files
- **Reduction**: 3,808 → 250 lines (-93%)

---

## 🎯 Next Steps

### Immediate (Next 2 hours):
1. **Extract Step Components**
   - Create steps/BasicsStep.tsx
   - Create steps/EligibilityStep.tsx
   - Create steps/RewardsStep.tsx
   - Create steps/FinalizeStep.tsx
   - Total: 1,332 lines

2. **Extract Hooks**
   - Create hooks/useWizardState.ts
   - Create hooks/useAssetCatalog.ts
   - Create hooks/useWalletAuth.ts
   - Total: 650 lines

### After Extraction (1-2 hours):
3. **Refactor Main File**
   - Import all extracted modules
   - Keep only orchestration logic
   - Reduce to ~250 lines

4. **Test & Fix**
   - Run TypeScript build
   - Fix import paths
   - Test wizard flow
   - Verify no regressions

---

## 🔍 Findings from Deep Audit

### Critical Issues Discovered:
1. **verify/route.ts**: 1,283 lines (needs similar refactor)
2. **Escrow detection**: Manual (should be automatic)
3. **No caching**: Neynar API calls not cached
4. **No rate limiting**: Verify route vulnerable

### Post-Sprint 1 Priorities:
- **Sprint 1.5**: Refactor verify route (1,283 → 100 lines + 6 modules)
- **Sprint 2**: Yu-Gi-Oh preview card
- **Sprint 3**: Mobile optimization
- **Sprint 4**: Performance optimization

---

## 💾 Commits So Far

1. `dbd23c8` - feat(quest-wizard): Sprint 1 - extract utilities
2. `302736b` - feat(quest-wizard): Sprint 1 - extract validation logic
3. `f8f2783` - feat(quest-wizard): Sprint 1 - extract helper functions

**Next Commit**: Extract hooks (useWizardState, useAssetCatalog, useWalletAuth)

---

**Last Updated**: 2025-11-14
**Estimated Completion**: Sprint 1 ~70% done, 2-3 hours remaining
