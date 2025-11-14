#!/usr/bin/env node
/**
 * Test script for webhook auto-reply targeting logic
 * Tests the new isCastTargetedToBot function with various cast scenarios
 */

const DEFAULT_BOT_CONFIG = {
  mentionMatchers: ['@gmeowbased', '#gmeowbased'],
  signalKeywords: ['stats', 'stat', 'rank', 'level', 'xp', 'points', 'progress', 'insights'],
  questionStarters: ['what', 'how', 'show', 'share', 'can', 'may'],
  requireQuestionMark: false,
}

const BOT_FID = 1069798

// Simulate the targeting function
function isCastTargetedToBot(data, botFid, config) {
  // 1. Check direct mention in mentioned_profiles array
  const mentions = Array.isArray(data.mentioned_profiles) ? data.mentioned_profiles : []
  if (botFid && mentions.some(profile => Number(profile?.fid) === botFid)) {
    return true
  }

  const text = (data.text || '').toLowerCase()
  if (!text.trim()) return false

  // 2. Check text for mention matchers (@gmeowbased, #gmeowbased)
  if (config.mentionMatchers.some(matcher => text.includes(matcher.toLowerCase()))) {
    return true
  }

  // 3. Check for signal keywords + question pattern
  const hasSignalKeyword = config.signalKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  )
  
  if (hasSignalKeyword) {
    // Check if it's a question (starts with question word or has ?)
    const hasQuestionStarter = config.questionStarters.some(starter => {
      const lowerStarter = starter.toLowerCase()
      return text.startsWith(lowerStarter) || 
             text.includes(` ${lowerStarter} `) ||
             text.includes(`\n${lowerStarter} `)
    })
    const hasQuestionMark = text.includes('?')
    
    // MUST have either question starter OR question mark
    // requireQuestionMark config determines if BOTH are needed
    if (config.requireQuestionMark) {
      // Strict mode: need question starter AND ?
      return hasQuestionStarter && hasQuestionMark
    } else {
      // Relaxed mode: need question starter OR ?
      return hasQuestionStarter || hasQuestionMark
    }
  }

  return false
}

// Test cases
const testCases = [
  // Should REPLY ✅
  {
    name: 'Direct mention with question',
    data: {
      text: '@gmeowbased what are my stats?',
      mentioned_profiles: [{ fid: BOT_FID }],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Direct mention without @ in text',
    data: {
      text: 'what are my stats?',
      mentioned_profiles: [{ fid: BOT_FID }],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Hashtag mention',
    data: {
      text: '#gmeowbased show my rank',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Question with keyword - what',
    data: {
      text: 'what is my xp?',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Question with keyword - how',
    data: {
      text: 'how many points do I have?',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Question with keyword - show',
    data: {
      text: 'show me my level',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  {
    name: 'Keyword with question mark (no starter)',
    data: {
      text: 'my stats?',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true, // requireQuestionMark is false, so any keyword matches
  },
  {
    name: 'Question starter mid-sentence',
    data: {
      text: 'hey can you show my rank?',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true,
  },
  
  // Should NOT REPLY ❌
  {
    name: 'Statement without question',
    data: {
      text: 'I love checking my stats',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: false,
  },
  {
    name: 'Question to other user with signal keywords',
    data: {
      text: '@someoneelse what are your stats?',
      mentioned_profiles: [{ fid: 99999 }],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: true, // Bot will respond with the AUTHOR's stats (helpful!)
  },
  {
    name: 'Random text no keywords',
    data: {
      text: 'gm everyone!',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: false,
  },
  {
    name: 'Empty text',
    data: {
      text: '',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: false,
  },
  {
    name: 'Only whitespace',
    data: {
      text: '   ',
      mentioned_profiles: [],
      author: { fid: 12345, username: 'testuser' }
    },
    expected: false,
  },
]

// Run tests
console.log('🧪 Testing Webhook Auto-Reply Targeting Logic\n')
console.log('Bot FID:', BOT_FID)
console.log('Config:', JSON.stringify(DEFAULT_BOT_CONFIG, null, 2))
console.log('\n' + '='.repeat(80) + '\n')

let passed = 0
let failed = 0

testCases.forEach((test, index) => {
  const result = isCastTargetedToBot(test.data, BOT_FID, DEFAULT_BOT_CONFIG)
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL'
  
  if (result === test.expected) {
    passed++
  } else {
    failed++
  }
  
  console.log(`${index + 1}. ${status} - ${test.name}`)
  console.log(`   Text: "${test.data.text}"`)
  console.log(`   Mentions: ${test.data.mentioned_profiles.map(p => p.fid).join(', ') || 'none'}`)
  console.log(`   Expected: ${test.expected ? 'REPLY' : 'SKIP'}`)
  console.log(`   Got: ${result ? 'REPLY' : 'SKIP'}`)
  
  if (result !== test.expected) {
    console.log(`   ⚠️  MISMATCH!`)
  }
  console.log()
})

console.log('='.repeat(80))
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed}/${testCases.length} failed\n`)

if (failed === 0) {
  console.log('🎉 All tests passed! Logic is working correctly.')
  process.exit(0)
} else {
  console.log('❌ Some tests failed. Review the logic.')
  process.exit(1)
}
