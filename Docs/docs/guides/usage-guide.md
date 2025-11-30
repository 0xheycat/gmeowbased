# Quest Wizard Usage Guide

Practical examples and common patterns for using the quest wizard hooks and utilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Common Patterns](#common-patterns)
- [State Management](#state-management)
- [Animation & UX](#animation--ux)
- [Asset Selection](#asset-selection)
- [Input Handling](#input-handling)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Performance Tips](#performance-tips)

## Getting Started

### Basic Wizard Setup

```tsx
import { useWizardState } from '@/hooks/useWizardState'
import { useWizardAnimation } from '@/hooks/useWizardAnimation'
import { motion } from 'framer-motion'

function QuestWizard() {
  const { pushNotification } = useNotifications()
  
  const wizard = useWizardState({ pushNotification })
  const { sectionMotion } = useWizardAnimation()
  
  return (
    <motion.div {...sectionMotion}>
      <WizardStep step={wizard.currentStep} draft={wizard.draft} />
      <WizardControls
        onNext={() => wizard.onNext(validateCurrentStep())}
        onBack={wizard.onBack}
        canGoBack={wizard.currentStep > 0}
        canGoNext={wizard.currentStep < 4}
      />
    </motion.div>
  )
}
```

### Step-by-Step Navigation

```tsx
function WizardControls({ wizard }: { wizard: WizardStateReturn }) {
  const handleNext = () => {
    // Validate current step
    const validation = validateStep(wizard.currentStep, wizard.draft)
    
    if (!validation.isValid) {
      // Show validation errors
      validation.errors.forEach(error => {
        wizard.pushNotification({
          tone: 'error',
          title: 'Validation Error',
          description: error
        })
      })
      return
    }
    
    // Proceed to next step
    wizard.onNext(validation)
  }
  
  return (
    <div className="flex gap-4">
      {wizard.currentStep > 0 && (
        <button onClick={wizard.onBack}>Back</button>
      )}
      <button onClick={handleNext}>
        {wizard.currentStep === 4 ? 'Submit' : 'Next'}
      </button>
    </div>
  )
}
```

## Common Patterns

### Pattern 1: Multi-Step Form with Validation

```tsx
function MultiStepQuestForm() {
  const wizard = useWizardState({ pushNotification })
  
  // Track which fields have been touched
  const touchedFields = useRef<Set<string>>(new Set())
  
  const handleFieldChange = (field: string, value: string) => {
    // Mark field as touched
    touchedFields.current.add(field)
    
    // Update draft
    wizard.onDraftChange({ [field]: value })
  }
  
  const showFieldError = (field: string) => {
    // Only show errors for touched fields
    return touchedFields.current.has(field) && 
           validateField(field, wizard.draft[field])
  }
  
  return (
    <form>
      <input
        value={wizard.draft.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        className={showFieldError('name') ? 'border-red-500' : ''}
      />
      {showFieldError('name') && (
        <p className="text-red-500">Quest name is required</p>
      )}
    </form>
  )
}
```

### Pattern 2: Conditional Step Flow

```tsx
function ConditionalWizard() {
  const wizard = useWizardState({ pushNotification })
  
  // Skip token selection if reward type is NFT
  const handleNext = (validation: ValidationResult) => {
    if (wizard.currentStep === 1 && wizard.draft.rewardType === 'nft') {
      // Skip token step, go straight to NFT selection
      wizard.onDraftChange({ currentStep: 3 })
    } else {
      wizard.onNext(validation)
    }
  }
  
  // Adjust step display
  const effectiveStep = wizard.draft.rewardType === 'nft' && wizard.currentStep > 1
    ? wizard.currentStep - 1
    : wizard.currentStep
  
  return <WizardStep step={effectiveStep} onNext={handleNext} />
}
```

### Pattern 3: Save Draft to LocalStorage

```tsx
function PersistentWizard() {
  const wizard = useWizardState({ pushNotification })
  
  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('quest-draft')
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        wizard.onDraftChange(draft)
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [])
  
  // Save draft to localStorage on change
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('quest-draft', JSON.stringify(wizard.draft))
    }, 1000) // Debounce 1 second
    
    return () => clearTimeout(timer)
  }, [wizard.draft])
  
  const handleReset = () => {
    localStorage.removeItem('quest-draft')
    wizard.onReset()
  }
  
  return <Wizard draft={wizard.draft} onReset={handleReset} />
}
```

## State Management

### Updating Quest Draft

```tsx
// Single field update
wizard.onDraftChange({ name: 'My Quest' })

// Multiple fields at once
wizard.onDraftChange({
  name: 'Epic Quest',
  description: 'A challenging adventure',
  rewardAmount: '100'
})

// Nested updates (reward token)
wizard.onDraftChange({
  rewardToken: {
    address: '0x1234...',
    symbol: 'USDC',
    decimals: 6
  }
})
```

### Conditional Updates

```tsx
function RewardAmountInput() {
  const wizard = useWizardState({ pushNotification })
  
  const handleAmountChange = (rawValue: string) => {
    // Sanitize input
    const sanitized = sanitizePositiveNumberInput(rawValue, '')
    
    // Update draft
    wizard.onDraftChange({ rewardAmount: sanitized })
    
    // Calculate and update total cost
    const numericAmount = parseFloat(sanitized) || 0
    const maxParticipants = parseInt(wizard.draft.maxParticipants) || 0
    const totalCost = numericAmount * maxParticipants
    
    wizard.onDraftChange({ estimatedCost: totalCost.toString() })
  }
  
  return (
    <input
      type="text"
      value={wizard.draft.rewardAmount}
      onChange={(e) => handleAmountChange(e.target.value)}
    />
  )
}
```

## Animation & UX

### Smooth Step Transitions

```tsx
function AnimatedWizardStep() {
  const { sectionMotion, asideMotion, prefersReducedMotion } = useWizardAnimation()
  
  return (
    <div className="flex gap-8">
      <motion.section 
        key={currentStep} 
        {...sectionMotion}
        className="flex-1"
      >
        <StepContent step={currentStep} />
      </motion.section>
      
      <motion.aside {...asideMotion} className="w-80">
        <QuestPreview draft={draft} />
      </motion.aside>
    </div>
  )
}
```

### Loading States

```tsx
function WizardWithLoading() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const wizard = useWizardState({ pushNotification })
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      await createQuest(wizard.draft)
      
      wizard.pushNotification({
        tone: 'success',
        title: 'Quest Created',
        description: 'Your quest has been published!'
      })
      
      wizard.onReset()
    } catch (error) {
      wizard.pushNotification({
        tone: 'error',
        title: 'Creation Failed',
        description: formatUnknownError(error, 'Failed to create quest')
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div>
      <WizardSteps wizard={wizard} disabled={isSubmitting} />
      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Quest'}
      </button>
    </div>
  )
}
```

## Asset Selection

### Token Picker

```tsx
import { useAssetCatalog } from '@/hooks/useAssetCatalog'

function TokenSelector() {
  const catalog = useAssetCatalog()
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null)
  
  useEffect(() => {
    // Fetch popular tokens on mount
    catalog.fetchTokens('', 'base')
  }, [])
  
  const handleSearch = (query: string) => {
    catalog.onTokenQueryChange(query)
    // Debounced search happens automatically
  }
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search tokens..."
        value={catalog.tokenQuery}
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      {catalog.isLoadingTokens && <LoadingSpinner />}
      
      <div className="grid gap-2">
        {catalog.tokens.map(token => (
          <button
            key={token.address}
            onClick={() => setSelectedToken(token)}
            className={selectedToken?.address === token.address ? 'bg-blue-100' : ''}
          >
            <img src={token.icon} alt={token.symbol} className="w-6 h-6" />
            <span>{token.symbol}</span>
            <span className="text-gray-500">{token.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

### NFT Gallery

```tsx
function NFTGallery() {
  const catalog = useAssetCatalog()
  
  useEffect(() => {
    catalog.fetchNfts('cats', 'base')
  }, [])
  
  const handleLoadMore = () => {
    if (catalog.nftCursor && !catalog.isLoadingNfts) {
      catalog.fetchNfts(catalog.nftQuery, catalog.chainFilter)
    }
  }
  
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {catalog.nfts.map(nft => (
          <div key={`${nft.address}-${nft.tokenId}`} className="border rounded-lg p-4">
            <img src={nft.image} alt={nft.name} className="w-full aspect-square" />
            <h3>{nft.name}</h3>
            <p className="text-sm text-gray-500">{nft.collection}</p>
          </div>
        ))}
      </div>
      
      {catalog.nftCursor && (
        <button onClick={handleLoadMore} disabled={catalog.isLoadingNfts}>
          {catalog.isLoadingNfts ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

### Chain Switcher

```tsx
function ChainFilterButtons() {
  const catalog = useAssetCatalog()
  const chains = ['base', 'op', 'celo']
  
  const handleChainToggle = (chain: string) => {
    const current = catalog.chainFilter.split(',')
    const updated = current.includes(chain)
      ? current.filter(c => c !== chain)
      : [...current, chain]
    
    catalog.onChainFilterChange(updated.join(','))
    
    // Refetch with new chain filter
    catalog.fetchTokens(catalog.tokenQuery, updated.join(','))
  }
  
  return (
    <div className="flex gap-2">
      {chains.map(chain => (
        <button
          key={chain}
          onClick={() => handleChainToggle(chain)}
          className={catalog.chainFilter.includes(chain) ? 'bg-blue-500' : 'bg-gray-200'}
        >
          {chain.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
```

## Input Handling

### Number Input with Validation

```tsx
import { sanitizePositiveNumberInput } from '@/utils/sanitizers'
import { parseTokenAmountToUnits, formatTokenAmountFromUnits } from '@/utils/tokenMath'

function TokenAmountInput({ decimals }: { decimals: number }) {
  const [displayValue, setDisplayValue] = useState('')
  const [internalValue, setInternalValue] = useState<bigint>(0n)
  
  const handleChange = (raw: string) => {
    // Sanitize: remove invalid chars
    const sanitized = sanitizePositiveNumberInput(raw, '0')
    setDisplayValue(sanitized)
    
    // Parse to bigint units
    const units = parseTokenAmountToUnits(sanitized, decimals)
    if (units !== null) {
      setInternalValue(units)
    }
  }
  
  const handleBlur = () => {
    // Format on blur for consistency
    const formatted = formatTokenAmountFromUnits(internalValue, decimals)
    setDisplayValue(formatted)
  }
  
  return (
    <input
      type="text"
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="0.0"
    />
  )
}
```

### Email Validation

```tsx
import { validateEmail } from '@/utils/sanitizers'

function EmailInput() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const handleChange = (value: string) => {
    setEmail(value)
    
    if (value && !validateEmail(value)) {
      setError('Invalid email format')
    } else {
      setError(null)
    }
  }
  
  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => handleChange(e.target.value)}
        className={error ? 'border-red-500' : ''}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

### URL Sanitization

```tsx
import { sanitizeUrl } from '@/utils/sanitizers'

function LinkInput() {
  const [url, setUrl] = useState('')
  
  const handleChange = (value: string) => {
    setUrl(value)
  }
  
  const handleBlur = () => {
    // Sanitize URL on blur
    const safe = sanitizeUrl(url)
    setUrl(safe)
  }
  
  return (
    <input
      type="url"
      value={url}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="https://example.com"
    />
  )
}
```

## Error Handling

### Graceful Error Recovery

```tsx
function RobustQuestCreator() {
  const wizard = useWizardState({ pushNotification })
  const [retryCount, setRetryCount] = useState(0)
  
  const handleSubmit = async () => {
    try {
      await createQuest(wizard.draft)
      wizard.onReset()
      setRetryCount(0)
    } catch (error) {
      // Check if it's a network error
      if (isAbortError(error)) {
        wizard.pushNotification({
          tone: 'warning',
          title: 'Request Cancelled',
          description: 'The operation was cancelled'
        })
        return
      }
      
      // Format error message
      const message = formatUnknownError(error, 'Unknown error occurred')
      
      // Retry logic
      if (retryCount < 3) {
        wizard.pushNotification({
          tone: 'warning',
          title: 'Retrying...',
          description: `Attempt ${retryCount + 1} of 3`
        })
        setRetryCount(prev => prev + 1)
        setTimeout(() => handleSubmit(), 2000)
      } else {
        wizard.pushNotification({
          tone: 'error',
          title: 'Creation Failed',
          description: message
        })
        setRetryCount(0)
      }
    }
  }
  
  return <WizardForm onSubmit={handleSubmit} />
}
```

### Validation Error Display

```tsx
function ValidationFeedback({ validation }: { validation: ValidationResult }) {
  if (validation.isValid) return null
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-800">Please fix the following:</h3>
      <ul className="list-disc list-inside text-red-700">
        {validation.errors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Testing

### Testing Wizard State

```tsx
import { renderHook, act } from '@testing-library/react'
import { useWizardState } from '@/hooks/useWizardState'

describe('useWizardState', () => {
  it('should navigate through steps', () => {
    const mockPush = vi.fn()
    const { result } = renderHook(() => 
      useWizardState({ pushNotification: mockPush })
    )
    
    // Initial state
    expect(result.current.currentStep).toBe(0)
    
    // Navigate forward
    act(() => {
      result.current.onNext({ isValid: true, errors: [] })
    })
    expect(result.current.currentStep).toBe(1)
    
    // Navigate back
    act(() => {
      result.current.onBack()
    })
    expect(result.current.currentStep).toBe(0)
  })
  
  it('should update draft', () => {
    const { result } = renderHook(() => 
      useWizardState({ pushNotification: vi.fn() })
    )
    
    act(() => {
      result.current.onDraftChange({ name: 'Test Quest' })
    })
    
    expect(result.current.draft.name).toBe('Test Quest')
  })
})
```

### Testing Token Math

```tsx
import { parseTokenAmountToUnits, formatTokenAmountFromUnits } from '@/utils/tokenMath'

describe('tokenMath', () => {
  it('should parse and format correctly', () => {
    // Parse user input to units
    const units = parseTokenAmountToUnits('1.5', 18)
    expect(units).toBe(1500000000000000000n)
    
    // Format units back to display
    const formatted = formatTokenAmountFromUnits(1500000000000000000n, 18)
    expect(formatted).toBe('1.5')
  })
  
  it('should handle edge cases', () => {
    expect(parseTokenAmountToUnits('', 18)).toBe(null)
    expect(parseTokenAmountToUnits('abc', 18)).toBe(null)
    expect(parseTokenAmountToUnits('0', 18)).toBe(0n)
  })
})
```

## Performance Tips

### Memoize Expensive Computations

```tsx
import { useMemo } from 'react'

function ExpensiveCalculation({ draft }: { draft: QuestDraft }) {
  const estimatedGas = useMemo(() => {
    // Only recalculate when relevant fields change
    const tokenAmount = parseTokenAmountToUnits(draft.rewardAmount, draft.rewardToken?.decimals ?? 18)
    const participants = parseInt(draft.maxParticipants) || 0
    
    return calculateGasCost(tokenAmount, participants)
  }, [draft.rewardAmount, draft.rewardToken?.decimals, draft.maxParticipants])
  
  return <div>Estimated gas: {estimatedGas}</div>
}
```

### Debounce Search Input

```tsx
function SearchInput() {
  const catalog = useAssetCatalog()
  const [localQuery, setLocalQuery] = useState('')
  
  // Debounce the actual search
  useEffect(() => {
    const timer = setTimeout(() => {
      catalog.onTokenQueryChange(localQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [localQuery])
  
  return (
    <input
      value={localQuery}
      onChange={(e) => setLocalQuery(e.target.value)}
      placeholder="Search..."
    />
  )
}
```

### Optimize Re-renders

```tsx
import { memo } from 'react'

const TokenListItem = memo(({ token, onSelect }: TokenListItemProps) => {
  return (
    <button onClick={() => onSelect(token)}>
      {token.symbol}
    </button>
  )
}, (prev, next) => {
  // Only re-render if token address changes
  return prev.token.address === next.token.address
})
```

## Migration from Old Wizard

### Before (Old Component-Based Approach)

```tsx
// Old: 1500+ lines in one component
function OldQuestWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [questName, setQuestName] = useState('')
  const [questDescription, setQuestDescription] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState(null)
  // ... 50+ more state variables
  
  const handleNext = () => {
    if (currentStep === 0 && !questName) {
      alert('Name required')
      return
    }
    // ... 100+ lines of validation logic
    setCurrentStep(prev => prev + 1)
  }
  
  // ... 1400 more lines
}
```

### After (New Hook-Based Approach)

```tsx
// New: ~100 lines using hooks
function NewQuestWizard() {
  const wizard = useWizardState({ pushNotification })
  const { sectionMotion } = useWizardAnimation()
  const catalog = useAssetCatalog()
  
  return (
    <motion.div {...sectionMotion}>
      <WizardStep 
        step={wizard.currentStep}
        draft={wizard.draft}
        catalog={catalog}
        onNext={wizard.onNext}
        onBack={wizard.onBack}
        onChange={wizard.onDraftChange}
      />
    </motion.div>
  )
}
```

### Key Benefits

1. **93.5% less code**: From 1500+ lines to ~100 lines
2. **Better testability**: Each hook tested independently
3. **Improved reusability**: Hooks composable across components
4. **Type safety**: Full TypeScript support with inference
5. **Better UX**: Smooth animations, accessibility, touch tracking
6. **Maintainability**: Single responsibility, clear separation of concerns

---

## Additional Resources

- [API Reference](./API.md) - Complete API documentation
- [ADR 001: Architecture](./adr/001-quest-wizard-refactor.md) - Design decisions
- [ADR 002: Testing Strategy](./adr/002-testing-strategy.md) - Test approach
- [Quest Policy](../planning/quest-policy.md) - Business rules

## Support

For questions or issues, please refer to the main README or open an issue.
