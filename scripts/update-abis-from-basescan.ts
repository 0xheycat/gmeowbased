#!/usr/bin/env tsx
/**
 * Update ABIs from Basescan
 * 
 * Fetches verified contract ABIs from Basescan API and updates local ABI files
 * 
 * Run: npx tsx scripts/update-abis-from-basescan.ts
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Contract addresses from environment
const CONTRACTS = {
  GmeowCore: {
    address: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
    abiPath: 'abi/GmeowCore.abi.json',
  },
  GmeowGuild: {
    address: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',
    abiPath: 'abi/GmeowGuild.abi.json',
  },
  GmeowNFT: {
    address: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',
    abiPath: 'abi/GmeowNFT.abi.json',
  },
  GmeowProxy: {
    address: '0x6A48B758ed42d7c934D387164E60aa58A92eD206',
    abiPath: 'abi/GmeowProxy.abi.json',
  },
}

const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
const BASESCAN_API_URL = 'https://api.basescan.org/api'

if (!BASESCAN_API_KEY) {
  console.error('❌ Error: BASESCAN_API_KEY or ETHERSCAN_API_KEY not found in environment')
  process.exit(1)
}

async function fetchABI(contractName: string, address: string): Promise<any[] | null> {
  console.log(`📡 Fetching ABI for ${contractName} (${address})...`)
  
  const url = `${BASESCAN_API_URL}?module=contract&action=getabi&address=${address}&apikey=${BASESCAN_API_KEY}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status !== '1') {
      console.error(`   ❌ Error: ${data.message}`)
      if (data.result && data.result.includes('not verified')) {
        console.error('   ℹ️  Contract is not verified on Basescan')
      }
      return null
    }
    
    const abi = JSON.parse(data.result)
    console.log(`   ✅ Success: ${abi.length} ABI entries fetched`)
    
    // Log function names for verification
    const functions = abi.filter((item: any) => item.type === 'function').map((item: any) => item.name)
    console.log(`   📋 Functions found: ${functions.length}`)
    
    // Check for referral functions (only for Core contract)
    if (contractName === 'GmeowCore') {
      const referralFunctions = functions.filter((name: string) => 
        name.toLowerCase().includes('referral')
      )
      console.log(`   🔍 Referral functions: ${referralFunctions.length}`)
      if (referralFunctions.length > 0) {
        console.log(`      ${referralFunctions.join(', ')}`)
      }
    }
    
    return abi
  } catch (error: any) {
    console.error(`   ❌ Fetch error: ${error.message}`)
    return null
  }
}

async function updateABIFile(contractName: string, abiPath: string, abi: any[]): Promise<void> {
  const fullPath = path.join(process.cwd(), abiPath)
  
  try {
    // Backup existing ABI
    if (fs.existsSync(fullPath)) {
      const backupPath = fullPath.replace('.json', '.backup.json')
      fs.copyFileSync(fullPath, backupPath)
      console.log(`   💾 Backup created: ${path.basename(backupPath)}`)
    }
    
    // Write new ABI
    fs.writeFileSync(fullPath, JSON.stringify(abi, null, 2))
    console.log(`   ✅ ABI updated: ${abiPath}`)
  } catch (error: any) {
    console.error(`   ❌ File write error: ${error.message}`)
  }
}

async function main() {
  console.log('🔧 Updating ABIs from Basescan\n')
  
  if (BASESCAN_API_KEY) {
    console.log(`API Key: ${BASESCAN_API_KEY.substring(0, 8)}...${BASESCAN_API_KEY.substring(BASESCAN_API_KEY.length - 4)}`)
  }
  console.log('')
  
  let updatedCount = 0
  let failedCount = 0
  
  for (const [contractName, config] of Object.entries(CONTRACTS)) {
    const abi = await fetchABI(contractName, config.address)
    
    if (abi) {
      await updateABIFile(contractName, config.abiPath, abi)
      updatedCount++
    } else {
      failedCount++
    }
    
    console.log('')
    
    // Rate limiting: wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log('📊 Summary:')
  console.log(`   ✅ Updated: ${updatedCount} contracts`)
  console.log(`   ❌ Failed: ${failedCount} contracts`)
  
  if (updatedCount > 0) {
    console.log('\n✅ ABI update complete! Run contract tests to verify:')
    console.log('   npx tsx scripts/test-referral-guild-contracts.ts')
  }
}

main()
