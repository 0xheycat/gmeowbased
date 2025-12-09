// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contract/proxy/GmeowCore.sol";
import "../contract/GmeowGuildStandalone.sol";
import "../contract/GmeowNFT.sol";
import "../contract/SoulboundBadge.sol";

/**
 * @title Deploy Script (10K Initial Supply)
 * @notice Deploys all Gmeow contracts to Base mainnet with 10K initial supply
 * @dev Run with: forge script script/Deploy10K.sol --rpc-url base --broadcast --verify
 */
contract Deploy10K is Script {
    // Oracle address (deployer and initial owner)
    address constant ORACLE = 0x8870C155666809609176260F2B65a626C000D773;
    
    // Initial deposit amounts (10K for reasonable game economy)
    uint256 constant INITIAL_SUPPLY = 10_000; // 10K points
    
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Deploying Gmeow Contracts to Base (10K Supply) ===");
        console.log("Deployer (Oracle):", ORACLE);
        console.log("Initial Supply:", INITIAL_SUPPLY);
        console.log("");
        
        // 1. Deploy Core
        console.log("1. Deploying GmeowCore...");
        GmeowCore core = new GmeowCore();
        console.log("   Core deployed at:", address(core));
        
        // 2. Initialize Core
        console.log("2. Initializing Core...");
        core.initialize(ORACLE);
        console.log("   Core initialized with oracle:", ORACLE);
        
        // 3. Get badge contract address from Core
        console.log("3. Getting Badge contract from Core...");
        SoulboundBadge badge = SoulboundBadge(address(core.badgeContract()));
        console.log("   Badge contract at:", address(badge));
        
        // 4. Deploy NFT
        console.log("4. Deploying GmeowNFT...");
        GmeowNFT nft = new GmeowNFT(
            "Gmeow NFT",
            "GMNFT",
            "https://gmeowhq.art/api/nft/metadata/",
            address(core),
            ORACLE
        );
        console.log("   NFT deployed at:", address(nft));
        
        // 5. Deploy Guild (only needs core address)
        console.log("5. Deploying GmeowGuildStandalone...");
        GmeowGuildStandalone guild = new GmeowGuildStandalone(address(core));
        console.log("   Guild deployed at:", address(guild));
        
        // 6. Add initial points to oracle (10K) using depositTo (owner-only)
        console.log("6. Adding initial points...");
        core.depositTo(ORACLE, INITIAL_SUPPLY);
        console.log("   Added", INITIAL_SUPPLY, "points to oracle");
        
        // 7. Verify final state
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Core:", address(core));
        console.log("Guild:", address(guild));
        console.log("NFT:", address(nft));
        console.log("Badge:", address(badge));
        console.log("Oracle Balance:", core.pointsBalance(ORACLE));
        console.log("Owner:", core.owner());
        
        vm.stopBroadcast();
        
        // Save deployment info to file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "core": "', vm.toString(address(core)), '",\n',
            '  "guild": "', vm.toString(address(guild)), '",\n',
            '  "nft": "', vm.toString(address(nft)), '",\n',
            '  "badge": "', vm.toString(address(badge)), '",\n',
            '  "oracle": "', vm.toString(ORACLE), '",\n',
            '  "initialSupply": ', vm.toString(INITIAL_SUPPLY), ',\n',
            '  "deploymentBlock": ', vm.toString(block.number), '\n',
            '}'
        ));
        
        // Note: vm.writeFile disabled for permissioning - save output manually
        console.log("");
        console.log("=== Deployment JSON ===");
        console.log(json);
    }
}
