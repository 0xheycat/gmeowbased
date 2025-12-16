// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./modules/ReferralModule.sol";

/**
 * @title GmeowReferralStandalone
 * @notice Standalone Referral contract that references core contract
 * @dev Works with GmeowCore for user data and points
 */
contract GmeowReferralStandalone is ReferralModule {
  
  address public coreContract;
  
  /**
   * @notice Constructor
   * @param _coreContract Address of GmeowCore contract
   */
  constructor(address _coreContract) Ownable(msg.sender) {
    require(_coreContract != address(0), "Invalid core address");
    coreContract = _coreContract;
  }
  
  /**
   * @notice Update core contract address
   * @param _coreContract New core contract address
   */
  function setCoreContract(address _coreContract) external onlyOwner {
    require(_coreContract != address(0), "Invalid address");
    coreContract = _coreContract;
  }
}
