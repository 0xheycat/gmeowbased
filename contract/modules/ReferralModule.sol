// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./BaseModule.sol";

/**
 * @title ReferralModule
 * @notice Referral code registration and reward system
 */
abstract contract ReferralModule is BaseModule {

  // ============ EVENTS ============
  event ReferralCodeRegistered(address indexed user, string code);
  event ReferrerSet(address indexed user, address indexed referrer);
  event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 pointsReward, uint256 tokenReward);

  // ============ STRUCTS ============
  struct ReferralStats {
    uint256 totalReferred;
    uint256 totalPointsEarned;
    uint256 totalTokenEarned;
  }

  // ============ STATE ============
  mapping(address => string) public referralCodeOf;
  mapping(string => address) public referralOwnerOf;
  mapping(address => address) public referrerOf;
  mapping(address => ReferralStats) public referralStats;
  mapping(address => uint8) public referralTierClaimed;

  uint256 public referralPointReward = 50;
  uint256 public referralTokenReward = 0;

  // ============ FUNCTIONS ============

  function registerReferralCode(string calldata code) external whenNotPaused {
    require(bytes(code).length >= 3 && bytes(code).length <= 32, "E013");
    require(referralOwnerOf[code] == address(0), "E014");
    referralOwnerOf[code] = msg.sender;
    referralCodeOf[msg.sender] = code;
    emit ReferralCodeRegistered(msg.sender, code);
  }

  function setReferrer(string calldata code) external whenNotPaused {
    require(referrerOf[msg.sender] == address(0), "E015");
    address referrer = referralOwnerOf[code];
    require(referrer != address(0) && referrer != msg.sender, "E016");
    referrerOf[msg.sender] = referrer;

    // Add points using unified helper (works in both architectures)
    uint256 referrerReward = referralPointReward;
    uint256 refereeReward = referralPointReward / 2;
    _addPoints(referrer, referrerReward);
    _addPoints(msg.sender, refereeReward);
    
    referralStats[referrer].totalReferred += 1;
    referralStats[referrer].totalPointsEarned += referrerReward;

    // Cache storage variable to save gas
    uint256 total = referralStats[referrer].totalReferred;
    uint8 currentTier = referralTierClaimed[referrer];
    
    if (total == 1 && currentTier < 1) {
      uint256 tid = badgeContract.mint(referrer, "Bronze Recruiter");
      emit BadgeMinted(referrer, tid, "Bronze Recruiter");
      referralTierClaimed[referrer] = 1;
    } else if (total == 5 && currentTier < 2) {
      uint256 tid = badgeContract.mint(referrer, "Silver Recruiter");
      emit BadgeMinted(referrer, tid, "Silver Recruiter");
      referralTierClaimed[referrer] = 2;
    } else if (total == 10 && currentTier < 3) {
      uint256 tid = badgeContract.mint(referrer, "Gold Recruiter");
      emit BadgeMinted(referrer, tid, "Gold Recruiter");
      referralTierClaimed[referrer] = 3;
    }

    emit ReferrerSet(msg.sender, referrer);
    emit ReferralRewardClaimed(referrer, msg.sender, referrerReward, 0);
  }
}
