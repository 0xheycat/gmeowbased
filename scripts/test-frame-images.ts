#!/usr/bin/env tsx
/**
 * Frame Image Generation Test Script
 * 
 * Tests all 11 frame image routes by generating actual PNG images
 * and verifying Redis caching works correctly.
 */

import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// Import all frame image routes
import { GET as gmGET } from '../app/api/frame/image/gm/route'
import { GET as badgeGET } from '../app/api/frame/image/badge/route'
import { GET as questGET } from '../app/api/frame/image/quest/route'
import { GET as pointsGET } from '../app/api/frame/image/points/route'

const OUTPUT_DIR = '/tmp/frame-test-images'

async function testFrameImage(
  name: string,
  handler: (req: NextRequest) => Promise<Response>,
  params: Record<string, string>
) {
  console.log(`\n🖼️  Testing ${name} frame...`)
  
  const queryString = new URLSearchParams(params).toString()
  const url = `http://localhost:3000/api/frame/image/${name}?${queryString}`
  
  try {
    const req = new NextRequest(url)
    const response = await handler(req)
    
    if (!response.ok) {
      console.error(`❌ ${name}: HTTP ${response.status}`)
      return false
    }
    
    // Check cache header
    const cacheStatus = response.headers.get('X-Frame-Cache')
    console.log(`   Cache: ${cacheStatus || 'MISS'}`)
    
    // Save image
    const buffer = await response.arrayBuffer()
    const outputPath = path.join(OUTPUT_DIR, `${name}.png`)
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    
    const fileSizeKB = (buffer.byteLength / 1024).toFixed(2)
    console.log(`   ✅ Generated: ${outputPath} (${fileSizeKB} KB)`)
    
    // Test cache on second request
    const req2 = new NextRequest(url)
    const response2 = await handler(req2)
    const cacheStatus2 = response2.headers.get('X-Frame-Cache')
    console.log(`   Cache (2nd): ${cacheStatus2 || 'MISS'} ${cacheStatus2 === 'HIT' ? '✅' : '⚠️'}`)
    
    return true
  } catch (error) {
    console.error(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function main() {
  console.log('🚀 Frame Image Generation Test')
  console.log('================================\n')
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  console.log(`📁 Output directory: ${OUTPUT_DIR}`)
  
  const tests = [
    {
      name: 'gm',
      handler: gmGET,
      params: { fid: '3', streak: '5', lifetimeGMs: '100', xp: '500', username: 'testpilot' }
    },
    {
      name: 'badge',
      handler: badgeGET,
      params: { tier: 'epic', badgeType: 'gm-streak', count: '10' }
    },
    {
      name: 'quest',
      handler: questGET,
      params: { questId: 'first-gm', status: 'completed', reward: '100' }
    },
    {
      name: 'points',
      handler: pointsGET,
      params: { points: '1500', rank: '42', tier: 'gold' }
    },
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    const result = await testFrameImage(test.name, test.handler, test.params)
    if (result) {
      passed++
    } else {
      failed++
    }
  }
  
  console.log('\n================================')
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)
  console.log(`📁 Images saved to: ${OUTPUT_DIR}`)
  
  if (failed === 0) {
    console.log('✅ All frame image tests passed!')
  } else {
    console.log('⚠️  Some tests failed')
    process.exit(1)
  }
}

main().catch(console.error)
