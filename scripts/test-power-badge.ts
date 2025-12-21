#!/usr/bin/env tsx
/**
 * Test PowerBadge Query Functions
 * Tests getPowerBadge and isPowerBadge with FID 18139
 */

import { getPowerBadge, isPowerBadge } from '@/lib/subsquid-client'

async function testPowerBadge() {
  const fid = '18139'
  
  console.log(`\n🔍 Testing PowerBadge queries for FID ${fid}...\n`)
  
  try {
    // Test getPowerBadge
    console.log('📊 Calling getPowerBadge()...')
    const powerBadge = await getPowerBadge(fid)
    console.log('Result:', JSON.stringify(powerBadge, null, 2))
    
    // Test isPowerBadge
    console.log('\n🎯 Calling isPowerBadge()...')
    const hasPowerBadge = await isPowerBadge(fid)
    console.log('Result:', hasPowerBadge)
    
    if (powerBadge) {
      console.log('\n✅ Power Badge Found!')
      console.log(`   FID: ${powerBadge.fid}`)
      console.log(`   Has Power Badge: ${powerBadge.isPowerBadge}`)
      console.log(`   Set By: ${powerBadge.setBy}`)
      console.log(`   Timestamp: ${powerBadge.timestamp}`)
      console.log(`   Block: ${powerBadge.blockNumber}`)
      console.log(`   TX: ${powerBadge.txHash}`)
    } else {
      console.log('\n❌ No Power Badge record found for this FID')
      console.log('   (This is expected if PowerBadgeSet event has not been emitted)')
    }
    
  } catch (error) {
    console.error('\n❌ Error testing PowerBadge:', error)
  }
}

testPowerBadge()
