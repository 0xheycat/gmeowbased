// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IScoringModule
 * @notice Interface for the ScoringModule contract
 */
interface IScoringModule {
    // ============ CORE POINTS ============
    
    function totalScore(address user) external view returns (uint256);
    function addPoints(address user, uint256 amount) external;
    function deductPoints(address user, uint256 amount, string memory reason) external;
    
    // ============ SPECIALIZED POINTS ============
    
    function addGuildPoints(address user, uint256 amount) external;
    function addReferralPoints(address user, uint256 amount) external;
    function addQuestPoints(address user, uint256 amount) external;
    function addViralXP(address user, uint256 amount) external;
    
    // ============ RANK & MULTIPLIERS ============
    
    function userRankTier(address user) external view returns (uint8);
    function applyMultiplier(uint256 baseAmount, uint8 tier) external view returns (uint256);
    
    // ============ EVENTS ============
    
    event PointsAdded(address indexed user, uint256 amount, string source);
    event PointsDeducted(address indexed user, uint256 amount, string reason);
    event RankAdvanced(address indexed user, uint8 newTier, uint256 totalPoints);
}
