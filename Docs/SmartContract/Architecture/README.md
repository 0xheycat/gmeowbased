# Smart Contract Architecture Documentation

This directory contains documentation about the architectural decisions and design patterns used in the Gmeow smart contract system.

## Documents

### [MODULAR-ARCHITECTURE.md](./MODULAR-ARCHITECTURE.md)
**Purpose**: Complete technical specification of the modular contract architecture

**Key Topics**:
- Module breakdown (Core, Guild, NFT, Referral)
- Contract interfaces and function signatures
- State management and storage patterns
- Integration patterns between modules
- Gas optimization strategies

**Use When**: You need to understand the overall contract architecture and how modules interact

---

### [MODULAR-REFACTOR-COMPLETE.md](./MODULAR-REFACTOR-COMPLETE.md)
**Purpose**: Documentation of the refactoring process from monolithic to modular

**Key Topics**:
- Original monolithic contract structure
- Size limit challenges (39KB → 24KB)
- Refactoring approach and methodology
- Module extraction process
- Testing and validation

**Use When**: You need historical context on why and how the refactoring was done

---

### [MODULARIZATION-SUMMARY.md](./MODULARIZATION-SUMMARY.md)
**Purpose**: Executive summary of the modularization project

**Key Topics**:
- Problem statement (contract size exceeded 24KB limit)
- Solution approach (split into 3 contracts)
- Benefits achieved (size, maintainability, gas efficiency)
- Migration path
- Lessons learned

**Use When**: You need a quick overview of the modularization project

---

## Architecture Overview

### Standalone Architecture (Base Mainnet)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  GmeowCore (24KB)                               │
│  ├─ Quest System                                │
│  ├─ Points & GM Rewards                         │
│  ├─ Referral System                             │
│  └─ User Stats                                  │
│                                                 │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐    ┌────────▼─────────┐
│                  │    │                   │
│  GmeowGuild (7KB)│    │  GmeowNFT (10KB) │
│  ├─ Guild Mgmt   │    │  ├─ NFT Minting  │
│  ├─ Membership   │    │  ├─ Badge System │
│  ├─ Treasury     │    │  └─ Onchain Quest│
│  └─ Quests       │    │                   │
│                  │    │                   │
└──────────────────┘    └───────────────────┘
```

### Monolithic Architecture (Other Chains)

```
┌──────────────────────────────────────────┐
│                                          │
│  GmeowMultichain (39KB)                  │
│  ├─ Quest System                         │
│  ├─ Points & GM Rewards                  │
│  ├─ Referral System                      │
│  ├─ Guild Management                     │
│  ├─ NFT System                           │
│  └─ User Stats                           │
│                                          │
└──────────────────────────────────────────┘
```

## Key Architectural Decisions

### Why Standalone on Base?

1. **Size Constraints**: Monolithic contract was 39KB, exceeding 24KB deployment limit
2. **High Traffic**: Base has highest usage, needed optimization
3. **Gas Efficiency**: Users only interact with needed contracts
4. **Future-Proof**: Easier to add features without hitting limits

### Why Keep Monolithic on Other Chains?

1. **Lower Traffic**: Other chains have less usage
2. **Simplicity**: Easier to maintain single contract
3. **Deployment Cost**: No need to deploy 3 contracts
4. **Backward Compatibility**: Existing deployments work fine

## Design Patterns Used

### 1. Module Pattern
- Functionality split into focused modules
- Each module handles specific domain (Quest, Guild, NFT)
- Modules can be developed and tested independently

### 2. External Contract References
- Contracts reference each other via addresses
- Not using delegatecall (avoids storage collision)
- Each contract maintains own storage

### 3. Oracle Pattern
- Trusted oracle signs quest completions
- Signature verification on-chain
- Prevents cheating while keeping gas low

### 4. Factory Pattern
- Core contract deploys Badge contract
- NFT contract deploys GmeowNFT instance
- Ensures proper initialization

## Security Considerations

### Access Control
- Owner-only admin functions
- Oracle signer verification
- Member-only guild operations

### Reentrancy Protection
- ReentrancyGuard on all value transfers
- SafeERC20 for token operations
- Checks-effects-interactions pattern

### Input Validation
- All addresses validated (not zero address)
- All amounts validated (positive, within limits)
- All IDs validated (exist, active)

## Gas Optimization

### Storage Optimization
- Packed structs (use uint256 sparingly)
- Mappings over arrays where possible
- Events for off-chain data

### Function Optimization
- Short-circuit conditions
- Minimal storage reads/writes
- Batch operations where possible

### Compiler Optimization
- `optimizer_runs = 200` (balanced)
- `via_ir = true` (advanced optimization)
- EVM version: shanghai

## Testing Strategy

### Unit Tests
- Test each module independently
- Mock external dependencies
- Cover edge cases

### Integration Tests
- Test cross-contract calls
- Test end-to-end workflows
- Test with real token/NFT contracts

### Testnet Validation
- Deploy to Base Sepolia
- Manual testing of all features
- Monitor gas usage

## Future Architecture Considerations

### Potential Enhancements
1. **Staking Module**: Separate contract for point staking
2. **Governance Module**: DAO functionality
3. **Bridge Module**: Cross-chain quest completion
4. **Marketplace Module**: NFT trading

### Scalability Options
1. **L2 Scaling**: Deploy to Base L2 (already done!)
2. **Sharding**: Split quests by category
3. **Proxy Upgrades**: Add upgradeability pattern
4. **Batch Processing**: Aggregate operations

## Related Documentation

- [← Back to Smart Contract Docs](../)
- [Deployment Guides →](../Deployment/)
- [Integration Guides →](../Integration/)

---

**Last Updated**: November 26, 2025
