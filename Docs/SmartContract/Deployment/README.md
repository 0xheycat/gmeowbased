# Smart Contract Deployment Documentation

This directory contains all guides and records related to deploying Gmeow smart contracts.

## Documents

### Deployment Guides

#### [MAINNET-DEPLOYMENT-GUIDE.md](./MAINNET-DEPLOYMENT-GUIDE.md)
**Purpose**: Complete guide for deploying contracts to production networks

**Key Topics**:
- Pre-deployment checklist
- Foundry setup and configuration
- Automated deployment scripts
- Contract verification on Basescan
- Cost estimates and gas optimization
- Post-deployment validation

**Use When**: You need to deploy contracts to Base Mainnet or other production networks

**Target Audience**: DevOps, Smart Contract Developers

---

#### [REMIX-DEPLOYMENT-GUIDE.md](./REMIX-DEPLOYMENT-GUIDE.md)
**Purpose**: Step-by-step guide for deploying via Remix IDE

**Key Topics**:
- Remix IDE setup
- Contract compilation
- JavaScript VM testing
- MetaMask deployment
- Contract interaction in Remix
- Limitations and caveats

**Use When**: You need to quickly test contracts or deploy without CLI tools

**Target Audience**: Beginners, Quick Testing

---

### Deployment Records

#### [deployment-base-mainnet.json](./deployment-base-mainnet.json)
**Purpose**: Production deployment record for Base Mainnet

**Contains**:
```json
{
  "network": "base-mainnet",
  "chainId": 8453,
  "timestamp": "2025-11-26T...",
  "deployer": "0x8870C155666809609176260F2B65a626C000D773",
  "contracts": {
    "core": "0x9BDD11aA50456572E3Ea5329fcDEb81974137f92",
    "guild": "0x967457be45facE07c22c0374dAfBeF7b2f7cd059",
    "nft": "0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"
  },
  "transactions": [...],
  "costs": {
    "totalSpent": "~0.00005 ETH",
    "usdEstimate": "~$0.13 USD"
  }
}
```

**Use When**: You need production contract addresses or deployment details

---

#### [deployment-standalone.json](./deployment-standalone.json)
**Purpose**: Testnet deployment record for Base Sepolia

**Contains**: Similar structure to mainnet, but for Base Sepolia testnet

**Use When**: You need testnet contract addresses for testing

---

## Deployment Process Overview

### Prerequisites

1. **Tools Installation**
   ```bash
   # Install Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   
   # Verify installation
   forge --version
   cast --version
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Required variables:
   ORACLE_PRIVATE_KEY=0x...
   BASE_RPC_URL=https://mainnet.base.org
   ETHERSCAN_API_KEY=...
   ```

3. **Fund Deployer Wallet**
   - Minimum: 0.001 ETH
   - Recommended: 0.01 ETH
   - Base Mainnet average cost: ~0.00005 ETH

### Deployment Steps

#### Option 1: Automated Deployment (Recommended)

```bash
# Deploy to Base Mainnet
./scripts/deploy-base-mainnet.sh

# Deploy to Base Sepolia (testnet)
./scripts/deploy-standalone.sh
```

**Features**:
- ✅ Automatic contract linking
- ✅ Balance verification
- ✅ Confirmation prompts
- ✅ JSON output with all details
- ✅ Basescan links

#### Option 2: Manual Deployment

```bash
# 1. Deploy Core
forge create contract/GmeowCoreStandalone.sol:GmeowCore \
  --private-key $ORACLE_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL \
  --constructor-args $ORACLE_ADDRESS

# 2. Deploy Guild
forge create contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --private-key $ORACLE_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL \
  --constructor-args $CORE_ADDRESS

# 3. Deploy NFT
forge create contract/GmeowNFTStandalone.sol:GmeowNFTStandalone \
  --private-key $ORACLE_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL \
  --constructor-args $CORE_ADDRESS "Gmeow Adventure NFT" "GMEOW" "https://api.gmeowhq.art/nft/"

# 4. Link contracts
cast send $CORE_ADDRESS "setGuildContract(address)" $GUILD_ADDRESS \
  --private-key $ORACLE_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL

cast send $CORE_ADDRESS "setNFTContractAddress(address)" $NFT_ADDRESS \
  --private-key $ORACLE_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

#### Option 3: Remix IDE

1. Open Remix at https://remix.ethereum.org
2. Upload contract files
3. Compile with Solidity 0.8.23
4. Deploy using MetaMask
5. Manually link contracts

See [REMIX-DEPLOYMENT-GUIDE.md](./REMIX-DEPLOYMENT-GUIDE.md) for details.

### Post-Deployment

1. **Verify Contracts**
   ```bash
   # Core contract
   forge verify-contract $CORE_ADDRESS \
     contract/GmeowCoreStandalone.sol:GmeowCore \
     --chain-id 8453 \
     --constructor-args $(cast abi-encode "constructor(address)" $ORACLE_ADDRESS)
   ```

2. **Test Basic Functions**
   ```bash
   # Check Core contract owner
   cast call $CORE_ADDRESS "owner()"
   
   # Check Guild contract link
   cast call $CORE_ADDRESS "guildContract()"
   
   # Check NFT contract link
   cast call $CORE_ADDRESS "nftContractAddress()"
   ```

3. **Update Frontend**
   - Update `.env.vercel.production`
   - Deploy to Vercel
   - Test all features

## Deployment Costs

### Base Mainnet (Actual)
- **Core Contract**: ~0.000018 ETH ($0.05)
- **Guild Contract**: ~0.000016 ETH ($0.04)
- **NFT Contract**: ~0.000016 ETH ($0.04)
- **Contract Linking**: ~0.00001 ETH ($0.03)
- **Total**: ~0.00005 ETH (~$0.13 USD)

*Gas price during deployment: 0.0034 gwei (extremely low)*

### Base Sepolia (Testnet)
- **Free**: Use faucet at https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Other Networks
- **Unichain**: ~$0.10-0.50
- **Celo**: ~$0.05-0.20
- **Ink**: ~$0.10-0.30
- **Optimism**: ~$0.10-0.40

*Costs vary based on network congestion*

## Troubleshooting

### Common Issues

**1. Insufficient Balance**
```
Error: Insufficient funds for gas
```
**Solution**: Fund deployer wallet with at least 0.001 ETH

**2. Contract Size Too Large**
```
Error: contract code size exceeds 24KB
```
**Solution**: Ensure using standalone contracts, not monolithic

**3. Constructor Arguments Invalid**
```
Error: invalid constructor arguments
```
**Solution**: Verify argument order and types match constructor

**4. Verification Failed**
```
Error: Unable to verify contract
```
**Solution**: Use Sourcify instead of Etherscan API, or verify manually on Basescan

### Getting Help

- Check deployment logs in terminal
- Verify contract addresses on Basescan
- Review deployment JSON files
- Contact team for support

## Network-Specific Notes

### Base Mainnet
- **RPC**: https://mainnet.base.org
- **Chain ID**: 8453
- **Explorer**: https://basescan.org
- **Faucet**: N/A (mainnet)
- **Architecture**: Standalone (3 contracts)

### Base Sepolia
- **RPC**: https://sepolia.base.org
- **Chain ID**: 84532
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Architecture**: Standalone (3 contracts)

### Other Networks
- Use monolithic contract
- Single deployment
- Standard verification process

## Security Checklist

Before deploying to mainnet:

- [ ] All tests pass (`forge test`)
- [ ] Code reviewed by team
- [ ] Oracle signer address correct
- [ ] Constructor arguments verified
- [ ] Deployer wallet secured
- [ ] Backup deployment key stored safely
- [ ] Post-deployment validation plan ready
- [ ] Rollback procedure documented

## Related Documentation

- [← Back to Smart Contract Docs](../)
- [Architecture Documentation →](../Architecture/)
- [Integration Guides →](../Integration/)

---

**Last Updated**: November 26, 2025
