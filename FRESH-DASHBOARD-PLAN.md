# 🎯 FRESH Dashboard Plan - 100% Automated with Neynar

**Created**: December 1, 2025  
**Last Updated**: December 2, 2025  
**Status**: ✅ READY TO IMPLEMENT  
**Research**: 2.5h (8 APIs + 2 MCPs explored)  
**Priority**: 🔥🔥🔥 CRITICAL

---

## 🚫 What We're NOT Building

❌ **OLD Dashboard Structure** (REJECTED):
- ❌ GM button / streak system (belongs in /gm page)
- ❌ Points/XP display (belongs in profile)
- ❌ Quest progress (belongs in /Quest page)
- ❌ Old foundation patterns (no reuse)
- ❌ Emojis in UI (user explicitly rejected)
- ❌ Confetti animations (user explicitly rejected)
- ❌ Multichain UI (Base only)

❌ **NFT Gallery** (DEFERRED):
- Reason: NO automated trending NFT API available for Base chain
- Research: Explored 8 APIs + 2 MCPs (Neynar, Coinbase)
- Neynar MCP: Has mint/minting APIs (for rewards), NO trending discovery
- Coinbase MCP: Has wallet NFT actions (get_nfts_by_account), NOT for trending
- All other APIs: Require manual collection curation
- **Decision**: Skip NFT gallery for launch, add when automated API becomes available

**User Feedback**: "we need fully automating, no manual addresses each token/NFTs"

---

## ✅ What We're Building (5 Automated Sections)

All sections powered by **Neynar API** (100% automated, NO manual curation):

### 1. Trending Tokens (24h) ✅ TESTED
- **API**: Neynar Trending Fungibles
- **Endpoint**: `GET /v2/farcaster/fungible/trending?network=base&time_window=24h&limit=10`
- **Data**: Token address, name, symbol, decimals, **real-time USD price**, total supply
- **Test Result**: TAPS ($0.0000002), DINO ($0.0009906), Zynk ($0.178), SENT, SKITTEN...
- **Template**: `trezoadmin-41/.../GainersLosers.tsx` (professional table)
- **UI**: Name/symbol, current price, 24h change (green/red), loading skeleton

### 2. Top Casters (7d)
- **API**: Neynar Users API
- **Endpoint**: `GET /v2/farcaster/user/power?limit=12`
- **Data**: Username, avatar, follower count, FID
- **UI**: 3-column grid (mobile: 1 column), avatar + username + follower count

### 3. Trending Channels (24h)
- **API**: Neynar Channels API
- **Endpoint**: `GET /v2/farcaster/channel/trending?time_window=24h&limit=12`
- **Data**: Channel ID, name, image URL, member count, description
- **UI**: 3-column grid (mobile: 1 column), icon + name + member count + join button

### 4. Featured Frames
- **API**: Existing frame system (uses Supabase `frames` table)
- **Endpoint**: `/api/frames/featured`
- **Data**: Frame title, image, creator, interaction count
- **UI**: Swiper carousel (4 desktop, 2 tablet, 1 mobile), autoplay 5s

### 5. Activity Feed (Global)
- **API**: Neynar Feed API
- **Endpoint**: `GET /v2/farcaster/feed?feed_type=filter&filter_type=global_trending&limit=10`
- **Data**: Cast text, author, timestamp, replies, likes, recasts, embeds
- **UI**: Vertical feed (Twitter-like), cast cards with engagement stats

---

## 📐 Dashboard Layout (Professional Design)

### Hero Banner + 5 Automated Sections

```
┌─────────────────────────────────────────────┐
│  GMEOW Dashboard                    [Base]  │
├─────────────────────────────────────────────┤
│                                             │
│  🎨 HERO BANNER (Gradient Background)      │
│  ┌──────────────────────────────────────┐  │
│  │  Discover Trending on Base           │  │
│  │  Real-time tokens, top casters,      │  │
│  │  trending channels & more            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  💰 TRENDING TOKENS 24H (Base)             │
│  ┌──────────────────────────────────────┐  │
│  │ Name        Price      Change  Vol   │  │
│  │ TAPS       $0.0000002  +47.4%  $2.1M │  │
│  │ DINO       $0.0009906  +23.9%  $1.5M │  │
│  │ Zynk       $0.178000   -22.9%  $890K │  │
│  │ SENT       $0.003200   +21.4%  $650K │  │
│  │ SKITTEN    $0.007100   -0.8%   $420K │  │
│  └──────────────────────────────────────┘  │
│  Source: Neynar Trending Fungibles ✅      │
│                                             │
│  👤 TOP CASTERS (7d Power Users)           │
│  ┌─────────┬─────────┬─────────┐          │
│  │ [Avatar]│ [Avatar]│ [Avatar]│          │
│  │ @dwr    │ @v      │ @jesse  │          │
│  │ 45.3K   │ 32.1K   │ 28.7K   │          │
│  └─────────┴─────────┴─────────┘          │
│  Source: Neynar Users API ✅               │
│                                             │
│  # TRENDING CHANNELS (24h)                 │
│  ┌─────────┬─────────┬─────────┐          │
│  │ [Icon]  │ [Icon]  │ [Icon]  │          │
│  │ /base   │ /degen  │ /higher │          │
│  │ 12.5K   │ 8.9K    │ 6.7K    │          │
│  └─────────┴─────────┴─────────┘          │
│  Source: Neynar Channels API ✅            │
│                                             │
│  🖼️ FEATURED FRAMES (Carousel)             │
│  ← [Frame] [Frame] [Frame] [Frame] →       │
│  Source: Existing Frame System ✅          │
│                                             │
│  📰 ACTIVITY FEED (Global Trending)        │
│  ┌──────────────────────────────────────┐  │
│  │ [@username] • 2h ago                 │  │
│  │ Cast content with embeds...          │  │
│  │ 💬 12  ❤️ 45  🔄 8                  │  │
│  ├──────────────────────────────────────┤  │
│  │ [@username] • 4h ago                 │  │
│  │ Cast content...                      │  │
│  └──────────────────────────────────────┘  │
│  Source: Neynar Feed API ✅                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎨 Component Architecture

### 1. Hero Banner (Top)

**Template**: `trezoadmin-41/nft/marketplace/page.tsx` gradient card  
**Purpose**: Welcome message + CTA buttons

```tsx
<div className="pixel-card relative overflow-hidden mb-6" style={{
  background: "linear-gradient(92deg, #23272E 7.31%, #3F5272 97.89%)"
}}>
  <div className="p-6 md:p-8 lg:flex justify-between items-center">
    <div>
      <h3 className="text-white text-2xl mb-2">
        Discover & Collect NFTs on Base

### 1. Hero Banner Component

**Template**: Trezoadmin gradient card pattern (NO emojis)  
**Purpose**: Welcome message + context

```tsx
// app/Dashboard/components/DashboardHero.tsx
export function DashboardHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 mb-6">
      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-white mb-2">
          Discover Trending on Base
        </h1>
        <p className="text-blue-100 text-lg">
          Real-time tokens, top casters, trending channels & more
        </p>
      </div>
      <div className="absolute inset-0 bg-grid-white/10" />
    </div>
  )
}
```

**Professional SVG Icons** (NO emojis ❌):
- Trending: `<TrendingUp className="w-5 h-5" />`
- Users: `<Users className="w-5 h-5" />`
- Hash: `<Hash className="w-5 h-5" />`
- Activity: `<Activity className="w-5 h-5" />`

---

### 2. Trending Tokens Component ✅ TESTED

**Template**: `trezoadmin-41/.../GainersLosers.tsx` (professional table)  
**Data Source**: Neynar Trending Fungibles API  
**Purpose**: Display top tokens by 24h trading volume

```tsx
// app/Dashboard/components/TrendingTokens.tsx
import { getTrendingTokens } from '@/lib/api/neynar-dashboard'

export async function TrendingTokens() {
  const tokens = await getTrendingTokens()
  
  return (
    <div className="pixel-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="pixel-section-title flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trending Tokens (24h)
        </h3>
        <span className="text-xs text-gray-500">Base Chain</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-xs text-gray-500 border-b">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-center py-2">Price</th>
              <th className="text-center py-2">24h Change</th>
              <th className="text-right py-2">Volume</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.address} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <div className="font-semibold">{token.name}</div>
                  <div className="text-xs text-gray-500">{token.symbol}</div>
                </td>
                <td className="text-center">
                  ${token.price.toFixed(token.price < 1 ? 6 : 2)}
                </td>
                <td className={cn(
                  "text-center font-semibold",
                  token.change24h >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                </td>
                <td className="text-right">
                  ${formatVolume(token.volume24h)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Data Structure**:
```typescript
interface Token {
  address: string
  name: string
  symbol: string
  decimals: number
  price: number // USD
  totalSupply: string
  change24h: number // percentage
  volume24h: number // USD
}
```

---

### 3. Top Casters Component

**Data Source**: Neynar Users API  
**Purpose**: Display top power users (7d)

```tsx
// app/Dashboard/components/TopCasters.tsx
import { getTopCasters } from '@/lib/api/neynar-dashboard'

export async function TopCasters() {
  const casters = await getTopCasters()
  
  return (
    <div className="pixel-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="pixel-section-title flex items-center gap-2">
          <Users className="w-5 h-5" />
          Top Casters (7d)
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {casters.map((caster) => (
          <div key={caster.fid} className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary-500 transition-colors">
            <Image
              src={caster.avatar}
              alt={caster.username}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div className="flex-1">
              <div className="font-semibold">{caster.username}</div>
              <div className="text-xs text-gray-500">
                {formatNumber(caster.followerCount)} followers
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 4. Trending Channels Component

**Data Source**: Neynar Channels API  
**Purpose**: Display trending channels (24h)

```tsx
// app/Dashboard/components/TrendingChannels.tsx
import { getTrendingChannels } from '@/lib/api/neynar-dashboard'

export async function TrendingChannels() {
  const channels = await getTrendingChannels()
  
  return (
    <div className="pixel-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="pixel-section-title flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Trending Channels (24h)
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary-500 transition-colors">
            <Image
              src={channel.image}
              alt={channel.name}
              width={48}
              height={48}
              className="rounded"
            />
            <div className="flex-1">
              <div className="font-semibold">/{channel.id}</div>
              <div className="text-xs text-gray-500">
                {formatNumber(channel.memberCount)} members
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 5. Featured Frames Component

**Data Source**: Existing frame system (Supabase `frames` table)  
**Purpose**: Display featured frames carousel

```tsx
// app/Dashboard/components/FeaturedFrames.tsx
import { getFeaturedFrames } from '@/lib/api/neynar-dashboard'
import { Swiper, SwiperSlide } from 'swiper/react'

export async function FeaturedFrames() {
  const frames = await getFeaturedFrames()
  
  return (
    <div className="pixel-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="pixel-section-title">Featured Frames</h3>
      </div>
      
      <Swiper
        spaceBetween={15}
        slidesPerView={1}
        autoplay={{ delay: 5000 }}
        breakpoints={{
          640: { slidesPerView: 2 },
          992: { slidesPerView: 3 },
          1400: { slidesPerView: 4 },
        }}
      >
        {frames.map((frame) => (
          <SwiperSlide key={frame.id}>
            <div className="frame-card group cursor-pointer">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                <Image 
                  src={frame.image} 
                  alt={frame.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform"
                />
              </div>
              <h4 className="font-semibold text-sm mb-1">{frame.title}</h4>
              <div className="text-xs text-gray-500">
                By {frame.creator}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
```

---

### 6. Activity Feed Component

**Data Source**: Neynar Feed API  
**Purpose**: Display global trending casts

```tsx
// app/Dashboard/components/ActivityFeed.tsx
import { getActivityFeed } from '@/lib/api/neynar-dashboard'

export async function ActivityFeed() {
  const casts = await getActivityFeed()
  
  return (
    <div className="pixel-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="pixel-section-title flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </h3>
      </div>
      
      <div className="space-y-4">
        {casts.map((cast) => (
          <div key={cast.hash} className="border-b pb-4 last:border-0">
            <div className="flex items-start gap-3">
              <Image
                src={cast.author.avatar}
                alt={cast.author.username}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{cast.author.username}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(cast.timestamp)}
                  </span>
                </div>
                <p className="text-sm mb-2">{cast.text}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>💬 {cast.replies}</span>
                  <span>❤️ {cast.likes}</span>
                  <span>🔄 {cast.recasts}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📁 File Structure

```
app/
  Dashboard/
    page.tsx              ← Main dashboard page
    components/
      DashboardHero.tsx   ← Hero banner
      TrendingTokens.tsx  ← Token table ✅ TESTED
      TopCasters.tsx      ← Caster grid
      TrendingChannels.tsx ← Channel grid
      FeaturedFrames.tsx  ← Frame carousel
      ActivityFeed.tsx    ← Cast feed

lib/
  api/
    neynar-dashboard.ts   ← 5 API functions
  types/
    dashboard.ts          ← TypeScript interfaces

components/
  ui/
    skeleton.tsx          ← Loading states
```

---

## 🚀 Implementation Plan

### Phase 1: API Layer (1.5h)
1. Create `lib/api/neynar-dashboard.ts`
2. Implement 5 functions:
   - `getTrendingTokens()` ✅ TESTED
   - `getTopCasters()`
   - `getTrendingChannels()`
   - `getActivityFeed()`
   - `getFeaturedFrames()`
3. Add TypeScript interfaces (`lib/types/dashboard.ts`)
4. Add error handling + caching (5 min TTL)

### Phase 2: Component Library (2h)
1. DashboardHero.tsx (gradient banner)
2. TrendingTokens.tsx (GainersLosers pattern)
3. TopCasters.tsx (3-column grid)
4. TrendingChannels.tsx (3-column grid)
5. FeaturedFrames.tsx (Swiper carousel)
6. ActivityFeed.tsx (cast cards)

### Phase 3: Dashboard Page (1.5h)
1. Create `app/Dashboard/page.tsx`
2. Fetch data from API functions
3. Render 6 sections (hero + 5 data sections)
4. Add loading skeletons

### Phase 4: Testing (1h)
1. Test all 5 Neynar API calls
2. Verify data displays correctly
3. Test mobile responsive (375px)
4. Verify NO emojis, NO confetti
5. Check error states

### Phase 5: Documentation (30 min)
1. Update FOUNDATION-REBUILD-ROADMAP.md (Phase 2: 15% → 100%)
2. Update CURRENT-TASK.md (mark complete)
3. Update API-TESTING-RESULTS.md (final status)

**Total Estimate**: 6.5h

---

## ✅ Quality Checklist

Before marking Phase 2 complete:
- [ ] All 5 Neynar API endpoints return real data
- [ ] Trending tokens display with correct USD prices
- [ ] Mobile responsive works at 375px width
- [ ] NO emojis in any component
- [ ] NO multichain UI (Base only)
- [ ] NO confetti animations
- [ ] Professional trezoadmin design maintained
- [ ] Loading states work correctly
- [ ] Error handling graceful (fallback UI)
- [ ] TypeScript types complete

---

## 📝 Why NFT Gallery Skipped

**Explored 8 APIs + 2 MCPs** (2.5h research):

1. ❌ **Neynar MCP**: Has `post-nft-mint` (minting rewards), `fetchRelevantMints` (track known contracts), NO `/mint/trending` or `/nft/trending` endpoints
2. ❌ **Coinbase MCP**: Has `get_nfts_by_account` (wallet NFTs), `list_nft` (marketplace actions), NOT for trending discovery
3. ❌ **6 Other NFT APIs**: All require manual collection curation or don't support Base trending

**Conclusion**: No automated trending NFT API available for Base chain. NFT gallery deferred to future phase when automated source becomes available.

---

## 🎯 Success Metrics

**Phase 2 Complete When**:
1. ✅ Dashboard page live at `/Dashboard`
2. ✅ All 5 sections loading real Neynar data
3. ✅ Mobile responsive (375px tested)
4. ✅ Professional design (NO emojis/confetti)
5. ✅ Documentation updated (roadmap + task status)

**User Satisfaction**:
- 100% automated (no manual token/NFT addresses) ✅
- Real-time data from Farcaster ecosystem ✅
- Professional trezoadmin aesthetic ✅
- Single API integration (Neynar) ✅
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => (
          <tr key={token.symbol} className="border-b last:border-b-0 group">
            <td className="py-3">
              <div className="flex items-center gap-2">
                <Image 
                  src={token.logo} 
                  alt={token.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="font-medium">{token.name}</span>
                <span className="text-xs text-gray-500">{token.symbol}</span>
              </div>
            </td>
            <td className="text-center text-gray-600">
              ${token.price}
            </td>
            <td className={`text-center font-semibold ${
              token.change24h >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {token.change24h >= 0 ? '+' : ''}{token.change24h}%
            </td>
            <td className="text-right text-gray-600">
              ${token.volume24h}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  <Link 
    href="/tokens" 
    className="text-sm text-primary-500 mt-4 inline-block"
  >
    View All Tokens →
  </Link>
</div>
```

**Data Structure**:
```typescript
interface Token {
  symbol: string // 'DEGEN', 'HIGHER', etc
  name: string // 'Degen', 'Higher'
  logo: string // token logo URL
  price: string // '$0.015'
  change24h: number // 47.44 (percentage)
  volume24h: string // '$2.1M'
  chain: 'base' // Base only
}
```

**API Integration** (lib/api/defillama-tokens.ts):
```typescript
// Use DefiLlama Coins API - FREE, NO KEY NEEDED! 🎉
interface Token {
  symbol: string
  name: string
  logo: string
  price: string
  change24h: number
  volume24h: string
  chain: string
}

// Curated top Base ecosystem tokens
const BASE_TOKENS = [
  { address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', symbol: 'DEGEN', name: 'Degen' },
  { address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', symbol: 'HIGHER', name: 'Higher' },
  { address: '0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4', symbol: 'TOSHI', name: 'Toshi' },
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin' },
  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai' },
  { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', symbol: 'USDbC', name: 'USD Base Coin' },
  { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', name: 'Aerodrome' },
]

export async function getTopBaseTokens(): Promise<Token[]> {
  try {
    // Batch fetch all token prices in single request
    const priceKeys = BASE_TOKENS.map(t => `base:${t.address}`).join(',')
    const response = await fetch(
      `https://coins.llama.fi/prices/current/${priceKeys}`
    )
    const data = await response.json()

    // Map to Token interface
    return BASE_TOKENS.map(token => {
      const coinData = data.coins[`base:${token.address}`]
      return {
        symbol: token.symbol,
        name: token.name,
        logo: '', // TODO: Add token logos (can use Uniswap token list)
        price: coinData?.price ? `$${coinData.price.toFixed(6)}` : '$0',
        change24h: 0, // TODO: Calculate from historical data or display N/A
        volume24h: 'N/A', // DefiLlama doesn't provide per-token volume
        chain: 'base',
      }
    })
  } catch (error) {
    console.error('Failed to fetch token prices:', error)
    return []
  }
}

// Optional: Get historical price for 24h change calculation
export async function getHistoricalPrice(
  tokenAddress: string,
  timestamp: number
): Promise<number> {
  const response = await fetch(
    `https://coins.llama.fi/prices/historical/${timestamp}/base:${tokenAddress}`
  )
  const data = await response.json()
  return data.coins[`base:${tokenAddress}`]?.price || 0
}
```

**Optional Enhancement** (24h change calculation):
```typescript
// Calculate 24h price change using historical API
export async function getTopBaseTokensWithChange(): Promise<Token[]> {
  const tokens = await getTopBaseTokens()
  const yesterday = Math.floor(Date.now() / 1000) - 86400 // 24h ago

  const historicalPrices = await Promise.all(
    BASE_TOKENS.map(t => getHistoricalPrice(t.address, yesterday))
  )

  return tokens.map((token, i) => {
    const currentPrice = parseFloat(token.price.replace('$', ''))
    const oldPrice = historicalPrices[i]
    const change = oldPrice > 0 
      ? ((currentPrice - oldPrice) / oldPrice) * 100 
      : 0

    return {
      ...token,
      change24h: parseFloat(change.toFixed(2)),
    }
  })
}
```

---

### 4. Viral Features Section (Social Engagement)

**Purpose**: Farcaster-specific viral mechanics  
**Layout**: 3-column grid (desktop), 1-column (mobile)

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  {/* Top Casters */}
  <div className="pixel-card">
    <h3 className="pixel-section-title mb-4">Top Casters</h3>
    <div className="space-y-3">
      {topCasters.map((caster) => (
        <div key={caster.fid} className="flex items-center gap-3">
          <Image 
            src={caster.pfp} 
            alt={caster.username}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div className="flex-1">
            <div className="font-medium text-sm">@{caster.username}</div>
            <div className="text-xs text-gray-500">
              {caster.engagement24h} interactions
            </div>
          </div>
        </div>
      ))}
    </div>
    <Link href="/leaderboard" className="text-sm text-primary-500 mt-4 inline-block">
      View All →
    </Link>
  </div>
  
  {/* Trending Channels */}
  <div className="pixel-card">
    <h3 className="pixel-section-title mb-4">Trending Channels</h3>
    <div className="space-y-3">
      {trendingChannels.map((channel) => (
        <div key={channel.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">/{channel.name}</span>
          </div>
          <span className="text-xs text-gray-500">
            {channel.casts24h} casts
          </span>
        </div>
      ))}
    </div>
    <Link href="/channels" className="text-sm text-primary-500 mt-4 inline-block">
      Explore →
    </Link>
  </div>
  
  {/* Frame Gallery */}
  <div className="pixel-card">
    <h3 className="pixel-section-title mb-4">Featured Frames</h3>
    <div className="grid grid-cols-2 gap-2">
      {featuredFrames.map((frame) => (
        <div key={frame.id} className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:border-primary-500 transition-colors">
          <Image 
            src={frame.preview} 
            alt={frame.title}
            fill
            className="object-cover"
          />
        </div>
      ))}
    </div>
    <Link href="/frames" className="text-sm text-primary-500 mt-4 inline-block">
      View All →
    </Link>
  </div>
</div>
```

---

### 5. Quick Stats Bar (Base Chain Metrics)

**Purpose**: Key metrics for Base chain activity

```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="pixel-card text-center">
    <div className="text-2xl font-bold text-primary-500">
      {stats.nftSales24h.toLocaleString()}
    </div>
    <div className="text-xs text-gray-500 mt-1">Total NFT Sales</div>
  </div>
  
  <div className="pixel-card text-center">
    <div className="text-2xl font-bold text-primary-500">
      {stats.volume24h} ETH
    </div>
    <div className="text-xs text-gray-500 mt-1">24h Volume (Base)</div>
  </div>
  
  <div className="pixel-card text-center">
    <div className="text-2xl font-bold text-primary-500">
      {stats.activeUsers.toLocaleString()}
    </div>
    <div className="text-xs text-gray-500 mt-1">Active Users</div>
  </div>
</div>
```

---

## 🔥 Viral Mini-App Features List

### Core Viral Mechanics:

1. **Share to Earn**
   - Share NFT collection → Earn points
   - Share token insight → Earn points
   - Refer friend → Both earn bonus

2. **Daily Check-in** (Professional - NO GM confusion)
   - Simple "Check In" button (not "GM")
   - Streak counter (professional icons, no emojis)
   - Progressive rewards

3. **Leaderboard Integration**
   - Top collectors (most NFTs on Base)
   - Top traders (highest volume)
   - Top social (most engagement)

4. **Frame Showcase**
   - Featured frames gallery
   - One-click frame launch
   - Frame analytics (views, interactions)

5. **Social Feed**
   - Recent casts from followed users
   - Trending casts in Base ecosystem
   - Quick reaction buttons

6. **Notification Center** (Already exists!)
   - Use existing DashboardNotificationCenter component
   - Show NFT sale alerts, token price alerts
   - Frame interaction notifications

7. **Quick Actions Toolbar**
   - Create Frame
   - Mint NFT
   - Swap Tokens
   - Share Dashboard

---

## 🔧 Technical Implementation

### Data Sources (APIs):

1. **NFT Data** (Alchemy NFT API - ✅ Already have subscription!):
   - Base URL: `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`
   - Methods:
     - `getNFTsForOwner` - Get NFTs by wallet address
     - `getNFTsForCollection` - Get all NFTs in a collection
     - `getNFTMetadata` - Get metadata for specific NFT
     - `searchContractMetadata` - Search for collections
   - API Key: Already in `.env.local` as `ALCHEMY_API_KEY`
   - Docs: https://www.alchemy.com/docs/reference/nft-api-overview

2. **Token Data** (DefiLlama - ✅ FREE, NO KEY NEEDED!):
   - Base URL: `https://coins.llama.fi/prices/current/{coins}`
   - Format: `base:0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed` (chain:address)
   - Batch Support: YES! Multiple tokens in single request
   - Returns: price, symbol, decimals, confidence (0.99)
   - Rate Limit: Free, no authentication required
   - Docs: https://defillama.com/docs/api

3. **Token Volume** (Optional - Supabase Cache):
   - DefiLlama volumes API returns DEX protocols, not individual tokens
   - Option 1: Hardcoded top Base tokens (simplest)
   - Option 2: Supabase table to track historical prices → calculate 24h change
   - Option 3: Display prices without volume data
   - Already have: Supabase MCP integration!

4. **Farcaster Data** (Neynar API - ✅ Already integrated!):
   - Top Casters: `/v2/farcaster/user/bulk`
   - Trending Channels: `/v2/farcaster/channel/trending`
   - Already have: `lib/neynar.ts` utilities

5. **Frame Data**:
   - Use existing frame system
   - Query: `/api/frame/*` routes
   - Display: Recent frames, popular frames

### Caching Strategy:

```typescript
// lib/cache/dashboard-data.ts
const NFT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const TOKEN_CACHE_TTL = 1 * 60 * 1000 // 1 minute
const SOCIAL_CACHE_TTL = 2 * 60 * 1000 // 2 minutes

// Use existing readStorageCache/writeStorageCache from lib/utils.ts
```

---

## 📋 Implementation Checklist

### Phase 1: Setup & Data Integration (1.5h)
- [ ] Create lib/api/defillama-tokens.ts (DefiLlama price API - NO KEY NEEDED!)
- [ ] Create lib/api/alchemy-nfts.ts (Alchemy NFT API - use existing key)
- [ ] Create lib/api/social.ts (Neynar top casters/channels)
- [ ] Test DefiLlama batch price fetching (7 tokens in single request)
- [ ] Test Alchemy NFT collection queries (Base chain)
- [ ] Setup caching layer (use existing readStorageCache/writeStorageCache)

### Phase 2: Build Dashboard UI (3h)
- [ ] Create new app/Dashboard/page.tsx (FRESH - no old code)
- [ ] Build Hero Banner (gradient card from trezoadmin)
- [ ] Build NFT Collections Carousel (Swiper)
- [ ] Build Top Tokens Table (responsive)
- [ ] Build Viral Features Grid (3-column)
- [ ] Build Quick Stats Bar
- [ ] Add loading states (skeleton screens)

### Phase 3: Professional Icons (1h)
- [ ] Replace ALL emojis with SVG icons
- [ ] Import icons from components/icons/
- [ ] Use: star, chart, fire icons (NO emoji blocks)
- [ ] Verify NO emojis in entire file

### Phase 4: Viral Features Integration (2h)
- [ ] Add Share buttons (NFT, Token, Dashboard)
- [ ] Integrate XPEventOverlay for check-in
- [ ] Add Quick Actions toolbar
- [ ] Test notification center integration
- [ ] Add frame gallery preview

### Phase 5: Testing & Polish (1h)
- [ ] Test on mobile (375px width)
- [ ] Test API loading states
- [ ] Verify Base chain only (no multichain)
- [ ] Verify NO emojis (grep search)
- [ ] Verify NO confetti (only XPEventOverlay)
- [ ] Test all links/navigation

### Phase 6: Documentation Update (30min)
- [ ] Update CURRENT-TASK.md (Phase 2 progress)
- [ ] Update DASHBOARD-REBUILD-PLAN.md → FRESH-DASHBOARD-PLAN.md
- [ ] Delete old DASHBOARD-REBUILD-PLAN.md
- [ ] Document API keys needed (.env.example)

---

## 🚫 Rules (2nd Reminder Compliance)

1. **NO EMOJIS** - All icons from components/icons/ (SVG only)
2. **NO MULTICHAIN** - Base chain only (no chain selector)
3. **NO CONFETTI** - XPEventOverlay only for celebrations
4. **NO OLD FOUNDATION** - FRESH code, no reuse from old Dashboard
5. **PROFESSIONAL TEMPLATES** - trezoadmin-41 NFT marketplace patterns only

---

## 📝 Required API Keys

Already in `.env.local` ✅:
```bash
# Alchemy API (NFT + Token APIs) - ✅ ALREADY HAVE!
ALCHEMY_API_KEY=AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe

# Neynar API (Farcaster data) - ✅ ALREADY HAVE!
NEYNAR_API_KEY=...

# Supabase (MCP + token price cache) - ✅ ALREADY HAVE!
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**No new API keys needed!** 🎉

**Optional** (for token prices):
- DefiLlama API: Free, no key needed
- Alternative: Manual Supabase updates

---

## 🎯 Success Criteria

✅ Dashboard shows REAL NFT/Token data (not hardcoded)  
✅ Base chain only (no multichain UI)  
✅ NO emojis anywhere (SVG icons only)  
✅ Professional trezoadmin template design  
✅ Mobile-first responsive  
✅ Viral features integrated (share, leaderboard, frames)  
✅ Loading states & error handling  
✅ Fast performance (<1.5s load)  

---

**Next Step**: Build the FRESH Dashboard with NFT gallery + token tracker + viral features!

**Estimated Time**: 8-9 hours total  
**Priority**: 🔥🔥🔥 CRITICAL - This is the NEW main page
