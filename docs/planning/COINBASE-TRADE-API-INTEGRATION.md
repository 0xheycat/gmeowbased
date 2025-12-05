# 🔄 Coinbase Trade API Integration Plan

**Date Created**: December 4, 2025  
**Status**: 📋 PLANNED - Pending Phase 7 Implementation  
**Priority**: HIGH (Required for swap/liquidity quest verification)  
**Related**: Task 8.4 Quest Verification, Phase 7 DeFi Features

---

## 🎯 Overview

Integrate **Coinbase Trade API** to enable:
1. **Token Swap Verification** - Verify users completed swaps onchain
2. **Liquidity Provision Verification** - Verify users provided liquidity to pools
3. **Staking Verification** (future) - Verify users staked tokens
4. **Agent Bot Commands** - Enable @gmeow bot to execute swap/stake via mentions

**Research Source**: Coinbase Developer Documentation (December 2025)  
**API Docs**: https://docs.cdp.coinbase.com/trade-api/welcome

---

## 📊 Current State Analysis

### ✅ What We Have
1. **Quest Types Defined** - `swap_token`, `provide_liquidity` in schema
   - File: `lib/supabase/types/quest.ts`
   - Types: `'mint_nft' | 'swap_token' | 'provide_liquidity' | 'follow_user' | ...`
   
2. **Verification Stubs** - Basic verification functions exist
   - File: `lib/quests/onchain-verification.ts`
   - Functions: `verifyTokenSwap()`, `verifyLiquidityProvision()`
   - Current: Only checks ERC-20 balanceOf (not actual swap/LP activity)
   
3. **Action Codes** - No numeric codes for swap/liquidity
   - File: `lib/gmeow-utils.ts`
   - Missing: `SWAP_TOKEN`, `PROVIDE_LIQUIDITY` in QUEST_TYPES
   - Current codes: Only social (FOLLOW: 2, RECAST: 3, etc.) and token holds (6-7)

### ❌ What We Don't Have
1. **Coinbase Trade API Integration** - Not connected yet
2. **Swap Transaction Parsing** - Can't detect if user swapped via DEX
3. **LP Token Verification** - Can't verify liquidity provision
4. **Staking Verification** - No staking quest support
5. **Agent Bot Swap Commands** - Bot can't execute swaps via mentions

---

## 🔍 Coinbase Trade API Capabilities

### **1. Token Swaps** ✅ SUPPORTED
**API**: Server Wallet v2 + Trade API  
**Networks**: Ethereum, Base mainnet only (Beta)  
**Features**:
- Real-time price discovery across DEXes
- Quote creation with slippage tolerance
- Swap execution via CDP accounts
- Transaction signing and broadcast
- Gas sponsorship support (via Smart Accounts)

**Example Flow**:
```typescript
// 1. Create swap quote
const swapQuote = await account.quote_swap({
  sell_token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  buy_token: "0x4200000000000000000000000000000000000006",   // WETH
  sell_amount: "100000000", // 100 USDC (6 decimals)
  network: "base",
  slippage_bps: 100, // 1% slippage
});

// 2. Execute swap
const swapTx = await account.execute_swap(swapQuote);
console.log(`Swap executed: ${swapTx.transaction_hash}`);
```

**Verification Strategy**:
- Check user's token balance BEFORE expected swap
- Check user's token balance AFTER transaction
- Verify balance increased by minimum amount
- OR check transaction logs for Swap event

### **2. Liquidity Provision** ⚠️ NOT DIRECTLY SUPPORTED
**Status**: No dedicated liquidity API  
**Alternative**: Use Layer3 pattern (reference Quest platforms)  
**Strategy**:
- Verify LP token balance (ERC-20 balanceOf)
- Check if user holds minimum LP tokens from specific pool
- Pool addresses must be whitelisted in quest metadata

**Layer3 Pattern** (Quest Verification Reference):
```typescript
// Layer3 checks LP token ownership
async function verifyLiquidity(
  userAddress: Address,
  poolAddress: Address,
  minLPTokens: bigint
): Promise<boolean> {
  // LP tokens are ERC-20 tokens representing liquidity position
  const lpBalance = await publicClient.readContract({
    address: poolAddress, // Uniswap V2/V3 pool contract
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  });
  
  return lpBalance >= minLPTokens;
}
```

**Popular Base DEXes** (LP Token Addresses):
- **Uniswap V3** - Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- **BaseSwap** - Router: `0x327Df1E6de05895d2ab08513aaDD9313Fe505d86`
- **Aerodrome** - Router: `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43`
- **SushiSwap** - Router: `0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891`

### **3. Staking** ✅ SUPPORTED (Coinbase Staking API)
**API**: Coinbase Staking API  
**Networks**: ETH (shared/dedicated), SOL, 15+ PoS chains  
**Features**:
- Programmatic staking via CDP SDK
- Rewards tracking
- Unstaking and claiming
- Validator management

**Example Flow**:
```typescript
// 1. Build staking operation
const stakeOp = await coinbase.staking.build({
  network_id: "ethereum-mainnet",
  asset_id: "ETH",
  address_id: userAddress,
  action: "stake",
  options: { amount: "1.0" }, // 1 ETH
});

// 2. Sign and broadcast
for (const tx of stakeOp.transactions) {
  await tx.sign();
  await tx.broadcast();
}
```

**Verification Strategy**:
- Check staking balance via Coinbase Staking API
- Verify minimum staked amount
- Check staking rewards accrual

### **4. Faucets** ✅ SUPPORTED (Testnet Only)
**API**: Coinbase Faucets API  
**Networks**: Base Sepolia, Ethereum testnets  
**Tokens**: ETH, USDC, cbBTC (testnet)

---

## 🏗️ Implementation Roadmap

### **Phase 7.1: Token Swap Verification** (4-6 hours)
**Priority**: HIGH - Required for quest system completeness

#### Step 1: Add Action Codes (30 minutes)
```typescript
// lib/gmeow-utils.ts
export const QUEST_TYPES: Record<QuestTypeKey, number> = {
  GENERIC: 1,
  FARCASTER_FOLLOW: 2,
  // ... existing codes ...
  FARCASTER_VERIFIED_USER: 12,
  
  // NEW: Onchain action codes
  SWAP_TOKEN: 13,              // Token swap verification
  PROVIDE_LIQUIDITY: 14,       // Liquidity provision verification
  STAKE_TOKEN: 15,             // Staking verification (future)
  BRIDGE_ASSET: 16,            // Bridge verification (future)
} as const;
```

#### Step 2: Integrate Coinbase Trade API (2-3 hours)
```bash
# Install CDP SDK
pnpm add @coinbase/coinbase-sdk

# Environment variables
COINBASE_API_KEY_NAME=your_api_key_name
COINBASE_API_PRIVATE_KEY=your_private_key
```

```typescript
// lib/coinbase/trade-client.ts
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

export class TradeClient {
  private coinbase: Coinbase;
  
  constructor() {
    this.coinbase = Coinbase.configureFromJson({
      filePath: process.env.COINBASE_API_KEY_PATH,
    });
  }
  
  // Get swap quote
  async getSwapQuote(params: {
    sellToken: Address;
    buyToken: Address;
    sellAmount: string;
    network: 'base';
    slippageBps: number;
  }) {
    // Implementation
  }
  
  // Check if user completed swap
  async verifySwapTransaction(
    userAddress: Address,
    txHash: string
  ): Promise<{
    isSwap: boolean;
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
  }> {
    // Parse transaction logs for Swap event
    // DEX routers emit Swap events with token addresses and amounts
  }
}
```

#### Step 3: Update Verification Logic (1-2 hours)
```typescript
// lib/quests/onchain-verification.ts

/**
 * Verify token swap
 * Strategy: Check balance changes or transaction logs
 */
export async function verifyTokenSwap(
  userAddress: Address,
  params: {
    fromToken: Address;
    toToken: Address;
    minAmountIn: bigint;
    minAmountOut: bigint;
    txHash?: string; // Optional: Verify specific transaction
  }
): Promise<VerificationResult> {
  try {
    // Option 1: Verify specific transaction (if provided)
    if (params.txHash) {
      const tradeClient = new TradeClient();
      const swapData = await tradeClient.verifySwapTransaction(
        userAddress,
        params.txHash
      );
      
      if (!swapData.isSwap) {
        return { success: false, message: 'Transaction is not a swap' };
      }
      
      if (swapData.fromToken !== params.fromToken) {
        return { success: false, message: 'Wrong source token' };
      }
      
      if (swapData.toToken !== params.toToken) {
        return { success: false, message: 'Wrong destination token' };
      }
      
      if (swapData.amountIn < params.minAmountIn) {
        return { success: false, message: 'Swap amount too low' };
      }
      
      return {
        success: true,
        message: 'Swap verified successfully',
        proof: {
          transaction_hash: params.txHash,
          verified_data: swapData,
        },
      };
    }
    
    // Option 2: Check current balance (legacy method)
    // User must have minimum balance of toToken
    const balance = await client.readContract({
      address: params.toToken,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    if (balance >= params.minAmountOut) {
      return {
        success: true,
        message: 'Token balance verified',
        proof: {
          transaction_hash: '0x',
          verified_data: { balance: balance.toString() },
        },
      };
    }
    
    return {
      success: false,
      message: `Insufficient balance. Required: ${params.minAmountOut}, Found: ${balance}`,
    };
  } catch (error) {
    console.error('Swap verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify token swap',
    };
  }
}
```

#### Step 4: Update Quest API Route (1 hour)
```typescript
// app/api/quests/verify/route.ts

// Add swap_token case
case 'swap_token': {
  const { from_token, to_token, min_amount_in, min_amount_out, tx_hash } = meta;
  
  result = await verifyTokenSwap(user as Address, {
    fromToken: from_token as Address,
    toToken: to_token as Address,
    minAmountIn: BigInt(min_amount_in || 0),
    minAmountOut: BigInt(min_amount_out || 0),
    txHash: tx_hash,
  });
  break;
}
```

#### Step 5: Test with Real Data (30 minutes)
```bash
# Update test script with real swap transaction
# Example: USDC → WETH on Base
pnpm tsx scripts/test-quest-verification.ts
```

---

### **Phase 7.2: Liquidity Provision Verification** (2-3 hours)
**Priority**: MEDIUM - Less common than swaps

#### Implementation (Layer3 Pattern)
```typescript
// lib/quests/onchain-verification.ts

/**
 * Verify liquidity provision
 * Uses Layer3 pattern: Check LP token balance
 */
export async function verifyLiquidityProvision(
  userAddress: Address,
  params: {
    poolAddress: Address; // Uniswap/BaseSwap/Aerodrome pool
    minLPTokens: bigint;
    dexName?: string; // Optional: Verify specific DEX
  }
): Promise<VerificationResult> {
  try {
    // LP tokens are ERC-20 tokens
    const lpBalance = await client.readContract({
      address: params.poolAddress,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    if (lpBalance >= params.minLPTokens) {
      return {
        success: true,
        message: 'Liquidity provision verified',
        proof: {
          transaction_hash: '0x',
          verified_data: {
            pool_address: params.poolAddress,
            lp_token_balance: lpBalance.toString(),
          },
        },
      };
    }
    
    return {
      success: false,
      message: `Insufficient LP tokens. Required: ${params.minLPTokens}, Found: ${lpBalance}`,
    };
  } catch (error) {
    console.error('Liquidity verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify liquidity provision',
    };
  }
}
```

---

### **Phase 7.3: Agent Bot Swap Commands** (6-8 hours)
**Priority**: HIGH - Viral feature for user engagement

#### Feature: Mention @gmeow with Swap Commands
**Examples**:
- `@gmeow swap 1 USDC to WETH on base` → Bot executes swap
- `@gmeow stake 0.5 ETH` → Bot stakes ETH
- `@gmeow check my swaps` → Bot shows swap history

#### Implementation Steps

**Step 1: Command Parser** (2 hours)
```typescript
// lib/agent/command-parser.ts

interface SwapCommand {
  type: 'swap';
  amount: number;
  fromToken: string; // USDC
  toToken: string;   // WETH
  chain: 'base' | 'ethereum';
  slippage?: number; // Default 1%
}

interface StakeCommand {
  type: 'stake';
  amount: number;
  token: string; // ETH, SOL
  duration?: number; // days
}

export function parseAgentCommand(text: string): SwapCommand | StakeCommand | null {
  // Parse: "swap 1 USDC to WETH on base"
  const swapRegex = /swap\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)(?:\s+on\s+(\w+))?/i;
  const swapMatch = text.match(swapRegex);
  
  if (swapMatch) {
    return {
      type: 'swap',
      amount: parseFloat(swapMatch[1]),
      fromToken: swapMatch[2].toUpperCase(),
      toToken: swapMatch[3].toUpperCase(),
      chain: (swapMatch[4]?.toLowerCase() as 'base') || 'base',
    };
  }
  
  // Parse: "stake 0.5 ETH"
  const stakeRegex = /stake\s+([\d.]+)\s+(\w+)/i;
  const stakeMatch = text.match(stakeRegex);
  
  if (stakeMatch) {
    return {
      type: 'stake',
      amount: parseFloat(stakeMatch[1]),
      token: stakeMatch[2].toUpperCase(),
    };
  }
  
  return null;
}
```

**Step 2: Agent Bot Integration** (3-4 hours)
```typescript
// lib/agent/swap-agent.ts

import { CdpAgentkit } from '@coinbase/cdp-agentkit-core';

export class SwapAgent {
  private agentkit: CdpAgentkit;
  
  constructor() {
    this.agentkit = await CdpAgentkit.configureWithWallet();
  }
  
  async executeSwap(command: SwapCommand, userFid: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      // 1. Get token addresses from symbols
      const fromTokenAddress = getTokenAddress(command.fromToken, command.chain);
      const toTokenAddress = getTokenAddress(command.toToken, command.chain);
      
      // 2. Create swap quote
      const quote = await this.agentkit.quoteSwap({
        sellToken: fromTokenAddress,
        buyToken: toTokenAddress,
        sellAmount: command.amount.toString(),
        network: command.chain,
        slippageBps: command.slippage || 100, // 1% default
      });
      
      // 3. Execute swap
      const tx = await this.agentkit.executeSwap(quote);
      
      // 4. Log swap for quest verification
      await logSwapActivity(userFid, {
        txHash: tx.transaction_hash,
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amountIn: command.amount,
        chain: command.chain,
      });
      
      return {
        success: true,
        txHash: tx.transaction_hash,
      };
    } catch (error) {
      console.error('Swap execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

**Step 3: Farcaster Webhook Integration** (2 hours)
```typescript
// app/api/webhooks/farcaster/route.ts

export async function POST(request: Request) {
  const event = await request.json();
  
  // Check if cast mentions @gmeow
  if (event.type === 'cast.created') {
    const cast = event.data;
    const mentionsBot = cast.mentions?.some((m: any) => m.fid === BOT_FID);
    
    if (mentionsBot) {
      // Parse command
      const command = parseAgentCommand(cast.text);
      
      if (command?.type === 'swap') {
        const agent = new SwapAgent();
        const result = await agent.executeSwap(command, cast.author.fid);
        
        // Reply to cast with result
        if (result.success) {
          await replyToCast(cast.hash, {
            text: `✅ Swap executed! Tx: ${result.txHash}\n\n🎉 Quest progress updated!`,
            embeds: [`https://basescan.org/tx/${result.txHash}`],
          });
        } else {
          await replyToCast(cast.hash, {
            text: `❌ Swap failed: ${result.error}`,
          });
        }
      }
    }
  }
  
  return NextResponse.json({ ok: true });
}
```

---

## 📝 Quest Metadata Schema

### **Swap Quest Metadata**
```typescript
{
  type: 'swap_token',
  meta: {
    from_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    to_token: '0x4200000000000000000000000000000000000006',   // WETH
    min_amount_in: '1000000',   // 1 USDC (6 decimals)
    min_amount_out: '0',        // Any amount out (optional)
    allowed_dexes: ['uniswap', 'baseswap', 'aerodrome'], // Optional
    tx_hash: null,              // Optional: Verify specific transaction
  }
}
```

### **Liquidity Quest Metadata**
```typescript
{
  type: 'provide_liquidity',
  meta: {
    pool_address: '0x...', // Uniswap V3 pool or BaseSwap pair
    min_lp_tokens: '1000000000000000000', // 1 LP token (18 decimals)
    dex_name: 'uniswap',   // Optional: Verify specific DEX
    token_a: '0x...',      // Optional: Verify token pair
    token_b: '0x...',
  }
}
```

### **Stake Quest Metadata**
```typescript
{
  type: 'stake_token',
  meta: {
    token: 'ETH',          // ETH, SOL, etc.
    min_amount: '1000000000000000000', // 1 ETH (18 decimals)
    network: 'ethereum',   // ethereum, solana
    validator: null,       // Optional: Specific validator
  }
}
```

---

## 🧪 Testing Strategy

### **1. Manual Testing**
```bash
# Test swap verification
curl -X POST http://localhost:3000/api/quests/verify \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "questId": 1,
    "user": "0x1234...",
    "fid": 18139,
    "actionCode": 13,
    "meta": {
      "from_token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "to_token": "0x4200000000000000000000000000000000000006",
      "min_amount_in": "1000000",
      "tx_hash": "0xabc123..."
    },
    "mode": "onchain",
    "sign": true
  }'
```

### **2. Automated Testing**
Update `scripts/test-quest-verification.ts`:
```typescript
// Add swap test case with real Base transaction
{
  name: '✅ Token Swap Verification (Real Tx)',
  category: 'onchain',
  type: 'swap_token',
  requestBody: {
    chain: 'base',
    questId: 1,
    user: TEST_USER_ADDRESS,
    fid: TEST_USER_FID,
    actionCode: ACTION_CODES.SWAP_TOKEN,
    meta: {
      from_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      to_token: '0x4200000000000000000000000000000000000006',   // WETH
      min_amount_in: '1000000', // 1 USDC
      tx_hash: '0x...', // Real transaction hash from BaseScan
    },
    mode: 'onchain',
    sign: true,
  },
  expectedSuccess: true,
  description: 'Verify real swap transaction on Base',
}
```

---

## 📚 Resources

### **Coinbase Documentation**
- **Trade API**: https://docs.cdp.coinbase.com/trade-api/welcome
- **Trade API Quickstart**: https://docs.cdp.coinbase.com/trade-api/quickstart
- **Server Wallet v2 Swaps**: https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/swaps
- **Staking API**: https://docs.cdp.coinbase.com/staking/staking-api/introduction/welcome
- **AgentKit**: https://docs.cdp.coinbase.com/agent-kit/welcome

### **Base DEX Resources**
- **Uniswap V3**: https://docs.uniswap.org/contracts/v3/reference/deployments
- **BaseSwap**: https://baseswap.fi/
- **Aerodrome**: https://aerodrome.finance/

### **Reference Implementations**
- **Layer3**: Quest verification patterns
- **Coinbase Demo Apps**: https://docs.cdp.coinbase.com/get-started/demo-apps/explore

---

## ✅ Success Criteria

### **Phase 7.1 Complete** (Swap Verification)
- [ ] Action code `SWAP_TOKEN: 13` added to QUEST_TYPES
- [ ] Coinbase Trade API client implemented
- [ ] `verifyTokenSwap()` function working with real transactions
- [ ] Test script passes swap verification with real Base tx
- [ ] Quest API route handles `swap_token` type
- [ ] Documentation updated with swap quest examples

### **Phase 7.2 Complete** (Liquidity Verification)
- [ ] Action code `PROVIDE_LIQUIDITY: 14` added
- [ ] `verifyLiquidityProvision()` working with LP tokens
- [ ] Test script passes liquidity verification
- [ ] Quest API route handles `provide_liquidity` type
- [ ] Whitelisted pool addresses documented

### **Phase 7.3 Complete** (Agent Bot)
- [ ] Command parser handles swap/stake commands
- [ ] SwapAgent executes swaps via AgentKit
- [ ] Farcaster webhook integrated
- [ ] Bot replies with transaction results
- [ ] Swap activity logged for quest verification
- [ ] User guide created for bot commands

---

## 🚀 Deployment Checklist

### **Environment Variables**
```bash
# Coinbase API
COINBASE_API_KEY_NAME=your_key_name
COINBASE_API_PRIVATE_KEY=your_private_key
COINBASE_API_KEY_PATH=/path/to/cdp_api_key.json

# AgentKit (if using)
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
```

### **Dependencies**
```json
{
  "dependencies": {
    "@coinbase/coinbase-sdk": "^0.10.0",
    "@coinbase/cdp-agentkit-core": "^0.0.11"
  }
}
```

### **API Keys Required**
1. **Coinbase Developer Platform** - https://portal.cdp.coinbase.com/
   - Create API key with Trade API permissions
   - Download JSON key file
   
2. **Neynar API** - https://neynar.com/ (for Farcaster bot)
   - Already configured (existing integration)

---

## 📌 Next Steps

1. **Add this document to FOUNDATION-REBUILD-ROADMAP.md**
   - Section: Phase 7 - Coinbase Trade API Integration
   
2. **Update QUEST_TYPES in lib/gmeow-utils.ts**
   - Add: `SWAP_TOKEN: 13`, `PROVIDE_LIQUIDITY: 14`, `STAKE_TOKEN: 15`
   
3. **Update test script with swap/liquidity test cases**
   - File: `scripts/test-quest-verification.ts`
   
4. **Create Coinbase API client wrapper**
   - File: `lib/coinbase/trade-client.ts`
   
5. **Implement swap verification logic**
   - Update: `lib/quests/onchain-verification.ts`

---

**Status**: ✅ DOCUMENTED - Ready for Phase 7 Implementation  
**Priority**: HIGH (Required for complete quest system)  
**Timeline**: 12-17 hours total (3 phases)
