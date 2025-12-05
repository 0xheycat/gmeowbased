# 🤖 Bot Enhancement Plan - NFT & Token Balance Features

**Created**: December 2, 2025  
**Status**: 📋 Planning Phase  
**Integration**: Coinbase MCP (AgentKit)

---

## 🎯 Overview

Enhance the existing `@gmeowbased` bot with NFT and token balance checking capabilities using **Coinbase AgentKit MCP**. This adds powerful onchain data queries to complement the current stats/rank features.

---

## ✅ Current Bot Capabilities (Baseline)

**Existing Features**:
1. ✅ Stats replies (`@gmeowbased stats`) - User XP/points/rank
2. ✅ Auto-reply system with cooldowns
3. ✅ Frame embeds in cast replies
4. ✅ Quest recommendations
5. ✅ Multi-language support (i18n)
6. ✅ Telemetry tracking (rank events)

**Current Trigger System**:
- Mention matchers: `@gmeowbased`, `#gmeowbased`
- Signal keywords: `stats`, `rank`, `level`, `xp`, `points`
- Question detection: `what`, `how`, `show`, etc.
- Cooldown: 15 min (general), 5 min (repeat)

**Bot Location**: `lib/bot-instance/index.ts` (660 lines)

---

## 🚀 Proposed Enhancements

### Enhancement 1: NFT Balance Check 🖼️

**User Commands**:
- `@gmeowbased nft` - Show my NFT balance
- `@gmeowbased nft [wallet]` - Show NFT balance for specific wallet
- `@gmeowbased check nft` - Alternative trigger

**What Bot Will Do**:
1. Extract wallet address from:
   - User's Farcaster verified address (primary)
   - Connected custody address (if available)
   - Provided wallet address in command
2. Call Coinbase MCP `erc721ActionProvider` → `get_balance`
3. Query multiple popular Base NFT collections
4. Reply with summary:
   ```
   🖼️ NFT Balance (Base Chain)
   
   Zora Pass: 2 NFTs
   Base, Introduced: 1 NFT
   Degen NFTs: 0 NFTs
   
   Total: 3 NFTs across 2 collections
   ```

**Technical Implementation**:
```typescript
// lib/bot-nft-balance.ts
import { erc721ActionProvider } from '@coinbase/agentkit'

const POPULAR_BASE_NFTS = [
  { name: 'Zora Pass', address: '0x...' },
  { name: 'Base, Introduced', address: '0x...' },
  { name: 'Degen NFTs', address: '0x...' },
  // Add 5-8 popular collections
]

export async function checkNFTBalance(walletAddress: string) {
  const erc721 = erc721ActionProvider()
  const balances = []
  
  for (const collection of POPULAR_BASE_NFTS) {
    try {
      const balance = await erc721.getBalance({
        contractAddress: collection.address,
        address: walletAddress,
        network: 'base'
      })
      if (balance > 0) {
        balances.push({ name: collection.name, count: balance })
      }
    } catch (error) {
      console.warn(`NFT balance check failed for ${collection.name}`)
    }
  }
  
  return balances
}
```

---

### Enhancement 2: Token Balance Check 💰

**User Commands**:
- `@gmeowbased balance` - Show my token balances
- `@gmeowbased tokens` - Alternative trigger
- `@gmeowbased wallet` - Show complete wallet summary

**What Bot Will Do**:
1. Extract wallet address (same as NFT check)
2. Query balances for popular Base tokens:
   - Native ETH (via `get_balance` action)
   - ERC20 tokens (DEGEN, HIGHER, etc.)
3. Get USD values (use Neynar Fungibles API for prices)
4. Reply with formatted summary:
   ```
   💰 Token Balance (Base Chain)
   
   ETH: 0.05 ($125.30)
   DEGEN: 1,234 ($18.51)
   HIGHER: 45 ($4.05)
   
   Portfolio: $147.86
   ```

**Technical Implementation**:
```typescript
// lib/bot-token-balance.ts
import { walletActionProvider } from '@coinbase/agentkit'
import { getTrendingTokens } from '@/lib/api/neynar-dashboard'

const TRACKED_BASE_TOKENS = [
  { symbol: 'ETH', address: 'native', decimals: 18 },
  { symbol: 'DEGEN', address: '0x...', decimals: 18 },
  { symbol: 'HIGHER', address: '0x...', decimals: 18 },
  // Add more popular tokens
]

export async function checkTokenBalance(walletAddress: string) {
  const wallet = walletActionProvider()
  const trendingTokens = await getTrendingTokens() // For USD prices
  
  const balances = []
  
  for (const token of TRACKED_BASE_TOKENS) {
    try {
      const balance = await wallet.getBalance({
        assetId: token.address,
        address: walletAddress,
        network: 'base'
      })
      
      const price = trendingTokens.find(t => t.symbol === token.symbol)?.price || 0
      const usdValue = balance * price
      
      if (balance > 0) {
        balances.push({
          symbol: token.symbol,
          amount: balance,
          usdValue
        })
      }
    } catch (error) {
      console.warn(`Token balance check failed for ${token.symbol}`)
    }
  }
  
  return balances
}
```

---

### Enhancement 3: Combined Wallet Summary 📊

**User Commands**:
- `@gmeowbased wallet summary`
- `@gmeowbased portfolio`
- `@gmeowbased holdings`

**What Bot Will Reply**:
```
📊 Wallet Summary (Base Chain)

💰 Tokens (Portfolio: $147.86):
• ETH: 0.05 ($125.30)
• DEGEN: 1,234 ($18.51)
• HIGHER: 45 ($4.05)

🖼️ NFTs (3 total):
• Zora Pass: 2
• Base, Introduced: 1

🎮 GMEOW Stats:
• Level: 5 | XP: 1,234 | Rank: #42

[View Full Details] (button to frame)
```

---

### Enhancement 4: NFT Mint Notifications (Future) 🎨

**When User Mints NFT**:
- Bot detects mint via webhook (if we add Neynar NFT mint webhook)
- Automatically replies: "🎉 Congrats on minting [NFT Name]!"
- Shows NFT image + metadata
- Adds XP bonus for minting

**Technical Requirements**:
- Neynar NFT mint webhook setup
- NFT metadata fetching (IPFS/HTTP)
- Image proxy/caching
- XP reward system integration

---

## 🔧 Implementation Phases

### Phase 1: Foundation (2-3h)
1. ✅ Install Coinbase AgentKit MCP SDK
   ```bash
   pnpm add @coinbase/agentkit
   ```

2. ✅ Configure environment variables:
   ```env
   # .env.local
   OPENSEA_API_KEY=your_opensea_key  # Optional for OpenSea provider
   CDP_API_KEY_NAME=your_cdp_key     # For CDP actions
   CDP_API_KEY_PRIVATE_KEY=your_private_key
   ```

3. ✅ Create bot utilities:
   - `lib/bot-nft-balance.ts` (NFT balance checker)
   - `lib/bot-token-balance.ts` (Token balance checker)
   - `lib/bot-wallet-resolver.ts` (Extract wallet from Farcaster user)

### Phase 2: NFT Balance (2-3h)
1. Add NFT trigger keywords to `BotStatsConfig`:
   ```typescript
   signalKeywords: [
     'stats', 'rank', 'level', 'xp', 'points',
     'nft', 'nfts', 'balance', 'holdings' // NEW
   ]
   ```

2. Implement NFT balance checking logic
3. Format NFT balance reply with frame embed
4. Test with Base NFT collections

### Phase 3: Token Balance (2-3h)
1. Add token trigger keywords
2. Implement token balance checking
3. Integrate Neynar Fungibles API for USD prices
4. Format token balance reply
5. Test with Base tokens (ETH, DEGEN, HIGHER)

### Phase 4: Wallet Summary (1-2h)
1. Combine NFT + Token + Stats data
2. Create comprehensive wallet frame
3. Add "View Full Details" button linking to frame
4. Test complete flow

### Phase 5: Testing & Polish (1-2h)
1. Error handling (no wallet, no balance, API failures)
2. Cooldown management (prevent spam)
3. Rate limiting for MCP calls
4. Graceful fallbacks
5. Documentation updates

**Total Estimate**: 8-12 hours

---

## 📊 Success Metrics

**Bot Usage**:
- Track NFT balance queries per day
- Track token balance queries per day
- Track wallet summary requests
- Monitor error rates (no wallet found, API failures)

**User Engagement**:
- Reply rate increase vs. current stats-only bot
- Frame interaction rate (wallet summary frame)
- Repeat user queries (daily wallet checks)

**Technical Health**:
- MCP API response times
- Success rate of balance queries
- Cooldown violation rate
- Cache hit rate (for popular wallets)

---

## 🚀 Future Enhancements

### Advanced Features:
1. **Portfolio Tracking** - Track wallet value over time, show % changes
2. **NFT Alerts** - Notify when specific collections mint/transfer
3. **Token Alerts** - Price alerts for tracked tokens
4. **Multi-Chain** - Expand beyond Base (Ethereum, Arbitrum, Optimism)
5. **Mint Actions** - Bot can mint NFTs to users (rewards system)
6. **Transfer Actions** - Bot can send tokens/NFTs (giveaways)

### AgentKit Actions to Explore:
- `opensea` → `get_nfts_by_account` (OpenSea NFT data)
- `cdp` → Deploy NFT contracts (for GMEOW NFTs)
- `pyth` → Real-time price feeds
- `compound`, `morpho` → DeFi positions
- `jupiter` → Solana integration

---

## 🎯 Integration Points

### With Existing Systems:

1. **Stats System** (`lib/bot-stats.ts`):
   - Add "NFT Holder Bonus" (extra XP for holding Base NFTs)
   - Add "Token Holder Bonus" (extra XP for holding DEGEN/HIGHER)

2. **Quest System** (`lib/bot-quest-recommendations.ts`):
   - New quest: "Check your NFT balance"
   - New quest: "Hold 5 different Base tokens"

3. **Telemetry** (`lib/telemetry.ts`):
   - Track `bot_nft_query`, `bot_token_query` events
   - Track wallet resolution success/failure

4. **Frame System** (`lib/bot-frame-builder.ts`):
   - New frame type: `wallet-summary`
   - New frame type: `nft-gallery`
   - New frame type: `token-portfolio`

---

## ⚠️ Considerations

**API Rate Limits**:
- Coinbase AgentKit: Check rate limits for MCP actions
- OpenSea API: 5 requests/sec (if using OpenSea provider)
- Neynar API: Already have limits for Fungibles

**Privacy**:
- Users control what wallet they share
- Default to verified Farcaster address only
- Never store private keys (read-only queries)

**Cost**:
- AgentKit MCP calls (check pricing)
- Neynar API calls (already tracked)
- OpenSea API (free tier available)

**Error Handling**:
- Wallet not found → Prompt to connect wallet
- No NFTs → "No NFTs found (yet!)"
- API failure → Graceful fallback message

---

## 📝 Documentation Updates

After implementation, update:
1. ✅ `FOUNDATION-REBUILD-ROADMAP.md` - Add Phase 2.5 (Bot Enhancements)
2. ✅ `CURRENT-TASK.md` - Track implementation progress
3. ✅ `README.md` - Document new bot commands
4. ✅ Create `BOT-FEATURES.md` - Comprehensive bot command reference

---

## 🎉 Expected Outcome

**Before**:
- Bot only replies to stats queries
- Limited engagement (1-2 queries per user)

**After**:
- Bot provides comprehensive wallet insights
- Multiple use cases (NFTs, tokens, portfolio)
- Higher engagement (daily wallet checks)
- Foundation for future mint/transfer features

**User Value**:
- Check Base wallet without leaving Farcaster
- Track portfolio value in real-time
- Discover NFT holdings across collections
- Combined stats + wallet view

---

**Ready to implement?** Let me know which phase to start with! 🚀
