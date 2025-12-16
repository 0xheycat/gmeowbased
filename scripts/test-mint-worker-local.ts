/**
 * Quick test script for mint worker API
 * Usage: tsx scripts/test-mint-worker-local.ts
 */

import { POST } from '../app/api/cron/process-mint-queue/route'
import { NextRequest } from 'next/server'

async function testMintWorker() {
  console.log('Testing mint worker API...\n')
  
  // Test 1: Valid request
  console.log('Test 1: Valid authentication')
  const validRequest = new NextRequest('https://gmeowhq.art/api/cron/process-mint-queue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Origin': 'https://github.com'
    }
  })
  
  try {
    const response = await POST(validRequest)
    const data = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, JSON.stringify(data, null, 2))
    console.log(`✓ Test passed\n`)
  } catch (error) {
    console.error(`✗ Test failed:`, error)
  }
  
  // Test 2: Invalid authentication
  console.log('Test 2: Invalid authentication')
  const invalidRequest = new NextRequest('https://gmeowhq.art/api/cron/process-mint-queue', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-secret'
    }
  })
  
  try {
    const response = await POST(invalidRequest)
    const data = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, JSON.stringify(data, null, 2))
    
    if (response.status === 401) {
      console.log(`✓ Test passed\n`)
    } else {
      console.log(`✗ Test failed: Expected 401, got ${response.status}\n`)
    }
  } catch (error) {
    console.error(`✗ Test failed:`, error)
  }
}

testMintWorker().catch(console.error)
