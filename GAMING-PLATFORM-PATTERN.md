/**
 * Gaming Platform Pattern: Pending Rewards System
 * 
 * PROFESSIONAL PATTERN (Used by: Steam, Xbox, PlayStation, League of Legends)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * BALANCE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. **DISPLAY BALANCE** (total_score):
 *    - What users see in UI
 *    - On-chain points + Pending rewards
 *    - Used for: Leaderboard ranking, profile badges, flex
 * 
 * 2. **SPENDABLE BALANCE** (points_balance):
 *    - Real on-chain balance in contract
 *    - Only this can be spent on: badges, quests, tips
 *    - Updates via: GM posts, deposits, oracle claims
 * 
 * 3. **PENDING REWARDS** (pending_rewards):
 *    - Off-chain bonuses not yet on-chain
 *    - Viral XP + Guild + Referral + Streak + Badge bonuses
 *    - Claimed via: Oracle wallet deposits to contract
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CLAIM FLOW (Gaming Platform Pattern)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Example User State:**
 * ```json
 * {
 *   "display_balance": 23,100,    // Shown in UI (on-chain + pending)
 *   "spendable_balance": 10,000,  // Can spend this
 *   "pending_rewards": 13,100,    // Can claim this
 *   
 *   "breakdown": {
 *     "on_chain": 10,000,         // Real balance in contract
 *     "viral_xp": 850,            // Pending (off-chain)
 *     "guild_bonus": 7,500,       // Pending (off-chain)
 *     "referral_bonus": 2,500,    // Pending (off-chain)
 *     "streak_bonus": 450,        // Pending (off-chain)
 *     "badge_prestige": 1,800     // Pending (off-chain)
 *   }
 * }
 * ```
 * 
 * **Claim Process:**
 * 
 * 1. User clicks "Claim Rewards" button
 * 2. Frontend calls `/api/rewards/claim` with wallet address
 * 3. Backend:
 *    a. Calculate pending rewards from 3 layers
 *    b. Verify user owns wallet (signature check)
 *    c. Oracle wallet deposits points to user's contract balance
 *    d. Mark rewards as claimed in Supabase
 * 4. Contract `pointsBalance` increases by pending_rewards amount
 * 5. Frontend updates: spendable = spendable + pending, pending = 0
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS PATTERN?
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Benefits:**
 * ✅ Users see full value immediately (gamification)
 * ✅ No gas costs for earning off-chain bonuses
 * ✅ Batch claim reduces on-chain transactions
 * ✅ Oracle can enforce cooldowns/limits
 * ✅ Can add bonus multipliers during claim
 * 
 * **Examples from Gaming:**
 * - Steam: Trading cards (pending) → wallet (claimed)
 * - Xbox: Achievements XP (pending) → Gamerscore (claimed)
 * - LoL: Honor rewards (pending) → Blue Essence (claimed)
 * - Fortnite: Battle Pass XP (pending) → V-Bucks (claimed)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Database Schema (Supabase):**
 * 
 * ```sql
 * CREATE TABLE reward_claims (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   wallet_address TEXT NOT NULL,
 *   fid BIGINT,
 *   
 *   -- Reward breakdown
 *   viral_xp_claimed BIGINT DEFAULT 0,
 *   guild_bonus_claimed BIGINT DEFAULT 0,
 *   referral_bonus_claimed BIGINT DEFAULT 0,
 *   streak_bonus_claimed BIGINT DEFAULT 0,
 *   badge_prestige_claimed BIGINT DEFAULT 0,
 *   total_claimed BIGINT NOT NULL,
 *   
 *   -- Oracle deposit
 *   tx_hash TEXT UNIQUE,
 *   oracle_address TEXT DEFAULT '0x8870C155666809609176260F2B65a626C000D773',
 *   
 *   -- Metadata
 *   claimed_at TIMESTAMPTZ DEFAULT NOW(),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_reward_claims_wallet ON reward_claims(wallet_address);
 * CREATE INDEX idx_reward_claims_fid ON reward_claims(fid);
 * ```
 * 
 * **API Endpoint:**
 * 
 * ```typescript
 * // POST /api/rewards/claim
 * export async function POST(request: Request) {
 *   const { walletAddress, signature } = await request.json()
 *   
 *   // 1. Verify signature
 *   const verified = await verifySignature(walletAddress, signature)
 *   if (!verified) return { error: 'Invalid signature' }
 *   
 *   // 2. Calculate pending rewards (3-layer)
 *   const pending = await calculatePendingRewards(walletAddress)
 *   
 *   if (pending.total === 0) {
 *     return { error: 'No pending rewards' }
 *   }
 *   
 *   // 3. Oracle deposits to contract
 *   const tx = await oracleDeposit(walletAddress, pending.total)
 *   
 *   // 4. Record claim
 *   await supabase.from('reward_claims').insert({
 *     wallet_address: walletAddress,
 *     viral_xp_claimed: pending.viral_xp,
 *     guild_bonus_claimed: pending.guild_bonus,
 *     referral_bonus_claimed: pending.referral_bonus,
 *     streak_bonus_claimed: pending.streak_bonus,
 *     badge_prestige_claimed: pending.badge_prestige,
 *     total_claimed: pending.total,
 *     tx_hash: tx.hash
 *   })
 *   
 *   return { 
 *     success: true, 
 *     claimed: pending.total,
 *     tx_hash: tx.hash 
 *   }
 * }
 * ```
 * 
 * **Oracle Deposit Function:**
 * 
 * ```typescript
 * import { ensureOracleBalance } from '@/lib/contracts/auto-deposit-oracle'
 * 
 * async function oracleDeposit(
 *   userAddress: string, 
 *   amount: bigint
 * ): Promise<{ hash: string }> {
 *   // 1. Ensure oracle has enough balance
 *   await ensureOracleBalance('base', amount)
 *   
 *   // 2. Oracle wallet deposits to user
 *   const tx = await writeContract({
 *     address: GMEOW_CORE_ADDRESS,
 *     abi: GMEOW_CORE_ABI,
 *     functionName: 'depositFor',
 *     args: [userAddress, amount],
 *     account: ORACLE_WALLET, // 0x8870C155666809609176260F2B65a626C000D773
 *   })
 *   
 *   return { hash: tx }
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CLAIM RESTRICTIONS (Professional Pattern)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Cooldowns (Prevent Abuse):**
 * - Minimum claim amount: 100 points (avoid micro-claims)
 * - Cooldown period: 24 hours between claims
 * - Max claims per week: 3
 * 
 * **Bonuses (Gamification):**
 * - Weekly claim bonus: +5% if claim once per week
 * - Monthly claim bonus: +10% if claim once per month
 * - Streak bonus: +1% per consecutive week claimed
 * 
 * **Example:**
 * ```typescript
 * const MIN_CLAIM = 100
 * const COOLDOWN_HOURS = 24
 * 
 * // Check cooldown
 * const lastClaim = await getLastClaim(walletAddress)
 * const hoursSince = (Date.now() - lastClaim.claimed_at) / 3600000
 * 
 * if (hoursSince < COOLDOWN_HOURS) {
 *   return { error: `Cooldown: ${COOLDOWN_HOURS - hoursSince}h remaining` }
 * }
 * 
 * if (pending.total < MIN_CLAIM) {
 *   return { error: `Minimum claim: ${MIN_CLAIM} points` }
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * UI/UX DESIGN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Profile Balance Display:**
 * 
 * ```tsx
 * <BalanceCard>
 *   <TotalBalance>
 *     {formatPoints(total_score)} {/* 23,100 */}
 *     <Badge>Display Balance</Badge>
 *   </TotalBalance>
 *   
 *   <BalanceBreakdown>
 *     <Row>
 *       <Label>Spendable</Label>
 *       <Value>{formatPoints(points_balance)}</Value> {/* 10,000 */}
 *     </Row>
 *     <Row className="highlight">
 *       <Label>Pending Rewards</Label>
 *       <Value>{formatPoints(pending_rewards)}</Value> {/* 13,100 */}
 *       <ClaimButton onClick={handleClaim}>Claim</ClaimButton>
 *     </Row>
 *   </BalanceBreakdown>
 *   
 *   <RewardDetails>
 *     <Detail>Viral XP: {viral_xp}</Detail>
 *     <Detail>Guild Bonus: {guild_bonus}</Detail>
 *     <Detail>Referral Bonus: {referral_bonus}</Detail>
 *     <Detail>Streak Bonus: {streak_bonus}</Detail>
 *     <Detail>Badge Prestige: {badge_prestige}</Detail>
 *   </RewardDetails>
 * </BalanceCard>
 * ```
 * 
 * **Claim Rewards Modal:**
 * 
 * ```tsx
 * <ClaimModal>
 *   <Title>Claim Pending Rewards</Title>
 *   
 *   <Amount>+{formatPoints(pending_rewards)} points</Amount>
 *   
 *   <Breakdown>
 *     {viral_xp > 0 && <Item>Viral XP: +{viral_xp}</Item>}
 *     {guild_bonus > 0 && <Item>Guild Bonus: +{guild_bonus}</Item>}
 *     {referral_bonus > 0 && <Item>Referrals: +{referral_bonus}</Item>}
 *     {streak_bonus > 0 && <Item>Streak: +{streak_bonus}</Item>}
 *     {badge_prestige > 0 && <Item>Badges: +{badge_prestige}</Item>}
 *   </Breakdown>
 *   
 *   <Info>
 *     Once claimed, rewards are added to your spendable balance.
 *     Cooldown: 24 hours between claims.
 *   </Info>
 *   
 *   <Actions>
 *     <Button onClick={claim}>Claim Now</Button>
 *     <Button variant="secondary" onClick={close}>Later</Button>
 *   </Actions>
 * </ClaimModal>
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SECURITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Signature Verification:**
 * - User signs message with wallet
 * - Backend verifies signature matches wallet
 * - Prevents unauthorized claims
 * 
 * **Oracle Security:**
 * - Oracle private key stored in secure env (AWS Secrets Manager)
 * - Rate limiting on claim endpoint
 * - Monitor oracle balance alerts
 * - Automatic refill when balance < threshold
 * 
 * **Claim Validation:**
 * - Double-check calculations before deposit
 * - Log all claims for audit
 * - Alert on suspicious patterns (> 1M points/day)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * MIGRATION PLAN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * **Phase 1: Add pending_rewards field**
 * - Update LeaderboardEntry interface ✅
 * - Calculate pending in leaderboard-service.ts ✅
 * - Display in UI (show breakdown)
 * 
 * **Phase 2: Create claim system**
 * - Create reward_claims table
 * - Build /api/rewards/claim endpoint
 * - Add signature verification
 * - Oracle deposit integration
 * 
 * **Phase 3: Add UI**
 * - Profile balance card with claim button
 * - Claim rewards modal
 * - Transaction history
 * - Cooldown timer
 * 
 * **Phase 4: Gamification**
 * - Add claim bonuses
 * - Streak multipliers
 * - Achievement badges for claiming
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const GAMING_PLATFORM_PATTERN = 'PENDING_REWARDS_SYSTEM'
