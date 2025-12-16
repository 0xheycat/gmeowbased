// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/GmeowGuildStandalone.sol";

contract CoreVerificationTest is Test {
    GmeowCore core;
    GmeowGuildStandalone guild;
    address oracle = address(0x123);
    address user = address(0x456);
    
    function setUp() public {
        vm.startPrank(oracle);
        core = new GmeowCore();
        core.initialize(oracle);
        
        // Deposit initial supply
        core.depositTo(oracle, 10000);
        
        // Deploy guild
        guild = new GmeowGuildStandalone(address(core));
        
        // Authorize guild on core
        core.authorizeContract(address(guild), true);
        
        vm.stopPrank();
    }
    
    // ============ CRITICAL FUNCTION TESTS ============
    
    function testDepositPointsWorks() public {
        vm.prank(oracle);
        core.depositTo(user, 1000);
        (uint256 balance,,) = core.getUserStats(user);
        assertEq(balance, 1000, "Deposit failed");
    }
    
    function testAddQuestWorks() public {
        vm.prank(oracle);
        core.depositTo(user, 1000);
        
        vm.prank(user);
        uint256 qid = core.addQuest(
            "Test Quest", 
            1,      // questType
            100,    // target
            50,     // rewardPoints
            10,     // maxCompletions (total escrow = 500)
            0,      // expiresAt (never)
            "meta"
        );
        
        (,string memory name,,,uint256 reward,,,,bool active,) = core.getQuest(qid);
        assertEq(name, "Test Quest", "Quest name mismatch");
        assertEq(reward, 50, "Quest reward mismatch");
        assertTrue(active, "Quest not active");
        
        // User should have 500 points escrowed
        (uint256 balanceAfter,,) = core.getUserStats(user);
        assertEq(balanceAfter, 500, "Escrow not deducted");
    }
    
    function testGMSystemWorks() public {
        vm.warp(block.timestamp + 1 days); // Skip cooldown
        
        vm.prank(user);
        core.sendGM();
        
        (uint256 balance,,uint256 earned) = core.getUserStats(user);
        assertTrue(balance > 0, "GM didn't award points");
        assertEq(balance, earned, "Balance != earned");
        
        // Check streak
        (,uint256 streak) = core.gmhistory(user);
        assertEq(streak, 1, "Streak should be 1");
    }
    
    function testAuthorizeContractWorks() public {
        address testContract = address(0x999);
        
        vm.prank(oracle);
        core.authorizeContract(testContract, true);
        
        bool authorized = core.authorizedContracts(testContract);
        assertTrue(authorized, "Contract not authorized");
    }
    
    function testDeductPointsWorks() public {
        // Give user points
        vm.prank(oracle);
        core.depositTo(user, 1000);
        
        // Guild (authorized contract) deducts points
        vm.prank(address(guild));
        core.deductPoints(user, 100);
        
        (uint256 balance,,) = core.getUserStats(user);
        assertEq(balance, 900, "Points not deducted");
    }
    
    function testAddPointsWorks() public {
        // Guild (authorized contract) adds points
        vm.prank(address(guild));
        core.addPoints(user, 500);
        
        (uint256 balance,,) = core.getUserStats(user);
        assertEq(balance, 500, "Points not added");
    }
    
    function testSetBadgeAuthorizedMinterWorks() public {
        address guildAddr = address(guild);
        
        vm.prank(oracle);
        core.setBadgeAuthorizedMinter(guildAddr, true);
        
        // Verify badge contract recognizes guild as authorized
        address badgeAddr = address(core.badgeContract());
        bool authorized = SoulboundBadge(badgeAddr).authorizedMinters(guildAddr);
        assertTrue(authorized, "Guild not authorized as badge minter");
    }
    
    function testStakingWorks() public {
        // Give user points
        vm.prank(oracle);
        core.depositTo(user, 1000);
        
        // Mint a badge for user
        address badgeAddr = address(core.badgeContract());
        vm.prank(address(core)); // Core owns badge
        uint256 badgeId = SoulboundBadge(badgeAddr).mint(user, "Test Badge");
        
        // User stakes for badge
        vm.prank(user);
        core.stakeForBadge(100, badgeId);
        
        (uint256 available, uint256 locked,) = core.getUserStats(user);
        assertEq(available, 900, "Available points wrong");
        assertEq(locked, 100, "Locked points wrong");
    }
    
    function testCloseQuestWorks() public {
        // Create quest
        vm.prank(oracle);
        core.depositTo(user, 1000);
        
        vm.prank(user);
        uint256 qid = core.addQuest("Test", 1, 100, 50, 10, 0, "meta");
        
        // Close quest
        vm.prank(user);
        core.closeQuest(qid);
        
        (,,,,,,,,bool active,) = core.getQuest(qid);
        assertFalse(active, "Quest still active");
        
        // User should get refund
        (uint256 balance,,) = core.getUserStats(user);
        assertEq(balance, 1000, "Refund failed");
    }
    
    function testPauseUnpauseWorks() public {
        vm.startPrank(oracle);
        
        core.pause();
        
        // GM should fail when paused
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert();
        core.sendGM();
        
        // Unpause
        vm.prank(oracle);
        core.unpause();
        
        // Skip cooldown and GM should work now
        vm.warp(block.timestamp + 1 days);
        vm.prank(user);
        core.sendGM();
        
        (uint256 balance,,) = core.getUserStats(user);
        assertTrue(balance > 0, "GM failed after unpause");
    }
}
