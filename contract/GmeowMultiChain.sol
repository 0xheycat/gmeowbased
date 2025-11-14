// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  GmeowMultichain.sol - GMEOW Multichain Quest Protocol
  - Ownable(initialOwner)
  - Pausable import path
  - MessageHashUtils for toEthSignedMessageHash
  - Remove Counters (use _nextQuestId)
  - Rename reserved 'after' variable
  - Farcaster @heycat
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./SoulboundBadge.sol";

contract GmeowMultichain is Ownable, Pausable {
  using ECDSA for bytes32;
  using SafeERC20 for IERC20;

  // ------------ Events ------------
  event QuestAdded(uint256 indexed questId, address indexed creator, uint8 questType, uint256 rewardPerUserPoints, uint256 maxCompletions);
  event QuestAddedERC20(uint256 indexed questId, address indexed creator, address token, uint256 rewardPerUserToken, uint256 maxCompletions);
  event QuestClosed(uint256 indexed questId);
  event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount);
  event PointsDeposited(address indexed who, uint256 amount);
  event PointsWithdrawn(address indexed who, uint256 amount);
  event PointsTipped(address indexed from, address indexed to, uint256 points, uint256 fid);
  event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
  event FIDLinked(address indexed who, uint256 fid);
  event OracleSignerUpdated(address indexed newSigner);
  event PowerBadgeSet(uint256 indexed fid, bool hasPowerBadge);
  event StakedForBadge(address indexed who, uint256 points, uint256 badgeId);
  event UnstakedForBadge(address indexed who, uint256 points, uint256 badgeId);

  event ERC20EscrowDeposited(uint256 indexed questId, address indexed token, uint256 amount);
  event ERC20Payout(uint256 indexed questId, address indexed to, address token, uint256 amount);
  event ERC20Refund(uint256 indexed questId, address indexed to, address token, uint256 amount);
  event TokenWhitelisted(address indexed token, bool enabled);

  // ================= GM SYSTEM =================
  event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak, uint256 timestamp);
  // Simple event consumed by GMHistory.tsx
  event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);

  // ------------ Data structures ------------
  struct Quest {
    string name;
    uint8 questType;
    uint256 target;
    uint256 rewardPoints;
    address creator;
    uint256 maxCompletions;
    uint256 expiresAt;
    string meta;
    bool isActive;
    uint256 escrowedPoints;
    uint256 claimedCount;
    address rewardToken;
    uint256 rewardTokenPerUser;
    uint256 tokenEscrowRemaining;
  }

  struct UserProfile {
    string name;
    string bio;
    string twitter;
    string pfpUrl;
    uint256 joinDate;
    bool hasCustomProfile;
    uint256 farcasterFid;
  }

  // ------------ State ------------
  uint256 private _nextQuestId;
  mapping(uint256 => Quest) public quests;
  uint256[] public activeQuestIds;

  mapping(address => uint256) public pointsBalance;
  mapping(address => uint256) public pointsLocked;
  mapping(uint256 => uint256) public fidPoints;

  mapping(address => UserProfile) public userProfiles;
  mapping(address => uint256) public userTotalEarned;

  mapping(address => uint256) public farcasterFidOf;
  mapping(uint256 => bool) public powerBadge;
  uint256 public constant OG_THRESHOLD = 10_000;

  address public oracleSigner;
  SoulboundBadge public badgeContract;

  mapping(address => mapping(uint256 => uint256)) public stakedForBadge;

  uint256 public contractPointsReserve;

  mapping(address => uint256) public tokenBalances;
  mapping(address => bool) public tokenWhitelist;
  bool public tokenWhitelistEnabled = true;

  // ---- GM state ----
  uint256 public gmPointReward = 10;            // base points per GM
  uint256 public gmCooldown = 1 days;           // cooldown between GMs
  mapping(address => uint256) public lastGMTime; // last GM unix time
  mapping(address => uint256) public gmStreak;   // current continuous streak
  // Streak bonus tiers (percent added to base reward)
  // 7d => +10%, 30d => +25%, 100d => +50%
  uint16 public streak7BonusPct = 10;
  uint16 public streak30BonusPct = 25;
  uint16 public streak100BonusPct = 50;

  // ------------ Constructor ------------
  constructor(address _oracleSigner) Ownable(msg.sender) {
    oracleSigner = _oracleSigner;
    // deploy badge; owner = this contract (msg.sender within badge constructor is this contract)
    badgeContract = new SoulboundBadge("GmeowBadge", "GMEOWB");
  }

  // ------------ Modifiers ------------
  modifier onlyActiveQuest(uint256 questId) {
    require(quests[questId].isActive, "Quest not active");
    _;
  }

  // ------------ Admin ------------
  function setOracleSigner(address s) external onlyOwner {
    oracleSigner = s;
    emit OracleSignerUpdated(s);
  }

  function setPowerBadgeForFid(uint256 fid, bool val) external onlyOwner {
    powerBadge[fid] = val;
    emit PowerBadgeSet(fid, val);
  }

  function setTokenWhitelistEnabled(bool enabled) external onlyOwner {
    tokenWhitelistEnabled = enabled;
  }

  function addTokenToWhitelist(address token, bool allowed) external onlyOwner {
    tokenWhitelist[token] = allowed;
    emit TokenWhitelisted(token, allowed);
  }

  function withdrawContractReserve(address to, uint256 amount) external onlyOwner {
    require(amount <= contractPointsReserve, "Not enough reserve");
    contractPointsReserve -= amount;
    pointsBalance[to] += amount;
    emit PointsWithdrawn(to, amount);
  }

  function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
    require(to != address(0), "Invalid to");
    IERC20(token).safeTransfer(to, amount);
  }

  /// Configure GM base reward and cooldown (owner)
  function setGMConfig(uint256 reward, uint256 cooldown) external onlyOwner {
    require(cooldown >= 12 hours && cooldown <= 3 days, "cooldown out of range");
    gmPointReward = reward;
    gmCooldown = cooldown;
  }
  
  /// Configure streak bonus tiers (owner)
  function setGMBonusTiers(uint16 bonus7, uint16 bonus30, uint16 bonus100) external onlyOwner {
    require(bonus7 <= 1000 && bonus30 <= 1000 && bonus100 <= 2000, "bonus too high");
    streak7BonusPct = bonus7;
    streak30BonusPct = bonus30;
    streak100BonusPct = bonus100;
  }

  // ------------ Points management ------------
  function depositTo(address to, uint256 amount) external onlyOwner {
    pointsBalance[to] += amount;
    emit PointsDeposited(to, amount);
  }

  function burnPoints(address from, uint256 amount) internal {
    require(pointsBalance[from] >= amount, "Insufficient points");
    pointsBalance[from] -= amount;
  }

  // ------------ Profile & FID linking ------------
  function updateUserProfile(string calldata name_, string calldata bio_, string calldata twitter_, string calldata pfpUrl_) external {
    UserProfile storage p = userProfiles[msg.sender];
    p.name = name_;
    p.bio = bio_;
    p.twitter = twitter_;
    p.pfpUrl = pfpUrl_;
    p.hasCustomProfile = true;
    p.joinDate = block.timestamp;
  }

  function getUserProfile(address user) external view returns (
    string memory, string memory, string memory, string memory, uint256, bool, uint256
  ) {
    UserProfile storage p = userProfiles[user];
    return (p.name, p.bio, p.twitter, p.pfpUrl, p.joinDate, p.hasCustomProfile, p.farcasterFid);
  }

  function setFarcasterFid(uint256 fid) external whenNotPaused {
    farcasterFidOf[msg.sender] = fid;
    if (fid > 0 && fid < OG_THRESHOLD) {
      uint256 tokenId = badgeContract.mint(msg.sender, "OG-Caster");
      emit BadgeMinted(msg.sender, tokenId, "OG-Caster");
    }
    emit FIDLinked(msg.sender, fid);
  }

  // ------------ Quests (points-only) ------------
  function addQuest(
    string calldata name,
    uint8 questType,
    uint256 target,
    uint256 rewardPointsPerUser,
    uint256 maxCompletions,
    uint256 expiresAt,
    string calldata meta
  ) external whenNotPaused returns (uint256) {
    require(bytes(name).length > 0, "Name required");
    require(rewardPointsPerUser > 0, "Reward must be > 0");

    uint256 totalEscrow = rewardPointsPerUser * maxCompletions;
    require(pointsBalance[msg.sender] >= totalEscrow, "Insufficient points to fund quest");

    pointsBalance[msg.sender] -= totalEscrow;
    contractPointsReserve += totalEscrow;

    _nextQuestId += 1;
    uint256 qid = _nextQuestId;

    Quest storage q = quests[qid];
    q.name = name;
    q.questType = questType;
    q.target = target;
    q.rewardPoints = rewardPointsPerUser;
    q.creator = msg.sender;
    q.maxCompletions = maxCompletions;
    q.expiresAt = expiresAt;
    q.meta = meta;
    q.isActive = true;
    q.escrowedPoints = totalEscrow;
    q.claimedCount = 0;
    q.rewardToken = address(0);
    q.rewardTokenPerUser = 0;
    q.tokenEscrowRemaining = 0;

    activeQuestIds.push(qid);

    emit QuestAdded(qid, msg.sender, questType, rewardPointsPerUser, maxCompletions);
    return qid;
  }

  // ------------ Quests (ERC20-backed) ------------
  function addQuestWithERC20(
    string calldata name,
    uint8 questType,
    uint256 target,
    uint256 rewardPointsPerUser,
    uint256 maxCompletions,
    uint256 expiresAt,
    string calldata meta,
    address rewardToken,
    uint256 rewardTokenPerUser
  ) external whenNotPaused returns (uint256) {
    require(bytes(name).length > 0, "Name required");
    require(rewardToken != address(0), "Token required");
    require(rewardTokenPerUser > 0, "Token reward > 0");
    require(maxCompletions > 0, "maxCompletions > 0");
    if (tokenWhitelistEnabled) require(tokenWhitelist[rewardToken], "Token not whitelisted");

    uint256 totalTokenEscrow = rewardTokenPerUser * maxCompletions;

    uint256 currentBal = IERC20(rewardToken).balanceOf(msg.sender);
    require(currentBal >= totalTokenEscrow, "Insufficient token balance");
    uint256 allowance = IERC20(rewardToken).allowance(msg.sender, address(this));
    require(allowance >= totalTokenEscrow, "Approve escrow first");

    uint256 beforeBal = IERC20(rewardToken).balanceOf(address(this));
    IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), totalTokenEscrow);
    uint256 afterBal = IERC20(rewardToken).balanceOf(address(this));
    uint256 received = afterBal - beforeBal;
    require(received > 0, "Token transfer failed");

    tokenBalances[rewardToken] += received;

    _nextQuestId += 1;
    uint256 qid = _nextQuestId;

    Quest storage q = quests[qid];
    q.name = name;
    q.questType = questType;
    q.target = target;
    q.rewardPoints = rewardPointsPerUser;
    q.creator = msg.sender;
    q.maxCompletions = maxCompletions;
    q.expiresAt = expiresAt;
    q.meta = meta;
    q.isActive = true;
    q.escrowedPoints = rewardPointsPerUser * maxCompletions;
    q.claimedCount = 0;
    q.rewardToken = rewardToken;
    q.rewardTokenPerUser = rewardTokenPerUser;
    q.tokenEscrowRemaining = received;

    activeQuestIds.push(qid);

    emit QuestAddedERC20(qid, msg.sender, rewardToken, rewardTokenPerUser, maxCompletions);
    emit ERC20EscrowDeposited(qid, rewardToken, received);
    return qid;
  }

  // ------------ Reads ------------
  function getQuest(uint256 questId) external view returns (
    string memory, uint8, uint256, uint256, address, uint256, uint256, string memory, bool, address, uint256, uint256
  ) {
    Quest storage q = quests[questId];
    return (
      q.name,
      q.questType,
      q.target,
      q.rewardPoints,
      q.creator,
      q.maxCompletions,
      q.expiresAt,
      q.meta,
      q.isActive,
      q.rewardToken,
      q.rewardTokenPerUser,
      q.tokenEscrowRemaining
    );
  }

  function getActiveQuests() external view returns (uint256[] memory) {
    return activeQuestIds;
  }

  // ------------ Claims ------------
  function completeQuestWithSig(
    uint256 questId,
    address user,
    uint256 fid,
    uint8 action,
    uint256 deadline,
    uint256 nonce,
    bytes calldata sig
  ) external whenNotPaused {
    Quest storage q = quests[questId];
    require(q.isActive, "Quest not active");
    require(q.claimedCount < q.maxCompletions, "Max claims reached");
    if (q.expiresAt > 0) require(block.timestamp <= q.expiresAt, "Quest expired");
    require(deadline >= block.timestamp, "Signature expired");

    bytes32 hash = keccak256(abi.encodePacked(block.chainid, address(this), questId, user, fid, action, deadline, nonce));
    address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(hash), sig);
    require(signer != address(0) && signer == oracleSigner, "Invalid oracle signature");

    uint256 rewardPointsLocal = q.rewardPoints;
    if (fid > 0 && powerBadge[fid]) {
      rewardPointsLocal = rewardPointsLocal + (rewardPointsLocal / 10);
    }

    if (rewardPointsLocal > 0) {
      require(q.escrowedPoints >= rewardPointsLocal, "Quest points escrow depleted");
      q.escrowedPoints -= rewardPointsLocal;
      contractPointsReserve -= rewardPointsLocal;
      pointsBalance[user] += rewardPointsLocal;
      userTotalEarned[user] += rewardPointsLocal;
    }

    address rToken = q.rewardToken;
    uint256 tokenPaid = 0;
    if (rToken != address(0) && q.rewardTokenPerUser > 0) {
      require(q.tokenEscrowRemaining >= q.rewardTokenPerUser, "Quest token escrow depleted");
      q.tokenEscrowRemaining -= q.rewardTokenPerUser;
      tokenBalances[rToken] -= q.rewardTokenPerUser;
      IERC20(rToken).safeTransfer(user, q.rewardTokenPerUser);
      tokenPaid = q.rewardTokenPerUser;
      emit ERC20Payout(questId, user, rToken, tokenPaid);
    }

    q.claimedCount += 1;
    emit QuestCompleted(questId, user, rewardPointsLocal, fid, rToken, tokenPaid);
  }

  function closeQuest(uint256 questId) external {
    Quest storage q = quests[questId];
    require(q.creator == msg.sender || owner() == msg.sender, "Only creator/owner");
    require(q.isActive, "Not active");
    q.isActive = false;

    uint256 remainingPoints = q.escrowedPoints;
    if (remainingPoints > 0) {
      contractPointsReserve -= remainingPoints;
      pointsBalance[q.creator] += remainingPoints;
      q.escrowedPoints = 0;
    }

    if (q.rewardToken != address(0) && q.tokenEscrowRemaining > 0) {
      uint256 rem = q.tokenEscrowRemaining;
      q.tokenEscrowRemaining = 0;
      tokenBalances[q.rewardToken] -= rem;
      IERC20(q.rewardToken).safeTransfer(q.creator, rem);
      emit ERC20Refund(questId, q.creator, q.rewardToken, rem);
    }

    emit QuestClosed(questId);
  }

  function batchRefundQuests(uint256[] calldata questIds) external {
    uint256 len = questIds.length;
    require(len > 0, "Empty list");
    for (uint256 i = 0; i < len; ++i) {
      uint256 qid = questIds[i];
      Quest storage q = quests[qid];
      require(q.creator == msg.sender || owner() == msg.sender, "Only creator/owner");
      if (!q.isActive) continue;
      q.isActive = false;

      uint256 remainingPoints = q.escrowedPoints;
      if (remainingPoints > 0) {
        contractPointsReserve -= remainingPoints;
        pointsBalance[q.creator] += remainingPoints;
        q.escrowedPoints = 0;
      }

      if (q.rewardToken != address(0) && q.tokenEscrowRemaining > 0) {
        uint256 rem = q.tokenEscrowRemaining;
        q.tokenEscrowRemaining = 0;
        tokenBalances[q.rewardToken] -= rem;
        IERC20(q.rewardToken).safeTransfer(q.creator, rem);
        emit ERC20Refund(qid, q.creator, q.rewardToken, rem);
      }

      emit QuestClosed(qid);
    }
  }

  // ------------ Tipping & Badges ------------
  function tipUser(address to, uint256 points, uint256 recipientFid) external whenNotPaused {
    require(points > 0, "Points > 0");
    require(pointsBalance[msg.sender] >= points, "Insufficient points");
    pointsBalance[msg.sender] -= points;
    pointsBalance[to] += points;
    userTotalEarned[to] += points;
    emit PointsTipped(msg.sender, to, points, recipientFid);
  }

  function mintBadgeFromPoints(uint256 pointsToBurn, string calldata badgeType) external whenNotPaused returns (uint256) {
    require(pointsToBurn > 0, "Points > 0");
    burnPoints(msg.sender, pointsToBurn);
    uint256 tokenId = badgeContract.mint(msg.sender, badgeType);
    emit BadgeMinted(msg.sender, tokenId, badgeType);
    return tokenId;
  }

  function stakeForBadge(uint256 points, uint256 badgeId) external whenNotPaused {
    require(points > 0, "Points > 0");
    require(pointsBalance[msg.sender] >= points, "Not enough points");
    pointsBalance[msg.sender] -= points;
    pointsLocked[msg.sender] += points;
    stakedForBadge[msg.sender][badgeId] += points;
    emit StakedForBadge(msg.sender, points, badgeId);
  }

  function unstakeForBadge(uint256 points, uint256 badgeId) external whenNotPaused {
    require(stakedForBadge[msg.sender][badgeId] >= points, "Not staked");
    stakedForBadge[msg.sender][badgeId] -= points;
    pointsLocked[msg.sender] -= points;
    pointsBalance[msg.sender] += points;
    emit UnstakedForBadge(msg.sender, points, badgeId);
  }

  // ================= GM LOGIC =================
  /// Send your daily GM (ContractGMButton.tsx / gm-utils calls this)
  function sendGM() external whenNotPaused {
    uint256 last = lastGMTime[msg.sender];
    require(block.timestamp >= last + gmCooldown, "Cooldown active");

    // Update streak with a small grace to keep momentum (48h)
    if (last > 0 && block.timestamp - last <= 2 days) {
      gmStreak[msg.sender] += 1;
    } else {
      gmStreak[msg.sender] = 1;
    }
    lastGMTime[msg.sender] = block.timestamp;

    // Compute reward with streak bonuses
    uint256 reward = _computeGMReward(gmPointReward, gmStreak[msg.sender]);
    pointsBalance[msg.sender] += reward;
    userTotalEarned[msg.sender] += reward;

    emit GMEvent(msg.sender, reward, gmStreak[msg.sender], block.timestamp);
    emit GMSent(msg.sender, gmStreak[msg.sender], reward);
  }

 
  function gmhistory(address user) external view returns (uint256 last, uint256 streak) {
    return (lastGMTime[user], gmStreak[user]);
  }

  function _computeGMReward(uint256 base, uint256 streak) internal view returns (uint256) {
    if (base == 0) return 0;
    uint256 bonusPct = 0;
    if (streak >= 100) bonusPct = streak100BonusPct;
    else if (streak >= 30) bonusPct = streak30BonusPct;
    else if (streak >= 7) bonusPct = streak7BonusPct;
    return base + ((base * bonusPct) / 100);
  }

  // ------------ Utility reads ------------
  function getUserStats(address user) external view returns (uint256 availablePoints, uint256 lockedPoints, uint256 totalEarned) {
    return (pointsBalance[user], pointsLocked[user], userTotalEarned[user]);
  }

  function tokenEscrowOf(address token) external view returns (uint256) {
    return tokenBalances[token];
  }

  // ------------ Pausable ------------
  function pause() external onlyOwner { _pause(); }
  function unpause() external onlyOwner { _unpause(); }

// -----------------------------------------------------------
//  REFERRAL + GUILD EXTENSIONS  (moved inside the contract)
// -----------------------------------------------------------

  // ================= REFERRAL SYSTEM =================
  event ReferralCodeRegistered(address indexed user, string code);
  event ReferrerSet(address indexed user, address indexed referrer);
  event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 pointsReward, uint256 tokenReward);

  struct ReferralStats {
      uint256 totalReferred;
      uint256 totalPointsEarned;
      uint256 totalTokenEarned;
  }

  mapping(address => string) public referralCodeOf;       // user -> custom code
  mapping(string => address) public referralOwnerOf;      // code -> user
  mapping(address => address) public referrerOf;          // user -> who referred them
  mapping(address => ReferralStats) public referralStats; // referrer -> stats
  mapping(address => uint8) public referralTierClaimed;   // prevent double-claim of tier badges

  uint256 public referralPointReward = 50;  // default reward per referral
  uint256 public referralTokenReward = 0;   // optional ERC20 token reward (disabled if 0)

  // Register custom referral code (e.g. "heycat")
  function registerReferralCode(string calldata code) external whenNotPaused {
      require(bytes(code).length >= 3 && bytes(code).length <= 32, "Invalid length");
      require(referralOwnerOf[code] == address(0), "Code taken");
      referralOwnerOf[code] = msg.sender;
      referralCodeOf[msg.sender] = code;
      emit ReferralCodeRegistered(msg.sender, code);
  }

  // Set referrer by referral code
  function setReferrer(string calldata code) external whenNotPaused {
      require(referrerOf[msg.sender] == address(0), "Already set");
      address referrer = referralOwnerOf[code];
      require(referrer != address(0) && referrer != msg.sender, "Invalid referrer");
      referrerOf[msg.sender] = referrer;

      // give both small reward
      pointsBalance[referrer] += referralPointReward;
      pointsBalance[msg.sender] += referralPointReward / 2;
      referralStats[referrer].totalReferred += 1;
      referralStats[referrer].totalPointsEarned += referralPointReward;

      // award badges by milestone
      uint256 total = referralStats[referrer].totalReferred;
      if (total == 1 && referralTierClaimed[referrer] < 1) {
          uint256 tid = badgeContract.mint(referrer, "Bronze Recruiter");
          emit BadgeMinted(referrer, tid, "Bronze Recruiter");
          referralTierClaimed[referrer] = 1;
      } else if (total == 5 && referralTierClaimed[referrer] < 2) {
          uint256 tid = badgeContract.mint(referrer, "Silver Recruiter");
          emit BadgeMinted(referrer, tid, "Silver Recruiter");
          referralTierClaimed[referrer] = 2;
      } else if (total == 10 && referralTierClaimed[referrer] < 3) {
          uint256 tid = badgeContract.mint(referrer, "Gold Recruiter");
          emit BadgeMinted(referrer, tid, "Gold Recruiter");
          referralTierClaimed[referrer] = 3;
      }

      emit ReferrerSet(msg.sender, referrer);
  }

  // ================= GUILD SYSTEM =================
  event GuildCreated(uint256 indexed guildId, address indexed leader, string name);
  event GuildJoined(uint256 indexed guildId, address indexed member);
  event GuildLeft(uint256 indexed guildId, address indexed member);
  event GuildLevelUp(uint256 indexed guildId, uint8 newLevel);
  event GuildQuestCreated(uint256 indexed guildId, uint256 indexed questId, string name);
  event GuildPointsDeposited(uint256 indexed guildId, address indexed from, uint256 amount);
  event GuildTreasuryTokenDeposited(uint256 indexed guildId, address indexed token, uint256 amount);
  event GuildRewardClaimed(uint256 indexed guildId, address indexed member, uint256 points);

  struct Guild {
      string name;
      address leader;
      uint256 totalPoints;
      uint256 memberCount;
      bool active;
      address[] members;
      uint8 level;
  }

  mapping(uint256 => Guild) public guilds;
  mapping(address => uint256) public guildOf;
  uint256 public nextGuildId;

  // Create new guild (costs some points)
  uint256 public guildCreationCost = 100;

  function createGuild(string calldata name) external whenNotPaused {
      require(bytes(name).length > 2, "Name too short");
      require(guildOf[msg.sender] == 0, "Already in guild");
      require(pointsBalance[msg.sender] >= guildCreationCost, "Not enough points");
      burnPoints(msg.sender, guildCreationCost);

      nextGuildId++;
      uint256 gid = nextGuildId;

      Guild storage g = guilds[gid];
      g.name = name;
      g.leader = msg.sender;
      g.active = true;
      g.memberCount = 1;
      g.members.push(msg.sender);
      g.level = 1;

      guildOf[msg.sender] = gid;

      uint256 tid = badgeContract.mint(msg.sender, "Guild Leader");
      emit BadgeMinted(msg.sender, tid, "Guild Leader");
      emit GuildCreated(gid, msg.sender, name);
  }

  // Join a guild
  function joinGuild(uint256 guildId) external whenNotPaused {
      require(guildId > 0 && guildId <= nextGuildId, "Invalid guild");
      require(guildOf[msg.sender] == 0, "Already in guild");
      Guild storage g = guilds[guildId];
      require(g.active, "Inactive guild");
      g.members.push(msg.sender);
      g.memberCount += 1;
      guildOf[msg.sender] = guildId;
      emit GuildJoined(guildId, msg.sender);
  }

  // Leave a guild
  function leaveGuild() external whenNotPaused {
      uint256 gid = guildOf[msg.sender];
      require(gid > 0, "Not in guild");
      Guild storage g = guilds[gid];
      require(g.active, "Inactive guild");
      guildOf[msg.sender] = 0;
      g.memberCount -= 1;
      emit GuildLeft(gid, msg.sender);
  }

  // Add guild points (e.g. from quests or staking)
  function addGuildPoints(uint256 guildId, uint256 points) internal {
      Guild storage g = guilds[guildId];
      g.totalPoints += points;
      // Level up milestones
      uint8 newLevel = _computeGuildLevel(g.totalPoints);
      if (newLevel > g.level) {
          g.level = newLevel;
          emit GuildLevelUp(guildId, newLevel);
      }
  }

  function _computeGuildLevel(uint256 totalPoints) internal pure returns (uint8) {
      if (totalPoints >= 10000) return 5;
      if (totalPoints >= 5000) return 4;
      if (totalPoints >= 2000) return 3;
      if (totalPoints >= 1000) return 2;
      return 1;
  }

  // Deposit points to guild treasury
  mapping(uint256 => uint256) public guildTreasuryPoints;
  function depositGuildPoints(uint256 guildId, uint256 points) external whenNotPaused {
      require(guildId > 0 && guildId <= nextGuildId, "Invalid guild");
      require(pointsBalance[msg.sender] >= points, "Not enough points");
      pointsBalance[msg.sender] -= points;
      guildTreasuryPoints[guildId] += points;
      addGuildPoints(guildId, points / 10);
      emit GuildPointsDeposited(guildId, msg.sender, points);
  }

  // Claim a guild reward (simple)
  function claimGuildReward(uint256 guildId, uint256 points) external whenNotPaused {
      require(guildOf[msg.sender] == guildId, "Not in guild");
      require(guildTreasuryPoints[guildId] >= points, "Not enough treasury");
      guildTreasuryPoints[guildId] -= points;
      pointsBalance[msg.sender] += points;
      emit GuildRewardClaimed(guildId, msg.sender, points);
  }

  // Guild quest creation (for on-chain tracking)
  struct GuildQuest {
      uint256 guildId;
      string name;
      uint256 rewardPoints;
      bool active;
  }

  mapping(uint256 => GuildQuest) public guildQuests;
  uint256 public nextGuildQuestId;

  function createGuildQuest(uint256 guildId, string calldata name, uint256 rewardPoints) external whenNotPaused {
      Guild storage g = guilds[guildId];
      require(msg.sender == g.leader, "Only leader");
      require(g.active, "Inactive guild");
      require(rewardPoints > 0, "Points > 0");
      nextGuildQuestId++;
      uint256 qid = nextGuildQuestId;
      guildQuests[qid] = GuildQuest({
          guildId: guildId,
          name: name,
          rewardPoints: rewardPoints,
          active: true
      });
      emit GuildQuestCreated(guildId, qid, name);
  }

  // Complete a guild quest (simplified)
  function completeGuildQuest(uint256 guildQuestId) external whenNotPaused {
      GuildQuest storage gq = guildQuests[guildQuestId];
      require(gq.active, "Inactive");
      uint256 gid = gq.guildId;
      require(guildOf[msg.sender] == gid, "Not in guild");
      pointsBalance[msg.sender] += gq.rewardPoints;
      addGuildPoints(gid, gq.rewardPoints);
      emit GuildRewardClaimed(gid, msg.sender, gq.rewardPoints);
  }


}
