// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../contract/modules/ScoringModule.sol";

/**
 * @title ScoringModuleTest
 * @notice Comprehensive tests for ScoringModule
 * @dev Validates formulas match unified-calculator.ts exactly
 */
contract ScoringModuleTest is Test {
    ScoringModule public scoring;
    
    address public owner = address(this);
    address public oracle = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    function setUp() public {
        scoring = new ScoringModule();
        
        // Authorize this test contract to call protected functions
        vm.prank(address(this));
        scoring.setAuthorizedOracle(oracle, true);
        
        vm.prank(address(this));
        scoring.authorizeContract(address(this), true);
    }
    
    // ========================================
    // LEVEL CALCULATION TESTS
    // ========================================
    
    function testLevelCalculation_ZeroPoints() public {
        uint256 level = scoring.calculateLevel(0);
        assertEq(level, 1, "0 points should be level 1");
    }
    
    function testLevelCalculation_Level2() public {
        // 300 XP = Level 2
        uint256 level = scoring.calculateLevel(300);
        assertEq(level, 2, "300 points should be level 2");
    }
    
    function testLevelCalculation_Level3() public {
        // 300 + 500 = 800 XP = Level 3
        uint256 level = scoring.calculateLevel(800);
        assertEq(level, 3, "800 points should be level 3");
    }
    
    function testLevelCalculation_Level5() public {
        // 300 + 500 + 700 + 900 = 2400 XP = Level 5
        uint256 level = scoring.calculateLevel(2400);
        assertEq(level, 5, "2400 points should be level 5");
    }
    
    function testLevelCalculation_Level10() public {
        // Sum from level 1 to 10
        // Formula: (n² × 100) + (n × 200) where n = level - 1
        // For level 10: n = 9, so (81 × 100) + (9 × 200) = 8100 + 1800 = 9900
        // Therefore 9900 XP = START of level 10
        uint256 level = scoring.calculateLevel(9900);
        assertEq(level, 10, "9900 points should be level 10");
    }
    
    function testLevelCalculation_MatchesGetTotalXp() public {
        // Test levels 1-20
        for (uint256 targetLevel = 1; targetLevel <= 20; targetLevel++) {
            uint256 xpNeeded = scoring.getTotalXpToReachLevel(targetLevel);
            uint256 calculatedLevel = scoring.calculateLevel(xpNeeded);
            assertEq(calculatedLevel, targetLevel, 
                string(abi.encodePacked("XP for level ", vm.toString(targetLevel), " should match")));
        }
    }
    
    function testGetXpForLevel() public {
        // Level 1→2: 300 XP
        assertEq(scoring.getXpForLevel(1), 300, "Level 1 should need 300 XP");
        
        // Level 2→3: 500 XP (300 + 200)
        assertEq(scoring.getXpForLevel(2), 500, "Level 2 should need 500 XP");
        
        // Level 3→4: 700 XP (300 + 400)
        assertEq(scoring.getXpForLevel(3), 700, "Level 3 should need 700 XP");
        
        // Level 10→11: 2100 XP (300 + 1800)
        assertEq(scoring.getXpForLevel(10), 2100, "Level 10 should need 2100 XP");
    }
    
    function testGetTotalXpToReachLevel() public {
        assertEq(scoring.getTotalXpToReachLevel(1), 0, "Level 1 starts at 0");
        assertEq(scoring.getTotalXpToReachLevel(2), 300, "Level 2 at 300");
        assertEq(scoring.getTotalXpToReachLevel(3), 800, "Level 3 at 800");
        assertEq(scoring.getTotalXpToReachLevel(5), 2400, "Level 5 at 2400");
    }
    
    // ========================================
    // RANK TIER TESTS
    // ========================================
    
    function testRankTier_SignalKitten() public {
        uint8 tier = scoring.getRankTier(0);
        assertEq(tier, 0, "0 points = Signal Kitten (tier 0)");
        
        tier = scoring.getRankTier(499);
        assertEq(tier, 0, "499 points = Signal Kitten (tier 0)");
    }
    
    function testRankTier_WarpScout() public {
        uint8 tier = scoring.getRankTier(500);
        assertEq(tier, 1, "500 points = Warp Scout (tier 1)");
        
        tier = scoring.getRankTier(1499);
        assertEq(tier, 1, "1499 points = Warp Scout (tier 1)");
    }
    
    function testRankTier_BeaconRunner() public {
        uint8 tier = scoring.getRankTier(1500);
        assertEq(tier, 2, "1500 points = Beacon Runner (tier 2)");
        
        tier = scoring.getRankTier(3999);
        assertEq(tier, 2, "3999 points = Beacon Runner (tier 2)");
    }
    
    function testRankTier_StarCaptain() public {
        uint8 tier = scoring.getRankTier(8000);
        assertEq(tier, 4, "8000 points = Star Captain (tier 4)");
        
        tier = scoring.getRankTier(14999);
        assertEq(tier, 4, "14999 points = Star Captain (tier 4)");
    }
    
    function testRankTier_InfiniteGM() public {
        uint8 tier = scoring.getRankTier(250000);
        assertEq(tier, 10, "250000 points = Infinite GM (tier 10)");
        
        tier = scoring.getRankTier(499999);
        assertEq(tier, 10, "499999 points = Infinite GM (tier 10)");
    }
    
    function testRankTier_OmniversalBeing() public {
        uint8 tier = scoring.getRankTier(500000);
        assertEq(tier, 11, "500000 points = Omniversal Being (tier 11)");
        
        tier = scoring.getRankTier(1000000);
        assertEq(tier, 11, "1000000 points = Omniversal Being (tier 11)");
    }
    
    function testRankTier_AllBoundaries() public {
        // Test exact boundary transitions
        uint256[12] memory minPoints = [
            uint256(0),      // Signal Kitten
            500,             // Warp Scout
            1500,            // Beacon Runner
            4000,            // Night Operator
            8000,            // Star Captain
            15000,           // Nebula Commander
            25000,           // Quantum Navigator
            40000,           // Cosmic Architect
            60000,           // Void Walker
            100000,          // Singularity Prime
            250000,          // Infinite GM
            500000           // Omniversal Being
        ];
        
        for (uint8 i = 0; i < 12; i++) {
            uint8 tier = scoring.getRankTier(minPoints[i]);
            assertEq(tier, i, string(abi.encodePacked("Tier ", vm.toString(i), " boundary failed")));
        }
    }
    
    // ========================================
    // MULTIPLIER TESTS
    // ========================================
    
    function testMultiplier_NoBonus() public {
        // Tiers without multipliers should return 1000 (1.0x)
        assertEq(scoring.getMultiplier(0), 1000, "Signal Kitten: 1.0x");
        assertEq(scoring.getMultiplier(1), 1000, "Warp Scout: 1.0x");
        assertEq(scoring.getMultiplier(3), 1000, "Night Operator: 1.0x");
    }
    
    function testMultiplier_BeaconRunner() public {
        assertEq(scoring.getMultiplier(2), 1100, "Beacon Runner: 1.1x");
    }
    
    function testMultiplier_StarCaptain() public {
        assertEq(scoring.getMultiplier(4), 1200, "Star Captain: 1.2x");
    }
    
    function testMultiplier_QuantumNavigator() public {
        assertEq(scoring.getMultiplier(6), 1300, "Quantum Navigator: 1.3x");
    }
    
    function testMultiplier_VoidWalker() public {
        assertEq(scoring.getMultiplier(8), 1500, "Void Walker: 1.5x");
    }
    
    function testMultiplier_InfiniteGM() public {
        assertEq(scoring.getMultiplier(10), 2000, "Infinite GM: 2.0x");
    }
    
    function testApplyMultiplier() public {
        // 100 base XP * 1.1x = 110 XP
        assertEq(scoring.applyMultiplier(100, 2), 110, "100 * 1.1x = 110");
        
        // 100 base XP * 1.2x = 120 XP
        assertEq(scoring.applyMultiplier(100, 4), 120, "100 * 1.2x = 120");
        
        // 100 base XP * 2.0x = 200 XP
        assertEq(scoring.applyMultiplier(100, 10), 200, "100 * 2.0x = 200");
        
        // Large numbers
        assertEq(scoring.applyMultiplier(1000, 8), 1500, "1000 * 1.5x = 1500");
    }
    
    // ========================================
    // SCORE TRACKING TESTS
    // ========================================
    
    function testAddPoints_UpdatesStatsCorrectly() public {
        // Add 1500 points (should be Beacon Runner, Level 4)
        // Level 4 starts at exactly 1500 XP
        scoring.addPoints(user1, 1500);
        
        assertEq(scoring.scoringPointsBalance(user1), 1500, "Points balance should be 1500");
        assertEq(scoring.totalScore(user1), 1500, "Total score should be 1500");
        assertEq(scoring.userLevel(user1), 4, "Should be level 4");
        assertEq(scoring.userRankTier(user1), 2, "Should be Beacon Runner (tier 2)");
    }
    
    function testSetViralPoints_UpdatesStatsCorrectly() public {
        vm.prank(oracle);
        scoring.setViralPoints(user1, 8500);
        
        assertEq(scoring.viralPoints(user1), 8500, "Viral points should be 8500");
        assertEq(scoring.totalScore(user1), 8500, "Total score should be 8500");
        assertEq(scoring.userRankTier(user1), 4, "Should be Star Captain (tier 4)");
    }
    
    function testMultiplePointSources() public {
        // Add points from different sources
        scoring.addPoints(user1, 1000);        // Points balance
        
        vm.prank(oracle);
        scoring.setViralPoints(user1, 2000);   // Viral points
        
        scoring.addQuestPoints(user1, 1500);   // Quest points
        scoring.addGuildPoints(user1, 500);    // Guild points
        scoring.addReferralPoints(user1, 1000);// Referral points
        
        // Total: 1000 + 2000 + 1500 + 500 + 1000 = 6000
        assertEq(scoring.totalScore(user1), 6000, "Total should be 6000");
        assertEq(scoring.userRankTier(user1), 3, "Should be Night Operator (tier 3)");
    }
    
    function testLevelUpEvent() public {
        // Expect LevelUp event when going from level 1 (0 XP) to level 2 (300 XP)
        // Event signature: LevelUp(address user, uint256 oldLevel, uint256 newLevel, uint256 totalScore)
        // User starts at 0 XP = level 1, adding 300 XP puts them at level 2
        vm.expectEmit(true, false, false, true);
        emit LevelUp(user1, 1, 2, 300);
        
        scoring.addPoints(user1, 300);
    }
    
    function testRankUpEvent() public {
        // Start at tier 0 (Signal Kitten)
        scoring.addPoints(user1, 100);
        assertEq(scoring.userRankTier(user1), 0);
        
        // Expect RankUp event when reaching tier 1 (Warp Scout)
        vm.expectEmit(true, false, false, true);
        emit RankUp(user1, 0, 1, 500);
        
        scoring.addPoints(user1, 400);  // Total: 500
    }
    
    // ========================================
    // VIEW FUNCTIONS TESTS
    // ========================================
    
    function testGetUserStats() public {
        // Level 5 starts at 2400 XP
        scoring.addPoints(user1, 2600);
        
        (uint256 level, uint8 tier, uint256 score, uint16 multiplier) = scoring.getUserStats(user1);
        
        assertEq(level, 5, "Should be level 5");
        assertEq(tier, 2, "Should be Beacon Runner (tier 2)");
        assertEq(score, 2600, "Score should be 2600");
        assertEq(multiplier, 1100, "Multiplier should be 1.1x");
    }
    
    function testGetLevelProgress() public {
        // Level 5 starts at 2400 XP, add 200 more = 2600 total
        scoring.addPoints(user1, 2600);  // Level 5 with 200 XP into level
        
        (uint256 level, uint256 xpIntoLevel, uint256 xpForLevel, uint256 xpToNext) = 
            scoring.getLevelProgress(user1);
        
        assertEq(level, 5, "Should be level 5");
        assertEq(xpIntoLevel, 200, "Should have 200 XP into level 5");
        // Level 5→6 needs 1100 XP
        assertEq(xpForLevel, 1100, "Level 5 needs 1100 XP");
        assertEq(xpToNext, 900, "Need 900 more XP for level 6");
    }
    
    function testGetRankProgress() public {
        scoring.addPoints(user1, 9000);  // Star Captain with 1000 into tier
        
        (uint8 tierIndex, uint256 pointsIntoTier, uint256 pointsToNext, bool hasMultiplier) = 
            scoring.getRankProgress(user1);
        
        assertEq(tierIndex, 4, "Should be Star Captain (tier 4)");
        assertEq(pointsIntoTier, 1000, "1000 points into tier");
        assertEq(pointsToNext, 6000, "6000 points to Nebula Commander");
        assertTrue(hasMultiplier, "Star Captain has multiplier");
    }
    
    function testGetScoreBreakdown() public {
        scoring.addPoints(user1, 1000);
        
        vm.prank(oracle);
        scoring.setViralPoints(user1, 2000);
        
        scoring.addQuestPoints(user1, 500);
        scoring.addGuildPoints(user1, 300);
        scoring.addReferralPoints(user1, 200);
        
        (uint256 points, uint256 viral, uint256 quest, uint256 guild, uint256 referral, uint256 total) = 
            scoring.getScoreBreakdown(user1);
        
        assertEq(points, 1000, "Points: 1000");
        assertEq(viral, 2000, "Viral: 2000");
        assertEq(quest, 500, "Quest: 500");
        assertEq(guild, 300, "Guild: 300");
        assertEq(referral, 200, "Referral: 200");
        assertEq(total, 4000, "Total: 4000");
    }
    
    // ========================================
    // GAS COST TESTS
    // ========================================
    
    function testGasCost_CalculateLevel() public {
        uint256 gasBefore = gasleft();
        scoring.calculateLevel(10000);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for calculateLevel():", gasUsed);
        assertTrue(gasUsed < 10000, "Level calculation should use <10k gas");
    }
    
    function testGasCost_GetRankTier() public {
        uint256 gasBefore = gasleft();
        scoring.getRankTier(50000);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for getRankTier():", gasUsed);
        // Loop through 12 tiers to find matching range
        assertTrue(gasUsed < 50000, "Rank tier lookup should use <50k gas");
    }
    
    function testGasCost_AddPoints() public {
        uint256 gasBefore = gasleft();
        scoring.addPoints(user1, 1000);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for addPoints() (full stats update):", gasUsed);
        // Full stats update includes: level calculation, rank tier lookup, storage writes, events
        // Acceptable cost for Base mainnet (~$0.01 per transaction)
        assertTrue(gasUsed < 150000, "Full stats update should use <150k gas");
    }
    
    // ========================================
    // EDGE CASES
    // ========================================
    
    function testEdgeCase_VeryLargePoints() public {
        // Test with 10 million points
        scoring.addPoints(user1, 10_000_000);
        
        assertTrue(scoring.userLevel(user1) > 100, "Should handle very large points");
        assertEq(scoring.userRankTier(user1), 11, "Should be max tier");
    }
    
    function testEdgeCase_TierTransitionBoundary() public {

        // Test exact boundary: 1499 → 1500 (Warp Scout → Beacon Runner)
        scoring.addPoints(user1, 1499);
        assertEq(scoring.userRankTier(user1), 1, "Should be Warp Scout");
        
        scoring.addPoints(user1, 1);  // Now 1500
        assertEq(scoring.userRankTier(user1), 2, "Should be Beacon Runner");
    }
    
    // Events (needed for expectEmit)
    event LevelUp(address indexed user, uint256 oldLevel, uint256 newLevel, uint256 totalScore);
    event RankUp(address indexed user, uint8 oldTier, uint8 newTier, uint256 totalScore);
}
