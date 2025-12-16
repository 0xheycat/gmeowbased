// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./BaseModule.sol";
import "../libraries/CoreLogicLib.sol";

/**
 * @title CoreModule
 * @notice Optimized Core with essential features (<24KB)
 * @dev Removed non-essential functions to fit EVM size limit
 */
abstract contract CoreModule is BaseModule {

  // ============ ADMIN FUNCTIONS (Essential Only) ============

  function setAuthorizedOracle(address oracle, bool authorized) external onlyOwner {
    if (oracle == address(0)) revert ZeroAddressNotAllowed();
    authorizedOracles[oracle] = authorized;
    emit OracleAuthorized(oracle, authorized);
  }

  function setGMConfig(uint256 reward, uint256 cooldown) external onlyOwner {
    if (cooldown < 12 hours || cooldown > 3 days) revert ValueOutOfRange();
    gmPointReward = reward;
    gmCooldown = cooldown;
  }

  /**
   * @notice Set authorized minter for Badge contract
   * @dev Core owns Badge, so Core must call this
   */
  function setBadgeAuthorizedMinter(address minter, bool authorized) external onlyOwner {
    if (minter == address(0)) revert ZeroAddressNotAllowed();
    badgeContract.setAuthorizedMinter(minter, authorized);
  }

  // ============ POINTS MANAGEMENT ============

  mapping(address => bool) public authorizedContracts;
  event ContractAuthorized(address indexed contractAddr, bool status);
  
  function authorizeContract(address contractAddr, bool status) external onlyOwner {
    if (contractAddr == address(0)) revert ZeroAddressNotAllowed();
    authorizedContracts[contractAddr] = status;
    emit ContractAuthorized(contractAddr, status);
  }
  
  function deductPoints(address from, uint256 amount) external {
    require(authorizedContracts[msg.sender], "Unauthorized contract");
    if (pointsBalance[from] < amount) revert InsufficientPoints();
    pointsBalance[from] -= amount;
  }
  
  function addPoints(address to, uint256 amount) external {
    require(authorizedContracts[msg.sender], "Unauthorized contract");
    pointsBalance[to] += amount;
  }

  function depositTo(address to, uint256 amount) external onlyOwner {
    if (to == address(0)) revert ZeroAddressNotAllowed();
    if (amount == 0) revert ZeroAmountNotAllowed();
    pointsBalance[to] += amount;
    emit PointsDeposited(to, amount);
  }

  // ============ PROFILE & FID ============

  function setFarcasterFid(uint256 fid) external whenNotPaused nonReentrant {
    if (fid == 0) revert ZeroAmountNotAllowed();
    farcasterFidOf[msg.sender] = fid;
    if (fid < OG_THRESHOLD) {
      uint256 tokenId = badgeContract.mint(msg.sender, "OG-Caster");
      emit BadgeMinted(msg.sender, tokenId, "OG-Caster");
    }
    emit FIDLinked(msg.sender, fid);
  }

  // ============ QUEST CREATION ============

  function addQuest(
    string calldata name,
    uint8 questType,
    uint256 target,
    uint256 rewardPoints,
    uint256 maxCompletions,
    uint256 expiresAt,
    string calldata meta
  ) external whenNotPaused returns (uint256) {
    require(bytes(name).length > 0, "Name required");
    require(rewardPoints > 0, "Reward must be > 0");
    require(
      expiresAt == 0 || (expiresAt > block.timestamp && expiresAt <= block.timestamp + 365 days),
      "Invalid expiration"
    );

    uint256 totalEscrow = rewardPoints * maxCompletions;
    require(pointsBalance[msg.sender] >= totalEscrow, "Insufficient points");

    pointsBalance[msg.sender] -= totalEscrow;
    contractPointsReserve += totalEscrow;

    uint256 qid = _nextQuestId++;
    Quest storage q = quests[qid];
    q.creator = msg.sender;
    q.name = name;
    q.questType = questType;
    q.target = target;
    q.rewardPoints = rewardPoints;
    q.maxCompletions = maxCompletions;
    q.expiresAt = expiresAt;
    q.isActive = true;
    
    activeQuestIds.push(qid);
    emit QuestAdded(qid, msg.sender, questType, rewardPoints, maxCompletions);
    return qid;
  }

  // ============ QUEST COMPLETION ============

  function completeQuest(uint256 questId, bytes calldata oracleSignature) 
    external 
    whenNotPaused 
    nonReentrant 
  {
    Quest storage q = quests[questId];
    require(q.isActive, "Quest not active");
    require(q.claimedCount < q.maxCompletions, "Max claims reached");
    if (q.expiresAt > 0) require(block.timestamp <= q.expiresAt, "Quest expired");

    bytes32 hash = keccak256(
      abi.encodePacked(
        questId,
        msg.sender,
        q.target,
        userNonce[msg.sender]++
      )
    );
    
    bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
    address signer = ECDSA.recover(ethSignedHash, oracleSignature);
    require(authorizedOracles[signer], "Invalid oracle signature");

    q.claimedCount++;

    uint256 reward = q.rewardPoints;
    contractPointsReserve -= reward;
    pointsBalance[msg.sender] += reward;
    userTotalEarned[msg.sender] += reward;

    emit QuestCompleted(questId, msg.sender, reward, farcasterFidOf[msg.sender], address(0), 0);
  }

  // ============ QUEST VIEWS ============

  function getQuest(uint256 questId) external view returns (
    address creator,
    string memory name,
    uint8 questType,
    uint256 target,
    uint256 rewardPoints,
    uint256 maxCompletions,
    uint256 claimedCount,
    uint256 expiresAt,
    bool isActive,
    string memory metadata
  ) {
    Quest storage q = quests[questId];
    return (
      q.creator, q.name, q.questType, q.target,
      q.rewardPoints, q.maxCompletions, q.claimedCount,
      q.expiresAt, q.isActive, q.meta
    );
  }

  function getAllActiveQuests() external view returns (uint256[] memory) {
    return activeQuestIds;
  }

  // ============ QUEST MANAGEMENT ============

  function closeQuest(uint256 questId) external nonReentrant {
    Quest storage q = quests[questId];
    require(msg.sender == q.creator || msg.sender == owner(), "Not authorized");
    require(q.isActive, "Quest not active");

    q.isActive = false;

    uint256 unclaimedReward = (q.maxCompletions - q.claimedCount) * q.rewardPoints;
    if (unclaimedReward > 0) {
      contractPointsReserve -= unclaimedReward;
      pointsBalance[q.creator] += unclaimedReward;
    }

    _removeFromActiveQuests(questId);
    emit QuestClosed(questId);
  }

  function _removeFromActiveQuests(uint256 questId) internal {
    uint256 len = activeQuestIds.length;
    for (uint256 i = 0; i < len; i++) {
      if (activeQuestIds[i] == questId) {
        activeQuestIds[i] = activeQuestIds[len - 1];
        activeQuestIds.pop();
        break;
      }
    }
  }

  // ============ STAKING ============

  function stakeForBadge(uint256 points, uint256 badgeId) external whenNotPaused {
    require(points > 0, "Points > 0");
    require(pointsBalance[msg.sender] >= points, "Not enough points");
    require(address(badgeContract) != address(0), "Badge contract not set");
    require(badgeContract.ownerOf(badgeId) == msg.sender, "Not badge owner");
    
    pointsBalance[msg.sender] -= points;
    pointsLocked[msg.sender] += points;
    stakedForBadge[msg.sender][badgeId] += points;
    emit StakedForBadge(msg.sender, points, badgeId);
  }

  function unstakeForBadge(uint256 points, uint256 badgeId) external whenNotPaused {
    require(stakedForBadge[msg.sender][badgeId] >= points, "Not staked");
    require(address(badgeContract) != address(0), "Badge contract not set");
    require(badgeContract.ownerOf(badgeId) == msg.sender, "Not badge owner");
    
    stakedForBadge[msg.sender][badgeId] -= points;
    pointsLocked[msg.sender] -= points;
    pointsBalance[msg.sender] += points;
    emit UnstakedForBadge(msg.sender, points, badgeId);
  }

  // ============ GM SYSTEM ============

  function sendGM() external nonReentrant whenNotPaused {
    uint256 last = lastGMTime[msg.sender];
    require(block.timestamp >= last + gmCooldown, "Cooldown not met");

    lastGMTime[msg.sender] = block.timestamp;
    
    uint256 currentStreak = gmStreak[msg.sender];
    uint256 newStreak;
    
    if (last > 0 && block.timestamp <= last + gmCooldown + 1 days) {
      newStreak = currentStreak + 1;
    } else {
      newStreak = 1;
    }
    
    gmStreak[msg.sender] = newStreak;

    uint256 reward = _computeGMReward(gmPointReward, newStreak);
    pointsBalance[msg.sender] += reward;
    userTotalEarned[msg.sender] += reward;

    emit GMSent(msg.sender, reward, newStreak);
    // emit PointsEarned(msg.sender, reward);
  }

  function _computeGMReward(uint256 base, uint256 streak) internal view returns (uint256) {
    uint256 bonusPct = 0;
    if (streak >= 100) bonusPct = streak100BonusPct;
    else if (streak >= 30) bonusPct = streak30BonusPct;
    else if (streak >= 7) bonusPct = streak7BonusPct;
    
    unchecked {
      return base + ((base * bonusPct) / 100);
    }
  }

  function gmhistory(address user) external view returns (uint256 last, uint256 streak) {
    return (lastGMTime[user], gmStreak[user]);
  }

  // ============ VIEWS ============

  function getUserStats(address user) external view returns (uint256 availablePoints, uint256 lockedPoints, uint256 totalEarned) {
    return (pointsBalance[user], pointsLocked[user], userTotalEarned[user]);
  }

  function pause() external onlyOwner { _pause(); }
  function unpause() external onlyOwner { _unpause(); }
}
