# 🚀 Quest Wizard Launch Plan - FUNCTIONAL FOCUS ONLY

**Target Launch Date**: 1-2 weeks from now  
**Current Status**: Beta, 90% complete, missing safety features  
**Goal**: Fully operational, production-ready quest creation (UI migration later)

**⚠️ SCOPE**: Functional correctness ONLY - no UI polish, will migrate to new template later

---

## 📊 Current State Assessment

### ✅ **What's Already Built**
- [x] Complete wizard UI (7,052 lines)
- [x] 4-step flow (Basics, Eligibility, Rewards, Finalize)
- [x] Validation system (256 lines)
- [x] Mobile support + accessibility
- [x] Error boundary wrapper
- [x] Vitest + Playwright setup
- [x] API routes for quest operations
- [x] Page route: `/Quest/creator`

### ❌ **What's Missing (Blockers)**
- [ ] Unit tests for validation
- [ ] Integration tests for API
- [ ] E2E tests for flows
- [ ] Draft auto-save
- [ ] Error recovery
- [ ] Security audit (escrow math)
- [ ] Production monitoring
- [ ] User documentation

---

## 🎯 Launch Phases (1.5-2 Weeks) - FUNCTIONAL ONLY

### **Week 1: Core Functionality & Safety** (Critical)
**Goal**: Ensure wizard works correctly and won't lose user data or money  
**Skip**: All UI improvements, animations, polish

#### **Day 1-2: Draft Auto-Save** (8 hours) ⭐
**Why First**: Users lose work on browser crash

```typescript
// Priority: HIGH | Risk: LOW | Impact: HIGH

Tasks:
1. Create useDraftPersistence hook
2. Auto-save to localStorage every 30s
3. Restore draft on page load
4. Show "Draft saved" indicator
5. Add "Clear draft" button
6. Add draft age check (expire after 7 days)

Files to Create:
- hooks/useDraftPersistence.ts
- components/quest-wizard/DraftSaveIndicator.tsx

Files to Modify:
- components/quest-wizard/QuestWizard.tsx (add hook)
- hooks/useWizardState.ts (integrate persistence)

Testing:
- Manual: Fill form, close tab, reopen
- Unit: Test localStorage read/write
- Edge cases: Corrupt data, expired drafts
```

#### **Day 3-4: Validation Unit Tests** (12 hours) ⭐⭐⭐
**Why Critical**: Escrow math = real money

```typescript
// Priority: CRITICAL | Risk: HIGH | Impact: CRITICAL

Tasks:
1. Write tests for validateBasicsStep (20 test cases)
2. Write tests for validateEligibilityStep (15 test cases)
3. Write tests for validateRewardsStep (25 test cases)
4. Test edge cases (decimals, large numbers, negative)
5. Achieve 90%+ coverage on validation

Files to Create:
- components/quest-wizard/validation/index.test.ts
- components/quest-wizard/validation/fixtures.ts (test data)
- components/quest-wizard/validation/escrow.test.ts

Commands:
npm run test -- components/quest-wizard/validation
npm run test -- --coverage

Success Criteria:
- ✅ All validation logic tested
- ✅ 90%+ code coverage
- ✅ Escrow calculations verified
- ✅ Edge cases handled
```

#### **Day 5: Error Boundaries & Recovery** (6 hours) ⭐
**Why Important**: Graceful failure handling

```typescript
// Priority: HIGH | Risk: MEDIUM | Impact: HIGH

Tasks:
1. Add error boundary per wizard step
2. Implement retry mechanisms
3. Add "Save & Exit" emergency button
4. Log errors to Sentry
5. Show user-friendly error messages
6. Add network failure detection

Files to Create:
- components/quest-wizard/ErrorRecovery.tsx
- components/quest-wizard/EmergencySave.tsx

Files to Modify:
- components/quest-wizard/QuestWizard.tsx (wrap steps)
- app/Quest/creator/page.tsx (enhance boundary)

Testing:
- Simulate API failures
- Test with network offline
- Force component errors
```

---

### **Week 2: Integration & E2E Testing** (Essential)
**Goal**: Verify complete flows work end-to-end

#### **Day 6-7: Component Integration Tests** (10 hours) ⭐⭐
**Why Needed**: Ensure steps work together

```typescript
// Priority: HIGH | Risk: MEDIUM | Impact: HIGH

Tasks:
1. Test BasicsStep component (5 tests)
2. Test EligibilityStep component (5 tests)
3. Test RewardsStep component (8 tests)
4. Test FinalizeStep component (5 tests)
5. Test step navigation flow
6. Test form state persistence between steps

Files to Create:
- components/quest-wizard/steps/BasicsStep.test.tsx
- components/quest-wizard/steps/EligibilityStep.test.tsx
- components/quest-wizard/steps/RewardsStep.test.tsx
- components/quest-wizard/steps/FinalizeStep.test.tsx
- components/quest-wizard/__tests__/integration.test.tsx

Commands:
npm run test -- components/quest-wizard/steps
npm run test -- --ui (for debugging)

Success Criteria:
- ✅ Each step tested in isolation
- ✅ Step transitions work
- ✅ Form data preserved
- ✅ Validation errors displayed
```

#### **Day 8-10: E2E Tests (Playwright)** (16 hours) ⭐⭐⭐
**Why Critical**: Test real user flows

```typescript
// Priority: CRITICAL | Risk: HIGH | Impact: CRITICAL

Tasks:
1. Happy path: Create quest with points reward
2. Happy path: Create quest with token reward
3. Error path: Submit with missing fields
4. Error path: Invalid token amount
5. Edge case: Browser back button
6. Edge case: Network timeout
7. Edge case: Draft restoration
8. Accessibility: Keyboard navigation
9. Accessibility: Screen reader test
10. Mobile: Touch interactions

Files to Create:
- e2e/quest-wizard/create-quest.spec.ts
- e2e/quest-wizard/validation-errors.spec.ts
- e2e/quest-wizard/draft-persistence.spec.ts
- e2e/quest-wizard/accessibility.spec.ts
- e2e/quest-wizard/fixtures.ts (test data)

Commands:
npx playwright test e2e/quest-wizard
npx playwright test --ui
npx playwright test --headed (debug mode)

Success Criteria:
- ✅ Can create quest with points
- ✅ Can create quest with tokens
- ✅ Validation errors shown correctly
- ✅ Draft restoration works
- ✅ Keyboard navigation works
- ✅ Mobile interactions work
```

---

### **Week 2: Security & Deploy** (Final)
**Goal**: Functional and safe deployment  
**Skip**: Polish, UI improvements (template migration will handle)

#### **Day 11-12: Security Audit** (12 hours) ⭐⭐⭐
**Why Critical**: Money is involved

```typescript
// Priority: CRITICAL | Risk: CRITICAL | Impact: CRITICAL

Tasks:
1. Audit escrow math (manual calculation check)
2. Test decimal edge cases (18 decimals)
3. Test large numbers (BigInt handling)
4. SQL injection testing (all inputs)
5. XSS testing (user-submitted content)
6. Rate limiting (prevent spam)
7. Authentication checks (creator permissions)
8. Token address validation
9. Amount overflow checks
10. Race condition testing

Security Checklist:
[ ] Escrow calculations manually verified
[ ] Token decimals handled correctly (6, 8, 18)
[ ] Large amounts (1M+, 1B+, 1T+ tokens) tested
[ ] All inputs sanitized
[ ] SQL injection prevented
[ ] XSS attacks blocked
[ ] Rate limiting enforced
[ ] Auth checks in place
[ ] Token addresses validated (checksummed)
[ ] No race conditions in quest creation

Tools:
- Manual calculation spreadsheet
- Foundry for escrow testing
- OWASP ZAP for security scan
- Postman for API testing

Files to Create:
- tests/security/escrow-calculations.test.ts
- tests/security/input-validation.test.ts
- docs/SECURITY-AUDIT.md
```

#### **Day 13: Basic Performance** (2 hours) ⭐
**Why**: Prevent obvious slowness (skip advanced optimizations)

```typescript
// Priority: LOW | Risk: LOW | Impact: LOW
// SKIP: Virtualization, lazy loading (will do in template migration)
// DO: Only critical memoization

Tasks:
1. Memoize expensive escrow calculations ONLY
2. Skip: Lazy loading, virtualization, bundle optimization
3. Skip: Loading skeletons, prefetching

Files to Modify:
- components/quest-wizard/QuestWizard.tsx (add useMemo for escrow)

Minimal Optimization:
// Only memoize escrow calculation (money-critical)
const escrowTotal = useMemo(
  () => calculateEscrowAmount(maxCompletions, perUser, decimals),
  [maxCompletions, perUser, decimals]
)

// SKIP everything else - UI migration will handle it
```

#### **Day 14: Minimal Documentation** (2 hours)
**Why**: Basic guidance only (skip UI tooltips)

```typescript
// Priority: LOW | Risk: LOW | Impact: LOW
// SKIP: Inline tooltips, video, fancy UI (template migration will add)
// DO: Basic text documentation only

Tasks:
1. Write quest creation guide (text only)
2. Document escrow process (text only)
3. SKIP: Inline help tooltips (UI work)
4. SKIP: Video walkthrough (time consuming)
5. SKIP: FAQ UI (will add in new template)

Files to Create:
- docs/QUEST-CREATION-GUIDE.md (basic markdown)
- docs/ESCROW-EXPLAINER.md (basic markdown)

SKIP Files:
- ❌ components/quest-wizard/components/HelpTooltip.tsx
- ❌ components/quest-wizard/components/InlineHelp.tsx
- ❌ Video content
- ❌ Interactive tutorials

Basic Documentation Only:
- Simple markdown files
- Plain text explanations
- No UI components
```

#### **Day 15: Monitoring & Alerts** (6 hours) ⭐⭐
**Why Critical**: Know when things break

```typescript
// Priority: HIGH | Risk: MEDIUM | Impact: HIGH

Tasks:
1. Set up Sentry error tracking
2. Add custom wizard events
3. Create dashboard for metrics
4. Set up alerts (Slack/Email)
5. Add user analytics
6. Monitor quest creation success rate

Sentry Events:
- wizard_started
- wizard_step_completed
- wizard_validation_failed
- wizard_submitted
- wizard_error
- draft_saved
- draft_restored

Metrics to Track:
1. Quest Creation Funnel
   - Started: Count
   - Step 1 Complete: %
   - Step 2 Complete: %
   - Step 3 Complete: %
   - Submitted: %
   - Success: %

2. Error Rates
   - Validation errors: Count by type
   - API failures: Count by endpoint
   - Client errors: Count by type

3. Performance
   - Page load time: p50, p95
   - Step transition time: p50, p95
   - API response time: p50, p95

4. User Behavior
   - Time per step: Avg
   - Draft usage: %
   - Drop-off points: Most common step

Alerts:
- Error rate > 5% → Slack alert
- API failure > 10% → Page
- Success rate < 80% → Email
- Load time > 5s → Investigate

Files to Create:
- lib/analytics/wizard-events.ts
- app/api/analytics/wizard/route.ts
- docs/MONITORING.md
```

---

## 🎯 Day-by-Day Execution Plan

### **Week 1: Safety First**

#### **Monday (Day 1) - Draft Auto-Save Part 1**
```bash
Time: 4 hours
Tasks:
- [ ] Create hooks/useDraftPersistence.ts
- [ ] Implement auto-save logic (30s interval)
- [ ] Add localStorage read/write functions
- [ ] Handle JSON serialization errors

Deliverable: Working auto-save hook
```

#### **Tuesday (Day 2) - Draft Auto-Save Part 2**
```bash
Time: 4 hours
Tasks:
- [ ] Integrate hook into QuestWizard
- [ ] Add DraftSaveIndicator component
- [ ] Add restore draft on mount
- [ ] Add draft age check + expiration
- [ ] Manual testing (close/reopen browser)

Deliverable: Complete draft persistence feature
Test: Fill form → Close tab → Reopen → Data restored ✅
```

#### **Wednesday (Day 3) - Validation Tests Part 1**
```bash
Time: 6 hours
Tasks:
- [ ] Set up test file structure
- [ ] Create test fixtures
- [ ] Write 20 tests for validateBasicsStep
  - Required fields
  - URL validation
  - Username validation
  - Frame URL edge cases

Deliverable: BasicsStep fully tested
Command: npm run test -- validation/index.test.ts
```

#### **Thursday (Day 4) - Validation Tests Part 2**
```bash
Time: 6 hours
Tasks:
- [ ] Write 15 tests for validateEligibilityStep
  - Asset selection
  - Minimum balance
  - Chain validation
- [ ] Write 25 tests for validateRewardsStep
  - Points validation
  - Token amounts
  - Escrow calculations ⭐⭐⭐
  - Raffle validation

Deliverable: All validation tested
Coverage: 90%+ on validation module
```

#### **Friday (Day 5) - Error Handling**
```bash
Time: 6 hours
Tasks:
- [ ] Add error boundary per step
- [ ] Implement retry mechanisms
- [ ] Add EmergencySave component
- [ ] Integrate Sentry logging
- [ ] Test network failures
- [ ] Test component errors

Deliverable: Robust error handling
Test: Disconnect wifi → Try to submit → Graceful error ✅
```

---

### **Week 2: Integration Testing**

#### **Monday (Day 6) - Component Tests Part 1**
```bash
Time: 5 hours
Tasks:
- [ ] Test BasicsStep component (5 tests)
- [ ] Test EligibilityStep component (5 tests)
- [ ] Test step navigation
- [ ] Test form state persistence

Deliverable: 10 component tests passing
```

#### **Tuesday (Day 7) - Component Tests Part 2**
```bash
Time: 5 hours
Tasks:
- [ ] Test RewardsStep component (8 tests)
- [ ] Test FinalizeStep component (5 tests)
- [ ] Test integration between steps
- [ ] Test validation triggers

Deliverable: All steps tested
```

#### **Wednesday-Thursday (Day 8-9) - E2E Tests Part 1**
```bash
Time: 10 hours
Tasks:
- [ ] Set up Playwright fixtures
- [ ] Write happy path: Points quest
- [ ] Write happy path: Token quest
- [ ] Write error path: Missing fields
- [ ] Write error path: Invalid amounts
- [ ] Test draft persistence flow

Deliverable: 6 E2E tests passing
Command: npx playwright test --headed
```

#### **Friday (Day 10) - E2E Tests Part 2**
```bash
Time: 6 hours
Tasks:
- [ ] Test keyboard navigation
- [ ] Test mobile interactions
- [ ] Test browser back button
- [ ] Test network timeout scenarios
- [ ] Run full test suite

Deliverable: Complete E2E coverage
All tests passing: Unit + Integration + E2E ✅
```

---

### **Week 3: Production Ready**

#### **Monday-Tuesday (Day 11-12) - Security Audit**
```bash
Time: 12 hours
Tasks:
Day 11:
- [ ] Manual escrow math verification
- [ ] Create test cases for decimals (6, 8, 18)
- [ ] Test large numbers (BigInt)
- [ ] Test overflow scenarios
- [ ] Verify token address validation

Day 12:
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] Rate limiting verification
- [ ] Auth checks
- [ ] Race condition testing
- [ ] Document findings

Deliverable: SECURITY-AUDIT.md with sign-off
Critical bugs: 0
High bugs: 0
Medium bugs: < 3
```

#### **Wednesday (Day 13) - Basic Performance + Docs**
```bash
Time: 4 hours
SKIP: Advanced optimizations, UI polish
Tasks:
- [ ] Memoize escrow calculations only
- [ ] Write basic markdown docs
- [ ] SKIP: Lazy loading, virtualization
- [ ] SKIP: Tooltips, videos, UI help

Deliverable: Working calculations + basic docs
Functional: Yes ✅
Pretty: No (will fix in template migration)
```

#### **Thursday (Day 14) - Launch Prep**
```bash
Time: 4 hours
Tasks:
- [ ] Set up Sentry monitoring (errors only)
- [ ] SKIP: Detailed analytics (will add later)
- [ ] Set up critical alerts only
- [ ] Final smoke test on staging
- [ ] Create rollback plan
- [ ] Deploy to production 🚀

Deliverable: LIVE QUEST WIZARD (FUNCTIONAL)
Status: Basic monitoring active
Users: Can create quests safely ✅
UI: Will improve in template migration
```

---

## 🚨 Pre-Launch Checklist (Final Review)

### **Testing**
- [ ] Unit tests: 90%+ coverage on validation
- [ ] Integration tests: All steps tested
- [ ] E2E tests: Happy + error paths covered
- [ ] Manual testing: 5 devices (mobile + desktop)
- [ ] Accessibility: WCAG AA compliant
- [ ] Performance: Lighthouse > 90

### **Security**
- [ ] Escrow math verified manually
- [ ] Decimal handling tested (6, 8, 18)
- [ ] Large number handling tested
- [ ] SQL injection prevented
- [ ] XSS attacks blocked
- [ ] Rate limiting enforced
- [ ] Auth checks in place

### **User Experience**
- [ ] Draft auto-save working
- [ ] Error messages helpful
- [ ] Loading states clear
- [ ] Success feedback shown
- [ ] Help tooltips added
- [ ] Documentation complete

### **Monitoring**
- [ ] Sentry configured
- [ ] Analytics tracking
- [ ] Alerts set up
- [ ] Dashboard created
- [ ] Error rate baseline established

### **Documentation**
- [ ] User guide written
- [ ] Escrow process explained
- [ ] Troubleshooting documented
- [ ] API docs updated
- [ ] Security audit logged

### **Deployment**
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Feature flag ready
- [ ] Rollback plan documented
- [ ] Support team briefed

---

## 📊 Success Metrics (Post-Launch)

### **Week 1 After Launch**
Target Metrics:
- Quest creation started: 50+ users
- Quest creation success rate: > 80%
- Error rate: < 5%
- Average completion time: < 10 minutes
- Draft usage: > 40%
- Support tickets: < 10

### **Week 2-4 After Launch**
Growth Metrics:
- Daily active creators: 20+
- Quest variety: 3+ types being used
- Token quests created: 10+
- NFT quests created: 5+
- User satisfaction: > 4.5/5

---

## 🎯 Critical Path (Can't Launch Without)

These 5 items are **ABSOLUTE BLOCKERS**:

### **1. Validation Tests** ⭐⭐⭐
**Why**: Money calculations must be correct
**Time**: 12 hours
**Status**: [ ] Not started

### **2. Draft Auto-Save** ⭐⭐⭐
**Why**: Users will lose work otherwise
**Time**: 8 hours
**Status**: [ ] Not started

### **3. E2E Tests (Happy Paths)** ⭐⭐⭐
**Why**: Verify quest creation works end-to-end
**Time**: 10 hours
**Status**: [ ] Not started

### **4. Security Audit (Escrow)** ⭐⭐⭐
**Why**: Wrong math = users lose money
**Time**: 8 hours
**Status**: [ ] Not started

### **5. Error Handling** ⭐⭐
**Why**: Graceful failures, not crashes
**Time**: 6 hours
**Status**: [ ] Not started

**Total Critical Path**: 44 hours
**Timeline**: 5-6 days full-time, 2 weeks part-time

---

## 💡 Quick Start (Today)

Want to start RIGHT NOW? Here's what to do first:

### **Step 1: Set Up Testing (30 min)**
```bash
# Create test directory
mkdir -p components/quest-wizard/__tests__

# Install test dependencies (if needed)
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event vitest-fetch-mock

# Verify Vitest works
npm run test
```

### **Step 2: Write First Test (1 hour)**
```bash
# Create validation test file
touch components/quest-wizard/validation/index.test.ts

# Write first test (see code below)
# Run it: npm run test -- validation
```

### **Step 3: Implement Draft Auto-Save (2 hours)**
```bash
# Create hook
touch hooks/useDraftPersistence.ts

# Integrate into wizard
# Test: Fill form, close tab, reopen
```

---

## 🚀 Let's Start NOW

I can help you with any of these tasks:

1. **Write the first 10 validation tests** (1 hour)
2. **Implement draft auto-save** (2 hours)
3. **Set up E2E test structure** (30 min)
4. **Add error boundaries** (1 hour)
5. **Create security audit checklist** (30 min)

**What do you want to tackle first?**

Choose one and I'll write the complete code for you right now. 🚀
