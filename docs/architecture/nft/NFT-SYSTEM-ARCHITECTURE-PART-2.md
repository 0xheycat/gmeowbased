# NFT System Architecture - Part 2: API & Data Layer

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Status**: Production Analysis  
**Scope**: Supabase MCP, API endpoints, data consistency, best practices

---

## 6. Database Layer Deep Dive (Supabase via MCP)

### 6.1 Table Relationship Diagram

```
user_profiles (fid PK)
    ↓ 1:N
user_badges (fid FK, nft_type discriminator)
    ↓ references
nft_metadata (nft_type_id UNIQUE)

mint_queue (fid FK, badge_type)
    ↓ async processing
[Missing: Background Worker]
    ↓ calls contract
GmeowNFT.sol (Base: 0xCE95...2D5C)
    ↓ emits events
Subsquid Indexer
    ↓ inserts
nft_mints / nft_transfers (indexed events)
```

**Foreign Key Constraints**:
```sql
-- user_badges → user_profiles
ALTER TABLE user_badges ADD CONSTRAINT user_badges_fid_fkey 
    FOREIGN KEY (fid) REFERENCES user_profiles(fid);

-- mint_queue → user_profiles  
ALTER TABLE mint_queue ADD CONSTRAINT mint_queue_fid_fkey
    FOREIGN KEY (fid) REFERENCES user_profiles(fid);
```

**Missing Constraints**:
- ❌ `user_badges.nft_type_id` → `nft_metadata.nft_type_id` (FK not enforced)
- ❌ `user_badges.token_id` → `nft_mints.token_id` (no link between Supabase & Subsquid)
- ❌ `nft_transfers.to` → `user_profiles.wallet_address` (ownership tracking)

### 6.2 Data Consistency Issues

**Issue 1**: Orphaned `user_badges` records
```sql
-- Scenario: User assigned NFT in Supabase, but mint transaction fails
SELECT ub.fid, ub.nft_type, ub.minted, mq.status, mq.error
FROM user_badges ub
LEFT JOIN mint_queue mq ON ub.fid = mq.fid AND ub.badge_id = mq.badge_type
WHERE ub.nft_type = 'nft' AND ub.minted = false AND mq.status = 'failed';

-- Result: Users think they earned NFT, but onchain mint failed
-- Resolution: Retry logic + status sync
```

**Issue 2**: Stale ownership after marketplace transfers
```sql
-- User A mints NFT (token_id = 123), sells to User B on OpenSea
-- Subsquid records transfer: nft_transfers (from=UserA, to=UserB, token_id=123)
-- BUT user_badges still shows:
SELECT fid, token_id, minted FROM user_badges WHERE token_id = 123;
-- fid=UserA_FID, token_id=123, minted=true

-- Correct state should be:
-- user_badges: DELETE WHERE token_id = 123 (NFT left wallet)
-- OR: Track current owner via periodic RPC query
```

**Issue 3**: Supply count drift
```sql
-- nft_metadata.current_supply vs actual onchain count
SELECT 
    nm.nft_type_id,
    nm.current_supply AS supabase_count,
    COUNT(nftm.token_id) AS indexed_count,
    (SELECT COUNT(*) FROM user_badges WHERE nft_type_id = nm.nft_type_id AND minted = true) AS badge_count
FROM nft_metadata nm
LEFT JOIN nft_mints nftm ON nftm.nft_type = nm.nft_type_id  -- Assumes nft_mints schema update
GROUP BY nm.nft_type_id, nm.current_supply;

-- Discrepancies indicate missing sync logic
```

**Solution Pattern**: Event-driven updates via Supabase Database Webhooks
```sql
-- Webhook trigger on nft_mints INSERT
CREATE FUNCTION sync_nft_supply() RETURNS TRIGGER AS $$
BEGIN
    UPDATE nft_metadata
    SET current_supply = current_supply + 1,
        updated_at = NOW()
    WHERE nft_type_id = NEW.nft_type;  -- Requires nft_type column in nft_mints
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_nft_supply
AFTER INSERT ON nft_mints
FOR EACH ROW EXECUTE FUNCTION sync_nft_supply();
```

### 6.3 Query Patterns

#### 6.3.1 Get User's NFT Collection

**Requirement**: Display all NFTs owned by FID (current ownership, not historical)

**Naive Query** (incorrect - shows historical, not current ownership):
```sql
SELECT ub.token_id, ub.image_url, ub.nft_type_id, ub.minted_at
FROM user_badges ub
WHERE ub.fid = $1 AND ub.nft_type = 'nft' AND ub.minted = true;
```

**Problem**: Doesn't account for transfers out (marketplace sales)

**Correct Query** (requires RPC call or ownership table):
```sql
-- Option 1: Query contract directly via RPC
-- JavaScript/TypeScript:
const ownedTokenIds = []
for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
    const owner = await nftContract.ownerOf(tokenId)
    if (owner.toLowerCase() === userWallet.toLowerCase()) {
        ownedTokenIds.push(tokenId)
    }
}

-- Option 2: Maintain ownership table (updated by Subsquid)
CREATE TABLE nft_ownership (
    token_id BIGINT PRIMARY KEY,
    current_owner TEXT NOT NULL,  -- Lowercase wallet address
    previous_owner TEXT,
    transferred_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query:
SELECT no.token_id, nm.name, nm.image_url, nm.rarity
FROM nft_ownership no
JOIN nft_metadata nm ON no.token_id = ... -- Need type mapping
WHERE no.current_owner = $1;  -- User's wallet address
```

**Recommendation**: Implement Option 2 (ownership table) for scalability

#### 6.3.2 Get NFT Type Supply Stats

```sql
SELECT 
    nm.nft_type_id,
    nm.name,
    nm.rarity,
    nm.max_supply,
    COUNT(nftm.token_id) AS total_minted,
    nm.max_supply - COUNT(nftm.token_id) AS remaining,
    CASE 
        WHEN nm.max_supply = 0 THEN NULL
        ELSE (COUNT(nftm.token_id)::FLOAT / nm.max_supply * 100)
    END AS percent_minted
FROM nft_metadata nm
LEFT JOIN nft_mints nftm ON nftm.nft_type = nm.nft_type_id
WHERE nm.is_active = true
GROUP BY nm.nft_type_id, nm.name, nm.rarity, nm.max_supply
ORDER BY percent_minted DESC NULLS LAST;
```

**Use Case**: Display mint progress bars in UI

#### 6.3.3 Get Leaderboard NFT Points

**Current Implementation** (app/leaderboard/page.tsx):
```typescript
// leaderboard_calculations table has nft_points column
SELECT address, farcaster_fid, nft_points, total_score
FROM leaderboard_calculations
WHERE period = 'all_time'
ORDER BY total_score DESC
LIMIT 100;
```

**Problem**: `nft_points` calculation logic undefined
```sql
-- Current column comment: "NFT rewards + quest NFTs earned points"
-- How are points calculated?
-- - 100 points per NFT minted?
-- - Weighted by rarity (mythic=500, legendary=300, epic=200, rare=100, common=50)?
-- - Quest completion points separate from NFT ownership points?
```

**Recommendation**: Define explicit scoring formula
```sql
-- Proposed scoring (adjust multipliers as needed)
WITH nft_scores AS (
    SELECT 
        ub.fid,
        SUM(
            CASE nm.rarity
                WHEN 'mythic' THEN 500
                WHEN 'legendary' THEN 300
                WHEN 'epic' THEN 200
                WHEN 'rare' THEN 100
                WHEN 'common' THEN 50
                ELSE 0
            END
        ) AS nft_points
    FROM user_badges ub
    JOIN nft_metadata nm ON ub.nft_type_id = nm.nft_type_id
    WHERE ub.nft_type = 'nft' AND ub.minted = true
    GROUP BY ub.fid
)
UPDATE leaderboard_calculations lc
SET nft_points = COALESCE(ns.nft_points, 0),
    updated_at = NOW()
FROM nft_scores ns
WHERE lc.farcaster_fid = ns.fid;
```

### 6.4 Indexes & Performance

**Existing Indexes** (Subsquid tables):
```sql
-- nft_mints
CREATE INDEX idx_nft_mints_to ON nft_mints(to);
CREATE INDEX idx_nft_mints_block ON nft_mints(block_number);
CREATE INDEX idx_nft_mints_tx ON nft_mints(tx_hash);

-- nft_transfers
CREATE INDEX idx_nft_transfers_from ON nft_transfers(from);
CREATE INDEX idx_nft_transfers_to ON nft_transfers(to);
CREATE INDEX idx_nft_transfers_block ON nft_transfers(block_number);
CREATE INDEX idx_nft_transfers_tx ON nft_transfers(tx_hash);
```

**Missing Indexes** (Supabase tables):
```sql
-- user_badges
CREATE INDEX idx_user_badges_fid_nft ON user_badges(fid) WHERE nft_type = 'nft';
CREATE INDEX idx_user_badges_token_id ON user_badges(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_user_badges_nft_type_id ON user_badges(nft_type_id);

-- mint_queue
CREATE INDEX idx_mint_queue_status_created ON mint_queue(status, created_at) 
    WHERE status IN ('pending', 'failed');

-- nft_metadata
CREATE INDEX idx_nft_metadata_active ON nft_metadata(is_active, category);
```

**Query Optimization Example**:
```sql
-- Before (slow - full table scan):
EXPLAIN ANALYZE 
SELECT * FROM user_badges WHERE nft_type = 'nft' AND minted = true;
-- Seq Scan on user_badges (cost=0.00..1250.00 rows=500 width=...)

-- After (fast - index scan):
EXPLAIN ANALYZE 
SELECT * FROM user_badges WHERE nft_type = 'nft' AND minted = true;
-- Index Scan using idx_user_badges_fid_nft (cost=0.29..125.00 rows=500 width=...)
```

---

## 7. API Layer (Missing Implementation)

### 7.1 Required Endpoints

**Current State**: ❌ No NFT-specific API endpoints exist
```bash
grep -r "nft" app/api/
# Results:
# - app/api/badge/upload-metadata/route.ts (badge metadata only)
# - app/api/onboard/complete/route.ts (OG NFT eligibility flag)
# - app/api/farcaster/assets/route.ts (Alchemy NFT catalog for frames)
```

**Missing Endpoints**:
```
GET  /api/nft/metadata/:nftTypeId        # Get NFT type definition
GET  /api/nft/collection/:fid            # Get user's NFT collection
GET  /api/nft/token/:tokenId             # Get specific NFT details
GET  /api/nft/supply                     # Get supply stats for all types
POST /api/nft/mint                       # Queue NFT mint (admin/authorized)
GET  /api/nft/mint/status/:fid           # Check mint queue status
```

### 7.2 Endpoint Specifications

#### 7.2.1 GET /api/nft/metadata/:nftTypeId

**Purpose**: Retrieve NFT type metadata from registry

**Request**:
```typescript
GET /api/nft/metadata/legendary_quest_complete
```

**Response** (200 OK):
```json
{
  "ok": true,
  "nft": {
    "nft_type_id": "legendary_quest_complete",
    "name": "Legendary Quest NFT",
    "description": "Awarded for completing the legendary quest series",
    "rarity": "legendary",
    "category": "quest",
    "image_url": "https://storage.gmeowbased.art/nft/legendary_quest.webp",
    "animation_url": "https://storage.gmeowbased.art/nft/legendary_quest.mp4",
    "chain": "base",
    "contract_address": "0xCE9596a992e38c5fa2d997ea916a277E0F652D5C",
    "max_supply": 0,
    "current_supply": 42,
    "mint_price_wei": "0",
    "is_active": true,
    "attributes": [
      { "trait_type": "Type", "value": "Legendary" },
      { "trait_type": "Category", "value": "Quest" },
      { "trait_type": "Rarity", "value": "Epic" }
    ],
    "requirements": {
      "min_quests_completed": 50,
      "min_xp": 10000
    }
  }
}
```

**Error** (404 Not Found):
```json
{
  "ok": false,
  "error": "NFT type not found",
  "nft_type_id": "invalid_type"
}
```

**Implementation**:
```typescript
// app/api/nft/metadata/[nftTypeId]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { nftTypeId: string } }
) {
  const { nftTypeId } = params
  
  const { data, error } = await supabaseAdmin
    .from('nft_metadata')
    .select('*')
    .eq('nft_type_id', nftTypeId)
    .eq('is_active', true)
    .single()
  
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'NFT type not found', nft_type_id: nftTypeId },
      { status: 404 }
    )
  }
  
  return NextResponse.json({ ok: true, nft: data })
}
```

#### 7.2.2 GET /api/nft/collection/:fid

**Purpose**: Get all NFTs owned by a user (current ownership)

**Request**:
```typescript
GET /api/nft/collection/12345
```

**Response** (200 OK):
```json
{
  "ok": true,
  "fid": 12345,
  "wallet_address": "0x1234...5678",
  "collection": [
    {
      "token_id": 42,
      "nft_type_id": "legendary_quest_complete",
      "name": "Legendary Quest NFT",
      "image_url": "https://storage.gmeowbased.art/nft/legendary_quest.webp",
      "rarity": "legendary",
      "category": "quest",
      "minted_at": "2025-12-15T10:30:00Z",
      "tx_hash": "0xabcd...ef01",
      "metadata_uri": "ipfs://QmXxx/42.json",
      "owned_since": "2025-12-15T10:30:00Z",  // Mint date (no transfers yet)
      "marketplace_url": "https://opensea.io/assets/base/0xCE95...2D5C/42"
    },
    {
      "token_id": 137,
      "nft_type_id": "guild_founder",
      "name": "Guild Founder NFT",
      "image_url": "https://storage.gmeowbased.art/nft/guild_founder.webp",
      "rarity": "epic",
      "category": "guild",
      "minted_at": "2025-12-10T08:15:00Z",
      "tx_hash": "0x9876...4321",
      "metadata_uri": "ipfs://QmYyy/137.json",
      "owned_since": "2025-12-10T08:15:00Z",
      "marketplace_url": "https://opensea.io/assets/base/0xCE95...2D5C/137"
    }
  ],
  "total_count": 2,
  "rarity_breakdown": {
    "mythic": 0,
    "legendary": 1,
    "epic": 1,
    "rare": 0,
    "common": 0
  }
}
```

**Implementation Challenge**: Requires ownership tracking
```typescript
// Option A: Query user_badges (inaccurate after transfers)
const { data: badges } = await supabase
  .from('user_badges')
  .select('*, nft_metadata(*)')
  .eq('fid', fid)
  .eq('nft_type', 'nft')
  .eq('minted', true)

// Option B: Query contract directly (expensive, slow)
const ownedTokenIds = []
for (let i = 0; i < totalSupply; i++) {
  try {
    const owner = await nftContract.ownerOf(i)
    if (owner.toLowerCase() === userWallet.toLowerCase()) {
      ownedTokenIds.push(i)
    }
  } catch (e) {
    // Token burned or doesn't exist
  }
}

// Option C: Query ownership table (recommended, requires implementation)
const { data: owned } = await supabase
  .from('nft_ownership')  // NEW TABLE NEEDED
  .select('token_id, nft_type_id, ...')
  .eq('current_owner', userWallet.toLowerCase())
```

**Recommendation**: Implement Option C with Subsquid feeding `nft_ownership` table

#### 7.2.3 POST /api/nft/mint

**Purpose**: Queue NFT mint for authorized users/contracts

**Request**:
```json
POST /api/nft/mint
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "fid": 12345,
  "wallet_address": "0x1234...5678",
  "nft_type_id": "legendary_quest_complete",
  "metadata_override": {  // Optional custom metadata
    "name": "Special Edition Legendary Quest",
    "description": "Custom description"
  }
}
```

**Response** (202 Accepted):
```json
{
  "ok": true,
  "queue_id": 789,
  "status": "pending",
  "estimated_mint_time": "2025-12-16T12:00:00Z",
  "message": "NFT mint queued. Check status at /api/nft/mint/status/12345"
}
```

**Error** (400 Bad Request):
```json
{
  "ok": false,
  "error": "NFT type not found or inactive",
  "nft_type_id": "invalid_type"
}
```

**Error** (403 Forbidden):
```json
{
  "ok": false,
  "error": "Not authorized to mint NFTs"
}
```

**Implementation**:
```typescript
// app/api/nft/mint/route.ts
export async function POST(req: Request) {
  // 1. Validate authorization (admin API key or authorized contract)
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !validateAdminToken(authHeader)) {
    return NextResponse.json(
      { ok: false, error: 'Not authorized to mint NFTs' },
      { status: 403 }
    )
  }
  
  const { fid, wallet_address, nft_type_id, metadata_override } = await req.json()
  
  // 2. Validate NFT type exists and is active
  const { data: nftType } = await supabase
    .from('nft_metadata')
    .select('*')
    .eq('nft_type_id', nft_type_id)
    .eq('is_active', true)
    .single()
  
  if (!nftType) {
    return NextResponse.json(
      { ok: false, error: 'NFT type not found or inactive', nft_type_id },
      { status: 400 }
    )
  }
  
  // 3. Check supply limits
  if (nftType.max_supply > 0 && nftType.current_supply >= nftType.max_supply) {
    return NextResponse.json(
      { ok: false, error: 'NFT type sold out', max_supply: nftType.max_supply },
      { status: 400 }
    )
  }
  
  // 4. Insert into user_badges and mint_queue
  const { data: badge, error: badgeError } = await supabase
    .from('user_badges')
    .insert({
      fid,
      badge_id: `nft_${nft_type_id}_${Date.now()}`,
      badge_type: nft_type_id,
      nft_type: 'nft',
      nft_type_id,
      rarity: nftType.rarity,
      category: nftType.category,
      image_url: nftType.image_url,
      animation_url: nftType.animation_url,
      minted: false,
    })
    .select()
    .single()
  
  const { data: queueEntry } = await supabase
    .from('mint_queue')
    .insert({
      fid,
      wallet_address,
      badge_type: nft_type_id,
      status: 'pending',
    })
    .select()
    .single()
  
  return NextResponse.json({
    ok: true,
    queue_id: queueEntry.id,
    status: 'pending',
    estimated_mint_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),  // +5 min
    message: `NFT mint queued. Check status at /api/nft/mint/status/${fid}`,
  }, { status: 202 })
}
```

### 7.3 Authentication & Authorization

**Admin Endpoints** (mint, update supply):
```typescript
// Validate admin API key (stored in .env)
function validateAdminToken(authHeader: string): boolean {
  const token = authHeader.replace('Bearer ', '')
  return token === process.env.ADMIN_API_KEY
}
```

**User Endpoints** (get collection):
```typescript
// Validate FID ownership via Farcaster signature
async function validateFidOwnership(req: Request, fid: number): Promise<boolean> {
  const signature = req.headers.get('x-farcaster-signature')
  const message = req.headers.get('x-farcaster-message')
  
  // Verify signature matches FID's custody address
  const isValid = await verifyFarcasterSignature(signature, message, fid)
  return isValid
}
```

**Rate Limiting**:
```typescript
// Use Vercel Edge Config for rate limiting
import { ratelimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  // ... mint logic
}
```

---

## 8. Usage Surfaces

### 8.1 Frame Display (Farcaster)

**Current State**: ❌ No NFT frame implementation

**Required Frame Type**: `type=nftCollection`

**Frame Metadata Structure**:
```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://gmeowbased.art/api/frame/image?type=nftCollection&fid=12345" />
<meta property="fc:frame:post_url" content="https://gmeowbased.art/api/frame" />
<meta property="fc:frame:button:1" content="View Collection" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="https://gmeowbased.art/profile/12345?tab=nfts" />
<meta property="og:title" content="@username's NFT Collection - 5 NFTs" />
<meta property="og:description" content="1 Legendary, 2 Epic, 2 Rare - Total value: 1,500 XP" />
```

**Frame Image Generation**:
```typescript
// app/api/frame/image/route.tsx (add NFT collection type)
if (type === 'nftCollection') {
  const fid = readParam(url, 'fid', '')
  
  // Query user's NFTs
  const collection = await fetchUserNFTCollection(fid)
  
  return new ImageResponse(
    <div style={{ /* Yu-Gi-Oh card layout */ }}>
      <div style={{ /* Header: "NFT Collection" */ }} />
      
      <div style={{ /* Stats grid */ }}>
        <div>Total NFTs: {collection.length}</div>
        <div>Mythic: {collection.filter(n => n.rarity === 'mythic').length}</div>
        <div>Legendary: {collection.filter(n => n.rarity === 'legendary').length}</div>
        <div>Epic: {collection.filter(n => n.rarity === 'epic').length}</div>
      </div>
      
      <div style={{ /* NFT preview grid (3x3 thumbnails) */ }}>
        {collection.slice(0, 9).map(nft => (
          <img src={nft.image_url} style={{ width: 100, height: 100 }} />
        ))}
      </div>
      
      <div style={{ /* Footer: Rarity breakdown */ }} />
    </div>,
    { width: 1200, height: 630 }
  )
}
```

### 8.2 Leaderboard Integration

**Current Implementation**: Placeholder column

**File**: `app/leaderboard/page.tsx` (line 215-217)
```tsx
<span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">
  NFT Points
</span>
<span className="text-xs text-gray-600 dark:text-gray-400">
  Quest NFT rewards
</span>
```

**Required Data Flow**:
```typescript
// Calculate NFT points for leaderboard
async function calculateNFTPoints(fid: number): Promise<number> {
  // Option 1: Count method (simple)
  const { data: nfts } = await supabase
    .from('user_badges')
    .select('nft_type_id, rarity')
    .eq('fid', fid)
    .eq('nft_type', 'nft')
    .eq('minted', true)
  
  const pointsMap = {
    mythic: 500,
    legendary: 300,
    epic: 200,
    rare: 100,
    common: 50,
  }
  
  return nfts.reduce((sum, nft) => sum + (pointsMap[nft.rarity] || 0), 0)
}

// Update leaderboard_calculations table
await supabase
  .from('leaderboard_calculations')
  .update({ nft_points: points })
  .eq('farcaster_fid', fid)
```

**Display Component**:
```tsx
// components/LeaderboardNFTStats.tsx
export function LeaderboardNFTStats({ fid }: { fid: number }) {
  const { data: collection } = useSWR(`/api/nft/collection/${fid}`, fetcher)
  
  if (!collection || collection.total_count === 0) {
    return <div className="text-gray-500">No NFTs</div>
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="text-lg font-bold">{collection.total_count}</div>
      <div className="flex gap-1">
        {Object.entries(collection.rarity_breakdown).map(([rarity, count]) => (
          count > 0 && (
            <span key={rarity} className={`px-2 py-1 text-xs rounded ${rarityColor(rarity)}`}>
              {count} {rarity}
            </span>
          )
        ))}
      </div>
    </div>
  )
}
```

---

**End of Part 2**

**Next**: Part 3 covers architecture diagrams, best practices, external research, and production roadmap
