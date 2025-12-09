// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/GmeowGuildStandalone.sol";
import "../contract/GmeowNFT.sol";
import "../contract/SoulboundBadge.sol";

/**
 * @title Deploy Script
 * @notice Deploys all Gmeow contracts to Base mainnet
 * @dev Run with: forge script script/Deploy.sol --rpc-url base --broadcast --verify
 */
contract DeployScript is Script {
    // Oracle address (deployer and initial owner)
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    // Initial deposit amounts
    uint256 constant INITIAL_DEPOSIT = 1_000_000_000_000; // 1T points
    
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Deploying Gmeow Contracts to Base ===");
        console.log("Deployer (Oracle):", ORACLE);
        console.log("");
        
        // 1. Deploy Core
        console.log("1. Deploying GmeowCore...");
        GmeowCore core = new GmeowCore();
        console.log("   Core deployed at:", address(core));
        
        // 2. Initialize Core (creates badge contract internally)
        console.log("2. Initializing Core...");
        core.initialize(ORACLE);
        console.log("   Core initialized with oracle:", ORACLE);
        
        // 3. Get badge contract address from Core
        console.log("3. Getting Badge contract from Core...");
        SoulboundBadge badge = SoulboundBadge(address(core.badgeContract()));
        console.log("   Badge contract at:", address(badge));
        
        // 4. Deploy NFT (requires name, symbol, baseURI, gmeowContract, owner)
        console.log("4. Deploying GmeowNFT...");
        GmeowNFT nft = new GmeowNFT(
            "Gmeow NFT",
            "GNFT",
            "https://api.gmeowhq.art/nft/",
            address(core), // gmeowContract - point to Core
            ORACLE         // owner
        );
        console.log("   NFT deployed at:", address(nft));
        
        // 5. Deploy Guild (requires core contract address)
        console.log("5. Deploying GmeowGuildStandalone...");
        GmeowGuildStandalone guild = new GmeowGuildStandalone(address(core));
        console.log("   Guild deployed at:", address(guild));
        
        // 6. Authorize Guild to manage points in Core
        console.log("6. Authorizing Guild contract...");
        core.authorizeContract(address(guild), true);
        console.log("   Guild authorized to manage points");
        
        // 7. Deposit initial points to Oracle
        console.log("7. Depositing initial points to Oracle...");
        core.depositTo(ORACLE, INITIAL_DEPOSIT);
        console.log("   Deposited", INITIAL_DEPOSIT, "points to Oracle");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Core:  ", address(core));
        console.log("Guild: ", address(guild));
        console.log("NFT:   ", address(nft));
        console.log("Badge: ", address(badge));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Update ABIs if needed");
        console.log("3. Test all functions with oracle wallet");
        console.log("4. Update frontend with new addresses");
    }
}
