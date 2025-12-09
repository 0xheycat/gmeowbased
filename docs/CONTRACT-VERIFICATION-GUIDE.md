# Contract Verification Guide

## Overview
This guide provides professional patterns for verifying Gmeowbased contracts on Base using Foundry.

## Prerequisites

### 1. Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Get Basescan API Key
1. Visit: https://basescan.org/myapikey
2. Sign up/login
3. Create new API key
4. Export to environment:
```bash
export BASESCAN_API_KEY="your_api_key_here"
```

### 3. Verify Installation
```bash
forge --version
cast --version
```

---

## Contract Information

### Deployed Contracts (Base Mainnet)
| Contract | Address | Compiler | Optimization |
|----------|---------|----------|--------------|
| GmeowCore | `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92` | 0.8.23 | 200 runs |
| GmeowGuild | `0x967457be45facE07c22c0374dAfBeF7b2f7cd059` | 0.8.23 | 200 runs |
| GmeowNFT | `0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20` | 0.8.23 | 200 runs |
| GmeowProxy | `0x6A48B758ed42d7c934D387164E60aa58A92eD206` | 0.8.23 | 200 runs |

### Contract Structure
```
contract/
├── GmeowCoreStandalone.sol (Main contract)
├── GmeowGuildStandalone.sol (Guild contract)
├── proxy/
│   └── GmeowNFTImpl.sol (NFT implementation)
└── modules/
    ├── BaseModule.sol
    ├── CoreModule.sol
    ├── ReferralModule.sol
    ├── GuildModule.sol
    └── NFTModule.sol
```

---

## Verification Methods

### Method 1: Automated Script (Recommended)

Run the automated verification script:
```bash
npm run contracts:verify
```

The script will:
1. Check if contracts are already verified
2. Prompt for constructor arguments
3. Verify each contract on Basescan
4. Display verification links

### Method 2: Manual Foundry CLI

#### Step 1: Prepare Constructor Arguments

For **GmeowCore** (requires oracle signer):
```bash
# Get your oracle signer address from deployment logs
ORACLE_SIGNER="0xYourOracleSignerAddress"

# Encode constructor args
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$ORACLE_SIGNER")
```

For **GmeowGuild** (requires core contract):
```bash
CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS")
```

For **GmeowNFT** (requires core contract):
```bash
CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS")
```

#### Step 2: Verify with Forge

**Verify GmeowCore:**
```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --compiler-version 0.8.23 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $CONSTRUCTOR_ARGS \
  --watch \
  0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  contract/GmeowCoreStandalone.sol:GmeowCore
```

**Verify GmeowGuild:**
```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --compiler-version 0.8.23 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $CONSTRUCTOR_ARGS \
  --watch \
  0x967457be45facE07c22c0374dAfBeF7b2f7cd059 \
  contract/GmeowGuildStandalone.sol:GmeowGuildStandalone
```

**Verify GmeowNFT:**
```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --compiler-version 0.8.23 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $CONSTRUCTOR_ARGS \
  --watch \
  0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20 \
  contract/proxy/GmeowNFTImpl.sol:GmeowNFT
```

### Method 3: Basescan Web UI

1. Visit: https://basescan.org/verifyContract
2. Select verification method: "Solidity (Single file)" or "Standard JSON Input"
3. Enter contract address
4. Compiler settings:
   - Compiler: `v0.8.23+commit.f704f362`
   - Optimization: `Yes` with `200` runs
5. Upload contract file
6. Enter constructor arguments (ABI-encoded)
7. Click "Verify and Publish"

---

## Constructor Arguments Reference

### Finding Oracle Signer Address

Check your deployment transaction:
```bash
# Get deployment transaction for Core contract
cast tx <deployment_tx_hash> --rpc-url https://mainnet.base.org

# Look for constructor parameters in the input data
```

Or check contract storage:
```bash
# Read oracle signer from contract
cast call 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  "oracleSigner()(address)" \
  --rpc-url https://mainnet.base.org
```

### ABI Encoding Examples

```bash
# Single address parameter
cast abi-encode "constructor(address)" "0x1234..."

# Multiple parameters (if needed)
cast abi-encode "constructor(address,uint256)" "0x1234..." "1000000"

# String parameter (if needed)
cast abi-encode "constructor(string)" "GmeowCore"
```

---

## Post-Verification Steps

### 1. Update ABIs from Basescan
```bash
npm run update:abis
```

This fetches verified ABIs automatically using Basescan API.

### 2. Test Contracts
```bash
npm run contracts:test
```

Expected output:
```
✓ Contract deployment check
✓ Read paused state
✓ Read oracle signer
✓ Referral functions in ABI
✓ Guild functions in ABI
✓ NFT functions in ABI
✓ Contract interactions

Success Rate: 100%
```

### 3. Verify Referral Functions
```bash
# Check if referral functions are in ABI
cat abi/GmeowCore.abi.json | jq '.[] | select(.name | contains("referral")) | .name'
```

Expected functions:
- `registerReferralCode`
- `setReferrer`
- `getReferralCode`
- `getReferralStats`

---

## Troubleshooting

### Issue: "Already verified"
**Solution**: Contract is already verified! Skip to post-verification steps.

### Issue: "Verification failed"
**Possible causes:**
1. Incorrect compiler version
2. Wrong optimization settings
3. Incorrect constructor arguments
4. Missing imports/modules

**Solutions:**
1. Double-check compiler version: `0.8.23`
2. Ensure optimization: `200 runs`
3. Verify constructor args encoding
4. Ensure all module files are accessible

### Issue: "Constructor arguments mismatch"
**Solution**: Re-encode constructor arguments:
```bash
# For GmeowCore
ORACLE_SIGNER=$(cast call 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  "oracleSigner()(address)" --rpc-url https://mainnet.base.org)
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$ORACLE_SIGNER")
```

### Issue: "Rate limit exceeded"
**Solution**: Wait 5 seconds between verification attempts. Basescan rate limits API calls.

### Issue: "Compilation error"
**Solution**: Use standard JSON input method instead:
1. Create `foundry.toml`:
```toml
[profile.default]
src = "contract"
out = "out"
libs = ["node_modules"]
solc_version = "0.8.23"
optimizer = true
optimizer_runs = 200
```
2. Compile: `forge build --force`
3. Use generated JSON from `out/GmeowCore.sol/GmeowCore.json`

---

## Verification Checklist

- [ ] Foundry installed (`forge --version`)
- [ ] Basescan API key set (`echo $BASESCAN_API_KEY`)
- [ ] Oracle signer address identified
- [ ] Core contract verified
- [ ] Guild contract verified
- [ ] NFT contract verified
- [ ] Proxy contract verified (if applicable)
- [ ] ABIs updated (`npm run update:abis`)
- [ ] Contracts tested (`npm run contracts:test`)
- [ ] Referral functions confirmed in ABI
- [ ] Guild functions confirmed in ABI
- [ ] Contract interactions working

---

## Quick Reference Commands

```bash
# Check contract verification status
cast etherscan-source 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  --chain base --etherscan-api-key $BASESCAN_API_KEY

# Read contract code (bytecode)
cast code 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  --rpc-url https://mainnet.base.org

# Call contract function
cast call 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 \
  "paused()(bool)" --rpc-url https://mainnet.base.org

# Check constructor args
cast tx <deployment_tx> --rpc-url https://mainnet.base.org
```

---

## Success Criteria

✅ All contracts verified on Basescan
✅ ABIs match deployed bytecode
✅ All functions accessible via ABI
✅ Contract tests passing 100%
✅ Referral module integrated
✅ Guild module integrated
✅ Ready for Phase 2 development

---

## Next Steps After Verification

1. **Update CURRENT-TASK.md**: Change verification status to ✅
2. **Begin Phase 2**: Referral System Core components
3. **Test referral functions**: Register codes, set referrers
4. **Test guild functions**: Create guilds, join/leave
5. **Monitor contract events**: Track onchain activity

---

## Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **Basescan API**: https://docs.basescan.org/
- **Base Documentation**: https://docs.base.org/
- **Viem Documentation**: https://viem.sh/
- **Contract Source**: `/contract/` directory in repository

---

**Last Updated**: December 6, 2025
**Status**: Ready for verification
**Next Action**: Run `npm run contracts:verify`
