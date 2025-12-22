#!/usr/bin/env tsx
/**
 * Anti-Sweeper Rescue Bot - Same-Block Token Rescue
 * 
 * PROBLEM: Compromised wallet (0x5568d637aEfE29D939a724f64e0515B238353Bfb)
 * is an EIP-7702 proxy to CrimeEnjoyor contract that auto-sweeps ETH.
 * 
 * ANALYSIS RESULTS:
 * - Contract Type: EIP-7702 Proxy to CrimeEnjoyor
 * - Hacker Destination: 0x55b11842F7B259A1B7613EAb5B9147Fe3F936B49
 * - Auto-Sweep: ETH ONLY (via receive() function)
 * - ERC-20 Tokens: NOT auto-swept by contract!
 * 
 * GOOD NEWS: You can rescue ERC-20 tokens because the CrimeEnjoyor
 * contract only sweeps ETH, not ERC-20 tokens. The contract has no
 * ERC20 transfer logic.
 * 
 * SOLUTION: Monitor for incoming ERC-20 tokens and immediately transfer
 * them to your safe wallet with high gas priority.
 * 
 * Phase: Security Recovery - Anti-Sweeper
 * Date: December 21, 2025
 */

import { createPublicClient, createWalletClient, http, parseEther, formatUnits, encodeFunctionData } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ========================================
// CONFIGURATION
// ========================================

const COMPROMISED_PRIVATE_KEY = process.env.DRAINED_PRIVKEY as `0x${string}`
const SAFE_WALLET_ADDRESS = process.env.SAFE_WALLET_ADDRESS as `0x${string}`

// Aggressive gas strategy - CRITICAL for beating sweeper
const GAS_PRIORITY_MULTIPLIER = 5.0 // Pay 5x current gas (very aggressive)
const MAX_GAS_PRICE = parseEther('0.001') // 1000 gwei max (emergency situations)

// Ultra-fast polling for mempool
const MEMPOOL_POLL_MS = 200 // Check every 200ms
const BLOCK_POLL_MS = 500 // Check blocks every 500ms

// ========================================
// SETUP
// ========================================

const account = privateKeyToAccount(COMPROMISED_PRIVATE_KEY)
const compromisedAddress = account.address

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
  pollingInterval: BLOCK_POLL_MS,
})

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

console.log(`🛡️  Anti-Sweeper Rescue Bot`)
console.log(`   Compromised: ${compromisedAddress}`)
console.log(`   Safe Wallet: ${SAFE_WALLET_ADDRESS}`)
console.log(`   Gas Strategy: ${GAS_PRIORITY_MULTIPLIER}x (ULTRA AGGRESSIVE)\n`)

// ========================================
// MEMPOOL MONITORING (KEY TECHNIQUE)
// ========================================

/**
 * Monitor mempool for PENDING transactions that will send tokens to us
 * This gives us advance warning BEFORE the transaction is mined
 */
async function monitorMempool() {
  try {
    // Get pending transactions from mempool
    const pendingBlock = await publicClient.getBlock({ 
      blockTag: 'pending',
      includeTransactions: true 
    })

    if (!pendingBlock.transactions || pendingBlock.transactions.length === 0) {
      return
    }

    for (const tx of pendingBlock.transactions) {
      if (typeof tx === 'string') continue // Skip if only hash returned

      // Check if transaction is sending tokens TO our compromised wallet
      const txData = tx as any
      
      // ERC20 transfer to our address
      if (txData.to && txData.input && txData.input.startsWith('0xa9059cbb')) {
        // Decode transfer(address to, uint256 amount)
        const recipient = '0x' + txData.input.slice(34, 74)
        
        if (recipient.toLowerCase() === compromisedAddress.toLowerCase()) {
          console.log(`\n🚨 MEMPOOL ALERT: Incoming token transfer detected!`)
          console.log(`   Token: ${txData.to}`)
          console.log(`   TX Hash: ${txData.hash}`)
          console.log(`   ⚡ Preparing instant rescue...`)
          
          // Immediately prepare rescue transaction with MUCH higher gas
          await prepareInstantRescue(txData.to as `0x${string}`, txData.hash as `0x${string}`)
        }
      }
    }
  } catch (error: any) {
    // Mempool monitoring may not be supported on all RPCs
    if (!error.message.includes('pending')) {
      console.error('Mempool monitor error:', error.message)
    }
  }
}

/**
 * Prepare rescue transaction to execute THE MOMENT the airdrop is confirmed
 */
async function prepareInstantRescue(tokenAddress: `0x${string}`, incomingTxHash: `0x${string}`) {
  try {
    // Get current gas price
    const currentGas = await publicClient.getGasPrice()
    const rescueGas = (currentGas * BigInt(Math.floor(GAS_PRIORITY_MULTIPLIER * 100))) / 100n
    
    console.log(`   Current gas: ${formatUnits(currentGas, 9)} gwei`)
    console.log(`   Rescue gas: ${formatUnits(rescueGas, 9)} gwei (${GAS_PRIORITY_MULTIPLIER}x)`)
    
    // Wait for the incoming transaction to be mined
    console.log(`   ⏳ Waiting for airdrop tx to confirm...`)
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: incomingTxHash,
      pollingInterval: 100, // Check every 100ms
    })
    
    if (receipt.status !== 'success') {
      console.log(`   ❌ Airdrop transaction failed`)
      return
    }
    
    console.log(`   ✅ Airdrop confirmed in block ${receipt.blockNumber}`)
    console.log(`   🚀 EXECUTING IMMEDIATE RESCUE...`)
    
    // Get our token balance NOW
    const balance = await publicClient.readContract({
      address: tokenAddress,
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
    
    if (balance === 0n) {
      console.log(`   ⚠️  No balance - sweeper may have already taken it`)
      return
    }
    
    // IMMEDIATELY send to safe wallet with maximum gas
    const transferData = encodeFunctionData({
      abi: [{
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
      }],
      functionName: 'transfer',
      args: [SAFE_WALLET_ADDRESS, balance],
    })
    
    // Submit with ultra-high gas to get in NEXT block immediately
    const hash = await walletClient.sendTransaction({
      to: tokenAddress,
      data: transferData,
      gas: 100000n,
      gasPrice: rescueGas,
    })
    
    console.log(`   📤 Rescue TX: ${hash}`)
    console.log(`   ⏳ Waiting for confirmation...`)
    
    const rescueReceipt = await publicClient.waitForTransactionReceipt({ hash })
    
    if (rescueReceipt.status === 'success') {
      console.log(`   ✅✅✅ RESCUE SUCCESSFUL! Block ${rescueReceipt.blockNumber}`)
      console.log(`   🎉 Tokens saved to ${SAFE_WALLET_ADDRESS}\n`)
    } else {
      console.log(`   ❌ Rescue transaction failed (sweeper was faster)\n`)
    }
    
  } catch (error: any) {
    console.error(`   ❌ Rescue failed:`, error.message)
  }
}

// ========================================
// ALTERNATIVE: SAME-BLOCK BUNDLE TECHNIQUE
// ========================================

/**
 * For chains with flashbots/MEV infrastructure:
 * Submit transactions as atomic bundle that MUST execute together
 */
async function submitAtomicBundle(tokenAddress: `0x${string}`, amount: bigint) {
  console.log(`\n💎 Attempting atomic bundle rescue...`)
  
  try {
    // Create bundle of transactions:
    // TX 1: Wait for airdrop to arrive (simulated)
    // TX 2: Immediately transfer to safe wallet
    
    // This requires flashbots-provider or similar
    // For Base, you would use Base's MEV infrastructure
    
    console.log(`   ⚠️  Flashbots/MEV bundles not yet implemented for Base`)
    console.log(`   Falling back to high-gas strategy`)
    
    return false
  } catch (error: any) {
    console.error(`Bundle failed:`, error.message)
    return false
  }
}

// ========================================
// BLOCK MONITORING (CONFIRMED TRANSFERS)
// ========================================

async function monitorConfirmedTransfers(fromBlock: bigint) {
  try {
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    const logs = await publicClient.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [
        transferTopic,
        null,
        `0x000000000000000000000000${compromisedAddress.slice(2).toLowerCase()}`,
      ],
    })
    
    for (const log of logs) {
      const tokenAddress = log.address
      const txHash = log.transactionHash
      
      console.log(`\n📥 Confirmed transfer detected`)
      console.log(`   Token: ${tokenAddress}`)
      console.log(`   TX: ${txHash}`)
      console.log(`   ⚠️  Already mined - attempting rescue anyway...`)
      
      // Try to rescue even if already confirmed
      // (sweeper might not have executed yet)
      await prepareInstantRescue(tokenAddress, txHash)
    }
  } catch (error: any) {
    console.error('Block monitor error:', error.message)
  }
}

// ========================================
// MAIN MONITORING LOOP
// ========================================

async function startAntiSweeperBot() {
  console.log(`\n⚡ Starting Anti-Sweeper Bot...`)
  console.log(`   Strategy: Mempool monitoring + Ultra-high gas`)
  console.log(`   Target: Beat automatic sweeper to rescue tokens\n`)
  
  // Check gas balance
  const ethBalance = await publicClient.getBalance({ address: compromisedAddress })
  console.log(`💰 ETH Balance: ${formatUnits(ethBalance, 18)} ETH`)
  
  if (ethBalance < parseEther('0.005')) {
    console.log(`⚠️  WARNING: Low ETH balance!`)
    console.log(`   Send at least 0.01 ETH to ${compromisedAddress}`)
    console.log(`   This is needed for gas to rescue tokens\n`)
  }
  
  let lastBlock = await publicClient.getBlockNumber()
  
  // Dual monitoring: Mempool + Confirmed blocks
  setInterval(async () => {
    try {
      // Monitor mempool for pending transactions
      await monitorMempool()
      
      // Monitor confirmed blocks
      const currentBlock = await publicClient.getBlockNumber()
      if (currentBlock > lastBlock) {
        await monitorConfirmedTransfers(lastBlock + 1n)
        lastBlock = currentBlock
      }
    } catch (error: any) {
      console.error('Monitor loop error:', error.message)
    }
  }, MEMPOOL_POLL_MS)
  
  console.log(`✅ Anti-Sweeper Bot is running!`)
  console.log(`   Monitoring both mempool and confirmed blocks`)
  console.log(`   Will auto-rescue with ${GAS_PRIORITY_MULTIPLIER}x gas priority`)
  console.log(`   Press Ctrl+C to stop\n`)
}

// ========================================
// STARTUP
// ========================================

if (require.main === module) {
  startAntiSweeperBot().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { prepareInstantRescue, monitorMempool, submitAtomicBundle }
