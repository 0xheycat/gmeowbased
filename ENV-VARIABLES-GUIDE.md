# Environment Variables Guide

## Required API Keys for Professional Stats

### NFT Floor Prices (Phase 3)

#### Option 1: OpenSea API (RECOMMENDED ✅ - NO API KEY NEEDED)
```bash
# No API key needed! Completely FREE
```

**Why OpenSea:**
- ✅ **100% FREE**: No API key required
- ✅ **Rate limited**: 2-4 requests/second (sufficient for most apps)
- ✅ **Multi-chain**: Ethereum, Base, Polygon, Arbitrum, Optimism
- ✅ **Reliable**: Direct from largest NFT marketplace

**API Endpoint:**
```
GET https://api.opensea.io/api/v2/collections/{collection_address}/stats
```

**No signup required!** Just use the API directly.

**API Docs:** https://docs.opensea.io/reference/get_collection_stats

---

#### Option 2: Alchemy NFT API (Fallback)
```bash
ALCHEMY_API_KEY=your_key_here
```

**Why Alchemy:**
- ✅ **Free tier**: 300M compute units/month
- ✅ **Good Ethereum/Base support**
- ✅ **Reliable infrastructure**

**Get API Key:**
1. Sign up: https://www.alchemy.com/
2. Create app → Get API key
3. Free tier: 300M compute units/month

**API Docs:** https://docs.alchemy.com/reference/nft-api-quickstart

---

#### Option 3: CoinGecko NFT API (Alternative)
```bash
COINGECKO_API_KEY=your_key_here  # Optional for free tier
```

**Why CoinGecko:**
- ✅ **Free tier**: 10-50 calls/minute
- ✅ **No credit card required**
- ✅ **Floor price data available**

**Get API Key:**
1. Sign up: https://www.coingecko.com/en/api
2. Free tier: No API key needed (rate limited)
3. Pro tier: $129/mo for higher limits

---

### ⚠️ Deprecated APIs (DO NOT USE)

#### Reservoir API (DEPRECATED ❌)
- **Status**: Migrated to Relay Protocol (payments only)
- **Reason**: No longer supports NFT floor price data
- **Migration**: https://docs.reservoir.tools/reference/overview

#### SimpleHash API (NO LONGER FREE ❌)
- **Status**: Removed free tier
- **Pricing**: Starts at $199/month
- **Reason**: Not cost-effective for startups

---

## Optional Enhancements

### Dynamic ETH Price (Optional)
Currently hardcoded: `$3,047.59`

To make dynamic, add:
```bash
COINGECKO_API_KEY=your_key_here  # Free tier available
# OR
COINBASE_API_KEY=your_key_here   # Free
```

---

## Current `.env.local` Template

```bash
# Database (Already configured)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Blockchain RPCs (Already configured)
NEXT_PUBLIC_BASE_RPC_URL=https://...
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://...

# NFT Floor Prices (Phase 3 - OPTIONAL)
# OpenSea API works WITHOUT any key (FREE, rate limited 2-4 req/sec)
# Only add if you need fallback or higher limits:
# ALCHEMY_API_KEY=           # Optional: Free 300M compute units/month
# COINGECKO_API_KEY=         # Optional: For higher rate limits

# Dynamic ETH Price (Optional)
# COINGECKO_API_KEY=         # Can reuse for both NFT + ETH price
```

---

## API Cost Comparison (All FREE Tiers)

| API | Free Tier | API Key Required | Chains | Best For |
|-----|-----------|------------------|--------|----------|
| **OpenSea** ✅ | 2-4 req/sec | ❌ NO | Ethereum, Base, Polygon | Zero-cost NFT floor prices |
| **Alchemy** | 300M compute units/mo | ✅ YES | Ethereum, Base | Fallback / high volume |
| **CoinGecko** | 10-50 calls/min | ⚠️ Optional | Multiple | NFT + ETH price combo |

---

## Testing Without API Keys

✅ **OpenSea API works immediately** - no API key needed!

NFT floor prices will work out-of-the-box with OpenSea's free API. All other stats work perfectly:
- ✅ Portfolio value (ERC-20 tokens)
- ✅ Gas analytics
- ✅ NFT collection count
- ✅ Transaction history
- ✅ NFT floor prices (via OpenSea FREE API)

---

## Production Recommendation

For production deployment:

1. **Use OpenSea API** (no setup, completely free)
2. **Add Alchemy as fallback** (optional, for redundancy)
3. Monitor rate limits in production
4. If you exceed OpenSea's 2-4 req/sec:
   - Add Alchemy API key (free 300M compute units/mo)
   - Implement request throttling/queue

**Cost for 100k users/month:**
- OpenSea FREE: $0 (2-4 req/sec = ~10k requests/hour = enough for most apps)
- Alchemy FREE: $0 (300M compute units = ~3M NFT queries)
- Combined: $0/month for typical usage

---

Last Updated: December 7, 2025
