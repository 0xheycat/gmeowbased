#!/usr/bin/env tsx
/**
 * Badge Minting Worker - Standalone Script for GitHub Actions
 * 
 * Migrated from /api/cron/mint-badges/route.ts to reduce Vercel CPU usage
 * Processes badge mint queue independently via GitHub Actions
 */

import { processBatch } from '../automation/mint-badge-queue'

async function mintBadges() {
  console.log('🎖️ Starting badge minting worker...')
  const startTime = Date.now()
  
  try {
    const result = await processBatch()
    
    const duration = Date.now() - startTime
    console.log(`\n📈 Badge minting complete:`)
    console.log(`  Processed: ${result.processed}`)
    console.log(`  Successful: ${result.success}`)
    console.log(`  Failed: ${result.failed}`)
    console.log(`  Duration: ${duration}ms`)
    
    process.exit(result.failed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run if executed directly
mintBadges()
