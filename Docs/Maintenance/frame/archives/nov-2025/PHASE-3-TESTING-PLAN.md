# Phase 3: Testing Infrastructure Plan

**Created**: November 17, 2025  
**Status**: 📋 **DRAFT** - Awaiting approval to begin  
**Prerequisites**: Phase 2 ✅ Complete, Phase 2B ⏳ Pending  
**Goal**: Achieve 85%+ code coverage with comprehensive test suite  
**Estimated Duration**: ~35 hours  

---

## 🎯 Testing Philosophy

**Core Principles**:
- Test behavior, not implementation
- Every route must have tests
- Every edge case must be covered
- Tests must be maintainable
- Tests must run fast (<1 min for full suite)
- Tests must be deterministic (no flaky tests)

**Quality Gates Applied**: GI-12 (Unit Test Coverage)

---

## 📋 COMPREHENSIVE ROUTE TEST CHECKLIST

For **EVERY route** (55 total), test the following:

### ✅ Success Cases
- [ ] Valid request with correct parameters
- [ ] Valid request with optional parameters
- [ ] Valid request with multiple valid inputs
- [ ] Response structure matches expected schema
- [ ] Response status code is correct (200/201)
- [ ] Response headers include correct Content-Type

### ❌ Validation Failures
- [ ] Missing required parameters → 400
- [ ] Invalid parameter types → 400
- [ ] Out-of-range values → 400
- [ ] Malformed JSON → 400
- [ ] Empty body when body required → 400
- [ ] Zod validation error shape correct

### 🔒 Authentication/Authorization
- [ ] Request without auth token → 401
- [ ] Request with invalid token → 401
- [ ] Request with expired token → 401
- [ ] Request with insufficient permissions → 403
- [ ] Admin routes reject non-admin users → 403

### 🚦 Rate Limiting
- [ ] Requests within limit → 200
- [ ] Request exceeding limit → 429
- [ ] Rate limit headers present (X-RateLimit-Remaining)
- [ ] Rate limit resets after window expires
- [ ] Different IPs have separate rate limits

### 🛡️ Error Handling
- [ ] withErrorHandler wrapper applied correctly
- [ ] Errors logged to console.error
- [ ] Error responses don't leak stack traces
- [ ] Error responses have consistent shape
- [ ] 500 errors have generic messages in production

### 🔧 Edge Cases
- [ ] Empty arrays in request
- [ ] Empty strings in request
- [ ] Null values in optional fields
- [ ] Very large inputs (stress testing)
- [ ] Unicode/emoji in text fields
- [ ] SQL injection attempts (should be sanitized)
- [ ] XSS attempts (should be escaped)

### 🎯 Special Cases

#### SSE Streaming (tips/stream)
- [ ] Stream opens successfully
- [ ] Events formatted correctly (SSE format)
- [ ] Ping events sent every 25 seconds
- [ ] Stream closes on client disconnect
- [ ] No withErrorHandler applied (returns Response not NextResponse)

#### Webhook Routes (Neynar)
- [ ] Valid signature → 200
- [ ] Invalid signature → 401
- [ ] Missing signature header → 400
- [ ] HMAC verification works correctly
- [ ] Replay attack protection (if implemented)

#### Database Operations
- [ ] Insert succeeds with valid data
- [ ] Insert fails with duplicate unique key
- [ ] Foreign key constraints prevent invalid inserts
- [ ] CHECK constraints prevent invalid data
- [ ] Transactions roll back on error

#### Snapshot Routes
- [ ] Duplicate snapshots prevented
- [ ] Concurrent snapshot creation handled
- [ ] Snapshot history pagination works
- [ ] Snapshot stats calculated correctly

#### Caching (if applicable)
- [ ] Cache hit returns cached data
- [ ] Cache miss fetches fresh data
- [ ] Cache invalidation works
- [ ] Cache headers set correctly

---

## 🗂️ Test File Structure

```
__tests__/
├── api/                        # API route tests
│   ├── admin/
│   │   ├── badges.test.ts
│   │   ├── bot/
│   │   │   ├── status.test.ts
│   │   │   ├── config.test.ts
│   │   │   ├── activity.test.ts
│   │   │   └── reset-client.test.ts
│   │   ├── auth/
│   │   │   ├── login.test.ts
│   │   │   └── logout.test.ts
│   │   ├── leaderboard/
│   │   │   └── snapshot.test.ts
│   │   └── viral/
│   │       ├── webhook-health.test.ts
│   │       ├── notification-stats.test.ts
│   │       ├── tier-upgrades.test.ts
│   │       ├── achievement-stats.test.ts
│   │       └── top-casts.test.ts
│   ├── analytics/
│   │   ├── badges.test.ts
│   │   └── summary.test.ts
│   ├── badges/
│   │   ├── assign.test.ts
│   │   ├── mint.test.ts
│   │   ├── list.test.ts
│   │   ├── [address].test.ts
│   │   ├── templates.test.ts
│   │   └── registry.test.ts
│   ├── farcaster/
│   │   ├── fid.test.ts
│   │   ├── bulk.test.ts
│   │   └── assets.test.ts
│   ├── frame/
│   │   ├── identify.test.ts
│   │   ├── badgeShare.test.ts
│   │   └── badge.test.ts
│   ├── leaderboard/
│   │   ├── leaderboard.test.ts
│   │   └── sync.test.ts
│   ├── neynar/
│   │   ├── score.test.ts
│   │   ├── balances.test.ts
│   │   ├── power-users.test.ts
│   │   └── webhook.test.ts
│   ├── onboard/
│   │   ├── status.test.ts
│   │   └── complete.test.ts
│   ├── quests/
│   │   ├── claim.test.ts
│   │   └── verify.test.ts
│   ├── seasons/
│   │   └── seasons.test.ts
│   ├── snapshot/
│   │   └── snapshot.test.ts
│   ├── tips/
│   │   ├── ingest.test.ts
│   │   ├── summary.test.ts
│   │   └── stream.test.ts
│   ├── user/
│   │   └── profile.test.ts
│   ├── viral/
│   │   ├── leaderboard.test.ts
│   │   ├── stats.test.ts
│   │   └── badge-metrics.test.ts
│   └── webhooks/
│       └── neynar/
│           └── cast-engagement.test.ts
├── components/               # Component tests
│   ├── OnboardingFlow.test.tsx  # ✅ Already exists
│   ├── BadgeCard.test.tsx
│   ├── LeaderboardList.test.tsx
│   ├── QuestCard.test.tsx
│   ├── admin/
│   │   ├── AdminBadgeForm.test.tsx
│   │   ├── BotStatusPanel.test.tsx
│   │   └── ViralStatsPanel.test.tsx
│   └── ...
├── hooks/                    # Custom hook tests
│   ├── useAssetCatalog.test.ts
│   ├── useQuestVerification.test.ts
│   ├── usePolicyEnforcement.test.ts
│   └── ...
├── lib/                      # Utility tests
│   ├── error-handler.test.ts
│   ├── rate-limit.test.ts
│   ├── validation/
│   │   └── api-schemas.test.ts
│   └── ...
├── integration/              # Integration tests
│   ├── onboarding-flow.test.ts
│   ├── quest-completion.test.ts
│   ├── badge-minting.test.ts
│   └── ...
└── fixtures/                 # Test data
    ├── users.ts
    ├── badges.ts
    ├── quests.ts
    └── ...
```

---

## 📝 Naming Conventions

### Test Files
- API routes: `<route-name>.test.ts` (matches file structure)
- Components: `<ComponentName>.test.tsx`
- Hooks: `<hookName>.test.ts`
- Utilities: `<utilityName>.test.ts`

### Test Suites
```typescript
describe('POST /api/badges/assign', () => {
  describe('Success cases', () => { ... })
  describe('Validation errors', () => { ... })
  describe('Authentication', () => { ... })
  describe('Rate limiting', () => { ... })
  describe('Edge cases', () => { ... })
})
```

### Test Names
- Use descriptive names: `it('should return 400 when FID is negative', ...)`
- Avoid generic names: ❌ `it('works', ...)` ✅ `it('should assign badge to valid FID', ...)`
- Follow pattern: `should [expected behavior] when [condition]`

---

## 🎭 Mocking Strategy

### External APIs (Neynar)
```typescript
// __mocks__/neynar.ts
export const mockNeynarClient = {
  fetchUserByFid: vi.fn(),
  fetchUserInteractions: vi.fn(),
  publishCast: vi.fn(),
}
```

### Database (Supabase)
```typescript
// __mocks__/supabase.ts
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}
```

### Rate Limiting (Upstash Redis)
```typescript
// __mocks__/upstash.ts
export const mockRateLimitClient = {
  limit: vi.fn(() => ({ success: true, remaining: 59 })),
}
```

### Environment Variables
```typescript
// test-utils.tsx
export function setupTestEnv() {
  process.env.NEYNAR_API_KEY = 'test-key'
  process.env.SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
}
```

---

## 📦 Test Fixtures

### User Fixtures
```typescript
// fixtures/users.ts
export const mockUsers = {
  validUser: {
    fid: 18139,
    username: 'heycat',
    displayName: 'HEY CAT',
    pfpUrl: 'https://example.com/pfp.jpg',
    followerCount: 1515,
    powerBadge: false,
  },
  invalidFid: {
    fid: -1,
    username: 'invalid',
  },
  anonymousUser: {
    anonymous: true,
  },
}
```

### Badge Fixtures
```typescript
// fixtures/badges.ts
export const mockBadges = {
  bronze: {
    badgeId: 'badge_bronze_123',
    badgeType: 'GMEOW_STREAK',
    tier: 'bronze',
    metadata: { name: 'Bronze Streak', description: '7 day streak' },
  },
  // ... silver, gold, diamond
}
```

### Quest Fixtures
```typescript
// fixtures/quests.ts
export const mockQuests = {
  dailyGm: {
    questId: 'quest_daily_gm',
    type: 'DAILY_GM',
    expiresAt: Date.now() + 86400000, // 24 hours
    reward: 100,
  },
  // ... other quests
}
```

---

## 🔧 Test Utilities

### Setup/Teardown
```typescript
// test-utils.tsx
export function setupTest() {
  vi.clearAllMocks()
  setupTestEnv()
}

export function teardownTest() {
  vi.restoreAllMocks()
}

beforeEach(() => setupTest())
afterEach(() => teardownTest())
```

### Request Helpers
```typescript
// test-utils.tsx
export async function makeRequest(
  handler: Function,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    query?: Record<string, string>
  }
) {
  const url = new URL('http://localhost:3000/api/test')
  if (options.query) {
    Object.entries(options.query).forEach(([key, val]) => {
      url.searchParams.set(key, val)
    })
  }

  const req = new Request(url.toString(), {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  return handler(req)
}
```

### Response Assertions
```typescript
// test-utils.tsx
export async function expectSuccessResponse(res: Response, expectedStatus = 200) {
  expect(res.status).toBe(expectedStatus)
  const json = await res.json()
  expect(json).toBeDefined()
  return json
}

export async function expectErrorResponse(
  res: Response,
  expectedStatus: number,
  expectedError?: string
) {
  expect(res.status).toBe(expectedStatus)
  const json = await res.json()
  expect(json.error || json.reason).toBeDefined()
  if (expectedError) {
    expect(json.error || json.reason).toContain(expectedError)
  }
  return json
}
```

---

## 🎯 Minimal Dependencies

**Testing Stack**:
- **Vitest**: Test runner (already configured)
- **@testing-library/react**: Component testing (already installed)
- **@testing-library/user-event**: User interaction simulation
- **msw**: API mocking (if needed for E2E)
- **vi.mock**: Built-in Vitest mocking

**Avoid**:
- Heavy E2E frameworks (Cypress, Playwright) - keep tests fast
- External test databases - use mocks
- Real API calls - use mocks

---

## 📊 Coverage Targets

### Overall Target: 85%+

**By Category**:
| Category | Target Coverage | Priority |
|----------|----------------|----------|
| API Routes | 90%+ | 🔴 CRITICAL |
| Components | 80%+ | 🟡 HIGH |
| Hooks | 85%+ | 🟡 HIGH |
| Utilities | 95%+ | 🟢 MEDIUM |
| Error Handlers | 100% | 🔴 CRITICAL |
| Validators | 100% | 🔴 CRITICAL |

**Coverage Metrics**:
- **Line Coverage**: % of lines executed
- **Branch Coverage**: % of conditional branches tested
- **Function Coverage**: % of functions called
- **Statement Coverage**: % of statements executed

**CI/CD Integration**:
- Tests run on every PR
- Coverage report generated automatically
- PR blocked if coverage drops below 85%
- Coverage badge in README

---

## ⏱️ Timeline Estimate

### Phase 3A: API Route Tests (20 hours)
**Week 1**:
- Day 1-2: Setup test infrastructure, utilities, fixtures (6 hours)
- Day 3-4: Admin routes (18 routes × 30 min = 9 hours)
- Day 5: Badge routes (8 routes × 30 min = 4 hours)

**Week 2**:
- Day 1: Frame, analytics, user routes (8 routes × 15 min = 2 hours)
- Day 2: Quest, viral, leaderboard routes (12 routes × 30 min = 6 hours)
- Day 3: Webhook, tips, farcaster routes (9 routes × 20 min = 3 hours)

### Phase 3B: Component Tests (10 hours)
**Week 3**:
- Day 1: Badge components (4 hours)
- Day 2: Quest components (3 hours)
- Day 3: Admin components (3 hours)

### Phase 3C: Integration Tests (5 hours)
**Week 4**:
- Day 1: Onboarding flow (2 hours)
- Day 2: Quest completion flow (2 hours)
- Day 3: Badge minting flow (1 hour)

**Total**: ~35 hours (2-3 weeks part-time)

---

## 🚀 Getting Started Checklist

### Before Writing Tests
- [ ] Review existing OnboardingFlow tests (best practices)
- [ ] Set up Vitest watch mode: `npm test -- --watch`
- [ ] Create test fixtures for common data
- [ ] Set up mocks for external APIs
- [ ] Create test utilities for common assertions

### While Writing Tests
- [ ] Follow the comprehensive checklist for each route
- [ ] Write descriptive test names
- [ ] Test one thing per test
- [ ] Keep tests fast (<100ms per test)
- [ ] Use fixtures to avoid duplication

### After Writing Tests
- [ ] Run full suite: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Review coverage report
- [ ] Fix any failing tests
- [ ] Commit tests with descriptive messages

---

## 📚 Example Test Structure

```typescript
// __tests__/api/badges/assign.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/badges/assign/route'
import { makeRequest, expectSuccessResponse, expectErrorResponse } from '@/test-utils'
import { mockUsers, mockBadges } from '@/fixtures'

describe('POST /api/badges/assign', () => {
  describe('Success cases', () => {
    it('should assign badge to valid FID', async () => {
      const res = await makeRequest(POST, {
        method: 'POST',
        body: {
          fid: mockUsers.validUser.fid,
          badgeType: 'GMEOW_STREAK',
          tier: 'bronze',
        },
      })

      const json = await expectSuccessResponse(res, 201)
      expect(json.badgeId).toBeDefined()
      expect(json.fid).toBe(mockUsers.validUser.fid)
    })
  })

  describe('Validation errors', () => {
    it('should return 400 when FID is negative', async () => {
      const res = await makeRequest(POST, {
        method: 'POST',
        body: { fid: -1, badgeType: 'GMEOW_STREAK', tier: 'bronze' },
      })

      await expectErrorResponse(res, 400, 'Invalid FID')
    })

    it('should return 400 when badge type is missing', async () => {
      const res = await makeRequest(POST, {
        method: 'POST',
        body: { fid: 18139, tier: 'bronze' },
      })

      await expectErrorResponse(res, 400)
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 after exceeding rate limit', async () => {
      // Mock rate limiter to return failure
      vi.mocked(rateLimit).mockResolvedValueOnce({ success: false })

      const res = await makeRequest(POST, {
        method: 'POST',
        body: { fid: 18139, badgeType: 'GMEOW_STREAK', tier: 'bronze' },
      })

      expect(res.status).toBe(429)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock Supabase to throw error
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      const res = await makeRequest(POST, {
        method: 'POST',
        body: { fid: 18139, badgeType: 'GMEOW_STREAK', tier: 'bronze' },
      })

      await expectErrorResponse(res, 500)
    })
  })
})
```

---

## 🔍 Testing Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should do something', () => {
     // Arrange: Set up test data
     const input = { fid: 18139 }
     
     // Act: Execute the code
     const result = doSomething(input)
     
     // Assert: Verify the outcome
     expect(result).toBe(expected)
   })
   ```

2. **Test Isolation**
   - Each test should be independent
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

3. **Descriptive Names**
   - Test name should describe expected behavior
   - Include the condition being tested
   - Make failures easy to diagnose

4. **Fast Tests**
   - Keep tests under 100ms each
   - Use mocks for external dependencies
   - Avoid real database calls

5. **Maintainable Tests**
   - Use fixtures for common data
   - Extract helpers for repeated logic
   - Keep tests DRY but readable

---

## ✅ Definition of Done

A route is considered "fully tested" when:

- [ ] All success cases covered
- [ ] All validation errors covered
- [ ] Authentication/authorization tested
- [ ] Rate limiting tested
- [ ] Error handling tested
- [ ] Edge cases covered
- [ ] Special cases addressed
- [ ] Coverage >90% for route file
- [ ] All tests passing
- [ ] Tests run in <1 second

---

## 📌 Notes

- **Special Attention**: tips/stream (SSE), neynar/webhook (HMAC verification), quests/verify (1894 lines)
- **Coordination**: Some tests may need database seeding scripts
- **Performance**: Keep test suite <1 minute total runtime
- **CI/CD**: Tests will run on every commit to prevent regressions

---

**Status**: 📋 **AWAITING APPROVAL**  
**Next Step**: Complete Phase 2B (Validation), then begin Phase 3A (API Route Tests)  
**Timeline**: Start Phase 3 after Phase 2B completion  

---

*This plan will be updated as we progress through Phase 3 implementation.*
