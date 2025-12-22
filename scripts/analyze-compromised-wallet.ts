#!/usr/bin/env tsx
/**
 * Compromised Wallet Forensic Analysis
 * 
 * This script analyzes a compromised wallet to understand:
 * 1. What automatic sweeper/malware is installed
 * 2. How it operates (timing, gas strategy, target addresses)
 * 3. Transaction patterns (who's draining, where tokens go)
 * 4. Current state (balances, pending transactions)
 * 
 * Phase: Security Recovery - Forensic Analysis
 * Date: December 21, 2025
 */

import { createPublicClient, http, formatEther, formatUnits, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ========================================
// CONFIGURATION
// ========================================

const COMPROMISED_PRIVATE_KEY = process.env.DRAINED_PRIVKEY as `0x${string}`

const account = privateKeyToAccount(COMPROMISED_PRIVATE_KEY)
const compromisedAddress = account.address

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

console.log(`\n🔍 COMPROMISED WALLET FORENSIC ANALYSIS`)
console.log(`${'='.repeat(60)}`)
console.log(`Address: ${compromisedAddress}`)
console.log(`Chain: Base (Chain ID: 8453)`)
console.log(`Analysis Date: ${new Date().toISOString()}`)
console.log(`${'='.repeat(60)}\n`)

// ========================================
// 1. CURRENT WALLET STATE
// ========================================

async function analyzeCurrentState() {
  console.log(`📊 CURRENT WALLET STATE`)
  console.log(`${'─'.repeat(60)}`)
  
  // Get ETH balance
  const ethBalance = await publicClient.getBalance({ address: compromisedAddress })
  console.log(`💰 Native ETH Balance: ${formatEther(ethBalance)} ETH`)
  
  if (ethBalance === 0n) {
    console.log(`   ⚠️  WARNING: Zero ETH - cannot execute any transactions!`)
    console.log(`   Even if tokens arrive, you can't rescue them without gas`)
  } else if (ethBalance < 1000000000000000n) { // < 0.001 ETH
    console.log(`   ⚠️  WARNING: Very low ETH - may not be enough for rescues`)
  }
  
  // Get transaction count (nonce)
  const nonce = await publicClient.getTransactionCount({ address: compromisedAddress })
  console.log(`📝 Transaction Count: ${nonce} transactions`)
  
  // Check if it's a contract or EOA
  const code = await publicClient.getBytecode({ address: compromisedAddress })
  if (code && code !== '0x') {
    console.log(`⚠️  ADDRESS TYPE: Smart Contract (${code.length} bytes)`)
    console.log(`   This is a contract, not a normal wallet!`)
  } else {
    console.log(`✅ ADDRESS TYPE: Externally Owned Account (EOA)`)
  }
  
  console.log()
}

// ========================================
// 2. RECENT TRANSACTION HISTORY
// ========================================

async function analyzeTransactionHistory() {
  console.log(`📜 TRANSACTION HISTORY (Last 50 transactions)`)
  console.log(`${'─'.repeat(60)}`)
  
  try {
    // Get recent blocks to search
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - 10000n // Last ~10k blocks (~5.5 hours on Base)
    
    // Get all transactions FROM this address
    const sentTxs = await publicClient.getLogs({
      address: undefined,
      fromBlock,
      toBlock: 'latest',
      topics: [
        null,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    // Get all transactions TO this address
    const receivedTxs = await publicClient.getLogs({
      address: undefined,
      fromBlock,
      toBlock: 'latest',
      topics: [
        null,
        null,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    console.log(`📤 Sent Events: ${sentTxs.length}`)
    console.log(`📥 Received Events: ${receivedTxs.length}`)
    
    if (sentTxs.length === 0 && receivedTxs.length === 0) {
      console.log(`\n⚠️  No recent activity in last 10,000 blocks`)
      console.log(`   Wallet may be inactive or not used recently`)
    }
    
    // Analyze sent transactions for patterns
    if (sentTxs.length > 0) {
      console.log(`\n🔍 Analyzing sent transaction patterns...`)
      
      const txHashes = new Set<string>()
      for (const log of sentTxs.slice(0, 20)) {
        txHashes.add(log.transactionHash!)
      }
      
      for (const txHash of Array.from(txHashes).slice(0, 10)) {
        const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` })
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
        
        console.log(`\n   TX: ${txHash}`)
        console.log(`   From: ${tx.from}`)
        console.log(`   To: ${tx.to || 'Contract Creation'}`)
        console.log(`   Value: ${formatEther(tx.value)} ETH`)
        console.log(`   Gas Used: ${receipt.gasUsed} (${formatUnits(receipt.effectiveGasPrice, 9)} gwei)`)
        console.log(`   Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`)
        
        if (tx.from.toLowerCase() === compromisedAddress.toLowerCase()) {
          console.log(`   🚨 SENT BY COMPROMISED WALLET`)
        } else {
          console.log(`   ⚠️  Sent by: ${tx.from} (NOT your wallet)`)
        }
      }
    }
    
    console.log()
  } catch (error: any) {
    console.log(`⚠️  Could not fetch transaction history: ${error.message}`)
    console.log(`   This may require an archive node or block explorer API\n`)
  }
}

// ========================================
// 3. TOKEN TRANSFER ANALYSIS
// ========================================

async function analyzeTokenTransfers() {
  console.log(`🪙 TOKEN TRANSFER ANALYSIS`)
  console.log(`${'─'.repeat(60)}`)
  
  try {
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - 50000n // Last ~50k blocks (~27 hours)
    
    // ERC20 Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    // Tokens received
    const received = await publicClient.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [
        transferTopic,
        null,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    // Tokens sent
    const sent = await publicClient.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [
        transferTopic,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    console.log(`📥 Tokens Received: ${received.length} transfers`)
    console.log(`📤 Tokens Sent: ${sent.length} transfers`)
    
    if (received.length > 0 || sent.length > 0) {
      console.log(`\n🔍 Recent Token Activity (Last 10):`)
      
      // Analyze receive -> send patterns
      const tokenActivity = new Map<string, { received: number, sent: number, sweepTime?: number }>()
      
      for (const log of received) {
        const token = log.address.toLowerCase()
        const current = tokenActivity.get(token) || { received: 0, sent: 0 }
        current.received++
        tokenActivity.set(token, current)
      }
      
      for (const log of sent) {
        const token = log.address.toLowerCase()
        const current = tokenActivity.get(token) || { received: 0, sent: 0 }
        current.sent++
        tokenActivity.set(token, current)
      }
      
      // Show patterns
      for (const [token, activity] of tokenActivity) {
        console.log(`\n   Token: ${token}`)
        console.log(`   Received: ${activity.received} | Sent: ${activity.sent}`)
        
        if (activity.sent > activity.received) {
          console.log(`   ⚠️  MORE SENT THAN RECEIVED (impossible without sweeper)`)
        } else if (activity.sent === activity.received && activity.sent > 0) {
          console.log(`   🚨 PERFECT SWEEP PATTERN (all received tokens sent away)`)
        }
      }
      
      // Analyze timing of sweeps
      if (received.length > 0 && sent.length > 0) {
        console.log(`\n⏱️  SWEEP TIMING ANALYSIS:`)
        
        // Find pairs of receive -> send for same token
        const receiveMap = new Map<string, typeof received[0]>()
        for (const log of received.slice(0, 5)) {
          const key = `${log.address}-${log.blockNumber}`
          receiveMap.set(key, log)
        }
        
        for (const sendLog of sent.slice(0, 5)) {
          const key = `${sendLog.address}-${sendLog.blockNumber}`
          const receiveLog = receiveMap.get(key)
          
          if (receiveLog) {
            const receiveTx = await publicClient.getTransaction({ hash: receiveLog.transactionHash! })
            const sendTx = await publicClient.getTransaction({ hash: sendLog.transactionHash! })
            
            const receiveReceipt = await publicClient.getTransactionReceipt({ hash: receiveLog.transactionHash! })
            const sendReceipt = await publicClient.getTransactionReceipt({ hash: sendLog.transactionHash! })
            
            console.log(`\n   Token: ${sendLog.address}`)
            console.log(`   📥 Received in TX: ${receiveLog.transactionHash}`)
            console.log(`      Block: ${receiveLog.blockNumber} | Index: ${receiveReceipt.transactionIndex}`)
            console.log(`   📤 Sent in TX: ${sendLog.transactionHash}`)
            console.log(`      Block: ${sendLog.blockNumber} | Index: ${sendReceipt.transactionIndex}`)
            
            if (receiveLog.blockNumber === sendLog.blockNumber) {
              console.log(`   🚨 SAME BLOCK SWEEP!`)
              const indexDiff = sendReceipt.transactionIndex - receiveReceipt.transactionIndex
              console.log(`      Transaction index difference: ${indexDiff}`)
              
              if (indexDiff === 1) {
                console.log(`      ⚡ IMMEDIATE NEXT TRANSACTION (highly automated)`)
              }
            } else {
              const blockDiff = Number(sendLog.blockNumber! - receiveLog.blockNumber!)
              console.log(`   ⏱️  Block difference: ${blockDiff} blocks (~${blockDiff * 2} seconds)`)
            }
            
            // Check who executed the sweep
            console.log(`   🤖 Sweep executed by: ${sendTx.from}`)
            if (sendTx.from.toLowerCase() === compromisedAddress.toLowerCase()) {
              console.log(`      ✅ Your wallet (using your private key)`)
            } else {
              console.log(`      ⚠️  EXTERNAL ADDRESS (contract or relayer)`)
            }
          }
        }
      }
    }
    
    console.log()
  } catch (error: any) {
    console.log(`⚠️  Token transfer analysis failed: ${error.message}\n`)
  }
}

// ========================================
// 4. IDENTIFY SWEEPER DESTINATION
// ========================================

async function identifySweeperDestination() {
  console.log(`🎯 SWEEPER DESTINATION ANALYSIS`)
  console.log(`${'─'.repeat(60)}`)
  
  try {
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - 50000n
    
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    // Get all tokens sent FROM this wallet
    const sentTokens = await publicClient.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [
        transferTopic,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    if (sentTokens.length === 0) {
      console.log(`No token transfers found in recent blocks\n`)
      return
    }
    
    // Count destinations
    const destinations = new Map<string, number>()
    
    for (const log of sentTokens) {
      // Decode 'to' address from topics[2]
      const to = '0x' + log.topics[2]!.slice(26)
      destinations.set(to.toLowerCase(), (destinations.get(to.toLowerCase()) || 0) + 1)
    }
    
    // Sort by frequency
    const sorted = Array.from(destinations.entries()).sort((a, b) => b[1] - a[1])
    
    console.log(`🎯 Top Destination Addresses (where your tokens go):`)
    for (const [address, count] of sorted.slice(0, 5)) {
      console.log(`\n   ${address}`)
      console.log(`   Received ${count} token transfers`)
      
      // Check if it's a contract
      const code = await publicClient.getBytecode({ address: address as `0x${string}` })
      if (code && code !== '0x') {
        console.log(`   Type: Smart Contract`)
      } else {
        console.log(`   Type: EOA (Externally Owned Account)`)
      }
      
      // Check balance
      const balance = await publicClient.getBalance({ address: address as `0x${string}` })
      console.log(`   ETH Balance: ${formatEther(balance)} ETH`)
      
      if (count > sentTokens.length * 0.5) {
        console.log(`   🚨 PRIMARY SWEEPER DESTINATION (${Math.round(count/sentTokens.length*100)}% of transfers)`)
      }
    }
    
    console.log()
  } catch (error: any) {
    console.log(`⚠️  Destination analysis failed: ${error.message}\n`)
  }
}

// ========================================
// 5. CURRENT TOKEN BALANCES
// ========================================

async function checkCurrentTokenBalances() {
  console.log(`💰 CURRENT TOKEN BALANCES`)
  console.log(`${'─'.repeat(60)}`)
  
  // Common tokens on Base
  const commonTokens = [
    { name: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6 },
    { name: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 },
    { name: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { name: 'cbETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
    { name: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
  ]
  
  let hasAnyTokens = false
  
  for (const token of commonTokens) {
    try {
      const balance = await publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          inputs: [{ type: 'address' }],
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
        }],
        functionName: 'balanceOf',
        args: [compromisedAddress],
      }) as bigint
      
      if (balance > 0n) {
        console.log(`✅ ${token.name}: ${formatUnits(balance, token.decimals)}`)
        hasAnyTokens = true
      }
    } catch (error) {
      // Token doesn't exist or error reading
    }
  }
  
  if (!hasAnyTokens) {
    console.log(`⚠️  No common token balances found`)
    console.log(`   This is expected if sweeper has already taken everything`)
  }
  
  console.log()
}

// ========================================
// 6. RECOMMENDATIONS
// ========================================

function printRecommendations(analysis: any) {
  console.log(`💡 RECOMMENDATIONS`)
  console.log(`${'─'.repeat(60)}`)
  
  console.log(`\nBased on the analysis:`)
  
  console.log(`\n1. 🛡️  RESCUE STRATEGY:`)
  console.log(`   - Use anti-sweeper-rescue.ts with 5x-10x gas multiplier`)
  console.log(`   - Enable mempool monitoring to get advance warning`)
  console.log(`   - Deploy on VPS for 24/7 monitoring`)
  
  console.log(`\n2. ⚡ GAS OPTIMIZATION:`)
  console.log(`   - Keep 0.01-0.02 ETH in wallet for rescue gas`)
  console.log(`   - Set max gas price to prevent overpaying`)
  console.log(`   - Monitor Base gas prices (usually <1 gwei)`)
  
  console.log(`\n3. 🎯 TIMING:`)
  console.log(`   - If sweeper operates same-block: Use 10x gas`)
  console.log(`   - If sweeper waits 1+ blocks: Use 3x-5x gas`)
  console.log(`   - Mempool detection gives ~2-4 second warning`)
  
  console.log(`\n4. 🔒 LONG-TERM:`)
  console.log(`   - Generate new wallet with fresh keys`)
  console.log(`   - Update all integrations to new address`)
  console.log(`   - Never reuse compromised private key`)
  console.log(`   - Consider multisig for valuable operations`)
  
  console.log(`\n5. 📊 MONITORING:`)
  console.log(`   - Set up Telegram alerts for incoming tokens`)
  console.log(`   - Log all rescue attempts for analysis`)
  console.log(`   - Track success rate (target: >50%)`)
  
  console.log()
}

// ========================================
// MAIN ANALYSIS EXECUTION
// ========================================

async function runFullAnalysis() {
  try {
    await analyzeCurrentState()
    await analyzeTransactionHistory()
    await analyzeTokenTransfers()
    await identifySweeperDestination()
    await checkCurrentTokenBalances()
    
    printRecommendations({})
    
    console.log(`${'='.repeat(60)}`)
    console.log(`Analysis complete!`)
    console.log(`\nNext steps:`)
    console.log(`1. Review the sweeper destination addresses above`)
    console.log(`2. Note the sweep timing (same-block vs. delayed)`)
    console.log(`3. Configure anti-sweeper-rescue.ts with appropriate gas multiplier`)
    console.log(`4. Fund wallet with 0.01 ETH for rescue operations`)
    console.log(`5. Run: npx tsx scripts/anti-sweeper-rescue.ts`)
    console.log(`${'='.repeat(60)}\n`)
    
  } catch (error: any) {
    console.error(`\n❌ Analysis failed:`, error.message)
    console.error(error.stack)
  }
}

// Run analysis
runFullAnalysis()

export { 
  analyzeCurrentState, 
  analyzeTransactionHistory, 
  analyzeTokenTransfers,
  identifySweeperDestination,
  checkCurrentTokenBalances 
}
