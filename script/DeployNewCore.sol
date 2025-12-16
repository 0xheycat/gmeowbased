// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/GmeowGuildStandalone.sol";
import "../contract/GmeowNFT.sol";
import "../contract/GmeowReferralStandalone.sol";

/**
 * @title Deploy New Core with Badge Management
 * @notice Deploys complete system with setBadgeAuthorizedMinter function
 * @dev Migrates from old Core (0x0cf2...3d99) to new Core with proper badge authorization
 */
contract DeployNewCore is Script {
    // Oracle address
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    // Initial supply (10K points for oracle)
    uint256 constant INITIAL_SUPPLY = 10_000;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Deploying New Gmeow System with Badge Management ===");
        console.log("Oracle:", ORACLE);
        console.log("Initial Supply:", INITIAL_SUPPLY);
        console.log("");
        
        // 1. Deploy Core
        console.log("1. Deploying GmeowCore (with setBadgeAuthorizedMinter)...");
        GmeowCore core = new GmeowCore();
        console.log("   Core deployed at:", address(core));
        
        // 2. Initialize Core
        console.log("2. Initializing Core...");
        core.initialize(ORACLE);
        console.log("   Core initialized");
        
        // 3. Get Badge address
        console.log("3. Getting Badge contract from Core...");
        address badgeAddr = address(core.badgeContract());
        console.log("   Badge contract at:", badgeAddr);
        
        // 4. Deploy Guild
        console.log("4. Deploying GmeowGuildStandalone...");
        GmeowGuildStandalone guild = new GmeowGuildStandalone(address(core));
        console.log("   Guild deployed at:", address(guild));
        
        // 5. Deploy NFT
        console.log("5. Deploying GmeowNFT...");
        GmeowNFT nft = new GmeowNFT(
            "Gmeow NFT",
            "GMNFT",
            "https://gmeowhq.art/api/nft/metadata/",
            address(core),
            ORACLE
        );
        console.log("   NFT deployed at:", address(nft));
        
        // 6. Deploy Referral
        console.log("6. Deploying GmeowReferralStandalone...");
        GmeowReferralStandalone referral = new GmeowReferralStandalone(address(core));
        console.log("   Referral deployed at:", address(referral));
        
        // 7. Configure contracts with Badge address
        console.log("7. Configuring Badge contract on Guild and Referral...");
        guild.setBadgeContract(badgeAddr);
        console.log("   Guild badge contract set");
        
        referral.setBadgeContract(badgeAddr);
        console.log("   Referral badge contract set");
        
        // 8. Authorize contracts on Core
        console.log("8. Authorizing contracts on Core...");
        core.authorizeContract(address(guild), true);
        console.log("   Guild authorized for points");
        
        core.authorizeContract(address(referral), true);
        console.log("   Referral authorized for points");
        
        // 9. Authorize badge minters (NEW FUNCTION)
        console.log("9. Authorizing badge minters...");
        core.setBadgeAuthorizedMinter(address(guild), true);
        console.log("   Guild authorized as badge minter");
        
        core.setBadgeAuthorizedMinter(address(referral), true);
        console.log("   Referral authorized as badge minter");
        
        // 10. Deposit initial points
        console.log("10. Depositing initial points to oracle...");
        core.depositTo(ORACLE, INITIAL_SUPPLY);
        console.log("   Deposited", INITIAL_SUPPLY, "points");
        
        vm.stopBroadcast();
        
        // Print summary
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Core:", address(core));
        console.log("Guild:", address(guild));
        console.log("NFT:", address(nft));
        console.log("Badge:", badgeAddr);
        console.log("Referral:", address(referral));
        console.log("");
        console.log("Oracle Balance:", core.pointsBalance(ORACLE));
        console.log("Oracle Address:", ORACLE);
        console.log("");
        
        // Verification
        console.log("=== Verification ===");
        console.log("Guild authorized on Core:", core.authorizedContracts(address(guild)));
        console.log("Referral authorized on Core:", core.authorizedContracts(address(referral)));
        
        // Check badge authorization (call external contract)
        console.log("");
        console.log("Badge minter authorizations:");
        console.log("- Run: cast call", badgeAddr, '"authorizedMinters(address)(bool)"', address(guild));
        console.log("- Run: cast call", badgeAddr, '"authorizedMinters(address)(bool)"', address(referral));
        console.log("");
        console.log("Next: Update .env and gmeow-utils.ts with new addresses");
    }
}
