// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./modules/NFTModule.sol";
import "./GmeowNFT.sol";

/**
 * @title GmeowNFTStandalone
 * @notice Standalone NFT contract that references core contract
 * @dev Works with GmeowCore for user data and points
 */
contract GmeowNFTStandalone is NFTModule {
  
  address public coreContract;
  
  /**
   * @notice Constructor
   * @param _coreContract Address of GmeowCore contract
   * @param _nftName Name for the NFT collection
   * @param _nftSymbol Symbol for the NFT collection
   * @param _baseURI Base URI for NFT metadata
   */
  constructor(
    address _coreContract,
    string memory _nftName,
    string memory _nftSymbol,
    string memory _baseURI
  ) Ownable(msg.sender) {
    require(_coreContract != address(0), "Invalid core address");
    coreContract = _coreContract;
    
    // Deploy GmeowNFT contract
    nftContract = new GmeowNFT(
      _nftName,
      _nftSymbol,
      _baseURI,
      address(this), // This contract is the gmeowContract
      msg.sender     // Owner
    );
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
