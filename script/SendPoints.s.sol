// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";

/**
 * @title Send Points Script
 * @notice Send 1000 points from oracle to a specific address
 * @dev Run with: forge script script/SendPoints.s.sol --rpc-url $RPC_BASE --broadcast --private-key $ORACLE_PRIVATE_KEY
 */
contract SendPointsScript is Script {
    // Deployed GmeowCore contract on Base Mainnet
    address constant CORE_ADDRESS = 0x0cf22803Bfac7C5Da849DdCC736A338b37163d99;
    
    // Oracle address (sender)
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    // Recipient address
    address constant RECIPIENT = 0x8a3094e44577579d6f41F6214a86C250b7dBDC4e;
    
    // Amount to send (1000 points)
    uint256 constant AMOUNT = 1000;
    
    function run() external {
        // Use the private key passed via --private-key flag
        // No need to read from environment
        
        vm.startBroadcast();
        
        console.log("=== Sending Points on Base Mainnet ===");
        console.log("Core Contract:", CORE_ADDRESS);
        console.log("From (Oracle):", ORACLE);
        console.log("To (Recipient):", RECIPIENT);
        console.log("Amount:", AMOUNT, "points");
        console.log("");
        
        // Get Core contract instance
        GmeowCore core = GmeowCore(payable(CORE_ADDRESS));
        
        // Check oracle balance before
        uint256 oracleBalanceBefore = core.pointsBalance(ORACLE);
        console.log("Oracle balance before:", oracleBalanceBefore, "points");
        
        // Check recipient balance before
        uint256 recipientBalanceBefore = core.pointsBalance(RECIPIENT);
        console.log("Recipient balance before:", recipientBalanceBefore, "points");
        console.log("");
        
        // Send points using addPoints function (only authorized addresses can call this)
        console.log("Adding points to recipient...");
        core.addPoints(RECIPIENT, AMOUNT);
        console.log("Transaction sent!");
        console.log("");
        
        // Check balances after
        uint256 oracleBalanceAfter = core.pointsBalance(ORACLE);
        uint256 recipientBalanceAfter = core.pointsBalance(RECIPIENT);
        
        console.log("Oracle balance after:", oracleBalanceAfter, "points");
        console.log("Recipient balance after:", recipientBalanceAfter, "points");
        console.log("");
        console.log("=== Transfer Complete ===");
        console.log("Sent:", oracleBalanceBefore - oracleBalanceAfter, "points");
        console.log("Received:", recipientBalanceAfter - recipientBalanceBefore, "points");
        
        vm.stopBroadcast();
    }
}
