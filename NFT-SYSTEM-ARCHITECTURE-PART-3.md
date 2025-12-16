# NFT System Architecture - Part 3: Architecture Diagrams, Best Practices & Roadmap

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Status**: Production Analysis  
**Scope**: System diagrams, external research, best practices, production roadmap

---

## 9. System Architecture Diagrams

### 9.1 Full Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTIONS                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐         ┌───────────────┐
│  Quest System │          │  Guild System │         │ Admin Console │
│   (Complete)  │          │ (Join/Create) │         │  (Airdrop)    │
└───────┬───────┘          └───────┬───────┘         └───────┬───────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Backend API        │
                        │ /api/quest/complete  │
                        │ /api/nft/mint        │
                        └──────────┬───────────┘
                                   │
                        ┌──────────┴───────────┐
                        │                      │
                        ▼                      ▼
        ┌───────────────────────┐   ┌──────────────────────┐
        │  Supabase Database    │   │  Notification System │
        │  - user_badges        │   │  - Push to user      │
        │  - mint_queue         │   │  - Frame update      │
        │  - nft_metadata       │   └──────────────────────┘
        └───────────┬───────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │   Background Worker      │◄──── [MISSING IMPLEMENTATION]
        │   (Edge Function/Cron)   │
        │   - Poll mint_queue      │
        │   - Call contract        │
        │   - Update status        │
        └───────────┬──────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │   GmeowNFT Contract      │
        │   (Base: 0xCE95...2D5C)  │
        │   - mint(to, type, uri)  │
        │   - batchMint(...)       │
        └───────────┬──────────────┘
                    │
                    ▼ (Event Emission)
        ┌──────────────────────────┐
        │   Transfer(from, to, id) │
        │   NFTMinted(...)         │
        └───────────┬──────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │   Subsquid Indexer       │
        │   - Listen Base RPC      │
        │   - Decode events        │
        │   - Insert entities      │
        └───────────┬──────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   nft_mints     │    │  nft_transfers   │
│   (Subsquid DB) │    │  (Subsquid DB)   │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │   Sync Worker            │◄──── [MISSING IMPLEMENTATION]
        │   - Detect new mints     │
        │   - Update user_badges   │
        │   - Update nft_ownership │
        │   - Recalc leaderboard   │
        └───────────┬──────────────┘
                    │
        ┌───────────┴────────────────────┐
        │                                │
        ▼                                ▼
┌──────────────────┐         ┌──────────────────────┐
│   user_badges    │         │  leaderboard_calcs   │
│   (minted=true)  │         │  (nft_points updated)│
└──────────┬───────┘         └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Frontend Display    │
            │   - Leaderboard       │
            │   - Profile page      │
            │   - Farcaster frames  │
            └───────────────────────┘
```

### 9.2 Marketplace Transfer Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    MARKETPLACE SALE (OpenSea/Blur)              │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    User A lists NFT (token_id = 123)
                                │
                                ▼
                    User B purchases NFT
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │   ERC721 transferFrom(A, B, 123)     │
            └───────────────┬───────────────────────┘
                            │
                            ▼ (Event Emission)
            ┌───────────────────────────────────────┐
            │   Transfer(UserA, UserB, 123)        │
            └───────────────┬───────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────────────┐
            │   Subsquid Indexer                    │
            │   - Detect Transfer event             │
            │   - from != 0x0 (not a mint)          │
            └───────────────┬───────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────────────┐
            │   INSERT INTO nft_transfers           │
            │   (token_id=123, from=A, to=B, ...)   │
            └───────────────┬───────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────────────┐
            │   [MISSING: Ownership Update Trigger] │
            │   - UPDATE nft_ownership              │
            │     SET current_owner = UserB,        │
            │         previous_owner = UserA        │
            │     WHERE token_id = 123              │
            └───────────────┬───────────────────────┘
                            │
        ┌───────────────────┴────────────────────┐
        │                                        │
        ▼                                        ▼
┌────────────────────┐            ┌──────────────────────────┐
│  Leaderboard Recalc│            │  User A Notification     │
│  - Subtract points │            │  "Your NFT was sold on   │
│    from User A     │            │   OpenSea for 0.5 ETH"   │
│  - Add points to   │            └──────────────────────────┘
│    User B          │
└────────────────────┘
```

**Critical Issue**: Steps marked `[MISSING]` are not implemented → stale ownership data

### 9.3 Minting State Machine

```
┌──────────────────────────────────────────────────────────────┐
│                   NFT MINT LIFECYCLE                          │
└──────────────────────────────────────────────────────────────┘

[1] ASSIGNED
    ├─ user_badges: { minted: false }
    ├─ mint_queue: { status: 'pending' }
    └─ Contract: No token exists yet
                │
                ▼
[2] PENDING (Background worker picks up)
    ├─ mint_queue: { status: 'minting' }
    ├─ Contract call: nftContract.mint(to, type, uri)
    └─ Wait for transaction confirmation
                │
        ┌───────┴───────┐
        │               │
        ▼ (Success)     ▼ (Failure)
[3a] MINTED         [3b] FAILED
    ├─ Event emitted    ├─ mint_queue: { status: 'failed', error: '...' }
    ├─ Subsquid indexes │ ├─ Retry logic: retry_count++
    │                   │ └─ Max retries: 3 attempts
    └─ Sync back        │
        ├─ user_badges: { minted: true, token_id: X, tx_hash: '0x...' }
        └─ mint_queue: { status: 'minted' }
```

### 9.4 Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYERS                          │
└─────────────────────────────────────────────────────────────┘

Layer 1: Smart Contract (Immutable)
    └─ GmeowNFT.sol (ERC721 + ERC2981 + Pausable)
       └─ Depends on: OpenZeppelin v5.0.0

Layer 2: Blockchain Infrastructure (External)
    ├─ Base RPC (Alchemy/Infura)
    └─ Subsquid Archive (Base mainnet)

Layer 3: Indexing Layer (Operational)
    └─ Subsquid Processor
       ├─ Input: Base RPC events
       ├─ Output: nft_mints, nft_transfers
       └─ Depends on: PostgreSQL, TypeORM

Layer 4: Database Layer (Production)
    ├─ Supabase (Primary store)
    │  ├─ nft_metadata
    │  ├─ user_badges
    │  ├─ mint_queue
    │  └─ leaderboard_calculations
    └─ Subsquid DB (Indexed events)
       ├─ nft_mints
       └─ nft_transfers

Layer 5: Backend Services (Partial)
    ├─ Next.js API Routes
    │  ├─ /api/nft/* (MISSING)
    │  ├─ /api/quest/complete (EXISTS)
    │  └─ /api/leaderboard (EXISTS)
    └─ Background Workers (MISSING)
       ├─ Mint queue processor
       └─ Ownership sync service

Layer 6: Frontend (Stub)
    ├─ Leaderboard (NFT points column exists, no data)
    ├─ Profile page (No NFT display)
    └─ Farcaster frames (No NFT frame type)
```

---

## 10. External Research: Best Practices

### 10.1 OpenSea Integration Standards

**Reference**: OpenSea NFT metadata standards (ERC721 + ERC1155)

**Metadata JSON Structure** (IPFS or API):
```json
{
  "name": "Legendary Quest #42",
  "description": "Awarded for completing the legendary quest series on Gmeowbased",
  "image": "ipfs://QmXxx/legendary_quest_42.webp",
  "external_url": "https://gmeowbased.art/nft/42",
  "background_color": "1a1a2e",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Category",
      "value": "Quest"
    },
    {
      "trait_type": "Minted Date",
      "display_type": "date",
      "value": 1734345600
    },
    {
      "trait_type": "Quest Difficulty",
      "value": "Legendary"
    },
    {
      "trait_type": "XP Bonus",
      "display_type": "number",
      "value": 300
    }
  ],
  "animation_url": "ipfs://QmYyy/legendary_quest_42.mp4"
}
```

**Collection-Level Metadata** (`contractURI()`):
```json
{
  "name": "Gmeowbased NFT Collection",
  "description": "Exclusive NFTs rewarding users for quests, guild participation, and platform milestones",
  "image": "https://storage.gmeowbased.art/collection-banner.webp",
  "external_link": "https://gmeowbased.art/nft",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0x8870C155666809609176260F2B65a626C000D773"
}
```

**Key Recommendations**:
1. **IPFS Pinning**: Use Pinata or NFT.Storage for reliable IPFS hosting
2. **Image Optimization**: WebP format (< 1MB), 1:1 aspect ratio (1000x1000px)
3. **Animation URLs**: MP4/GIF (< 10MB), short loop (2-5 seconds)
4. **Attributes**: Use `trait_type` + `value` consistently, avoid special characters
5. **Refresh Metadata**: Provide `/api/nft/refresh/:tokenId` endpoint for OpenSea

### 10.2 Zora Protocol Insights

**Reference**: Zora Creator Protocol (zora.co/collect)

**Minting Patterns**:
- **Free Mints**: Gas-subsidized via Zora protocol fee (0.000777 ETH)
- **Limited Editions**: `maxSupply` enforced onchain (e.g., 1000 editions)
- **Timed Releases**: `startTime` + `endTime` for mint windows
- **Referral Rewards**: 5% creator fee + 5% referrer fee (10% total)

**Applicable Lessons**:
```solidity
// Add timed minting constraints
uint256 public mintStartTime;
uint256 public mintEndTime;

modifier onlyDuringMintWindow() {
    require(block.timestamp >= mintStartTime, "Mint not started");
    require(block.timestamp <= mintEndTime, "Mint ended");
    _;
}

function mint(...) external onlyDuringMintWindow {
    // ... existing logic
}
```

### 10.3 Blur Marketplace Optimization

**Reference**: Blur.io NFT trading platform

**Key Features**:
1. **Trait Rarity**: Display rarity percentages (e.g., "Legendary: 2% of collection")
2. **Floor Price**: Track lowest listing price per rarity tier
3. **Bulk Actions**: Support batch listing/delisting (gas optimization)
4. **Advanced Filters**: Allow filtering by traits, rarity, price range

**Implementation Recommendations**:
```typescript
// Add to nft_metadata table
ALTER TABLE nft_metadata ADD COLUMN rarity_percentage NUMERIC;

// Calculate rarity distribution
UPDATE nft_metadata
SET rarity_percentage = (
    SELECT (current_supply::FLOAT / total_minted * 100)
    FROM (SELECT SUM(current_supply) AS total_minted FROM nft_metadata) AS t
)
WHERE nft_type_id = '...';
```

### 10.4 Farcaster-Native NFT Patterns

**Reference**: Farcaster NFT frames (paragraph.xyz, highlight.xyz)

**Frame Best Practices**:
1. **Mint Button**: Direct minting via frame action (no external redirect)
2. **Supply Counter**: Show "42/100 minted" in frame image
3. **Holder Verification**: Display "You own this NFT" badge if user is holder
4. **Share-to-Mint**: Reward users for sharing frame (viral mechanics)

**Example Frame HTML**:
```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://gmeowbased.art/api/frame/image?type=nftMint&nftType=legendary_quest" />
<meta property="fc:frame:button:1" content="Mint NFT (Free)" />
<meta property="fc:frame:button:1:action" content="tx" />
<meta property="fc:frame:button:1:target" content="https://gmeowbased.art/api/frame/mint/tx" />
<meta property="fc:frame:post_url" content="https://gmeowbased.art/api/frame/mint/success" />
```

**Transaction Frame** (`fc:frame:button:1:action=tx`):
```typescript
// /api/frame/mint/tx/route.ts
export async function POST(req: Request) {
  const { untrustedData } = await req.json()
  const fid = untrustedData.fid
  
  // Return transaction data
  return NextResponse.json({
    chainId: 'eip155:8453',  // Base
    method: 'eth_sendTransaction',
    params: {
      abi: NFT_ABI,
      to: NFT_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'mint',
        args: [userWallet, 'legendary_quest', 'ipfs://QmXxx/123.json']
      }),
      value: '0',  // Free mint
    }
  })
}
```

### 10.5 Scalability Patterns from Production NFT Systems

**Reference**: Parallel (parallel.life), Friend.tech, Rodeo.club

**Pattern 1: Lazy Minting** (Optimistic UI)
```typescript
// Don't wait for blockchain confirmation
// Show "Minting..." state immediately
const optimisticNFT = {
  token_id: null,  // Will be filled after mint
  nft_type_id: 'legendary_quest',
  status: 'pending',
  user_visible: true,  // Show in UI
}

// Update after indexer confirms
await supabase
  .from('user_badges')
  .update({ token_id: 123, status: 'minted' })
  .eq('id', optimisticNFT.id)
```

**Pattern 2: Batch Processing** (Gas optimization)
```typescript
// Accumulate mint requests in 5-minute windows
// Then batch mint to save gas (single tx for 50 users)
const pendingMints = await supabase
  .from('mint_queue')
  .select('*')
  .eq('status', 'pending')
  .gte('created_at', fiveMinutesAgo)
  .limit(50)

const recipients = pendingMints.map(m => m.wallet_address)
const types = pendingMints.map(m => m.badge_type)
const uris = pendingMints.map(m => generateMetadataURI(m))

await nftContract.batchMint(recipients, types[0], uris)  // Single tx
```

**Pattern 3: Ownership Caching** (Performance)
```typescript
// Cache ownership lookups (avoid repeated RPC calls)
const ownershipCache = new Map<number, string>()  // tokenId -> owner

async function getTokenOwner(tokenId: number): Promise<string> {
  // Check cache first
  if (ownershipCache.has(tokenId)) {
    return ownershipCache.get(tokenId)!
  }
  
  // Fetch from contract
  const owner = await nftContract.ownerOf(tokenId)
  
  // Cache for 5 minutes
  ownershipCache.set(tokenId, owner.toLowerCase())
  setTimeout(() => ownershipCache.delete(tokenId), 5 * 60 * 1000)
  
  return owner.toLowerCase()
}
```

---

## 11. Production Roadmap

### 11.1 Critical Path (Weeks 1-2)

**Priority 1: Backend Mint Worker** (Blocks all other features)
```
Status: ❌ Not started
Effort: 3 days
Blocker: All NFT minting currently non-functional

Tasks:
1. Create Edge Function: `supabase/functions/process-mint-queue/index.ts`
2. Poll mint_queue every 60 seconds
3. Call contract: nftContract.mint(wallet, type, uri)
4. Update status: pending → minting → minted/failed
5. Deploy cron job: 0 */1 * * * (every minute)

Code Skeleton:
```typescript
// supabase/functions/process-mint-queue/index.ts
Deno.serve(async (req) => {
  const { data: pending } = await supabaseAdmin
    .from('mint_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)
  
  for (const mint of pending) {
    try {
      // Update to minting
      await supabaseAdmin
        .from('mint_queue')
        .update({ status: 'minting' })
        .eq('id', mint.id)
      
      // Call contract
      const tx = await nftContract.mint(
        mint.wallet_address,
        mint.badge_type,
        generateMetadataURI(mint)
      )
      await tx.wait()
      
      // Update to minted
      await supabaseAdmin
        .from('mint_queue')
        .update({
          status: 'minted',
          tx_hash: tx.hash,
          minted_at: new Date().toISOString()
        })
        .eq('id', mint.id)
    } catch (error) {
      // Mark as failed
      await supabaseAdmin
        .from('mint_queue')
        .update({
          status: 'failed',
          error: error.message,
          retry_count: mint.retry_count + 1
        })
        .eq('id', mint.id)
    }
  }
  
  return new Response('OK', { status: 200 })
})
```

**Priority 2: NFT Metadata API Endpoints**
```
Status: ❌ Not started
Effort: 2 days
Dependency: Mint worker (for testing)

Endpoints to implement:
- GET  /api/nft/metadata/:nftTypeId
- GET  /api/nft/collection/:fid
- POST /api/nft/mint (admin only)
- GET  /api/nft/mint/status/:fid
```

**Priority 3: Subsquid Schema Update**
```
Status: ⚠️  Partial (only Transfer events indexed)
Effort: 1 day

Tasks:
1. Add nftType + metadataURI to NFTMint entity
2. Listen for NFTMinted custom event (not just Transfer)
3. Rebuild schema: sqd codegen
4. Redeploy indexer
```

### 11.2 Core Features (Weeks 3-4)

**Feature 1: Ownership Tracking**
```
Status: ❌ Not started
Effort: 3 days

Implementation:
1. Create nft_ownership table
2. Subsquid: On Transfer event, UPDATE current_owner
3. API: GET /api/nft/ownership/:tokenId
4. Periodic RPC sync (every 6 hours) to catch missed transfers
```

**Feature 2: Leaderboard Integration**
```
Status: ⚠️  Column exists, no data flow
Effort: 2 days

Tasks:
1. Define NFT scoring formula (rarity-weighted points)
2. Cron job: Recalculate nft_points every hour
3. Update leaderboard_calculations table
4. Display in frontend (already stubbed)
```

**Feature 3: Frame Display**
```
Status: ❌ Not started
Effort: 2 days

Tasks:
1. Implement /api/frame/image?type=nftCollection
2. Generate image: NFT grid + stats
3. Frame handler: /api/frame?type=nftCollection
4. Share button in profile page
```

### 11.3 Advanced Features (Weeks 5-8)

**Feature 1: Marketplace Tracking**
```
Effort: 5 days

Tasks:
1. Listen for marketplace contract events (OpenSea, Blur seaport)
2. Extract sale price, buyer, seller
3. Store in nft_sales table
4. Display price history in UI
```

**Feature 2: Metadata Refresh**
```
Effort: 2 days

Tasks:
1. API: POST /api/nft/refresh/:tokenId
2. Re-fetch metadata from IPFS/API
3. Emit MetadataUpdate event (EIP-4906)
4. Notify OpenSea/marketplaces
```

**Feature 3: Rarity Analysis**
```
Effort: 3 days

Tasks:
1. Calculate trait distribution across collection
2. Compute rarity scores (trait floor method)
3. Display rarity rank in UI (#42/1000)
```

### 11.4 Infrastructure Improvements

**Performance**:
- [ ] Redis cache for ownership lookups (reduce RPC calls)
- [ ] CDN for NFT images (Cloudflare R2)
- [ ] Database indexes on nft_mints (to, block_number, nft_type)

**Monitoring**:
- [ ] Sentry error tracking for mint failures
- [ ] Datadog metrics: mints/hour, queue depth, RPC latency
- [ ] Alert if mint queue depth > 100

**Security**:
- [ ] Rate limiting on mint API (10 requests/minute per IP)
- [ ] Admin API key rotation (monthly)
- [ ] Contract pause mechanism testing

---

## 12. Risk Assessment & Mitigation

### 12.1 Technical Risks

**Risk 1: Mint Queue Stalls**
- **Probability**: High (no worker implemented)
- **Impact**: Critical (users can't receive NFTs)
- **Mitigation**: 
  - Priority 1 implementation
  - Monitoring + alerts
  - Manual fallback (admin can manually trigger mints)

**Risk 2: Ownership Drift**
- **Probability**: Medium (marketplace transfers not tracked)
- **Impact**: High (incorrect leaderboard, stale UI)
- **Mitigation**:
  - Implement ownership table (Priority 3)
  - Periodic RPC sync (reconciliation job)
  - Display last_updated timestamp in UI

**Risk 3: Gas Price Spikes**
- **Probability**: Low (Base gas is stable ~0.001 gwei)
- **Impact**: Medium (failed mints, user frustration)
- **Mitigation**:
  - Dynamic gas price oracle
  - Retry failed mints with higher gas
  - Batch minting during low-traffic hours

### 12.2 Product Risks

**Risk 1: NFT Demand Lower Than Expected**
- **Probability**: Medium
- **Impact**: Low (existing features still work)
- **Mitigation**:
  - Start with exclusive NFTs (Mythic tier only)
  - Viral mechanics (share-to-earn)
  - Limited editions (scarcity drives demand)

**Risk 2: User Confusion (Badges vs NFTs)**
- **Probability**: High (polymorphic table design)
- **Impact**: Medium (support tickets, churn)
- **Mitigation**:
  - Clear UI labels ("Soulbound Badge" vs "Tradeable NFT")
  - Tooltips explaining difference
  - Split tables in future (cleaner architecture)

---

## 13. Testing Strategy

### 13.1 Unit Tests (Contract)

```solidity
// test/GmeowNFT.test.sol
function testMintSingleNFT() public {
    vm.prank(authorizedMinter);
    uint256 tokenId = nft.mint(user1, "LEGENDARY_QUEST", "ipfs://QmXxx/1.json");
    
    assertEq(nft.ownerOf(tokenId), user1);
    assertEq(nft.nftType(tokenId), "LEGENDARY_QUEST");
    assertEq(nft.tokenURI(tokenId), "ipfs://QmXxx/1.json");
}

function testBatchMintGasOptimization() public {
    address[] memory recipients = new address[](50);
    string[] memory uris = new string[](50);
    // ... populate arrays
    
    uint256 gasBefore = gasleft();
    nft.batchMint(recipients, "COMMON", uris);
    uint256 gasUsed = gasBefore - gasleft();
    
    // Verify gas efficiency: <100k gas per NFT
    assertTrue(gasUsed / 50 < 100000);
}
```

### 13.2 Integration Tests (Indexer)

```typescript
// gmeow-indexer/test/nft.test.ts
describe('NFT Minting', () => {
  it('should index NFTMinted event', async () => {
    const tx = await nftContract.mint(user1, 'LEGENDARY', 'ipfs://...')
    await tx.wait()
    
    // Wait for indexer to process
    await sleep(5000)
    
    const mints = await db.nftMints.findMany({
      where: { to: user1.toLowerCase() }
    })
    
    expect(mints).toHaveLength(1)
    expect(mints[0].nftType).toBe('LEGENDARY')
  })
})
```

### 13.3 E2E Tests (Full Flow)

```typescript
// playwright/tests/nft-flow.spec.ts
test('complete quest → mint NFT → display in profile', async ({ page }) => {
  // 1. Complete quest
  await page.goto('/quests/legendary-quest')
  await page.click('[data-testid="complete-quest"]')
  await expect(page.locator('.success-message')).toContainText('Quest completed!')
  
  // 2. Wait for NFT mint (background worker)
  await page.waitForTimeout(30000)  // 30 seconds
  
  // 3. Check profile page
  await page.goto('/profile/@testuser')
  await page.click('[data-testid="nft-tab"]')
  
  const nftCard = page.locator('[data-testid="nft-card-legendary"]')
  await expect(nftCard).toBeVisible()
  await expect(nftCard).toContainText('Legendary Quest NFT')
})
```

---

## 14. Appendix

### 14.1 Contract Addresses (Base Mainnet)

```
GmeowNFT:    0xCE9596a992e38c5fa2d997ea916a277E0F652D5C
GmeowBadge:  0x5Af50Ee323C45564d94B0869d95698D837c59aD2
GmeowCore:   0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73
GmeowGuild:  0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3
Referral:    0x9E7c32C1fB3a2c08e973185181512a442b90Ba44

Deployer:    0x8870C155666809609176260F2B65a626C000D773
```

### 14.2 Database Indexes (SQL)

```sql
-- Recommended indexes for production
CREATE INDEX CONCURRENTLY idx_user_badges_fid_nft 
    ON user_badges(fid) WHERE nft_type = 'nft';

CREATE INDEX CONCURRENTLY idx_user_badges_token_id 
    ON user_badges(token_id) WHERE token_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_mint_queue_pending 
    ON mint_queue(status, created_at) 
    WHERE status IN ('pending', 'failed');

CREATE INDEX CONCURRENTLY idx_nft_mints_type 
    ON nft_mints(nft_type) WHERE nft_type IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_nft_transfers_token 
    ON nft_transfers(token_id, timestamp DESC);
```

### 14.3 Environment Variables

```bash
# .env.local (required for NFT system)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0xCE9596a992e38c5fa2d997ea916a277E0F652D5C
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Admin API (backend only)
ADMIN_API_KEY=YOUR_SECURE_RANDOM_KEY_HERE
NFT_MINTER_PRIVATE_KEY=0x...  # Background worker wallet

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Admin key (server-side only)

# IPFS/Storage
PINATA_JWT=eyJ...
NFT_STORAGE_API_KEY=eyJ...
```

### 14.4 Glossary

- **ERC-721**: Non-fungible token standard (unique tokens)
- **ERC-2981**: Royalty standard (marketplace fees)
- **Soulbound**: Non-transferable NFT (locked to wallet)
- **Subsquid**: Blockchain indexing framework
- **MCP**: Model Context Protocol (Supabase AI integration)
- **Frame**: Farcaster interactive post format
- **Metadata URI**: Link to NFT JSON (image, attributes)
- **Type ID**: NFT category identifier (e.g., "LEGENDARY_QUEST")

---

## 15. Part 4 Preview: Implementation Roadmap

**Part 4 Location**: `NFT-SYSTEM-ARCHITECTURE-PART-4.md`

Part 4 will provide the **detailed implementation plan** synchronized with Parts 1-3, covering:

### Structure Overview
1. **Week-by-Week Implementation Plan** (4-week roadmap)
   - Phase 1: Critical Infrastructure (Background worker, ownership tracking, indexer fix)
   - Phase 2: API Layer Implementation (6 endpoints)
   - Phase 3: UI Components (Professional templates from TEMPLATE-SELECTION-COMPREHENSIVE.md)
   - Phase 4: Testing & Production Launch

2. **Template Selection Matrix** (NFT-specific components)
   - NFT Card Display: `gmeowbased0.6/nft-card` (0-5% adaptation)
   - Collection Grid: `jumbo-7.4/JumboCardFeatured` + `music/datatable`
   - Mint Dialog: `music/dialog` + Framer Motion animations
   - Loading States: `music/skeleton` (4 variants)
   - Tabs System: `music/tabs` (lazy loading, size variants)

3. **Detailed Task Breakdown** (Each phase with subtasks)
   - Supabase MCP migrations (table creation, indexes)
   - GitHub Actions cron setup (mint worker, sync worker)
   - API endpoint implementation (with 10-layer security)
   - Component adaptation (professional templates only)

4. **Quality Standards & Testing** (From farcaster.instructions.md)
   - Unit tests (contract functions, API endpoints)
   - Integration tests (indexer → database sync)
   - E2E tests (quest complete → NFT mint → profile display)
   - Target: 95%+ test pass rate

5. **Migration Strategy** (Avoid duplication, blockers)
   - Delete old patterns after migration complete
   - No mixing old/new components
   - Update existing docs, not create new files
   - Schema verification before all database work

**Note**: Part 4 follows all core instructions from `farcaster.instructions.md`:
- ✅ MCP-first policy (Supabase MCP, Blockscout MCP)
- ✅ GitHub Actions cron (not Vercel)
- ✅ Professional templates only (no custom components)
- ✅ 10-layer API security
- ✅ Dialog vs Notification patterns
- ✅ Icon usage (93 SVG icons, no emojis)

---

**END OF PART 3**

**Summary**: This 3-part documentation provides a comprehensive analysis of the Gmeowbased NFT system, covering smart contract architecture, database schema, indexing layer, API design, usage surfaces, best practices from production NFT systems, and a detailed production roadmap. All critical gaps and missing implementations have been identified with specific recommendations for resolution.

**Action Items**:
1. ✅ Review contract functions and events (COMPLETE)
2. ✅ Analyze Subsquid indexer implementation (COMPLETE)
3. ✅ Document database schema and relationships (COMPLETE)
4. ✅ Design API endpoint specifications (COMPLETE)
5. ✅ Create system architecture diagrams (COMPLETE)
6. ✅ Research external NFT best practices (COMPLETE)
7. ⏭️  **Next**: Create Part 4 with detailed implementation roadmap
