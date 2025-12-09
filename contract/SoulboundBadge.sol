// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * SoulboundBadge (OZ v5 compatible)
 * - Non-transferable ERC721
 * - Owner or authorized minters can mint/burn
 * - Dynamic metadata with tokenURI support
 */
contract SoulboundBadge is ERC721URIStorage, Ownable {
  uint256 private _nextId;
  mapping(uint256 => string) public badgeType;
  mapping(address => bool) public authorizedMinters;
  
  // Base URI for metadata API
  string private _baseTokenURI;

  event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
  event BadgeBurned(uint256 indexed tokenId);
  event MinterAuthorized(address indexed minter, bool authorized);
  event BaseURIUpdated(string newBaseURI);

  modifier onlyAuthorized() {
    require(msg.sender == owner() || authorizedMinters[msg.sender], "Not authorized");
    _;
  }

  // Ownable in OZ v5 requires initialOwner
  // When deployed from another contract, msg.sender is that contract.
  constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_)
    Ownable(msg.sender)
  {
    // Default to on-chain metadata API
    _baseTokenURI = "https://gmeowhq.art/api/badge/metadata/";
  }

  function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
    require(minter != address(0), "Invalid minter");
    authorizedMinters[minter] = authorized;
    emit MinterAuthorized(minter, authorized);
  }
  
  /**
   * @notice Set base URI for token metadata
   * @param baseURI_ Base URI (e.g., "https://api.gmeow.xyz/badge/" or "ipfs://QmXxx/")
   */
  function setBaseURI(string memory baseURI_) external onlyOwner {
    _baseTokenURI = baseURI_;
    emit BaseURIUpdated(baseURI_);
  }

  function mint(address to, string calldata kind) external onlyAuthorized returns (uint256) {
    require(to != address(0), "invalid to");
    _nextId += 1;
    uint256 id = _nextId;
    _safeMint(to, id);
    badgeType[id] = kind;
    emit BadgeMinted(to, id, kind);
    return id;
  }

  function burn(uint256 tokenId) external onlyAuthorized {
    _burn(tokenId);
    delete badgeType[tokenId];
    emit BadgeBurned(tokenId);
  }
  
  /**
   * @notice Returns metadata URI for token
   * @dev Concatenates baseURI with tokenId
   * Can be overridden with setTokenURI for custom metadata
   */
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);
    
    // Check if custom URI was set
    string memory _tokenURI = super.tokenURI(tokenId);
    if (bytes(_tokenURI).length > 0) {
      return _tokenURI;
    }
    
    // Default: baseURI + tokenId
    return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
  }
  
  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  // Block transfers; allow only mint (from=0) or burn (to=0)
  // OZ v5: override _update instead of _beforeTokenTransfer
  function _update(address to, uint256 tokenId, address auth)
    internal
    virtual
    override
    returns (address from)
  {
    from = _ownerOf(tokenId);
    require(from == address(0) || to == address(0), "Soulbound: non-transferable");
    return super._update(to, tokenId, auth);
  }
  
  function _toString(uint256 value) internal pure returns (string memory) {
    if (value == 0) return "0";
    uint256 temp = value;
    uint256 digits;
    while (temp != 0) {
      digits++;
      temp /= 10;
    }
    bytes memory buffer = new bytes(digits);
    while (value != 0) {
      digits -= 1;
      buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
      value /= 10;
    }
    return string(buffer);
  }
}
