#!/usr/bin/env node
/**
 * Quick test for bot reply improvements (Option A)
 * Tests: Neynar score display, question detection, direct answer format
 */

// Simulate the new helper functions
function formatNeynarScoreBadge(score) {
  if (score == null || score < 0.3) return ''
  
  const percentage = Math.round(score * 100)
  const badge = score >= 0.8 ? '⭐' : score >= 0.5 ? '✨' : '🌟'
  
  return `[${badge} ${percentage}]`
}

function isDirectQuestion(text) {
  const lower = text.toLowerCase().trim()
  
  if (text.includes('?')) return true
  
  const questionStarters = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should']
  if (questionStarters.some(word => lower.startsWith(word + ' '))) return true
  
  if (/^(show|tell|give)\s+(me|us)\s/i.test(text)) return true
  
  return false
}

function getIntentEmoji(intent) {
  const emojiMap = {
    'stats': '📊',
    'tips': '💰',
    'streak': '🔥',
    'quests': '⚔️',
    'quest-recommendations': '🎯',
    'leaderboards': '🏆',
    'gm': '🌅',
    'help': '💡',
    'rate-limited': '🚦',
  }
  return emojiMap[intent] || '✨'
}

// Test cases
const testCases = [
  // Score badge tests
  {
    name: 'Elite score (0.85)',
    test: () => formatNeynarScoreBadge(0.85),
    expected: '[⭐ 85]'
  },
  {
    name: 'Active score (0.67)',
    test: () => formatNeynarScoreBadge(0.67),
    expected: '[✨ 67]'
  },
  {
    name: 'Rising score (0.35)',
    test: () => formatNeynarScoreBadge(0.35),
    expected: '[🌟 35]'
  },
  {
    name: 'Low score (0.2) - hidden',
    test: () => formatNeynarScoreBadge(0.2),
    expected: ''
  },
  {
    name: 'Null score - hidden',
    test: () => formatNeynarScoreBadge(null),
    expected: ''
  },
  
  // Question detection tests
  {
    name: 'Question with ?',
    test: () => isDirectQuestion("what's my streak?"),
    expected: true
  },
  {
    name: 'Question starting with how',
    test: () => isDirectQuestion("how many tips this week"),
    expected: true
  },
  {
    name: 'Question with show me',
    test: () => isDirectQuestion("show me my stats"),
    expected: true
  },
  {
    name: 'Statement (not question)',
    test: () => isDirectQuestion("my stats are good"),
    expected: false
  },
  {
    name: 'Command without question word',
    test: () => isDirectQuestion("stats"),
    expected: false
  },
  
  // Intent emoji tests
  {
    name: 'Streak emoji',
    test: () => getIntentEmoji('streak'),
    expected: '🔥'
  },
  {
    name: 'Tips emoji',
    test: () => getIntentEmoji('tips'),
    expected: '💰'
  },
  {
    name: 'Stats emoji',
    test: () => getIntentEmoji('stats'),
    expected: '📊'
  },
]

// Example direct answer outputs
console.log('📝 Example Direct Answers:\n')
console.log('─'.repeat(60))

console.log('\n💬 STATS Question: "what\'s my stats?"')
console.log('   📊 @alice, you\'re Level 5 Silver with 1,234 pts • 7d streak [✨ 65]')
console.log('   +50 pts last 7d\n   Full profile → https://gmeowhq.art/profile')

console.log('\n💬 TIPS Question: "how many tips this week?"')
console.log('   💰 You earned 150 pts in tips this week from 5 boosts! Keep going!')
console.log('   All-time total: 2,500 pts [✨ 65]\n   Climb higher → https://gmeowhq.art/leaderboard')

console.log('\n💬 STREAK Question: "what\'s my streak?"')
console.log('   🔥 7 days and counting! Keep it up!')
console.log('   1,234 pts total [✨ 65] • Last: 2 hours ago\n   Don\'t break it → https://gmeowhq.art/Quest')

console.log('\n💬 QUEST Question: "show my quests"')
console.log('   ⚔️ You completed 3 verified quests this week worth 75 pts 💪')
console.log('   Level 5 Silver [✨ 65]\n   Next adventure → https://gmeowhq.art/Quest')

console.log('\n' + '─'.repeat(60))
console.log('\n🧪 Testing Bot Reply Improvements (Enhanced)\n')
console.log('=' .repeat(60))

let passed = 0
let failed = 0

for (const testCase of testCases) {
  try {
    const result = testCase.test()
    const success = JSON.stringify(result) === JSON.stringify(testCase.expected)
    
    if (success) {
      console.log(`✅ ${testCase.name}`)
      passed++
    } else {
      console.log(`❌ ${testCase.name}`)
      console.log(`   Expected: ${JSON.stringify(testCase.expected)}`)
      console.log(`   Got:      ${JSON.stringify(result)}`)
      failed++
    }
  } catch (error) {
    console.log(`❌ ${testCase.name}`)
    console.log(`   Error: ${error.message}`)
    failed++
  }
}

console.log('=' .repeat(60))
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n🎉 All tests passed! Ready to deploy.')
  process.exit(0)
} else {
  console.log('\n⚠️  Some tests failed. Review the output above.')
  process.exit(1)
}
