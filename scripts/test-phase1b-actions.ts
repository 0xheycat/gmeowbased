/**
 * Phase 1B: Test Interactive Frame Actions
 * 
 * Tests recordGM and questProgress actions locally
 */

async function testRecordGM() {
  console.log('\n🧪 Testing recordGM action...')
  
  const response = await fetch('http://localhost:3000/api/frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'recordGM',
      payload: {
        fid: 12345,
        untrustedData: { fid: 12345 },
      },
    }),
  })
  
  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))
  
  if (data.ok && data.sessionId) {
    console.log('✅ recordGM passed: sessionId =', data.sessionId)
    return data.sessionId
  } else {
    console.log('❌ recordGM failed')
    return null
  }
}

async function testQuestProgress(sessionId?: string) {
  console.log('\n🧪 Testing questProgress action...')
  
  const response = await fetch('http://localhost:3000/api/frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'questProgress',
      payload: {
        fid: 12345,
        questId: 'test-quest-1',
        session: sessionId,
        untrustedData: { fid: 12345 },
      },
    }),
  })
  
  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))
  
  if (data.ok && data.sessionId) {
    console.log('✅ questProgress passed: step =', data.currentStep, ', sessionId =', data.sessionId)
    return data.sessionId
  } else {
    console.log('❌ questProgress failed')
    return null
  }
}

async function testFrameState() {
  console.log('\n🧪 Testing frame state persistence...')
  
  // Import state utilities
  const { loadFrameState, getUserSessions, cleanupExpiredSessions } = await import('../lib/frame-state')
  
  // Test getUserSessions
  const sessions = await getUserSessions(12345)
  console.log(`Found ${sessions.length} sessions for FID 12345`)
  
  if (sessions.length > 0) {
    console.log('Latest session:', JSON.stringify(sessions[0], null, 2))
    console.log('✅ Frame state persistence working')
  } else {
    console.log('⚠️ No sessions found (may need to run recordGM/questProgress first)')
  }
  
  // Test cleanup
  const cleaned = await cleanupExpiredSessions()
  console.log(`Cleaned up ${cleaned} expired sessions`)
}

async function main() {
  console.log('🚀 Phase 1B: Testing Interactive Frame Actions\n')
  console.log('Make sure dev server is running on http://localhost:3000')
  console.log('Make sure Supabase env vars are set\n')
  
  try {
    // Test recordGM
    const gmSessionId = await testRecordGM()
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test questProgress (new session)
    const questSessionId1 = await testQuestProgress()
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test questProgress (continue session)
    if (questSessionId1) {
      await testQuestProgress(questSessionId1)
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test frame state
    await testFrameState()
    
    console.log('\n✅ All Phase 1B tests completed!')
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
