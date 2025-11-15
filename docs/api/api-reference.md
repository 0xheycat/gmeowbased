# Quest Wizard API Documentation

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Stable  

## Overview

The Quest Wizard provides a composable hook-based architecture for creating and managing quests. This document covers the public API for all hooks and utilities.

---

## Hooks

### `useWizardState`

Manages the core wizard state including step navigation and quest draft.

#### Signature

```typescript
function useWizardState(
  initialDraft: Partial<QuestDraft>
): UseWizardStateResult
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `initialDraft` | `Partial<QuestDraft>` | Initial quest configuration |

#### Returns

```typescript
interface UseWizardStateResult {
  // Current state
  stepIndex: number              // 0-3: basics, eligibility, rewards, preview
  draft: QuestDraft              // Current quest configuration
  isFirstStep: boolean           // True if on step 0
  isLastStep: boolean            // True if on step 3
  
  // Navigation
  nextStep: () => void           // Advance to next step
  prevStep: () => void           // Go back to previous step
  goToStep: (index: number) => void  // Jump to specific step
  
  // Draft management
  patchDraft: (patch: Partial<QuestDraft>) => void  // Update draft
  resetDraft: () => void         // Reset to initial state
}
```

#### Example

```typescript
const wizard = useWizardState({
  name: 'GM Quest',
  type: 'standard',
  rewardAmount: '10'
})

// Navigate
wizard.nextStep()

// Update draft
wizard.patchDraft({ 
  name: 'Updated GM Quest',
  rewardAmount: '20'
})

// Check state
console.log(wizard.stepIndex)  // 1
console.log(wizard.draft.name) // 'Updated GM Quest'
```

#### Validation

- `stepIndex` is clamped to [0, 3]
- `patchDraft` performs shallow merge
- Invalid step transitions are ignored

---

### `useWizardAnimation`

Controls slide-in/out animations for step transitions.

#### Signature

```typescript
function useWizardAnimation(): UseWizardAnimationResult
```

#### Returns

```typescript
interface UseWizardAnimationResult {
  // Animation state
  isAnimating: boolean           // True during transition
  direction: 'forward' | 'back'  // Animation direction
  
  // Animation control
  startAnimation: (direction: 'forward' | 'back') => void
  completeAnimation: () => void
}
```

#### Example

```typescript
const animation = useWizardAnimation()

// Trigger animation
animation.startAnimation('forward')

// In useEffect or after timeout
animation.completeAnimation()

// Conditional rendering
<div className={animation.isAnimating ? 'sliding' : 'static'}>
  {content}
</div>
```

#### Timing

- Animation duration: Controlled by parent
- Typical duration: 300ms
- Direction affects CSS classes

---

### `useAssetCatalog`

Fetches and caches token/NFT catalogs with search functionality.

#### Signature

```typescript
function useAssetCatalog(options: UseAssetCatalogOptions): UseAssetCatalogResult
```

#### Parameters

```typescript
interface UseAssetCatalogOptions {
  isMobile: boolean              // Adjust limits for mobile
  stepIndex: number              // Auto-load on steps 1-2
}
```

#### Returns

```typescript
interface UseAssetCatalogResult {
  // Data
  tokens: TokenOption[]          // Fetched tokens
  nfts: NftOption[]              // Fetched NFTs
  tokenQuery: string             // Current token search
  nftQuery: string               // Current NFT search (default: 'cats')
  
  // Loading states
  tokenLoading: boolean
  nftLoading: boolean
  assetsLoading: boolean         // Combined loading state
  
  // Errors
  tokenError: string | null
  nftError: string | null
  assetsError: string | null     // First non-null error
  
  // Warnings
  tokenWarnings: string[]
  nftWarnings: string[]
  assetWarnings: string[]        // Combined warnings
  
  // Actions
  onTokenSearch: (term: string) => void
  onNftSearch: (query: string) => void
  onRefreshCatalog: () => void   // Force refresh both
}
```

#### Example

```typescript
const catalog = useAssetCatalog({
  isMobile: false,
  stepIndex: 1
})

// Search tokens
catalog.onTokenSearch('ethereum')

// Check results
if (!catalog.tokenLoading && catalog.tokens.length > 0) {
  console.log('Found tokens:', catalog.tokens)
}

// Handle errors
if (catalog.tokenError) {
  console.error('Token fetch failed:', catalog.tokenError)
}
```

#### Caching

- Results cached by query string
- Cache TTL: 5 minutes (configurable)
- Auto-loads on steps 1-2
- Supports abort controller for cancellation

#### Mobile Optimizations

- Mobile limit: 12 results
- Desktop limit: 20 results
- Affects both token and NFT fetches

---

## Utilities

### Token Math (`tokenMath.ts`)

Decimal arithmetic and formatting for token amounts.

#### `scaleToDecimals`

```typescript
function scaleToDecimals(amount: string, decimals: number): string
```

Scales a decimal amount to its integer representation.

**Example**:
```typescript
scaleToDecimals('1.5', 18)  // '1500000000000000000'
scaleToDecimals('100', 6)   // '100000000'
```

#### `scaleFromDecimals`

```typescript
function scaleFromDecimals(amount: string, decimals: number): string
```

Scales an integer amount back to decimal representation.

**Example**:
```typescript
scaleFromDecimals('1500000000000000000', 18)  // '1.5'
scaleFromDecimals('100000000', 6)             // '100'
```

#### `parseDecimalInput`

```typescript
function parseDecimalInput(
  input: string,
  maxDecimals?: number
): string | null
```

Validates and cleans decimal input.

**Example**:
```typescript
parseDecimalInput('1.234', 2)      // '1.23'
parseDecimalInput('abc', 2)        // null
parseDecimalInput('1,234.56', 2)   // '1234.56'
```

#### `formatTokenAmount`

```typescript
function formatTokenAmount(
  amount: string,
  decimals: number,
  symbol?: string
): string
```

Formats token amount for display.

**Example**:
```typescript
formatTokenAmount('1500000000000000000', 18, 'ETH')  // '1.5 ETH'
formatTokenAmount('100000000', 6, 'USDC')            // '100 USDC'
```

---

### Formatters (`formatters.ts`)

Display formatting utilities.

#### `formatAddress`

```typescript
function formatAddress(
  address: string,
  startChars?: number,
  endChars?: number
): string
```

Truncates Ethereum addresses.

**Example**:
```typescript
formatAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')
// '0x742d...0bEb0'

formatAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 6, 6)
// '0x742d35...f0bEb0'
```

#### `formatDate`

```typescript
function formatDate(date: Date | string | number): string
```

Formats dates for display.

**Example**:
```typescript
formatDate(new Date('2025-11-14'))  // 'Nov 14, 2025'
formatDate('2025-11-14T10:30:00Z')  // 'Nov 14, 2025'
formatDate(1700000000000)           // 'Nov 14, 2023'
```

#### `formatCurrency`

```typescript
function formatCurrency(
  amount: number | string,
  currency?: string
): string
```

Formats currency amounts.

**Example**:
```typescript
formatCurrency(1234.56)           // '$1,234.56'
formatCurrency(1234.56, 'EUR')    // '€1,234.56'
formatCurrency(0.001, 'BTC')      // '0.001 BTC'
```

#### `formatRelativeTime`

```typescript
function formatRelativeTime(date: Date | string | number): string
```

Formats dates as relative time.

**Example**:
```typescript
formatRelativeTime(Date.now() - 60000)      // '1 minute ago'
formatRelativeTime(Date.now() + 3600000)    // 'in 1 hour'
formatRelativeTime(Date.now() - 86400000)   // '1 day ago'
```

---

### Sanitizers (`sanitizers.ts`)

Input validation and sanitization.

#### `sanitizeHtml`

```typescript
function sanitizeHtml(input: string): string
```

Removes HTML tags and dangerous content.

**Example**:
```typescript
sanitizeHtml('<script>alert("xss")</script>Hello')  // 'Hello'
sanitizeHtml('Safe <b>text</b>')                    // 'Safe text'
```

#### `sanitizeUrl`

```typescript
function sanitizeUrl(url: string): string | null
```

Validates and sanitizes URLs.

**Example**:
```typescript
sanitizeUrl('https://example.com')          // 'https://example.com'
sanitizeUrl('javascript:alert(1)')          // null
sanitizeUrl('http://example.com/path')      // 'http://example.com/path'
```

#### `sanitizeUsername`

```typescript
function sanitizeUsername(username: string): string
```

Cleans username input.

**Example**:
```typescript
sanitizeUsername('@username')      // 'username'
sanitizeUsername('User Name!')     // 'username'
sanitizeUsername('___test___')     // 'test'
```

#### `validateEmail`

```typescript
function validateEmail(email: string): boolean
```

Validates email format.

**Example**:
```typescript
validateEmail('user@example.com')   // true
validateEmail('invalid.email')      // false
validateEmail('user@domain')        // false
```

#### `validateEthAddress`

```typescript
function validateEthAddress(address: string): boolean
```

Validates Ethereum address format.

**Example**:
```typescript
validateEthAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')  // true
validateEthAddress('0xinvalid')                                    // false
validateEthAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')    // false
```

---

## Types

### `QuestDraft`

Core quest configuration type.

```typescript
interface QuestDraft {
  // Basic info
  id?: string
  name: string
  description: string
  type: QuestType
  
  // Rewards
  rewardAmount: string
  rewardToken: string
  rewardTokenDecimals: number
  
  // Eligibility
  gateType?: GateType
  followRequired?: boolean
  followUsername?: string
  assetRequired?: boolean
  assetAddress?: string
  
  // Metadata
  createdAt?: string
  updatedAt?: string
  status?: 'draft' | 'active' | 'completed'
}
```

### `QuestType`

```typescript
type QuestType = 
  | 'standard'    // Regular quest
  | 'raffle'      // Random winner selection
  | 'follow'      // Follow-based quest
  | 'asset-hold'  // Asset holding requirement
```

### `TokenOption`

```typescript
interface TokenOption {
  id: string
  address: string
  name: string
  symbol: string
  icon: string
  chain: ChainKey
  chainId: number
  decimals: number | null
  balance?: string
  priceUsd?: number | null
  verified: boolean
}
```

### `NftOption`

```typescript
interface NftOption {
  id: string
  name: string
  collection: string
  image: string
  chain: ChainKey
  contractAddress: string
  tokenId?: string
}
```

---

## Constants

### Step Configuration

```typescript
const WIZARD_STEPS = [
  { key: 'basics', label: 'Basics', index: 0 },
  { key: 'eligibility', label: 'Eligibility', index: 1 },
  { key: 'rewards', label: 'Rewards', index: 2 },
  { key: 'preview', label: 'Preview', index: 3 }
]
```

### Default Values

```typescript
const DEFAULT_TOKEN_QUERY = ''
const DEFAULT_NFT_QUERY = 'cats'
const DEFAULT_CHAIN_FILTER = 'base,op,celo'
const ASSET_SNAPSHOT_TTL_MS = 300000  // 5 minutes
```

---

## Error Handling

### Common Error Patterns

```typescript
// Async operations
try {
  await fetchData()
} catch (error) {
  if (isAbortError(error)) {
    // Ignore aborted requests
    return
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  setError(message)
}

// Validation
const result = validateInput(input)
if (!result.valid) {
  return { errors: result.errors }
}

// Null checks
const value = draft?.rewardAmount ?? '0'
```

---

## Best Practices

### Hook Usage

1. **Always call hooks at top level** - Never in conditions or loops
2. **Destructure returns early** - Makes code clearer
3. **Use correct dependency arrays** - Prevents stale closures
4. **Handle loading states** - Provide feedback to users
5. **Clean up side effects** - Return cleanup functions

### State Management

1. **Immutable updates** - Always use spread operator or patches
2. **Validate inputs** - Sanitize before state updates
3. **Optimistic updates** - Update UI immediately, revert on error
4. **Cache aggressively** - Reduce unnecessary API calls

### Type Safety

1. **Explicit types** - Don't rely on inference for public APIs
2. **Strict null checks** - Use `?` and `??` operators
3. **Type guards** - Validate runtime types
4. **Generic constraints** - Constrain type parameters

---

## Performance Tips

### Optimization Strategies

```typescript
// Memoize expensive computations
const sortedTokens = useMemo(
  () => tokens.sort((a, b) => a.symbol.localeCompare(b.symbol)),
  [tokens]
)

// Callback stability
const handleSearch = useCallback((query: string) => {
  fetchTokens(query)
}, []) // Empty deps if truly stable

// Lazy initialization
const [state] = useState(() => {
  return expensiveInitialization()
})
```

### Avoid Re-renders

- Use `React.memo` for pure components
- Split state to minimize update scope
- Debounce rapid updates
- Use refs for values that don't affect render

---

## Migration Guide

### From Old Wizard

```typescript
// Old: Monolithic component
<QuestWizardOld 
  initialDraft={draft}
  onSubmit={handleSubmit}
/>

// New: Composable hooks
function QuestWizard() {
  const wizard = useWizardState(initialDraft)
  const animation = useWizardAnimation()
  const catalog = useAssetCatalog({ isMobile: false, stepIndex: wizard.stepIndex })
  
  return (
    <WizardLayout>
      <StepContent step={wizard.stepIndex} />
      <Navigation onNext={wizard.nextStep} onPrev={wizard.prevStep} />
    </WizardLayout>
  )
}
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/0xheycat/gmeowbased/issues)
- **Docs**: [ADR Documentation](/docs/adr/)
- **Tests**: See `__tests__/` for usage examples
