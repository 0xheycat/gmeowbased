// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/GmeowGuildStandalone.sol";
import "../contract/GmeowNFT.sol";
import "../contract/SoulboundBadge.sol";

/**
 * @title Configure Existing Contracts
 * @notice Configure existing Core with new Guild and NFT
 */
contract ConfigureScript is Script {
    // Existing Core address
    address constant EXISTING_CORE = 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92;
    
    // Oracle address
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    // Newly deployed addresses from previous run
    address constant NEW_NFT = 0x0C664732Ab63EFD532c67D498332cB22a754D2cA;
    address constant NEW_GUILD = 0x3aEB58DA6d4221b3cB4c7E355699B665C5CdCA14;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Configuring Existing Contracts ===");
        console.log("Using Core:", EXISTING_CORE);
        console.log("Oracle:", ORACLE);
        console.log("");
        
        GmeowCore core = GmeowCore(payable(EXISTING_CORE));
        
        // Check if Guild already authorized
        bool isAuthorized = core.authorizedContracts(NEW_GUILD);
        console.log("Guild authorized:", isAuthorized);
        
        if (!isAuthorized) {
            console.log("Authorizing new Guild...");
            core.authorizeContract(NEW_GUILD, true);
            console.log("Guild authorized!");
        }
        
        // Check Oracle balance
        uint256 balance = core.pointsBalance(ORACLE);
        console.log("Oracle balance:", balance);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Configuration Complete ===");
        console.log("Core:   ", EXISTING_CORE);
        console.log("Guild:  ", NEW_GUILD);
        console.log("NFT:    ", NEW_NFT);
        console.log("Badge:  ", address(core.badgeContract()));
        console.log("");
        console.log("Ready to test functions!");
    }
}
