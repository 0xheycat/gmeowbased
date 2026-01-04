#!/bin/bash
# Deploy refactored Guild and Referral modules to Base Mainnet
# Dec 31, 2025

source .env.local

# Contract addresses
CORE_ADDR=0x343829A6A613d51B4A81c2dE508e49CA66D4548d
SCORING_ADDR=0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6

echo "🚀 Deploying refactored modules to Base Mainnet..."
echo ""

# Deploy Guild
echo "1. Deploying GuildModule..."
GUILD_BYTECODE=$(forge inspect contract/GmeowGuildStandalone.sol:GmeowGuildStandalone bytecode)
GUILD_CONSTRUCTOR=$(cast abi-encode "constructor(address)" $CORE_ADDR)

GUILD_TX=$(cast send --create "${GUILD_BYTECODE}${GUILD_CONSTRUCTOR:2}" \
  --rpc-url $RPC_BASE \
  --private-key $ORACLE_PRIVATE_KEY \
  --legacy \
  --json | jq -r '.transactionHash')

echo "   Guild TX: $GUILD_TX"
echo "   Waiting for receipt..."
sleep 5

GUILD_ADDR=$(cast receipt $GUILD_TX --rpc-url $RPC_BASE --json | jq -r '.contractAddress')
echo "   ✅ Guild deployed: $GUILD_ADDR"
echo ""

# Deploy Referral
echo "2. Deploying ReferralModule..."
REF_BYTECODE=$(forge inspect contract/GmeowReferralStandalone.sol:GmeowReferralStandalone bytecode)
REF_CONSTRUCTOR=$(cast abi-encode "constructor(address)" $CORE_ADDR)

REF_TX=$(cast send --create "${REF_BYTECODE}${REF_CONSTRUCTOR:2}" \
  --rpc-url $RPC_BASE \
  --private-key $ORACLE_PRIVATE_KEY \
  --legacy \
  --json | jq -r '.transactionHash')

echo "   Referral TX: $REF_TX"
echo "   Waiting for receipt..."
sleep 5

REF_ADDR=$(cast receipt $REF_TX --rpc-url $RPC_BASE --json | jq -r '.contractAddress')
echo "   ✅ Referral deployed: $REF_ADDR"
echo ""

# Connect to ScoringModule
echo "3. Connecting modules to ScoringModule..."
cast send $GUILD_ADDR "setScoringModule(address)" $SCORING_ADDR --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
echo "   ✅ Guild connected"

cast send $REF_ADDR "setScoringModule(address)" $SCORING_ADDR --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
echo "   ✅ Referral connected"
echo ""

# Authorize in ScoringModule
echo "4. Authorizing modules in ScoringModule..."
cast send $SCORING_ADDR "authorizeContract(address,bool)" $CORE_ADDR true --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
echo "   ✅ Core authorized"

cast send $SCORING_ADDR "authorizeContract(address,bool)" $GUILD_ADDR true --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
echo "   ✅ Guild authorized"

cast send $SCORING_ADDR "authorizeContract(address,bool)" $REF_ADDR true --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
echo "   ✅ Referral authorized"
echo ""

# Summary
echo "========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================="
echo "Core:      $CORE_ADDR"
echo "Guild:     $GUILD_ADDR"
echo "Referral:  $REF_ADDR"
echo "Scoring:   $SCORING_ADDR"
echo ""
echo "Update .env.local with new addresses:"
echo "NEXT_PUBLIC_GM_BASE_CORE=$CORE_ADDR"
echo "NEXT_PUBLIC_GM_BASE_GUILD=$GUILD_ADDR"
echo "NEXT_PUBLIC_GM_BASE_REFERRAL=$REF_ADDR"
echo "========================================="
