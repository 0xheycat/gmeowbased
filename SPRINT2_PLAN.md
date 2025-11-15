# Sprint 2: Final Optimization - Reach 250 Lines

**Goal**: Extract remaining business logic to reach orchestration-only code  
**Status**: 📋 **PLANNED**  
**Estimated Duration**: 3-4 hours  
**Target**: 1,017 → 250 lines (75% additional reduction, 93% total)

---

## 📊 Current State

```
Main File:     1,017 lines
Target:          250 lines
To Extract:      767 lines
Total Files:      31 files
```

### What's Left in Main File

**State Management** (~300 lines):
- 30+ useState hooks
- useReducer for draft
- 7+ useRef declarations
- Step navigation logic
- Touched steps tracking

**Asset Catalog Logic** (~150 lines):
- Token fetching with abort controllers
- NFT fetching with abort controllers
- Cache management (Map refs)
- Search query handling
- Snapshot timestamp validation

**Authentication Flow** (~100 lines):
- MiniKit sign-in
- Wallet auto-connect
- Profile loading
- FID resolution
- Auth status tracking

**Verification System** (~100 lines):
- Verification API calls
- Cache management
- Abort controller handling
- Success/error state
- Payload assembly

**Policy Enforcement** (~100 lines):
- Policy notifications ref
- Asset filtering logic
- Tier-based warnings
- Gate enforcement

**Effects & Callbacks** (~150 lines):
- useEffect for frame ready
- useEffect for auth
- useEffect for escrow timer
- Multiple useCallback declarations
- Derived state (useMemo)

**JSX Render** (~117 lines):
- Layout structure
- Conditional rendering
- Motion animations
- Grid layout

---

## 🎯 Extraction Plan

### Phase 1: State Management Hook (1 hour)

**Create: `hooks/useWizardState.ts`** (~200 lines)

Extract all draft and navigation state:
```typescript
export function useWizardState() {
  const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT)
  const [stepIndex, setStepIndex] = useState(0)
  const [touchedSteps, setTouchedSteps] = useState(...)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  
  const handleDraftChange = useCallback(...)
  const handleStepNext = useCallback(...)
  const handleStepPrev = useCallback(...)
  const handleStepSelect = useCallback(...)
  const handleReset = useCallback(...)
  
  return {
    draft,
    stepIndex,
    touchedSteps,
    headerCollapsed,
    setHeaderCollapsed,
    onDraftChange: handleDraftChange,
    onNext: handleStepNext,
    onPrev: handleStepPrev,
    onStepSelect: handleStepSelect,
    onReset: handleReset,
  }
}
```

**Benefits**:
- Encapsulates all wizard state
- Clear contract via return object
- Testable state transitions
- Reusable across wizard variants

---

### Phase 2: Asset Catalog Hook (1 hour)

**Create: `hooks/useAssetCatalog.ts`** (~150 lines)

Extract token/NFT fetching logic:
```typescript
export function useAssetCatalog({
  tokenQuery,
  nftQuery,
  chainFilter,
}: AssetCatalogOptions) {
  const [tokens, setTokens] = useState<TokenOption[]>([])
  const [nfts, setNfts] = useState<NftOption[]>([])
  const [tokenLoading, setTokenLoading] = useState(false)
  const [nftLoading, setNftLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [nftError, setNftError] = useState<string | null>(null)
  const [tokenWarnings, setTokenWarnings] = useState<string[]>([])
  const [nftWarnings, setNftWarnings] = useState<string[]>([])
  
  const tokenFetchControllerRef = useRef<AbortController | null>(null)
  const nftFetchControllerRef = useRef<AbortController | null>(null)
  const tokenSnapshotCacheRef = useRef<Map<...>>(new Map())
  const nftSnapshotCacheRef = useRef<Map<...>>(new Map())
  
  // useEffect for token fetching
  // useEffect for NFT fetching
  // Cache management
  // Snapshot validation
  
  const refreshCatalog = useCallback(...)
  
  return {
    tokens,
    nfts,
    tokenLoading,
    nftLoading,
    tokenError,
    nftError,
    tokenWarnings,
    nftWarnings,
    assetsLoading: tokenLoading || nftLoading,
    assetsError: tokenError ?? nftError,
    assetWarnings: [...tokenWarnings, ...nftWarnings],
    refreshCatalog,
  }
}
```

**Benefits**:
- Isolates complex fetching logic
- Manages abort controllers safely
- Implements caching strategy
- Handles errors gracefully

---

### Phase 3: Authentication Hook (45 min)

**Create: `hooks/useMiniKitAuth.ts`** (~120 lines)

Extract authentication flow:
```typescript
export function useMiniKitAuth({
  context,
  isFrameReady,
  signInWithMiniKit,
}: MiniKitAuthOptions) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
  const [authError, setAuthError] = useState<string | null>(null)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [signInResult, setSignInResult] = useState<MiniAppSignInResult | null>(null)
  
  const triedMiniAuthRef = useRef(false)
  const pendingAuthToastRef = useRef<number | null>(null)
  
  // Derived values
  const parsedSignIn = useMemo(...)
  const signInFid = useMemo(...)
  const resolvedFid = useMemo(...)
  
  // useEffect for auto sign-in
  // useEffect for profile loading
  
  const signIn = useCallback(...)
  const signOut = useCallback(...)
  
  return {
    authStatus,
    authError,
    profile,
    profileLoading,
    signInResult,
    resolvedFid,
    signIn,
    signOut,
  }
}
```

**Benefits**:
- Centralizes auth logic
- Handles MiniKit-specific flows
- Manages profile loading
- Clear auth state machine

---

### Phase 4: Wallet Connection Hook (30 min)

**Create: `hooks/useWalletConnection.ts`** (~100 lines)

Extract wallet logic:
```typescript
export function useWalletConnection({
  connectors,
  pushNotification,
  dismissNotification,
}: WalletConnectionOptions) {
  const { address, connector, isConnected } = useAccount()
  const { connect, connectAsync } = useConnect()
  
  const [walletAutoState, setWalletAutoState] = useState<WalletAutoState>(...)
  const triedWalletAutoRef = useRef(false)
  const pendingWalletToastRef = useRef<number | null>(null)
  
  // useEffect for auto-connect
  
  const connectWallet = useCallback(...)
  const disconnectWallet = useCallback(...)
  
  return {
    address,
    connector,
    isConnected,
    walletAutoState,
    connectWallet,
    disconnectWallet,
  }
}
```

**Benefits**:
- Encapsulates wagmi logic
- Handles auto-connect
- Manages notifications
- Clean wallet interface

---

### Phase 5: Verification Service (30 min)

**Create: `services/verificationService.ts`** (~100 lines)

Extract verification logic:
```typescript
export class QuestVerificationService {
  private cache = new Map<string, QuestVerificationSuccess>()
  private abortController: AbortController | null = null
  
  async verify(
    payload: QuestVerificationPayload,
    options?: { force?: boolean }
  ): Promise<QuestVerificationSuccess> {
    // Check cache
    // Abort previous request
    // Make API call
    // Update cache
    // Return result
  }
  
  abort() {
    this.abortController?.abort()
  }
  
  clearCache() {
    this.cache.clear()
  }
}

// Hook wrapper
export function useQuestVerification() {
  const [state, setState] = useState<QuestVerificationState>(...)
  const serviceRef = useRef(new QuestVerificationService())
  
  const verify = useCallback(...)
  
  return { verificationState: state, verify }
}
```

**Benefits**:
- Service pattern for API calls
- Centralized cache management
- Abort controller handling
- Testable verification logic

---

### Phase 6: Policy Notifications Hook (30 min)

**Create: `hooks/usePolicyNotifications.ts`** (~80 lines)

Extract policy enforcement:
```typescript
export function usePolicyNotifications({
  draft,
  policy,
  requiredGate,
  tokens,
  nfts,
  pushNotification,
}: PolicyNotificationOptions) {
  const policyNoticeRef = useRef({
    partnerDowngraded: false,
    raffleDisabled: false,
    partnerChainsTrimmed: false,
    eligibilityAsset: null as string | null,
    rewardAsset: null as string | null,
    gateEnforced: false,
  })
  
  // useEffect to watch for policy violations
  // Show notifications when rules are violated
  // Track shown notifications to prevent duplicates
  
  return {
    policyNoticeRef,
  }
}
```

**Benefits**:
- Isolates policy logic
- Manages notification state
- Prevents duplicate warnings
- Clear policy contract

---

### Phase 7: Main File Refactor (30 min)

**Update: `QuestWizard.tsx`** (1,017 → ~250 lines)

Final orchestration-only code:
```typescript
export default function QuestWizard() {
  const { context, isFrameReady, setFrameReady } = useMiniKit()
  const { signIn: signInWithMiniKit } = useAuthenticate()
  
  // Custom hooks (clean!)
  const wizardState = useWizardState()
  const assetCatalog = useAssetCatalog({ tokenQuery, nftQuery, chainFilter })
  const auth = useMiniKitAuth({ context, isFrameReady, signInWithMiniKit })
  const wallet = useWalletConnection({ connectors, pushNotification, dismissNotification })
  const { verificationState, verify } = useQuestVerification()
  usePolicyNotifications({ draft, policy, requiredGate, tokens, nfts, pushNotification })
  
  // Derived values
  const creatorTier = useMemo(...)
  const questPolicy = useMemo(...)
  const summary = useMemo(...)
  const validation = useMemo(...)
  
  // Effects (minimal)
  useEffect(() => {
    if (isFrameReady && !context) setFrameReady()
  }, [isFrameReady, context, setFrameReady])
  
  // Render
  return (
    <div className="...">
      <WizardHeader collapsed={wizardState.headerCollapsed} onToggle={...} />
      <Stepper activeIndex={wizardState.stepIndex} steps={renderedSteps} onSelect={wizardState.onStepSelect} />
      <StepPanel {...allProps} />
      <PreviewCard summary={summary} stepIndex={wizardState.stepIndex} />
      <DebugPanel {...debugProps} />
    </div>
  )
}
```

**Benefits**:
- Crystal clear orchestration
- All logic in named hooks
- Easy to understand flow
- Maximum testability

---

## 📈 Expected Impact

### Before Sprint 2
```
QuestWizard.tsx: 1,017 lines
- State management inline
- Asset fetching inline
- Authentication inline
- Verification inline
- Policy enforcement inline
```

### After Sprint 2
```
QuestWizard.tsx: ~250 lines (orchestration only)
hooks/useWizardState.ts: 200 lines
hooks/useAssetCatalog.ts: 150 lines
hooks/useMiniKitAuth.ts: 120 lines
hooks/useWalletConnection.ts: 100 lines
hooks/usePolicyNotifications.ts: 80 lines
services/verificationService.ts: 100 lines

Total: 750 lines extracted to 6 new modules
Main file: 93% reduction from original
```

---

## 🎯 Success Criteria

- [ ] 6 new hooks/services created
- [ ] Main file reduced to ~250 lines
- [ ] All hooks independently testable
- [ ] Build passes (ESLint + TypeScript)
- [ ] Zero functionality changes
- [ ] Documentation updated

---

## 🚀 Sprint 3 Ideas (Future)

After reaching 250 lines:

1. **Performance Optimization**
   - Implement React.memo for step components
   - Optimize re-renders
   - Add loading skeletons
   - Lazy load step components

2. **Testing Suite**
   - Unit tests for all hooks
   - Unit tests for all utilities
   - Integration tests for wizard flow
   - E2E tests for critical paths

3. **Developer Experience**
   - Storybook for all components
   - Component documentation
   - API reference docs
   - Usage examples

4. **Feature Enhancements**
   - Yu-Gi-Oh preview card (as planned)
   - Mobile optimization
   - Accessibility improvements
   - Keyboard navigation

---

**Created**: November 14, 2025  
**Status**: 📋 Ready to start
