// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "../SoulboundBadge.sol";

/**
 * @title GuildLogicLib
 * @notice External library for guild management logic
 * @dev Used via delegatecall from main contract to reduce bytecode size
 */
library GuildLogicLib {

  // ============ STRUCTS (must match GuildModule EXACTLY - byte-for-byte layout) ============
  struct Guild {
    string name;
    address leader;
    uint256 totalPoints;
    uint256 memberCount;
    bool active;
    address[] members;
    uint8 level;
  }

  // ============ EVENTS (must match BaseModule/GuildModule) ============
  event GuildCreated(uint256 indexed guildId, address indexed leader, string name);
  event GuildJoined(uint256 indexed guildId, address indexed member);
  event GuildLeft(uint256 indexed guildId, address indexed member);
  event GuildLevelUp(uint256 indexed guildId, uint8 newLevel);
  event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);

  // ============ ERRORS (must match BaseModule) ============
  error InsufficientPoints();
  error ZeroAddressNotAllowed();

  // ============ GUILD MANAGEMENT LOGIC ============

  /**
   * @notice Create a new guild
   * @dev Called via delegatecall, operates on caller's storage
   */
  function createGuild(
    mapping(uint256 => Guild) storage guilds,
    mapping(address => uint256) storage guildOf,
    mapping(address => uint256) storage pointsBalance,
    SoulboundBadge badgeContract,
    uint256 nextGuildId,
    uint256 guildCreationCost,
    string calldata name
  ) external returns (uint256) {
    require(bytes(name).length > 2, "Name too short");
    require(guildOf[msg.sender] == 0, "Already in guild");
    require(pointsBalance[msg.sender] >= guildCreationCost, "Not enough points");
    
    if (pointsBalance[msg.sender] < guildCreationCost) revert InsufficientPoints();
    pointsBalance[msg.sender] -= guildCreationCost;

    uint256 gid = nextGuildId + 1;

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
    
    return gid;
  }

  /**
   * @notice Join an existing guild
   * @dev Called via delegatecall, operates on caller's storage
   */
  function joinGuild(
    mapping(uint256 => Guild) storage guilds,
    mapping(address => uint256) storage guildOf,
    uint256 nextGuildId,
    uint256 guildId
  ) external {
    require(guildId > 0 && guildId <= nextGuildId, "Invalid guild");
    require(guildOf[msg.sender] == 0, "Already in guild");
    Guild storage g = guilds[guildId];
    require(g.active, "Inactive guild");
    g.members.push(msg.sender);
    g.memberCount += 1;
    guildOf[msg.sender] = guildId;
    emit GuildJoined(guildId, msg.sender);
  }

  /**
   * @notice Leave current guild
   * @dev Called via delegatecall, operates on caller's storage
   */
  function leaveGuild(
    mapping(uint256 => Guild) storage guilds,
    mapping(address => uint256) storage guildOf
  ) external {
    uint256 gid = guildOf[msg.sender];
    require(gid > 0, "Not in guild");
    Guild storage g = guilds[gid];
    require(g.active, "Inactive guild");
    require(g.memberCount > 0, "Member count already zero");
    
    g.memberCount -= 1;
    guildOf[msg.sender] = 0;
    emit GuildLeft(gid, msg.sender);
  }

  /**
   * @notice Add points to guild and update level
   * @dev Called via delegatecall, operates on caller's storage
   */
  function addGuildPoints(
    mapping(uint256 => Guild) storage guilds,
    uint256 guildId,
    uint256 points
  ) external {
    Guild storage g = guilds[guildId];
    g.totalPoints += points;
    uint8 newLevel = _computeGuildLevel(g.totalPoints);
    if (newLevel > g.level) {
      g.level = newLevel;
      emit GuildLevelUp(guildId, newLevel);
    }
  }

  /**
   * @dev Internal helper to compute guild level from total points
   */
  function _computeGuildLevel(uint256 totalPoints) internal pure returns (uint8) {
    if (totalPoints >= 10000) return 5;
    if (totalPoints >= 5000) return 4;
    if (totalPoints >= 2000) return 3;
    if (totalPoints >= 1000) return 2;
    return 1;
  }
}
