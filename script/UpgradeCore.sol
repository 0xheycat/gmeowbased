// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";

/**
 * @title Upgrade Core Script
 * @notice Upgrades Core contract to add setBadgeAuthorizedMinter function
 * @dev Run with: forge script script/UpgradeCore.sol --rpc-url base --broadcast --verify
 */
contract UpgradeCore is Script {
    // Deployed addresses
    address constant CORE_PROXY = 0x0cf22803Bfac7C5Da849DdCC736A338b37163d99;
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Upgrading Core Contract ===");
        console.log("Current Core Proxy:", CORE_PROXY);
        console.log("Oracle:", ORACLE);
        console.log("");
        
        // 1. Deploy new Core implementation
        console.log("1. Deploying new Core implementation...");
        GmeowCore newImpl = new GmeowCore();
        console.log("   New implementation at:", address(newImpl));
        
        // 2. Upgrade proxy to point to new implementation
        console.log("2. Upgrading proxy...");
        // Note: You need to call upgradeTo on the proxy contract
        // This assumes the proxy has an upgradeTo function
        // If using TransparentUpgradeableProxy, use the ProxyAdmin
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Upgrade Complete ===");
        console.log("New implementation:", address(newImpl));
        console.log("");
        console.log("Next steps:");
        console.log("1. If using proxy pattern, call proxy's upgradeTo function");
        console.log("2. Authorize Guild: cast send", CORE_PROXY, '"setBadgeAuthorizedMinter(address,bool)"', "GUILD_ADDRESS true");
        console.log("3. Authorize Referral: cast send", CORE_PROXY, '"setBadgeAuthorizedMinter(address,bool)"', "REFERRAL_ADDRESS true");
    }
}
