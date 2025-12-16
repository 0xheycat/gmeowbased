#!/usr/bin/env tsx
/**
 * Test script to verify Neynar API lookup for wallet address
 * Usage: tsx scripts/test-address-lookup.ts <address>
 */

import { fetchUserByAddress, fetchFidByAddress } from '../lib/neynar'

const testAddress = process.argv[2] || '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e'

async function main() {
  console.log('🔍 Testing Neynar API address lookup')
  console.log('Address:', testAddress)
  console.log('---')
  
  try {
    // Test FID lookup
    console.log('\n1️⃣ Testing fetchFidByAddress...')
    const fid = await fetchFidByAddress(testAddress)
    console.log('Result FID:', fid)
    
    // Test full user lookup
    console.log('\n2️⃣ Testing fetchUserByAddress...')
    const user = await fetchUserByAddress(testAddress)
    console.log('Result User:', {
      fid: user?.fid,
      username: user?.username,
      displayName: user?.displayName,
      verifications: user?.verifications,
      custodyAddress: user?.custodyAddress,
    })
    
    if (!user || !user.fid) {
      console.error('\n❌ No Farcaster profile found for this address')
      console.error('This could mean:')
      console.error('  1. The address is not linked to any Farcaster account')
      console.error('  2. The address needs to be added as a verified address in Warpcast')
      console.error('  3. The Neynar API is not returning data for this address')
    } else {
      console.log('\n✅ Successfully found Farcaster profile')
      console.log(`   FID: ${user.fid}`)
      console.log(`   Username: @${user.username}`)
    }
  } catch (error) {
    console.error('\n❌ Error during lookup:', error)
  }
}

main()
