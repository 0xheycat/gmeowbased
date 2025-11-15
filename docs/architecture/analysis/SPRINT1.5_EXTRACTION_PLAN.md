# Sprint 1.5: Step Component Extraction Plan

## Step Components to Extract

### 1. BasicsStep.tsx (309 lines: 1349-1657)
**Props:**
- draft: QuestDraft
- onChange: (patch) => void
- errors: StepErrors
- showValidation: boolean

**Features:**
- Quest type selector with 15+ types
- Name, headline, description fields
- Dynamic fields based on quest type:
  * followUsername (conditional)
  * frameUrl (conditional)
  * castLink (conditional)
  * castContains (conditional)
  * mentionUsername (conditional)
  * targetUsername (conditional)
  * targetFid (conditional)
- Media upload handler
- Quest type change logic (clears incompatible fields)

**Dependencies:**
- normalizeQuestTypeKey, getQuestFieldConfig from @/lib/gm-utils
- QUEST_TYPE_DETAILS, QUEST_TYPE_OPTIONS from shared
- Field, SegmentedToggle components
- sanitizeUsernameInput from shared

---

### 2. EligibilityStep.tsx (308 lines: 1658-1965)
**Props:**
- draft: QuestDraft
- onChange: (patch) => void
- errors: StepErrors
- showValidation: boolean
- tokens: TokenOption[]
- nfts: NftOption[]
- tokenQuery: string
- nftQuery: string
- onTokenQueryChange: (query: string) => void
- onNftQueryChange: (query: string) => void
- tokenLoading: boolean
- nftLoading: boolean
- tokenWarnings: string[]
- nftWarnings: string[]
- policy: QuestPolicy
- tier: CreatorTier

**Features:**
- Eligibility mode toggle (open/simple/partner)
- Asset type selector (token/NFT)
- TokenSelector integration
- Chain multi-select for partner mode
- Minimum balance input
- Policy enforcement warnings

**Dependencies:**
- TokenSelector, SelectorState components
- CHAIN_KEYS, CHAIN_LABEL from @/lib/gm-utils
- mergeChainLists, formatChainList from shared
- isAssetAllowed from @/lib/quest-policy

---

### 3. RewardsStep.tsx (324 lines: 1966-2289)
**Props:**
- draft: QuestDraft
- onChange: (patch) => void
- errors: StepErrors
- showValidation: boolean
- tokens: TokenOption[]
- nfts: NftOption[]
- tokenQuery: string
- nftQuery: string
- onTokenQueryChange: (query: string) => void
- onNftQueryChange: (query: string) => void
- tokenLoading: boolean
- nftLoading: boolean
- tokenWarnings: string[]
- nftWarnings: string[]
- tokenLookup: TokenLookup
- tokenEscrowStatus: TokenEscrowStatus | null
- policy: QuestPolicy

**Features:**
- Reward mode toggle (points/token/NFT)
- Points input or asset selector
- Raffle configuration:
  * Enable/disable toggle
  * Strategy selection (random/fcfs)
  * Max winners input
- Escrow configuration (for token rewards):
  * Transaction hash input
  * Deposit amount input
  * Detection timestamp display
  * Escrow status badge (5 states)
- Max completions input
- Expiry date picker

**Dependencies:**
- TokenSelector, SelectorState components
- QuickExpiryPicker component
- toLocalDateTimeInputValue, toIsoStringOrEmpty from shared
- deriveTokenEscrowStatus from helpers

---

### 4. FinalizeStep.tsx (606 lines: 2290-2896)
**Props:**
- draft: QuestDraft
- errors: Record<StepKey, StepValidationResult>
- onBack: () => void
- onPublish: () => void
- verifying: boolean
- verificationState: QuestVerificationState | null
- summary: QuestSummary
- tokenLookup: TokenLookup
- nftLookup: NftLookup
- tokenEscrowStatus: TokenEscrowStatus | null

**Features:**
- PreviewCard component (large nested component)
- Verification status display
- Launch checklist (4 steps):
  * Quest details complete
  * Eligibility configured
  * Rewards set
  * Ready to launch
- Test verification button
- Publish button with loading state
- Error display for each step
- Success/failure messages

**Dependencies:**
- PreviewCard (inline component ~150 lines)
- motion, useReducedMotion from framer-motion
- formatVerificationValue, formatRelativeTimeFromNow from shared
- Image from next/image

---

## Extraction Strategy

### Phase 1: Create Step Files (1 hour)
1. Create steps/BasicsStep.tsx - extract + test
2. Create steps/EligibilityStep.tsx - extract + test
3. Create steps/RewardsStep.tsx - extract + test
4. Create steps/FinalizeStep.tsx - extract + test (largest, most complex)

### Phase 2: Update Main File (30 min)
1. Import all step components
2. Replace inline step components with imports
3. Remove old step component code
4. Verify imports resolve

### Phase 3: Test & Fix (30 min)
1. Run build
2. Fix TypeScript errors
3. Fix import paths
4. Verify wizard still works

---

## Expected Results

**Before:**
- QuestWizard.tsx: 3,108 lines

**After:**
- QuestWizard.tsx: ~1,561 lines (-1,547 lines, -50%)
- steps/BasicsStep.tsx: 309 lines
- steps/EligibilityStep.tsx: 308 lines
- steps/RewardsStep.tsx: 324 lines
- steps/FinalizeStep.tsx: 606 lines
- **Total extracted:** 1,547 lines to 4 new files

**Next:** Extract hooks (~500 lines) → Final reduction to 250 lines

