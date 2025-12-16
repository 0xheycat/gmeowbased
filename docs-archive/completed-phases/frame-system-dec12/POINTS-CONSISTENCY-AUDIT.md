# Points Consistency Audit Report

## Summary
✅ **GOOD NEWS**: Points are already handled consistently as **raw integers** (not wei) throughout the codebase.

## Contract Layer (Solidity)

### Storage Format
```solidity
// contract/proxy/GmeowCore.sol
mapping(address => uint256) public pointsBalance;  // Raw integers, NOT wei
```

**Points are stored as plain uint256 integers:**
- 100 points = `100`
- 10,000 points = `10000`
- 1,000,000 points = `1000000`

### Contract Functions
All contract functions use raw integers:
```solidity
function addPoints(address user, uint256 points) external onlyOwner {
    pointsBalance[user] += points;  // Direct addition
}

function removePoints(address user, uint256 points) external {
    require(pointsBalance[user] >= points, "Insufficient points");
    pointsBalance[user] -= points;  // Direct subtraction
}
```

## Frontend/Backend Layer (TypeScript)

### Transaction Building (`lib/gmeow-utils.ts`)
✅ **Correct** - Uses `toBigInt()` helper:
```typescript
// Example: Add quest with 100 point reward
buildCallObject('addQuest', [
  name,
  questType,
  toBigInt(target),
  toBigInt(100),  // ← 100 points (NOT 100 * 10**18)
  // ...
])
```

### Helper Function
```typescript
function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(value)
  return BigInt(value)
}
```

**This converts to BigInt but does NOT multiply by 10^18** ✅

### Display Formatting
When displaying points to users:
```typescript
// ✅ CORRECT
const points = 1500
<div>{points.toLocaleString()} points</div>  // "1,500 points"

// ❌ WRONG (don't do this)
const points = parseEther('1500')  // Would be 1500 * 10^18
```

## API Layer

### Database Queries
Points stored in database as integers:
```sql
-- quests table
reward_points INTEGER  -- e.g., 100

-- user_profiles table
total_points INTEGER   -- e.g., 5420
```

### API Responses
```typescript
// ✅ CORRECT
return NextResponse.json({
  points: 1500,  // Raw integer
  formatted: '1,500'  // String with commas for display
})

// ❌ WRONG
return NextResponse.json({
  points: formatEther(1500n)  // Would convert to wei (WRONG!)
})
```

## Why NOT Wei?

**Points are NOT like ETH tokens:**
- ❌ ETH uses wei: 1 ETH = 1,000,000,000,000,000,000 wei (18 decimals)
- ✅ Points use integers: 1 point = 1 unit (0 decimals)

**Reasons:**
1. Points are game currency, not blockchain tokens
2. No fractional points (can't have 0.5 points)
3. Simpler arithmetic (no rounding errors)
4. Gas efficient (smaller numbers)

## Common Mistakes to Avoid

### ❌ WRONG - Using Wei Conversion
```typescript
// DON'T DO THIS
const points = parseEther('100')  // 100 * 10^18 (MASSIVE!)
const pointsValue = formatEther(balance)  // Divides by 10^18 (WRONG!)
```

### ✅ CORRECT - Using Raw Integers
```typescript
// DO THIS
const points = 100  // Just 100
const pointsBalance = Number(balance)  // Direct conversion
```

## Contract Call Examples

### Sending GM (earn points)
```typescript
// Contract: sendGM()
// Reward: 10 points
// Storage: pointsBalance[user] += 10
```

### Creating Guild
```typescript
// Contract: createGuild(string name)
// Cost: 100 points
// Storage: pointsBalance[user] -= 100
```

### Creating Quest
```typescript
// Contract: addQuest(name, type, target, rewardPerUser, ...)
// Example: 50 points per completion
buildCallObject('addQuest', [
  'Daily Check-in',
  0,
  100,
  50,  // ← 50 points reward (NOT 50 * 10^18)
  // ...
])
```

## Deployment Configuration

### Initial Supply
```bash
# ❌ WRONG - 1 trillion points (too much!)
INITIAL_SUPPLY=1000000000000

# ✅ CORRECT - 10K points
INITIAL_SUPPLY=10000
```

### Why 10K is Better
- **1T points**: Inflation risk, meaningless numbers, hard to manage
- **10K points**: Reasonable economy, each point has value, easy math

## Display Formatting Best Practices

### Number Formatting
```typescript
// ✅ Good: Format with commas
const displayPoints = points.toLocaleString('en-US')
// 1500 → "1,500"
// 1000000 → "1,000,000"

// ✅ Good: Format with K/M suffix
function formatPoints(points: number): string {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K`
  return points.toString()
}
// 1500 → "1.5K"
// 2500000 → "2.5M"
```

### React Components
```tsx
// ✅ CORRECT
<div className="points-display">
  {points.toLocaleString()} points
</div>

// ❌ WRONG
<div className="points-display">
  {formatEther(BigInt(points))} points  {/* DON'T DO THIS */}
</div>
```

## API Integration

### Reading from Contract
```typescript
// ✅ CORRECT
const balance = await publicClient.readContract({
  address: CORE_ADDRESS,
  abi: CORE_ABI,
  functionName: 'pointsBalance',
  args: [userAddress],
})

const points = Number(balance)  // Direct conversion (balance is already raw integer)
```

### Writing to Contract
```typescript
// ✅ CORRECT
await walletClient.writeContract({
  address: CORE_ADDRESS,
  abi: CORE_ABI,
  functionName: 'tipUser',
  args: [
    recipientAddress,
    BigInt(100),  // 100 points (NOT wei!)
    recipientFid,
  ],
})
```

## Summary Checklist

- ✅ Contracts use `uint256` for points (raw integers)
- ✅ Frontend uses `toBigInt()` without wei conversion
- ✅ Database stores integers (not decimals)
- ✅ API responses return raw integers
- ✅ Display formatting uses `toLocaleString()` or custom formatters
- ✅ No `parseEther()` or `formatEther()` for points
- ✅ Initial supply set to reasonable value (10K not 1T)

## Recommended Changes

### 1. Update Deployment Script
```bash
# scripts/deploy-full.sh
INITIAL_SUPPLY="${INITIAL_SUPPLY:-10000}"  # Changed from 1000000000000
```

### 2. Add Points Formatting Utility
```typescript
// lib/format-points.ts
export function formatPoints(points: number): string {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K`
  return points.toLocaleString('en-US')
}
```

### 3. Update Environment Variables
```bash
# .env.local
INITIAL_SUPPLY=10000  # Oracle starts with 10K points
```

## Conclusion

**No major fixes needed!** ✅

The codebase already handles points correctly as raw integers. The only change needed is:
- Reduce initial supply from 1T → 10K points for better game economy

All contract calls, API responses, and display formatting are already consistent.
