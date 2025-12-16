// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOwnable {
    function transferOwnership(address newOwner) external;
}

interface ICore {
    function badgeContract() external view returns (address);
}

/**
 * @title BadgeOwnershipTransfer
 * @notice Helper contract to transfer Badge ownership from Core to Oracle
 * @dev This is needed because Core doesn't have an execute function
 */
contract BadgeOwnershipTransfer {
    /**
     * @notice Transfer badge ownership from Core to a new owner
     * @dev Must be called by Core owner through Core's context
     */
    function transferBadgeOwnership(address coreAddress, address newOwner) external {
        require(newOwner != address(0), "Invalid new owner");
        
        ICore core = ICore(coreAddress);
        address badgeAddress = core.badgeContract();
        
        IOwnable badge = IOwnable(badgeAddress);
        badge.transferOwnership(newOwner);
    }
}
