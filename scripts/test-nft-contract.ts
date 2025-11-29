/**
 * Test NFT contract functions
 * Run from project root: npx tsx scripts/test-nft-contract.ts
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { base, optimism } from 'viem/chains'

const BASE_NFT = '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20'
const OP_NFT = '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92'

async function testNFTContract(chainName: string, chainConfig: any, address: `0x${string}`) {
  console.log(`\n=== Testing ${chainName} NFT Contract: ${address} ===`)
  
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
    console.log('❌ Failed to get contract code')
    return
  }

  // Test mintNFT(string, string)
  console.log('\nTesting mintNFT(string nftTypeId, string reason):')
  try {
    const abi = parseAbi(['function mintNFT(string nftTypeId, string reason) payable returns (uint256)'])
    await client.simulateContract({
      address,
      abi,
      functionName: 'mintNFT',
      args: ['test-badge', 'test reason'],
      account: '0x0000000000000000000000000000000000000001'
    })
    console.log('✅ mintNFT(string, string) callable')
  } catch (e: any) {
    if (e.message?.includes('reverted') || e.message?.includes('E018') || e.message?.includes('paused')) {
      console.log('✅ mintNFT(string, string) EXISTS (reverted with valid error)')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else if (e.message?.includes('does not exist') || e.message?.includes('not found') || e.message?.includes('signature')) {
      console.log('❌ mintNFT(string, string) NOT FOUND')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else {
      console.log('⚠️  mintNFT(string, string) unknown error:', e.shortMessage || e.message.split('\n')[0])
    }
  }

  // Test mint(address, uint256)
  console.log('\nTesting mint(address to, uint256 tokenId):')
  try {
    const abi = parseAbi(['function mint(address to, uint256 tokenId)'])
    await client.simulateContract({
      address,
      abi,
      functionName: 'mint',
      args: ['0x0000000000000000000000000000000000000001', 1n],
      account: '0x0000000000000000000000000000000000000001'
    })
    console.log('✅ mint(address, uint256) callable')
  } catch (e: any) {
    if (e.message?.includes('reverted') || e.message?.includes('Ownable') || e.message?.includes('caller')) {
      console.log('✅ mint(address, uint256) EXISTS (reverted with valid error)')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else if (e.message?.includes('does not exist') || e.message?.includes('not found') || e.message?.includes('signature')) {
      console.log('❌ mint(address, uint256) NOT FOUND')
      console.log('   Error:', e.shortMessage || e.message.split('\n')[0])
    } else {
      console.log('⚠️  mint(address, uint256) unknown error:', e.shortMessage || e.message.split('\n')[0])
    }
  }

  // Test canMintNFT
  console.log('\nTesting canMintNFT(string nftTypeId, address user):')
  try {
    const abi = parseAbi(['function canMintNFT(string nftTypeId, address user) view returns (bool)'])
    const result = await client.readContract({
      address,
      abi,
      functionName: 'canMintNFT',
      args: ['test-badge', '0x0000000000000000000000000000000000000001']
    })
    console.log('✅ canMintNFT() works, returns:', result)
  } catch (e: any) {
    console.log('❌ canMintNFT() failed:', e.shortMessage || e.message.split('\n')[0])
  }
}

async function main() {
  console.log('🔍 Checking deployed Gmeow NFT contracts...\n')
  
  await testNFTContract('Base', base, BASE_NFT)
  await testNFTContract('Optimism', optimism, OP_NFT)
  
  console.log('\n\n📋 Summary:')
  console.log('If mintNFT(string, string) exists → Use new proxy ABI ✅')
  console.log('If mint(address, uint256) exists → Use old/internal ABI ⚠️')
  console.log('\nCheck Basescan manually:')
  console.log(`- Base NFT: https://basescan.org/address/${BASE_NFT}#readContract`)
  console.log(`- OP NFT: https://optimistic.etherscan.io/address/${OP_NFT}#readContract`)
}

main().catch(console.error)
