# ADR 002: Testing Strategy with Vitest and React Testing Library

**Status**: Implemented  
**Date**: November 2025  
**Sprint**: 3  

## Context

After refactoring the quest-wizard from 3,808 lines to a modular architecture, we needed a comprehensive testing strategy to ensure:
- Code quality and correctness
- Regression prevention
- Confidence in future changes
- Fast feedback loops

## Decision

We adopted **Vitest + React Testing Library** as our testing stack with a focus on:

### Testing Philosophy

1. **Test behavior, not implementation** - Focus on user-facing outcomes
2. **Isolation over integration** - Test hooks independently first
3. **Fast feedback** - Sub-3-second test runs
4. **Readable tests** - Clear arrange/act/assert patterns
5. **Maintainable** - Tests shouldn't break with refactors

### Stack Selection

#### Vitest 4.0.9
- **Why**: Native ESM support, 10x faster than Jest
- **Features**: Hot module reload, watch mode, coverage with v8
- **Performance**: 129 tests in 2.97s

#### React Testing Library 16.3.0
- **Why**: Best practices for React component/hook testing
- **Features**: `renderHook`, `waitFor`, `act` utilities
- **Philosophy**: "The more your tests resemble the way your software is used, the more confidence they give you"

#### jsdom 27.2.0
- **Why**: Lightweight DOM implementation for Node
- **Features**: Fast, good enough for our needs
- **Trade-off**: Not a real browser, but 100x faster

### Test Organization

```
__tests__/
  hooks/
    useWizardState.test.ts       (22 tests)
    useWizardAnimation.test.ts   (11 tests)
  utils/
    tokenMath.test.ts            (32 tests)
    formatters.test.ts           (21 tests)
    sanitizers.test.ts           (43 tests)
  test-utils.tsx                 (shared helpers)
```

### Coverage Targets

- **Hooks**: 95%+ statement coverage
- **Utilities**: 85%+ statement coverage  
- **Critical paths**: 100% branch coverage

**Achieved**:
- Hooks: 97.56% ✅
- Utils: 87.17% ✅

## Test Patterns

### Hook Testing Pattern

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useWizardState } from '@/hooks/useWizardState'

describe('useWizardState', () => {
  it('should initialize with first step', () => {
    const { result } = renderHook(() => useWizardState(initialDraft))
    expect(result.current.stepIndex).toBe(0)
  })

  it('should advance to next step', () => {
    const { result } = renderHook(() => useWizardState(initialDraft))
    act(() => result.current.nextStep())
    expect(result.current.stepIndex).toBe(1)
  })
})
```

### Utility Testing Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { scaleToDecimals, parseDecimalInput } from './tokenMath'

describe('tokenMath', () => {
  it('should scale to decimals correctly', () => {
    expect(scaleToDecimals('1.5', 18)).toBe('1500000000000000000')
  })

  it('should handle edge cases', () => {
    expect(scaleToDecimals('0', 18)).toBe('0')
    expect(scaleToDecimals('', 18)).toBe('0')
  })
})
```

### Async Testing Pattern

```typescript
it('should fetch and cache data', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ items: [...] })
  })

  const { result } = renderHook(() => useAssetCatalog(...))
  
  result.current.onTokenSearch('ethereum')

  await waitFor(() => {
    expect(result.current.tokens).toHaveLength(1)
    expect(result.current.tokenLoading).toBe(false)
  })
})
```

## Consequences

### Positive

✅ **Fast feedback**: 3-second test runs  
✅ **High confidence**: 97.56% hook coverage  
✅ **Regression prevention**: 129 tests guard against breaks  
✅ **Refactor safety**: Tests pass through implementation changes  
✅ **Documentation**: Tests show usage patterns  
✅ **CI/CD ready**: Automated quality gates  

### Negative

⚠️ **Initial setup time**: Vitest configuration, mock setup  
⚠️ **Learning curve**: RTL best practices, async patterns  
⚠️ **Test maintenance**: Tests need updates as features evolve  
⚠️ **Not E2E**: Missing full integration coverage  

### Mitigations

- Document testing patterns (this ADR)
- Shared test utilities (`test-utils.tsx`)
- Clear examples in each test file
- Playwright for E2E tests (future)

## Implementation Details

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['hooks/**', 'components/quest-wizard/utils/**']
    }
  }
})
```

### Test Scripts

```json
{
  "test": "vitest",
  "test:run": "vitest --run",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

### Mock Strategy

1. **API calls**: Mock `fetch` globally
2. **External hooks**: Mock via Vitest `vi.mock()`
3. **Timers**: Use `vi.useFakeTimers()` for deterministic tests
4. **Storage**: Mock localStorage/sessionStorage

### What We Test

**Hooks**:
- Initial state correctness
- State transitions
- Side effects (useEffect)
- Error handling
- Edge cases

**Utilities**:
- Happy path inputs
- Edge cases (empty, null, undefined)
- Error conditions
- Boundary values
- Type coercion

**What We Don't Test** (yet):
- Full UI integration
- Browser-specific behavior
- Network layer
- Authentication flow end-to-end

## Future Improvements

1. **Integration tests**: Test hook composition patterns
2. **Visual regression**: Chromatic or Percy for UI
3. **E2E tests**: Playwright for critical user journeys
4. **Performance tests**: Benchmark critical paths
5. **Mutation testing**: Stryker to validate test quality

## Metrics

### Current State
- **Total tests**: 129
- **Test files**: 5
- **Duration**: 2.97s
- **Pass rate**: 100%
- **Coverage**: 97.56% (hooks), 87.17% (utils)

### Quality Gates
- ✅ All tests must pass before merge
- ✅ Coverage must not decrease
- ✅ New hooks require 90%+ coverage
- ✅ New utilities require 85%+ coverage

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
