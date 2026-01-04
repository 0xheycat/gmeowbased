// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./BaseModule.sol";

/**
 * @title ScoringModule
 * @notice On-chain scoring system with level progression, rank tiers, and multipliers
 * @dev Implements exact formulas from lib/scoring/unified-calculator.ts
 * 
 * SCORING SYSTEM OVERVIEW:
 * 
 * 1. LEVEL PROGRESSION (Quadratic Formula)
 *    - Base: 300 XP for level 1→2
 *    - Increment: +200 XP per level
 *    - Formula: level = (-b + √(b² + 4ac)) / 2a
 *    - Example: 2100 XP = Level 5
 * 
 * 2. RANK TIERS (12 Tiers)
 *    - Beginner: 0-4K points (3 tiers)
 *    - Intermediate: 4K-25K points (3 tiers)
 *    - Advanced: 25K-100K points (3 tiers)
 *    - Legendary: 100K+ points (3 tiers)
 * 
 * 3. MULTIPLIERS (Rank-Based)
 *    - Beacon Runner (1,500+): 1.1x
 *    - Star Captain (8,000+): 1.2x
 *    - Quantum Navigator (25,000+): 1.3x
 *    - Void Walker (60,000+): 1.5x
 *    - Infinite GM (250,000+): 2.0x
 * 
 * 4. TOTAL SCORE TRACKING
 *    - Points Balance (GM rewards, quest claims)
 *    - Viral XP (Farcaster engagement, oracle-updated)
 *    - Quest Points (off-chain completions)
 *    - Guild Points (guild rewards)
 *    - Referral Points (referral bonuses)
 */
contract ScoringModule is BaseModule {
    // ========================================
    // CONSTANTS
    // ========================================
    
    /// @notice Base XP required for level 1→2
    uint256 public constant LEVEL_XP_BASE = 300;
    
    /// @notice XP increment per level (linear component)
    uint256 public constant LEVEL_XP_INCREMENT = 200;
    
    // ========================================
    // STRUCTS
    // ========================================
    
    /// @notice Configuration for a rank tier
    struct RankTierConfig {
        uint256 minPoints;      // Minimum points for this tier
        uint256 maxPoints;      // Maximum points (exclusive)
        uint16 multiplier;      // In basis points (1000 = 1.0x, 1100 = 1.1x)
        bool hasMultiplier;     // Whether this tier grants a multiplier bonus
    }
    
    // ========================================
    // STATE VARIABLES
    // ========================================
    
    /// @notice Authorized contracts that can update user stats
    mapping(address => bool) public authorizedContracts;
    
    /// @notice 12-tier rank system configuration
    RankTierConfig[12] public rankTiers;
    
    /// @notice Total score per user (sum of all point categories)
    mapping(address => uint256) public totalScore;
    
    /// @notice Current level per user
    mapping(address => uint256) public userLevel;
    
    /// @notice Current rank tier index per user (0-11)
    mapping(address => uint8) public userRankTier;
    
    // Score component tracking (for transparency and oracle updates)
    /// @notice Points from GM rewards and quest claims (blockchain-verified)
    /// @dev Separate from BaseModule's pointsBalance for scoring system tracking
    mapping(address => uint256) public scoringPointsBalance;
    
    /// @notice Viral engagement XP (updated by oracle from Farcaster data)
    mapping(address => uint256) public viralPoints;
    
    /// @notice Quest completion points (off-chain quests)
    mapping(address => uint256) public questPoints;
    
    /// @notice Guild activity points
    mapping(address => uint256) public guildPoints;
    
    /// @notice Referral bonus points
    mapping(address => uint256) public referralPoints;
    
    /// @notice Season system for competitive resets
    uint256 public currentSeason;
    
    /// @notice Historical season scores
    mapping(uint256 => mapping(address => uint256)) public seasonScores;
    
    /// @notice Season metadata
    mapping(uint256 => SeasonInfo) public seasons;
    
    /// @notice Emergency pause for point modifications
    bool public pointModificationPaused;
    
    /// @notice Struct for season information
    struct SeasonInfo {
        uint256 startTime;
        uint256 endTime;
        bool active;
        string name;
    }
    
    // ========================================
    // EVENTS
    // ========================================
    
    /// @notice Emitted when user stats are recalculated
    event StatsUpdated(
        address indexed user,
        uint256 totalScore,
        uint256 level,
        uint8 rankTier,
        uint16 multiplier
    );    
    /// @notice Emitted when points are deducted from user
    event PointsDeducted(
        address indexed user,
        uint256 amount,
        string reason
    );
    
    /// @notice Emitted when user stats are reset
    event StatsReset(
        address indexed user,
        uint256 previousScore
    );
    
    /// @notice Emitted when a new season starts
    event SeasonStarted(
        uint256 indexed seasonId,
        string name,
        uint256 startTime
    );
    
    /// @notice Emitted when a season ends
    event SeasonEnded(
        uint256 indexed seasonId,
        uint256 endTime
    );
    
    /// @notice Emitted when point modification is paused/unpaused
    event PointModificationPauseChanged(
        bool paused
    );    
    /// @notice Emitted when user levels up
    event LevelUp(
        address indexed user,
        uint256 oldLevel,
        uint256 newLevel,
        uint256 totalScore
    );
    
    /// @notice Emitted when user ranks up
    event RankUp(
        address indexed user,
        uint8 oldTier,
        uint8 newTier,
        uint256 totalScore
    );
    
    // ========================================
    // CONSTRUCTOR
    // ========================================
    
    constructor() Ownable(msg.sender) {
        _initializeRankTiers();
    }
    
    // ========================================
    // MODIFIERS
    // ========================================
    
    /**
     * @notice Override base modifier to use ScoringModule's authorizedContracts
     */
    modifier onlyAuthorized() override {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // ========================================
    // ADMIN FUNCTIONS
    // ========================================
    
    /**
     * @notice Authorize a contract to call protected functions
     * @param contractAddr Contract address to authorize
     * @param status Authorization status
     */
    function authorizeContract(address contractAddr, bool status) external onlyOwner {
        require(contractAddr != address(0), "Zero address not allowed");
        authorizedContracts[contractAddr] = status;
    }
    
    /**
     * @notice Set authorized oracle
     * @param oracle Oracle address
     * @param authorized Authorization status
     */
    function setAuthorizedOracle(address oracle, bool authorized) external onlyOwner {
        require(oracle != address(0), "Zero address not allowed");
        authorizedOracles[oracle] = authorized;
    }
    
    /**
     * @notice Initialize 12-tier rank system with exact thresholds from unified-calculator.ts
     * @dev Called once in constructor
     */
    function _initializeRankTiers() private {
        // Beginner tiers (0-4K)
        rankTiers[0] = RankTierConfig({
            minPoints: 0,
            maxPoints: 500,
            multiplier: 1000,
            hasMultiplier: false
        }); // Signal Kitten
        
        rankTiers[1] = RankTierConfig({
            minPoints: 500,
            maxPoints: 1500,
            multiplier: 1000,
            hasMultiplier: false
        }); // Warp Scout
        
        rankTiers[2] = RankTierConfig({
            minPoints: 1500,
            maxPoints: 4000,
            multiplier: 1100,
            hasMultiplier: true
        }); // Beacon Runner: 1.1x
        
        // Intermediate tiers (4K-25K)
        rankTiers[3] = RankTierConfig({
            minPoints: 4000,
            maxPoints: 8000,
            multiplier: 1000,
            hasMultiplier: false
        }); // Night Operator
        
        rankTiers[4] = RankTierConfig({
            minPoints: 8000,
            maxPoints: 15000,
            multiplier: 1200,
            hasMultiplier: true
        }); // Star Captain: 1.2x
        
        rankTiers[5] = RankTierConfig({
            minPoints: 15000,
            maxPoints: 25000,
            multiplier: 1000,
            hasMultiplier: false
        }); // Nebula Commander
        
        // Advanced tiers (25K-100K)
        rankTiers[6] = RankTierConfig({
            minPoints: 25000,
            maxPoints: 40000,
            multiplier: 1300,
            hasMultiplier: true
        }); // Quantum Navigator: 1.3x
        
        rankTiers[7] = RankTierConfig({
            minPoints: 40000,
            maxPoints: 60000,
            multiplier: 1000,
            hasMultiplier: false
        }); // Cosmic Architect
        
        rankTiers[8] = RankTierConfig({
            minPoints: 60000,
            maxPoints: 100000,
            multiplier: 1500,
            hasMultiplier: true
        }); // Void Walker: 1.5x
        
        // Legendary tiers (100K+)
        rankTiers[9] = RankTierConfig({
            minPoints: 100000,
            maxPoints: 250000,
            multiplier: 1000,
            hasMultiplier: false
        }); // Singularity Prime
        
        rankTiers[10] = RankTierConfig({
            minPoints: 250000,
            maxPoints: 500000,
            multiplier: 2000,
            hasMultiplier: true
        }); // Infinite GM: 2.0x
        
        rankTiers[11] = RankTierConfig({
            minPoints: 500000,
            maxPoints: type(uint256).max,
            multiplier: 1000,
            hasMultiplier: false
        }); // Omniversal Being (mythic, custom rewards)
    }
    
    // ========================================
    // INTERNAL CALCULATION FUNCTIONS
    // ========================================
    
    /**
     * @notice Calculate level from total points using quadratic formula
     * @dev Matches unified-calculator.ts calculateLevelProgress() exactly
     * @param points Total user score
     * @return level Current level (1-based indexing)
     * 
     * Formula derivation:
     * - XP for level n: 300 + (n-1) × 200
     * - Total XP to reach level n: Σ(300 + i×200) from i=0 to n-1
     * - Simplified: (n² × 100) + (n × 200) - 300
     * - Solve for n: n = (-b + √(b² + 4ac)) / 2a
     *   where a = 100, b = 200, c = -points
     */
    function calculateLevel(uint256 points) public pure returns (uint256 level) {
        if (points == 0) return 1;
        
        // Quadratic formula coefficients
        uint256 a = LEVEL_XP_INCREMENT / 2;  // 100
        uint256 b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2;  // 200
        
        // Calculate discriminant: b² + 4ac (note: c is absorbed into points)
        uint256 discriminant = (b * b) + (4 * a * points);
        
        // Newton's method for sqrt (gas-efficient)
        uint256 sqrtDiscriminant = _sqrt(discriminant);
        
        // Solve quadratic: (-b + √discriminant) / 2a
        // Note: We use (√discriminant - b) because b is positive
        uint256 raw = (sqrtDiscriminant - b) / (2 * a);
        
        // Refinement: match TypeScript implementation's while loops
        // This handles edge cases where quadratic approximation is slightly off
        uint256 n = raw;
        
        // Check if user has enough XP for level n+2
        while (getTotalXpToReachLevel(n + 2) <= points) {
            n += 1;
        }
        
        // Check if user doesn't have enough XP for level n+1
        while (n > 0 && getTotalXpToReachLevel(n + 1) > points) {
            n -= 1;
        }
        
        return n + 1;
    }
    
    /**
     * @notice Gas-efficient integer square root using Newton's method
     * @dev Babylonian method with convergence guarantee
     * @param x Input value
     * @return y Square root of x (rounded down)
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        // Initial guess: (x + 1) / 2
        uint256 z = (x + 1) / 2;
        y = x;
        
        // Converge: z = (x/z + z) / 2
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
    
    /**
     * @notice Get rank tier index from points
     * @dev Linear search through 12 tiers (low gas cost due to small array)
     * @param points Total user score
     * @return tierIndex Index (0-11)
     */
    function getRankTier(uint256 points) public view returns (uint8 tierIndex) {
        for (uint8 i = 0; i < 12; i++) {
            if (points >= rankTiers[i].minPoints && points < rankTiers[i].maxPoints) {
                return i;
            }
        }
        return 11;  // Omniversal Being (500K+)
    }
    
    /**
     * @notice Get multiplier for a rank tier
     * @param tierIndex Tier index (0-11)
     * @return multiplier In basis points (1100 = 1.1x, 1000 = 1.0x)
     */
    function getMultiplier(uint8 tierIndex) public view returns (uint16 multiplier) {
        require(tierIndex < 12, "Invalid tier");
        
        RankTierConfig memory tier = rankTiers[tierIndex];
        return tier.hasMultiplier ? tier.multiplier : 1000;  // Default 1.0x
    }
    
    /**
     * @notice Update user's total score and recalculate derived stats
     * @dev Called after any point update. Emits events on level/rank changes.
     * @param user User address
     */
    function _updateUserStats(address user) internal {
        // Calculate total score (sum of all components)
        uint256 newScore = scoringPointsBalance[user] + 
                          viralPoints[user] + 
                          questPoints[user] + 
                          guildPoints[user] + 
                          referralPoints[user];
        
        uint256 oldScore = totalScore[user];
        totalScore[user] = newScore;
        
        // Recalculate level
        // Get old level (treat 0 as level 1 for new users)
        uint256 oldLevel = userLevel[user];
        if (oldLevel == 0) oldLevel = 1;
        
        uint256 newLevel = calculateLevel(newScore);
        userLevel[user] = newLevel;
        
        // Recalculate rank tier
        uint8 oldTier = userRankTier[user];
        uint8 newTier = getRankTier(newScore);
        userRankTier[user] = newTier;
        
        // Get current multiplier
        uint16 multiplier = getMultiplier(newTier);
        
        // Emit events
        emit StatsUpdated(user, newScore, newLevel, newTier, multiplier);
        
        if (newLevel > oldLevel) {
            emit LevelUp(user, oldLevel, newLevel, newScore);
        }
        
        if (newTier > oldTier) {
            emit RankUp(user, oldTier, newTier, newScore);
        }
    }
    
    // ========================================
    // EXTERNAL UPDATE FUNCTIONS
    // ========================================
    
    /**
     * @notice Add points to user balance (called by CoreModule for GM/quest rewards)
     * @param user User address
     * @param amount Points to add
     */
    function addPoints(address user, uint256 amount) external onlyAuthorized {
        scoringPointsBalance[user] += amount;
        _updateUserStats(user);
    }
    
    /**
     * @notice Set viral points (called by oracle after indexing Farcaster engagement)
     * @param user User address
     * @param amount Total viral XP (replaces previous value)
     */
    function setViralPoints(address user, uint256 amount) external onlyOracle {
        viralPoints[user] = amount;
        _updateUserStats(user);
    }
    
    /**
     * @notice Add quest points (called by off-chain quest completion oracle)
     * @param user User address
     * @param amount Points earned
     */
    function addQuestPoints(address user, uint256 amount) external onlyAuthorized {
        questPoints[user] += amount;
        _updateUserStats(user);
    }
    
    /**
     * @notice Add guild points (called by guild reward system)
     * @param user User address
     * @param amount Points earned
     */
    function addGuildPoints(address user, uint256 amount) external onlyAuthorized {
        guildPoints[user] += amount;
        _updateUserStats(user);
    }
    
    /**
     * @notice Add referral points (called by referral system)
     * @param user User address
     * @param amount Points earned
     */
    function addReferralPoints(address user, uint256 amount) external onlyAuthorized {
        referralPoints[user] += amount;
        _updateUserStats(user);
    }
    
    // ========================================
    // ADMIN MODIFICATION FUNCTIONS
    // ========================================
    
    /**
     * @notice Deduct points from user (authorized contracts)
     * @param user User address
     * @param amount Points to deduct
     * @param reason Reason for deduction
     * @dev Deducts from scoringPointsBalance but checks totalScore (sum of all categories)
     */
    function deductPoints(address user, uint256 amount, string memory reason) external onlyAuthorized {
        require(!pointModificationPaused, "Point modification paused");
        
        // Calculate current total across all categories
        uint256 currentTotal = scoringPointsBalance[user] + 
                              viralPoints[user] + 
                              questPoints[user] + 
                              guildPoints[user] + 
                              referralPoints[user];
        
        require(currentTotal >= amount, "Insufficient points");
        
        // Deduct from scoringPointsBalance first
        if (scoringPointsBalance[user] >= amount) {
            scoringPointsBalance[user] -= amount;
        } else {
            // If scoringPointsBalance insufficient, deduct from viral points
            uint256 remaining = amount - scoringPointsBalance[user];
            scoringPointsBalance[user] = 0;
            
            if (viralPoints[user] >= remaining) {
                viralPoints[user] -= remaining;
            } else {
                // This shouldn't happen due to totalScore check, but just in case
                uint256 remaining2 = remaining - viralPoints[user];
                viralPoints[user] = 0;
                
                if (questPoints[user] >= remaining2) {
                    questPoints[user] -= remaining2;
                } else {
                    uint256 remaining3 = remaining2 - questPoints[user];
                    questPoints[user] = 0;
                    
                    if (guildPoints[user] >= remaining3) {
                        guildPoints[user] -= remaining3;
                    } else {
                        uint256 remaining4 = remaining3 - guildPoints[user];
                        guildPoints[user] = 0;
                        referralPoints[user] -= remaining4;
                    }
                }
            }
        }
        
        _updateUserStats(user);
        
        emit PointsDeducted(user, amount, reason);
    }
    
    /**
     * @notice Reset all user stats to zero (emergency function)
     * @param user User address
     */
    function resetUserScore(address user) external onlyOwner {
        require(!pointModificationPaused, "Point modification paused");
        
        uint256 previousScore = totalScore[user];
        
        totalScore[user] = 0;
        userLevel[user] = 1;
        userRankTier[user] = 0;
        scoringPointsBalance[user] = 0;
        viralPoints[user] = 0;
        questPoints[user] = 0;
        guildPoints[user] = 0;
        referralPoints[user] = 0;
        
        emit StatsReset(user, previousScore);
    }
    
    /**
     * @notice Batch reset multiple users (for season transitions)
     * @param users Array of user addresses
     */
    function batchResetUsers(address[] calldata users) external onlyOwner {
        require(!pointModificationPaused, "Point modification paused");
        
        for (uint256 i = 0; i < users.length; i++) {
            uint256 previousScore = totalScore[users[i]];
            
            totalScore[users[i]] = 0;
            userLevel[users[i]] = 1;
            userRankTier[users[i]] = 0;
            scoringPointsBalance[users[i]] = 0;
            viralPoints[users[i]] = 0;
            questPoints[users[i]] = 0;
            guildPoints[users[i]] = 0;
            referralPoints[users[i]] = 0;
            
            emit StatsReset(users[i], previousScore);
        }
    }
    
    /**
     * @notice Toggle point modification pause (emergency brake)
     * @param paused Whether to pause point modifications
     */
    function setPointModificationPause(bool paused) external onlyOwner {
        pointModificationPaused = paused;
        emit PointModificationPauseChanged(paused);
    }
    
    // ========================================
    // SEASON SYSTEM FUNCTIONS
    // ========================================
    
    /**
     * @notice Start a new competitive season
     * @param name Season name (e.g., "Season 1: Cosmic Dawn")
     */
    function startNewSeason(string memory name) external onlyOwner {
        // End previous season if active
        if (currentSeason > 0 && seasons[currentSeason].active) {
            seasons[currentSeason].endTime = block.timestamp;
            seasons[currentSeason].active = false;
            emit SeasonEnded(currentSeason, block.timestamp);
        }
        
        // Start new season
        currentSeason++;
        seasons[currentSeason] = SeasonInfo({
            startTime: block.timestamp,
            endTime: 0,
            active: true,
            name: name
        });
        
        emit SeasonStarted(currentSeason, name, block.timestamp);
    }
    
    /**
     * @notice End current season
     */
    function endCurrentSeason() external onlyOwner {
        require(currentSeason > 0, "No active season");
        require(seasons[currentSeason].active, "Season already ended");
        
        seasons[currentSeason].endTime = block.timestamp;
        seasons[currentSeason].active = false;
        
        emit SeasonEnded(currentSeason, block.timestamp);
    }
    
    /**
     * @notice Archive user's current score to season history
     * @param user User address
     */
    function archiveSeasonScore(address user) external onlyAuthorized {
        require(currentSeason > 0, "No active season");
        seasonScores[currentSeason][user] = totalScore[user];
    }
    
    /**
     * @notice Batch archive season scores for multiple users
     * @param users Array of user addresses
     */
    function batchArchiveSeasonScores(address[] calldata users) external onlyOwner {
        require(currentSeason > 0, "No active season");
        
        for (uint256 i = 0; i < users.length; i++) {
            seasonScores[currentSeason][users[i]] = totalScore[users[i]];
        }
    }
    
    // ========================================
    // PUBLIC VIEW FUNCTIONS
    // ========================================
    
    /**
     * @notice Calculate XP required for a specific level
     * @param level Target level
     * @return xp XP needed to advance from (level-1) to level
     */
    function getXpForLevel(uint256 level) public pure returns (uint256 xp) {
        require(level >= 1, "Level must be >= 1");
        return LEVEL_XP_BASE + ((level - 1) * LEVEL_XP_INCREMENT);
    }
    
    /**
     * @notice Calculate total XP to reach a level
     * @param level Target level
     * @return totalXp Cumulative XP from level 1
     */
    function getTotalXpToReachLevel(uint256 level) public pure returns (uint256 totalXp) {
        if (level <= 1) return 0;
        
        uint256 n = level - 1;
        uint256 a = LEVEL_XP_INCREMENT / 2;  // 100
        uint256 b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2;  // 200
        
        // Formula: (a × n²) + (b × n)
        return (a * n * n) + (b * n);
    }
    
    /**
     * @notice Apply rank multiplier to XP
     * @param baseXP Base XP amount (before multiplier)
     * @param tierIndex User's rank tier (0-11)
     * @return finalXP Multiplied XP amount
     */
    function applyMultiplier(uint256 baseXP, uint8 tierIndex) public view returns (uint256 finalXP) {
        uint16 multiplier = getMultiplier(tierIndex);
        return (baseXP * multiplier) / 1000;
    }
    
    /**
     * @notice Get complete user stats (main query function)
     * @param user User address
     * @return level Current level
     * @return tier Rank tier index (0-11)
     * @return score Total score
     * @return multiplier Current multiplier in basis points (1100 = 1.1x)
     */
    function getUserStats(address user) external view returns (
        uint256 level,
        uint8 tier,
        uint256 score,
        uint16 multiplier
    ) {
        return (
            userLevel[user],
            userRankTier[user],
            totalScore[user],
            getMultiplier(userRankTier[user])
        );
    }
    
    /**
     * @notice Get level progression details
     * @param user User address
     * @return level Current level
     * @return xpIntoLevel XP earned in current level
     * @return xpForLevel Total XP needed for this level
     * @return xpToNext XP needed to reach next level
     */
    function getLevelProgress(address user) external view returns (
        uint256 level,
        uint256 xpIntoLevel,
        uint256 xpForLevel,
        uint256 xpToNext
    ) {
        uint256 score = totalScore[user];
        level = calculateLevel(score);
        
        uint256 levelFloor = getTotalXpToReachLevel(level);
        uint256 nextLevelTarget = getTotalXpToReachLevel(level + 1);
        
        xpIntoLevel = score - levelFloor;
        xpForLevel = nextLevelTarget - levelFloor;
        xpToNext = nextLevelTarget - score;
        
        return (level, xpIntoLevel, xpForLevel, xpToNext);
    }
    
    /**
     * @notice Get rank progression details
     * @param user User address
     * @return tierIndex Current tier (0-11)
     * @return pointsIntoTier Points earned in current tier
     * @return pointsToNext Points to next tier (0 if at max tier)
     * @return hasMultiplier Whether current tier has multiplier bonus
     */
    function getRankProgress(address user) external view returns (
        uint8 tierIndex,
        uint256 pointsIntoTier,
        uint256 pointsToNext,
        bool hasMultiplier
    ) {
        uint256 score = totalScore[user];
        tierIndex = getRankTier(score);
        
        RankTierConfig memory tier = rankTiers[tierIndex];
        pointsIntoTier = score - tier.minPoints;
        pointsToNext = tierIndex < 11 ? rankTiers[tierIndex + 1].minPoints - score : 0;
        hasMultiplier = tier.hasMultiplier;
        
        return (tierIndex, pointsIntoTier, pointsToNext, hasMultiplier);
    }
    
    /**
     * @notice Get breakdown of user's score by component
     * @param user User address
     * @return points Points from GM/quest claims (blockchain-verified)
     * @return viral Viral engagement XP
     * @return quest Off-chain quest points
     * @return guild Guild activity points
     * @return referral Referral bonus points
     * @return total Total score (sum)
     */
    function getScoreBreakdown(address user) external view returns (
        uint256 points,
        uint256 viral,
        uint256 quest,
        uint256 guild,
        uint256 referral,
        uint256 total
    ) {
        return (
            scoringPointsBalance[user],
            viralPoints[user],
            questPoints[user],
            guildPoints[user],
            referralPoints[user],
            totalScore[user]
        );
    }
    
    /**
     * @notice Get user's score for a specific season
     * @param seasonId Season number
     * @param user User address
     * @return score User's score in that season
     */
    function getSeasonScore(uint256 seasonId, address user) external view returns (uint256 score) {
        return seasonScores[seasonId][user];
    }
    
    /**
     * @notice Get current season information
     * @return seasonId Current season number
     * @return name Season name
     * @return startTime Season start timestamp
     * @return active Whether season is active
     */
    function getCurrentSeasonInfo() external view returns (
        uint256 seasonId,
        string memory name,
        uint256 startTime,
        bool active
    ) {
        if (currentSeason == 0) {
            return (0, "", 0, false);
        }
        
        SeasonInfo memory info = seasons[currentSeason];
        return (currentSeason, info.name, info.startTime, info.active);
    }
    
    /**
     * @notice Get season information by ID
     * @param seasonId Season number
     * @return name Season name
     * @return startTime Season start timestamp
     * @return endTime Season end timestamp (0 if ongoing)
     * @return active Whether season is active
     */
    function getSeasonInfo(uint256 seasonId) external view returns (
        string memory name,
        uint256 startTime,
        uint256 endTime,
        bool active
    ) {
        SeasonInfo memory info = seasons[seasonId];
        return (info.name, info.startTime, info.endTime, info.active);
    }
}
