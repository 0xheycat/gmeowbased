#!/usr/bin/env tsx
/**
 * Master Cron Runner for GitHub Actions
 * 
 * Consolidates all cron jobs into standalone scripts (no Vercel API overhead)
 * Reduces CPU usage on Vercel free tier by running jobs in GitHub Actions
 * 
 * Usage:
 *   tsx scripts/cron-runner.ts sync-guilds
 *   tsx scripts/cron-runner.ts mint-badges
 *   tsx scripts/cron-runner.ts update-leaderboard
 */

const jobs: Record<string, string> = {
  'sync-guilds': '/api/cron/sync-guilds',
  'sync-guild-members': '/api/cron/sync-guild-members',
  'sync-guild-deposits': '/api/cron/sync-guild-deposits',
  'sync-guild-leaderboard': '/api/cron/sync-guild-leaderboard',
  'sync-guild-level-ups': '/api/cron/sync-guild-level-ups',
  'mint-badges': '/api/cron/mint-badges',
  'process-mint-queue': '/api/cron/process-mint-queue',
  'update-leaderboard': '/api/cron/update-leaderboard',
  'sync-leaderboard': '/api/cron/sync-leaderboard',
  'sync-referrals': '/api/cron/sync-referrals',
  'sync-viral-metrics': '/api/cron/sync-viral-metrics',
  'sync-neynar-wallets': '/api/cron/sync-neynar-wallets',
  'expire-quests': '/api/cron/expire-quests',
  'send-digests': '/api/cron/send-digests',
}

async function runJob(jobName: string) {
  const endpoint = jobs[jobName]
  
  if (!endpoint) {
    console.error(`❌ Unknown job: ${jobName}`)
    console.log(`Available jobs: ${Object.keys(jobs).join(', ')}`)
    process.exit(1)
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gmeowhq.art'
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('❌ CRON_SECRET environment variable is required')
    process.exit(1)
  }
  
  console.log(`🚀 Running job: ${jobName}`)
  console.log(`📡 Endpoint: ${baseUrl}${endpoint}`)
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Job completed successfully')
      console.log('📊 Result:', JSON.stringify(data, null, 2))
      process.exit(0)
    } else {
      console.error('❌ Job failed')
      console.error('Status:', response.status)
      console.error('Error:', data)
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Get job name from command line
const jobName = process.argv[2]

if (!jobName) {
  console.error('Usage: tsx scripts/cron-runner.ts <job-name>')
  console.log(`Available jobs:\n  ${Object.keys(jobs).join('\n  ')}`)
  process.exit(1)
}

runJob(jobName)
