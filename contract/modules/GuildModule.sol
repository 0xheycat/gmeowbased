// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./BaseModule.sol";

/**
 * @title GuildModule  
 * @notice Guild creation, membership, and treasury management
 */
abstract contract GuildModule is BaseModule {

  // ============ EVENTS ============
  event GuildCreated(uint256 indexed guildId, address indexed leader, string name);
  event GuildJoined(uint256 indexed guildId, address indexed member);
  event GuildLeft(uint256 indexed guildId, address indexed member);
  event GuildLevelUp(uint256 indexed guildId, uint8 newLevel);
  event GuildQuestCreated(uint256 indexed guildId, uint256 indexed questId, string name);
  event GuildPointsDeposited(uint256 indexed guildId, address indexed from, uint256 amount);
  event GuildTreasuryTokenDeposited(uint256 indexed guildId, address indexed token, uint256 amount);
  event GuildRewardClaimed(uint256 indexed guildId, address indexed member, uint256 points);

  // ============ STRUCTS ============
  struct Guild {
    string name;
    address leader;
    uint256 totalPoints;
    uint256 memberCount;
    bool active;
    uint8 level;
  }

  struct GuildQuest {
    uint256 guildId;
    string name;
    uint256 rewardPoints;
    bool active;
  }

  // ============ STATE ============
  mapping(uint256 => Guild) public guilds;
  mapping(address => uint256) public guildOf;
  mapping(uint256 => mapping(address => bool)) public guildOfficers;
  uint256 public nextGuildId;
  uint256 public guildCreationCost = 100;
  mapping(uint256 => uint256) public guildTreasuryPoints;
  mapping(uint256 => GuildQuest) public guildQuests;
  uint256 public nextGuildQuestId;

  // ============ FUNCTIONS ============

  function createGuild(string calldata name) external nonReentrant whenNotPaused {
    require(bytes(name).length > 2, "E001");
    require(bytes(name).length <= 64, "Name too long");
    require(guildOf[msg.sender] == 0, "E002");
    
    // Check points using unified helper (works in both architectures)
    uint256 userPoints = _getUserPoints(msg.sender);
    require(userPoints >= guildCreationCost, "E003");
    
    // Deduct points using unified helper (works in both architectures)
    _deductPoints(msg.sender, guildCreationCost);

    nextGuildId += 1;
    uint256 gid = nextGuildId;

    Guild storage g = guilds[gid];
    g.name = name;
    g.leader = msg.sender;
    g.active = true;
    g.memberCount = 1;
    g.level = 1;

    guildOf[msg.sender] = gid;

    uint256 tid = badgeContract.mint(msg.sender, "Guild Leader");
    emit BadgeMinted(msg.sender, tid, "Guild Leader");
    emit GuildCreated(gid, msg.sender, name);
  }

  function joinGuild(uint256 guildId) external whenNotPaused {
    _validateGuildId(guildId, nextGuildId);
    require(guildOf[msg.sender] == 0, "E002");
    Guild storage g = guilds[guildId];
    require(g.active, "E005");
    g.memberCount += 1;
    guildOf[msg.sender] = guildId;
    emit GuildJoined(guildId, msg.sender);
  }

  function leaveGuild() external whenNotPaused {
    uint256 gid = guildOf[msg.sender];
    require(gid > 0, "E006");
    Guild storage g = guilds[gid];
    require(g.active, "E005");
    require(g.memberCount > 0, "E007");
    
    g.memberCount -= 1;
    guildOf[msg.sender] = 0;
    emit GuildLeft(gid, msg.sender);
  }

  function addGuildPoints(uint256 guildId, uint256 points) internal {
    Guild storage g = guilds[guildId];
    g.totalPoints += points;
    uint8 newLevel = _computeGuildLevel(g.totalPoints);
    if (newLevel > g.level) {
      g.level = newLevel;
      emit GuildLevelUp(guildId, newLevel);
    }
  }

  function _computeGuildLevel(uint256 totalPoints) internal pure returns (uint8) {
    unchecked {
      if (totalPoints >= 10000) return 5;
      if (totalPoints >= 5000) return 4;
      if (totalPoints >= 2000) return 3;
      if (totalPoints >= 1000) return 2;
      return 1;
    }
  }

  function depositGuildPoints(uint256 guildId, uint256 points) external whenNotPaused {
    _validateGuildId(guildId, nextGuildId);
    require(_getUserPoints(msg.sender) >= points, "E003");
    _deductPoints(msg.sender, points);
    guildTreasuryPoints[guildId] += points;
    addGuildPoints(guildId, points / 10);
    emit GuildPointsDeposited(guildId, msg.sender, points);
  }

  function claimGuildReward(uint256 guildId, uint256 points) external whenNotPaused {
    require(guildOf[msg.sender] == guildId, "E006");
    Guild storage g = guilds[guildId];
    require(
      msg.sender == g.leader || guildOfficers[guildId][msg.sender],
      "E008"
    );
    require(guildTreasuryPoints[guildId] >= points, "E009");
    guildTreasuryPoints[guildId] -= points;
    _addPoints(msg.sender, points);
    emit GuildRewardClaimed(guildId, msg.sender, points);
  }

  function setGuildOfficer(uint256 guildId, address member, bool isOfficer) external whenNotPaused {
    Guild storage g = guilds[guildId];
    require(msg.sender == g.leader, "E010");
    require(guildOf[member] == guildId, "E011");
    guildOfficers[guildId][member] = isOfficer;
  }

  function getGuildInfo(uint256 guildId) 
    external 
    view 
    returns (
      string memory name,
      address leader,
      uint256 totalPoints,
      uint256 memberCount,
      bool active,
      uint8 level,
      uint256 treasuryPoints
    )
  {
    Guild storage g = guilds[guildId];
    return (
      g.name,
      g.leader,
      g.totalPoints,
      g.memberCount,
      g.active,
      g.level,
      guildTreasuryPoints[guildId]
    );
  }

  function createGuildQuest(uint256 guildId, string calldata name, uint256 rewardPoints) external whenNotPaused {
    Guild storage g = guilds[guildId];
    require(msg.sender == g.leader, "E010");
    require(g.active, "E005");
    require(rewardPoints > 0, "E012");
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

  function completeGuildQuest(uint256 guildQuestId) external whenNotPaused {
    GuildQuest storage gq = guildQuests[guildQuestId];
    require(gq.active, "E005");
    uint256 gid = gq.guildId;
    require(guildOf[msg.sender] == gid, "E006");
    _addPoints(msg.sender, gq.rewardPoints);
    addGuildPoints(gid, gq.rewardPoints);
    emit GuildRewardClaimed(gid, msg.sender, gq.rewardPoints);
  }
}
