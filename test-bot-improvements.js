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

// Run tests
console.log('🧪 Testing Bot Reply Improvements (Option A)\n')
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
