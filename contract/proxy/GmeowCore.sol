// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "../modules/CoreModule.sol";

/**
 * @title GmeowCore
 * @notice Core contract with Quest, Points, GM features only (NO Referral)
 * @dev This is the main implementation contract - optimized for 24KB limit
 */
contract GmeowCore is CoreModule {
  
  /**
   * @notice Constructor - pass deployer as temporary owner
   * @dev This contract will be used via delegatecall from proxy
   */
  constructor() Ownable(msg.sender) {
    // When used via proxy, ownership is in proxy's storage context
  }
  
  /**
   * @notice Initialize the contract (called by proxy)
   * @param _oracleSigner Initial oracle signer address
   */
  function initialize(address _oracleSigner) external {
    require(oracleSigner == address(0), "Already initialized");
    if (_oracleSigner == address(0)) revert ZeroAddressNotAllowed();
    
    // Transfer ownership in proxy context
    _transferOwnership(msg.sender);
    
    // Initialize oracle
    oracleSigner = _oracleSigner;
    authorizedOracles[_oracleSigner] = true;
    
    // Deploy SoulboundBadge
    badgeContract = new SoulboundBadge("GmeowBadge", "GMEOWB");
    
    emit OracleSignerUpdated(_oracleSigner);
    emit OracleAuthorized(_oracleSigner, true);
  }

  /**
   * @notice Receive function to accept ETH
   */
  receive() external payable {}
}
