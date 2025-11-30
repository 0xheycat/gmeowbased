# Quest Wizard Features

## Overview
Completed maximization plan with high-impact features for enhanced user experience, performance, and reliability.

## ✅ Completed Features

### 1. QuestCard Integration (Todo #1)
**Status:** Complete  
**Files:** `components/quest-wizard/components/PreviewCard.tsx`, `QuestCard.tsx`

Enhanced the preview experience with Yu-Gi-Oh style animated quest cards:

**Features:**
- **View Toggle**: Switch between standard and card views on preview step (step 3)
- **Lazy Loading**: QuestCard is lazy-loaded with Suspense for better performance
- **Rarity System**: Automatically determines card rarity based on reward type:
  - NFT rewards: Epic
  - Token rewards: Legendary (>1000), Epic (>100), Rare (default)
  - Points: Rare
  - None: Normal
- **Animations**: Holographic foil effect, 3D tilt, card flip, particle effects
- **Responsive**: Works on desktop and mobile devices

**Usage:**
```tsx
<PreviewCard
  summary={questSummary}
  stepIndex={3}
  tokenEscrowStatus={escrowStatus}
  rewardMode={draft.rewardMode}
/>
```

The card automatically shows when on step 3 (preview) with a toggle to switch views.

---

### 2. Quest Templates System (Todo #3)
**Status:** Complete  
**Files:** `components/quest-wizard/quest-templates.ts`, `components/TemplateSelector.tsx`

Pre-configured quest templates for quick-start experience:

**Templates (10 total):**
1. Token Giveaway (social, easy, 5min)
2. NFT Contest (social, easy, 5min)
3. Referral Campaign (social, medium, 10min)
4. Token Holder Airdrop (onchain, easy, 5min)
5. NFT Holder Benefits (onchain, easy, 5min)
6. Engagement Campaign (social, easy, 5min)
7. Content Creator Quest (social, medium, 10min)
8. Frame Interaction Quest (hybrid, medium, 7min)
9. Whale Exclusive Quest (onchain, hard, 5min)
10. Community Milestone (social, medium, 8min)

**Features:**
- **Category Filtering**: All, Social, Onchain, Hybrid tabs
- **Search**: Real-time search by name/description
- **Metadata Display**: Icon, difficulty badge, estimated time
- **Animated Cards**: Hover effects with scale and translateY
- **Start from Scratch**: Option to skip template selection

**Helper Functions:**
```typescript
getTemplateById(id: string)
getTemplatesByCategory(category: 'social' | 'onchain' | 'hybrid')
getTemplatesByDifficulty(difficulty: 'easy' | 'medium' | 'hard')
getPopularTemplates(limit?: number)
applyTemplate(template: QuestTemplate, existingDraft?: Partial<QuestDraft>)
createCustomTemplate(draft: Partial<QuestDraft>, metadata: TemplateMetadata)
```

**Usage:**
```tsx
import { TemplateSelector } from '@/components/quest-wizard/components/TemplateSelector'
import { applyTemplate } from '@/components/quest-wizard/quest-templates'

<TemplateSelector
  onSelectTemplate={(draft) => {
    wizardState.onDraftChange(applyTemplate(template, existingDraft))
  }}
  onStartFromScratch={() => {
    // Continue with empty draft
  }}
/>
```

**Value:** Saves users 5-10 minutes per quest creation by pre-filling sensible defaults.

---

### 3. Auto-Save Functionality (Todo #4)
**Status:** Complete  
**Files:** `hooks/useAutoSave.tsx`, `components/quest-wizard/QuestWizard.tsx`

Automatic draft persistence to prevent data loss:

**Features:**
- **Auto-Save Hook**: Debounced saving every 5 seconds after user stops typing
- **localStorage Persistence**: Drafts saved to browser storage
- **Recovery Prompt**: Shows prompt on mount if unsaved draft exists
- **Metadata Tracking**: Tracks last saved timestamp, version, draft name
- **Save Indicator**: Visual feedback showing save status

**Components:**

1. **useAutoSave Hook:**
```typescript
const {
  save,                    // Manual save function
  clearAutoSave,           // Clear saved draft
  loadAutoSave,            // Load saved draft
  getAutoSaveMetadata,     // Get save metadata
  saveCount,               // Number of times saved
} = useAutoSave(draft, enabled)
```

2. **AutoSaveIndicator:**
```tsx
<AutoSaveIndicator 
  lastSaved={metadata?.lastSaved} 
  isSaving={false}
/>
```

Displays:
- "⟳ Saving..." (while saving)
- "● Not saved" (no save yet)
- "✓ Saved 5s ago" (after save)

3. **AutoSaveRecoveryPrompt:**
```tsx
<AutoSaveRecoveryPrompt
  metadata={metadata}
  onRestore={() => {
    // Restore draft
  }}
  onDiscard={() => {
    // Start fresh
  }}
/>
```

Shows when unsaved draft detected:
- Draft name and last saved time
- "Restore Draft" button
- "Start Fresh" button

**Usage in Wizard:**
```tsx
export default function QuestWizard() {
  const autoSave = useAutoSave(draft, !showRecovery)
  
  // Check for existing draft on mount
  useEffect(() => {
    const metadata = autoSave.getAutoSaveMetadata()
    if (metadata) {
      setRecoveryMetadata(metadata)
      setShowRecovery(true)
    }
  }, [])
  
  return (
    <div>
      <AutoSaveIndicator lastSaved={metadata?.lastSaved} />
      {showRecovery && (
        <AutoSaveRecoveryPrompt
          metadata={recoveryMetadata}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      {/* Wizard content */}
    </div>
  )
}
```

**Configuration:**
- `AUTOSAVE_DELAY_MS`: 5000ms (5 seconds)
- `AUTOSAVE_KEY`: 'quest-wizard-autosave'
- `AUTOSAVE_METADATA_KEY`: 'quest-wizard-autosave-metadata'

**Value:** Prevents data loss from browser crashes, accidental closes, or network issues.

---

## 🟡 Pending Features

### 4. SwipeableStep Integration (Todo #2)
**Estimated Time:** 1 hour  
**Files:** `components/quest-wizard/components/Mobile.tsx`

**Plan:**
- Detect mobile viewport using `useMediaQuery`
- Wrap step panels in `<SwipeableStep>` component
- Add drag threshold detection (50px swipe)
- Trigger `wizardState.onNext()` / `onPrev()` on swipe
- Add haptic feedback on Coinbase Wallet

**Component Ready:** `Mobile.tsx` contains `SwipeableStep` with gesture recognition

**Usage:**
```tsx
{isMobile ? (
  <SwipeableStep
    onSwipeLeft={() => wizardState.onNext(validation)}
    onSwipeRight={() => wizardState.onPrev()}
  >
    <StepPanel {...props} />
  </SwipeableStep>
) : (
  <StepPanel {...props} />
)}
```

---

### 5. Analytics Tracking (Todo #5)
**Estimated Time:** 2 hours

**Events to Track:**
- `wizard_started` - User opens wizard
- `template_selected` - Template chosen from selector
- `step_viewed` - User navigates to step
- `step_completed` - User completes step
- `validation_error` - User encounters validation error
- `quest_created` - User successfully creates quest
- `draft_restored` - User restores auto-saved draft
- `draft_discarded` - User discards auto-saved draft

**Metrics:**
- Completion rate per step
- Drop-off points
- Average time per step
- Template usage frequency
- Error frequency by field

**Implementation:**
```typescript
// lib/analytics.ts
export function trackEvent(event: string, properties: Record<string, any>) {
  // Posthog, Mixpanel, or GA4
}

// In wizard
trackEvent('step_viewed', {
  step: stepIndex,
  stepName: activeStep.key,
  hasDraft: Boolean(draft.name),
})
```

---

### 6. E2E Tests with Playwright (Todo #6)
**Estimated Time:** 3 hours

**Test Scenarios:**

1. **Template Flow:**
   - Open wizard → select template → verify pre-filled fields → submit quest

2. **Manual Flow:**
   - Open wizard → fill each step → validate errors → submit quest

3. **Auto-Save Flow:**
   - Fill form → refresh page → verify recovery prompt → restore draft

4. **Mobile Flow:**
   - Open on mobile → swipe between steps → complete quest

**Setup:**
```bash
pnpm add -D @playwright/test
npx playwright install
```

**Test File:**
```typescript
// e2e/quest-wizard.spec.ts
import { test, expect } from '@playwright/test'

test('creates quest with template', async ({ page }) => {
  await page.goto('/quest-wizard')
  await page.click('text=Token Giveaway')
  await expect(page.locator('[name="name"]')).toHaveValue('Token Giveaway')
  await page.click('text=Next')
  // ... continue through steps
})
```

---

### 7. Performance Monitoring (Todo #7)
**Estimated Time:** 1 hour

**Metrics:**
- **Web Vitals**: LCP, FID, CLS, TTFB, INP
- **Render Times**: Component mount/update times
- **Bundle Size**: Track bundle growth over time
- **Lighthouse Score**: Aim for 90+ on all metrics

**Tools:**
- `web-vitals` package for client metrics
- Lighthouse CI for automated audits
- React DevTools Profiler for component metrics

**Implementation:**
```typescript
// lib/performance.ts
import { onCLS, onFID, onLCP } from 'web-vitals'

export function reportWebVitals() {
  onCLS(console.log)
  onFID(console.log)
  onLCP(console.log)
}

// app/layout.tsx
useEffect(() => {
  reportWebVitals()
}, [])
```

---

### 8. Error Tracking with Sentry (Todo #8)
**Estimated Time:** 1 hour

**Features:**
- Automatic error capture
- Error boundaries for graceful degradation
- Breadcrumbs for wizard state changes
- Source maps for production debugging
- Performance monitoring

**Setup:**
```bash
pnpm add @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Configuration:**
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

// Error boundary
<ErrorBoundary
  fallback={(error) => <ErrorFallback error={error} />}
  onError={(error, errorInfo) => {
    Sentry.captureException(error, { extra: errorInfo })
  }}
>
  <QuestWizard />
</ErrorBoundary>
```

**Breadcrumbs:**
```typescript
// Track wizard state changes
Sentry.addBreadcrumb({
  category: 'wizard',
  message: `Step changed to ${stepIndex}`,
  level: 'info',
  data: { draft },
})
```

---

## Current State

**Completed (3/8 todos):**
- ✅ QuestCard Integration
- ✅ Quest Templates System
- ✅ Auto-Save Functionality

**In Progress (0/8 todos):**
- None

**Pending (5/8 todos):**
- ⏳ SwipeableStep Integration
- ⏳ Analytics Tracking
- ⏳ E2E Tests
- ⏳ Performance Monitoring
- ⏳ Error Tracking

**Test Status:** 129/129 tests passing (100%)

**Files Created:**
- `components/quest-wizard/components/QuestCard.tsx` (383 lines)
- `components/quest-wizard/components/Memoized.tsx` (117 lines)
- `components/quest-wizard/components/Mobile.tsx` (245 lines)
- `components/quest-wizard/components/Accessibility.tsx` (312 lines)
- `components/quest-wizard/quest-templates.ts` (348 lines)
- `components/quest-wizard/components/TemplateSelector.tsx` (178 lines)
- `hooks/useAutoSave.tsx` (221 lines)

**Files Modified:**
- `components/quest-wizard/components/PreviewCard.tsx` (added view toggle + QuestCard)
- `components/quest-wizard/QuestWizard.tsx` (added auto-save integration)
- `app/globals.css` (added 3D transform utilities)

**Total Lines Added:** ~1,804 lines of production code

---

## Next Steps

1. **Immediate (High Impact):**
   - Integrate SwipeableStep for mobile gestures (1 hour)
   - Setup analytics tracking for user insights (2 hours)

2. **Short Term (Quality):**
   - Add E2E tests with Playwright (3 hours)
   - Configure error tracking with Sentry (1 hour)

3. **Medium Term (Optimization):**
   - Implement performance monitoring (1 hour)
   - Optimize bundle size (ongoing)

**Estimated Total Remaining:** ~8 hours of development

**Priority:** Focus on SwipeableStep and analytics next - high user value, moderate effort.
