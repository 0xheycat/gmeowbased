# 🚀 Neynar MCP Quick-Start - Action Items

**Date**: January 23, 2026  
**For**: Gmeowbased Development Team  
**Duration**: 5-30 minutes depending on depth

---

## 5-Minute Orientation

### Your Neynar Status Right Now
```
✅ SDK installed (@neynar/nodejs-sdk)
✅ API keys configured (3 fallbacks)
✅ User lookups working (FID, address, username)
✅ Bot account ready (FID 1069798)
✅ Frame integration active
✅ Webhook system configured
```

### The Tool in This Session
**Tool**: `mcp_neynar_SearchNeynar`  
**What it does**: Search Neynar official documentation  
**Use it to**: Find API patterns, auth methods, endpoints  

### Example Questions to Ask
```
"What's the Feed API and how do I use it?"
"How does Sign In with Neynar work?"
"What webhooks can I subscribe to?"
"How do I publish casts from my bot?"
"What are the rate limits and retry strategies?"
```

---

## 10-Minute Deep Dive

### File Tour: Your Neynar Integration

**1. Core Server File** (505 lines)
```
📁 lib/integrations/neynar.ts
├─ getNeynarServerClient() - Singleton SDK instance
├─ fetchUserByFid() - Get profile by FID
├─ fetchUserByAddress() - Get profile by wallet
├─ fetchUsersByAddresses() - Bulk profiles
├─ fetchFidByUsername() - Get FID from @username
└─ fetchCastByIdentifier() - Get cast by hash/URL
```

**2. Client-Safe Wrapper** (51 lines)
```
📁 lib/integrations/neynar-client.ts
├─ For React components (browser-safe)
├─ No SDK - calls /api routes instead
└─ Same functions as server version
```

**3. Bot Operations**
```
📁 lib/integrations/neynar-bot.ts
├─ publishCast() - Post to Farcaster
├─ publishReaction() - Like/recast
└─ Uses NEYNAR_BOT_SIGNER_UUID
```

**4. Wallet Sync**
```
📁 lib/integrations/neynar-wallet-sync.ts
├─ Fetches multi-wallet data from Neynar
└─ Syncs to Supabase user_profiles table
```

**5. Frame Integration**
```
📁 lib/frames/frog-config.ts
├─ Frog framework setup
├─ Neynar middleware
└─ Auto-fills frameData.fid
```

### API Routes (Bridge to Client)
```
GET  /api/farcaster/fid?address=0x...       → { fid }
POST /api/farcaster/bulk                    → { "0x...": user }
GET  /api/user/profile/[fid]                → { user object }
```

### Environment Setup ✅
```env
✅ NEYNAR_API_KEY - Full access
✅ NEYNAR_BOT_SIGNER_UUID - For bot posts
✅ NEYNAR_BOT_FID - Bot account ID (1069798)
✅ NEYNAR_WEBHOOK_SECRET - Event subscriptions
```

---

## 30-Minute Implementation

### Task 1: Add Feed Integration (15 min)

**Goal**: Show user's Farcaster feed in miniapp

**File to Create**: `lib/integrations/neynar-feed.ts`

```typescript
import { getNeynarServerClient } from '@/lib/integrations/neynar'

export async function fetchUserFeed(
  fid: number,
  limit: number = 25,
  cursor?: string
) {
  const client = getNeynarServerClient()
  
  try {
    const feed = await client.fetchFeed({
      feed_type: 'following',
      fid: fid,
      limit: limit,
      cursor: cursor,
    })
    
    return feed
  } catch (error) {
    console.error('[fetchUserFeed] Error:', error)
    return null
  }
}

export async function fetchChannelFeed(
  parentUrl: string,
  limit: number = 25,
  cursor?: string
) {
  const client = getNeynarServerClient()
  
  try {
    const feed = await client.fetchFeed({
      feed_type: 'farcaster',
      parent_url: parentUrl,
      limit: limit,
      cursor: cursor,
    })
    
    return feed
  } catch (error) {
    console.error('[fetchChannelFeed] Error:', error)
    return null
  }
}
```

**API Route**: `app/api/farcaster/feed/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { fetchUserFeed } from '@/lib/integrations/neynar-feed'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fid = searchParams.get('fid')
  const limit = searchParams.get('limit') || '25'
  const cursor = searchParams.get('cursor')
  
  if (!fid) {
    return NextResponse.json(
      { error: 'FID required' },
      { status: 400 }
    )
  }
  
  const feed = await fetchUserFeed(
    Number(fid),
    Number(limit),
    cursor || undefined
  )
  
  if (!feed) {
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    )
  }
  
  return NextResponse.json(feed, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    }
  })
}
```

**Usage in Component**:
```tsx
import { fetchUserFeed } from '@/lib/integrations/neynar-client'

export function UserFeed({ fid }: { fid: number }) {
  const [feed, setFeed] = useState(null)
  const [cursor, setCursor] = useState<string | null>(null)
  
  useEffect(() => {
    fetch(`/api/farcaster/feed?fid=${fid}&limit=25`)
      .then(r => r.json())
      .then(setFeed)
  }, [fid])
  
  return (
    <div>
      {feed?.casts?.map(cast => (
        <div key={cast.hash}>
          {cast.text}
        </div>
      ))}
    </div>
  )
}
```

---

### Task 2: Add Follower Checks (10 min)

**Goal**: Verify user follows an account for quest completion

**File to Add**: `lib/integrations/neynar-graph.ts`

```typescript
import { getNeynarServerClient } from '@/lib/integrations/neynar'

export async function checkUserFollows(
  userFid: number,
  targetFid: number
): Promise<boolean> {
  try {
    const client = getNeynarServerClient()
    
    const followers = await client.fetchFollowers({
      fid: targetFid,
      limit: 1000,
    })
    
    return followers.users.some(u => u.fid === userFid)
  } catch (error) {
    console.error('[checkUserFollows] Error:', error)
    return false
  }
}

export async function getUserFollowers(
  fid: number,
  limit: number = 100
) {
  try {
    const client = getNeynarServerClient()
    
    const followers = await client.fetchFollowers({
      fid: fid,
      limit: limit,
    })
    
    return followers.users
  } catch (error) {
    console.error('[getUserFollowers] Error:', error)
    return []
  }
}

export async function getUserFollowing(
  fid: number,
  limit: number = 100
) {
  try {
    const client = getNeynarServerClient()
    
    const following = await client.fetchFollowing({
      fid: fid,
      limit: limit,
    })
    
    return following.users
  } catch (error) {
    console.error('[getUserFollowing] Error:', error)
    return []
  }
}
```

**Usage in Quest System**:
```typescript
import { checkUserFollows } from '@/lib/integrations/neynar-graph'

// In quest completion check:
const mustFollowFid = 18139 // heycat.eth
const userMustFollow = await checkUserFollows(userFid, mustFollowFid)

if (!userMustFollow) {
  return { ok: false, error: 'Must follow @heycat' }
}
```

---

### Task 3: Enhance Bot Interactions (5 min)

**Goal**: Reply to casts with quest notifications

**Existing File**: `lib/integrations/neynar-bot.ts`

```typescript
// Add to existing neynar-bot.ts:

export async function replyCast(
  signerUuid: string,
  text: string,
  parentHash: string
) {
  const client = getNeynarServerClient()
  
  try {
    const response = await client.publishCast({
      signerUuid: signerUuid,
      text: text,
      reply_to: parentHash,
    })
    
    return response
  } catch (error) {
    console.error('[replyCast] Error:', error)
    return null
  }
}

export async function quotecast(
  signerUuid: string,
  text: string,
  targetHash: string
) {
  const client = getNeynarServerClient()
  
  try {
    const response = await client.publishCast({
      signerUuid: signerUuid,
      text: text,
      quote: targetHash,
    })
    
    return response
  } catch (error) {
    console.error('[quotecast] Error:', error)
    return null
  }
}
```

**Usage Example**:
```typescript
// When user completes quest:
import { replyCast } from '@/lib/integrations/neynar-bot'

await replyCast(
  process.env.NEYNAR_BOT_SIGNER_UUID,
  '@' + username + ' completed quest! 🎉 +100 XP',
  originalCastHash
)
```

---

## Recommended Reading Order

1. **5 min**: This file (orientation)
2. **10 min**: [NEYNAR-MCP-INTEGRATION-GUIDE.md](NEYNAR-MCP-INTEGRATION-GUIDE.md) - Part 1 (current setup)
3. **10 min**: Official docs - https://docs.neynar.com/reference/quickstart
4. **15 min**: [NEYNAR-MCP-INTEGRATION-GUIDE.md](NEYNAR-MCP-INTEGRATION-GUIDE.md) - Part 3-5 (patterns + examples)
5. **30 min**: Deep dive into one specific integration

---

## Common Questions Answered

### Q: Can I call Neynar from React components?
**A**: No directly. Use `/api/farcaster/...` routes instead. Already implemented in `neynar-client.ts`.

### Q: What's the rate limit?
**A**: 500 requests / 5 minutes per API key. Your cache strategy (60-120s) handles most use cases.

### Q: How do I post as the bot?
**A**: Use `neynarBot.publishCast()` with `NEYNAR_BOT_SIGNER_UUID`. Already set up.

### Q: Can I get a user's followers/following?
**A**: Yes! Use Neynar SDK's `fetchFollowers()` and `fetchFollowing()`. See Task 2 above.

### Q: Should I use MCP or official SDK?
**A**: Both! MCP is for research/documentation lookup (this session). Official SDK is for production (your code).

### Q: How do I authenticate in the miniapp?
**A**: Currently: Farcaster Frame auth. Future: Add SIWN (Sign In With Neynar) from official docs.

---

## Checklist: Immediate Actions

- [ ] Review `lib/integrations/neynar.ts` (understand current setup)
- [ ] Check `.env.local` has all 4+ Neynar keys
- [ ] Test API routes locally: `curl http://localhost:3000/api/farcaster/fid?address=0x...`
- [ ] Read official Neynar quickstart: https://docs.neynar.com/reference/quickstart
- [ ] Implement Task 1 or 2 above (if needed for miniapp)
- [ ] Monitor rate limits in production: Check `X-RateLimit-*` headers
- [ ] Document any new Neynar features you add

---

## Success Criteria

✅ You've successfully integrated Neynar MCP when:
- [ ] You can explain what `getNeynarServerClient()` does
- [ ] You understand client vs server usage
- [ ] You know how to call `/api/farcaster/bulk` from React
- [ ] You can publish a cast using the bot account
- [ ] You've read at least 2 sections of the full guide
- [ ] You can answer "What's a FID?" and "What's a verification?"

---

**Status**: Ready for implementation  
**Next Step**: Pick Task 1, 2, or 3 and implement  
**Support**: Use `mcp_neynar_SearchNeynar` tool in this session  

🚀 Let's build awesome Farcaster + Base.dev miniapps!
