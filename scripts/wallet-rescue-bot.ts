#!/usr/bin/env tsx
/**
 * Wallet Rescue Bot - Auto-rescue airdrops from compromised wallet
 * 
 * STRATEGY:
 * 1. Monitor compromised wallet for incoming token transfers
 * 2. When airdrop detected, immediately send it to safe wallet
 * 3. Use flashbots/private mempool to prevent hacker from front-running
 * 4. Requires gas funds in compromised wallet to execute rescue
 * 
 * CRITICAL: This is a race against the hacker's bot. Success depends on:
 * - Faster detection (monitoring mempool + confirmed blocks)
 * - Lower latency RPC endpoint
 * - Higher gas price (willing to pay more)
 * - Using private transactions (Flashbots)
 * 
 * Phase: Security Recovery
 * Date: December 21, 2025
 */

import { createPublicClient, createWalletClient, http, parseEther, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { kv } from '@vercel/kv'

// ========================================
// CONFIGURATION
// ========================================

const COMPROMISED_PRIVATE_KEY = process.env.DRAINED_PRIVKEY as `0x${string}`
const SAFE_WALLET_ADDRESS = process.env.SAFE_WALLET_ADDRESS as `0x${string}` // SET THIS IN .env.local

// Gas strategy
const GAS_BUFFER_MULTIPLIER = 1.5 // Pay 50% more gas to outbid hacker
const MIN_ETH_BALANCE = parseEther('0.001') // Minimum ETH needed in compromised wallet

// Monitoring intervals
const BLOCK_POLL_INTERVAL = 2000 // Check every 2 seconds
const MEMPOOL_POLL_INTERVAL = 1000 // Check mempool every 1 second

// ========================================
// CLIENTS SETUP
// ========================================

const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY)
const compromisedAddress = compromisedAccount.address

console.log(`🔍 Monitoring compromised wallet: ${compromisedAddress}`)
console.log(`🛡️  Safe wallet: ${SAFE_WALLET_ADDRESS}`)

// Use fastest RPC
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
  batch: {
    multicall: true,
  },
})

const walletClient = createWalletClient({
  account: compromisedAccount,
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

// ========================================
// TOKEN RESCUE LOGIC
// ========================================

interface TokenTransfer {
  token: `0x${string}`
  amount: bigint
  decimals: number
  symbol: string
}

/**
 * Rescue token by sending to safe wallet immediately
 */
async function rescueToken(transfer: TokenTransfer): Promise<boolean> {
  try {
    console.log(`🚨 AIRDROP DETECTED: ${formatUnits(transfer.amount, transfer.decimals)} ${transfer.symbol}`)
    console.log(`⚡ Initiating immediate rescue...`)

    // ERC20 transfer ABI
    const transferAbi = [{
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    }] as const

    // Get current gas price and add buffer
    const gasPrice = await publicClient.getGasPrice()
    const priorityGasPrice = (gasPrice * BigInt(Math.floor(GAS_BUFFER_MULTIPLIER * 100))) / 100n

    console.log(`⛽ Gas price: ${formatUnits(priorityGasPrice, 9)} gwei (${GAS_BUFFER_MULTIPLIER}x multiplier)`)

    // Simulate transaction first
    const { request } = await publicClient.simulateContract({
      account: compromisedAccount,
      address: transfer.token,
      abi: transferAbi,
      functionName: 'transfer',
      args: [SAFE_WALLET_ADDRESS, transfer.amount],
      gasPrice: priorityGasPrice,
    })

    // Execute rescue transaction
    const hash = await walletClient.writeContract(request)
    
    console.log(`📤 Rescue transaction sent: ${hash}`)
    console.log(`⏳ Waiting for confirmation...`)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log(`✅ RESCUE SUCCESSFUL! Block: ${receipt.blockNumber}`)
      
      // Store success in cache
      await kv.set(`rescue:${transfer.token}:${Date.now()}`, {
        token: transfer.token,
        amount: transfer.amount.toString(),
        symbol: transfer.symbol,
        txHash: hash,
        block: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString(),
      })

      return true
    } else {
      console.log(`❌ Transaction reverted`)
      return false
    }

  } catch (error: any) {
    console.error(`❌ Rescue failed:`, error.message)
    
    // Store failure for analysis
    await kv.set(`rescue:failed:${transfer.token}:${Date.now()}`, {
      token: transfer.token,
      error: error.message,
      timestamp: new Date().toISOString(),
    })

    return false
  }
}

/**
 * Monitor for incoming token transfers
 */
async function monitorIncomingTokens(fromBlock: bigint) {
  try {
    // ERC20 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

    const logs = await publicClient.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [
        transferTopic,
        null, // from (any address)
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`, // to (our compromised wallet)
      ],
    })

    for (const log of logs) {
      // Skip if already processed
      const processed = await kv.get(`processed:${log.transactionHash}:${log.logIndex}`)
      if (processed) continue

      // Mark as processed
      await kv.set(`processed:${log.transactionHash}:${log.logIndex}`, true, { ex: 86400 }) // 24h TTL

      console.log(`📥 New token transfer detected in tx ${log.transactionHash}`)

      // Get token info
      const tokenAddress = log.address as `0x${string}`
      
      try {
        // Get token decimals and symbol
        const [decimals, symbol, balance] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: [{ name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' }],
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: [{ name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }],
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: [{ name: 'balanceOf', type: 'function', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'balanceOf',
            args: [compromisedAddress],
          }),
        ])

        // Only rescue if we have tokens
        if (balance > 0n) {
          await rescueToken({
            token: tokenAddress,
            amount: balance as bigint,
            decimals: decimals as number,
            symbol: symbol as string,
          })
        }

      } catch (error: any) {
        console.error(`Failed to process token ${tokenAddress}:`, error.message)
      }
    }

  } catch (error: any) {
    console.error(`Error monitoring tokens:`, error.message)
  }
}

/**
 * Check if compromised wallet has enough ETH for gas
 */
async function checkGasBalance(): Promise<boolean> {
  const balance = await publicClient.getBalance({ address: compromisedAddress })
  
  if (balance < MIN_ETH_BALANCE) {
    console.warn(`⚠️  WARNING: Low ETH balance (${formatUnits(balance, 18)} ETH)`)
    console.warn(`   Need at least ${formatUnits(MIN_ETH_BALANCE, 18)} ETH for rescue transactions`)
    console.warn(`   Send ETH to ${compromisedAddress} to enable rescue`)
    return false
  }

  return true
}

/**
 * Main monitoring loop
 */
async function startMonitoring() {
  console.log(`\n🤖 Wallet Rescue Bot Started`)
  console.log(`================================================`)
  
  // Validate configuration
  if (!COMPROMISED_PRIVATE_KEY) {
    throw new Error('DRAINED_PRIVKEY not set in .env.local')
  }
  if (!SAFE_WALLET_ADDRESS) {
    throw new Error('SAFE_WALLET_ADDRESS not set in .env.local - add your new wallet address')
  }

  // Check gas balance
  await checkGasBalance()

  // Get current block
  let lastBlock = await publicClient.getBlockNumber()
  console.log(`📊 Starting from block: ${lastBlock}`)

  // Monitor loop
  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber()
      
      if (currentBlock > lastBlock) {
        console.log(`🔍 Scanning blocks ${lastBlock + 1n} to ${currentBlock}...`)
        
        // Check for new token transfers
        await monitorIncomingTokens(lastBlock + 1n)
        
        // Update last processed block
        lastBlock = currentBlock
      }

      // Periodically check gas balance
      if (Math.random() < 0.1) { // 10% chance each interval
        await checkGasBalance()
      }

    } catch (error: any) {
      console.error(`Error in monitoring loop:`, error.message)
    }
  }, BLOCK_POLL_INTERVAL)

  console.log(`\n✅ Monitoring active - will auto-rescue any incoming tokens`)
  console.log(`⚡ Press Ctrl+C to stop\n`)
}

// ========================================
// STARTUP
// ========================================

if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { rescueToken, monitorIncomingTokens }
