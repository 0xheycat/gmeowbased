// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/GmeowReferralStandalone.sol";

/**
 * @title Deploy Referral Contract
 * @notice Deploys GmeowReferralStandalone to Base mainnet
 * @dev Run with: forge script script/DeployReferral.sol --rpc-url base --broadcast --verify
 */
contract DeployReferral is Script {
    // Existing deployed addresses
    address constant CORE = 0x0cf22803Bfac7C5Da849DdCC736A338b37163d99;
    address constant BADGE = 0x30C125Bc40c46483Dd1F444C6985702a0c18b43E;
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Deploying GmeowReferralStandalone to Base ===");
        console.log("Core address:", CORE);
        console.log("Badge address:", BADGE);
        console.log("Deployer (Oracle):", ORACLE);
        console.log("");
        
        // Deploy Referral contract
        console.log("1. Deploying GmeowReferralStandalone...");
        GmeowReferralStandalone referral = new GmeowReferralStandalone(CORE);
        console.log("   Referral deployed at:", address(referral));
        
        // Set badge contract
        console.log("2. Setting badge contract...");
        referral.setBadgeContract(BADGE);
        console.log("   Badge contract set");
        
        // Verify setup
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Referral:", address(referral));
        console.log("Core reference:", referral.coreContract());
        console.log("Badge reference:", address(referral.badgeContract()));
        console.log("Owner:", referral.owner());
        
        vm.stopBroadcast();
        
        // Output deployment info
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Authorize referral contract on Core:");
        console.log("   Address to authorize:", address(referral));
        console.log("");
        console.log("2. Update .env.local with referral address:", address(referral));
        console.log("");
        console.log("3. Update lib/gmeow-utils.ts");
    }
}
