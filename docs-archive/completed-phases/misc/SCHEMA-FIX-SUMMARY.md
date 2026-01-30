# GraphQL Schema Fix Summary - Jan 2, 2026

## Critical Bug Discovery & Resolution

### Issue Identified
During API and component testing, discovered that GraphQL queries were using **incorrect entity names** for top-level queries.

### Root Cause
**Subsquid auto-generates top-level query names** with specific conventions:
- Entity type: `LevelUpEvent` → Query name: `levelUpEvents` (plural + full entity name)
- Entity type: `RankUpEvent` → Query name: `rankUpEvents` (plural + full entity name)  
- Entity type: `StatsUpdatedEvent` → Query name: `statsUpdatedEvents` (plural + full entity name)

**Initially incorrect assumption**: Queries used `levelUps`, `rankUps`, `statsUpdates` (truncated names)

### Schema Structure

```graphql
# Entity Definitions (schema.graphql)
type LevelUpEvent @entity {
  id: ID!
  user: User!
  oldLevel: Int!
  newLevel: Int!
  totalScore: BigInt!
  timestamp: DateTime!
}

type RankUpEvent @entity {
  id: ID!
  user: User!
  oldTier: Int!
  newTier: Int!
  totalScore: BigInt!
  timestamp: DateTime!
}

# User Relations (schema.graphql lines 52-53)
type User @entity {
  # ... other fields ...
  levelUps: [LevelUpEvent!] @derivedFrom(field: "user")    # Relation name
  rankUps: [RankUpEvent!] @derivedFrom(field: "user")       # Relation name
}
```

**Auto-Generated Top-Level Queries** (confirmed via introspection):
```graphql
type Query {
  levelUpEvents(where: ..., orderBy: ..., limit: ...): [LevelUpEvent!]!
  rankUpEvents(where: ..., orderBy: ..., limit: ...): [RankUpEvent!]!
  statsUpdatedEvents(where: ..., orderBy: ..., limit: ...): [StatsUpdatedEvent!]!
}
```

### Two Valid Query Patterns

**Pattern 1: Top-Level Query (what we use)**
```graphql
query GetUserLevelUps($address: String!) {
  levelUpEvents(where: { user: { id_eq: $address } }, orderBy: timestamp_DESC) {
    id
    oldLevel
    newLevel
  }
}
```
Response:
```json
{
  "data": {
    "levelUpEvents": [...]  // Field name matches query name
  }
}
```

**Pattern 2: User Relation (alternative)**
```graphql
query GetUserHistory($address: String!) {
  users(where: { id_eq: $address }) {
    id
    levelUps(orderBy: timestamp_DESC) {  // Relation name (different from top-level query)
      id
      oldLevel
      newLevel
    }
  }
}
```
Response:
```json
{
  "data": {
    "users": [{
      "levelUps": [...]  // Field name matches relation name
    }]
  }
}
```

### Fixes Applied

**Files Modified**: 2
1. `lib/graphql/queries/user-history.ts` - 7 query corrections
2. `hooks/useUserHistory.ts` - 2 data extraction corrections

**Query Corrections** (7 fixes):
- `GET_USER_LEVEL_UPS`: Uses `levelUpEvents` (top-level query)
- `GET_USER_RANK_UPS`: Uses `rankUpEvents` (top-level query)
- `GET_USER_STATS_HISTORY`: Uses `statsUpdatedEvents` (top-level query)
- `GET_USER_COMPLETE_HISTORY`: Uses `levelUpEvents` + `rankUpEvents`
- `GET_RECENT_LEVEL_UPS`: Uses `levelUpEvents` (global query)
- `GET_RECENT_RANK_UPS`: Uses `rankUpEvents` (global query)
- `GET_STATS_BY_TRIGGER`: Uses `statsUpdatedEvents` (filtered query)

**Hook Data Extraction** (2 fixes):
```typescript
// hooks/useUserHistory.ts

// Line ~190: Main useUserHistory hook
const levelUps = data?.levelUpEvents || []      // Matches query response field
const rankUps = data?.rankUpEvents || []        // Matches query response field
const statsUpdates = data?.statsUpdatedEvents || []  // Matches query response field

// Line ~259: useRecentActivity hook
const levelUps = levelUpData?.levelUpEvents || []
const rankUps = rankUpData?.rankUpEvents || []
```

### Testing Results

**All queries validated working**:

| Test | Query Name | Result |
|------|-----------|--------|
| User Stats | `users` | ✅ Level 3, 910 score |
| User Level Ups | `levelUpEvents` | ✅ Found 1 event |
| User Rank Ups | `rankUpEvents` | ✅ Found 1 event |
| Recent Activity | `levelUpEvents` (global) | ✅ Found 1 event |

**Production API**: `https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql`

### Lessons Learned

1. **Subsquid Naming Convention**: Entity type `FooBarEvent` → Top-level query `fooBarEvents`
2. **Relations vs Top-Level**: `User.levelUps` (relation) ≠ `Query.levelUpEvents` (top-level)
3. **GraphQL Introspection**: Always verify schema with `__schema` query before assuming field names
4. **Response Field Matching**: Response field name matches query field name (not entity type)

### Next Steps
1. ✅ Queries corrected and validated
2. ⏳ Test dashboard components in browser
3. ⏳ Verify data displays correctly in UI
4. ⏳ Check error boundaries and loading states
