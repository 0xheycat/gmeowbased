// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/SoulboundBadge.sol";

contract DeployBadge is Script {
    function run() external {
        vm.startBroadcast();
        
        SoulboundBadge badge = new SoulboundBadge("GmeowBadge", "GMEOWB");
        console.log("Badge deployed at:", address(badge));
        
        vm.stopBroadcast();
    }
}
