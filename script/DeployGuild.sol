// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/GmeowGuildStandalone.sol";

contract DeployGuild is Script {
    function run() external {
        address coreAddress = 0xA3A5f38F536323d45d7445a04d26EfbC8E549962;
        
        vm.startBroadcast();
        
        GmeowGuildStandalone guild = new GmeowGuildStandalone(coreAddress);
        console.log("Guild deployed at:", address(guild));
        
        vm.stopBroadcast();
    }
}
