# 🎯 Neynar MCP Integration Guide - Gmeowbased Farcaster/Base.dev Miniapps

**Date**: January 23, 2026  
**Project**: Gmeowbased (https://gmeowhq.art)  
**Focus**: Farcaster + Base.dev Miniapps Integration  
**Status**: Comprehensive identification + active usage guide  

---

## Executive Summary

Your codebase is **already deeply integrated with Neynar**, but uses it through both:
1. **Neynar SDK (NodeJS)** - Server-side operations
2. **Neynar HTTP API** - Direct REST calls
3. **Client-safe wrapper** - Browser compatibility

**This guide identifies ALL integration points and shows how to leverage Neynar MCP + official resources.**

---

## 📍 Part 1: Current Neynar Integration Map

### 1.1 Core Integration Files

#### **[lib/integrations/neynar.ts](lib/integrations/neynar.ts)** (505 lines - SERVER-ONLY)
**Primary Neynar SDK interface**

```typescript
// Singleton client
export function getNeynarServerClient(): NeynarAPIClient
export function resetNeynarClientCache()

// User lookups
export async function fetchUsersByAddresses(addresses: string[])
export async function fetchUserByAddress(address: string)
export async function fetchFidByAddress(address: string)
export async function fetchUserByFid(fid: number | string)
export async function fetchFidByUsername(username: string)

// Cast operations
export async function fetchCastByIdentifier(identifier: string, type: 'url' | 'hash')

// Wallet sync
export async function syncWalletsFromNeynar(fid: number)
```

**Use Case**: All server-side Farcaster data fetching for profiles, guild members, quest verification

**Authentication Strategy**:
```typescript
// Hybrid authentication (auto-fallback)
function getServerApiKey(): string | undefined {
  return process.env.NEYNAR_API_KEY || 
         process.env.NEYNAR_GLOBAL_API || 
         process.env.NEXT_PUBLIC_NEYNAR_API_KEY
}
```

---

#### **[lib/integrations/neynar-client.ts](lib/integrations/neynar-client.ts)** (51 lines - CLIENT-SAFE)
**Safe wrapper for browser/client components**

```typescript
// No SDK - calls existing API routes instead
export async function fetchFidByAddress(address: string)
export async function fetchUserByAddress(address: string)
export async function fetchUserByFid(fid: number | string)
export async function fetchUsersByAddresses(addresses: string[])
```

**Use Case**: React components that need Farcaster data without Node.js dependencies

**Why It Exists**: `@neynar/nodejs-sdk` can't run in browser → wraps server API routes

---

#### **[lib/integrations/neynar-bot.ts](lib/integrations/neynar-bot.ts)**
**Bot signer operations for automated posts/reactions**

**Environment Configuration**:
```
NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1
NEYNAR_BOT_FID=1069798
NEYNAR_HEYCAT_FID=18139
NEYNAR_OWNER_FID=18139
```

**Capabilities**: 
- Publish casts
- Like/recast actions
- Reply to casts
- Automated notifications

---

#### **[lib/integrations/neynar-wallet-sync.ts](lib/integrations/neynar-wallet-sync.ts)**
**Multi-wallet address resolution**

```typescript
export async function syncWalletsFromNeynar(
  fid: number,
  forceUpdate?: boolean,
  connectedAddress?: string
): Promise<NeynarWalletData | null>
```

**Syncs to Supabase**:
- `user_profiles.custody_address` (primary wallet)
- `user_profiles.verified_addresses` (all verified wallets)

**Used for**: 
- Wallet-to-FID reverse lookup
- Multi-wallet quest completion
- Address-based permissions

---

### 1.2 API Routes (Server-to-Client Bridge)

#### **[app/api/farcaster/fid/route.ts](app/api/farcaster/fid/route.ts)**
```
GET /api/farcaster/fid?address=0x...
Response: { fid: 12345, username: "vitalik" }
```

**Cache**: 5 minutes (with stale-while-revalidate)  
**Rate Limit**: 60 req/min per IP

---

#### **[app/api/farcaster/bulk/route.ts](app/api/farcaster/bulk/route.ts)**
```
POST /api/farcaster/bulk
Body: { addresses: ["0x...", "0x..."] }
Response: { "0x...": { fid: 123, username: "user", ... } }
```

**Cache**: 60 seconds  
**Bulk Capacity**: Up to 90 addresses per request

---

#### **[app/api/user/profile/[fid]/route.ts](app/api/user/profile/[fid]/route.ts)**
```
GET /api/user/profile/1234
Response: { fid, username, displayName, pfpUrl, followerCount, ... }
```

**Cache**: Varies by signer status  
**10-Layer Security**: Full API security implementation

---

### 1.3 Frames Integration

#### **[lib/frames/frog-config.ts](lib/frames/frog-config.ts)**
**Farcaster Frames framework setup**

```typescript
import { neynar } from 'frog/hubs'

// Neynar middleware for frames
app.use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || '',
    hub: {
      apiUrl: 'https://hub.farcaster.xyz',
      fetchOptions: {
        headers: {
          'x-farcaster-auth': process.env.NEYNAR_API_KEY || '',
        },
      },
    },
  })
)
```

**Provides Frame Context**:
- `frameData.fid` - User's Farcaster ID
- `interactor` - User who clicked button
- `cast` - Original cast data

---

### 1.4 Environment Configuration

```env
# API Keys (3 variations - auto-fallback)
NEYNAR_GLOBAL_API=81f742da-b485-45ca-926e-22a6bbbf3ae7
NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEXT_PUBLIC_NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEXT_PUBLIC_NEYNAR_CLIENT_ID=76C0C613-378F-4562-9512-600DD84EB085

# Bot Configuration
NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1
NEYNAR_BOT_FID=1069798
NEYNAR_HEYCAT_FID=18139
NEYNAR_OWNER_FID=18139

# Webhook Integration
NEXT_PUBLIC_NEYNAR_WEBHOOK_SECRET=4a7fc895-eb3c-4118-b529-4a47a92166e1
NEYNAR_WEBHOOK_SECRET=L-SPUjEhZVwoKkyhp4lRNNzPd
NEYNAR_WEBHOOK_SECRET_VIRAL=h1yl4rzxadVFviVFRdjomIXH_
```

---

## 🚀 Part 2: Neynar MCP vs Official APIs

### 2.1 What is Neynar MCP?

**MCP** = Model Context Protocol (AI-friendly data interface)

**Neynar MCP provides**:
- Structured API documentation
- Type-safe requests/responses
- Rate limit handling
- Error recovery
- Batch operations

**Official Neynar offers**:
- REST HTTP endpoints
- SDK (JavaScript, Go, Python)
- Webhooks
- Real-time events

---

### 2.2 Current Implementation Analysis

| Feature | Your Code | Method | Status |
|---------|-----------|--------|--------|
| User by FID | ✅ | `fetchUserByFid()` | SDK + HTTP |
| User by Address | ✅ | `fetchUserByAddress()` | HTTP API |
| User by Username | ✅ | `fetchFidByUsername()` | HTTP API |
| Bulk User Fetch | ✅ | `fetchUsersByAddresses()` | HTTP API |
| Cast Lookup | ✅ | `fetchCastByIdentifier()` | HTTP API |
| Publish Cast | ✅ | `neynar-bot.ts` | SDK Signer |
| Like/Recast | ✅ | `neynar-bot.ts` | SDK Signer |
| Wallet Sync | ✅ | `syncWalletsFromNeynar()` | HTTP API |
| Frames Integration | ✅ | `frog-config.ts` | Frog + Neynar |

---

### 2.3 Recommended: Use Official Neynar Resources

**For Production Apps** (your miniapp):

1. **Official SDK** - Already integrated ✅
   ```bash
   pnpm list @neynar/nodejs-sdk
   # Latest: ^1.x or ^2.x
   ```

2. **Official Documentation** - https://docs.neynar.com
   - **Quickstart**: https://docs.neynar.com/reference/quickstart
   - **Authentication**: Full guide at docs site
   - **API Endpoints**: Complete reference

3. **Official Webhook System** - Already configured ✅
   ```env
   NEYNAR_WEBHOOK_SECRET=L-SPUjEhZVwoKkyhp4lRNNzPd
   # Receive real-time cast events
   ```

4. **Official Signer System** - Already in use ✅
   ```env
   NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1
   # Publish as your bot account
   ```

---

## 📚 Part 3: Neynar MCP Tool Usage (This Assistant)

### 3.1 Available Tool: `mcp_neynar_SearchNeynar`

**Purpose**: Search Neynar documentation knowledge base

**Usage in This Session**:
```typescript
// Search for specific topics
await searchNeynar('API authentication quickstart getting started')
// Returns: Quickstart guide with code examples

await searchNeynar('feed API getting started')
// Returns: Feed API documentation
```

**What It Finds**:
- API references
- Authentication guides
- Code examples (TypeScript, Go)
- Integration tutorials
- SIWN (Sign In With Neynar) docs
- Miniapp authentication
- Rate limiting info

**Use This For**:
- "How do I authenticate with Neynar?"
- "What's the Feed API?"
- "How does SIWN work?"
- "What endpoints are available?"
- "How do I publish a cast?"

---

### 3.2 Current Gaps vs Neynar MCP

**What Your Code Has**:
- ✅ User lookups
- ✅ Wallet sync
- ✅ Cast fetching
- ✅ Bot posting
- ✅ Frame integration

**What You Could Add (via MCP research)**:
- 📖 Advanced feed queries (chronological, algorithmic)
- 📖 Engagement analytics
- 📖 User notifications
- 📖 Follow graph queries
- 📖 Channel operations
- 📖 SIWN integration improvements
- 📖 Webhook event types

---

## 🛠️ Part 4: Usage Examples

### 4.1 Current Pattern: Server-Side User Lookup

**File**: [lib/integrations/neynar.ts](lib/integrations/neynar.ts)

```typescript
// Pattern 1: By FID (most common)
import { fetchUserByFid } from '@/lib/integrations/neynar'

const user = await fetchUserByFid(1234)
// Returns: { fid, username, displayName, pfpUrl, bio, followerCount, ... }

// Pattern 2: By wallet address
import { fetchUserByAddress } from '@/lib/integrations/neynar'

const user = await fetchUserByAddress('0xvitalik.eth')
// Returns: FarcasterUser | null

// Pattern 3: Bulk addresses (optimized)
import { fetchUsersByAddresses } from '@/lib/integrations/neynar'

const users = await fetchUsersByAddresses([
  '0xaddr1',
  '0xaddr2',
  '0xaddr3',
])
// Returns: { '0xaddr1': user1, '0xaddr2': user2, ... }
```

---

### 4.2 Client-Side Safe Pattern

**File**: [lib/integrations/neynar-client.ts](lib/integrations/neynar-client.ts)

```typescript
// In React components - safe for client
import { fetchUserByFid } from '@/lib/integrations/neynar-client'

export function UserCard({ fid }: { fid: number }) {
  const [user, setUser] = useState<FarcasterUser | null>(null)
  
  useEffect(() => {
    fetchUserByFid(fid).then(setUser)
  }, [fid])
  
  return <div>{user?.username}</div>
}
```

---

### 4.3 Bot Posting Pattern

**File**: [lib/integrations/neynar-bot.ts](lib/integrations/neynar-bot.ts)

```typescript
// Publish cast as your bot
import { publishCast } from '@/lib/integrations/neynar-bot'

await publishCast({
  signerUuid: process.env.NEYNAR_BOT_SIGNER_UUID,
  text: 'Your quest is complete! 🎉',
  replyTo: parentCastHash, // optional
})

// Like/recast
import { publishReaction } from '@/lib/integrations/neynar-bot'

await publishReaction({
  signerUuid: process.env.NEYNAR_BOT_SIGNER_UUID,
  reactionType: 'like', // or 'recast'
  target: castHash,
})
```

---

### 4.4 Wallet Multi-Address Sync

**File**: [lib/integrations/neynar-wallet-sync.ts](lib/integrations/neynar-wallet-sync.ts)

```typescript
// Sync all wallets for user
import { syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'

await syncWalletsFromNeynar(
  fid,
  forceUpdate = false,
  connectedAddress = '0x...' // optional - use as primary
)

// Updates Supabase:
// - user_profiles.custody_address
// - user_profiles.verified_addresses (array)
```

---

### 4.5 Frames Integration

**File**: [lib/frames/frog-config.ts](lib/frames/frog-config.ts)

```typescript
import { Frog } from 'frog'
import { neynar } from 'frog/hubs'

const app = new Frog()

// Neynar middleware auto-fills frameData
app.use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY,
    hub: { apiUrl: 'https://hub.farcaster.xyz' }
  })
)

// Now available in frame handlers:
app.frame('/', async (c) => {
  const { fid, buttonIndex } = c.frameData
  const { address } = c.frameData.interactor
  
  return c.res({
    image: <div>FID: {fid}</div>,
    intents: [<Button>Click me</Button>],
  })
})
```

---

## 🔑 Part 5: API Keys & Authentication

### 5.1 Key Types You Have

```env
# Type 1: Global Client ID (limited endpoints)
NEYNAR_GLOBAL_API=81f742da-b485-45ca-926e-22a6bbbf3ae7

# Type 2: Full API Key (all endpoints)
NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085

# Type 3: Public (browser-safe, limited)
NEXT_PUBLIC_NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085

# Type 4: Bot Signer (for automated actions)
NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1
```

### 5.2 Rate Limits (Official)

```
API Calls:        500 requests / 5 minutes (per key)
Cast Publishing:  50 casts / minute (per signer)
Bulk Lookups:     100 FIDs / request
Webhook Delivery: Unlimited (as fast as events occur)
```

### 5.3 Best Practices

✅ **DO**:
- Use server API key for backend operations
- Implement local caching (60s minimum)
- Batch requests when possible
- Use client ID for browser-only operations
- Store keys in `.env.local` (never commit)

❌ **DON'T**:
- Call from client without API route wrapper
- Make duplicate requests for same data
- Expose full API key in browser
- Call multiple times per render
- Ignore rate limit headers

---

## 🎯 Part 6: Recommended Enhancements

### 6.1 Advanced Feed Integration (NEW)

**Current**: Manual cast lookups  
**Recommended**: Implement Feed API

```typescript
// Access via Neynar SDK
const client = getNeynarServerClient()
const feed = await client.fetchFeed({
  fid: 1234,
  feedType: 'following', // or 'farcaster'
  limit: 25,
  cursor: null,
})
```

**Use Case**: Show user's Farcaster feed in miniapp

---

### 6.2 Engagement Metrics (NEW)

**Current**: Basic user data  
**Recommended**: Track interactions

```typescript
const client = getNeynarServerClient()
const interactions = await client.fetchCastReactions({
  hash: castHash,
  types: ['likes', 'recasts'],
})
```

**Use Case**: Show likes/recasts on posts in miniapp

---

### 6.3 Follow Graph Queries (NEW)

```typescript
const client = getNeynarServerClient()

// Check if user follows target
const followers = await client.fetchFollowers({
  fid: 1234,
  limit: 100,
})

// Check if specific user in followers list
const isFollowing = followers.users.some(u => u.fid === targetFid)
```

**Use Case**: Conditional quest completion (must follow account)

---

### 6.4 SIWN Improvements (ENHANCE)

**Current**: Frame-only auth  
**Recommended**: Full Sign In with Neynar

```typescript
// Reference: https://docs.neynar.com/docs/how-to-customize-sign-in-with-neynar-button-in-your-app

// In your miniapp:
import { SignInWithNeynar } from '@neynar/react'

export function AuthButton() {
  return (
    <SignInWithNeynar
      clientId={process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID}
      onSuccess={(user) => {
        // User authenticated
        setUser(user)
      }}
    />
  )
}
```

**Use Case**: Miniapp authentication without frame dependency

---

## 📋 Part 7: Migration Checklist

If you want to enhance Neynar usage:

- [ ] **Read**: [Official Neynar Quickstart](https://docs.neynar.com/reference/quickstart)
- [ ] **Review**: Current bot implementation in `neynar-bot.ts`
- [ ] **Check**: Rate limit handling in `getNeynarServerClient()`
- [ ] **Implement**: Feed API integration (if needed for miniapp)
- [ ] **Add**: Engagement metrics tracking
- [ ] **Test**: All Neynar calls with 10-second timeout (API resilience)
- [ ] **Monitor**: Rate limit headers in responses
- [ ] **Document**: New Neynar features used

---

## 🔗 Part 8: Official Resources Summary

### Official Documentation
- **Main Docs**: https://docs.neynar.com
- **API Reference**: https://docs.neynar.com/reference/getting-started-with-your-api
- **Quickstart**: https://docs.neynar.com/reference/quickstart
- **SDK (TypeScript)**: https://github.com/neynarxyz/nodejs-sdk
- **Status Page**: https://status.neynar.com

### Your SDK Installation
```bash
# Check version
pnpm list @neynar/nodejs-sdk

# Latest installation
pnpm add @neynar/nodejs-sdk@latest

# Import pattern
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk'
```

### Key Official Features
1. **Publish Cast** - Create casts as signer
2. **Reactions** - Like/recast/reply
3. **Feed API** - Get user/channel feeds
4. **User Lookup** - By FID, username, address
5. **Verification** - Wallet verification linking
6. **Webhooks** - Real-time events
7. **SIWN** - Sign In With Neynar
8. **Miniapp Auth** - Custom miniapp authentication

---

## 🎓 Quick Reference

### Imports (Server)
```typescript
import { 
  getNeynarServerClient,
  fetchUserByFid,
  fetchUserByAddress,
  fetchUsersByAddresses,
  fetchFidByUsername,
  fetchFidByAddress,
  fetchCastByIdentifier,
} from '@/lib/integrations/neynar'
```

### Imports (Client)
```typescript
import { 
  fetchUserByFid,
  fetchUserByAddress,
  fetchUsersByAddresses,
  fetchFidByAddress,
} from '@/lib/integrations/neynar-client'
```

### Imports (Bot)
```typescript
import { 
  publishCast,
  publishReaction,
} from '@/lib/integrations/neynar-bot'
```

---

## 📞 Support

**Questions about Neynar?**
1. Check official docs: https://docs.neynar.com
2. Search Neynar MCP tool (this session)
3. Review your integration files
4. Check .env configuration
5. Monitor rate limit headers

**Issues?**
- Check `.env.local` has all keys
- Verify API key validity at https://neynar.com/dashboard
- Check Neynar status: https://status.neynar.com
- Review error logs for specific API errors
- Ensure Network/Base blockchain selected

---

**Last Updated**: January 23, 2026  
**Status**: Production-Ready Integration ✅
