#!/bin/bash
# Mainnet Integration Testing Script
# Run after Guild contract is redeployed and oracle wallet is funded

set -e  # Exit on error

source .env.local

# Contract addresses
CORE_ADDR=0x343829A6A613d51B4A81c2dE508e49CA66D4548d
GUILD_ADDR="<UPDATE_AFTER_REDEPLOY>"  # ❌ Must update with new Guild address
REF_ADDR=0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df
SCORING_ADDR=0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6
BADGE_ADDR=0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb

TEST_USER=$ORACLE_ADDRESS

echo "🧪 ==============================================="
echo "   MAINNET INTEGRATION TESTING SUITE"
echo "   ==============================================="
echo ""
echo "📍 Contract Addresses:"
echo "   Core:    $CORE_ADDR"
echo "   Guild:   $GUILD_ADDR"
echo "   Ref:     $REF_ADDR"
echo "   Scoring: $SCORING_ADDR"
echo "   Badge:   $BADGE_ADDR"
echo ""
echo "👤 Test User: $TEST_USER"
echo ""

# Check balance
BALANCE=$(cast balance $ORACLE_ADDRESS --rpc-url $RPC_BASE --ether)
echo "💰 Oracle Balance: $BALANCE ETH"
if (( $(echo "$BALANCE < 0.005" | bc -l) )); then
    echo "⚠️  WARNING: Low balance. Recommended: 0.01 ETH for full testing"
    echo ""
fi

echo "🧪 ==============================================="
echo "   PHASE 1: AUTHORIZATION CHECKS"
echo "   ==============================================="
echo ""

# Test 1: Check authorizations
echo "TEST 1: ScoringModule Authorizations"
CORE_AUTH=$(cast call $SCORING_ADDR "authorizedContracts(address)" $CORE_ADDR --rpc-url $RPC_BASE)
GUILD_AUTH=$(cast call $SCORING_ADDR "authorizedContracts(address)" $GUILD_ADDR --rpc-url $RPC_BASE)
REF_AUTH=$(cast call $SCORING_ADDR "authorizedContracts(address)" $REF_ADDR --rpc-url $RPC_BASE)

echo "  Core authorized:     $CORE_AUTH (expect: 0x...01)"
echo "  Guild authorized:    $GUILD_AUTH (expect: 0x...01)"
echo "  Referral authorized: $REF_AUTH (expect: 0x...01)"
echo ""

# Test 2: Check connections
echo "TEST 2: Module Connections to ScoringModule"
CORE_SCORING=$(cast call $CORE_ADDR "scoringModule()" --rpc-url $RPC_BASE)
GUILD_SCORING=$(cast call $GUILD_ADDR "scoringModule()" --rpc-url $RPC_BASE)
REF_SCORING=$(cast call $REF_ADDR "scoringModule()" --rpc-url $RPC_BASE)

echo "  Core.scoringModule:     $CORE_SCORING"
echo "  Guild.scoringModule:    $GUILD_SCORING"
echo "  Referral.scoringModule: $REF_SCORING"
echo "  Expected:               0x000000000000000000000000decfdc900dd1dbd6f947d3558143aa8374413bd6"
echo ""

echo "🧪 ==============================================="
echo "   PHASE 2: BASELINE STATE"
echo "   ==============================================="
echo ""

# Test 3: Get baseline stats
echo "TEST 3: Initial User Stats"
STATS=$(cast call $SCORING_ADDR "getUserStats(address)" $TEST_USER --rpc-url $RPC_BASE)
echo "  Raw stats: $STATS"
echo ""

TOTAL_SCORE=$(cast call $SCORING_ADDR "totalScore(address)" $TEST_USER --rpc-url $RPC_BASE)
echo "  Total score: $TOTAL_SCORE"
echo ""

echo "🧪 ==============================================="
echo "   PHASE 3: WRITE OPERATIONS (Requires Funds)"
echo "   ==============================================="
echo ""

read -p "⚠️  Proceed with write operations? This will cost gas. (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Skipping write operations"
    exit 0
fi

# Test 4: Core - Award GM points
echo "TEST 4: Award GM Points (Core Integration)"
echo "  Awarding points via Core contract..."
TX=$(cast send $CORE_ADDR "setGmSentCountForTest(address,uint256)" $TEST_USER 5 \
    --rpc-url $RPC_BASE \
    --private-key $ORACLE_PRIVATE_KEY \
    --legacy 2>&1)

if echo "$TX" | grep -q "transactionHash"; then
    TX_HASH=$(echo "$TX" | grep "transactionHash" | awk '{print $2}')
    echo "  ✅ TX: $TX_HASH"
    echo "  Checking updated score..."
    sleep 3
    NEW_SCORE=$(cast call $SCORING_ADDR "totalScore(address)" $TEST_USER --rpc-url $RPC_BASE)
    echo "  New total score: $NEW_SCORE"
else
    echo "  ❌ Failed: $TX"
fi
echo ""

# Test 5: Badge minting
echo "TEST 5: Badge Minting"
echo "  Minting achievement badge..."
TX=$(cast send $BADGE_ADDR "mint(address,string)" $TEST_USER "TEST_BADGE" \
    --rpc-url $RPC_BASE \
    --private-key $ORACLE_PRIVATE_KEY \
    --legacy 2>&1)

if echo "$TX" | grep -q "transactionHash"; then
    TX_HASH=$(echo "$TX" | grep "transactionHash" | awk '{print $2}')
    echo "  ✅ TX: $TX_HASH"
    echo "  Checking badge balance..."
    sleep 3
    BADGE_COUNT=$(cast call $BADGE_ADDR "balanceOf(address)" $TEST_USER --rpc-url $RPC_BASE)
    echo "  Badge count: $BADGE_COUNT"
else
    echo "  ❌ Failed: $TX"
fi
echo ""

# Test 6: Guild creation (if Guild redeployed)
if [ "$GUILD_ADDR" != "<UPDATE_AFTER_REDEPLOY>" ]; then
    echo "TEST 6: Guild Creation"
    echo "  Creating test guild..."
    TX=$(cast send $GUILD_ADDR "createGuild(string)" "Test Guild Integration" \
        --rpc-url $RPC_BASE \
        --private-key $ORACLE_PRIVATE_KEY \
        --legacy 2>&1)
    
    if echo "$TX" | grep -q "transactionHash"; then
        TX_HASH=$(echo "$TX" | grep "transactionHash" | awk '{print $2}')
        echo "  ✅ TX: $TX_HASH"
        echo "  Checking points deducted..."
        sleep 3
        AFTER_SCORE=$(cast call $SCORING_ADDR "totalScore(address)" $TEST_USER --rpc-url $RPC_BASE)
        echo "  Score after guild creation: $AFTER_SCORE"
    else
        echo "  ❌ Failed: $TX"
    fi
else
    echo "TEST 6: Guild Creation - SKIPPED (Guild not redeployed)"
fi
echo ""

# Test 7: Referral system
echo "TEST 7: Referral System"
echo "  Setting referrer..."
REFERRER="0x0000000000000000000000000000000000000001"  # Dummy address
TX=$(cast send $REF_ADDR "setReferrer(address)" $REFERRER \
    --rpc-url $RPC_BASE \
    --private-key $ORACLE_PRIVATE_KEY \
    --legacy 2>&1)

if echo "$TX" | grep -q "transactionHash"; then
    TX_HASH=$(echo "$TX" | grep "transactionHash" | awk '{print $2}')
    echo "  ✅ TX: $TX_HASH"
else
    echo "  ❌ Failed: $TX"
fi
echo ""

echo "🧪 ==============================================="
echo "   PHASE 4: FINAL STATE CHECK"
echo "   ==============================================="
echo ""

echo "TEST 8: Final User Stats"
FINAL_STATS=$(cast call $SCORING_ADDR "getUserStats(address)" $TEST_USER --rpc-url $RPC_BASE)
echo "  Raw stats: $FINAL_STATS"
echo ""

FINAL_SCORE=$(cast call $SCORING_ADDR "totalScore(address)" $TEST_USER --rpc-url $RPC_BASE)
echo "  Final total score: $FINAL_SCORE"
echo ""

BREAKDOWN=$(cast call $SCORING_ADDR "getScoreBreakdown(address)" $TEST_USER --rpc-url $RPC_BASE)
echo "  Score breakdown: $BREAKDOWN"
echo ""

echo "✅ Testing Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Review all test results above"
echo "   2. If all passed, update Subsquid indexer"
echo "   3. Deploy frontend with new contract addresses"
echo "   4. Monitor Blockscout for event emissions"
