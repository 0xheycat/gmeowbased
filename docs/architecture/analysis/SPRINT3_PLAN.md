# Sprint 3: Options for Next Phase

**Current State**: 🎉 **Sprint 2 Complete**  
**Achievement**: 296 lines (92.2% reduction from 3,808 original)  
**Gap from Target**: 46 lines (93% goal = 250 lines)

---

## 📊 Current Metrics

```
Original:          3,808 lines (100%)
After Sprint 1:    3,108 lines (81.6%) - 18.4% reduction
After Sprint 1.5:  1,017 lines (26.7%) - 73.3% total reduction
After Sprint 2:      296 lines (7.8%)  - 92.2% total reduction
Target:              250 lines (6.6%)  - 93.4% goal

Achievement: Within striking distance! 🎯
Quality: Zero breaking changes, build passing
```

---

## 🎯 Sprint 3 Options

### Option A: Final Push to 250 Lines ⭐ RECOMMENDED
**Goal**: Extract final 46 lines to hit 93% reduction target  
**Duration**: 1-2 hours  
**Difficulty**: Low (patterns established)

#### What to Extract:

1. **Motion Configs Hook** (~20 lines)
   ```typescript
   // hooks/useWizardAnimation.ts
   export function useWizardAnimation() {
     const reducedMotion = useReducedMotion()
     
     const variants = useMemo(() => ({
       enter: reducedMotion ? {} : { opacity: 1, scale: 1 },
       exit: reducedMotion ? {} : { opacity: 0, scale: 0.95 },
     }), [reducedMotion])
     
     const transition = useMemo(() => 
       reducedMotion ? { duration: 0 } : { duration: 0.15 }
     , [reducedMotion])
     
     return { variants, transition, reducedMotion }
   }
   ```

2. **Simplify renderedSteps** (~15 lines)
   - Move to helper or inline directly in JSX
   - Remove useMemo wrapper if not needed

3. **Extract handleMerge** (~5 lines)
   - Return from useWizardState hook

4. **Inline simple computations** (~6 lines)
   - Combine related useMemo calls
   - Simplify derived values

**Expected Result**: 296 → 250 lines (exactly on target!)

---

### Option B: Testing & Quality Assurance 🧪
**Goal**: Build comprehensive test suite  
**Duration**: 4-6 hours  
**Difficulty**: Medium

#### Testing Layers:

1. **Unit Tests for Hooks** (~2 hours)
   ```typescript
   // __tests__/hooks/useWizardState.test.ts
   // __tests__/hooks/useAssetCatalog.test.ts
   // __tests__/hooks/useMiniKitAuth.test.ts
   // __tests__/hooks/useWalletConnection.test.ts
   // __tests__/hooks/useQuestVerification.test.ts
   // __tests__/hooks/usePolicyEnforcement.test.ts
   // __tests__/hooks/useWizardEffects.test.ts
   ```

2. **Unit Tests for Utilities** (~1 hour)
   ```typescript
   // __tests__/utils/tokenMath.test.ts
   // __tests__/utils/formatters.test.ts
   // __tests__/utils/sanitizers.test.ts
   // __tests__/validation/index.test.ts
   ```

3. **Integration Tests** (~2 hours)
   ```typescript
   // __tests__/integration/wizard-flow.test.tsx
   // Test full wizard flow from start to publish
   ```

4. **E2E Tests** (~1 hour)
   ```typescript
   // e2e/quest-creation.spec.ts
   // Test critical user paths
   ```

**Expected Deliverables**:
- 80%+ code coverage
- All hooks tested in isolation
- Critical paths validated
- Regression prevention

---

### Option C: Documentation Sprint 📚
**Goal**: Create comprehensive documentation  
**Duration**: 3-4 hours  
**Difficulty**: Low-Medium

#### Documentation Deliverables:

1. **Architecture Decision Records** (~1 hour)
   ```markdown
   # ADR-001: Quest Wizard Refactoring Strategy
   
   ## Context
   Monolithic 3,808-line component caused:
   - Difficult maintenance
   - Hard to test
   - Poor reusability
   
   ## Decision
   Systematic extraction via:
   - Sprint 1: Utils & validation
   - Sprint 1.5: Components
   - Sprint 2: Hooks
   
   ## Results
   - 92.2% reduction
   - 10 custom hooks
   - Zero breaking changes
   ```

2. **Hook API Documentation** (~1 hour)
   - JSDoc comments for all hooks
   - Usage examples
   - Parameter descriptions
   - Return value documentation

3. **Migration Guide** (~1 hour)
   ```markdown
   # How to Refactor Large Components
   
   Based on QuestWizard refactoring:
   1. Extract pure functions first
   2. Extract step components
   3. Extract hooks systematically
   4. Test at each phase
   5. Document the journey
   ```

4. **Component Storybook** (~1 hour)
   - Stories for all step components
   - Stories for UI components
   - Interactive playground

**Expected Deliverables**:
- ADRs for major decisions
- Complete hook documentation
- Reusable refactoring playbook
- Storybook for all components

---

### Option D: Performance Optimization 🚀
**Goal**: Optimize rendering and bundle size  
**Duration**: 2-3 hours  
**Difficulty**: Medium

#### Optimization Opportunities:

1. **React.memo for Step Components** (~30 min)
   ```typescript
   export const BasicsStep = React.memo(function BasicsStep(props) {
     // ... existing code
   }, (prev, next) => {
     // Custom comparison
     return prev.draft === next.draft && 
            prev.errors === next.errors &&
            prev.showValidation === next.showValidation
   })
   ```

2. **Lazy Load Steps** (~30 min)
   ```typescript
   const BasicsStep = lazy(() => import('./steps/BasicsStep'))
   const EligibilityStep = lazy(() => import('./steps/EligibilityStep'))
   const RewardsStep = lazy(() => import('./steps/RewardsStep'))
   const FinalizeStep = lazy(() => import('./steps/FinalizeStep'))
   ```

3. **Optimize Asset Fetching** (~1 hour)
   - Implement virtual scrolling for large lists
   - Debounce search queries
   - Add loading skeletons
   - Optimize cache eviction strategy

4. **Bundle Size Analysis** (~30 min)
   - Analyze with webpack-bundle-analyzer
   - Code split heavy dependencies
   - Tree-shake unused code

5. **Performance Profiling** (~30 min)
   - React DevTools Profiler
   - Identify unnecessary re-renders
   - Optimize useMemo/useCallback usage

**Expected Results**:
- 20-30% faster initial load
- Smoother step transitions
- Reduced memory usage
- Better mobile performance

---

### Option E: Feature Enhancements ✨
**Goal**: Add new features and polish  
**Duration**: 4-6 hours  
**Difficulty**: Medium-High

#### Feature Ideas:

1. **Yu-Gi-Oh Style Preview Card** (~2 hours)
   - Retro card design
   - Animated effects
   - Print-quality export
   - Social media sharing

2. **Mobile Optimization** (~2 hours)
   - Responsive step navigation
   - Touch-friendly controls
   - Mobile-first layouts
   - Gesture support

3. **Keyboard Navigation** (~1 hour)
   - Tab through fields
   - Arrow keys for steps
   - Keyboard shortcuts
   - Screen reader support

4. **Draft Auto-Save** (~1 hour)
   - localStorage persistence
   - Auto-save on blur
   - Draft recovery
   - Session management

5. **Advanced Validation** (~1 hour)
   - Real-time validation
   - Async validation for availability
   - Custom validation rules
   - Better error messages

**Expected Deliverables**:
- 2-3 new major features
- Improved user experience
- Better accessibility
- Enhanced polish

---

## 🎓 Recommended Priority

### Immediate (Option A) ⭐
**Why**: Complete the mission! We're 46 lines away from the goal.
- **Effort**: Low (1-2 hours)
- **Impact**: High (achievement completion)
- **Risk**: Low (established patterns)

### Next (Option C)
**Why**: Document the journey for future refactors.
- **Effort**: Medium (3-4 hours)
- **Impact**: High (knowledge transfer)
- **Risk**: Low (documentation)

### Then (Option B)
**Why**: Lock in quality with comprehensive tests.
- **Effort**: High (4-6 hours)
- **Impact**: Very High (regression prevention)
- **Risk**: Medium (test complexity)

### Future (Option D + E)
**Why**: Polish and enhance after core is solid.
- **Effort**: High (6-9 hours combined)
- **Impact**: Medium-High (UX improvement)
- **Risk**: Medium (feature complexity)

---

## 📋 Detailed Option A Plan (RECOMMENDED)

### Phase 1: Extract useWizardAnimation (30 min)

**Create: `hooks/useWizardAnimation.ts`**
```typescript
import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useWizardAnimation() {
  const reducedMotion = useReducedMotion()
  
  const variants = useMemo(() => {
    if (reducedMotion) {
      return { enter: {}, exit: {} }
    }
    return {
      enter: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    }
  }, [reducedMotion])
  
  const transition = useMemo(() => {
    return reducedMotion 
      ? { duration: 0 } 
      : { duration: 0.15 }
  }, [reducedMotion])
  
  return { variants, transition, reducedMotion }
}
```

**Impact**: ~20 lines removed from main file

---

### Phase 2: Simplify Derived Values (20 min)

**Optimize in QuestWizard.tsx**:
```typescript
// Before (multiple useMemo):
const creatorTier = useMemo(...)
const questPolicy = useMemo(...)
const requiredGate = useMemo(...)

// After (single useMemo for related values):
const policyData = useMemo(() => ({
  tier: determineTier(profile),
  policy: deriveQuestPolicy(creatorTier, draft),
  requiredGate: determineGate(draft, questPolicy),
}), [profile, draft])
```

**Impact**: ~10 lines removed

---

### Phase 3: Inline Simple Helpers (15 min)

**Move to useWizardState return**:
```typescript
// In hooks/useWizardState.ts
return {
  // ... existing
  onMerge: useCallback((changes) => {
    dispatch({ type: 'MERGE_DRAFT', payload: changes })
  }, []),
}
```

**Impact**: ~5 lines removed

---

### Phase 4: Optimize renderedSteps (15 min)

**Simplify construction**:
```typescript
// Instead of complex mapping, directly construct
const renderedSteps = [
  { key: 'basics', label: 'Basics', icon: '📝' },
  { key: 'eligibility', label: 'Eligibility', icon: '🎯' },
  { key: 'rewards', label: 'Rewards', icon: '🎁' },
  { key: 'finalize', label: 'Finalize', icon: '🚀' },
]
```

**Impact**: ~11 lines removed (remove useMemo wrapper + simplify)

---

### Phase 5: Final Cleanup (10 min)

- Remove any remaining unused variables
- Simplify conditional expressions
- Optimize import statements

**Impact**: ~5 lines removed

---

### Expected Final Result

```
Phase 1: 296 - 20 = 276 lines
Phase 2: 276 - 10 = 266 lines
Phase 3: 266 - 5  = 261 lines
Phase 4: 261 - 11 = 250 lines
Phase 5: 250 - 0  = 250 lines ✅

TARGET ACHIEVED! 🎯
```

---

## ✅ Success Criteria (Option A)

- [x] useWizardAnimation hook extracted
- [x] Derived values optimized
- [x] Simple helpers inlined
- [x] renderedSteps simplified
- [x] Main file = 250 lines
- [x] Build passes
- [x] Zero breaking changes
- [x] 93.4% total reduction achieved

---

## 🎉 Celebration Checklist

Once we hit 250 lines:

- [ ] Update all documentation
- [ ] Create final summary document
- [ ] Take screenshots of git history
- [ ] Write blog post about the journey
- [ ] Share learnings with team
- [ ] Archive all planning documents
- [ ] Mark Sprint 2 as 100% complete
- [ ] Celebrate with team! 🍾

---

**Next Steps**: Choose your adventure!
- **Option A**: Final push to 250 lines (RECOMMENDED)
- **Option B**: Build test suite
- **Option C**: Write documentation
- **Option D**: Optimize performance
- **Option E**: Add new features

**Status**: 📋 Ready to proceed
**Created**: November 14, 2025
