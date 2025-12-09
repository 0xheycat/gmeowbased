# Gmeow Smart Contract Documentation

**Last Updated**: November 26, 2025  
**Architecture**: Hybrid Standalone (Base) + Monolithic (Other Chains)

## Overview

This documentation covers the complete Gmeow smart contract system, including deployment guides, integration instructions, and architectural decisions.

## 📁 Documentation Structure

```
Docs/SmartContract/
├── README.md (this file)
├── Architecture/
│   ├── MODULAR-ARCHITECTURE.md
│   ├── MODULAR-REFACTOR-COMPLETE.md
│   └── MODULARIZATION-SUMMARY.md
├── Deployment/
│   ├── MAINNET-DEPLOYMENT-GUIDE.md
│   ├── REMIX-DEPLOYMENT-GUIDE.md
│   ├── deployment-base-mainnet.json
│   └── deployment-standalone.json
└── Integration/
    ├── CONTRACT-INTEGRATION-COMPLETE.md
    ├── CONTRACT-MIGRATION-GUIDE.md
    ├── CONTRACT-UPDATE-CHANGELOG.md
    └── QUEST-WIZARD-CONTRACT-INTEGRATION.md
```

## 🏗️ Architecture

### Current Architecture (November 2025)

**Base Mainnet (Standalone):**
- **Core Contract**: Quest, Points, GM, Referral system
  - Address: `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92`
  - [View on Basescan](https://basescan.org/address/0x9BDD11aA50456572E3Ea5329fcDEb81974137f92)

- **Guild Contract**: Guild management system
  - Address: `0x967457be45facE07c22c0374dAfBeF7b2f7cd059`
  - [View on Basescan](https://basescan.org/address/0x967457be45facE07c22c0374dAfBeF7b2f7cd059)

- **NFT Contract**: NFT minting and management
  - Address: `0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20`
  - [View on Basescan](https://basescan.org/address/0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20)

**Other Chains (Monolithic):**
- Unichain: `0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f`
- Celo: `0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52`
- Ink: `0x6081a70c2F33329E49cD2aC673bF1ae838617d26`
- Optimism: `0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6`

### Why Standalone Architecture?

The original monolithic contract exceeded Ethereum's 24KB contract size limit. We split it into three contracts on Base:

1. **Size Optimization**: Reduced from 39KB to max 24KB per contract
2. **Modular Updates**: Update guild/NFT logic independently
3. **Gas Efficiency**: Users only interact with needed contracts
4. **Maintainability**: Cleaner separation of concerns

**Read More**: [Architecture/MODULAR-ARCHITECTURE.md](./Architecture/MODULAR-ARCHITECTURE.md)

## 🚀 Deployment Guides

### For Mainnet Deployment

If you need to deploy to production networks:

1. **[MAINNET-DEPLOYMENT-GUIDE.md](./Deployment/MAINNET-DEPLOYMENT-GUIDE.md)**
   - Complete guide for deploying to Base Mainnet
   - Uses Foundry (forge) for automated deployment
   - Includes safety checks and verification steps
   - Cost estimates: ~$0.13 USD total

### For Testing with Remix

If you want to test contracts in Remix IDE:

2. **[REMIX-DEPLOYMENT-GUIDE.md](./Deployment/REMIX-DEPLOYMENT-GUIDE.md)**
   - Step-by-step Remix deployment
   - JavaScript VM for testing
   - Suitable for development/testing only

### Deployment Records

- **[deployment-base-mainnet.json](./Deployment/deployment-base-mainnet.json)** - Production deployment details
- **[deployment-standalone.json](./Deployment/deployment-standalone.json)** - Testnet deployment details

## 🔌 Integration Guides

### For Frontend Developers

If you're integrating the contracts into the frontend:

1. **[CONTRACT-INTEGRATION-COMPLETE.md](./Integration/CONTRACT-INTEGRATION-COMPLETE.md)**
   - Complete integration summary
   - All contract addresses
   - Function routing guide
   - Testing checklist

2. **[CONTRACT-MIGRATION-GUIDE.md](./Integration/CONTRACT-MIGRATION-GUIDE.md)**
   - Step-by-step migration from monolithic to standalone
   - Code examples for updating contract calls
   - Guild/NFT operation updates
   - Rollback procedures

### For Quest System Integration

3. **[QUEST-WIZARD-CONTRACT-INTEGRATION.md](./Integration/QUEST-WIZARD-CONTRACT-INTEGRATION.md)**
   - Quest Wizard on-chain publishing
   - Transaction builder usage
   - Quest type mapping
   - Publishing workflow

### Changelog

4. **[CONTRACT-UPDATE-CHANGELOG.md](./Integration/CONTRACT-UPDATE-CHANGELOG.md)**
   - All contract updates and changes
   - Bonus value updates (OG threshold 50K FID)
   - Streak bonus changes (15%/30%/60%)

## 🎯 Quick Start

### 1. For Users
No action needed! The contracts are already deployed and the frontend handles routing automatically.

### 2. For Developers

**Install Dependencies:**
```bash
# Foundry (for smart contract work)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node packages (for frontend)
pnpm install
```

**Key Files:**
- Contract ABIs: `lib/abi/gmeowcore.json`, `lib/abi/gmeowguild.json`, `lib/abi/gmeowhq.json`
- Contract Utils: `lib/gmeow-utils.ts`
- Contract Config: `lib/contract-config.ts`

**Helper Functions:**
```typescript
import { 
  getCoreAddress,      // Get Core contract address
  getGuildAddress,     // Get Guild contract address
  getNFTAddress,       // Get NFT contract address
  getCoreABI,          // Get Core ABI
  getGuildABI,         // Get Guild ABI
  getNFTABI            // Get NFT ABI
} from '@/lib/gm-utils'

// Automatically routes to correct contract
const guildAddress = getGuildAddress('base') // 0x967457be...
const guildABI = getGuildABI('base')         // Guild ABI
```

### 3. For Contract Developers

**Compile Contracts:**
```bash
forge build
```

**Run Tests:**
```bash
forge test
```

**Generate ABIs:**
```bash
forge inspect contract/GmeowCoreStandalone.sol:GmeowCore abi > lib/abi/gmeowcore.json
forge inspect contract/GmeowGuildStandalone.sol:GmeowGuildStandalone abi > lib/abi/gmeowguild.json
forge inspect contract/GmeowNFTStandalone.sol:GmeowNFTStandalone abi > lib/abi/gmeowhq.json
```

**Deploy to Testnet:**
```bash
./scripts/deploy-standalone.sh
```

## 📊 Contract Features

### Core Contract
- ✅ Quest creation and completion
- ✅ Points system (GM rewards)
- ✅ Daily GM streaks with bonuses
- ✅ Referral system
- ✅ User statistics tracking
- ✅ Quest signature verification

### Guild Contract
- ✅ Guild creation and management
- ✅ Member join/leave
- ✅ Guild points and treasury
- ✅ Guild quests
- ✅ Guild rewards and leveling

### NFT Contract
- ✅ NFT minting (owner and user)
- ✅ Batch minting
- ✅ Onchain quest integration
- ✅ ERC721 standard compliance
- ✅ ERC2981 royalties

## 🔒 Security

### Audits
- Self-audited with security checklist
- Using OpenZeppelin v5 contracts
- ReentrancyGuard on all value transfers
- Owner-only admin functions
- Signature verification for oracle operations

### Key Security Features
1. **Oracle Signer Verification**: All quest completions verified by trusted oracle
2. **Reentrancy Protection**: SafeERC20 and ReentrancyGuard throughout
3. **Input Validation**: All user inputs validated
4. **Access Control**: Owner-only for admin functions
5. **Pause Mechanism**: Emergency pause capability

## 📝 Contract Specifications

### Solidity Version
- **Version**: 0.8.23
- **EVM**: Shanghai
- **Optimizer**: Enabled (200 runs)
- **via_ir**: true (required for stack depth)

### Dependencies
- OpenZeppelin Contracts v5.0.0
  - Ownable
  - ReentrancyGuard
  - SafeERC20
  - ERC721
  - ERC2981

### Contract Sizes
- Core: ~24KB (within limit)
- Guild: ~7KB
- NFT: ~10KB
- Total: ~41KB (split successfully)

## 🧪 Testing

### Test Coverage
Run tests with:
```bash
forge test -vvv
```

### Manual Testing Checklist
- [ ] Quest creation works
- [ ] Quest completion with signature works
- [ ] GM rewards distribute correctly
- [ ] Guild creation works
- [ ] Guild join/leave works
- [ ] NFT minting works
- [ ] Referral system works

## 🔗 Related Documentation

### External Links
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Base Network](https://base.org/)

### Internal Links
- [Main README](../../README.md)
- [API Documentation](../api/)
- [Frontend Documentation](../frontend/)

## 🤝 Contributing

### Contract Changes
1. Make changes to contracts in `contract/` directory
2. Run tests: `forge test`
3. Update ABIs: `forge inspect ... abi > lib/abi/...`
4. Update documentation
5. Test on testnet before mainnet

### Documentation Updates
1. Update relevant .md files in this directory
2. Keep README.md in sync
3. Update changelog

## 📞 Support

For contract-related questions:
- Check documentation in this directory
- Review integration guides
- Check deployment records
- Contact: [Your contact info]

## 📜 License

[Your License]

---

**Navigation:**
- [← Back to Main Docs](../)
- [Architecture Documentation →](./Architecture/)
- [Deployment Guides →](./Deployment/)
- [Integration Guides →](./Integration/)
