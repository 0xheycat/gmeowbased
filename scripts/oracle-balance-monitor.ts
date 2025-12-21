/**
 * Oracle Balance Monitoring Script
 * 
 * Checks oracle wallet balance and sends alerts when low
 * Run via cron: every 5 minutes
 * 
 * Created: December 20, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { createClient } from '@supabase/supabase-js'

const GMEOW_CORE_ADDRESS = (process.env.NEXT_PUBLIC_GM_BASE_CORE || '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73') as `0x${string}`
const ORACLE_WALLET_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`

const MIN_ORACLE_BALANCE = BigInt(1_000_000) // 1M points
const ALERT_THRESHOLD = BigInt(500_000) // 500K points
const CRITICAL_THRESHOLD = BigInt(100_000) // 100K points

const GMEOW_CORE_ABI = [
  {
    name: 'pointsBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

interface BalanceAlert {
  level: 'info' | 'warning' | 'critical'
  balance: bigint
  threshold: bigint
  message: string
  timestamp: string
}

/**
 * Check oracle balance and return alert if needed
 */
async function checkOracleBalance(): Promise<BalanceAlert | null> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'),
  })
  
  const balance = await publicClient.readContract({
    address: GMEOW_CORE_ADDRESS,
    abi: GMEOW_CORE_ABI,
    functionName: 'pointsBalance',
    args: [ORACLE_WALLET_ADDRESS],
  }) as bigint
  
  const timestamp = new Date().toISOString()
  
  // Critical: Balance very low
  if (balance < CRITICAL_THRESHOLD) {
    return {
      level: 'critical',
      balance,
      threshold: CRITICAL_THRESHOLD,
      message: `🚨 CRITICAL: Oracle balance critically low (${balance.toString()} < ${CRITICAL_THRESHOLD.toString()})`,
      timestamp,
    }
  }
  
  // Warning: Balance low
  if (balance < ALERT_THRESHOLD) {
    return {
      level: 'warning',
      balance,
      threshold: ALERT_THRESHOLD,
      message: `⚠️ WARNING: Oracle balance low (${balance.toString()} < ${ALERT_THRESHOLD.toString()})`,
      timestamp,
    }
  }
  
  // Info: Balance below ideal but not urgent
  if (balance < MIN_ORACLE_BALANCE) {
    return {
      level: 'info',
      balance,
      threshold: MIN_ORACLE_BALANCE,
      message: `ℹ️ INFO: Oracle balance below ideal (${balance.toString()} < ${MIN_ORACLE_BALANCE.toString()})`,
      timestamp,
    }
  }
  
  return null
}

/**
 * Log alert to database
 */
async function logAlert(alert: BalanceAlert): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  await supabase.from('bot_metrics').insert({
    metric_name: 'oracle_balance_alert',
    metric_value: alert.balance.toString(),
    metadata: {
      level: alert.level,
      threshold: alert.threshold.toString(),
      message: alert.message,
    },
    recorded_at: alert.timestamp,
  })
}

/**
 * Send Discord webhook notification
 */
async function sendDiscordAlert(alert: BalanceAlert): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.log('[Oracle Monitor] No Discord webhook configured')
    return
  }
  
  const color = alert.level === 'critical' ? 0xFF0000 
    : alert.level === 'warning' ? 0xFFA500 
    : 0x0099FF
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `Oracle Balance Alert (${alert.level.toUpperCase()})`,
        description: alert.message,
        color,
        fields: [
          {
            name: 'Current Balance',
            value: `${alert.balance.toLocaleString()} points`,
            inline: true,
          },
          {
            name: 'Threshold',
            value: `${alert.threshold.toLocaleString()} points`,
            inline: true,
          },
          {
            name: 'Oracle Wallet',
            value: ORACLE_WALLET_ADDRESS,
            inline: false,
          },
        ],
        timestamp: alert.timestamp,
        footer: {
          text: 'Gmeow Oracle Monitor',
        },
      }],
    }),
  })
}

/**
 * Main monitoring function
 */
export async function monitorOracleBalance(): Promise<void> {
  try {
    const alert = await checkOracleBalance()
    
    if (alert) {
      console.log(alert.message)
      
      // Log to database
      await logAlert(alert)
      
      // Send Discord notification for warnings and critical
      if (alert.level !== 'info') {
        await sendDiscordAlert(alert)
      }
    } else {
      console.log('[Oracle Monitor] ✓ Balance healthy')
    }
  } catch (error) {
    console.error('[Oracle Monitor] Error:', error)
  }
}

// If run directly (not imported)
if (require.main === module) {
  monitorOracleBalance().then(() => {
    console.log('[Oracle Monitor] Check complete')
    process.exit(0)
  }).catch((error) => {
    console.error('[Oracle Monitor] Fatal error:', error)
    process.exit(1)
  })
}
