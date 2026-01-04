// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../contract/modules/ScoringModule.sol";

/**
 * @title ScoringModuleAdminTest
 * @notice Tests for admin functions: reset, deduction, seasons
 */
contract ScoringModuleAdminTest is Test {
    ScoringModule public scoring;
    
    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public oracle = address(0x3);
    
    event PointsDeducted(address indexed user, uint256 amount, string reason);
    event StatsReset(address indexed user, uint256 previousScore);
    event SeasonStarted(uint256 indexed seasonId, string name, uint256 startTime);
    event SeasonEnded(uint256 indexed seasonId, uint256 endTime);
    event PointModificationPauseChanged(bool paused);
    
    function setUp() public {
        scoring = new ScoringModule();
        
        // Authorize this contract to add points
        scoring.authorizeContract(address(this), true);
        
        // Set oracle
        scoring.setAuthorizedOracle(oracle, true);
        
        // Give user1 some points
        scoring.addPoints(user1, 5000);
        scoring.addQuestPoints(user1, 2000);
        vm.prank(oracle);
        scoring.setViralPoints(user1, 1500);
    }
    
    // ========================================
    // POINT DEDUCTION TESTS
    // ========================================
    
    function testDeductPoints() public {
        uint256 balanceBefore = scoring.scoringPointsBalance(user1);
        assertEq(balanceBefore, 5000);
        
        vm.expectEmit(true, false, false, true);
        emit PointsDeducted(user1, 1000, "Test deduction");
        
        scoring.deductPoints(user1, 1000, "Test deduction");
        
        uint256 balanceAfter = scoring.scoringPointsBalance(user1);
        assertEq(balanceAfter, 4000);
        
        // Check total score updated
        (,, uint256 score,) = scoring.getUserStats(user1);
        assertEq(score, 7500); // 4000 + 2000 + 1500
    }
    
    function testDeductPoints_InsufficientBalance() public {
        vm.expectRevert("Insufficient points");
        scoring.deductPoints(user1, 10000, "Too much");
    }
    
    function testDeductPoints_OnlyOwner() public {
        vm.prank(user2);
        vm.expectRevert();
        scoring.deductPoints(user1, 1000, "Unauthorized");
    }
    
    function testDeductPoints_WhenPaused() public {
        scoring.setPointModificationPause(true);
        
        vm.expectRevert("Point modification paused");
        scoring.deductPoints(user1, 1000, "Should fail");
    }
    
    // ========================================
    // RESET TESTS
    // ========================================
    
    function testResetUserScore() public {
        // Verify user has score
        (uint256 level, uint8 tier, uint256 score,) = scoring.getUserStats(user1);
        assertGt(score, 0);
        assertGt(level, 1);
        
        vm.expectEmit(true, false, false, true);
        emit StatsReset(user1, score);
        
        scoring.resetUserScore(user1);
        
        // Check all values reset
        (level, tier, score,) = scoring.getUserStats(user1);
        assertEq(score, 0);
        assertEq(level, 1);
        assertEq(tier, 0);
        
        assertEq(scoring.scoringPointsBalance(user1), 0);
        assertEq(scoring.viralPoints(user1), 0);
        assertEq(scoring.questPoints(user1), 0);
        assertEq(scoring.guildPoints(user1), 0);
        assertEq(scoring.referralPoints(user1), 0);
    }
    
    function testResetUserScore_OnlyOwner() public {
        vm.prank(user2);
        vm.expectRevert();
        scoring.resetUserScore(user1);
    }
    
    function testResetUserScore_WhenPaused() public {
        scoring.setPointModificationPause(true);
        
        vm.expectRevert("Point modification paused");
        scoring.resetUserScore(user1);
    }
    
    function testBatchResetUsers() public {
        // Setup user2 with points
        scoring.addPoints(user2, 3000);
        
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        scoring.batchResetUsers(users);
        
        // Check both reset
        (,, uint256 score1,) = scoring.getUserStats(user1);
        (,, uint256 score2,) = scoring.getUserStats(user2);
        
        assertEq(score1, 0);
        assertEq(score2, 0);
    }
    
    // ========================================
    // PAUSE MECHANISM TESTS
    // ========================================
    
    function testSetPointModificationPause() public {
        assertEq(scoring.pointModificationPaused(), false);
        
        vm.expectEmit(false, false, false, true);
        emit PointModificationPauseChanged(true);
        
        scoring.setPointModificationPause(true);
        assertEq(scoring.pointModificationPaused(), true);
        
        scoring.setPointModificationPause(false);
        assertEq(scoring.pointModificationPaused(), false);
    }
    
    function testSetPointModificationPause_OnlyOwner() public {
        vm.prank(user2);
        vm.expectRevert();
        scoring.setPointModificationPause(true);
    }
    
    // ========================================
    // SEASON SYSTEM TESTS
    // ========================================
    
    function testStartNewSeason() public {
        assertEq(scoring.currentSeason(), 0);
        
        vm.expectEmit(true, false, false, true);
        emit SeasonStarted(1, "Season 1: Cosmic Dawn", block.timestamp);
        
        scoring.startNewSeason("Season 1: Cosmic Dawn");
        
        assertEq(scoring.currentSeason(), 1);
        
        (uint256 seasonId, string memory name, uint256 startTime, bool active) 
            = scoring.getCurrentSeasonInfo();
        
        assertEq(seasonId, 1);
        assertEq(name, "Season 1: Cosmic Dawn");
        assertEq(startTime, block.timestamp);
        assertEq(active, true);
    }
    
    function testStartNewSeason_EndsPrevious() public {
        // Start season 1
        scoring.startNewSeason("Season 1");
        
        // Move time forward
        vm.warp(block.timestamp + 30 days);
        uint256 season2Start = block.timestamp;
        
        // Start season 2 - should end season 1
        vm.expectEmit(true, false, false, true);
        emit SeasonEnded(1, season2Start);
        
        scoring.startNewSeason("Season 2");
        
        // Check season 1 ended
        (, uint256 start1, uint256 end1, bool active1) = scoring.getSeasonInfo(1);
        
        assertEq(active1, false);
        assertEq(end1, season2Start);
        
        // Check season 2 active
        (, uint256 start2, uint256 end2, bool active2) = scoring.getSeasonInfo(2);
        assertEq(active2, true);
        assertEq(start2, season2Start);
        assertEq(end2, 0); // Not ended yet
    }
    
    function testEndCurrentSeason() public {
        scoring.startNewSeason("Season 1");
        
        vm.warp(block.timestamp + 7 days);
        
        vm.expectEmit(true, false, false, true);
        emit SeasonEnded(1, block.timestamp);
        
        scoring.endCurrentSeason();
        
        (,, uint256 endTime, bool active) = scoring.getSeasonInfo(1);
        assertEq(active, false);
        assertEq(endTime, block.timestamp);
    }
    
    function testEndCurrentSeason_RequiresActiveSeason() public {
        vm.expectRevert("No active season");
        scoring.endCurrentSeason();
    }
    
    function testEndCurrentSeason_CannotEndTwice() public {
        scoring.startNewSeason("Season 1");
        scoring.endCurrentSeason();
        
        vm.expectRevert("Season already ended");
        scoring.endCurrentSeason();
    }
    
    function testArchiveSeasonScore() public {
        scoring.startNewSeason("Season 1");
        
        // User1 has 8500 points total
        uint256 currentScore = scoring.totalScore(user1);
        assertEq(currentScore, 8500);
        
        scoring.archiveSeasonScore(user1);
        
        uint256 archivedScore = scoring.getSeasonScore(1, user1);
        assertEq(archivedScore, currentScore);
    }
    
    function testArchiveSeasonScore_RequiresActiveSeason() public {
        vm.expectRevert("No active season");
        scoring.archiveSeasonScore(user1);
    }
    
    function testBatchArchiveSeasonScores() public {
        scoring.startNewSeason("Season 1");
        
        // Setup user2
        scoring.addPoints(user2, 3000);
        
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        scoring.batchArchiveSeasonScores(users);
        
        assertEq(scoring.getSeasonScore(1, user1), 8500);
        assertEq(scoring.getSeasonScore(1, user2), 3000);
    }
    
    function testSeasonWorkflow() public {
        // Season 1: Users compete
        scoring.startNewSeason("Season 1: Cosmic Dawn");
        
        // Note: user1 starts with 8500 from setUp (5000 scoring + 2000 quest + 1500 viral)
        scoring.addPoints(user1, 5000);  // Now has 10000 scoring, 13500 total
        scoring.addPoints(user2, 3000);  // Now has 3000 total
        
        // Archive scores
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        scoring.batchArchiveSeasonScores(users);
        
        // End season
        vm.warp(block.timestamp + 30 days);
        scoring.endCurrentSeason();
        
        // Reset for season 2
        scoring.batchResetUsers(users);
        
        // Start season 2
        scoring.startNewSeason("Season 2: Quantum Leap");
        
        // Users compete again
        scoring.addPoints(user1, 2000);
        scoring.addPoints(user2, 8000);
        
        // Check current scores
        (,, uint256 score1,) = scoring.getUserStats(user1);
        (,, uint256 score2,) = scoring.getUserStats(user2);
        assertEq(score1, 2000);
        assertEq(score2, 8000);
        
        // Check season 1 history preserved (archived before reset)
        assertEq(scoring.getSeasonScore(1, user1), 13500); // 8500 initial + 5000 added
        assertEq(scoring.getSeasonScore(1, user2), 3000);  // 3000 added
    }
    
    // ========================================
    // VIEW FUNCTION TESTS
    // ========================================
    
    function testGetCurrentSeasonInfo_NoSeason() public {
        (uint256 seasonId, string memory name, uint256 startTime, bool active) 
            = scoring.getCurrentSeasonInfo();
        
        assertEq(seasonId, 0);
        assertEq(bytes(name).length, 0);
        assertEq(startTime, 0);
        assertEq(active, false);
    }
    
    function testGetSeasonScore_DefaultZero() public {
        uint256 score = scoring.getSeasonScore(1, user1);
        assertEq(score, 0);
    }
}
