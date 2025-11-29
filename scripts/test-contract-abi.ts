/**
 * Test script to verify which GM function exists on deployed contracts
 * Run: npx tsx scripts/test-contract-abi.ts
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { base, optimism } from 'viem/chains'

const BASE_CORE = '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92'
const OP_CORE = '0x1599e491FaA2F22AA053dD9304308231c0F0E15B'

async function testContract(chainName: string, chainConfig: any, address: `0x${string}`) {
  console.log(`\n=== Testing ${chainName} Contract: ${address} ===`)
  
  const client = createPublicClient({
    chain: chainConfig,
    transport: http()
  })

  // Check if contract exists
  try {
    const code = await client.getCode({ address })
    if (!code || code === '0x') {
      console.log('❌ No contract code found')
      return
    }
    console.log('✅ Contract exists')
  } catch (e) {
    console.log('❌ Failed to get contract code:', e)
    return
  }

  // Test sendGM()
  console.log('\nTesting sendGM():')
  try {
    const abi = parseAbi(['function sendGM()'])
    await client.readContract({
      address,
      abi,
      functionName: 'sendGM',
    })
    console.log('✅ sendGM() callable (no revert)')
  } catch (e: any) {
    if (e.message?.includes('reverted') || e.message?.includes('cooldown') || e.message?.includes('paused')) {
      console.log('✅ sendGM() EXISTS (reverted with valid error)')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else if (e.message?.includes('does not exist') || e.message?.includes('not found') || e.message?.includes('signature')) {
      console.log('❌ sendGM() NOT FOUND')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else {
      console.log('⚠️  sendGM() unknown error:', e.shortMessage || e.message.split('\n')[0])
    }
  }

  // Test postGM(string)
  console.log('\nTesting postGM(string):')
  try {
    const abi = parseAbi(['function postGM(string message)'])
    await client.simulateContract({
      address,
      abi,
      functionName: 'postGM',
      args: ['test'],
      account: '0x0000000000000000000000000000000000000001'
    })
    console.log('✅ postGM(string) callable')
  } catch (e: any) {
    if (e.message?.includes('reverted') || e.message?.includes('cooldown') || e.message?.includes('paused')) {
      console.log('✅ postGM(string) EXISTS (reverted with valid error)')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else if (e.message?.includes('does not exist') || e.message?.includes('not found') || e.message?.includes('signature')) {
      console.log('❌ postGM(string) NOT FOUND')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else {
      console.log('⚠️  postGM(string) unknown error:', e.shortMessage || e.message.split('\n')[0])
    }
  }

  // Test getUserStats(address)
  console.log('\nTesting getUserStats(address):')
  try {
    const abi = parseAbi(['function getUserStats(address user) view returns (uint256, uint256, uint256)'])
    const result = await client.readContract({
      address,
      abi,
      functionName: 'getUserStats',
      args: ['0x0000000000000000000000000000000000000001']
    })
    console.log('✅ getUserStats() works, returns:', result)
  } catch (e: any) {
    console.log('❌ getUserStats() failed:', e.shortMessage || e.message.split('\n')[0])
  }
}

async function main() {
  console.log('🔍 Checking deployed Gmeow contracts...\n')
  
  await testContract('Base', base, BASE_CORE)
  await testContract('Optimism', optimism, OP_CORE)
  
  console.log('\n\n📋 Summary:')
  console.log('If sendGM() exists → Use new proxy ABI ✅')
  console.log('If postGM(string) exists → Use old monolithic ABI ⚠️')
  console.log('\nCheck Basescan manually:')
  console.log(`- Base: https://basescan.org/address/${BASE_CORE}#readContract`)
  console.log(`- OP: https://optimistic.etherscan.io/address/${OP_CORE}#readContract`)
}

main().catch(console.error)
