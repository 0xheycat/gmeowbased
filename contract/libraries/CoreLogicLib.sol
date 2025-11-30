// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title CoreLogicLib
 * @notice External library for core quest and GM system logic
 * @dev Used via delegatecall from main contract to reduce bytecode size
 */
library CoreLogicLib {
  using ECDSA for bytes32;
  using SafeERC20 for IERC20;

  // ============ STRUCTS (must match BaseModule EXACTLY - byte-for-byte layout) ============
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

  // ============ EVENTS (must match BaseModule) ============
  event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount);
  event NonceIncremented(address indexed user, uint256 newNonce);
  event ERC20Payout(uint256 indexed questId, address indexed to, address token, uint256 amount);
  event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak);
  event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);

  // ============ ERRORS (must match BaseModule) ============
  error QuestNotActive();
  error MaxCompletionsReached();
  error QuestExpired();
  error SignatureExpired();
  error InvalidNonce();
  error InvalidOracleSignature();
  error InsufficientEscrow();
  error AlreadyMigrated();
  error GMCooldownActive();
  error ZeroAddressNotAllowed();

  // ============ QUEST COMPLETION LOGIC ============

  /**
   * @notice Complete a quest with oracle signature verification
   * @dev Called via delegatecall, operates on caller's storage
   */
  function completeQuestWithSignature(
    mapping(uint256 => Quest) storage quests,
    mapping(address => uint256) storage pointsBalance,
    mapping(address => uint256) storage userTotalEarned,
    mapping(address => uint256) storage userNonce,
    mapping(address => uint256) storage tokenBalances,
    mapping(address => bool) storage authorizedOracles,
    mapping(uint256 => bool) storage powerBadge,
    mapping(address => bool) storage hasMigrated,
    uint256 questId,
    address user,
    uint256 fid,
    uint8 action,
    uint256 deadline,
    uint256 nonce,
    bytes calldata sig
  ) external {
    if (user == address(0)) revert ZeroAddressNotAllowed();
    if (hasMigrated[user]) revert AlreadyMigrated();
    
    Quest storage q = quests[questId];
    
    if (!q.isActive) revert QuestNotActive();
    if (q.claimedCount >= q.maxCompletions) revert MaxCompletionsReached();
    if (q.expiresAt != 0 && block.timestamp > q.expiresAt) revert QuestExpired();
    
    if (block.timestamp > deadline) revert SignatureExpired();
    if (userNonce[user] != nonce) revert InvalidNonce();
    
    bytes32 hash = keccak256(
      abi.encodePacked(
        block.chainid,
        address(this),
        questId,
        user,
        fid,
        action,
        deadline,
        nonce
      )
    );
    address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(hash), sig);
    if (signer == address(0) || !authorizedOracles[signer]) revert InvalidOracleSignature();
    
    unchecked {
      ++userNonce[user];
    }
    emit NonceIncremented(user, userNonce[user]);
    
    uint256 rewardPointsLocal = q.rewardPoints;
    if (fid != 0 && powerBadge[fid]) {
      unchecked {
        rewardPointsLocal += (rewardPointsLocal >> 3) + (rewardPointsLocal >> 4);
      }
    }

    uint256 tokenPaid = 0;
    if (rewardPointsLocal != 0) {
      if (q.escrowedPoints < rewardPointsLocal) revert InsufficientEscrow();
      
      unchecked {
        q.escrowedPoints -= rewardPointsLocal;
        pointsBalance[user] += rewardPointsLocal;
        userTotalEarned[user] += rewardPointsLocal;
      }
    }

    address rToken = q.rewardToken;
    
    if (rToken != address(0) && q.rewardTokenPerUser != 0) {
      if (q.tokenEscrowRemaining < q.rewardTokenPerUser) revert InsufficientEscrow();
      
      tokenPaid = q.rewardTokenPerUser;
      unchecked {
        q.tokenEscrowRemaining -= tokenPaid;
        tokenBalances[rToken] -= tokenPaid;
      }
    }

    unchecked {
      ++q.claimedCount;
    }
    
    if (tokenPaid != 0) {
      IERC20(rToken).transfer(user, tokenPaid);
      emit ERC20Payout(questId, user, rToken, tokenPaid);
    }

    emit QuestCompleted(questId, user, rewardPointsLocal, fid, rToken, tokenPaid);
  }

  // ============ GM SYSTEM LOGIC ============

  /**
   * @notice Send GM and claim daily reward with streak bonuses
   * @dev Called via delegatecall, operates on caller's storage
   */
  function sendGM(
    mapping(address => uint256) storage pointsBalance,
    mapping(address => uint256) storage userTotalEarned,
    mapping(address => uint256) storage lastGMTime,
    mapping(address => uint256) storage gmStreak,
    uint256 gmPointReward,
    uint256 gmCooldown,
    uint16 streak7BonusPct,
    uint16 streak30BonusPct,
    uint16 streak100BonusPct
  ) external {
    uint256 last = lastGMTime[msg.sender];
    if (block.timestamp < last + gmCooldown) revert GMCooldownActive();

    if (last > 0 && block.timestamp - last <= 2 days) {
      gmStreak[msg.sender] += 1;
    } else {
      gmStreak[msg.sender] = 1;
    }
    lastGMTime[msg.sender] = block.timestamp;

    uint256 reward = _computeGMReward(gmPointReward, gmStreak[msg.sender], streak7BonusPct, streak30BonusPct, streak100BonusPct);
    pointsBalance[msg.sender] += reward;
    userTotalEarned[msg.sender] += reward;

    emit GMEvent(msg.sender, reward, gmStreak[msg.sender]);
    emit GMSent(msg.sender, gmStreak[msg.sender], reward);
  }

  /**
   * @dev Internal helper to compute GM reward with streak bonuses
   */
  function _computeGMReward(
    uint256 base,
    uint256 streak,
    uint16 streak7BonusPct,
    uint16 streak30BonusPct,
    uint16 streak100BonusPct
  ) internal pure returns (uint256) {
    if (base == 0) return 0;
    uint256 bonusPct = 0;
    if (streak >= 100) bonusPct = streak100BonusPct;
    else if (streak >= 30) bonusPct = streak30BonusPct;
    else if (streak >= 7) bonusPct = streak7BonusPct;
    
    uint256 bonus = (base * bonusPct) / 100;
    require(base + bonus >= base, "Reward overflow");
    return base + bonus;
  }
}
