// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title GmeowProxy
 * @notice Proxy contract that routes calls to appropriate implementation contracts
 * @dev Uses delegatecall to maintain shared storage across all implementations
 * 
 * Architecture:
 * - Core Implementation: Quest, Points, GM, Referral (always loaded)
 * - Guild Implementation: Guild features (loaded on demand)
 * - NFT Implementation: NFT minting (loaded on demand)
 * 
 * Function Selector Routing:
 * - Core functions → coreImpl
 * - Guild functions → guildImpl
 * - NFT functions → nftImpl
 */
contract GmeowProxy {
  
  // ============ STORAGE ============
  
  /// @notice Core implementation address (Quest, Points, GM, Referral)
  address public coreImpl;
  
  /// @notice Guild implementation address
  address public guildImpl;
  
  /// @notice NFT implementation address  
  address public nftImpl;
  
  /// @notice Admin address (can upgrade implementations)
  address public admin;
  
  // ============ EVENTS ============
  
  event ImplementationUpgraded(string indexed module, address indexed newImplementation);
  event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
  
  // ============ CONSTRUCTOR ============
  
  /**
   * @notice Initialize proxy with implementation addresses
   * @param _coreImpl Core implementation contract
   * @param _guildImpl Guild implementation contract
   * @param _nftImpl NFT implementation contract
   */
  constructor(
    address _coreImpl,
    address _guildImpl,
    address _nftImpl
  ) {
    require(_coreImpl != address(0), "Core impl required");
    
    admin = msg.sender;
    coreImpl = _coreImpl;
    guildImpl = _guildImpl;
    nftImpl = _nftImpl;
    
    emit ImplementationUpgraded("core", _coreImpl);
    emit ImplementationUpgraded("guild", _guildImpl);
    emit ImplementationUpgraded("nft", _nftImpl);
  }
  
  // ============ ADMIN FUNCTIONS ============
  
  /**
   * @notice Upgrade implementation contract
   * @param module Module name ("core", "guild", "nft")
   * @param newImplementation New implementation address
   */
  function upgradeImplementation(string calldata module, address newImplementation) external {
    require(msg.sender == admin, "Only admin");
    require(newImplementation != address(0), "Invalid address");
    
    bytes32 moduleHash = keccak256(bytes(module));
    
    if (moduleHash == keccak256("core")) {
      coreImpl = newImplementation;
    } else if (moduleHash == keccak256("guild")) {
      guildImpl = newImplementation;
    } else if (moduleHash == keccak256("nft")) {
      nftImpl = newImplementation;
    } else {
      revert("Unknown module");
    }
    
    emit ImplementationUpgraded(module, newImplementation);
  }
  
  /**
   * @notice Change admin address
   * @param newAdmin New admin address
   */
  function changeAdmin(address newAdmin) external {
    require(msg.sender == admin, "Only admin");
    require(newAdmin != address(0), "Invalid address");
    
    address oldAdmin = admin;
    admin = newAdmin;
    
    emit AdminChanged(oldAdmin, newAdmin);
  }
  
  // ============ PROXY LOGIC ============
  
  /**
   * @notice Fallback function - routes calls to appropriate implementation
   * @dev Uses delegatecall to maintain storage context
   */
  fallback() external payable {
    address impl = _getImplementation(msg.sig);
    require(impl != address(0), "Function not found");
    
    assembly {
      // Copy msg.data to memory
      calldatacopy(0, 0, calldatasize())
      
      // Delegatecall to implementation
      let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
      
      // Copy return data
      returndatacopy(0, 0, returndatasize())
      
      // Return or revert
      switch result
      case 0 { revert(0, returndatasize()) }
      default { return(0, returndatasize()) }
    }
  }
  
  /**
   * @notice Receive function to accept ETH
   */
  receive() external payable {}
  
  /**
   * @notice Route function selector to appropriate implementation
   * @param selector Function selector (msg.sig)
   * @return impl Implementation address to use
   */
  function _getImplementation(bytes4 selector) internal view returns (address impl) {
    // Guild function selectors
    if (
      selector == bytes4(keccak256("createGuild(string)")) ||
      selector == bytes4(keccak256("joinGuild(uint256)")) ||
      selector == bytes4(keccak256("leaveGuild()")) ||
      selector == bytes4(keccak256("depositGuildPoints(uint256,uint256)")) ||
      selector == bytes4(keccak256("claimGuildReward(uint256,uint256)")) ||
      selector == bytes4(keccak256("setGuildOfficer(uint256,address,bool)")) ||
      selector == bytes4(keccak256("getGuildInfo(uint256)")) ||
      selector == bytes4(keccak256("createGuildQuest(uint256,string,uint256)")) ||
      selector == bytes4(keccak256("completeGuildQuest(uint256)"))
    ) {
      return guildImpl;
    }
    
    // NFT function selectors
    if (
      selector == bytes4(keccak256("configureNFTMint(string,bool,uint256,bool,bool,uint256,string)")) ||
      selector == bytes4(keccak256("mintNFT(string,string)")) ||
      selector == bytes4(keccak256("batchMintNFT(address[],string,string)")) ||
      selector == bytes4(keccak256("canMintNFT(address,string)")) ||
      selector == bytes4(keccak256("addToNFTMintAllowlist(string,address[])")) ||
      selector == bytes4(keccak256("withdrawMintPayments(address)")) ||
      selector == bytes4(keccak256("addQuestERC20Balance(string,address,uint256,uint256,uint256,uint256,string)")) ||
      selector == bytes4(keccak256("addQuestNFTOwnership(string,address,uint256,uint256,uint256,uint256,string)")) ||
      selector == bytes4(keccak256("completeOnchainQuest(uint256)")) ||
      selector == bytes4(keccak256("canCompleteOnchainQuest(uint256,address)")) ||
      selector == bytes4(keccak256("getOnchainQuestRequirements(uint256)")) ||
      selector == bytes4(keccak256("getOnchainQuests()"))
    ) {
      return nftImpl;
    }
    
    // Default to core implementation for everything else
    // (Quest, Points, GM, Referral, Profile, Admin functions)
    return coreImpl;
  }
  
  /**
   * @notice Get implementation address for a specific module
   * @param module Module name ("core", "guild", "nft")
   * @return Implementation address
   */
  function getImplementation(string calldata module) external view returns (address) {
    bytes32 moduleHash = keccak256(bytes(module));
    
    if (moduleHash == keccak256("core")) {
      return coreImpl;
    } else if (moduleHash == keccak256("guild")) {
      return guildImpl;
    } else if (moduleHash == keccak256("nft")) {
      return nftImpl;
    }
    
    return address(0);
  }
}
