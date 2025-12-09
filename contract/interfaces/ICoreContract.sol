// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title ICoreContract
 * @notice Interface for cross-contract point management in standalone architecture
 * @dev Used by Guild, NFT, and other standalone contracts to read/write points from Core
 */
interface ICoreContract {
  /**
   * @notice Get user's point balance
   * @param user Address to check
   * @return Current point balance
   */
  function pointsBalance(address user) external view returns (uint256);
  
  /**
   * @notice Deduct points from user (requires authorization)
   * @param from Address to deduct from
   * @param amount Amount to deduct
   */
  function deductPoints(address from, uint256 amount) external;
  
  /**
   * @notice Add points to user (requires authorization)
   * @param to Address to add to
   * @param amount Amount to add
   */
  function addPoints(address to, uint256 amount) external;
}
