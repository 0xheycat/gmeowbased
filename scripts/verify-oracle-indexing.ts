#!/usr/bin/env tsx
/**
 * Verify Oracle Transactions Were Indexed
 * 
 * Queries Subsquid GraphQL to confirm:
 * - GM event indexed
 * - Referral code indexed
 * - User profile updated
 */

const ORACLE = '0x8870c155666809609176260f2b65a626c000d773'

const query = `
{
  user: userById(id: "${ORACLE}") {
    id
    currentStreak
    lifetimeGMs
    totalXP
    badges { id badgeType }
    guilds { id role guild { id totalMembers } }
  }
  
  referralCodes(where: { owner_eq: "${ORACLE}" }) {
    id
    owner
    totalUses
    totalRewards
    createdAt
  }
  
  gmEvents(where: { user: { id_eq: "${ORACLE}" } }, limit: 5, orderBy: timestamp_DESC) {
    id
    xpAwarded
    streakDay
    timestamp
    blockNumber
  }
}
`

async function main() {
  console.log('🔍 Verifying Oracle Indexing')
  console.log('═'.repeat(80))
  console.log()
  
  const res = await fetch('http://localhost:4350/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  
  const data = await res.json()
  
  if (data.errors) {
    console.error('❌ GraphQL Errors:')
    console.error(JSON.stringify(data.errors, null, 2))
    process.exit(1)
  }
  
  const { user, referralCodes, gmEvents } = data.data
  
  console.log('👤 User Profile:')
  if (user) {
    console.log(`  Current Streak: ${user.currentStreak}`)
    console.log(`  Lifetime GMs: ${user.lifetimeGMs}`)
    console.log(`  Total XP: ${user.totalXP}`)
    console.log(`  Badges: ${user.badges.length}`)
    console.log(`  Guilds: ${user.guilds.length}`)
    
    if (user.guilds.length > 0) {
      user.guilds.forEach((g: any) => {
        console.log(`    - Guild #${g.guild.id} (${g.role}, ${g.guild.totalMembers} members)`)
      })
    }
  } else {
    console.log('  ❌ User not found')
  }
  
  console.log()
  console.log('📝 Referral Codes:')
  if (referralCodes && referralCodes.length > 0) {
    referralCodes.forEach((code: any) => {
      console.log(`  ✅ ${code.id}`)
      console.log(`     Uses: ${code.totalUses}`)
      console.log(`     Rewards: ${code.totalRewards}`)
      console.log(`     Created: ${new Date(code.createdAt).toLocaleString()}`)
    })
  } else {
    console.log('  ⚠️  No referral codes found')
  }
  
  console.log()
  console.log('⚡ GM Events:')
  if (gmEvents && gmEvents.length > 0) {
    gmEvents.forEach((event: any) => {
      console.log(`  ✅ GM at block ${event.blockNumber}`)
      console.log(`     XP Awarded: ${event.xpAwarded}`)
      console.log(`     Streak Day: ${event.streakDay}`)
      console.log(`     Time: ${new Date(event.timestamp).toLocaleString()}`)
    })
  } else {
    console.log('  ⚠️  No GM events found yet')
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // Validation
  const hasUser = !!user
  const hasReferral = referralCodes && referralCodes.length > 0
  const hasGM = gmEvents && gmEvents.length > 0
  
  console.log('📊 Indexing Status:')
  console.log(`  ${hasUser ? '✅' : '❌'} User profile`)
  console.log(`  ${hasReferral ? '✅' : '⚠️ '} Referral code`)
  console.log(`  ${hasGM ? '✅' : '⚠️ '} GM event`)
  console.log()
  
  if (hasUser && hasReferral && hasGM) {
    console.log('🎉 All oracle transactions successfully indexed!')
  } else {
    console.log('⏳ Some data still pending indexing (this is normal, wait a bit longer)')
  }
  console.log()
}

main().catch(error => {
  console.error('💥 Error:', error.message)
  process.exit(1)
})
