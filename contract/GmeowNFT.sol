// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GmeowNFT
 * @notice Transferable ERC721 NFTs for marketplace trading (OpenSea, Blur, etc.)
 * @dev SEPARATE from SoulboundBadge.sol - these NFTs CAN be sold/traded
 * 
 * KEY DIFFERENCE:
 * - SoulboundBadge = NON-TRANSFERABLE achievements (locked forever)
 * - GmeowNFT = TRANSFERABLE collectibles (can sell on marketplaces)
 * 
 * Features:
 * - Full ERC721 standard with transferability
 * - IPFS metadata URIs for each token
 * - OpenSea collection metadata
 * - ERC2981 royalty support (5% default)
 * - Authorized minter system
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract GmeowNFT is ERC721, ERC721URIStorage, ERC2981, Ownable, Pausable {
    using Strings for uint256;
    
    uint256 private _tokenIdCounter;
    
    // Collection metadata
    string public baseURI;
    string public contractURI; // OpenSea collection-level metadata
    
    // Minting authorization
    address public gmeowContract; // GmeowMultiChain.sol can mint
    mapping(address => bool) public authorizedMinters;
    
    // NFT type tracking
    mapping(uint256 => string) public nftType; // tokenId => type (e.g., "LEGENDARY_QUEST")
    mapping(string => uint256) public typeMinted; // type => count
    mapping(uint256 => bool) public metadataFrozen; // tokenId => frozen status
    
    event NFTMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string nftType,
        string metadataURI
    );
    
    event AuthorizedMinterUpdated(address indexed minter, bool authorized);
    event BaseURIUpdated(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event MetadataFrozen(uint256 indexed tokenId);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI_,
        address _gmeowContract,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        // Allow zero address for deployment flexibility
        // Can be set later via setGmeowContract()
        baseURI = baseURI_;
        gmeowContract = _gmeowContract;
        
        // Set default royalty: 5% to contract owner
        _setDefaultRoyalty(initialOwner, 500); // 5% = 500 basis points
        
        emit BaseURIUpdated(baseURI_);
    }
    
    /**
     * @notice Set base URI for token metadata
     * @dev Points to IPFS gateway or centralized server
     * @param baseURI_ Base URI (e.g., "ipfs://QmXxx/" or "https://api.gmeowhq.art/nft/")
     */
    function setBaseURI(string memory baseURI_) external onlyOwner {
        baseURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }
    
    /**
     * @notice Set contract-level metadata for OpenSea
     * @dev OpenSea reads this for collection info (name, description, image, etc.)
     * Example: "https://api.gmeowhq.art/nft/collection-metadata.json"
     */
    function setContractURI(string memory _contractURI) external onlyOwner {
        contractURI = _contractURI;
        emit ContractURIUpdated(_contractURI);
    }
    
    /**
     * @notice Set GmeowMultiChain contract address (one-time setup)
     * @dev Can only be set once if initially deployed with zero address
     * @param _gmeowContract Address of GmeowMultiChain contract
     */
    function setGmeowContract(address _gmeowContract) external onlyOwner {
        require(_gmeowContract != address(0), "Invalid gmeow contract");
        require(gmeowContract == address(0), "Already set");
        gmeowContract = _gmeowContract;
    }
    
    /**
     * @notice Authorize an address to mint NFTs
     * @dev Allows external contracts (e.g., quest contracts, admin wallets) to mint
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        require(minter != address(0), "Invalid minter");
        authorizedMinters[minter] = authorized;
        emit AuthorizedMinterUpdated(minter, authorized);
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == gmeowContract || 
            authorizedMinters[msg.sender] || 
            msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }
    
    /**
     * @notice Mint NFT with metadata URI
     * @dev Called by authorized contracts (GmeowMultiChain, admin)
     * 
     * Metadata URI Examples:
     * - IPFS: "ipfs://QmXxx/1.json"
     * - API: "https://api.gmeowhq.art/nft/legendary/1.json"
     * 
     * Metadata JSON Structure:
     * {
     *   "name": "Legendary Quest #1",
     *   "description": "Proof of legendary quest completion",
     *   "image": "ipfs://QmYyy/legendary-1.png",
     *   "attributes": [
     *     {"trait_type": "Type", "value": "Legendary"},
     *     {"trait_type": "Rarity", "value": "Epic"}
     *   ]
     * }
     * 
     * @param to Recipient address
     * @param nftTypeId NFT type (e.g., "LEGENDARY_QUEST", "RANK_TROPHY")
     * @param metadataURI Full metadata URI (IPFS hash or API endpoint)
     * @return tokenId Minted token ID
     */
    function mint(
        address to,
        string memory nftTypeId,
        string memory metadataURI
    ) external onlyAuthorized whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(nftTypeId).length > 0, "NFT type required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        nftType[tokenId] = nftTypeId;
        typeMinted[nftTypeId] += 1;
        
        emit NFTMinted(to, tokenId, nftTypeId, metadataURI);
        return tokenId;
    }
    
    /**
     * @notice Batch mint NFTs (for airdrops)
     * @dev Gas-optimized batch minting for events, rewards, etc.
     * 
     * @param recipients Array of recipient addresses
     * @param nftTypeId NFT type for all mints
     * @param metadataURIs Array of metadata URIs (one per recipient)
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(
        address[] calldata recipients,
        string memory nftTypeId,
        string[] calldata metadataURIs
    ) external onlyAuthorized whenNotPaused returns (uint256[] memory) {
        require(recipients.length == metadataURIs.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= 100, "Max 100 per batch");
        require(bytes(nftTypeId).length > 0, "NFT type required");
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(bytes(metadataURIs[i]).length > 0, "Metadata URI required");
            
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);
            
            nftType[tokenId] = nftTypeId;
            tokenIds[i] = tokenId;
            
            emit NFTMinted(recipients[i], tokenId, nftTypeId, metadataURIs[i]);
        }
        
        typeMinted[nftTypeId] += recipients.length;
        return tokenIds;
    }
    
    /**
     * @notice Update royalty for secondary sales
     * @dev ERC2981 standard - supported by OpenSea, Blur, etc.
     * @param receiver Royalty recipient address
     * @param feeNumerator Royalty percentage in basis points (500 = 5%, 1000 = 10%)
     */
    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        require(receiver != address(0), "Invalid receiver");
        require(feeNumerator <= 1000, "Royalty too high (max 10%)");
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    
    /**
     * @notice Get total supply of NFTs minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @notice Get count of NFTs minted for a specific type
     */
    function getTypeMintCount(string memory nftTypeId) external view returns (uint256) {
        return typeMinted[nftTypeId];
    }
    
    /**
     * @notice Burn an NFT (owner of NFT or contract owner only)
     * @dev Reduces supply and removes from circulation
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender || msg.sender == owner(),
            "Not authorized to burn"
        );
        _burn(tokenId);
        // ERC721URIStorage handles metadata cleanup automatically
    }
    
    /**
     * @notice Freeze metadata for a specific token (permanent)
     * @dev Once frozen, token URI cannot be changed
     * @param tokenId The token ID to freeze
     */
    function freezeMetadata(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        require(!metadataFrozen[tokenId], "Already frozen");
        metadataFrozen[tokenId] = true;
        emit MetadataFrozen(tokenId);
    }
    
    /**
     * @notice Pause minting (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause minting
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // OpenSea compatibility
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
    
    // ERC165 support (required for marketplaces)
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Override required by Solidity for multiple inheritance
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
