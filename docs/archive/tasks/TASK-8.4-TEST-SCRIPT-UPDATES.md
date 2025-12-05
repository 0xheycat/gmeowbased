# ✅ Task 8.4 Test Script Updates - Real Data Integration

**Date**: December 4, 2025  
**Status**: ✅ COMPLETE - Test script updated with real Farcaster activity  
**Related**: Task 8.4 Quest Verification, Phase 7 Coinbase Trade API Integration

---

## 📋 Summary of Changes

### **1. Real User Data Integration** ✅

**Before** (Normalized/Fake Data):
```typescript
const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890'; // Fake
const TEST_USER_FID = 3; // Random FID
```

**After** (Real Data):
```typescript
// Real user: @heycat (FID: 18139)
const TEST_USER_FID = 18139;
const BOT_FID = 1069798; // @gmeow bot

// Real Farcaster activity:
const REAL_FARCASTER_DATA = {
  castWithMention: {
    hash: '0x29fd15a5',
    url: 'https://farcaster.xyz/heycat/0x29fd15a5',
    text: 'contains @gmeow tag',
  },
  recastTarget: {
    hash: '0x3b7cfa06',
    url: 'https://farcaster.xyz/joetir1/0x3b7cfa06',
    hasRecast: true, // FID 18139 has recast this
    hasLike: true,   // FID 18139 has liked this
  },
  // ... more real data
};
```

### **2. Correct Action Codes from QUEST_TYPES** ✅

**Before** (Guessed Codes):
```typescript
actionCode: 10, // Assuming QUEST_TYPES.NFT_MINT = 10
actionCode: 11, // Assuming QUEST_TYPES.TOKEN_SWAP = 11
```

**After** (Actual Codes from `lib/gmeow-utils.ts`):
```typescript
const ACTION_CODES = {
  GENERIC: 1,
  FARCASTER_FOLLOW: 2,
  FARCASTER_RECAST: 3,
  FARCASTER_REPLY: 4,
  FARCASTER_LIKE: 5,
  HOLD_ERC20: 6,
  HOLD_ERC721: 7,
  FARCASTER_CAST: 8,
  FARCASTER_MENTION: 9,
  // ... actual codes from codebase
} as const;
```

### **3. Real Farcaster Activity Test Cases** ✅

#### **Like Cast** (Real Activity)
```typescript
{
  name: '✅ Like Cast Verification (Real Activity)',
  requestBody: {
    fid: 18139, // @heycat
    actionCode: ACTION_CODES.FARCASTER_LIKE,
    meta: {
      cast_hash: '0x3b7cfa06', // Real cast from @joetir1
      cast_url: 'https://farcaster.xyz/joetir1/0x3b7cfa06',
    },
  },
  expectedSuccess: true, // FID 18139 has liked this cast
}
```

#### **Recast** (Real Activity)
```typescript
{
  name: '✅ Recast Verification (Real Activity)',
  requestBody: {
    fid: 18139, // @heycat
    actionCode: ACTION_CODES.FARCASTER_RECAST,
    meta: {
      cast_hash: '0x3b7cfa06', // Same cast
      cast_url: 'https://farcaster.xyz/joetir1/0x3b7cfa06',
    },
  },
  expectedSuccess: true, // FID 18139 has recast this
}
```

#### **Reply** (Real Activity from @garrycrypto)
```typescript
{
  name: '✅ Reply to Cast Verification (@garrycrypto replied)',
  requestBody: {
    fid: 346302, // @garrycrypto (real user who replied)
    actionCode: ACTION_CODES.FARCASTER_REPLY,
    meta: {
      parent_cast_hash: '0xda7511e5', // @heycat's cast
      cast_hash: '0x75b6d196',        // @garrycrypto's reply
      cast_url: 'https://farcaster.xyz/garrycrypto/0x75b6d196',
    },
  },
  expectedSuccess: true,
}
```

#### **Create Cast with Mention** (Real Activity)
```typescript
{
  name: '✅ Create Cast with Mention (@heycat mentioned @gmeow)',
  requestBody: {
    fid: 18139, // @heycat
    actionCode: ACTION_CODES.FARCASTER_MENTION,
    meta: {
      cast_hash: '0x29fd15a5', // Real cast
      cast_url: 'https://farcaster.xyz/heycat/0x29fd15a5',
      mention_handle: 'gmeow',
      required_text: 'tag',
    },
  },
  expectedSuccess: true,
}
```

### **4. Swap/Liquidity Quest Handling** ✅

**Marked as NOT IMPLEMENTED**:
```typescript
{
  name: '⏸️  Token Swap Verification (NOT IMPLEMENTED)',
  category: 'onchain',
  type: 'swap_token',
  requestBody: {
    actionCode: 0, // No action code - feature not implemented
    // ...
  },
  expectedSuccess: false, // Feature not implemented
  description: '⚠️ SKIP: Swap verification requires Coinbase Trade API integration (Phase 7)',
}
```

**Reason**: Coinbase Trade API integration planned for Phase 7 (12-17 hours)

---

## 🔍 Research Findings

### **1. Coinbase Trade API Capabilities** 

**✅ SUPPORTED (Base Mainnet)**:
- **Token Swaps** - Trade API supports Ethereum & Base mainnet (Beta)
  - Real-time price discovery across DEXes
  - Quote creation with slippage tolerance
  - Swap execution via CDP Server Wallet
  - Transaction signing and broadcast
  
- **Staking** - Staking API supports 15+ PoS chains
  - Programmatic staking (ETH, SOL, etc.)
  - Rewards tracking
  - Unstaking and claiming

**⚠️ NOT DIRECTLY SUPPORTED**:
- **Liquidity Provision** - No dedicated liquidity API
  - **Solution**: Use Layer3 pattern (check LP token balanceOf)
  - LP tokens are standard ERC-20 tokens
  - Verify user holds minimum LP tokens from whitelisted pools

### **2. Popular Base DEXes**

For liquidity verification:
- **Uniswap V3**: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` (factory)
- **BaseSwap**: `0x327Df1E6de05895d2ab08513aaDD9313Fe505d86` (router)
- **Aerodrome**: `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` (router)
- **SushiSwap**: `0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891` (router)

### **3. gmeow-utils.ts Verification** ✅

**QUEST_TYPES Mapping** (from `lib/gmeow-utils.ts`):
```typescript
export const QUEST_TYPES: Record<QuestTypeKey, number> = {
  GENERIC: 1,
  FARCASTER_FOLLOW: 2,
  FARCASTER_RECAST: 3,
  FARCASTER_REPLY: 4,
  FARCASTER_LIKE: 5,
  HOLD_ERC20: 6,
  HOLD_ERC721: 7,
  FARCASTER_CAST: 8,
  FARCASTER_MENTION: 9,
  FARCASTER_FRAME_INTERACT: 10,
  FARCASTER_CHANNEL_POST: 11,
  FARCASTER_VERIFIED_USER: 12,
} as const;
```

**Missing Codes** (will add in Phase 7):
- `SWAP_TOKEN: 13` (token swap verification)
- `PROVIDE_LIQUIDITY: 14` (liquidity provision verification)
- `STAKE_TOKEN: 15` (staking verification)

**Proxy Contract**: `0x6A48B758ed42d7c934D387164E60aa58A92eD206` (Base Mainnet) ✅
- Confirmed in `lib/gmeow-utils.ts`
- Matches deployment in `STANDALONE_ADDRESSES.base.proxy`

---

## 📝 Documentation Created

### **1. Test Script Updated**
- **File**: `scripts/test-quest-verification.ts`
- **Changes**: Real user data (FID 18139, @heycat)
- **Real Activity**: Like, recast, reply, mention (all from actual Farcaster)
- **Action Codes**: Updated with correct codes from QUEST_TYPES
- **Swap/Liquidity**: Marked as NOT IMPLEMENTED with Phase 7 reference

### **2. Coinbase Trade API Integration Plan**
- **File**: `docs/planning/COINBASE-TRADE-API-INTEGRATION.md`
- **Size**: 500+ lines comprehensive guide
- **Sections**:
  - Overview & Current State Analysis
  - Coinbase API Capabilities (Swap, Liquidity, Staking)
  - 3 Sub-Phases (Swap, Liquidity, Agent Bot)
  - Implementation steps with code examples
  - Quest metadata schemas
  - Testing strategy
  - Deployment checklist
  - Resources & documentation links

### **3. Roadmap Updated**
- **File**: `FOUNDATION-REBUILD-ROADMAP.md`
- **Added**: Phase 7: Coinbase Trade API Integration
- **Timeline**: 12-17 hours (3 sub-phases)
- **Prerequisites**: Task 8.4 complete, test script passes
- **Integration**: Links to comprehensive documentation

---

## 🚀 Next Steps

### **Immediate** (Task 8.4 Testing)
1. ✅ Test script updated with real data
2. ⏳ User runs: `pnpm test:verify`
3. ⏳ User reviews results (which tests pass/fail)
4. ⏳ User provides real wallet address for onchain tests
5. ⏳ User decides: Remove old API? (if 100% social tests pass)

### **After Task 8.4** (Phase 7 Implementation)
1. **Phase 7.1**: Token Swap Verification (4-6 hours)
   - Add action codes 13-15 to QUEST_TYPES
   - Install Coinbase CDP SDK
   - Create Trade API client
   - Update verification functions
   - Test with real Base transactions
   
2. **Phase 7.2**: Liquidity Provision Verification (2-3 hours)
   - Implement Layer3 pattern (LP token balance check)
   - Whitelist Base DEX pools
   - Update Quest API route
   - Test with real LP holdings
   
3. **Phase 7.3**: Agent Bot Swap Commands (6-8 hours)
   - Create command parser ("swap 1 USDC to WETH")
   - Implement SwapAgent with AgentKit
   - Integrate Farcaster webhook
   - Test on Base testnet first

---

## 📚 Key Learnings

### **1. Real Data > Normalized Data**
**Why**: Production verification must use actual user activity
- Fake data passes tests but fails in production
- Real Farcaster hashes verify against live Neynar API
- Real wallet addresses verify against Base Mainnet blockchain

### **2. Coinbase Trade API is Production-Ready**
**Capabilities**:
- Token swaps on Ethereum & Base mainnet (Beta)
- Gas sponsorship via Smart Accounts
- Real-time price discovery across DEXes
- Transaction signing and broadcast

**Limitations**:
- No dedicated liquidity provision API (use Layer3 pattern)
- Beta phase (Base + Ethereum only)
- Rate limits (100 req/min per API key)

### **3. Multi-Template Hybrid Still Needed**
**Quest System Components**:
- QuestVerification: gmeowbased0.6 (0-10% adaptation) ✅
- Swap verification: Will use Layer3 pattern + Coinbase API
- Agent bot: Will use AgentKit patterns (Coinbase docs)

---

## ✅ Success Criteria

### **Task 8.4 Complete**:
- [x] Test script updated with real user data (FID 18139)
- [x] Correct action codes from QUEST_TYPES (2-12)
- [x] Real Farcaster activity test cases (like, recast, reply, mention)
- [x] Swap/liquidity marked as NOT IMPLEMENTED
- [x] Phase 7 roadmap created (12-17 hours)
- [x] Comprehensive documentation (500+ lines)
- [ ] User runs test script and provides results
- [ ] User provides real wallet address
- [ ] User decides on old API removal

### **Phase 7 Complete** (Future):
- [ ] Action codes 13-15 added to QUEST_TYPES
- [ ] Coinbase Trade API client implemented
- [ ] Swap verification working with real Base transactions
- [ ] Liquidity verification working with LP tokens
- [ ] Agent bot executing swaps via mentions
- [ ] Full test coverage (swap + liquidity quests)

---

**Status**: ✅ Test script updated, ready for user testing  
**Next**: User runs `pnpm test:verify` and shares results  
**Timeline**: Phase 7 after Task 8.4 complete (12-17 hours)
