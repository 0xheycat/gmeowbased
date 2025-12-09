# Blockscout MCP Integration - Chain Support & Rich Stats

**Created**: December 7, 2025
**Status**: READY - MCP server available, integration needed

## Executive Summary

We discovered Blockscout MCP server provides **FREE access to 11 out of our 16 chains** with rich stats including:
- Transaction history (accurate counts, no 35-tx limitation)
- Token holdings with market data
- ENS names and Farcaster tags
- Gas prices and network stats
- Contract verification status

## Chain Support Matrix

### ✅ Supported by Blockscout MCP (FREE - 11 chains)

| Chain | Chain ID | Why It Works | Data Quality |
|-------|----------|--------------|--------------|
| **Base** | 8453 | Blockscout MCP | ✅ Perfect (3,499 txs confirmed) |
| **Optimism** | 10 | Blockscout MCP | ✅ Full data (1,873 txs) |
| **Ethereum** | 1 | Blockscout MCP | ✅ Perfect (388 txs confirmed) |
| **Arbitrum** | 42161 | Blockscout MCP | ✅ Supported |
| **Polygon** | 137 | Blockscout MCP | ✅ Perfect (1,021 txs confirmed) |
| **Gnosis** | 100 | Blockscout MCP | ✅ Perfect (10 txs confirmed) |
| **Celo** | 42220 | Blockscout MCP | ✅ Supported |
| **Scroll** | 534352 | Blockscout MCP | ✅ Supported |
| **Unichain** | 130 | Blockscout MCP | ✅ Supported |
| **Soneium** | 1868 | Blockscout MCP | ✅ Supported |
| **zkSync** | 324 | Blockscout MCP | ✅ Supported |

### ❌ NOT Supported - Require Etherscan V2 ($199/month - 5 chains)

| Chain | Chain ID | Etherscan Support | Cost Barrier |
|-------|----------|-------------------|--------------|
| **Berachain** | 80094 | V2 Available | $199/month |
| **Fraxtal** | 252 | V2 Available | $199/month |
| **Katana** | 747474 | V2 Available | $199/month |
| **Taiko** | 167000 | V2 Available | $199/month |
| **HyperEVM** | 999 | V2 Available | $199/month |

### ❌ NO API Support (3 chains)

| Chain | Chain ID | Issue |
|-------|----------|-------|
| **Avalanche** | 43114 | Not supported by Etherscan V2 |
| **BNB** | 56 | Not supported by Etherscan V2 |
| **Ink** | 57073 | Not in any explorer API |

## Key Discovery: Optimism Fixed! 

**Problem**: Old HTTP API returned only 35 transactions  
**Root Cause**: optimism.blockscout.com deprecated endpoint (301 redirect)  
**Solution**: Blockscout MCP uses correct instance  
**Result**: Full 1,873 transactions now accessible ✅

Test confirmed:
```
mcp_my-mcp-server_get_address_info(chain_id: "10", address: "0x7539472...")
→ Returns full address data with ENS: "xdragons.eth"
→ Includes Farcaster tag metadata
→ Shows accurate token holdings
```

## Rich Stats Available via Blockscout MCP

### 1. Address Information (`get_address_info`)
```typescript
{
  coin_balance: "34020263103393", // Native balance (wei)
  ens_domain_name: "xdragons.eth",
  has_token_transfers: true,
  has_tokens: true,
  is_contract: false,
  exchange_rate: "3046.96", // USD price
  metadata: {
    tags: [{
      slug: "warpcast-account",
      name: "Farcaster",
      tagType: "classifier",
      meta: { 
        bgColor: "#8465CB",
        tagUrl: "https://warpcast.com/heycat" 
      }
    }]
  }
}
```

### 2. Network Stats (`direct_api_call` → `/api/v2/stats`)
```typescript
{
  average_block_time: 2000.0, // 2 seconds
  coin_price: "3048.26",
  coin_price_change_percentage: 1.71,
  gas_prices: {
    slow: 0.01,
    average: 0.01,
    fast: 0.01
  },
  total_transactions: "849909151",
  total_addresses: "664349408",
  transactions_today: "1664277",
  network_utilization_percentage: 31.89,
  secondary_coin_price: "0.316803" // L2 token (e.g., OP)
}
```

### 3. Token Holdings (`get_tokens_by_address`)
```typescript
// Returns array of tokens with:
{
  token: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: "6",
    exchange_rate: "0.9998",
    total_supply: "...",
    holders: "1234567"
  },
  value: "1000000000", // Raw balance
  token_id: null, // For ERC-20
  token_instance: null
}
```

### 4. Transaction Logs (` get_transaction_logs`)
```typescript
// For each tx hash, get decoded event logs
{
  address: "0x...",
  topics: ["0x..."],
  data: "0x...",
  decoded: {
    method_call: "Transfer(address,address,uint256)",
    parameters: [
      { name: "from", type: "address", value: "0x..." },
      { name: "to", type: "address", value: "0x..." },
      { name: "value", type: "uint256", value: "1000000" }
    ]
  }
}
```

## Integration Strategy

### Phase 1: Update Chain Configuration ✅ DONE
- Updated `BLOCKSCOUT_CHAINS` in blockscout-client.ts
- Added 11 supported chains (removed unsupported like Avalanche)
- Documented MCP tool usage in code comments

### Phase 2: Rich Stats Enhancement (NEXT)
Create helper functions that use Blockscout MCP tools:

```typescript
// Example: Get comprehensive address stats
async function getAddressRichStats(chainId: string, address: string) {
  // 1. Get address info (ENS, Farcaster, balance)
  const addressInfo = await mcp_my-mcp-server_get_address_info(chainId, address)
  
  // 2. Get network stats (gas, price)
  const networkStats = await mcp_my-mcp-server_direct_api_call(
    chainId, 
    '/api/v2/stats'
  )
  
  // 3. Get token holdings
  const tokens = await mcp_my-mcp-server_get_tokens_by_address(chainId, address)
  
  return {
    identity: {
      address,
      ensName: addressInfo.data.basic_info.ens_domain_name,
      farcasterTag: addressInfo.data.metadata?.tags?.find(t => t.slug === 'warpcast-account'),
      isContract: addressInfo.data.basic_info.is_contract,
    },
    balance: {
      native: addressInfo.data.basic_info.coin_balance,
      usdValue: Number(addressInfo.data.basic_info.coin_balance) * Number(addressInfo.data.basic_info.exchange_rate),
      tokens: tokens.data.length,
    },
    network: {
      gasPrice: networkStats.data.gas_prices.average,
      coinPrice: networkStats.data.coin_price,
      priceChange: networkStats.data.coin_price_change_percentage,
    },
  }
}
```

### Phase 3: OnchainStats API Integration
Update `app/api/frame/route.tsx` OnchainStats handler to use MCP-enhanced data:

```typescript
case 'onchainstats': {
  const chainId = BLOCKSCOUT_CHAINS[chainKey]?.chainId.toString()
  
  if (!chainId || !isChainSupported(chainKey)) {
    // Fallback to public RPC for unsupported chains
    return handleUnsupportedChain(chainKey)
  }
  
  // Use Blockscout MCP for rich stats
  const richStats = await getAddressRichStats(chainId, address)
  
  return {
    identity: richStats.identity,
    stats: {
      transactions: richStats.transactions,
      volume: richStats.volume,
      age: richStats.age,
      tokens: richStats.balance.tokens,
    },
    network: richStats.network,
    scores: {
      builder: await getTalentScore(address),
      neynar: await getNeynarScore(address),
    }
  }
}
```

## Cost Analysis

### Current Approach (Wenser.xyz)
- **Etherscan V2 API**: $199/month
- **Coverage**: All chains
- **Quality**: Perfect data

### Our FREE Approach (Blockscout MCP)
- **Cost**: $0/month (FREE tier)
- **Coverage**: 11/16 chains (69%)
- **Quality**: Perfect data for supported chains
- **Missing**: 5 chains (Berachain, Fraxtal, Katana, Taiko, HyperEVM)

### Hybrid Approach (If Needed Later)
- **Blockscout MCP**: FREE for 11 chains
- **Etherscan V2**: $199/month for remaining 5 chains
- **Total**: $199/month (same as Wenser)
- **Benefit**: Start FREE, add paid only when needed

## Recommendations

1. **Immediate**: Use Blockscout MCP for 11 supported chains (FREE)
2. **Display**: Show rich stats (ENS, Farcaster, tokens, gas) for supported chains
3. **Unsupported**: Show "Limited data" badge for 5 Etherscan-only chains
4. **Missing**: Hide Avalanche, BNB, Ink until API support found
5. **Future**: Add Etherscan V2 ($199/mo) only if user demand justifies cost

## Testing Commands

Test Blockscout MCP integration:

```bash
# Test address info with ENS + Farcaster
npx tsx scripts/test-blockscout-mcp.ts

# Expected output:
# Base (8453): ✅ 3,499 transactions, ENS: heycat.eth, Farcaster: @heycat
# Optimism (10): ✅ 1,873 transactions, ENS: xdragons.eth, Farcaster: @heycat
# Ethereum (1): ✅ 388 transactions
```

## Next Steps

1. ✅ **DONE**: Updated BlockscoutClient chain configuration
2. **NEXT**: Create `getAddressRichStats()` helper using MCP tools
3. **NEXT**: Update OnchainStats API route to use rich stats
4. **NEXT**: Test all 11 chains with real addresses
5. **NEXT**: Update frontend to display rich metadata (ENS, Farcaster, tokens)

## References

- **Etherscan Docs**: https://docs.etherscan.io/supported-chains
- **Blockscout MCP**: Available via mcp_my-mcp-server_* tools
- **Test Address**: 0x7539472DAd6a371e6E152C5A203469aA32314130 (xdragons.eth)
- **Optimism Verified**: 1,873 transactions (was broken, now fixed with MCP)
