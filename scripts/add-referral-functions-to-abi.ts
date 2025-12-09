#!/usr/bin/env tsx
/**
 * Add Referral Functions to Core ABI
 * 
 * Manually adds referral function signatures from ReferralModule.sol to GmeowCore.abi.json
 * 
 * Run: npx tsx scripts/add-referral-functions-to-abi.ts
 */

import fs from 'fs'
import path from 'path'

const CORE_ABI_PATH = path.join(process.cwd(), 'abi/GmeowCore.abi.json')

// Referral function ABI entries from ReferralModule.sol
const REFERRAL_ABI_ENTRIES = [
  // registerReferralCode(string)
  {
    "type": "function",
    "name": "registerReferralCode",
    "inputs": [
      {
        "name": "code",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // setReferrer(string)
  {
    "type": "function",
    "name": "setReferrer",
    "inputs": [
      {
        "name": "code",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // referralCodeOf(address) view returns (string)
  {
    "type": "function",
    "name": "referralCodeOf",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  // referralOwnerOf(string) view returns (address)
  {
    "type": "function",
    "name": "referralOwnerOf",
    "inputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  // referrerOf(address) view returns (address)
  {
    "type": "function",
    "name": "referrerOf",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  // referralStats(address) view returns (ReferralStats)
  {
    "type": "function",
    "name": "referralStats",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "totalReferred",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalPointsEarned",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalTokenEarned",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  // referralTierClaimed(address) view returns (uint8)
  {
    "type": "function",
    "name": "referralTierClaimed",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  // referralPointReward() view returns (uint256)
  {
    "type": "function",
    "name": "referralPointReward",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  // referralTokenReward() view returns (uint256)
  {
    "type": "function",
    "name": "referralTokenReward",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  // Events
  {
    "type": "event",
    "name": "ReferralCodeRegistered",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "code",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReferrerSet",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "referrer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReferralRewardClaimed",
    "inputs": [
      {
        "name": "referrer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "referee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pointsReward",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tokenReward",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
]

async function main() {
  console.log('🔧 Adding Referral Functions to Core ABI\n')
  
  // Backup existing ABI
  if (fs.existsSync(CORE_ABI_PATH)) {
    const backupPath = CORE_ABI_PATH.replace('.json', '.backup.json')
    fs.copyFileSync(CORE_ABI_PATH, backupPath)
    console.log(`💾 Backup created: ${path.basename(backupPath)}`)
  }
  
  // Read current ABI
  const currentAbi = JSON.parse(fs.readFileSync(CORE_ABI_PATH, 'utf8'))
  console.log(`📋 Current ABI entries: ${currentAbi.length}`)
  
  // Check for existing referral functions
  const existingReferralFunctions = currentAbi.filter((entry: any) => 
    entry.name && entry.name.toLowerCase().includes('referral')
  )
  console.log(`🔍 Existing referral functions: ${existingReferralFunctions.length}`)
  
  if (existingReferralFunctions.length > 0) {
    console.log('   ⚠️  Referral functions already exist:')
    existingReferralFunctions.forEach((entry: any) => {
      console.log(`      - ${entry.name}`)
    })
    console.log('\n❓ Do you want to replace them? (Continuing...)')
  }
  
  // Remove existing referral entries
  const filteredAbi = currentAbi.filter((entry: any) => 
    !entry.name || !entry.name.toLowerCase().includes('referral')
  )
  
  // Add new referral entries
  const newAbi = [...filteredAbi, ...REFERRAL_ABI_ENTRIES]
  
  console.log(`\n✅ Adding ${REFERRAL_ABI_ENTRIES.length} referral entries`)
  console.log(`📋 New ABI entries: ${newAbi.length} (${newAbi.length - currentAbi.length > 0 ? '+' : ''}${newAbi.length - currentAbi.length})`)
  
  // Write updated ABI
  fs.writeFileSync(CORE_ABI_PATH, JSON.stringify(newAbi, null, 2))
  console.log(`✅ ABI updated: ${CORE_ABI_PATH}`)
  
  // Verify functions
  console.log('\n📝 Referral functions added:')
  const functions = REFERRAL_ABI_ENTRIES.filter(e => e.type === 'function')
  functions.forEach((entry: any) => {
    const inputs = entry.inputs.map((i: any) => i.type).join(', ')
    console.log(`   - ${entry.name}(${inputs})`)
  })
  
  console.log('\n✅ Complete! Run contract tests to verify:')
  console.log('   npx tsx scripts/test-referral-guild-contracts.ts')
}

main()
