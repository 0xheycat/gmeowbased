/**
 * Oracle Wallet Configuration
 * 
 * The oracle wallet is used to deposit pending rewards to user contract balances.
 * 
 * SECURITY:
 * - Private key stored in secure environment (AWS Secrets Manager in production)
 * - Rate limiting on claim endpoint prevents abuse
 * - Automatic balance monitoring and alerts
 * - Automatic refill when balance drops below threshold
 * 
 * ORACLE WALLET:
 * Address: 0x8870C155666809609176260F2B65a626C000D773
 * Network: Base Mainnet
 * Purpose: Deposit pending rewards to user balances
 * 
 * Created: December 19, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

// Oracle wallet address (public)
export const ORACLE_WALLET_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773'

// Oracle private key (from environment - DO NOT COMMIT!)
export const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY

// Minimum oracle balance before auto-refill (in points)
export const MIN_ORACLE_BALANCE = BigInt(1_000_000) // 1M points

// Alert threshold (send notification when balance drops below)
export const ORACLE_BALANCE_ALERT_THRESHOLD = BigInt(500_000) // 500K points

/**
 * Check if oracle wallet needs refill
 * 
 * @param currentBalance - Current oracle balance in points
 * @returns True if refill needed
 */
export function needsOracleRefill(currentBalance: bigint): boolean {
  return currentBalance < MIN_ORACLE_BALANCE
}

/**
 * Check if oracle balance alert should be sent
 * 
 * @param currentBalance - Current oracle balance in points
 * @returns True if alert needed
 */
export function shouldAlertOracleBalance(currentBalance: bigint): boolean {
  return currentBalance < ORACLE_BALANCE_ALERT_THRESHOLD
}
