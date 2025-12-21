#!/usr/bin/env tsx
/**
 * Test Badge Staking Hooks
 * Verifies contract ABI has stakeForBadge and unstakeForBadge functions
 */

import { CORE_ABI } from '../lib/contracts/abis'
import { STANDALONE_ADDRESSES } from '../lib/contracts/gmeow-utils'

function testStakingFunctions() {
  console.log('\n🔍 Testing Badge Staking Contract Setup...\n')
  
  // Check contract address
  const coreAddress = STANDALONE_ADDRESSES.base.core
  console.log('✅ GmeowCore Contract Address:', coreAddress)
  
  // Find staking functions in ABI
  const stakeFunction = CORE_ABI.find((item: any) => 
    item.type === 'function' && item.name === 'stakeForBadge'
  )
  
  const unstakeFunction = CORE_ABI.find((item: any) => 
    item.type === 'function' && item.name === 'unstakeForBadge'
  )
  
  const powerBadgeSetEvent = CORE_ABI.find((item: any) => 
    item.type === 'event' && item.name === 'PowerBadgeSet'
  )
  
  const stakedForBadgeEvent = CORE_ABI.find((item: any) => 
    item.type === 'event' && item.name === 'StakedForBadge'
  )
  
  const unstakedForBadgeEvent = CORE_ABI.find((item: any) => 
    item.type === 'event' && item.name === 'UnstakedForBadge'
  )
  
  // Display results
  console.log('\n📋 Contract Functions:')
  if (stakeFunction) {
    console.log('✅ stakeForBadge() found')
    console.log('   Inputs:', stakeFunction.inputs?.map((i: any) => `${i.name}: ${i.type}`).join(', '))
  } else {
    console.log('❌ stakeForBadge() NOT FOUND')
  }
  
  if (unstakeFunction) {
    console.log('✅ unstakeForBadge() found')
    console.log('   Inputs:', unstakeFunction.inputs?.map((i: any) => `${i.name}: ${i.type}`).join(', '))
  } else {
    console.log('❌ unstakeForBadge() NOT FOUND')
  }
  
  console.log('\n📡 Contract Events:')
  if (powerBadgeSetEvent) {
    console.log('✅ PowerBadgeSet event found')
    console.log('   Inputs:', powerBadgeSetEvent.inputs?.map((i: any) => 
      `${i.name}: ${i.type}${i.indexed ? ' indexed' : ''}`
    ).join(', '))
  } else {
    console.log('❌ PowerBadgeSet event NOT FOUND')
  }
  
  if (stakedForBadgeEvent) {
    console.log('✅ StakedForBadge event found')
  } else {
    console.log('❌ StakedForBadge event NOT FOUND')
  }
  
  if (unstakedForBadgeEvent) {
    console.log('✅ UnstakedForBadge event found')
  } else {
    console.log('❌ UnstakedForBadge event NOT FOUND')
  }
  
  // Summary
  console.log('\n📊 Summary:')
  const allPresent = stakeFunction && unstakeFunction && powerBadgeSetEvent && 
                     stakedForBadgeEvent && unstakedForBadgeEvent
  
  if (allPresent) {
    console.log('✅ All required functions and events are present in the contract ABI')
    console.log('✅ Badge staking system is ready for use')
  } else {
    console.log('❌ Some functions or events are missing')
  }
}

testStakingFunctions()
