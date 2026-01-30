# Analytics Query Type Fixes - Jan 8, 2026

## Summary

Fixed HTTP 400 errors in Subsquid analytics queries caused by incorrect parameter types. The Subsquid GraphQL schema uses **DateTime!** for some timestamps and **BigInt!** for others, but queries were inconsistently using the wrong types.

## Root Cause

The Subsquid indexer schema has two different timestamp field types:

**DateTime! fields** (ISO 8601 strings):
- `TipEvent.timestamp`
- `QuestCompletion.timestamp`
- `PointsTransaction.timestamp`

**BigInt! fields** (Unix timestamps in seconds):
- `GMEvent.timestamp`
- `BadgeMint.timestamp`
- `GuildEvent.timestamp`

Queries were incorrectly using `BigInt!` parameters for entities with `DateTime!` timestamps, or using incorrect conversion formats (milliseconds vs seconds, numbers vs strings).

## Affected Queries

### Fixed: DateTime! Queries

**1. getTipAnalytics()** (lib/subsquid-client.ts:1243-1279)
- **Before**: `$since: BigInt!`, converting to Unix seconds
- **After**: `$since: DateTime!`, converting to ISO 8601 strings
- **Schema**: `TipEvent.timestamp: DateTime!`

**2. getQuestCompletionAnalytics()** (lib/subsquid-client.ts:1292-1328)
- **Before**: `$since: BigInt!`, converting to Unix seconds
- **After**: `$since: DateTime!`, converting to ISO 8601 strings
- **Schema**: `QuestCompletion.timestamp: DateTime!`

**3. getPointsAnalytics()** (lib/subsquid-client.ts:1734-1790)
- **Before**: `$since: BigInt!`, converting to Unix seconds
- **After**: `$since: DateTime!`, converting to ISO 8601 strings
- **Schema**: `PointsTransaction.timestamp: DateTime!`

### Fixed: BigInt! Queries

**4. getGMEventAnalytics()** (lib/subsquid-client.ts:1390-1430)
- **Before**: `$since: String!`, converting to ISO strings
- **After**: `$since: BigInt!`, converting to Unix seconds (as strings)
- **Schema**: `GMEvent.timestamp: BigInt!`

**5. getBadgeMintAnalytics()** (lib/subsquid-client.ts:1345-1380)
- **Before**: Already correct (`$since: BigInt!`)
- **After**: Verified conversion to Unix seconds as strings
- **Schema**: `BadgeMint.timestamp: BigInt!`

**6. getGuildDepositAnalytics()** (lib/subsquid-client.ts:1437-1480)
- **Before**: Converting to milliseconds (incorrect)
- **After**: Converting to Unix seconds as strings
- **Schema**: `GuildEvent.timestamp: BigInt!`

## Conversion Rules

### For DateTime! Parameters

```typescript
// Convert JavaScript Date to ISO 8601 string
const sinceTimestamp = typeof since === 'string' 
  ? new Date(since).toISOString()
  : since.toISOString()
```

Example: `"2026-01-08T12:00:00.000Z"`

### For BigInt! Parameters

```typescript
// Convert JavaScript Date to Unix seconds (as string)
const sinceTimestamp = typeof since === 'string' 
  ? Math.floor(new Date(since).getTime() / 1000).toString()
  : Math.floor(since.getTime() / 1000).toString()
```

Example: `"1736337600"` (seconds since epoch)

**Important**: Subsquid expects BigInt values as **strings**, not numbers!

## Testing Checklist

- [x] All query type mismatches fixed
- [ ] Test getTipAnalytics() in production
- [ ] Test getQuestCompletionAnalytics() in production
- [ ] Test getPointsAnalytics() in production
- [ ] Test getGMEventAnalytics() in production
- [ ] Test getBadgeMintAnalytics() in production
- [ ] Test getGuildDepositAnalytics() in production
- [ ] Verify no HTTP 400 errors in Vercel logs
- [ ] Verify telemetry data is being collected

## Deployment

```bash
# Stage changes
git add lib/subsquid-client.ts ANALYTICS-QUERY-TYPE-FIX-JAN-8-2026.md

# Commit
git commit -m "fix(subsquid): correct DateTime/BigInt parameter types in analytics queries

- Fix getTipAnalytics: BigInt! → DateTime!
- Fix getQuestCompletionAnalytics: BigInt! → DateTime!
- Fix getPointsAnalytics: BigInt! → DateTime!
- Fix getGMEventAnalytics: String! → BigInt!
- Fix getGuildDepositAnalytics: milliseconds → seconds conversion
- Verify all BigInt values passed as strings

Resolves HTTP 400 errors in analytics queries."

# Deploy to production
git push origin main
```

## Verification

After deployment, check:

1. **Vercel logs**: Search for `[getTipAnalytics]`, `[getQuestCompletionAnalytics]`, etc.
   - Should NOT see "Cannot query field" or HTTP 400 errors
   
2. **Telemetry endpoints**: 
   - `/api/admin/telemetry` - Should return analytics data
   - Check `tipAnalytics`, `questCompletionAnalytics`, etc. have non-zero values

3. **Production API calls**:
   ```bash
   # Test analytics queries directly
   curl -X POST https://squid.subsquid.io/gmeow/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"query{tipEvents(where:{timestamp_gte:\"2026-01-01T00:00:00Z\"}){id}}"}'
   ```

## Related Issues

- **totalXP → totalScore**: Fixed separately in commit `cfc304b`
- **Guild membership query**: No field issues found (already uses correct syntax)

## Schema Reference

See `gmeow-indexer/schema.graphql` for authoritative field types:

```graphql
type TipEvent @entity {
  timestamp: DateTime!  # ← ISO 8601 string
}

type GMEvent @entity {
  timestamp: BigInt!    # ← Unix seconds
}
```

## Prevention

To prevent similar issues:

1. **Always check schema first**: Before writing queries, verify field types in `gmeow-indexer/schema.graphql`
2. **Use correct converters**: 
   - DateTime! → `.toISOString()`
   - BigInt! → `Math.floor(date.getTime() / 1000).toString()`
3. **Test queries**: Use GraphQL playground to test queries before deploying
4. **Monitor logs**: Watch for HTTP 400 / "Cannot query field" errors
