# 🤖 MCP (Model Context Protocol) Usage Documentation

**Purpose**: Document all MCP server queries and findings used in development  
**Last Updated**: December 1, 2025 (Phase 1.5)

---

## Overview

Model Context Protocol (MCP) servers provide AI-accessible documentation and best practices from various platforms. We use MCP servers to ensure our implementations follow the latest official recommendations.

**MCP Servers Used**:
- ✅ **Coinbase Developer MCP** - CDP, OnchainKit, miniapp best practices
- ✅ **Supabase MCP** - Database, auth, session management (planned)
- ✅ **GitHub MCP** - Repository search, reference implementations (planned)

---

## Phase 1.5: Auth System Consolidation

### Coinbase Developer MCP Queries

#### Query 1: Farcaster Miniapp Authentication Best Practices

**Query**: `"Farcaster miniapp authentication best practices OnchainKit useMiniKit context user FID"`

**Date**: December 1, 2025

**Key Findings**:

1. **SDK Initialization Pattern**:
```typescript
import { sdk } from "@farcaster/frame-sdk";

useEffect(() => {
  const initMiniApp = async () => {
    await sdk.actions.ready();
    const isInMiniApp = await sdk.isInMiniApp();
    setIsInMiniApp(isInMiniApp);
  };
  initMiniApp();
}, []);
```

**Source**: [What are Miniapps? - Coinbase CDP Docs](https://docs.cdp.coinbase.com/x402/miniapps)

2. **Always Call `ready()` First**:
   - MCP recommends calling `sdk.actions.ready()` before any SDK operations
   - This ensures SDK is properly initialized in miniapp context
   - Applied in: `lib/contexts/AuthContext.tsx` line 74

3. **Use `sdk.isInMiniApp()` for Detection**:
   - More reliable than just iframe checks
   - Verifies SDK handshake completed
   - Applied in: `lib/contexts/AuthContext.tsx` checkMiniappContext()

4. **State Management Best Practices**:
   - Always check authentication state before starting flows
   - Avoid redundant verification when already authenticated
   - Provide clear sign-out functionality
   - Applied in: AuthContext with `isAuthenticated` checks

**Source**: [Embedded Wallets Best Practices - State Management](https://docs.cdp.coinbase.com/embedded-wallets/best-practices)

**Implementation**:
- Created unified AuthContext with state management
- Single source of truth for auth
- No duplicate verification

---

#### Query 2: Miniapp Ready Event Timeout Handling

**Query**: `"miniapp ready event timeout handling iframe context detection base.dev"`

**Date**: December 1, 2025

**Key Findings**:

1. **10s Timeout Recommendation**:
   - MCP analysis: 5s timeout too short for mobile networks
   - Recommended: 10s timeout for mobile (not 2s or 5s)
   - Prevents false failures on slow connections

**Applied Changes**:
```typescript
// BEFORE (lib/miniappEnv.ts)
export async function probeMiniappReady(timeoutMs = 2000)

// AFTER (Phase 1.5 fix)
export async function probeMiniappReady(timeoutMs = 10000)  // 10s for mobile
```

2. **Provide Retry Button**:
   - MCP recommends UI retry instead of silent fail
   - Better UX than automatic retries
   - Applied in: AuthContext error handling

3. **User-Friendly Error Messages**:
   - Change "Context timeout after 5s" → "Please refresh the app"
   - Show actionable instructions
   - Log to monitoring (Sentry) for debugging

**Source**: [x402 Miniapp Template - Miniapp Detection](https://docs.cdp.coinbase.com/x402/miniapps)

**Implementation**:
- `lib/miniappEnv.ts` - Increased timeout 2s → 10s
- `lib/contexts/AuthContext.tsx` - Uses 10s timeout
- Error messages include retry instructions

---

#### Query 3: Base.dev Miniapp Requirements & CSP Headers

**Query**: `"base.dev miniapp requirements CSP headers frame-ancestors manifest validation"`

**Date**: December 1, 2025

**Key Findings**:

1. **CSP Headers for base.dev**:
```typescript
// Required CSP headers
'frame-ancestors': 'https://*.farcaster.xyz https://*.warpcast.com https://*.base.dev'
'script-src': '... https://*.base.dev'
'connect-src': '... https://*.base.dev'
```

**Verification**: `app/api/frame/route.tsx` line 74 - ✅ Already correct

2. **Manifest Requirements**:
- version: "1" (not "1.1")
- iconUrl: Must be PNG format (not .ico)
- homeUrl: Must be HTTPS

**Verification**: `public/.well-known/farcaster.json` - ✅ All correct

3. **Context Detection Must Include base.dev**:

**Applied Changes**:
```typescript
// BEFORE (lib/share.ts - isMiniappContext)
return host.endsWith('.farcaster.xyz') || 
       host.endsWith('.warpcast.com') || 
       host === 'farcaster.xyz' || 
       host === 'warpcast.com'

// AFTER (Phase 1.5 fix)
return (
  host.endsWith('.farcaster.xyz') ||
  host.endsWith('.warpcast.com') ||
  host.endsWith('.base.dev') ||      // ← ADDED
  host === 'farcaster.xyz' ||
  host === 'warpcast.com' ||
  host === 'base.dev'                // ← ADDED
)
```

**Source**: [Security Requirements - CORS Protection](https://docs.cdp.coinbase.com/onramp-&-offramp/security-requirements)

**Implementation**:
- `lib/share.ts` - Added base.dev to isMiniappContext()
- `lib/contexts/AuthContext.tsx` - Checks base.dev in referrer
- CSP headers verified in frame route

4. **Validation Testing**:
- Test on: https://base.dev/apps/validate
- Test on: https://miniapp.farcaster.xyz/validate
- Both should pass with no errors

**Status**: ⏳ Manual testing pending

---

### Supabase MCP Queries (Planned)

#### Query 1: Session Management Patterns

**Query**: `"Supabase session management RLS policies FID-based auth"`

**Status**: ⏳ Pending - Not needed for Phase 1.5

**Use Case**: 
- If we add Supabase auth in future
- FID-based row-level security
- Session storage patterns

---

#### Query 2: Multi-Device Session Handling

**Query**: `"Supabase multi-device session handling wallet auth"`

**Status**: ⏳ Pending - Future enhancement

**Use Case**:
- User logs in on mobile + desktop
- Sync auth state across devices
- Handle session expiry

---

### GitHub MCP Queries (Planned)

#### Query 1: Farcaster Auth Provider Examples

**Query**: `"Farcaster auth provider React TypeScript context"`

**Status**: ⏳ Pending - Reference implementations

**Use Case**:
- Study other Farcaster apps
- Learn from production patterns
- Avoid common pitfalls

---

#### Query 2: OnchainKit Auth Context Patterns

**Query**: `"OnchainKit auth context miniapp wallet integration"`

**Status**: ⏳ Pending - Best practices

**Use Case**:
- Official OnchainKit patterns
- Wallet + miniapp integration
- Type safety patterns

---

## MCP Benefits

### Why Use MCP?

1. **Always Up-to-Date**:
   - MCP serves latest official docs
   - No stale information
   - Catches breaking changes early

2. **Authoritative Source**:
   - Direct from Coinbase, Supabase, etc.
   - Not third-party tutorials
   - Production-tested patterns

3. **Comprehensive Context**:
   - MCP provides full doc context
   - Related topics included
   - Examples and code snippets

4. **Avoid Common Mistakes**:
   - Learn from official recommendations
   - Security best practices
   - Performance optimizations

---

## How to Use MCP in Development

### Step 1: Identify Knowledge Gap

Example: "How should I handle miniapp timeouts?"

### Step 2: Query Relevant MCP Server

```typescript
// Coinbase Developer MCP
mcp_coinbase_SearchCoinbaseDeveloper(
  "miniapp ready event timeout handling"
)
```

### Step 3: Apply Findings

- Read MCP response carefully
- Extract key recommendations
- Apply to codebase
- Document in this file

### Step 4: Verify Implementation

- Test changes
- Check console logs
- Validate against official validators
- Update documentation

---

## MCP Query Template

When adding new MCP queries to this document, use this format:

```markdown
#### Query X: [Clear Description]

**Query**: `"exact query string used"`

**Date**: December X, 2025

**Key Findings**:

1. **Finding 1**:
   - Detail about finding
   - Code example
   - Source link

**Applied Changes**:
\`\`\`typescript
// BEFORE
old code

// AFTER
new code
\`\`\`

**Source**: [Link to official docs]

**Implementation**:
- File 1: What was changed
- File 2: What was changed
- Testing status
```

---

## Phase-Specific MCP Usage

### Phase 1.5 (Auth Consolidation)
- ✅ Coinbase Developer MCP: 3 queries
- ⏳ Supabase MCP: 0 queries (not needed yet)
- ⏳ GitHub MCP: 0 queries (reference only)

**Total Queries**: 3  
**Success Rate**: 100% (all findings applied)

### Future Phases

**Phase 2 (Dashboard Rebuild)**:
- Coinbase MCP: Transaction status patterns
- Coinbase MCP: OnchainKit components
- Supabase MCP: Real-time data patterns

**Phase 3 (Quest Hub)**:
- Coinbase MCP: Smart contract interactions
- Coinbase MCP: Gas estimation
- GitHub MCP: Quest system references

---

## Best Practices

### ✅ DO

- **Query specific topics** - Not generic questions
- **Include context** - Mention frameworks (OnchainKit, Next.js, etc.)
- **Document findings** - Add to this file after each query
- **Apply changes** - Don't just read, implement
- **Verify results** - Test thoroughly

### ❌ DON'T

- **Query too broadly** - "how to build app" won't help
- **Ignore recommendations** - MCP provides best practices for a reason
- **Skip documentation** - Always document MCP usage
- **Assume knowledge** - Even if you "know", check MCP for updates
- **Use outdated patterns** - If MCP says it's changed, update

---

## Related Documentation

- **Auth API**: `docs/api/auth/unified-auth.md`
- **Troubleshooting**: `docs/troubleshooting/auth-issues.md`
- **Architecture**: `docs/architecture/AUTH-CONSOLIDATION-PLAN.md`
- **Phase 1.5 Plan**: `PHASE-1.5-AUTH-CONSOLIDATION.md` (root)

---

**Last Updated**: December 1, 2025 (Phase 1.5 Complete)
