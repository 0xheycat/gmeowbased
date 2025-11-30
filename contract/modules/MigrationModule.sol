// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./BaseModule.sol";

/**
 * @title MigrationModule
 * @notice Contract migration system for upgrades
 */
abstract contract MigrationModule is BaseModule {

  // ============ MIGRATION SYSTEM ============

  function setMigrationTarget(address target) external onlyOwner {
    require(target != address(0), "Invalid target");
    require(target != address(this), "Cannot migrate to self");
    migrationTarget = target;
    migrationActivationTime = block.timestamp + 7 days;
    emit MigrationTargetSet(target, migrationActivationTime);
  }

  function enableMigration(bool enabled) external onlyOwner {
    if (enabled) {
      require(migrationTarget != address(0), "No target set");
      require(block.timestamp >= migrationActivationTime, "Migration timelock active");
    }
    migrationEnabled = enabled;
    emit MigrationEnabled(enabled);
  }

  function migrateToNewContract() external whenNotPaused nonReentrant {
    require(migrationEnabled, "Migration not enabled");
    require(migrationTarget != address(0), "No target set");
    require(!hasMigrated[msg.sender], "Already migrated");
    
    uint256 points = pointsBalance[msg.sender];
    uint256 locked = pointsLocked[msg.sender];
    uint256 totalEarned = userTotalEarned[msg.sender];
    uint256 fid = farcasterFidOf[msg.sender];
    uint256 streak = gmStreak[msg.sender];
    
    hasMigrated[msg.sender] = true;
    pointsBalance[msg.sender] = 0;
    pointsLocked[msg.sender] = 0;
    
    (bool success, ) = migrationTarget.call(
      abi.encodeWithSignature(
        "receiveMigration(address,uint256,uint256,uint256,uint256,uint256)",
        msg.sender,
        points,
        locked,
        totalEarned,
        fid,
        streak
      )
    );
    require(success, "Migration call failed");
    
    emit UserMigrated(msg.sender, migrationTarget, points, locked);
  }

  function canMigrate(address user) external view returns (bool eligible, string memory reason) {
    if (!migrationEnabled) return (false, "Migration not enabled");
    if (migrationTarget == address(0)) return (false, "No target set");
    if (hasMigrated[user]) return (false, "Already migrated");
    if (pointsBalance[user] == 0 && pointsLocked[user] == 0) return (false, "No data to migrate");
    return (true, "Eligible to migrate");
  }
}
