#!/usr/bin/env tsx
/**
 * Frame Contract Event Alignment Verification
 * 
 * Ensures all frames use correct events from Dec 31, 2025 contract deployment
 * Run: npx tsx scripts/verify-frame-contract-alignment.ts
 */

console.log('🔍 Verifying Frame Contract Event Alignment\n')
console.log('Checking against Dec 31, 2025 contract deployment...\n')

import { CORE_ABI, GUILD_ABI, REFERRAL_ABI, SCORING_ABI } from '@/lib/contracts/abis'
import { type Abi } from 'viem'

interface EventCheck {
  contract: string
  eventName: string
  found: boolean
  inputs?: Array<{ name: string; type: string; indexed: boolean }>
  issues?: string[]
}

const results: EventCheck[] = []

/**
 * Critical events that frames depend on
 */
const CRITICAL_EVENTS = {
  Core: [
    'QuestCompleted',       // Quest frame, leaderboard frame
    'OnchainQuestCompleted', // Quest claiming
    'GMSent',               // GM frame
    'PointsTipped',         // Points frame
    'BadgeMinted',          // Badge frame
  ],
  Guild: [
    'GuildCreated',         // Guild frame
    'GuildJoined',          // Active users frame
    'GuildLeft',            // Active users frame (filtering)
    'GuildPointsDeposited', // Guild treasury
  ],
}

/**
 * Expected event structures from Dec 31 deployment
 */
const EXPECTED_EVENT_STRUCTURES = {
  QuestCompleted: {
    inputs: ['questId', 'user', 'pointsAwarded', 'fid', 'rewardToken', 'tokenAmount'],
    indexed: ['questId', 'user'],
  },
  OnchainQuestCompleted: {
    inputs: ['questId', 'user', 'pointsAwarded'],
    indexed: ['questId', 'user'],
  },
  GMSent: {
    inputs: ['user', 'streak', 'pointsEarned'],
    indexed: ['user'],
  },
  GuildJoined: {
    inputs: ['guildId', 'member'],
    indexed: ['guildId', 'member'],
  },
  GuildLeft: {
    inputs: ['guildId', 'member'],
    indexed: ['guildId', 'member'],
  },
}

function findEventInABI(abi: Abi, eventName: string): any | null {
  return abi.find((item: any) => item.type === 'event' && item.name === eventName)
}

function checkEvent(contract: string, eventName: string, abi: Abi): EventCheck {
  const event = findEventInABI(abi, eventName)
  
  if (!event) {
    return {
      contract,
      eventName,
      found: false,
      issues: ['Event not found in ABI'],
    }
  }

  const result: EventCheck = {
    contract,
    eventName,
    found: true,
    inputs: event.inputs.map((input: any) => ({
      name: input.name,
      type: input.type,
      indexed: input.indexed,
    })),
    issues: [],
  }

  // Check if event structure matches expected
  const expected = EXPECTED_EVENT_STRUCTURES[eventName as keyof typeof EXPECTED_EVENT_STRUCTURES]
  if (expected) {
    const actualInputs = event.inputs.map((i: any) => i.name)
    const actualIndexed = event.inputs.filter((i: any) => i.indexed).map((i: any) => i.name)

    // Check all expected inputs exist
    const missingInputs = expected.inputs.filter((name: string) => !actualInputs.includes(name))
    if (missingInputs.length > 0) {
      result.issues!.push(`Missing inputs: ${missingInputs.join(', ')}`)
    }

    // Check indexed fields
    const missingIndexed = expected.indexed.filter((name: string) => !actualIndexed.includes(name))
    if (missingIndexed.length > 0) {
      result.issues!.push(`Missing indexed fields: ${missingIndexed.join(', ')}`)
    }

    // Check for extra inputs (might indicate new features)
    const extraInputs = actualInputs.filter((name: string) => !expected.inputs.includes(name))
    if (extraInputs.length > 0) {
      result.issues!.push(`Extra inputs (verify intentional): ${extraInputs.join(', ')}`)
    }
  }

  return result
}

console.log('=' .repeat(70))
console.log('CONTRACT EVENT VERIFICATION')
console.log('=' .repeat(70))

// Check Core contract events
console.log('\n📦 Core Contract (GmeowCore.sol)')
console.log('   Address: 0x343829A6A613d51B4A81c2dE508e49CA66D4548d')
console.log('   Verified: Dec 31, 2025\n')

CRITICAL_EVENTS.Core.forEach(eventName => {
  const result = checkEvent('Core', eventName, CORE_ABI)
  results.push(result)
  
  const symbol = result.found ? (result.issues!.length === 0 ? '✅' : '⚠️') : '❌'
  console.log(`   ${symbol} ${eventName}`)
  
  if (result.found && result.inputs) {
    const inputStr = result.inputs
      .map(i => `${i.indexed ? '(i) ' : ''}${i.name}: ${i.type}`)
      .join(', ')
    console.log(`      Inputs: ${inputStr}`)
  }
  
  if (result.issues && result.issues.length > 0) {
    result.issues.forEach(issue => {
      console.log(`      ⚠️  ${issue}`)
    })
  }
  console.log()
})

// Check Guild contract events
console.log('📦 Guild Contract (GmeowGuildStandalone.sol)')
console.log('   Address: 0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097')
console.log('   Verified: Dec 31, 2025\n')

CRITICAL_EVENTS.Guild.forEach(eventName => {
  const result = checkEvent('Guild', eventName, GUILD_ABI)
  results.push(result)
  
  const symbol = result.found ? (result.issues!.length === 0 ? '✅' : '⚠️') : '❌'
  console.log(`   ${symbol} ${eventName}`)
  
  if (result.found && result.inputs) {
    const inputStr = result.inputs
      .map(i => `${i.indexed ? '(i) ' : ''}${i.name}: ${i.type}`)
      .join(', ')
    console.log(`      Inputs: ${inputStr}`)
  }
  
  if (result.issues && result.issues.length > 0) {
    result.issues.forEach(issue => {
      console.log(`      ⚠️  ${issue}`)
    })
  }
  console.log()
})

// Summary
console.log('=' .repeat(70))
console.log('SUMMARY')
console.log('=' .repeat(70))

const totalEvents = results.length
const foundEvents = results.filter(r => r.found).length
const healthyEvents = results.filter(r => r.found && (!r.issues || r.issues.length === 0)).length
const eventsWithIssues = results.filter(r => r.found && r.issues && r.issues.length > 0).length
const missingEvents = results.filter(r => !r.found).length

console.log(`\nTotal Events Checked: ${totalEvents}`)
console.log(`✅ Healthy: ${healthyEvents}`)
console.log(`⚠️  With Issues: ${eventsWithIssues}`)
console.log(`❌ Missing: ${missingEvents}`)

if (missingEvents > 0) {
  console.log('\n❌ CRITICAL: Missing events detected!')
  console.log('   Action required: Update ABIs from deployed contracts\n')
  results.filter(r => !r.found).forEach(r => {
    console.log(`   - ${r.contract}.${r.eventName}`)
  })
}

if (eventsWithIssues > 0) {
  console.log('\n⚠️  WARNING: Events with structure mismatches!')
  console.log('   Review required: Verify these are intentional changes\n')
  results.filter(r => r.found && r.issues && r.issues.length > 0).forEach(r => {
    console.log(`   - ${r.contract}.${r.eventName}`)
    r.issues!.forEach(issue => console.log(`     ${issue}`))
  })
}

if (healthyEvents === totalEvents) {
  console.log('\n✅ ALL EVENTS ALIGNED WITH DEC 31, 2025 DEPLOYMENT!')
  console.log('   All frames are using correct contract event structures.')
}

console.log('\n' + '=' .repeat(70))

// Frame-specific checks
console.log('\n🎨 FRAME-SPECIFIC EVENT USAGE\n')

const frameEventMap = {
  'Quest Frame': ['QuestCompleted', 'OnchainQuestCompleted'],
  'Guild Frame': ['GuildCreated', 'GuildJoined'],
  'Active Users Frame': ['GuildJoined', 'GuildLeft'],
  'GM Frame': ['GMSent'],
  'Points Frame': ['PointsTipped', 'QuestCompleted'],
  'Badge Frame': ['BadgeMinted'],
  'Referral Frame': [],  // Referral events integrated in Core
  'Leaderboard Frame': ['QuestCompleted', 'GMSent'],  // Uses Core events
}

Object.entries(frameEventMap).forEach(([frame, events]) => {
  const allFound = events.every(eventName => 
    results.find(r => r.eventName === eventName && r.found)
  )
  const symbol = allFound ? '✅' : '❌'
  console.log(`${symbol} ${frame}: ${events.join(', ')}`)
})

console.log('\n' + '=' .repeat(70))

if (missingEvents > 0 || eventsWithIssues > 0) {
  process.exit(1)
}
