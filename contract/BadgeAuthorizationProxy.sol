// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBadge {
    function setAuthorizedMinter(address minter, bool authorized) external;
}

interface ICore {
    function badgeContract() external view returns (address);
}

/**
 * @title BadgeAuthorizationProxy
 * @notice Allows Core owner to authorize badge minters through Core's context
 * @dev This contract must be temporarily added to Badge's authorizedMinters by Core owner
 */
contract BadgeAuthorizationProxy {
    ICore public immutable core;
    
    constructor(address _core) {
        require(_core != address(0), "Invalid core");
        core = ICore(_core);
    }
    
    /**
     * @notice Authorize a minter on the Badge contract
     * @dev Can only work if THIS contract is authorized by Badge owner (Core)
     * @dev This is a workaround since Core doesn't have setBadgeAuthorizedMinter function
     */
    function authorizeBadgeMinter(address minter, bool authorized) external {
        // Note: This won't work because we'd need Badge to authorize THIS contract first
        // which requires Core to call Badge.setAuthorizedMinter(THIS, true)
        // which is the same problem we're trying to solve
        
        address badgeAddress = core.badgeContract();
        IBadge(badgeAddress).setAuthorizedMinter(minter, authorized);
    }
}
