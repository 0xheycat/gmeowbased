// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "../modules/ReferralModule.sol";

/**
 * @title GmeowReferral
 * @notice Separate implementation for Referral features
 * @dev Called via delegatecall from proxy - shares storage with core
 */
contract GmeowReferral is ReferralModule {
  
  /**
   * @notice Constructor - pass deployer as temporary owner
   * @dev This contract will be used via delegatecall from proxy
   */
  constructor() Ownable(msg.sender) {
    // When used via proxy, ownership is in proxy's storage context
  }
}
