# Deployment Readiness Checklist

## Pre-Deployment Validation ✅

### Code Quality
- [x] All tests passing (36/36) ✅
- [x] Level calculations accurate ✅
- [x] Rank tier boundaries validated ✅
- [x] Multipliers working correctly ✅
- [x] Events emitting properly ✅
- [x] Gas costs measured and acceptable ✅

### Documentation
- [x] Implementation complete document ✅
- [x] Frontend integration guide ✅
- [x] Deployment script created ✅
- [x] Code comments comprehensive ✅

### Contract Security
- [x] Access control implemented (onlyOwner, onlyAuthorized, onlyOracle) ✅
- [x] Authorization system tested ✅
- [x] No external calls to untrusted contracts ✅
- [x] Integer overflow protection (Solidity 0.8+) ✅
- [x] No reentrancy risks (no external calls with state changes) ✅

## Sepolia Testnet Deployment

### Required Environment Variables
```bash
export PRIVATE_KEY=0x...                    # Deployer private key
export BASESCAN_API_KEY=...                 # For contract verification
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org  # RPC endpoint
```

### Deployment Steps
```bash
# 1. Set environment
cd /home/heycat/Desktop/2025/Gmeowbased
export PRIVATE_KEY=0x...
export BASESCAN_API_KEY=...

# 2. Ensure you have Sepolia ETH
# Get from: https://sepoliafaucet.com/

# 3. Run deployment
./scripts/deploy-scoring-system.sh sepolia

# 4. Save output addresses
# Addresses will be saved to .env.sepolia

# 5. Verify deployment
source .env.sepolia
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url https://sepolia.base.org
# Should return: 5

# 6. Test getUserStats
cast call $SCORING_MODULE_ADDRESS "getUserStats(address)" YOUR_TEST_ADDRESS --rpc-url https://sepolia.base.org
```

### Post-Deployment Validation (Sepolia)
- [ ] ScoringModule verified on BaseScan Sepolia
- [ ] GmeowCore verified on BaseScan Sepolia
- [ ] Test calculateLevel() with known values
- [ ] Test getRankTier() at boundaries
- [ ] Test getUserStats() with test addresses
- [ ] Verify authorization works (only owner can set oracle)
- [ ] Test CoreModule integration (quest rewards, GM sending)
- [ ] Monitor gas costs for 24 hours
- [ ] No errors in explorer

### Test Scenarios (Sepolia)
```bash
# Test 1: Level calculation
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 300 --rpc-url https://sepolia.base.org
# Expected: 2

# Test 2: Rank tier
cast call $SCORING_MODULE_ADDRESS "getRankTier(uint256)" 1500 --rpc-url https://sepolia.base.org
# Expected: 2 (Beacon Runner)

# Test 3: Multiplier
cast call $SCORING_MODULE_ADDRESS "getMultiplier(uint8)" 2 --rpc-url https://sepolia.base.org
# Expected: 1100 (1.1x)

# Test 4: Add points (requires auth)
cast send $CORE_ADDRESS "completeQuest(uint256,address)" 1 YOUR_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org
# Should emit StatsUpdated event
```

## Mainnet Deployment (After Sepolia Success)

### Pre-Mainnet Checklist
- [ ] Sepolia running for 48+ hours without issues
- [ ] All test scenarios validated
- [ ] Gas costs confirmed acceptable
- [ ] Team approval obtained
- [ ] Frontend staging environment tested
- [ ] Rollback plan documented

### Mainnet Environment Variables
```bash
export PRIVATE_KEY=0x...                # SECURE! Use hardware wallet if possible
export BASESCAN_API_KEY=...             # Same as Sepolia
export BASE_RPC_URL=https://mainnet.base.org
```

### Mainnet Deployment Steps
```bash
# 1. DOUBLE CHECK you're on mainnet
echo $BASE_RPC_URL  # Should be mainnet.base.org

# 2. Ensure you have Base mainnet ETH
# Bridge from Ethereum mainnet via bridge.base.org

# 3. Run deployment (BE CAREFUL!)
./scripts/deploy-scoring-system.sh mainnet

# 4. IMMEDIATELY verify deployment
source .env
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url $BASE_RPC_URL
# Should return: 5

# 5. Save addresses to secure location
cp .env .env.backup
# Upload to 1Password/secure storage
```

### Post-Mainnet Validation
- [ ] Contracts verified on BaseScan mainnet
- [ ] Test all view functions
- [ ] Verify authorization setup
- [ ] Link to CoreModule
- [ ] Test one small transaction
- [ ] Monitor for 1 hour before full launch
- [ ] Update frontend production .env
- [ ] Deploy frontend to production
- [ ] Monitor error rates
- [ ] Compare on-chain vs off-chain results

## Frontend Integration

### Update Environment Variables
```bash
# .env.local (for development)
NEXT_PUBLIC_SCORING_MODULE_ADDRESS=0x...  # From .env.sepolia
NEXT_PUBLIC_GMEOW_CORE_ADDRESS=0x...

# .env.production (for production)
NEXT_PUBLIC_SCORING_MODULE_ADDRESS=0x...  # From .env (mainnet)
NEXT_PUBLIC_GMEOW_CORE_ADDRESS=0x...
```

### Code Changes Required
1. Create `lib/contracts/scoringModuleABI.ts`
   - Copy from `abi/ScoringModule.json`

2. Create `hooks/useOnChainScoring.ts`
   - Import ABI and addresses
   - Create hooks for getUserStats, getLevelProgress, etc.

3. Update API routes
   - `app/api/viral/stats/route.ts`
   - `app/api/viral/leaderboard/route.ts`

4. Update profile page
   - Use new hooks instead of unified-calculator

### Testing Checklist
- [ ] getUserStats() returns correct data
- [ ] Level progression matches expectations
- [ ] Rank tiers display correctly
- [ ] Multipliers show properly
- [ ] Profile page loads stats
- [ ] Leaderboard uses on-chain data
- [ ] Error handling works (RPC down)
- [ ] Loading states implemented
- [ ] Cache configuration optimal

## Monitoring & Observability

### Set Up Monitoring
```typescript
// Add to app initialization
import { reportError } from '@/lib/monitoring'

// Wrap all contract calls
const { data, error } = useReadContract({
  ...contractConfig,
  onError: (error) => {
    reportError('ScoringModule.getUserStats', error, { address })
  }
})
```

### Key Metrics to Track
- [ ] Contract call success rate (should be >99.9%)
- [ ] Average response time (should be <200ms)
- [ ] Cache hit rate (should be >80%)
- [ ] Gas costs per transaction
- [ ] Number of active users querying stats
- [ ] On-chain vs off-chain discrepancies (should be 0)

### Alerts to Configure
- Contract call failure rate >1%
- Response time >500ms sustained
- Gas price spike >100 gwei
- RPC rate limiting triggered
- Unexpected contract behavior

## Rollback Plan

### Level 1: Quick Fix (Frontend Only)
```typescript
// Feature flag approach
const USE_ONCHAIN = process.env.NEXT_PUBLIC_USE_ONCHAIN_SCORING === 'true'

// Toggle in .env.production
NEXT_PUBLIC_USE_ONCHAIN_SCORING=false  # Disable on-chain
```
**Recovery Time**: ~5 minutes (Vercel redeploy)

### Level 2: Partial Rollback (API Routes)
- Keep contracts deployed
- Revert API routes to use off-chain calculator
- Keep frontend using Supabase data
**Recovery Time**: ~15 minutes

### Level 3: Full Rollback (Contracts)
- Deploy previous contract version
- Update addresses in .env
- Redeploy frontend
**Recovery Time**: ~1 hour

## Success Criteria

### Deployment Success
- [x] All 36 tests passing
- [ ] Contracts deployed to Sepolia
- [ ] Contracts verified on BaseScan
- [ ] Test scenarios validated
- [ ] Gas costs acceptable
- [ ] No errors for 48 hours

### Integration Success
- [ ] Frontend queries on-chain data
- [ ] Profile page displays stats
- [ ] Leaderboard uses on-chain rankings
- [ ] Response times <200ms
- [ ] Cache working correctly
- [ ] Error handling graceful

### Production Success
- [ ] Mainnet deployment successful
- [ ] All validation tests pass
- [ ] Frontend production deployed
- [ ] User feedback positive
- [ ] No discrepancies vs off-chain
- [ ] Gas costs under $0.02/tx
- [ ] Monitoring dashboards green

## Emergency Contacts

- **Smart Contract Issues**: Check BaseScan, then rollback
- **RPC Issues**: Check https://status.base.org
- **Frontend Issues**: Check Vercel logs
- **Gas Price Spikes**: Wait or adjust max gas price

## Final Checks Before Mainnet

### Code Review
- [ ] All team members reviewed contracts
- [ ] Security audit considered (for high-value contracts)
- [ ] Edge cases tested
- [ ] Gas optimization reviewed

### Testing
- [ ] Unit tests: 36/36 passing ✅
- [ ] Integration tests: CoreModule working ✅
- [ ] Sepolia testnet: 48+ hours successful
- [ ] Load testing: 100+ concurrent users
- [ ] Failure scenarios: Tested and handled

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Frontend integration guide complete
- [ ] Deployment runbook ready

### Team Alignment
- [ ] Product team approved
- [ ] Engineering team ready
- [ ] Support team briefed
- [ ] Rollback plan communicated

---

## Ready to Deploy?

If all items are checked ✅, you're ready to:

1. **Deploy to Sepolia**: `./scripts/deploy-scoring-system.sh sepolia`
2. **Validate for 48 hours**: Monitor gas, errors, calculations
3. **Deploy to Mainnet**: `./scripts/deploy-scoring-system.sh mainnet`
4. **Update Frontend**: Integrate on-chain data
5. **Monitor & Celebrate**: 🎉

**Current Status**: Code ready ✅, awaiting deployment decision
