// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../contract/modules/ScoringModule.sol";
import "../contract/GmeowGuildStandalone.sol";
import "../contract/GmeowReferralStandalone.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/SoulboundBadge.sol";

/**
 * @title ModuleIntegrationTest
 * @notice Integration tests verifying GuildModule and ReferralModule correctly update ScoringModule
 */
contract ModuleIntegrationTest is Test {
    ScoringModule public scoring;
    GmeowCore public core;
    GmeowGuildStandalone public guild;
    GmeowReferralStandalone public referral;
    
    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address oracle = makeAddr("oracle");
    
    function setUp() public {
        // Deploy contracts
        scoring = new ScoringModule();
        core = new GmeowCore();
        
        // Initialize core
        core.initialize(oracle);
        
        // Deploy standalone modules
        guild = new GmeowGuildStandalone(address(core));
        referral = new GmeowReferralStandalone(address(core));
        
        // Deploy and set badge contracts for standalone modules
        SoulboundBadge guildBadge = new SoulboundBadge("GuildBadge", "GBADGE");
        SoulboundBadge referralBadge = new SoulboundBadge("ReferralBadge", "RBADGE");
        guild.setBadgeContract(address(guildBadge));
        referral.setBadgeContract(address(referralBadge));
        
        // Authorize modules to mint badges
        guildBadge.setAuthorizedMinter(address(guild), true);
        referralBadge.setAuthorizedMinter(address(referral), true);
        
        // Connect scoring module
        guild.setScoringModule(address(scoring));
        referral.setScoringModule(address(scoring));
        
        // Authorize contracts in ScoringModule
        scoring.authorizeContract(address(guild), true);
        scoring.authorizeContract(address(referral), true);
        
        // Authorize test contract as oracle in ScoringModule (for setViralPoints)
        scoring.setAuthorizedOracle(address(this), true);
        
        // Fund test users
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }
    
    // ============================================================
    // GUILD INTEGRATION TESTS
    // ============================================================
    
    function testGuildCreation_DeductsScoringModulePoints() public {
        // Give Alice 1000 points
        scoring.setViralPoints(alice, 1000);
        assertEq(scoring.totalScore(alice), 1000);
        
        // Create guild (costs 100 points)
        vm.prank(alice);
        guild.createGuild("Test Guild");
        
        // Verify ScoringModule deducted 100 points
        assertEq(scoring.totalScore(alice), 900, "Should deduct 100 points for guild creation");
    }
    
    function testGuildCreation_InsufficientPoints_Reverts() public {
        // Give Alice only 50 points (need 100)
        scoring.setViralPoints(alice, 50);
        
        // Should revert with "E003" (insufficient points)
        vm.prank(alice);
        vm.expectRevert(bytes("E003"));
        guild.createGuild("Test Guild");
    }
    
    function testClaimGuildReward_AppliesPlatinumMultiplier() public {
        // Setup: Alice has 100K points = Platinum tier (30% multiplier)
        scoring.setViralPoints(alice, 100000);
        
        // Create guild
        vm.prank(alice);
        guild.createGuild("Test Guild");
        
        uint256 guildId = guild.nextGuildId();
        uint256 scoreAfterCreation = scoring.totalScore(alice); // 100000 - 100 = 99900
        
        // Deposit 500 points to guild treasury
        vm.prank(alice);
        guild.depositGuildPoints(guildId, 500);
        
        // Claim 200 points back
        vm.prank(alice);
        guild.claimGuildReward(guildId, 200);
        
        // Calculate expected: 200 base + 30% = 260
        uint8 tier = scoring.userRankTier(alice);
        assertEq(tier, 5, "Should be Platinum tier");
        
        uint256 expectedBonus = scoring.applyMultiplier(200, tier);
        assertEq(expectedBonus, 260, "Platinum should get 30% bonus");
        
        // Final score: 99900 - 500 (deposit) + 260 (claim with bonus) = 99660
        assertEq(
            scoring.totalScore(alice),
            99660,
            "Should have 99660 after guild claim with multiplier"
        );
    }
    
    function testCompleteGuildQuest_AppliesDiamondMultiplier() public {
        // Setup: Alice has 500K points = Diamond tier (50% multiplier)
        scoring.setViralPoints(alice, 500000);
        
        // Create guild
        vm.prank(alice);
        guild.createGuild("Test Guild");
        uint256 guildId = guild.nextGuildId();
        
        // Create guild quest with 300 point reward
        vm.prank(alice);
        guild.createGuildQuest(guildId, "Epic Quest", 300);
        uint256 questId = guild.nextGuildQuestId();
        
        uint256 scoreBeforeQuest = scoring.totalScore(alice);
        
        // Complete quest
        vm.prank(alice);
        guild.completeGuildQuest(questId);
        
        // Calculate expected: 300 base + 50% = 450
        uint8 tier = scoring.userRankTier(alice);
        assertEq(tier, 6, "Should be Diamond tier");
        
        uint256 expectedBonus = scoring.applyMultiplier(300, tier);
        assertEq(expectedBonus, 450, "Diamond should get 50% bonus");
        
        // Verify final score increased by bonus amount
        assertEq(
            scoring.totalScore(alice),
            scoreBeforeQuest + expectedBonus,
            "Should increase by 450 (300 + 50%)"
        );
    }
    
    function testGuildQuest_BronzeRank_NoMultiplier() public {
        // Setup: Alice has low score = Bronze tier (0% multiplier)
        scoring.setViralPoints(alice, 500);
        
        // Create guild
        vm.prank(alice);
        guild.createGuild("Test Guild");
        uint256 guildId = guild.nextGuildId();
        
        // Create quest
        vm.prank(alice);
        guild.createGuildQuest(guildId, "Starter Quest", 100);
        uint256 questId = guild.nextGuildQuestId();
        
        uint256 scoreBeforeQuest = scoring.totalScore(alice);
        
        // Complete quest
        vm.prank(alice);
        guild.completeGuildQuest(questId);
        
        // Bronze rank: base 100 points, no multiplier
        assertEq(
            scoring.totalScore(alice),
            scoreBeforeQuest + 100,
            "Bronze rank should get base 100 points only"
        );
    }
    
    // ============================================================
    // REFERRAL INTEGRATION TESTS
    // ============================================================
    
    function testReferral_UpdatesBothUsers() public {
        // Alice registers referral code
        vm.prank(alice);
        referral.registerReferralCode("ALICE");
        
        // Bob uses Alice's code
        vm.prank(bob);
        referral.setReferrer("ALICE");
        
        // Verify Alice got 50 points (default referrer reward)
        assertEq(scoring.totalScore(alice), 50, "Alice should have 50 referrer points");
        
        // Verify Bob got 25 points (default referee reward)
        assertEq(scoring.totalScore(bob), 25, "Bob should have 25 referee points");
    }
    
    function testReferral_AppliesDiamondMultiplier() public {
        // Setup: Alice has 500K points = Diamond tier (50% multiplier)
        scoring.setViralPoints(alice, 500000);
        
        uint8 tier = scoring.userRankTier(alice);
        assertEq(tier, 6, "Should be Diamond tier");
        
        // Alice registers code
        vm.prank(alice);
        referral.registerReferralCode("ALICE");
        
        uint256 scoreBeforeReferral = scoring.totalScore(alice);
        
        // Bob uses code
        vm.prank(bob);
        referral.setReferrer("ALICE");
        
        // Calculate expected for Alice: 50 base + 50% = 75
        uint256 expectedBonus = scoring.applyMultiplier(50, tier);
        assertEq(expectedBonus, 75, "Diamond should get 50% bonus");
        
        // Verify Alice got bonus
        assertEq(
            scoring.totalScore(alice),
            scoreBeforeReferral + expectedBonus,
            "Alice should get 75 points (50 + 50%)"
        );
        
        // Bob gets base reward (no multiplier for new users)
        assertEq(scoring.totalScore(bob), 25, "Bob should get base 25 points");
    }
    
    function testReferral_MultipleReferrals_AccumulateBonus() public {
        // Setup: Alice has 10K points = Gold tier (20% multiplier)
        scoring.setViralPoints(alice, 10000);
        
        vm.prank(alice);
        referral.registerReferralCode("ALICE");
        
        address[] memory referees = new address[](3);
        for (uint i = 0; i < 3; i++) {
            referees[i] = makeAddr(string(abi.encodePacked("referee", vm.toString(i))));
        }
        
        // Three users use Alice's code
        for (uint i = 0; i < 3; i++) {
            vm.prank(referees[i]);
            referral.setReferrer("ALICE");
        }
        
        // Calculate expected: 3 referrals × (50 + 20%) = 3 × 60 = 180
        uint8 tier = scoring.userRankTier(alice);
        uint256 bonusPerReferral = scoring.applyMultiplier(50, tier);
        
        assertEq(
            scoring.totalScore(alice),
            10000 + (bonusPerReferral * 3),
            "Alice should have 3 referral bonuses"
        );
    }
    
    function testReferral_CannotSetTwice() public {
        // Alice registers
        vm.prank(alice);
        referral.registerReferralCode("ALICE");
        
        // Bob uses code
        vm.prank(bob);
        referral.setReferrer("ALICE");
        
        // Bob tries to use different code (should fail)
        vm.prank(alice);
        referral.registerReferralCode("BOB");
        
        vm.prank(bob);
        vm.expectRevert(bytes("E015")); // Already has referrer
        referral.setReferrer("BOB");
    }
    
    // ============================================================
    // COMBINED WORKFLOW TEST
    // ============================================================
    
    function testFullWorkflow_GuildAndReferralIntegrated() public {
        // 1. Alice starts with viral points
        scoring.setViralPoints(alice, 5000);
        assertEq(scoring.totalScore(alice), 5000);
        
        // 2. Alice refers Bob → +60 Alice (50 + 20% Silver bonus), +25 Bob
        vm.prank(alice);
        referral.registerReferralCode("ALICE");
        
        vm.prank(bob);
        referral.setReferrer("ALICE");
        
        uint256 aliceAfterReferral = scoring.totalScore(alice);
        assertTrue(aliceAfterReferral > 5000, "Alice should gain referral bonus");
        assertEq(scoring.totalScore(bob), 25, "Bob should have 25 points");
        
        // 3. Alice creates guild → -100 points
        vm.prank(alice);
        guild.createGuild("Test Guild");
        
        uint256 aliceAfterGuild = scoring.totalScore(alice);
        assertEq(
            aliceAfterGuild,
            aliceAfterReferral - 100,
            "Should deduct 100 for guild creation"
        );
        
        // 4. Bob joins and completes guild quest
        uint256 guildId = guild.nextGuildId();
        
        vm.prank(bob);
        guild.joinGuild(guildId);
        
        vm.prank(alice);
        guild.createGuildQuest(guildId, "Guild Quest", 200);
        uint256 questId = guild.nextGuildQuestId();
        
        vm.prank(bob);
        guild.completeGuildQuest(questId);
        
        // Bob gets 200 points (Bronze rank, no multiplier)
        assertEq(
            scoring.totalScore(bob),
            225, // 25 (referral) + 200 (quest)
            "Bob should have 225 total points"
        );
        
        // Verify both users have positive scores
        assertTrue(scoring.totalScore(alice) > 0);
        assertTrue(scoring.totalScore(bob) > 0);
    }
    
    // ============================================================
    // MULTIPLIER VERIFICATION
    // ============================================================
    
    function testMultiplier_IncreaseWithRank() public {
        // Test that higher ranks get higher multipliers on guild rewards
        uint256[] memory scores = new uint256[](7);
        scores[0] = 100;      // Bronze: 0%
        scores[1] = 5000;     // Silver: 10%
        scores[2] = 10000;    // Gold: 20%
        scores[3] = 100000;   // Platinum: 30%
        scores[4] = 500000;   // Diamond: 50%
        scores[5] = 1000000;  // Master: 75%
        scores[6] = 5000000;  // Grandmaster: 100%
        
        for (uint256 i = 0; i < scores.length; i++) {
            address user = makeAddr(string(abi.encodePacked("user", vm.toString(i))));
            
            // Give user initial score
            scoring.setViralPoints(user, scores[i]);
            
            // Create guild
            vm.prank(user);
            guild.createGuild(string(abi.encodePacked("Guild", vm.toString(i))));
            
            uint256 guildId = guild.nextGuildId();
            
            // Create and complete guild quest
            vm.prank(user);
            guild.createGuildQuest(guildId, "Quest", 100);
            uint256 questId = guild.nextGuildQuestId();
            
            uint256 scoreBeforeQuest = scoring.totalScore(user);
            
            vm.prank(user);
            guild.completeGuildQuest(questId);
            
            // Verify multiplier was applied
            uint8 tier = scoring.userRankTier(user);
            uint256 expectedBonus = scoring.applyMultiplier(100, tier);
            
            assertEq(
                scoring.totalScore(user),
                scoreBeforeQuest + expectedBonus,
                string(abi.encodePacked("Tier ", vm.toString(tier), " should apply correct multiplier"))
            );
        }
    }
}
