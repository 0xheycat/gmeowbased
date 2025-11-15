# Frame Mint Buttons

## Overview

Frame Mint Buttons enable users to mint NFT badges and achievements directly from Farcaster frames. This feature is integrated across Quest, Guild, and Leaderboard frames, providing seamless on-chain minting experiences.

## Features

### Mint Action Support
- **Native Frame Minting**: Uses Farcaster frame `mint` action
- **Multi-Chain**: Supports Base, Optimism, and other EVM chains
- **Gas Abstraction**: Handles gas estimation and transaction management
- **Status Tracking**: Real-time mint progress feedback

### Supported NFT Types

#### Achievement Badges
- Quest completion badges
- Milestone achievement NFTs
- Event participation tokens

#### Guild Badges
- Membership badges (bronze, silver, gold)
- Guild leader badges
- Guild achievement commemoratives

#### Rank Cards
- Leaderboard position NFTs
- Seasonal rank cards
- Special event rankings

## Technical Implementation

### Frame Button Configuration

```typescript
interface MintButton {
  label: string
  action: 'mint'
  target: string  // EIP-155 format: eip155:8453:0x...
}
```

### EIP-155 Format

```typescript
// Format: eip155:{chainId}:{contractAddress}:{tokenId}
const mintTarget = `eip155:8453:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb:1`

// Parse helper
function parseMintTarget(target: string) {
  const [, chainId, contract, tokenId] = target.split(':')
  return { chainId: parseInt(chainId), contract, tokenId }
}
```

### Frame Metadata

```html
<!-- Quest Frame with Mint Button -->
<meta property="fc:frame:button:2" content="Mint Badge" />
<meta property="fc:frame:button:2:action" content="mint" />
<meta property="fc:frame:button:2:target" content="eip155:8453:0x..." />
```

## Integration Examples

### Quest Frame

```typescript
// app/api/frame/quest/[id]/route.ts
export async function GET(req: Request, { params }) {
  const quest = await getQuest(params.id)
  const nftContract = await getQuestNFTContract(quest.id)
  
  const frame = {
    version: 'vNext',
    image: `${BASE_URL}/api/og/quest/${quest.id}`,
    imageAspectRatio: '1.91:1',
    buttons: [
      {
        label: 'Start Quest',
        action: 'post',
        target: `${BASE_URL}/api/frame/quest/${quest.id}/start`
      },
      {
        label: 'Mint Badge',
        action: 'mint',
        target: `eip155:8453:${nftContract.address}:${quest.badge_token_id}`
      }
    ]
  }
  
  return new Response(JSON.stringify(frame), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Guild Frame

```typescript
// app/api/frame/guild/[id]/route.ts
export async function GET(req: Request, { params }) {
  const guild = await getGuild(params.id)
  const badgeContract = await getGuildBadgeContract(guild.id)
  
  const frame = {
    version: 'vNext',
    image: `${BASE_URL}/api/og/guild/${guild.id}`,
    buttons: [
      {
        label: 'Join Guild',
        action: 'post',
        target: `${BASE_URL}/api/frame/guild/${guild.id}/join`
      },
      {
        label: 'Mint Badge',
        action: 'mint',
        target: `eip155:8453:${badgeContract.address}:${guild.tier_token_id}`
      }
    ]
  }
  
  return new Response(JSON.stringify(frame))
}
```

### Leaderboard Frame

```typescript
// app/api/frame/leaderboard/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const period = searchParams.get('period') || 'all-time'
  
  const userRank = await getUserRank(userId, period)
  const rankCardContract = await getRankCardContract()
  
  const frame = {
    version: 'vNext',
    image: `${BASE_URL}/api/og/leaderboard?userId=${userId}&period=${period}`,
    buttons: [
      {
        label: 'View Full Board',
        action: 'link',
        target: `${BASE_URL}/leaderboard?period=${period}`
      },
      {
        label: 'Mint Rank Card',
        action: 'mint',
        target: `eip155:8453:${rankCardContract.address}:${userRank.rank}`
      }
    ]
  }
  
  return new Response(JSON.stringify(frame))
}
```

## Smart Contract Integration

### GmeowMultiChain Contract

```solidity
// contract/GmeowMultiChain.sol
contract GmeowMultiChain {
  mapping(uint256 => bool) public questBadges;
  mapping(uint256 => bool) public guildBadges;
  mapping(uint256 => bool) public rankCards;
  
  function mintQuestBadge(uint256 questId) external {
    require(questBadges[questId], "Badge not configured");
    _mint(msg.sender, questId, 1, "");
  }
  
  function mintGuildBadge(uint256 guildId) external {
    require(guildBadges[guildId], "Badge not configured");
    _mint(msg.sender, guildId, 1, "");
  }
  
  function mintRankCard(uint256 rank) external {
    require(rankCards[rank], "Card not configured");
    _mint(msg.sender, rank, 1, "");
  }
}
```

### Deployment Addresses

```typescript
const CONTRACTS = {
  base: {
    mainnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    testnet: '0x...'
  },
  optimism: {
    mainnet: '0x...',
    testnet: '0x...'
  }
}
```

## Mint Flow

### User Journey

1. **View Frame**: User sees quest/guild/leaderboard frame
2. **Click Mint**: User clicks "Mint Badge" button
3. **Wallet Connect**: Frame client prompts wallet connection
4. **Transaction**: Smart contract mint transaction initiated
5. **Confirmation**: User receives NFT and confirmation

### Technical Flow

```typescript
// 1. Frame displays mint button
<button data-frame-action="mint" data-frame-target="eip155:8453:...">
  Mint Badge
</button>

// 2. Client detects mint action
const mintAction = button.dataset.frameAction
const mintTarget = button.dataset.frameTarget

// 3. Parse target
const { chainId, contract, tokenId } = parseMintTarget(mintTarget)

// 4. Execute mint
const tx = await wagmiClient.writeContract({
  address: contract as `0x${string}`,
  abi: GmeowMultiChainABI,
  functionName: 'mint',
  args: [tokenId],
  chainId
})

// 5. Wait for confirmation
await wagmiClient.waitForTransaction({ hash: tx.hash })
```

## Button Placement

### Primary Actions
Place mint buttons as secondary actions after main CTA:

```typescript
buttons: [
  { label: 'Primary Action', action: 'post' },  // Button 1
  { label: 'Mint Badge', action: 'mint' }       // Button 2
]
```

### Multiple Mint Options
Show different badge tiers:

```typescript
buttons: [
  { label: 'Mint Bronze', action: 'mint', target: '...:1' },
  { label: 'Mint Silver', action: 'mint', target: '...:2' },
  { label: 'Mint Gold', action: 'mint', target: '...:3' }
]
```

## Eligibility Checks

### Quest Completion

```typescript
async function canMintQuestBadge(
  userId: string,
  questId: string
): Promise<boolean> {
  const progress = await getQuestProgress(userId, questId)
  return progress.completed
}
```

### Guild Membership

```typescript
async function canMintGuildBadge(
  userId: string,
  guildId: string
): Promise<boolean> {
  const member = await getGuildMember(userId, guildId)
  return member !== null && member.status === 'active'
}
```

### Rank Threshold

```typescript
async function canMintRankCard(
  userId: string,
  minRank: number
): Promise<boolean> {
  const rank = await getUserRank(userId)
  return rank <= minRank
}
```

## Testing

### Unit Tests

```typescript
describe('Frame Mint Buttons', () => {
  it('should generate valid EIP-155 target', () => {
    const target = generateMintTarget(8453, CONTRACT_ADDRESS, 1)
    expect(target).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}:\d+$/)
  })
  
  it('should include mint button in quest frame', async () => {
    const frame = await buildQuestFrame('quest-123')
    const mintButton = frame.buttons.find(b => b.action === 'mint')
    expect(mintButton).toBeDefined()
  })
})
```

### E2E Tests

```typescript
test('user can mint badge from frame', async ({ page }) => {
  await page.goto('/frame/quest/123')
  
  // Click mint button
  await page.click('[data-frame-action="mint"]')
  
  // Connect wallet (mock)
  await page.click('[data-testid="connect-wallet"]')
  
  // Confirm transaction (mock)
  await page.click('[data-testid="confirm-transaction"]')
  
  // Verify success
  await expect(page.locator('.mint-success')).toBeVisible()
})
```

## Performance

- **Metadata Generation**: <50ms per frame
- **Contract Calls**: <200ms (cached)
- **Image Generation**: <500ms (CDN cached)
- **Total Frame Load**: <1s (p95)

## Best Practices

### Button Labels
- Keep concise: "Mint Badge", "Claim NFT"
- Show badge type: "Mint Gold Badge"
- Include urgency: "Mint Limited Edition"

### Eligibility
- Check completion before showing mint button
- Show locked state for ineligible users
- Display requirements clearly

### Error Handling
- Handle insufficient gas gracefully
- Retry failed transactions
- Show clear error messages

### Gas Optimization
- Batch mint multiple badges
- Use efficient contract functions
- Consider gas sponsorship for special events

## Related

- [Bot Frame Display](./bot-frame-display.md)
- [NFT Minting System](./nft-minting.md)
- [Smart Contracts](../api/smart-contracts.md)
- [Frame API](../api/frames.md)

## Troubleshooting

### Mint Button Not Appearing
- Check quest/guild completion status
- Verify contract deployment on target chain
- Ensure token ID is configured correctly

### Transaction Failing
- Verify user has sufficient gas
- Check contract mint function is callable
- Ensure user hasn't already minted (if soulbound)
- Review contract event logs

### Wrong NFT Minted
- Verify EIP-155 target format
- Check contract address and token ID mapping
- Review badge configuration in database
