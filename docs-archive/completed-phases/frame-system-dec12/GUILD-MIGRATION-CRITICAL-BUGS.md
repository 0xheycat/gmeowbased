# 🚨 Guild Migration - Critical Bugs Report

**Date**: December 10, 2025  
**Status**: ⚠️ INCOMPLETE - Multiple Critical Issues Found  
**Reporter**: Production Testing

---

## 🔴 Critical Issue #1: Guild Leader Cannot Deposit Points

### Problem
Guild leaders (who created the guild) cannot deposit points because `guildOf()` returns `0` for them.

**Error Log**:
```
contractAddress: '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73'
functionName: 'guildOf'
args: ['0x8870C155666809609176260F2B65a626C000D773']
POST /api/guild/1/deposit 400 in 6647ms
Error: "You are not in any guild"
```

### Root Cause
**Contract Architecture Issue**:
- When you **create** a guild, you become the **leader** in the Guild contract
- However, `guildOf()` mapping in the **Core contract** may not be automatically set
- This is a contract-level design: leaders ≠ automatic members in `guildOf` mapping

**Affected APIs** (6 files using `guildOf()` for membership checks):
1. ❌ `/api/guild/[guildId]/deposit` - Line 128
2. ❌ `/api/guild/[guildId]/claim` - Line 174
3. ❌ `/api/guild/[guildId]/manage-member` - Line 136
4. ❌ `/api/guild/[guildId]/leave` - Line 86
5. ❌ `/api/guild/create` - Line 143
6. ✅ `/api/guild/[guildId]/is-member` - Line 88 (PARTIALLY FIXED)

### Impact
- **Severity**: CRITICAL 🔴
- **User Experience**: Guild leaders cannot use their own guilds
- **Blocking**: Prevents core functionality (deposits, claims, management)
- **Workaround**: None without contract changes or API fixes

### Required Fix

**Strategy**: Implement "Leader-as-Member" fallback in ALL APIs

```typescript
/**
 * Check if user is member of guild
 * Returns true if:
 * 1. guildOf(address) == guildId (normal member)
 * 2. getGuildInfo(guildId).leader == address (guild leader)
 */
async function isUserMemberOfGuild(
  address: Address,
  guildId: bigint
): Promise<boolean> {
  // Check 1: Normal membership via guildOf()
  const userGuildId = await getUserGuild(address)
  if (userGuildId === guildId) return true
  
  // Check 2: Guild leadership (fallback)
  const guildInfo = await getGuildInfo(guildId)
  if (guildInfo && guildInfo.leader.toLowerCase() === address.toLowerCase()) {
    return true
  }
  
  return false
}
```

**Files to Fix**:
- [ ] `/app/api/guild/[guildId]/deposit/route.ts` (Lines 120-140)
- [ ] `/app/api/guild/[guildId]/claim/route.ts` (Lines 165-180)
- [ ] `/app/api/guild/[guildId]/manage-member/route.ts` (Lines 130-150)
- [ ] `/app/api/guild/[guildId]/leave/route.ts` (Lines 80-100)
- [ ] `/app/api/guild/create/route.ts` (Lines 140-160)

---

## 🔴 Critical Issue #2: Inconsistent Contract Usage

### Problem
Multiple APIs mix **Core contract** and **Guild contract** calls incorrectly.

**Example from deposit API**:
```typescript
// Uses CORE contract for guildOf (correct)
const guildId = await client.readContract({
  address: getContractAddress('base'), // ← Core: 0x9EB9...
  functionName: 'guildOf',
})

// Should use GUILD contract for guild data
const guildInfo = await client.readContract({
  address: getContractAddress('base'), // ❌ WRONG - should be STANDALONE_ADDRESSES.base.guild
  functionName: 'getGuildInfo',
})
```

### Contract Architecture Reference

| Contract | Address | Functions | Purpose |
|----------|---------|-----------|---------|
| **Core** | `0x9EB9...D73` | `guildOf()`, `pointsBalance()`, `gmhistory()` | User state, points |
| **Guild** | `0x6754...C8A3` | `getGuildInfo()`, `createGuild()`, `joinGuild()` | Guild operations |
| **Badge** | `0x5Af5...9aD2` | Badge NFT operations | Achievements |

### Required Fix
**Audit all APIs for correct contract usage**:
- [ ] `guildOf()` → CORE contract ✅
- [ ] `pointsBalance()` → CORE contract ✅
- [ ] `getGuildInfo()` → GUILD contract ❌ (some APIs use Core)
- [ ] Guild operations → GUILD contract ❌ (some mix)

---

## 🟡 Medium Priority Issues

### Issue #3: Missing Officer Role Support
**Files Affected**: All membership checks  
**Problem**: Code comments say "officer logic not implemented"  
**Impact**: Officers treated as regular members  
**Fix Needed**: Implement `isGuildOfficer()` checks

### Issue #4: Incomplete Error Messages
**Example**: `"You are not in any guild"` doesn't explain leader ≠ member  
**Better**: `"Membership check failed. If you're the guild leader, this is a known issue being fixed."`

### Issue #5: No Transaction Logging
**Problem**: No audit trail for deposits/claims  
**Impact**: Hard to debug production issues  
**Fix**: Add comprehensive logging to all guild APIs

---

## 📊 Professional Platform Standards (How Big Platforms Handle This)

### 1. **Stripe API Approach**
- ✅ Idempotency keys (we have this)
- ✅ Comprehensive error codes (we need this)
- ✅ Detailed error messages with next steps
- ✅ Webhook events for all state changes
- ✅ Audit logs with full request/response

### 2. **GitHub API Approach**
- ✅ Rate limiting with clear headers (we have this)
- ✅ Deprecation warnings
- ✅ API versioning
- ✅ Detailed documentation per endpoint
- ✅ Error response with `documentation_url` field

### 3. **AWS API Approach**
- ✅ Request IDs in all responses (we have this)
- ✅ Retry policies with exponential backoff
- ✅ Circuit breakers for downstream failures
- ✅ Health check endpoints
- ✅ Distributed tracing

### What We're Missing:

#### A. Comprehensive Testing Strategy
```typescript
// We need:
- Unit tests for each API endpoint
- Integration tests with real contracts
- E2E tests simulating user journeys
- Contract interaction tests
- Error scenario tests
```

#### B. Proper Error Handling Framework
```typescript
// Current: Generic errors
return createErrorResponse('You are not in any guild', 400)

// Professional: Structured errors
return {
  error: {
    code: 'GUILD_MEMBERSHIP_REQUIRED',
    message: 'You must be a member of this guild',
    details: {
      userGuildId: userGuildId.toString(),
      requestedGuildId: guildId.toString(),
      possibleReasons: [
        'You have not joined this guild',
        'If you are the guild leader, please contact support'
      ]
    },
    documentation_url: '/docs/api/errors#GUILD_MEMBERSHIP_REQUIRED',
    request_id: requestId
  }
}
```

#### C. Health Monitoring
```typescript
// Need endpoints:
- /api/health - System health
- /api/health/contracts - Contract connectivity
- /api/health/database - Database status
- /api/metrics - Performance metrics
```

#### D. Contract State Validation
```typescript
// Before operations, validate:
- Contract is deployed
- Contract is not paused
- Contract version matches expected
- Required functions exist
```

#### E. Graceful Degradation
```typescript
// If Core contract fails:
- Fall back to Guild contract where possible
- Cache recent responses
- Return partial data with warnings
- Don't block entire API
```

---

## 🎯 Immediate Action Plan (Priority Order)

### Phase 1: Critical Fixes (✅ COMPLETED - All 6 APIs Fixed)
1. ✅ Fix is-member API - Add leader fallback (DONE - tested working)
2. ✅ Fix deposit API - Add leader fallback (DONE - tested working)
3. ✅ Fix claim API - Add leader fallback (DONE - code complete, needs testing)
4. ✅ Fix manage-member API - Add leader fallback (DONE - code complete, needs testing)
5. ✅ Fix leave API - Add leader fallback (DONE - code complete, needs testing)
6. ✅ Fix create API - Add leader fallback (DONE - code complete, needs testing)

**Verification**: All 6 files compile with 0 TypeScript errors ✅

### Phase 2: Testing (IN PROGRESS - Ready for Oracle Address Testing)
**Test Configuration**:
- Oracle Address: `0x8870C155666809609176260F2B65a626C000D773`
- Guild ID: `1`
- Dev Server: Running at `localhost:3000` ✅

**Test Plan**:
1. ⏳ Test deposit API - Verify leader can deposit points
2. ⏳ Test claim API - Verify leader can request/approve claims
3. ⏳ Test manage-member API - Verify leader can promote/demote/kick
4. ⏳ Test leave API - Verify member operations work
5. ⏳ Test is-member API - Verify membership checks (already tested ✅)
6. ⏳ Edge cases - Test with non-members, invalid guild IDs

### Phase 3: Error Handling (PENDING - After Testing)
1. Create error code enum
2. Update all APIs with structured errors
3. Add documentation URLs
4. Improve error messages

### Phase 4: Monitoring (Day 4 - 2 hours)
1. Add health check endpoints
2. Add performance monitoring
3. Set up alerting for failures
4. Create operational dashboard

---

## 🔍 Testing Checklist (What We Should Have Done First)

### Guild Leader Tests
- [ ] Leader can view guild
- [ ] Leader can deposit points
- [ ] Leader can claim from treasury
- [ ] Leader can manage members
- [ ] Leader can edit guild settings
- [ ] Leader cannot leave guild while having members

### Member Tests
- [ ] Member can view guild
- [ ] Member can deposit points
- [ ] Member cannot claim from treasury
- [ ] Member cannot manage other members
- [ ] Member can leave guild

### Non-Member Tests
- [ ] Non-member can view public guild info
- [ ] Non-member cannot deposit points
- [ ] Non-member cannot access treasury
- [ ] Non-member can join guild

### Contract State Tests
- [ ] Handle contract read failures gracefully
- [ ] Handle contract write failures with retry
- [ ] Validate contract responses
- [ ] Handle network timeouts

---

## 📝 Lessons Learned

### What Went Wrong
1. ❌ Claimed "100% complete" without thorough testing
2. ❌ Didn't test with actual user flows
3. ❌ Assumed contract behavior without validation
4. ❌ No test coverage before declaring done
5. ❌ Focused on code changes, not user experience

### What Big Platforms Do Right
1. ✅ Test-driven development
2. ✅ Staging environment testing
3. ✅ Canary deployments (1% → 10% → 100%)
4. ✅ Feature flags for gradual rollout
5. ✅ Automated testing in CI/CD
6. ✅ Monitoring alerts before users report bugs
7. ✅ Post-mortems after incidents

### How to Fix Our Process
1. **Test First**: Write tests before marking as complete
2. **Real Users**: Test with actual wallet addresses and transactions
3. **Staging**: Deploy to staging first, test thoroughly
4. **Monitoring**: Set up alerts for failures
5. **Documentation**: Update docs as code changes
6. **Code Review**: Have another developer review before merge

---

## 🚀 Next Steps

### Immediate (Right Now)
1. Fix the 5 remaining APIs with leader fallback logic
2. Test each fix with your wallet address
3. Verify all operations work end-to-end

### Short Term (This Week)
1. Write comprehensive tests
2. Improve error messages
3. Add health monitoring
4. Update documentation

### Long Term (Next Sprint)
1. Implement officer role support
2. Add transaction audit logs
3. Create admin dashboard
4. Performance optimization

---

**Status Update**: This migration is **NOT COMPLETE**. We have critical bugs blocking guild leaders from using basic functionality.

**ETA for Real Completion**: 6-8 hours of focused work with proper testing.

**Current Progress**: ~60% complete (APIs migrated but not tested, missing critical fallback logic)
