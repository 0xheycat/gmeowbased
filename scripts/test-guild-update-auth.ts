/**
 * Test Guild Update Authentication Fix (BUG #1)
 * 
 * Tests:
 * 1. ✅ Guild leader can update guild
 * 2. ❌ Non-leader cannot update guild (403 Forbidden)
 * 3. ❌ Invalid address format rejected (400 Bad Request)
 * 4. ❌ Missing address rejected (400 Bad Request)
 */

import { getGuild } from '../lib/contracts/guild-contract'

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const TEST_GUILD_ID = '1' // Adjust based on your test data

async function testGuildUpdateAuth() {
  console.log('🔐 Testing Guild Update Authentication (BUG #1 Fix)\n')
  
  try {
    // Get guild info first
    const guild = await getGuild(BigInt(TEST_GUILD_ID))
    if (!guild) {
      console.error('❌ Test guild not found')
      return
    }
    
    const guildLeader = guild.leader.toLowerCase()
    console.log(`Guild ${TEST_GUILD_ID} Leader: ${guildLeader}\n`)
    
    // Test 1: Guild leader can update (should succeed)
    console.log('Test 1: Guild leader updates guild')
    const validRequest = await fetch(`${API_BASE}/api/guild/${TEST_GUILD_ID}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: guildLeader,
        description: 'Test update from authorized leader',
      }),
    })
    
    const validResponse = await validRequest.json()
    if (validRequest.status === 200 && validResponse.success) {
      console.log('✅ PASS: Guild leader can update guild')
    } else {
      console.error('❌ FAIL: Guild leader blocked:', validResponse)
    }
    
    // Test 2: Non-leader cannot update (should fail with 403)
    console.log('\nTest 2: Non-leader tries to update guild')
    const unauthorizedAddress = '0x0000000000000000000000000000000000000001'
    const unauthorizedRequest = await fetch(`${API_BASE}/api/guild/${TEST_GUILD_ID}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: unauthorizedAddress,
        description: 'Malicious update attempt',
      }),
    })
    
    const unauthorizedResponse = await unauthorizedRequest.json()
    if (unauthorizedRequest.status === 403 && !unauthorizedResponse.success) {
      console.log('✅ PASS: Non-leader blocked (403 Forbidden)')
    } else {
      console.error('❌ FAIL: Non-leader not blocked:', unauthorizedResponse)
    }
    
    // Test 3: Invalid address format (should fail with 400)
    console.log('\nTest 3: Invalid address format')
    const invalidFormatRequest = await fetch(`${API_BASE}/api/guild/${TEST_GUILD_ID}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: 'invalid-address',
        description: 'Test',
      }),
    })
    
    const invalidFormatResponse = await invalidFormatRequest.json()
    if (invalidFormatRequest.status === 400 && !invalidFormatResponse.success) {
      console.log('✅ PASS: Invalid address format rejected (400 Bad Request)')
    } else {
      console.error('❌ FAIL: Invalid format not rejected:', invalidFormatResponse)
    }
    
    // Test 4: Missing address field (should fail with 400)
    console.log('\nTest 4: Missing address field')
    const missingAddressRequest = await fetch(`${API_BASE}/api/guild/${TEST_GUILD_ID}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Test without address',
      }),
    })
    
    const missingAddressResponse = await missingAddressRequest.json()
    if (missingAddressRequest.status === 400 && !missingAddressResponse.success) {
      console.log('✅ PASS: Missing address rejected (400 Bad Request)')
    } else {
      console.error('❌ FAIL: Missing address not rejected:', missingAddressResponse)
    }
    
    console.log('\n✅ All authentication tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run tests
testGuildUpdateAuth()
