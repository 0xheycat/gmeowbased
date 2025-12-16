// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoulboundBadge.sol";

/**
 * @title BadgeManagerHelper
 * @notice ONE-TIME use helper to authorize badge minters when Core owns Badge
 * @dev Deploy this, Core owner transfers Badge to this, this authorizes minters, transfers back
 */
contract BadgeManagerHelper {
    SoulboundBadge public immutable badge;
    address public immutable coreAddress;
    address public immutable owner;
    
    constructor(address _badge, address _core) {
        badge = SoulboundBadge(_badge);
        coreAddress = _core;
        owner = msg.sender;
    }
    
    /**
     * @notice Authorize minters then transfer badge back to core
     * @dev Call this after Core.transferOwnership(this) on badge
     */
    function authorizeMintersThenReturn(address[] calldata minters) external {
        require(msg.sender == owner, "Not owner");
        require(badge.owner() == address(this), "Badge not owned by helper");
        
        // Authorize all minters
        for (uint i = 0; i < minters.length; i++) {
            badge.setAuthorizedMinter(minters[i], true);
        }
        
        // Transfer badge back to core
        badge.transferOwnership(coreAddress);
    }
}
