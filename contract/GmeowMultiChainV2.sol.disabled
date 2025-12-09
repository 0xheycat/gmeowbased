// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title GmeowMultichain Quest Protocol
 * @author Gmeow Team (@heycat on Farcaster)
 * @notice This contract manages cross-chain quests, rewards, and NFT minting with Farcaster integration
 * @dev Implements EIP-712 signatures for quest completion, multi-oracle support, and migration capabilities
 * 
 * Security Features:
 * - ReentrancyGuard on all state-changing external calls
 * - Ownable2Step for safe ownership transfers
 * - Multi-oracle authorization system
 * - Admin timelock for critical parameter changes
 * - Comprehensive input validation
 * - Custom errors for gas optimization
 * 
 * Key Integrations:
 * - Farcaster (FID linking, power badge bonuses)
 * - ERC20 token rewards
 * - Soulbound badges
 * - Dynamic NFTs
 * - Cross-chain migration
 * 
 * Architecture:
 * - Modular design with separate concerns
 * - Single deployment inheriting all modules
 * - Slither security fixes applied
 */

import "./modules/CoreModule.sol";
import "./modules/ReferralModule.sol";
import "./modules/GuildModule.sol";
import "./modules/NFTModule.sol";

/**
 * @title GmeowMultichain
 * @notice Main contract for the Gmeow multichain quest and rewards system
 * @dev Optimized version with all features except Migration (for L2 deployment)
 */
contract GmeowMultichain is CoreModule, ReferralModule, GuildModule, NFTModule {
  /**
   * @notice Initializes the contract with oracle signer
   * @param _oracleSigner Initial oracle signer address
   * @dev Deploys SoulboundBadge contract automatically. NFT contract must be set via setNFTContract()
   */
  constructor(address _oracleSigner) Ownable(msg.sender) {
    if (_oracleSigner == address(0)) revert ZeroAddressNotAllowed();
    
    // Initialize oracle
    oracleSigner = _oracleSigner;
    authorizedOracles[_oracleSigner] = true;
    
    // Deploy SoulboundBadge (auto-deployed for immediate badge functionality)
    badgeContract = new SoulboundBadge("GmeowBadge", "GMEOWB");
    
    emit OracleSignerUpdated(_oracleSigner);
    emit OracleAuthorized(_oracleSigner, true);
  }

  /**
   * @notice Receive function to accept ETH for NFT minting payments
   */
  receive() external payable {}
}
