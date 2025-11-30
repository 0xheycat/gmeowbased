// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./BaseModule.sol";

/**
 * @title NFTModule
 * @notice NFT minting and onchain quest verification
 */
abstract contract NFTModule is BaseModule {

  // ============ NFT MINTING ============

  function configureNFTMint(
    string calldata nftTypeId,
    bool requiresPayment,
    uint256 paymentAmount,
    bool allowlistRequired,
    bool paused,
    uint256 maxSupply,
    string calldata baseMetadataURI
  ) external onlyOwner {
    require(bytes(nftTypeId).length > 0, "E017");
    NFTMintConfig storage config = nftMintConfigs[nftTypeId];
    config.requiresPayment = requiresPayment;
    config.paymentAmount = paymentAmount;
    config.allowlistRequired = allowlistRequired;
    config.paused = paused;
    config.maxSupply = maxSupply;
    config.baseMetadataURI = baseMetadataURI;
    emit NFTMintConfigUpdated(nftTypeId, paymentAmount, maxSupply);
  }

  function mintNFT(string calldata nftTypeId, string calldata reason) external payable whenNotPaused nonReentrant returns (uint256) {
    require(address(nftContract) != address(0), "E018");
    require(!hasMigrated[msg.sender], "E019");
    NFTMintConfig storage config = nftMintConfigs[nftTypeId];
    require(!config.paused, "E020");
    require(config.currentSupply < config.maxSupply || config.maxSupply == 0, "E021");
    require(!hasMinedNFT[nftTypeId][msg.sender], "E022");

    if (config.allowlistRequired) {
      require(nftMintAllowlist[nftTypeId][msg.sender], "E023");
    }

    if (config.requiresPayment) {
      require(msg.value >= config.paymentAmount, "E024");
    }

    string memory metadataURI = string(abi.encodePacked(
      config.baseMetadataURI,
      "/",
      _uint2str(config.currentSupply + 1),
      ".json"
    ));

    uint256 tokenId = nftContract.mint(msg.sender, nftTypeId, metadataURI);
    config.currentSupply += 1;
    hasMinedNFT[nftTypeId][msg.sender] = true;

    if (config.requiresPayment && msg.value > 0) {
      emit NFTMintPaymentReceived(msg.sender, msg.value, nftTypeId);
    }

    emit NFTMinted(msg.sender, tokenId, nftTypeId, metadataURI, reason);
    return tokenId;
  }

  function batchMintNFT(
    address[] calldata recipients,
    string calldata nftTypeId,
    string calldata reason
  ) external onlyOwner nonReentrant returns (uint256[] memory) {
    require(address(nftContract) != address(0), "NFT contract not set");
    require(recipients.length > 0 && recipients.length <= 100, "Invalid batch size");
    
    NFTMintConfig storage config = nftMintConfigs[nftTypeId];
    require(!config.paused, "Minting paused for this type");
    require(
      config.currentSupply + recipients.length <= config.maxSupply || config.maxSupply == 0,
      "Exceeds max supply"
    );

    uint256[] memory tokenIds = new uint256[](recipients.length);
    string[] memory metadataURIs = new string[](recipients.length);

    for (uint256 i = 0; i < recipients.length; i++) {
      metadataURIs[i] = string(abi.encodePacked(
        config.baseMetadataURI,
        "/",
        _uint2str(config.currentSupply + i + 1),
        ".json"
      ));
    }

    tokenIds = nftContract.batchMint(recipients, nftTypeId, metadataURIs);
    config.currentSupply += recipients.length;

    for (uint256 i = 0; i < recipients.length; i++) {
      emit NFTMinted(recipients[i], tokenIds[i], nftTypeId, metadataURIs[i], reason);
    }

    return tokenIds;
  }

  function canMintNFT(address user, string calldata nftTypeId) 
    external 
    view 
    returns (bool eligible, string memory message, string memory metadataURI) 
  {
    if (address(nftContract) == address(0)) {
      return (false, "NFT contract not set", "");
    }

    NFTMintConfig storage config = nftMintConfigs[nftTypeId];
    
    if (config.paused) {
      return (false, "Minting paused", "");
    }

    if (hasMinedNFT[nftTypeId][user]) {
      return (false, "Already minted", "");
    }

    if (config.maxSupply > 0 && config.currentSupply >= config.maxSupply) {
      return (false, "Max supply reached", "");
    }

    if (config.allowlistRequired && !nftMintAllowlist[nftTypeId][user]) {
      return (false, "Not on allowlist", "");
    }

    metadataURI = string(abi.encodePacked(
      config.baseMetadataURI,
      "/",
      _uint2str(config.currentSupply + 1),
      ".json"
    ));

    return (true, "Eligible to mint", metadataURI);
  }

  function addToNFTMintAllowlist(string calldata nftTypeId, address[] calldata users) external onlyOwner {
    for (uint256 i = 0; i < users.length; i++) {
      nftMintAllowlist[nftTypeId][users[i]] = true;
    }
  }

  function withdrawMintPayments(address payable recipient) external onlyOwner {
    require(recipient != address(0), "Invalid recipient");
    uint256 balance = address(this).balance;
    require(balance > 0, "No balance to withdraw");
    (bool success, ) = recipient.call{value: balance}("");
    require(success, "Transfer failed");
  }

  // ============ ONCHAIN QUEST VERIFICATION ============

  function addQuestERC20Balance(
    string calldata name,
    address tokenAddress,
    uint256 minBalance,
    uint256 rewardPointsPerUser,
    uint256 maxCompletions,
    uint256 expiresAt,
    string calldata meta
  ) external whenNotPaused returns (uint256) {
    require(bytes(name).length > 0, "Name required");
    require(tokenAddress != address(0), "Invalid token");
    require(minBalance > 0, "Min balance > 0");
    require(rewardPointsPerUser > 0, "Reward must be > 0");

    uint256 totalEscrow = rewardPointsPerUser * maxCompletions;
    require(pointsBalance[msg.sender] >= totalEscrow, "Insufficient points to fund quest");

    pointsBalance[msg.sender] -= totalEscrow;
    contractPointsReserve += totalEscrow;

    _nextQuestId += 1;
    uint256 qid = _nextQuestId;

    Quest storage q = quests[qid];
    q.name = name;
    q.questType = uint8(OnchainQuestType.ERC20_BALANCE);
    q.target = minBalance;
    q.rewardPoints = rewardPointsPerUser;
    q.creator = msg.sender;
    q.maxCompletions = maxCompletions;
    q.expiresAt = expiresAt;
    q.meta = meta;
    q.isActive = true;
    q.escrowedPoints = totalEscrow;
    q.claimedCount = 0;
    q.rewardToken = address(0); // Slither fix
    q.rewardTokenPerUser = 0; // Slither fix
    q.tokenEscrowRemaining = 0; // Slither fix

    OnchainQuest storage oq = onchainQuests[qid];
    oq.baseQuestId = qid;
    oq.requirements.push(OnchainRequirement({
      asset: tokenAddress,
      minAmount: minBalance,
      requirementType: uint8(OnchainQuestType.ERC20_BALANCE)
    }));

    activeQuestIds.push(qid);
    onchainQuestIds.push(qid);

    emit QuestAdded(qid, msg.sender, uint8(OnchainQuestType.ERC20_BALANCE), rewardPointsPerUser, maxCompletions);
    emit OnchainQuestAdded(qid, uint8(OnchainQuestType.ERC20_BALANCE), tokenAddress, minBalance);
    return qid;
  }

  function addQuestNFTOwnership(
    string calldata name,
    address nftAddress,
    uint256 minOwned,
    uint256 rewardPointsPerUser,
    uint256 maxCompletions,
    uint256 expiresAt,
    string calldata meta
  ) external whenNotPaused returns (uint256) {
    require(bytes(name).length > 0, "Name required");
    require(nftAddress != address(0), "Invalid NFT");
    require(minOwned > 0, "Min owned > 0");
    require(rewardPointsPerUser > 0, "Reward must be > 0");

    uint256 totalEscrow = rewardPointsPerUser * maxCompletions;
    require(pointsBalance[msg.sender] >= totalEscrow, "Insufficient points to fund quest");

    pointsBalance[msg.sender] -= totalEscrow;
    contractPointsReserve += totalEscrow;

    _nextQuestId += 1;
    uint256 qid = _nextQuestId;

    Quest storage q = quests[qid];
    q.name = name;
    q.questType = uint8(OnchainQuestType.ERC721_OWNERSHIP);
    q.target = minOwned;
    q.rewardPoints = rewardPointsPerUser;
    q.creator = msg.sender;
    q.maxCompletions = maxCompletions;
    q.expiresAt = expiresAt;
    q.meta = meta;
    q.isActive = true;
    q.escrowedPoints = totalEscrow;
    q.claimedCount = 0;
    q.rewardToken = address(0); // Slither fix
    q.rewardTokenPerUser = 0; // Slither fix
    q.tokenEscrowRemaining = 0; // Slither fix

    OnchainQuest storage oq = onchainQuests[qid];
    oq.baseQuestId = qid;
    oq.requirements.push(OnchainRequirement({
      asset: nftAddress,
      minAmount: minOwned,
      requirementType: uint8(OnchainQuestType.ERC721_OWNERSHIP)
    }));

    activeQuestIds.push(qid);
    onchainQuestIds.push(qid);

    emit QuestAdded(qid, msg.sender, uint8(OnchainQuestType.ERC721_OWNERSHIP), rewardPointsPerUser, maxCompletions);
    emit OnchainQuestAdded(qid, uint8(OnchainQuestType.ERC721_OWNERSHIP), nftAddress, minOwned);
    return qid;
  }

  function completeOnchainQuest(uint256 questId) external whenNotPaused nonReentrant {
    Quest storage q = quests[questId];
    require(q.isActive, "Quest not active");
    require(q.claimedCount < q.maxCompletions, "Max claims reached");
    if (q.expiresAt > 0) require(block.timestamp <= q.expiresAt, "Quest expired");

    OnchainQuest storage oq = onchainQuests[questId];
    require(!oq.completed[msg.sender], "Already completed");

    for (uint256 i = 0; i < oq.requirements.length; i++) {
      OnchainRequirement memory req = oq.requirements[i];
      
      if (req.requirementType == uint8(OnchainQuestType.ERC20_BALANCE)) {
        require(req.asset != address(0), "Invalid token address");
        try IERC20(req.asset).balanceOf(msg.sender) returns (uint256 balance) {
          require(balance >= req.minAmount, "Insufficient token balance");
        } catch {
          revert("Token balance check failed");
        }
      } 
      else if (req.requirementType == uint8(OnchainQuestType.ERC721_OWNERSHIP)) {
        require(req.asset != address(0), "Invalid NFT address");
        try IERC721(req.asset).balanceOf(msg.sender) returns (uint256 balance) {
          require(balance >= req.minAmount, "Insufficient NFT ownership");
        } catch {
          revert("NFT balance check failed");
        }
      }
      else if (req.requirementType == uint8(OnchainQuestType.STAKE_POINTS)) {
        require(pointsLocked[msg.sender] >= req.minAmount, "Insufficient staked points");
      }
      else if (req.requirementType == uint8(OnchainQuestType.HOLD_BADGE)) {
        require(address(badgeContract) != address(0), "Badge contract not set");
        try IERC721(address(badgeContract)).balanceOf(msg.sender) returns (uint256 balance) {
          require(balance >= req.minAmount, "Badge requirement not met");
        } catch {
          revert("Badge balance check failed");
        }
      }
    }

    uint256 rewardPointsLocal = q.rewardPoints;
    require(q.escrowedPoints >= rewardPointsLocal, "Quest points escrow depleted");
    q.escrowedPoints -= rewardPointsLocal;
    contractPointsReserve -= rewardPointsLocal;
    pointsBalance[msg.sender] += rewardPointsLocal;
    userTotalEarned[msg.sender] += rewardPointsLocal;

    oq.completed[msg.sender] = true;
    q.claimedCount += 1;

    emit OnchainQuestCompleted(questId, msg.sender, rewardPointsLocal);
  }

  function canCompleteOnchainQuest(uint256 questId, address user) 
    external 
    view 
    returns (bool eligible, string memory message) 
  {
    Quest storage q = quests[questId];
    
    if (!q.isActive) return (false, "Quest not active");
    if (q.claimedCount >= q.maxCompletions) return (false, "Max claims reached");
    if (q.expiresAt > 0 && block.timestamp > q.expiresAt) return (false, "Quest expired");

    OnchainQuest storage oq = onchainQuests[questId];
    if (oq.completed[user]) return (false, "Already completed");

    for (uint256 i = 0; i < oq.requirements.length; i++) {
      OnchainRequirement memory req = oq.requirements[i];
      
      if (req.requirementType == uint8(OnchainQuestType.ERC20_BALANCE)) {
        uint256 balance = IERC20(req.asset).balanceOf(user);
        if (balance < req.minAmount) return (false, "Insufficient token balance");
      } 
      else if (req.requirementType == uint8(OnchainQuestType.ERC721_OWNERSHIP)) {
        uint256 balance = IERC721(req.asset).balanceOf(user);
        if (balance < req.minAmount) return (false, "Insufficient NFT ownership");
      }
      else if (req.requirementType == uint8(OnchainQuestType.STAKE_POINTS)) {
        if (pointsLocked[user] < req.minAmount) return (false, "Insufficient staked points");
      }
      else if (req.requirementType == uint8(OnchainQuestType.HOLD_BADGE)) {
        uint256 balance = IERC721(address(badgeContract)).balanceOf(user);
        if (balance < req.minAmount) return (false, "Badge requirement not met");
      }
    }

    return (true, "Eligible to complete quest");
  }

  function getOnchainQuestRequirements(uint256 questId) 
    external 
    view 
    returns (OnchainRequirement[] memory) 
  {
    return onchainQuests[questId].requirements;
  }

  function getOnchainQuests() external view returns (uint256[] memory) {
    return onchainQuestIds;
  }
}
