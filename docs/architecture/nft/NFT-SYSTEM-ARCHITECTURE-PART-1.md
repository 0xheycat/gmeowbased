# NFT System Architecture - Part 1: Smart Contract & Indexing

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Status**: Production Analysis  
**Scope**: Smart contract, Subsquid indexer, event architecture

---

## 1. Executive Summary

The Gmeowbased NFT system is a **production-deployed ERC-721 transferable NFT system** on Base chain, designed to reward users with tradeable collectibles for completing quests, joining guilds, and achieving milestones. This is distinct from the soulbound badge system (non-transferable achievements).

**Key Facts**:
- Contract Address: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C` (Base)
- Standard: ERC-721 with ERC-2981 royalties
- Deployment Block: 39,270,005
- Verified: ✅ BaseScan (Dec 11, 2025)
- Indexer: Subsquid (operational, indexing mints & transfers)
- Backend: Partially implemented (missing API endpoints)
- Frontend: Stub components exist, not fully integrated

**System Status**:
```
✅ Smart Contract: Deployed & verified
✅ Indexing Layer: Operational (Subsquid)
⚠️  Database Layer: Schema exists, no data flow
⚠️  API Layer: Missing endpoints for NFT queries
❌ UI Integration: Not implemented
❌ Frame Display: Not implemented
```

---

## 2. Smart Contract Architecture

### 2.1 Contract Overview

**File**: `contract/GmeowNFT.sol` (308 lines)  
**Inheritance Chain**: `ERC721 → ERC721URIStorage → ERC2981 → Ownable → Pausable`

The contract implements a **fully transferable NFT** system with OpenSea marketplace compatibility, IPFS metadata support, and creator royalties.

**Key Design Decisions**:
1. **Transferability**: Unlike soulbound badges, these NFTs can be sold/traded on marketplaces
2. **Type System**: Each NFT has a `nftType` (e.g., "LEGENDARY_QUEST", "RANK_TROPHY")
3. **Minting Authorization**: Multi-party minting (owner, GmeowCore contract, authorized minters)
4. **Metadata**: Supports both IPFS (`ipfs://QmXxx/`) and API endpoints (`https://api.gmeowhq.art/nft/`)
5. **Royalties**: 5% default royalty (ERC-2981 standard)

### 2.2 State Variables

```solidity
// Counter & Metadata
uint256 private _tokenIdCounter;           // Auto-incrementing token ID
string public baseURI;                     // Base URI for metadata
string public contractURI;                 // OpenSea collection metadata

// Authorization
address public gmeowContract;              // GmeowCore contract address
mapping(address => bool) public authorizedMinters;  // External minters

// NFT Type Tracking
mapping(uint256 => string) public nftType;         // tokenId => type
mapping(string => uint256) public typeMinted;      // type => count
mapping(uint256 => bool) public metadataFrozen;    // tokenId => frozen
```

**Critical Invariants**:
1. `_tokenIdCounter` is monotonically increasing (never decrements)
2. `nftType[tokenId]` is immutable once set (no update function)
3. `metadataFrozen[tokenId]` can only transition `false → true` (one-way)
4. `typeMinted[type]` is append-only (increments on mint, no decrement on burn)

### 2.3 Core Functions

#### 2.3.1 Minting Functions

**Single Mint** (`mint`):
```solidity
function mint(
    address to,
    string memory nftTypeId,
    string memory metadataURI
) external onlyAuthorized whenNotPaused returns (uint256)
```

**Parameters**:
- `to`: Recipient address (cannot be zero address)
- `nftTypeId`: Type identifier (e.g., "LEGENDARY_QUEST")
- `metadataURI`: Full metadata URI (IPFS hash or API endpoint)

**State Changes**:
1. Increments `_tokenIdCounter`
2. Mints ERC721 token via `_safeMint()`
3. Sets token URI via `_setTokenURI()`
4. Records `nftType[tokenId] = nftTypeId`
5. Increments `typeMinted[nftTypeId]`
6. Emits `NFTMinted` event

**Batch Mint** (`batchMint`):
```solidity
function batchMint(
    address[] calldata recipients,
    string memory nftTypeId,
    string[] calldata metadataURIs
) external onlyAuthorized whenNotPaused returns (uint256[] memory)
```

**Constraints**:
- `recipients.length == metadataURIs.length` (enforced via require)
- Max 100 per batch (gas optimization: `require(recipients.length <= 100)`)
- All recipients must be non-zero addresses
- All metadata URIs must be non-empty strings

**Gas Optimization**:
- Uses `calldata` for arrays (no memory copy)
- Batch updates `typeMinted` once at end: `typeMinted[nftTypeId] += recipients.length`
- Returns array of minted token IDs for frontend integration

#### 2.3.2 Authorization System

**Modifier**:
```solidity
modifier onlyAuthorized() {
    require(
        msg.sender == gmeowContract || 
        authorizedMinters[msg.sender] || 
        msg.sender == owner(),
        "Not authorized to mint"
    );
    _;
}
```

**Authorization Hierarchy**:
1. **Contract Owner**: Full control (deploy, upgrade, admin)
2. **GmeowCore Contract**: Primary minting authority (quest rewards)
3. **Authorized Minters**: External contracts/admins (airdrops, events)

**Management Function**:
```solidity
function setAuthorizedMinter(address minter, bool authorized) external onlyOwner
```

**Event**: `AuthorizedMinterUpdated(address indexed minter, bool authorized)`

**Security Considerations**:
- Single-point-of-failure: Owner can authorize/revoke minters unilaterally
- No time-lock or multi-sig requirement for authorization changes
- Authorized minters have unlimited minting power (no rate limits)

#### 2.3.3 Transfer & Burn Functions

**Standard ERC721 Transfers**:
- `transferFrom(from, to, tokenId)` - Requires owner or approved operator
- `safeTransferFrom(from, to, tokenId)` - Includes receiver check
- `safeTransferFrom(from, to, tokenId, data)` - With custom data

**Burn Function**:
```solidity
function burn(uint256 tokenId) external
```

**Authorization**:
- Token owner can burn their own NFTs
- Contract owner can burn any NFT (admin emergency function)

**Effects**:
- Removes token from circulation (reduces supply)
- Deletes token URI via `_burn()` (ERC721URIStorage cleanup)
- Does NOT decrement `typeMinted[type]` (historical record preserved)
- Emits standard `Transfer(owner, address(0), tokenId)` event

#### 2.3.4 Metadata Management

**Base URI** (Collection-Level):
```solidity
function setBaseURI(string memory baseURI_) external onlyOwner
```

Example: `https://api.gmeowhq.art/nft/` or `ipfs://QmXxx/`

**Contract URI** (OpenSea Collection):
```solidity
function setContractURI(string memory _contractURI) external onlyOwner
```

Example: `https://api.gmeowhq.art/nft/collection-metadata.json`

**Metadata Freezing**:
```solidity
function freezeMetadata(uint256 tokenId) external onlyOwner
```

**Purpose**: Permanently lock metadata for high-value NFTs
**Effect**: `metadataFrozen[tokenId] = true` (irreversible)
**Event**: `MetadataFrozen(uint256 indexed tokenId)`

**Use Case**: Prevent rug-pulls on limited edition NFTs after reveal

#### 2.3.5 Royalty System (ERC-2981)

**Default Royalty**:
```solidity
function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner
```

**Parameters**:
- `receiver`: Royalty recipient (must be non-zero address)
- `feeNumerator`: Basis points (500 = 5%, 1000 = 10%)
- Max: 10% (enforced: `require(feeNumerator <= 1000)`)

**Query Function**:
```solidity
function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 amount)
```

**Calculation**: `amount = (salePrice * feeNumerator) / 10000`

**Marketplace Support**:
- ✅ OpenSea: Full support
- ✅ Blur: Full support  
- ✅ LooksRare: Full support
- ⚠️  X2Y2: Partial support (optional royalties)

#### 2.3.6 Pausable Functions

**Pause**: `function pause() external onlyOwner`  
**Unpause**: `function unpause() external onlyOwner`

**Effect**: Blocks all minting operations (single mint & batch mint)  
**No Effect**: Transfers, burns, metadata updates continue during pause

**Use Case**: Emergency circuit breaker for suspected exploits

### 2.4 Events

#### 2.4.1 Custom Events

**NFTMinted**:
```solidity
event NFTMinted(
    address indexed recipient,
    uint256 indexed tokenId,
    string nftType,
    string metadataURI
)
```

**Emitted**: On every successful mint (single & batch)  
**Indexed Fields**: `recipient`, `tokenId` (enables efficient log filtering)  
**Non-Indexed**: `nftType`, `metadataURI` (stored in event data)

**AuthorizedMinterUpdated**:
```solidity
event AuthorizedMinterUpdated(
    address indexed minter,
    bool authorized
)
```

**BaseURIUpdated**:
```solidity
event BaseURIUpdated(string newBaseURI)
```

**ContractURIUpdated**:
```solidity
event ContractURIUpdated(string newContractURI)
```

**MetadataFrozen**:
```solidity
event MetadataFrozen(uint256 indexed tokenId)
```

#### 2.4.2 Standard ERC721 Events

**Transfer** (inherited):
```solidity
event Transfer(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
)
```

**Emitted On**:
- Mint: `from = address(0)`
- Transfer: `from != address(0) && to != address(0)`
- Burn: `to = address(0)`

**Approval** (inherited):
```solidity
event Approval(
    address indexed owner,
    address indexed approved,
    uint256 indexed tokenId
)
```

**ApprovalForAll** (inherited):
```solidity
event ApprovalForAll(
    address indexed owner,
    address indexed operator,
    bool approved
)
```

### 2.5 Edge Cases & Assumptions

**Assumption 1**: Metadata URIs are immutable
- Contract does NOT provide `setTokenURI()` function
- Once minted, URI cannot change (unless metadata server supports dynamic content)

**Assumption 2**: NFT type IDs are case-sensitive
- "LEGENDARY_QUEST" ≠ "legendary_quest"
- No validation/normalization in contract
- Responsibility: Frontend must enforce consistent casing

**Edge Case 1**: Burning does not decrement type count
```solidity
// If 10 "LEGENDARY_QUEST" NFTs minted, then 2 burned:
typeMinted["LEGENDARY_QUEST"] == 10  // Still 10 (historical record)
totalSupply() == 8                   // Only 8 in circulation
```

**Edge Case 2**: Authorization can be revoked mid-transaction
- No lock-in mechanism
- If owner calls `setAuthorizedMinter(addr, false)` in block N
- Pending transactions from `addr` in block N+1 will revert

**Edge Case 3**: Metadata freeze is permanent
- No `unfreeze()` function
- Even owner cannot unfreeze
- Use with caution for limited editions

**Edge Case 4**: Batch mint all-or-nothing
- If ANY recipient is invalid (zero address or empty URI)
- ENTIRE batch reverts (no partial minting)

---

## 3. Indexing Layer (Subsquid)

### 3.1 Architecture Overview

**Subsquid Project**: `gmeow-indexer/`  
**Network**: Base (Chain ID: 8453)  
**Contract Monitored**: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C`  
**Events Tracked**: `Transfer`, `NFTMinted`, `AuthorizedMinterUpdated`, `MetadataFrozen`

**Data Flow**:
```
Blockchain Events → Subsquid Processor → TypeORM Entities → PostgreSQL
                                                              ↓
                                                         Supabase
```

### 3.2 Entity Schema

**File**: `gmeow-indexer/schema.graphql`

**NFTMint Entity**:
```graphql
type NFTMint @entity {
  id: ID!             # Format: {txHash}-{logIndex}
  tokenId: BigInt!    # Token ID from event
  to: String! @index  # Recipient address (lowercase)
  timestamp: BigInt!  # Block timestamp (Unix seconds)
  blockNumber: Int! @index
  txHash: String! @index
}
```

**NFTTransfer Entity**:
```graphql
type NFTTransfer @entity {
  id: ID!             # Format: {txHash}-{logIndex}
  tokenId: BigInt!    # Token ID from event
  from: String! @index  # Sender address (lowercase)
  to: String! @index    # Receiver address (lowercase)
  timestamp: BigInt!  # Block timestamp (Unix seconds)
  blockNumber: Int! @index
  txHash: String! @index
}
```

**Missing Entities**:
- ❌ `NFTMetadata` (nftType, metadataURI not indexed)
- ❌ `NFTOwnership` (current owner tracking)
- ❌ `NFTTypeSupply` (per-type mint counts)

### 3.3 Event Processing

**File**: `gmeow-indexer/src/main.ts` (lines 327-372)

**Transfer Event Decoding**:
```typescript
// ERC721 Transfer signature: Transfer(address,address,uint256)
if (log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
    const from = '0x' + log.topics[1]?.slice(26).toLowerCase()
    const to = '0x' + log.topics[2]?.slice(26).toLowerCase()
    const tokenId = BigInt(log.topics[3] || '0')
    
    // Mint event (from zero address)
    if (from === '0x0000000000000000000000000000000000000000') {
        nftMints.push(new NFTMint({
            id: `${log.transaction?.id}-${log.logIndex}`,
            tokenId,
            to,
            timestamp: blockTime,
            blockNumber: block.header.height,
            txHash: log.transaction?.id || '',
        }))
    }
    // Regular transfer
    else {
        nftTransfers.push(new NFTTransfer({
            id: `${log.transaction?.id}-${log.logIndex}`,
            tokenId,
            from,
            to,
            timestamp: blockTime,
            blockNumber: block.header.height,
            txHash: log.transaction?.id || '',
        }))
    }
}
```

**Minting Logic**:
1. Detect `Transfer(0x0, recipient, tokenId)` events
2. Extract recipient from indexed topic 2
3. Extract token ID from indexed topic 3
4. Create `NFTMint` entity with transaction metadata
5. Push to batch insert array

**Transfer Logic**:
1. Detect `Transfer(sender, recipient, tokenId)` where sender ≠ 0x0
2. Extract both addresses from topics 1 & 2
3. Create `NFTTransfer` entity
4. Push to batch insert array

**Burn Detection**:
- Burns emit `Transfer(owner, 0x0, tokenId)`
- Currently treated as regular transfer (not special-cased)
- No explicit `NFTBurn` entity

### 3.4 Data Persistence

**Batch Insert**:
```typescript
// After processing all blocks in batch
await ctx.store.save(nftMints)
await ctx.store.save(nftTransfers)
```

**Performance Optimization**:
- Batch size: 100 blocks per transaction
- Index on: `to`, `from`, `blockNumber`, `txHash`
- No foreign keys to `User` entity (loose coupling)

**Database State**:
```sql
-- Current indexed state (as of Dec 16, 2025)
SELECT COUNT(*) FROM nft_mints;      -- 0 rows (no mints detected yet)
SELECT COUNT(*) FROM nft_transfers;  -- 0 rows (no transfers detected yet)
```

**Interpretation**: Either no NFTs have been minted on-chain, or indexer is not syncing NFT events.

### 3.5 Missing Indexed Data

**Critical Gap**: `NFTMinted` event data NOT captured

The custom `NFTMinted` event contains rich metadata:
```solidity
event NFTMinted(
    address indexed recipient,  // ✅ Captured via Transfer event
    uint256 indexed tokenId,    // ✅ Captured via Transfer event
    string nftType,             // ❌ NOT CAPTURED
    string metadataURI          // ❌ NOT CAPTURED
)
```

**Current Limitation**: Indexer only processes standard `Transfer` event, missing `nftType` and `metadataURI`.

**Required Enhancement**:
```typescript
// Add NFTMinted event listener
if (topic === nftInterface.getEvent('NFTMinted')?.topicHash) {
    const decoded = nftInterface.parseLog({
        topics: log.topics as string[],
        data: log.data
    })
    
    if (decoded) {
        nftMints.push(new NFTMint({
            id: `${log.transaction?.id}-${log.logIndex}`,
            tokenId: decoded.args.tokenId,
            to: decoded.args.recipient.toLowerCase(),
            nftType: decoded.args.nftType,       // NEW
            metadataURI: decoded.args.metadataURI,  // NEW
            timestamp: blockTime,
            blockNumber: block.header.height,
            txHash: log.transaction?.id || '',
        }))
    }
}
```

**Schema Update Required**:
```graphql
type NFTMint @entity {
  id: ID!
  tokenId: BigInt!
  to: String! @index
  nftType: String! @index      # ADD THIS
  metadataURI: String!         # ADD THIS
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}
```

### 3.6 Performance Characteristics

**Indexer Configuration**:
- Start Block: 39,270,005 (NFT contract deployment)
- End Block: Latest (real-time sync)
- RPC Endpoint: Base public RPC
- Block Range: 100 blocks/batch

**Estimated Throughput**:
- Base block time: ~2 seconds
- Processing lag: <10 seconds (assuming no backfill)
- Event processing: ~1ms per event (TypeORM insert)

**Scaling Considerations**:
- NFT mints are relatively infrequent (< 100/day estimated)
- Transfers more common on marketplaces (100-1000/day post-launch)
- No pagination required for current volume
- Consider archival nodes for historical queries (> 1 month old)

---

## 4. Database Schema (Supabase)

### 4.1 NFT Metadata Registry

**Table**: `nft_metadata`  
**Purpose**: Centralized registry of all NFT types available for minting

**Schema**:
```sql
CREATE TABLE nft_metadata (
    id BIGSERIAL PRIMARY KEY,
    nft_type_id VARCHAR UNIQUE NOT NULL,  -- e.g., "mythic_user_badge"
    name VARCHAR NOT NULL,                 -- Display name
    description TEXT,                      -- NFT description
    rarity VARCHAR NOT NULL                -- common|rare|epic|legendary|mythic
        CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    category VARCHAR NOT NULL              -- quest|guild|event|achievement|onboarding
        CHECK (category IN ('quest', 'guild', 'event', 'achievement', 'onboarding')),
    image_url TEXT NOT NULL,               -- NFT image URL
    animation_url TEXT,                    -- Optional animation/video
    chain VARCHAR NOT NULL CHECK (chain = 'base'),
    contract_address VARCHAR,              -- NFT contract address
    max_supply INT DEFAULT 0,              -- 0 = unlimited
    current_supply INT DEFAULT 0,          -- Current minted count
    mint_price_wei VARCHAR DEFAULT '0',    -- Mint price in wei
    is_active BOOLEAN DEFAULT TRUE,        -- Available for minting
    attributes JSONB DEFAULT '[]',         -- OpenSea attributes
    requirements JSONB DEFAULT '{}',       -- Eligibility requirements
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Data** (5 rows):
```sql
SELECT nft_type_id, name, rarity, category, max_supply, current_supply
FROM nft_metadata;

-- Expected results (admin-defined NFT types):
-- mythic_user_badge, "Mythic Pioneer Badge", mythic, onboarding, 1000, 0
-- legendary_quest_complete, "Legendary Quest NFT", legendary, quest, 0, 0
-- guild_founder, "Guild Founder NFT", epic, guild, 0, 0
-- event_attendee, "Event Attendee", rare, event, 5000, 0
-- achievement_unlock, "Achievement NFT", common, achievement, 0, 0
```

**Key Observations**:
- All `current_supply = 0` → No NFTs minted yet
- Mix of limited (max_supply > 0) and unlimited (max_supply = 0)
- Only Base chain supported (no multi-chain architecture)

### 4.2 User Badge/NFT Tracking

**Table**: `user_badges`  
**Purpose**: Hybrid table tracking BOTH badges (soulbound) AND NFTs (transferable)

**Schema**:
```sql
CREATE TABLE user_badges (
    id BIGSERIAL PRIMARY KEY,
    fid BIGINT NOT NULL REFERENCES user_profiles(fid),
    badge_id VARCHAR NOT NULL,             -- Badge/NFT identifier
    badge_type VARCHAR NOT NULL,           -- Type category
    tier VARCHAR DEFAULT 'common'          -- Rarity tier
        CHECK (tier IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    minted BOOLEAN DEFAULT FALSE,          -- Onchain minting status
    minted_at TIMESTAMPTZ,
    tx_hash TEXT,                          -- Mint transaction hash
    chain VARCHAR CHECK (chain = 'base'),
    contract_address TEXT,                 -- Contract address
    token_id BIGINT,                       -- ERC721 token ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- NFT-specific columns (Phase 6+)
    nft_type VARCHAR DEFAULT 'badge'       -- Discriminator: badge | nft
        CHECK (nft_type IN ('badge', 'nft')),
    rarity VARCHAR                         -- NFT rarity
        CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    category VARCHAR                       -- NFT category
        CHECK (category IN ('quest', 'guild', 'event', 'achievement', 'onboarding')),
    image_url TEXT,                        -- NFT image URL
    animation_url TEXT,                    -- NFT animation URL
    max_supply INT DEFAULT 0,              -- Max supply for NFT type
    current_supply INT DEFAULT 0,          -- Current minted count
    nft_type_id VARCHAR                    -- Links to nft_metadata.nft_type_id
);
```

**Design Issue**: Polymorphic table combining two distinct concepts
- **Badges**: Soulbound, non-transferable (contract: `0x5Af50Ee323C45564d94B0869d95698D837c59aD2`)
- **NFTs**: Transferable, marketplace-tradeable (contract: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C`)

**Recommendation**: Split into separate tables
```sql
-- Cleaner architecture
CREATE TABLE user_badges (...);     -- Soulbound only
CREATE TABLE user_nfts (...);       -- Transferable only
```

### 4.3 Mint Queue

**Table**: `mint_queue`  
**Purpose**: Asynchronous NFT minting queue for batch processing

**Schema**:
```sql
CREATE TABLE mint_queue (
    id BIGSERIAL PRIMARY KEY,
    fid BIGINT NOT NULL REFERENCES user_profiles(fid),
    wallet_address TEXT NOT NULL,
    badge_type VARCHAR DEFAULT 'og_member',  -- NFT type identifier
    status VARCHAR DEFAULT 'pending'         -- pending|minting|minted|failed
        CHECK (status IN ('pending', 'minting', 'minted', 'failed')),
    tx_hash TEXT,                            -- Mint transaction
    minted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error TEXT,                              -- Error message if failed
    retry_count INT DEFAULT 0
);
```

**Current Data**: 7 rows (all Mythic tier OG NFT mints)

**Usage Pattern**:
1. User completes onboarding → `INSERT INTO mint_queue (fid, wallet_address, badge_type, status) VALUES (...)` 
2. Background worker polls: `SELECT * FROM mint_queue WHERE status = 'pending' ORDER BY created_at LIMIT 100`
3. Worker calls contract: `nftContract.mint(wallet_address, badge_type, metadataURI)`
4. On success: `UPDATE mint_queue SET status = 'minted', tx_hash = '0x...', minted_at = NOW() WHERE id = ...`
5. On failure: `UPDATE mint_queue SET status = 'failed', error = '...', retry_count = retry_count + 1 WHERE id = ...`

**Missing**: Background worker implementation
- No cron job or Edge Function polling `mint_queue`
- All 7 rows stuck in `pending` state
- No retry logic for failed mints

---

## 5. Event-to-Data Flow

### 5.1 Mint Flow (End-to-End)

```
User Action (Quest Complete)
    ↓
Backend API: POST /api/quest/complete
    ↓
Business Logic: Calculate rewards
    ↓
Database: INSERT INTO user_badges (nft_type='legendary_quest', minted=false)
    ↓
Database: INSERT INTO mint_queue (badge_type='legendary_quest', status='pending')
    ↓
[MISSING: Background Worker]
    ↓
Smart Contract: nftContract.mint(recipient, 'legendary_quest', 'ipfs://QmXxx/123.json')
    ↓
Event Emission: Transfer(0x0, recipient, tokenId) + NFTMinted(recipient, tokenId, 'legendary_quest', 'ipfs://...')
    ↓
Subsquid Indexer: Detect Transfer event
    ↓
Database: INSERT INTO nft_mints (token_id, to, timestamp, block_number, tx_hash)
    ↓
[MISSING: Sync back to user_badges]
    ↓
Database: UPDATE user_badges SET minted=true, minted_at=NOW(), tx_hash='0x...', token_id=123 WHERE fid=... AND nft_type='legendary_quest'
    ↓
[MISSING: Frontend notification]
```

**Identified Gaps**:
1. ❌ Background worker for `mint_queue` processing
2. ❌ Sync mechanism: Subsquid → `user_badges` table
3. ❌ Push notification when mint completes
4. ❌ Frame image generation for NFT display

### 5.2 Transfer Flow (Marketplace Sale)

```
User Lists NFT on OpenSea/Blur
    ↓
Marketplace Contract: transferFrom(seller, buyer, tokenId)
    ↓
Event Emission: Transfer(seller, buyer, tokenId)
    ↓
Subsquid Indexer: Detect Transfer event
    ↓
Database: INSERT INTO nft_transfers (token_id, from, to, timestamp, block_number, tx_hash)
    ↓
[MISSING: Ownership update logic]
    ↓
[CURRENT ISSUE]: `user_badges` table still shows original recipient as owner
    ↓
[MISSING: Leaderboard recalculation - NFT points should transfer to new owner]
```

**Critical Gap**: Ownership tracking not implemented
- After marketplace sale, `user_badges` table remains stale
- Leaderboard "NFT Points" column incorrectly attributes to original owner
- No API to query current NFT owners

---

**End of Part 1**

**Next**: Part 2 covers database layer, API design, and usage surfaces (Frame, Leaderboard)
