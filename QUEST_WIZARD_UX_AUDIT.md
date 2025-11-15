# Quest Wizard UX/UI Comprehensive Audit
**Date**: November 15, 2025  
**Scope**: Complete user experience and interface review  
**Status**: Audit in progress, implementing fixes

---

## Executive Summary

**Current State**: Quest Wizard is functionally complete (100%) but has UX/UI refinement opportunities.

**Priority Findings**:
- 🔴 **Critical**: 3 issues (blocking user success)
- 🟡 **High**: 8 issues (degrading experience)
- 🟢 **Medium**: 12 issues (polish opportunities)

**Estimated Impact**: 25-35% improvement in completion rate with fixes

---

## 🔴 Critical Issues (Must Fix)

### 1. **Template Selector Blocks Wallet Connection**
**Severity**: 🔴 Critical  
**Impact**: Desktop users can't connect wallet before seeing templates

**Problem**:
- Template selector shows immediately on mount
- Wallet connection prompt only appears after template selection
- Desktop users stuck in: No wallet → Can't preview rewards → Confused

**User Journey**:
```
❌ Current: Load → Templates → Skip → See wallet prompt → Connect → Start
✅ Better:  Load → See wallet prompt → Connect → Templates → Start
```

**Solution**:
- Move wallet prompt BEFORE template selector
- Or: Add inline wallet button in template selector header
- Show: "Connect wallet to preview rewards" in templates

**Files**: 
- `QuestWizard.tsx` (template order logic)
- `TemplateSelector.tsx` (add wallet prompt)

---

### 2. **No Progress Persistence Across Refresh**
**Severity**: 🔴 Critical  
**Impact**: Users lose progress if they refresh/close tab

**Problem**:
- Auto-save works ONLY after template selection (step 0)
- If user explores templates then refreshes → Lost
- No "unsaved changes" warning on navigation

**Current**:
```tsx
const autoSave = useAutoSave(draft, stepIndex > 0) // Only saves after step 1
```

**Solution**:
- Save immediately on ANY change (including template hover/selection)
- Add browser beforeunload warning
- Persist template selector state

**Files**:
- `hooks/useAutoSave.tsx` (enable earlier)
- `QuestWizard.tsx` (add navigation guard)

---

### 3. **Validation Errors Not Prominent**
**Severity**: 🔴 Critical  
**Impact**: Users click "Next" repeatedly without seeing why it's disabled

**Problem**:
- Error message appears at bottom: "Complete the highlighted fields above"
- Highlighted fields are subtle red border
- No scroll-to-error behavior
- Next button just disabled with no tooltip

**Better UX**:
```tsx
// Current
<button disabled={!valid}>Next ↗</button>
<p className="text-xs">Complete highlighted fields</p>

// Better
<button disabled={!valid} title={!valid ? "Fill required fields above" : ""}>
  Next ↗
</button>
// + Error summary panel at top
// + Auto-scroll to first error on click
```

**Solution**:
- Add tooltip on disabled Next button
- Scroll to first error field on Next click
- Show error count badge: "Next (3 errors)"
- Make error styling more prominent (red glow)

**Files**:
- `StepPanel.tsx` (button improvements)
- `Field.tsx` (error styling)

---

## 🟡 High Priority Issues

### 4. **Mobile Gesture Discoverability**
**Severity**: 🟡 High  
**Impact**: Mobile users don't realize they can swipe

**Problem**:
- Arrow indicators (← →) are subtle and static
- No onboarding tooltip/animation
- First-time users tap Next instead of swiping

**Solution**:
- Animate arrows on first visit (bounce/pulse)
- Show tooltip: "Swipe to navigate" on first step
- Add visual swipe trail effect
- Store "seen_swipe_tutorial" in localStorage

**Files**:
- `Mobile.tsx` (SwipeableStep component)
- `QuestWizard.tsx` (add first-time tutorial)

---

### 5. **No Loading State for Template Selector**
**Severity**: 🟡 High  
**Impact**: Blank screen feels broken

**Problem**:
- Templates load instantly but no skeleton
- If slow network → white screen
- No "Loading templates..." indicator

**Solution**:
```tsx
{!templatesLoaded && <TemplateSkeletonGrid />}
{templatesLoaded && <TemplateGrid templates={...} />}
```

**Files**:
- `TemplateSelector.tsx` (add loading state)

---

### 6. **Asset Search Has No "No Results" State**
**Severity**: 🟡 High  
**Impact**: Users think search is broken

**Problem**:
- Searching for token/NFT with no results shows empty list
- No "No results for 'PEPE'" message
- No suggestion to try different term

**Current**:
```tsx
{tokens.length === 0 && <div>/* Nothing */</div>}
```

**Better**:
```tsx
{tokens.length === 0 && (
  <div className="empty-state">
    <p>No tokens found for "{query}"</p>
    <p>Try searching by symbol or contract address</p>
  </div>
)}
```

**Files**:
- `TokenSelector.tsx`
- `NftSelector.tsx`

---

### 7. **Quest Type Dropdown Hard to Scan**
**Severity**: 🟡 High  
**Impact**: Users don't explore quest types

**Problem**:
- Dropdown with 10+ options
- No icons/badges to differentiate
- No preview of what changes when switching

**Solution**:
- Add visual grid picker (like templates)
- Show icons for each quest type
- Badge: Social/Onchain/Hybrid
- Preview: "Requires: Follow username field"

**Alternative**: Keep dropdown but add icons inline:
```tsx
<option>👥 Follow Quest</option>
<option>⛓️ Hold NFT</option>
```

**Files**:
- `BasicsStep.tsx` (quest type selector)

---

### 8. **Form Fields Missing Placeholder Examples**
**Severity**: 🟡 High  
**Impact**: Users unsure what format to enter

**Examples Found**:
- ✅ Good: `placeholder="@heycat"` (follower username)
- ❌ Missing: Quest title (no example)
- ❌ Missing: Target FID (no example)
- ❌ Generic: "Enter description" (not helpful)

**Better Placeholders**:
```tsx
// Quest title
placeholder="e.g., Win 100 USDC for GM'ing daily"

// Description
placeholder="Tell your community:\n• What to do\n• What they win\n• Deadline or limits"

// Target FID
placeholder="e.g., 3621 (dwr.eth's FID)"
```

**Files**:
- `BasicsStep.tsx` (all input fields)
- `EligibilityStep.tsx` (minimum amount)
- `RewardsStep.tsx` (reward amounts)

---

### 9. **No Preview While Filling Form**
**Severity**: 🟡 High  
**Impact**: Users can't see changes live on mobile

**Problem**:
- PreviewCard only visible on desktop (right sidebar)
- Mobile users must scroll down to see preview
- No sticky preview or live update indicator

**Solution**:
- Add "Preview" floating button on mobile
- Opens BottomSheet with quest card
- Or: Collapsible preview at top of each step

**Files**:
- `QuestWizard.tsx` (add mobile preview button)
- `PreviewCard.tsx` (mobile optimization)

---

### 10. **Chain Selector Missing Chain Icons**
**Severity**: 🟡 High  
**Impact**: Visual recognition slower

**Problem**:
- Dropdown shows only text: "Base", "Optimism"
- Users must read, can't scan visually
- No chain logos

**Solution**:
```tsx
<select>
  <option>🔵 Base</option>
  <option>🔴 Optimism</option>
  <option>⚪ Celo</option>
</select>

// Or better: Custom dropdown with actual logos
```

**Files**:
- `BasicsStep.tsx` (chain selector)
- `lib/chain-icons.ts` (already exists!)

---

### 11. **Confusing "Wallet not linked" for Desktop**
**Severity**: 🟡 High  
**Impact**: Desktop users think MiniKit is required

**Problem**:
- Header says "Wallet not linked"
- Sounds like error state
- Desktop users have wagmi wallet but see this

**Better Copy**:
- MiniKit users: "Farcaster Wallet"
- Desktop users: "External Wallet"
- Both: Show green when connected

**Files**:
- `WizardHeader.tsx` (wallet status messaging)

---

## 🟢 Medium Priority Issues

### 12. **Auto-Save Indicator Too Subtle**
**Severity**: 🟢 Medium  
**Impact**: Users don't trust it's saving

**Problem**:
- Small text: "Last saved: 5 seconds ago"
- No animation when saving
- Users manually copy draft to notes

**Solution**:
- Animated icon while saving (spinning)
- Toast notification: "Draft saved"
- Prominent badge: "All changes saved ✓"

**Files**:
- `useAutoSave.tsx` (AutoSaveIndicator)

---

### 13. **No Keyboard Shortcuts**
**Severity**: 🟢 Medium  
**Impact**: Power users slower

**Missing Shortcuts**:
- `Cmd/Ctrl + →` = Next step
- `Cmd/Ctrl + ←` = Previous step
- `Cmd/Ctrl + S` = Manual save
- `Esc` = Close template selector
- `?` = Show shortcuts help

**Solution**:
- Add `useKeyboardShortcuts` hook
- Show shortcuts in footer
- Tooltip: "Press → for next step"

**Files**:
- `hooks/useKeyboardShortcuts.ts` (new)
- `QuestWizard.tsx` (integrate)

---

### 14. **Image Upload No Drag-and-Drop**
**Severity**: 🟢 Medium  
**Impact**: Extra click required

**Current**: Click button → file picker → select  
**Better**: Drag image → Drop zone → Upload

**Solution**:
```tsx
<Dropzone onDrop={handleDrop}>
  Drag image here or click to browse
</Dropzone>
```

**Files**:
- `BasicsStep.tsx` (media upload section)

---

### 15. **Expiry Picker Hard to Use**
**Severity**: 🟢 Medium  
**Impact**: Users pick wrong dates

**Problem**:
- QuickExpiryPicker shows UTC
- No timezone conversion
- No visual calendar

**Solution**:
- Show local time + UTC
- Add calendar icon button
- Presets: "1 day", "1 week", "1 month"

**Files**:
- `QuickExpiryPicker.tsx`

---

### 16. **No "Why?" Explanations for Fields**
**Severity**: 🟢 Medium  
**Impact**: Users skip optional but useful fields

**Examples Needing Help Icons**:
- Partner mode: "What's this?"
- Raffle strategy: "Blockhash vs Farcaster?"
- Max winners: "How to calculate?"

**Solution**:
- Add `<HelpIcon tooltip="Explanation">` next to labels
- Link to docs for complex topics
- Show examples in tooltip

**Files**:
- `Field.tsx` (add help icon prop)
- All step components

---

### 17. **Error Messages Too Technical**
**Severity**: 🟢 Medium  
**Impact**: Non-technical users confused

**Examples**:
- ❌ "eligibilityAssetId is required"
- ❌ "Draft validation failed at step 2"
- ❌ "Asset not found in lookup"

**Better**:
- ✅ "Please select a token or NFT"
- ✅ "Add eligibility requirements to continue"
- ✅ "Token not found. Try searching by contract address"

**Files**:
- `validation.ts` (error messages)
- `shared.ts` (field names)

---

### 18. **No Success Celebration on Complete**
**Severity**: 🟢 Medium  
**Impact**: Anticlimactic finish

**Problem**:
- Click verify → Loading → Done
- No confetti/animation
- No "Share quest" CTA

**Solution**:
- Confetti animation on success
- Modal: "Quest created! 🎉"
- Buttons: Share | View | Create Another

**Files**:
- `FinalizeStep.tsx` (add success modal)

---

### 19. **Mobile Bottom Navigation Overlaps Form**
**Severity**: 🟢 Medium  
**Impact**: Last field hidden behind buttons

**Problem**:
- Next/Back buttons fixed at bottom
- Long forms → last input hidden
- User must scroll to see validation

**Solution**:
- Add padding-bottom to form
- Or: Make buttons sticky but transparent
- Or: Floating button with shadow

**Files**:
- `StepPanel.tsx` (button positioning)
- `QuestWizard.tsx` (layout spacing)

---

### 20. **Preview Card Toggle Confusing**
**Severity**: 🟢 Medium  
**Impact**: Users don't understand Standard vs Card view

**Problem**:
- Toggle buttons: "Standard" | "Card"
- No explanation of difference
- Both look similar

**Solution**:
- Rename: "List View" | "Card View"
- Add icons: 📋 | 🎴
- Tooltip: "Toggle quest display format"

**Files**:
- `PreviewCard.tsx` (view toggle)

---

### 21. **No Draft List/History**
**Severity**: 🟢 Medium  
**Impact**: Can't resume old draft

**Problem**:
- Only shows recovery for LAST draft
- If user starts new quest → old draft lost
- No way to browse draft history

**Solution**:
- Store multiple drafts with timestamps
- Add "Resume Draft" menu in header
- Show: "5 drafts | Last: 2 hours ago"

**Files**:
- `useAutoSave.tsx` (multi-draft support)
- `QuestWizard.tsx` (draft picker)

---

### 22. **Asset Warnings Not Actionable**
**Severity**: 🟢 Medium  
**Impact**: Users see warning but don't know what to do

**Example Warning**:
```
⚠️ Token verification pending
```

**Better**:
```
⚠️ Token verification pending
   ↳ Your quest will work, but may show "Unverified" badge
   ↳ Submit verification: [Link]
```

**Files**:
- `CatalogStatusBanner.tsx`
- `TokenSelector.tsx` (warning messages)

---

### 23. **No Empty State for Template Selector**
**Severity**: 🟢 Medium  
**Impact**: If templates fail to load → broken UI

**Problem**:
- Assumes templates always available
- No error boundary for template loading
- No fallback if API fails

**Solution**:
```tsx
{templates.length === 0 && (
  <EmptyState>
    No templates available. 
    <button onClick={onStartFromScratch}>
      Start from Scratch
    </button>
  </EmptyState>
)}
```

**Files**:
- `TemplateSelector.tsx`

---

## 📊 Accessibility Audit

### Current State: ✅ Good Foundation

**What's Working**:
- ✅ `aria-label` on most buttons
- ✅ `aria-invalid` on form fields
- ✅ `aria-required` on required inputs
- ✅ `role="radiogroup"` on toggles
- ✅ `role="listbox"` on dropdowns

**Needs Improvement**:
- ⚠️ Missing focus indicators on some buttons
- ⚠️ No skip links for keyboard navigation
- ⚠️ Error announcements not immediate (no `aria-live`)
- ⚠️ Some images missing alt text
- ⚠️ Color contrast issues (subtle grays)

**Recommendations**:
1. Add `aria-live="polite"` to error regions
2. Enhance focus rings: `focus-visible:ring-2`
3. Test with screen reader (NVDA/JAWS)
4. Run axe DevTools audit
5. Add keyboard navigation guide

---

## 🎨 Visual Design Issues

### Typography
- ✅ Good: Consistent font hierarchy
- ⚠️ Issue: Some text too small on mobile (<14px)
- ⚠️ Issue: Low contrast (slate-400 on slate-900)

### Colors
- ✅ Good: Sky blue accent consistent
- ⚠️ Issue: Too many shades of gray (slate-300/400/500)
- ⚠️ Issue: Error red not prominent enough

### Spacing
- ✅ Good: Consistent padding/gaps
- ⚠️ Issue: Mobile gaps too large (wastes space)
- ⚠️ Issue: Desktop max-width too restrictive

### Animations
- ✅ Good: Smooth step transitions
- ✅ Good: SwipeableStep gestures
- ⚠️ Issue: No loading skeletons
- ⚠️ Issue: Abrupt state changes (no fade)

---

## 🚀 Quick Wins (< 1 hour each)

### Immediate Fixes:
1. **Add Next button tooltip** (5 min)
2. **Improve placeholder text** (15 min)
3. **Add loading spinner to template selector** (10 min)
4. **Fix wallet prompt order** (20 min)
5. **Add chain icons to dropdown** (15 min)
6. **Enhance error styling** (20 min)
7. **Add "No results" state** (15 min)
8. **Fix mobile bottom padding** (10 min)

**Total**: ~2 hours for 8 high-impact fixes

---

## 📈 Recommended Implementation Order

### Phase 1: Critical UX (Week 1)
- 🔴 Fix wallet connection flow
- 🔴 Enable early auto-save
- 🔴 Improve validation feedback
- 🟡 Add mobile gesture tutorial

**Impact**: ~30% fewer dropoffs

### Phase 2: Polish (Week 2)
- 🟡 Better form placeholders
- 🟡 Asset search improvements
- 🟡 Quest type visual picker
- 🟢 Keyboard shortcuts

**Impact**: ~15% faster completion

### Phase 3: Delight (Week 3)
- 🟢 Success celebrations
- 🟢 Draft history
- 🟢 Help tooltips
- 🟢 Drag-and-drop uploads

**Impact**: ~10% retention boost

---

## 🔍 User Testing Recommendations

### Test Scenarios:
1. **Desktop first-time user** → Can they connect wallet?
2. **Mobile power user** → Do they discover swipe?
3. **Non-technical creator** → Can they complete quest?
4. **Return user** → Can they find old draft?

### Metrics to Track:
- Time to first quest created
- Step abandonment rate per step
- Template vs scratch usage
- Mobile vs desktop completion rate
- Error message dismissal rate

---

## 📝 Next Steps

1. **Review with team** → Prioritize critical issues
2. **User testing** → Validate assumptions
3. **Implement Phase 1** → Critical UX fixes
4. **Measure impact** → A/B test improvements
5. **Iterate** → Address medium priority items

**Estimated Total Effort**: 40-50 hours for all issues

---

## Appendix: Component Health

| Component | UX Score | Issues | Priority |
|-----------|----------|--------|----------|
| TemplateSelector | 7/10 | 3 | High |
| BasicsStep | 6/10 | 5 | High |
| EligibilityStep | 7/10 | 3 | Medium |
| RewardsStep | 8/10 | 2 | Low |
| FinalizeStep | 7/10 | 2 | Medium |
| WizardHeader | 8/10 | 2 | Low |
| PreviewCard | 8/10 | 2 | Low |
| StepPanel | 7/10 | 3 | High |
| Mobile Components | 7/10 | 3 | High |

**Overall Quest Wizard UX**: **7.2/10** → Target: **9/10** after fixes
