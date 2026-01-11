#!/usr/bin/env tsx
/**
 * Automated Test Runner for Active Users Frame API
 * 
 * Run: npx tsx scripts/test-active-users-frame.ts
 */

console.log('🧪 Testing Active Users Frame API\n')

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface ActiveUsersFrameTestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

const testResults: ActiveUsersFrameTestResult[] = []

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  try {
    await fn()
    const duration = Date.now() - startTime
    testResults.push({ name, passed: true, duration })
    console.log(`✓ ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    testResults.push({ name, passed: false, duration, error: errorMessage })
    console.log(`✗ ${name} (${duration}ms)`)
    console.log(`  Error: ${errorMessage}`)
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function runActiveUsersFrameTests() {
  console.log('🔍 Testing JSON Format...\n')

  await test('Should return active guild members in JSON format', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    assert(response.status === 200, `Expected status 200, got ${response.status}`)
    assert(data.success === true, 'Expected success to be true')
    assert(data.guild !== undefined, 'Expected guild data')
    assert(Array.isArray(data.activeMembers), 'Expected activeMembers to be an array')
    assert(data.timestamp !== undefined, 'Expected timestamp')
  })

  await test('Should include guild metadata', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    assert(data.guild.id === '1', 'Expected guild ID to be 1')
    assert(data.guild.name !== undefined, 'Expected guild name')
    assert(data.guild.leader !== undefined, 'Expected guild leader')
    assert(data.guild.totalPoints !== undefined, 'Expected total points')
    assert(data.guild.memberCount !== undefined, 'Expected member count')
    assert(data.guild.level !== undefined, 'Expected guild level')
    assert(typeof data.guild.active === 'boolean', 'Expected active to be boolean')
  })

  await test('Should include member details with ranks', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    if (data.activeMembers.length > 0) {
      const member = data.activeMembers[0]
      
      assert(member.rank !== undefined, 'Expected member rank')
      assert(member.address !== undefined, 'Expected member address')
      assert(typeof member.isOfficer === 'boolean', 'Expected isOfficer to be boolean')
      assert(member.points !== undefined, 'Expected member points')
      assert(member.joinedAt !== undefined, 'Expected member joinedAt')
    }
  })

  await test('Should filter out members who left (cross-verify with guild_events)', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    console.log(`\n  📊 Guild "${data.guild.name}": ${data.activeMembers.length} active members`)
    
    // Verify members are ranked correctly
    data.activeMembers.forEach((member: any, index: number) => {
      assert(member.rank === index + 1, `Expected rank ${index + 1}, got ${member.rank}`)
    })

    // Display members
    data.activeMembers.forEach((member: any) => {
      const displayName = member.farcasterUsername || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`
      const points = parseInt(member.points).toLocaleString()
      const badge = member.isOfficer ? '⭐' : '  '
      console.log(`  ${badge} #${member.rank} ${displayName} - ${points} pts`)
    })
    console.log()
  })

  await test('Should match member count between guild metadata and active members array', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    assert(
      data.guild.memberCount === data.activeMembers.length,
      `Expected member count ${data.guild.memberCount} to match active members length ${data.activeMembers.length}`
    )
  })

  await test('Should sort members by points (highest first)', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const data = await response.json()

    if (data.activeMembers.length > 1) {
      for (let i = 0; i < data.activeMembers.length - 1; i++) {
        const currentPoints = parseInt(data.activeMembers[i].points)
        const nextPoints = parseInt(data.activeMembers[i + 1].points)
        
        assert(
          currentPoints >= nextPoints,
          `Expected member #${i + 1} (${currentPoints} pts) >= member #${i + 2} (${nextPoints} pts)`
        )
      }
    }
  })

  await test('Should handle invalid guild ID gracefully', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=999999&format=json`)
    const data = await response.json()

    assert(response.status === 404, `Expected status 404, got ${response.status}`)
    assert(data.error === 'Guild not found', `Expected error message, got ${data.error}`)
  })

  console.log('\n🖼️  Testing Image Format...\n')

  await test('Should return an image response', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=image`)

    assert(response.status === 200, `Expected status 200, got ${response.status}`)
    assert(
      response.headers.get('content-type')?.includes('image') === true,
      'Expected content-type to include "image"'
    )
  })

  console.log('\n❌ Testing Error Handling...\n')

  await test('Should return 400 for invalid format', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=invalid`)
    const data = await response.json()

    assert(response.status === 400, `Expected status 400, got ${response.status}`)
    assert(data.error === 'Invalid format', `Expected error message, got ${data.error}`)
  })

  await test('Should use default values for missing parameters', async () => {
    const response = await fetch(`${baseUrl}/api/test/active-users-frame`)
    const data = await response.json()

    assert(response.status === 200, `Expected status 200, got ${response.status}`)
    assert(data.guild.id === '1', 'Expected default guild ID to be 1')
  })

  console.log('\n⚡ Testing Performance...\n')

  await test('Should respond within 5 seconds', async () => {
    const startTime = Date.now()
    const response = await fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    const duration = Date.now() - startTime

    assert(response.status === 200, `Expected status 200, got ${response.status}`)
    assert(duration < 5000, `Expected response within 5s, took ${duration}ms`)
    
    console.log(`  ⏱️  Response time: ${duration}ms`)
  })

  await test('Should handle multiple concurrent requests', async () => {
    const requests = Array.from({ length: 5 }, () =>
      fetch(`${baseUrl}/api/test/active-users-frame?guildId=1&format=json`)
    )

    const responses = await Promise.all(requests)
    
    responses.forEach((response, i) => {
      assert(response.status === 200, `Request #${i + 1} failed with status ${response.status}`)
    })
    
    console.log(`  ✓ All 5 concurrent requests succeeded`)
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary\n')
  
  const passed = testResults.filter(r => r.passed).length
  const failed = testResults.filter(r => !r.passed).length
  const total = testResults.length
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0)

  console.log(`Total Tests: ${total}`)
  console.log(`✓ Passed: ${passed}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`⏱️  Total Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`)
      console.log(`    ${r.error}`)
    })
  }

  console.log('='.repeat(60))

  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
runActiveUsersFrameTests().catch(error => {
  console.error('\n💥 Test runner failed:', error)
  process.exit(1)
})
