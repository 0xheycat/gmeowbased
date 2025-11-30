// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "../modules/NFTModule.sol";

/**
 * @title GmeowNFT
 * @notice Separate implementation for NFT features
 * @dev Called via delegatecall from proxy - shares storage with core
 */
contract GmeowNFTImpl is NFTModule {
  
  /**
   * @notice Constructor - pass deployer as temporary owner
   * @dev This contract will be used via delegatecall from proxy
   */
  constructor() Ownable(msg.sender) {
    // When used via proxy, ownership is in proxy's storage context
  }
}
