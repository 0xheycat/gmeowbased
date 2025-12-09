// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./modules/CoreModule.sol";
import "./modules/ReferralModule.sol";

/**
 * @title GmeowCore
 * @notice Core contract with Quest, Points, GM, Referral, Profile features
 * @dev Main contract - under 24KB. Guild and NFT accessed via separate contracts
 */
contract GmeowCore is CoreModule, ReferralModule {
  
  // Guild and NFT contract addresses
  address public guildContract;
  address public nftContractAddress;
  
  /**
   * @notice Initializes the contract with oracle signer
   * @param _oracleSigner Initial oracle signer address
   */
  constructor(address _oracleSigner) Ownable(msg.sender) {
    if (_oracleSigner == address(0)) revert ZeroAddressNotAllowed();
    
    // Initialize oracle
    oracleSigner = _oracleSigner;
    authorizedOracles[_oracleSigner] = true;
    
    // Deploy SoulboundBadge
    badgeContract = new SoulboundBadge("GmeowBadge", "GMEOWB");
    
    emit OracleSignerUpdated(_oracleSigner);
    emit OracleAuthorized(_oracleSigner, true);
  }
  
  /**
   * @notice Set Guild contract address
   * @param _guildContract Guild contract address
   */
  function setGuildContract(address _guildContract) external onlyOwner {
    require(_guildContract != address(0), "Invalid address");
    guildContract = _guildContract;
  }
  
  /**
   * @notice Set NFT contract address
   * @param _nftContract NFT contract address
   */
  function setNFTContractAddress(address _nftContract) external onlyOwner {
    require(_nftContract != address(0), "Invalid address");
    nftContractAddress = _nftContract;
  }
  
  /**
   * @notice Receive function to accept ETH
   */
  receive() external payable {}
}
