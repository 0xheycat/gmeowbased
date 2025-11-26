#!/usr/bin/env tsx
/**
 * Test Bot Reply System
 * Tests the bot auto-reply with frame embed for a specific user
 * Usage: tsx scripts/test-bot-reply.ts
 */

import { buildAgentAutoReply } from '@/lib/agent-auto-reply'
import { selectFrameForIntent, formatFrameEmbedForCast } from '@/lib/bot-frame-builder'
import { loadBotStatsConfig } from '@/lib/bot-config'

const TEST_SCENARIOS = [
  {
    name: 'Stats Request',
    fid: 18139,
    username: 'heycat',
    text: '@gmeowbased show me my stats',
  },
  {
    name: 'Quest Request',
    fid: 18139,
    username: 'heycat',
    text: '@gmeowbased what quests can I do?',
  },
  {
    name: 'Leaderboard Request',
    fid: 18139,
    username: 'heycat',
    text: '@gmeowbased show leaderboard',
  },
  {
    name: 'Streak Request',
    fid: 18139,
    username: 'heycat',
    text: '@gmeowbased my streak status',
  },
  {
    name: 'GM Request',
    fid: 18139,
    username: 'heycat',
    text: 'gm @gmeowbased',
  },
  {
    name: 'Help Request',
    fid: 18139,
    username: 'heycat',
    text: '@gmeowbased help',
  },
]

async function testBotReply(scenario: typeof TEST_SCENARIOS[0]) {
  console.log('\n' + '='.repeat(80))
  console.log(`🧪 Testing: ${scenario.name}`)
  console.log('='.repeat(80))
  console.log(`User: @${scenario.username} (FID ${scenario.fid})`)
  console.log(`Text: "${scenario.text}"`)
  console.log()

  try {
    // Load bot config
    const config = await loadBotStatsConfig()
    
    // Build auto-reply
    const reply = await buildAgentAutoReply({
      fid: scenario.fid,
      text: scenario.text,
      username: scenario.username,
      displayName: scenario.username,
    }, config)

    console.log('📊 Reply Result:')
    console.log('  Status:', reply.ok ? '✅ SUCCESS' : '❌ FAILED')
    
    if (reply.ok) {
      console.log('  Intent:', reply.intent)
      console.log('  Text:', reply.text)
      console.log('  Meta:', JSON.stringify(reply.meta, null, 2))

      // Test frame embed generation
      const frameEmbed = selectFrameForIntent(reply.intent, {
        fid: scenario.fid,
        username: scenario.username,
        hasStats: !!reply.meta?.hasStats,
        hasStreak: !!reply.meta?.hasStreak,
      })

      if (frameEmbed) {
        console.log('\n🖼️  Frame Embed:')
        console.log('  Type:', frameEmbed.type)
        console.log('  URL:', frameEmbed.url)
        console.log('  Description:', frameEmbed.description)
        
        const embeds = formatFrameEmbedForCast(frameEmbed)
        console.log('  Cast Embeds:', embeds)
      } else {
        console.log('\n⚠️  No frame embed generated for this intent')
      }
    } else {
      console.log('  Reason:', reply.reason)
      if (reply.detail) {
        console.log('  Detail:', reply.detail)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function main() {
  console.log('🤖 Gmeowbased Bot Reply Test Suite')
  console.log(`Testing with @heycat (FID 18139)`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log()

  // Test all scenarios
  for (const scenario of TEST_SCENARIOS) {
    await testBotReply(scenario)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ All tests completed')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
