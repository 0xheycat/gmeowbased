// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "../modules/GuildModule.sol";

/**
 * @title GmeowGuild
 * @notice Separate implementation for Guild features
 * @dev Called via delegatecall from proxy - shares storage with core
 */
contract GmeowGuild is GuildModule {
  
  /**
   * @notice Constructor - pass deployer as temporary owner
   * @dev This contract will be used via delegatecall from proxy
   */
  constructor() Ownable(msg.sender) {
    // When used via proxy, ownership is in proxy's storage context
  }
}
