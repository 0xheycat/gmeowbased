// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * SoulboundBadge (OZ v5 compatible)
 * - Non-transferable ERC721
 * - Owner-only mint/burn
 */
contract SoulboundBadge is ERC721, Ownable {
  uint256 private _nextId;
  mapping(uint256 => string) public badgeType;

  event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
  event BadgeBurned(uint256 indexed tokenId);

  // Ownable in OZ v5 requires initialOwner
  // When deployed from another contract, msg.sender is that contract.
  constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_)
    Ownable(msg.sender)
  {}

  function mint(address to, string calldata kind) external onlyOwner returns (uint256) {
    require(to != address(0), "invalid to");
    _nextId += 1;
    uint256 id = _nextId;
    _safeMint(to, id);
    badgeType[id] = kind;
    emit BadgeMinted(to, id, kind);
    return id;
  }

  function burn(uint256 tokenId) external onlyOwner {
    _burn(tokenId);
    delete badgeType[tokenId];
    emit BadgeBurned(tokenId);
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
}
