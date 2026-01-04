#!/bin/bash

echo "=== Testing Dashboard GraphQL Queries ==="
echo ""

# Test 1: User Stats Query
echo "1. Testing GET_USER_STATS query..."
curl -s -X POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"query GetUserStats($address: String!) { users(where: {id_eq: $address}) { id level rankTier totalScore gmPoints viralPoints questPoints xpIntoLevel xpToNextLevel pointsIntoTier pointsToNextTier } }", "variables": {"address": "0x8870c155666809609176260f2b65a626c000d773"}}' \
| jq -r 'if .errors then "❌ ERROR: " + (.errors[0].message) else "✅ SUCCESS: " + (.data.users[0].level | tostring) + " level, " + (.data.users[0].totalScore) + " score" end'
echo ""

# Test 2: Level Up Events Query
echo "2. Testing GET_USER_LEVEL_UPS query (levelUpEvents)..."
curl -s -X POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"query GetUserLevelUps($address: String!, $limit: Int) { levelUpEvents(where: {user: {id_eq: $address}}, orderBy: timestamp_DESC, limit: $limit) { id oldLevel newLevel totalScore } }", "variables": {"address": "0x8870c155666809609176260f2b65a626c000d773", "limit": 5}}' \
| jq -r 'if .errors then "❌ ERROR: " + (.errors[0].message) else "✅ SUCCESS: Found " + (.data.levelUpEvents | length | tostring) + " level up events" end'
echo ""

# Test 3: Rank Up Events Query
echo "3. Testing GET_USER_RANK_UPS query (rankUpEvents)..."
curl -s -X POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"query GetUserRankUps($address: String!, $limit: Int) { rankUpEvents(where: {user: {id_eq: $address}}, orderBy: timestamp_DESC, limit: $limit) { id oldTier newTier totalScore } }", "variables": {"address": "0x8870c155666809609176260f2b65a626c000d773", "limit": 5}}' \
| jq -r 'if .errors then "❌ ERROR: " + (.errors[0].message) else "✅ SUCCESS: Found " + (.data.rankUpEvents | length | tostring) + " rank up events" end'
echo ""

# Test 4: Recent Activity (Global)
echo "4. Testing GET_RECENT_LEVEL_UPS query (global)..."
curl -s -X POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"query GetRecentLevelUps($limit: Int) { levelUpEvents(orderBy: timestamp_DESC, limit: $limit) { id oldLevel newLevel user { id } } }", "variables": {"limit": 10}}' \
| jq -r 'if .errors then "❌ ERROR: " + (.errors[0].message) else "✅ SUCCESS: Found " + (.data.levelUpEvents | length | tostring) + " recent level ups (all users)" end'
echo ""

echo "=== All GraphQL queries tested ==="
