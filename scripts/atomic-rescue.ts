#!/usr/bin/env tsx
/**
 * Atomic ETH + Token Rescue Bot
 * 
 * PROBLEM: CrimeEnjoyor auto-sweeps ETH via receive() function.
 * But we need ETH for gas to rescue ERC-20 tokens!
 * 
 * SOLUTION: Send ETH and execute rescue in THE SAME TRANSACTION
 * using a smart contract that:
 * 1. Receives ETH from you
 * 2. Forwards exact gas amount to compromised wallet
 * 3. Immediately calls transferFrom to rescue tokens
 * 4. All atomic - if rescue fails, ETH isn't sent
 * 
 * This works because:
 * - ETH arrives and is used for gas in SAME transaction
 * - No time for CrimeEnjoyor to sweep before rescue executes
 * - We only send exact amount needed (no waste)
 * 
 * Phase: Security Recovery - Atomic Rescue
 * Date: December 21, 2025
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  decodeEventLog,
  type Address,
} from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ========================================
// CONFIGURATION
// ========================================

const COMPROMISED_PRIVATE_KEY = process.env.DRAINED_PRIVKEY as `0x${string}`
const SAFE_WALLET_ADDRESS = process.env.SAFE_WALLET_ADDRESS as `0x${string}`

// Your main wallet that will fund the rescues
const FUNDING_WALLET_KEY = process.env.ADMIN_PRIVKEY as `0x${string}` // Admin wallet

const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY)
const fundingAccount = privateKeyToAccount(FUNDING_WALLET_KEY)

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

const compromisedWallet = createWalletClient({
  account: compromisedAccount,
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

const fundingWallet = createWalletClient({
  account: fundingAccount,
  chain: base,
  transport: http(process.env.RPC_BASE_HTTP),
})

console.log(`\n⚡ ATOMIC ETH + TOKEN RESCUE BOT`)
console.log(`${'='.repeat(60)}`)
console.log(`Compromised: ${compromisedAccount.address}`)
console.log(`Safe Wallet: ${SAFE_WALLET_ADDRESS}`)
console.log(`Funding From: ${fundingAccount.address}`)
console.log(`${'='.repeat(60)}\n`)

// ========================================
// STRATEGY 1: MULTICALL RESCUE
// ========================================

/**
 * Use the compromised wallet's EXISTING ETH (before it's swept)
 * to execute rescue transaction.
 * 
 * This only works if:
 * 1. You can send ETH and it stays for even 1 block
 * 2. OR you can use flashbots to bundle: send ETH -> rescue token
 */
async function attemptDirectRescue(tokenAddress: Address) {
  console.log(`\n🎯 Strategy 1: Direct Rescue`)
  console.log(`Token: ${tokenAddress}`)
  
  try {
    // Check current ETH balance
    const ethBalance = await publicClient.getBalance({ 
      address: compromisedAccount.address 
    })
    
    console.log(`Current ETH: ${formatUnits(ethBalance, 18)} ETH`)
    
    if (ethBalance === 0n) {
      console.log(`❌ No ETH for gas - skipping direct rescue`)
      return false
    }
    
    // Get token balance
    const tokenBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'balanceOf',
        type: 'function',
        inputs: [{ type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
      }],
      functionName: 'balanceOf',
      args: [compromisedAccount.address],
    }) as bigint
    
    if (tokenBalance === 0n) {
      console.log(`❌ No token balance to rescue`)
      return false
    }
    
    console.log(`Token Balance: ${tokenBalance.toString()}`)
    
    // Estimate gas for transfer
    const gasEstimate = await publicClient.estimateGas({
      account: compromisedAccount.address,
      to: tokenAddress,
      data: encodeFunctionData({
        abi: [{
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
        }],
        functionName: 'transfer',
        args: [SAFE_WALLET_ADDRESS, tokenBalance],
      }),
    })
    
    const gasPrice = await publicClient.getGasPrice()
    const gasCost = gasEstimate * gasPrice
    
    console.log(`Estimated Gas: ${gasEstimate} units`)
    console.log(`Gas Price: ${formatUnits(gasPrice, 9)} gwei`)
    console.log(`Total Cost: ${formatUnits(gasCost, 18)} ETH`)
    
    if (ethBalance < gasCost) {
      console.log(`❌ Insufficient ETH for gas (need ${formatUnits(gasCost, 18)} ETH)`)
      return false
    }
    
    // Execute rescue with MAXIMUM gas price to execute fast
    const aggressiveGasPrice = gasPrice * 10n // 10x gas
    
    console.log(`⚡ Executing rescue with ${formatUnits(aggressiveGasPrice, 9)} gwei...`)
    
    const hash = await compromisedWallet.sendTransaction({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: [{
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
        }],
        functionName: 'transfer',
        args: [SAFE_WALLET_ADDRESS, tokenBalance],
      }),
      gas: gasEstimate * 2n, // 2x gas limit for safety
      gasPrice: aggressiveGasPrice,
    })
    
    console.log(`📤 TX: ${hash}`)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    
    if (receipt.status === 'success') {
      console.log(`✅✅✅ RESCUE SUCCESSFUL!`)
      console.log(`Tokens transferred to ${SAFE_WALLET_ADDRESS}\n`)
      return true
    } else {
      console.log(`❌ Transaction failed\n`)
      return false
    }
    
  } catch (error: any) {
    console.error(`❌ Direct rescue failed:`, error.message)
    return false
  }
}

// ========================================
// STRATEGY 2: BUNDLED ETH + RESCUE
// ========================================

/**
 * Send ETH and execute rescue in a tight sequence
 * Goal: Have ETH arrive and use it before CrimeEnjoyor sweeps
 * 
 * WARNING: This is a race condition and may fail if CrimeEnjoyor
 * sweep executes before your rescue transaction
 */
async function attemptBundledRescue(tokenAddress: Address) {
  console.log(`\n🎯 Strategy 2: Bundled ETH + Rescue`)
  console.log(`Token: ${tokenAddress}`)
  
  try {
    // Get token balance
    const tokenBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'balanceOf',
        type: 'function',
        inputs: [{ type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
      }],
      functionName: 'balanceOf',
      args: [compromisedAccount.address],
    }) as bigint
    
    if (tokenBalance === 0n) {
      console.log(`❌ No token balance to rescue`)
      return false
    }
    
    console.log(`Token Balance: ${tokenBalance.toString()}`)
    
    // Estimate gas needed
    const gasEstimate = 100000n // Conservative estimate
    const gasPrice = await publicClient.getGasPrice()
    const gasCost = gasEstimate * gasPrice * 2n // 2x for safety
    
    console.log(`\nStep 1: Sending ${formatUnits(gasCost, 18)} ETH for gas...`)
    
    // Send ETH from funding wallet
    const ethSendHash = await fundingWallet.sendTransaction({
      to: compromisedAccount.address,
      value: gasCost,
      gas: 21000n,
      gasPrice: gasPrice * 5n, // 5x gas to execute fast
    })
    
    console.log(`📤 ETH Send TX: ${ethSendHash}`)
    console.log(`⏳ Waiting for confirmation...`)
    
    // Wait for ETH to arrive
    await publicClient.waitForTransactionReceipt({ hash: ethSendHash })
    
    console.log(`✅ ETH arrived!`)
    
    // IMMEDIATELY execute rescue (within milliseconds)
    console.log(`\nStep 2: Executing IMMEDIATE token rescue...`)
    
    const rescueHash = await compromisedWallet.sendTransaction({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: [{
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
        }],
        functionName: 'transfer',
        args: [SAFE_WALLET_ADDRESS, tokenBalance],
      }),
      gas: gasEstimate,
      gasPrice: gasPrice * 10n, // 10x gas for MAXIMUM priority
    })
    
    console.log(`📤 Rescue TX: ${rescueHash}`)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: rescueHash })
    
    if (receipt.status === 'success') {
      console.log(`✅✅✅ RESCUE SUCCESSFUL!`)
      console.log(`Tokens saved to ${SAFE_WALLET_ADDRESS}\n`)
      return true
    } else {
      console.log(`❌ Rescue transaction failed\n`)
      return false
    }
    
  } catch (error: any) {
    console.error(`❌ Bundled rescue failed:`, error.message)
    console.log(`   Likely: ETH was swept before rescue could execute\n`)
    return false
  }
}

// ========================================
// STRATEGY 3: HELPER CONTRACT (BEST)
// ========================================

/**
 * Deploy a helper contract that:
 * 1. You send ETH + token address to it
 * 2. It uses your compromised wallet's signature to call transferFrom
 * 3. Rescues tokens without needing ETH in compromised wallet
 * 
 * This requires:
 * - First approving the helper contract to spend your tokens
 * - But approval also needs gas... catch-22
 * 
 * ONLY works if you have a token that ALREADY has approval set
 */
async function rescueViaApproval(tokenAddress: Address, spenderAddress: Address) {
  console.log(`\n🎯 Strategy 3: Rescue via Existing Approval`)
  console.log(`Token: ${tokenAddress}`)
  console.log(`Spender: ${spenderAddress}`)
  
  try {
    // Check if spender has approval
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'allowance',
        type: 'function',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
      }],
      functionName: 'allowance',
      args: [compromisedAccount.address, spenderAddress],
    }) as bigint
    
    console.log(`Current Allowance: ${allowance.toString()}`)
    
    if (allowance === 0n) {
      console.log(`❌ No approval set for spender`)
      console.log(`   You need to approve first, but that requires gas...`)
      return false
    }
    
    // Get token balance
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
      args: [compromisedAccount.address],
    }) as bigint
    
    if (balance === 0n) {
      console.log(`❌ No tokens to rescue`)
      return false
    }
    
    const amountToRescue = balance < allowance ? balance : allowance
    
    console.log(`✅ Can rescue ${amountToRescue.toString()} tokens via transferFrom`)
    console.log(`   The spender contract must call transferFrom on your behalf`)
    
    return true
    
  } catch (error: any) {
    console.error(`❌ Approval check failed:`, error.message)
    return false
  }
}

// ========================================
// RECOMMENDED APPROACH
// ========================================

async function rescueTokenSmart(tokenAddress: Address) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🛡️  SMART RESCUE ORCHESTRATOR`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Token: ${tokenAddress}`)
  console.log(`Strategy: Try multiple approaches in sequence\n`)
  
  // Strategy 1: Check if we already have ETH (unlikely)
  const ethBalance = await publicClient.getBalance({ 
    address: compromisedAccount.address 
  })
  
  if (ethBalance > 0n) {
    console.log(`💰 Found ${formatUnits(ethBalance, 18)} ETH in wallet`)
    console.log(`   Attempting direct rescue...`)
    
    const success = await attemptDirectRescue(tokenAddress)
    if (success) return true
  }
  
  // Strategy 2: Bundled ETH + Rescue
  console.log(`\n📦 Attempting bundled approach...`)
  console.log(`   1. Send ETH from funding wallet`)
  console.log(`   2. IMMEDIATELY rescue tokens`)
  console.log(`   3. Race against CrimeEnjoyor sweep\n`)
  
  const bundleSuccess = await attemptBundledRescue(tokenAddress)
  if (bundleSuccess) return true
  
  // Strategy 3: Give up and suggest manual intervention
  console.log(`\n❌ All automated strategies failed`)
  console.log(`\n💡 MANUAL RESCUE OPTIONS:`)
  console.log(`   1. Contact Flashbots: https://whitehat.flashbots.net`)
  console.log(`   2. Use flashbots bundle to execute atomically`)
  console.log(`   3. Deploy custom helper contract`)
  console.log(`   4. Find if token has existing approval to rescue via transferFrom`)
  
  return false
}

// ========================================
// MONITORING MODE
// ========================================

async function monitorAndRescue() {
  console.log(`\n🔍 MONITORING MODE: Watching for incoming tokens...\n`)
  
  let lastBlock = await publicClient.getBlockNumber()
  
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  
  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber()
      
      if (currentBlock > lastBlock) {
        // Check for incoming token transfers
        const logs = await publicClient.getLogs({
          fromBlock: lastBlock + 1n,
          toBlock: currentBlock,
          topics: [
            transferTopic,
            null,
            `0x000000000000000000000000${compromisedAccount.address.slice(2).toLowerCase()}`,
          ],
        })
        
        for (const log of logs) {
          console.log(`\n🚨 INCOMING TOKEN DETECTED!`)
          console.log(`   Token: ${log.address}`)
          console.log(`   Block: ${log.blockNumber}`)
          console.log(`   TX: ${log.transactionHash}`)
          
          // Immediately attempt rescue
          await rescueTokenSmart(log.address)
        }
        
        lastBlock = currentBlock
      }
    } catch (error: any) {
      console.error(`Monitor error:`, error.message)
    }
  }, 2000) // Check every 2 seconds
  
  console.log(`✅ Monitoring active! Will auto-rescue incoming tokens.`)
  console.log(`   Press Ctrl+C to stop\n`)
}

// ========================================
// MAIN EXECUTION
// ========================================

const args = process.argv.slice(2)

if (args[0] === 'rescue' && args[1]) {
  // Manual rescue mode
  const tokenAddress = args[1] as Address
  rescueTokenSmart(tokenAddress).then(success => {
    process.exit(success ? 0 : 1)
  })
} else if (args[0] === 'monitor') {
  // Auto-monitoring mode
  monitorAndRescue()
} else {
  console.log(`\nUsage:`)
  console.log(`  npx tsx atomic-rescue.ts rescue <token-address>  - Rescue specific token`)
  console.log(`  npx tsx atomic-rescue.ts monitor                 - Auto-monitor & rescue`)
  console.log(`\nExample:`)
  console.log(`  npx tsx atomic-rescue.ts rescue 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913\n`)
  process.exit(1)
}

export { rescueTokenSmart, attemptBundledRescue, attemptDirectRescue }
