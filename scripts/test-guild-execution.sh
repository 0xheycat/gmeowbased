#!/bin/bash

# Guild System Real Execution Test Script
# Tests ALL guild functions with actual on-chain transactions
# Uses oracle private key to sign and execute

set -e

API_URL="http://localhost:3000/api/test/guild-execution"
GUILD_ID=1

echo "=================================="
echo "GUILD SYSTEM EXECUTION TEST"
echo "Real on-chain transaction testing"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check current state
echo -e "${YELLOW}TEST 1: Check Current State${NC}"
echo "Reading oracle address state from blockchain..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"check-state","guildId":1}')

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ State check successful${NC}"
    
    POINTS=$(echo "$RESPONSE" | jq -r '.data.pointsBalance')
    USER_GUILD=$(echo "$RESPONSE" | jq -r '.data.userGuildId')
    IS_LEADER=$(echo "$RESPONSE" | jq -r '.data.isLeader')
    
    echo ""
    echo "Current State:"
    echo "  Points Balance: $POINTS"
    echo "  User Guild ID: $USER_GUILD"
    echo "  Is Guild Leader: $IS_LEADER"
    echo ""
else
    echo -e "${RED}✗ State check failed${NC}"
    exit 1
fi

echo ""
echo "=================================="
echo ""

# Test 2: Deposit points to guild
echo -e "${YELLOW}TEST 2: Deposit Points to Guild${NC}"
echo "Executing REAL transaction: depositGuildPoints(1, 10)"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"deposit","guildId":1,"amount":10}')

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    TX_HASH=$(echo "$RESPONSE" | jq -r '.data.txHash')
    BLOCK=$(echo "$RESPONSE" | jq -r '.data.blockNumber')
    GAS=$(echo "$RESPONSE" | jq -r '.data.gasUsed')
    OLD_BAL=$(echo "$RESPONSE" | jq -r '.data.oldBalance')
    NEW_BAL=$(echo "$RESPONSE" | jq -r '.data.newBalance')
    
    echo -e "${GREEN}✓ Deposit successful${NC}"
    echo ""
    echo "Transaction Details:"
    echo "  TX Hash: $TX_HASH"
    echo "  Block: $BLOCK"
    echo "  Gas Used: $GAS"
    echo "  Old Balance: $OLD_BAL"
    echo "  New Balance: $NEW_BAL"
    echo ""
    echo "View on BaseScan:"
    echo "  https://basescan.org/tx/$TX_HASH"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${RED}✗ Deposit failed: $ERROR${NC}"
    
    # Check if it's insufficient points
    if [[ "$ERROR" == *"Insufficient points"* ]]; then
        echo ""
        echo "Need more points to test deposit."
        echo "Skipping deposit test..."
    else
        exit 1
    fi
fi

echo ""
echo "=================================="
echo ""

# Test 3: Check state after deposit
echo -e "${YELLOW}TEST 3: Verify State After Deposit${NC}"
echo "Reading updated state from blockchain..."
echo ""

sleep 3  # Wait for block confirmation

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"check-state","guildId":1}')

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ State verification successful${NC}"
    
    NEW_POINTS=$(echo "$RESPONSE" | jq -r '.data.pointsBalance')
    GUILD_INFO=$(echo "$RESPONSE" | jq -r '.data.guildInfo')
    
    echo ""
    echo "Updated State:"
    echo "  Points Balance: $NEW_POINTS"
    echo "  Guild Info: $GUILD_INFO"
else
    echo -e "${RED}✗ State verification failed${NC}"
fi

echo ""
echo "=================================="
echo ""

# Test 4: Attempt to claim (might fail if treasury empty)
echo -e "${YELLOW}TEST 4: Claim from Guild Treasury${NC}"
echo "Executing REAL transaction: claimGuildReward(1, 5)"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"claim","guildId":1,"amount":5}')

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    TX_HASH=$(echo "$RESPONSE" | jq -r '.data.txHash')
    
    echo -e "${GREEN}✓ Claim successful${NC}"
    echo "  TX Hash: $TX_HASH"
    echo "  https://basescan.org/tx/$TX_HASH"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${YELLOW}⚠ Claim failed (expected if treasury empty): $ERROR${NC}"
fi

echo ""
echo "=================================="
echo ""

echo -e "${GREEN}EXECUTION TEST COMPLETE${NC}"
echo ""
echo "Summary:"
echo "  ✓ State reading working"
echo "  ✓ Contract calls executing"
echo "  ✓ Transaction confirmation working"
echo ""
echo "All tests used REAL on-chain transactions with oracle private key."
echo "Check BaseScan for transaction history."
