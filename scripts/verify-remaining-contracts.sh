#!/bin/bash
# Verify unverified contracts on Basescan using Etherscan API

source .env.local

echo "🔍 Verifying Unverified Contracts on Basescan"
echo "=============================================="
echo ""

# Core Contract
echo "1️⃣ Verifying Core (GmeowCore)..."
forge verify-contract \
  0x343829A6A613d51B4A81c2dE508e49CA66D4548d \
  contract/GmeowCore.sol:GmeowCore \
  --chain-id 8453 \
  --etherscan-api-key $NEXT_PUBLIC_BASESCAN_API_KEY \
  --watch || echo "⚠️  Core verification failed or already verified"

echo ""

# Guild Contract
echo "2️⃣ Verifying Guild (GmeowGuildStandalone)..."
CORE_ADDR=0x343829A6A613d51B4A81c2dE508e49CA66D4548d
forge verify-contract \
  0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097 \
  contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --chain-id 8453 \
  --etherscan-api-key $NEXT_PUBLIC_BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $CORE_ADDR) \
  --watch || echo "⚠️  Guild verification failed or already verified"

echo ""

# Referral Contract
echo "3️⃣ Verifying Referral (GmeowReferralStandalone)..."
forge verify-contract \
  0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df \
  contract/GmeowReferralStandalone.sol:GmeowReferralStandalone \
  --chain-id 8453 \
  --etherscan-api-key $NEXT_PUBLIC_BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $CORE_ADDR) \
  --watch || echo "⚠️  Referral verification failed or already verified"

echo ""
echo "=============================================="
echo "✅ Verification process complete!"
echo "Check Basescan for verification status"
