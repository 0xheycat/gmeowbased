# Testing Quick Start Guide

**Date**: December 31, 2025  
**Status**: ⏳ Waiting for wallet funding + Guild redeploy

---

## 🚨 Prerequisites (MUST DO FIRST)

### 1. Fund Oracle Wallet
```
Send 0.01 ETH to: 0x8870C155666809609176260F2B65a626C000D773
Current Balance: 0.00008 ETH ❌
Network: Base Mainnet
```

### 2. Redeploy Guild Contract
The Guild contract at `0xCeaB75F07f2ab8a18bedD5A795ef47296C7C8a5E` has **NO CODE**.

```bash
source .env.local
CORE_ADDR=0x343829A6A613d51B4A81c2dE508e49CA66D4548d
SCORING_ADDR=0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6

# Prepare deployment
BYTECODE=$(forge inspect contract/GmeowGuildStandalone.sol:GmeowGuildStandalone bytecode)
CONSTRUCTOR=$(cast abi-encode "constructor(address)" $CORE_ADDR | cut -c3-)
FULL_DATA="${BYTECODE}${CONSTRUCTOR}"

# Deploy (use current nonce)
cast send --private-key $ORACLE_PRIVATE_KEY --legacy --create "$FULL_DATA" --rpc-url $RPC_BASE

# Get deployed address (check output above)
NEW_GUILD_ADDR=<paste_deployed_address_here>

# Connect to ScoringModule
cast send $NEW_GUILD_ADDR "setScoringModule(address)" $SCORING_ADDR --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy

# Authorize in ScoringModule
cast send $SCORING_ADDR "authorizeContract(address,bool)" $NEW_GUILD_ADDR true --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy

# Update .env.local
nano .env.local
# Change: NEXT_PUBLIC_GM_BASE_GUILD=<NEW_GUILD_ADDR>
```

---

## ✅ Run Tests (After Steps 1 & 2)

### Option A: Automated Full Test Suite
```bash
./test-mainnet-integration.sh
```

This runs 22 tests covering:
- Authorization checks
- Module connections
- GM rewards
- Quest completion
- Guild creation
- Badge minting
- Referral system
- Score calculations

### Option B: Manual Quick Tests

```bash
source .env.local

# Test 1: Check authorizations
echo "Checking ScoringModule authorizations..."
cast call 0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6 "authorizedContracts(address)" 0x343829A6A613d51B4A81c2dE508e49CA66D4548d --rpc-url $RPC_BASE
# Expected: 0x...01 (true)

# Test 2: Check connections
echo "Checking Core connection to ScoringModule..."
cast call 0x343829A6A613d51B4A81c2dE508e49CA66D4548d "scoringModule()" --rpc-url $RPC_BASE
# Expected: 0x000000000000000000000000decfdc900dd1dbd6f947d3558143aa8374413bd6

# Test 3: Get user stats
echo "Getting user stats..."
cast call 0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6 "getUserStats(address)" 0x8870C155666809609176260F2B65a626C000D773 --rpc-url $RPC_BASE

# Test 4: Create guild (write operation - costs gas)
echo "Creating test guild..."
cast send $NEW_GUILD_ADDR "createGuild(string)" "Test Guild" --rpc-url $RPC_BASE --private-key $ORACLE_PRIVATE_KEY --legacy
```

---

## 📊 Current Status

**Working Contracts**:
- ✅ ScoringModule: `0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6`
- ✅ Core: `0x343829A6A613d51B4A81c2dE508e49CA66D4548d`
- ✅ Referral: `0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df`
- ✅ Badge: `0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb`
- ✅ NFT: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C`

**Broken Contracts**:
- ❌ Guild: `0xCeaB75F07f2ab8a18bedD5A795ef47296C7C8a5E` (NO CODE)

**Read-Only Tests Passed** (6/6):
1. ✅ Core authorized in ScoringModule
2. ✅ Referral authorized in ScoringModule
3. ✅ Core.scoringModule connected
4. ✅ Referral.scoringModule connected
5. ✅ getUserStats callable
6. ✅ All ABIs generated

**Write Tests Blocked**:
- ⏸️ GM rewards (insufficient funds)
- ⏸️ Quest completion (insufficient funds)
- ⏸️ Guild creation (no contract + insufficient funds)
- ⏸️ Badge minting (insufficient funds)
- ⏸️ Referral setting (insufficient funds)

---

## 🎯 Next Steps After Testing

**If all tests pass**:
1. Update Subsquid indexer with contract addresses
2. Update frontend contract addresses in `.env.local`
3. Deploy frontend
4. Test UI integration
5. Go live! 🚀

**If tests fail**:
1. Check transaction errors on Blockscout
2. Verify contract connections
3. Check authorization status
4. Review gas settings
5. Re-run specific failed tests

---

## 📞 Quick Reference

**Oracle Address**: `0x8870C155666809609176260F2B65a626C000D773`  
**RPC URL**: `https://rpc.subsquid.io/base/sqd_rpc_nghV2pOll4Fd1ksRPiIeyn_lU30hKbtQ6mo65Bfgqs3GxNFR`  
**Network**: Base Mainnet (Chain ID: 8453)  
**Explorer**: https://base.blockscout.com/

**Test Script**: `./test-mainnet-integration.sh`  
**Documentation**: `IMPLEMENTATION-SUMMARY.md`
