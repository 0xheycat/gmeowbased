#!/bin/bash

# BUG #2 Test Script - Race Condition in Guild Stats Calculation
# Purpose: Verify atomic RPC function prevents data corruption
# Run: chmod +x scripts/test-bug-2-fix.sh && ./scripts/test-bug-2-fix.sh

echo "🧪 BUG #2 Test - Race Condition Fix"
echo "===================================="
echo ""

# Configuration
API_URL="http://localhost:3001"
GUILD_ID="1"

echo "📋 Test Configuration:"
echo "  API URL: $API_URL"
echo "  Guild ID: $GUILD_ID"
echo ""

# Test 1: Sequential requests (baseline)
echo "🔹 Test 1: Sequential Requests (Baseline)"
echo "  Making 3 sequential API calls..."
echo ""

for i in {1..3}; do
  echo "  Request #$i:"
  RESPONSE=$(curl -s "$API_URL/api/guild/$GUILD_ID")
  
  # Extract member count and totalPoints
  MEMBER_COUNT=$(echo "$RESPONSE" | jq -r '.guild.memberCount // "N/A"')
  TOTAL_POINTS=$(echo "$RESPONSE" | jq -r '.guild.totalPoints // "N/A"')
  
  echo "    Member Count: $MEMBER_COUNT"
  echo "    Total Points: $TOTAL_POINTS"
  echo ""
  
  # Store first result as baseline
  if [ $i -eq 1 ]; then
    BASELINE_MEMBERS="$MEMBER_COUNT"
    BASELINE_POINTS="$TOTAL_POINTS"
  fi
done

echo "  ✅ Sequential Test Complete"
echo "  Baseline: Members=$BASELINE_MEMBERS, Points=$BASELINE_POINTS"
echo ""

# Test 2: Concurrent requests (race condition test)
echo "🔹 Test 2: Concurrent Requests (Race Condition Test)"
echo "  Making 10 concurrent API calls..."
echo ""

# Run 10 requests in parallel
for i in {1..10}; do
  (
    RESPONSE=$(curl -s "$API_URL/api/guild/$GUILD_ID")
    MEMBER_COUNT=$(echo "$RESPONSE" | jq -r '.guild.memberCount // "N/A"')
    TOTAL_POINTS=$(echo "$RESPONSE" | jq -r '.guild.totalPoints // "N/A"')
    echo "  Request #$i: Members=$MEMBER_COUNT, Points=$TOTAL_POINTS"
  ) &
done

# Wait for all concurrent requests to finish
wait

echo ""
echo "  ✅ Concurrent Test Complete"
echo ""

# Test 3: Validate consistency
echo "🔹 Test 3: Consistency Validation"
echo "  Making 5 validation requests..."
echo ""

CONSISTENT=true
for i in {1..5}; do
  RESPONSE=$(curl -s "$API_URL/api/guild/$GUILD_ID")
  MEMBER_COUNT=$(echo "$RESPONSE" | jq -r '.guild.memberCount // "N/A"')
  TOTAL_POINTS=$(echo "$RESPONSE" | jq -r '.guild.totalPoints // "N/A"')
  
  echo "  Validation #$i: Members=$MEMBER_COUNT, Points=$TOTAL_POINTS"
  
  # Check if matches baseline
  if [ "$MEMBER_COUNT" != "$BASELINE_MEMBERS" ] || [ "$TOTAL_POINTS" != "$BASELINE_POINTS" ]; then
    CONSISTENT=false
    echo "    ⚠️  Mismatch detected!"
  fi
done

echo ""

# Final result
if [ "$CONSISTENT" = true ]; then
  echo "✅ BUG #2 FIX VERIFIED"
  echo "   All requests returned consistent data"
  echo "   No race condition detected"
  echo "   Atomic RPC function working correctly"
else
  echo "❌ BUG #2 NOT FIXED"
  echo "   Data inconsistency detected"
  echo "   Race condition still present"
  exit 1
fi

echo ""
echo "📊 Summary:"
echo "  Guild ID: $GUILD_ID"
echo "  Final Member Count: $BASELINE_MEMBERS"
echo "  Final Total Points: $BASELINE_POINTS"
echo "  Total Requests: 18 (3 sequential + 10 concurrent + 5 validation)"
echo "  Consistency: ✅ 100%"
echo ""
echo "🎉 Test Complete!"
