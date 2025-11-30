# Phase 14: Quest Wizard v2 - Implementation Plan

**Start Date:** November 28, 2025  
**Estimated Duration:** 2-3 hours  
**Status:** 🚧 IN PROGRESS  
**Priority:** HIGH (completes Phase 13 Task 3)

---

## 🎯 Objective

Build a complete 3-step quest creation wizard to replace the placeholder modal, enabling users to create quests with a smooth, guided experience.

---

## 📋 Requirements

### Functional
- ✅ 3-step wizard flow (no more "Coming Soon" placeholder)
- ✅ Dynamic form fields based on quest type
- ✅ Real-time validation per step
- ✅ Quest preview before creation
- ✅ Success/error states with feedback
- ✅ Points balance check
- ✅ Cost breakdown display

### Technical
- ✅ Reuse `/api/quests/marketplace/create` API (fully working)
- ✅ Use Tailwick v2.0 components (Card, Button, Badge, Input)
- ✅ TypeScript types for form data
- ✅ useState for wizard state management
- ✅ Integration with existing marketplace page

### UX (Tailwick + Gmeowbased patterns)
- ✅ Clean, modern modal design
- ✅ Progress indicator (step 1/3, 2/3, 3/3)
- ✅ Back/Next navigation
- ✅ Icon + label for each quest type
- ✅ Visual feedback on validation errors
- ✅ Loading state during creation

---

## 🏗️ Architecture

### Component Structure
```
QuestCreationWizard (new component)
├── WizardStep1 - Quest Type Selection
│   ├── Category picker (On-Chain / Social)
│   └── Quest type cards (dynamic based on category)
├── WizardStep2 - Quest Details Form
│   ├── Basic info (title, description, reward)
│   ├── Economics (creation cost, earnings %)
│   └── Verification data (dynamic per type)
├── WizardStep3 - Preview & Create
│   ├── Quest preview card
│   ├── Cost breakdown
│   └── Create button with API call
└── Wizard controls (Back, Next, Close)
```

### State Management
```typescript
interface WizardState {
  currentStep: 1 | 2 | 3
  category: 'onchain' | 'social' | null
  questType: QuestType | null
  formData: {
    title: string
    description: string
    reward_points: number
    creation_cost: number
    creator_earnings_percent: number
    max_completions: number | null
    expires_at: string | null
    verification_data: Record<string, any>
  }
  validation: {
    errors: Record<string, string>
    isValid: boolean
  }
  submission: {
    loading: boolean
    error: string | null
    success: boolean
  }
}
```

---

## 🎨 UI Design (Tailwick v2.0 + Gmeowbased)

### Modal Layout
```
┌─────────────────────────────────────────────────┐
│  Quest Creation Wizard        [Step 2/3]    [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Progress Bar: ●●○]                           │
│                                                 │
│  {DYNAMIC STEP CONTENT}                        │
│                                                 │
│                                                 │
│  [Back]                        [Next / Create] │
└─────────────────────────────────────────────────┘
```

### Step 1: Quest Type Selection
```
┌─────────────────────────────────────────────────┐
│  Choose Quest Category                          │
│                                                 │
│  ○ ⛓️ On-Chain Quests                          │
│     Verify token holdings, NFT ownership, etc.  │
│                                                 │
│  ○ 🦋 Social Quests                            │
│     Follow users, like/recast casts, etc.       │
│                                                 │
├─────────────────────────────────────────────────┤
│  Choose Quest Type                              │
│                                                 │
│  [Token Hold]  [NFT Own]  [Transaction]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 2: Quest Details
```
┌─────────────────────────────────────────────────┐
│  Quest Details                                  │
│                                                 │
│  Title: [                                    ]  │
│  Description: [                              ]  │
│               [                              ]  │
│                                                 │
│  Reward Points: [500] ──●────────── 10,000     │
│  Creation Cost: [200] ──●────────── 500        │
│  Your Earnings: [15]% ──●────────── 20%        │
│                                                 │
│  Verification Details                           │
│  Token Address: [0x...]                        │
│  Min Amount: [100]                             │
│  Chain: [Base ▼]                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 3: Preview & Create
```
┌─────────────────────────────────────────────────┐
│  Quest Preview                                  │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 🎯 Your Quest Title                      │ │
│  │                                           │ │
│  │ Your quest description here...           │ │
│  │                                           │ │
│  │ 💰 Reward: 500 pts                       │ │
│  │ ⛓️  Type: Token Hold                     │ │
│  │ ✅ 0 completions                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Cost Breakdown                                 │
│  • Creation Cost: -200 pts                     │
│  • Your Balance: 1,500 pts → 1,300 pts        │
│  • You'll earn: 15% per completion (75 pts)    │
│                                                 │
│  [🚀 Create Quest]                             │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Tasks

### Task 1: Wizard Component Structure ✅
**File:** `components/features/QuestWizard.tsx`
- [ ] Create QuestCreationWizard component
- [ ] Add wizard state management (useState)
- [ ] Add step navigation (back/next)
- [ ] Add progress indicator
- [ ] Add modal wrapper with backdrop

### Task 2: Step 1 - Quest Type Selection ✅
**Component:** `WizardStep1`
- [ ] Category selector (radio buttons: On-Chain / Social)
- [ ] Quest type cards (filtered by category)
- [ ] Quest type icons + labels + descriptions
- [ ] Selection state (highlight selected)
- [ ] Enable/disable Next button

### Task 3: Step 2 - Quest Details Form ✅
**Component:** `WizardStep2`
- [ ] Basic inputs: title, description (textarea)
- [ ] Reward slider (100-10,000 pts)
- [ ] Creation cost slider (100-500 pts)
- [ ] Earnings percent slider (10-20%)
- [ ] Max completions input (optional)
- [ ] Expiry date picker (optional)
- [ ] Dynamic verification inputs per quest type:
  - **token_hold:** token_address, min_amount, chain
  - **nft_own:** nft_address, chain
  - **follow_user:** target_fid
  - **like_cast:** cast_hash
  - **recast_cast:** cast_hash
- [ ] Real-time validation per field
- [ ] Error messages display

### Task 4: Step 3 - Preview & Create ✅
**Component:** `WizardStep3`
- [ ] Quest preview card (matches QuestCard from marketplace)
- [ ] Cost breakdown display
- [ ] Balance check (disable if insufficient)
- [ ] Create button (calls API)
- [ ] Loading state (spinner + disable interactions)
- [ ] Success state (show success message, close wizard)
- [ ] Error state (show error, allow retry)

### Task 5: Validation Logic ✅
**File:** `lib/quest-validation.ts` (new)
- [ ] `validateStep1()` - category + questType selected
- [ ] `validateStep2()` - all required fields filled + valid
- [ ] `validateVerificationData()` - per quest type
  - Ethereum address format
  - FID format (number)
  - Cast hash format
  - Amount > 0
  - Chain valid
- [ ] `validateBalance()` - user has enough points

### Task 6: Integration with Marketplace ✅
**File:** `app/app/quest-marketplace/page.tsx`
- [ ] Replace placeholder modal with QuestCreationWizard
- [ ] Pass user profile + stats as props
- [ ] Handle wizard close (reset state)
- [ ] Handle quest created (refresh quest list)
- [ ] Show success toast/notification

### Task 7: Testing & Polish ✅
- [ ] Test all 5 quest types (token_hold, nft_own, follow_user, like_cast, recast_cast)
- [ ] Test validation (invalid inputs)
- [ ] Test API errors (network failure, insufficient balance)
- [ ] Test success flow (quest appears in marketplace)
- [ ] Check TypeScript errors = 0
- [ ] Check mobile responsiveness
- [ ] Polish animations (step transitions)

---

## 📊 Quest Type Specifications

### On-Chain Quests

**1. token_hold**
- Fields: `token_address`, `min_amount`, `chain`
- Validation:
  - token_address: Ethereum address format
  - min_amount: number > 0
  - chain: one of ['base', 'optimism', 'celo']
- Preview: "Hold at least {min_amount} tokens at {token_address}"

**2. nft_own**
- Fields: `nft_address`, `chain`
- Validation:
  - nft_address: Ethereum address format
  - chain: one of ['base', 'optimism', 'celo']
- Preview: "Own any NFT from {nft_address}"

**3. transaction_make** (placeholder)
- Fields: `target_contract`, `chain`
- Preview: "Make a transaction to {target_contract}"

**4. multichain_gm** (placeholder)
- Fields: `chains` (array)
- Preview: "Say GM on {chains.length} chains"

**5. contract_interact** (placeholder)
- Fields: `contract_address`, `function_name`, `chain`
- Preview: "Interact with {function_name} on {contract_address}"

**6. liquidity_provide** (placeholder)
- Fields: `pool_address`, `min_liquidity`, `chain`
- Preview: "Provide at least {min_liquidity} liquidity to {pool_address}"

### Social Quests

**1. follow_user**
- Fields: `target_fid`
- Validation:
  - target_fid: number > 0
- Preview: "Follow user with FID {target_fid}"

**2. like_cast**
- Fields: `cast_hash`
- Validation:
  - cast_hash: string, length > 0
- Preview: "Like cast {cast_hash}"

**3. recast_cast**
- Fields: `cast_hash`
- Validation:
  - cast_hash: string, length > 0
- Preview: "Recast cast {cast_hash}"

**4. reply_cast** (placeholder)
- Fields: `parent_cast_hash`
- Preview: "Reply to cast {parent_cast_hash}"

**5. join_channel** (placeholder)
- Fields: `channel_id`
- Preview: "Join channel {channel_id}"

**6. cast_mention** (placeholder)
- Fields: `target_fid`
- Preview: "Mention user {target_fid} in a cast"

**7. cast_hashtag** (placeholder)
- Fields: `hashtag`
- Preview: "Use hashtag #{hashtag} in a cast"

---

## 🎨 Component Patterns (Tailwick v2.0)

### Quest Type Card
```tsx
<button
  onClick={() => selectQuestType('token_hold')}
  className={`p-4 rounded-lg border-2 transition-all ${
    selectedType === 'token_hold'
      ? 'border-purple-500 bg-purple-500/10'
      : 'border-default-200 hover:border-default-300'
  }`}
>
  <div className="text-3xl mb-2">💰</div>
  <div className="font-semibold theme-text-primary">Token Hold</div>
  <div className="text-sm theme-text-secondary">Hold ERC20 tokens</div>
</button>
```

### Slider Input
```tsx
<div className="space-y-2">
  <label className="text-sm theme-text-secondary">
    Reward Points: {rewardPoints}
  </label>
  <input
    type="range"
    min="100"
    max="10000"
    step="50"
    value={rewardPoints}
    onChange={(e) => setRewardPoints(Number(e.target.value))}
    className="w-full accent-purple-600"
  />
  <div className="flex justify-between text-xs theme-text-tertiary">
    <span>100</span>
    <span>10,000</span>
  </div>
</div>
```

### Progress Indicator
```tsx
<div className="flex items-center gap-2 mb-6">
  {[1, 2, 3].map((step) => (
    <div
      key={step}
      className={`h-2 flex-1 rounded-full ${
        step <= currentStep
          ? 'bg-purple-600'
          : 'bg-default-200'
      }`}
    />
  ))}
</div>
```

---

## 📁 File Structure

```
components/features/
  QuestWizard.tsx          (new - main wizard component)
  QuestWizardSteps.tsx     (new - step components)

lib/
  quest-validation.ts      (new - validation logic)

app/app/quest-marketplace/
  page.tsx                 (modified - integrate wizard)
```

---

## ✅ Acceptance Criteria

### Functional
- [ ] Users can create all 5 functional quest types
- [ ] Form validation prevents invalid submissions
- [ ] API errors are handled gracefully
- [ ] Success creates quest and refreshes marketplace
- [ ] Insufficient balance disables creation

### Technical
- [ ] Zero TypeScript errors
- [ ] Reuses existing API (`/api/quests/marketplace/create`)
- [ ] Form data matches API schema
- [ ] No console errors during normal flow

### UX
- [ ] Wizard is intuitive (no confusion)
- [ ] Progress is clear (step indicator)
- [ ] Errors are helpful (specific messages)
- [ ] Loading states are visible
- [ ] Success feedback is clear

---

## 🚀 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Components created | 3 | ⏳ 0/3 |
| Form fields | 10+ | ⏳ 0/10 |
| Quest types supported | 5 | ⏳ 0/5 |
| Validation rules | 8+ | ⏳ 0/8 |
| TypeScript errors | 0 | ⏳ TBD |
| Integration complete | Yes | ⏳ No |

---

## 🎓 Implementation Notes

### Reuse from Old Foundation
- Check `backups/pre-migration-20251126-213424/` for any quest creation patterns
- Focus on logic, not UI/UX

### Tailwick Patterns
- Reference `planning/template/` for form layouts
- Use Card for containers
- Use Button variants (primary/ghost)
- Use Badge for quest type indicators

### Gmeowbased Icons
- Use icons from `assets/gmeow-icons/`
- Quest type icons (custom SVGs)

---

## 📝 Next Steps After Phase 14

### Phase 15: Quest Enhancements (4-5 hours)
- Implement remaining 8 quest types
- Add quest search/filter
- Add quest analytics

### Phase 16: Advanced Features (6-8 hours)
- Token/NFT rewards
- Quest chains
- Quest templates
- Creator reputation

---

**Let's build this wizard! 🧙‍♂️**
