# Bot Reply Improvements Plan

**Date:** November 25, 2025  
**Status:** Planning & Design  
**Goal:** Enhance bot feed replies with better question detection, Neynar score display, and personalized responses

---

## Current State Analysis

### ✅ What's Working Well
- Agent auto-reply system with intent detection (`lib/agent-auto-reply.ts`)
- Support for multiple intents: stats, tips, streak, quests, leaderboards, gm, help
- Timeframe parsing (last 24h, yesterday, this week, last 7 days, etc.)
- Rate limiting (5 requests/min per user)
- Multilingual support (language detection + translations)
- Conversation context tracking
- Caching system for stats and events
- Neynar score filtering (min 0.3 threshold)
- Frame embeds based on intent

### ⚠️ Areas for Improvement

1. **Question Detection** - Limited to basic pattern matching
2. **Neynar Score Display** - Hidden in metadata, not shown to users
3. **Contextual Responses** - Could be more personalized based on user history
4. **Answer Quality** - Sometimes too generic, not directly answering questions
5. **Engagement Hooks** - Missing personality and engaging elements

---

## Proposed Enhancements

### 1. 🎯 Improved Question Detection

**Current Implementation:**
```typescript
// Simple intent detection based on keywords
if (/\btips?\b/.test(lower)) return { type: 'tips', timeframe }
if (/\bstreak\b/.test(lower)) return { type: 'streak', timeframe }
```

**Enhanced Approach:**
```typescript
interface QuestionAnalysis {
  isQuestion: boolean
  questionType: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which' | 'none'
  subject: string | null        // "my streak", "tips", "rank", etc.
  intent: AgentIntentType
  confidence: number             // 0-1 confidence score
  needsDirectAnswer: boolean     // true if user expects specific data
}

function analyzeQuestion(text: string): QuestionAnalysis {
  const lower = text.toLowerCase()
  
  // Question markers
  const hasQuestionMark = text.includes('?')
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'should', 'could', 'would']
  const startsWithQuestion = questionWords.some(word => lower.startsWith(word))
  
  // Question type detection
  let questionType: QuestionAnalysis['questionType'] = 'none'
  if (/^what\s/i.test(text)) questionType = 'what'
  else if (/^how\s/i.test(text)) questionType = 'how'
  else if (/^why\s/i.test(text)) questionType = 'why'
  // ... etc
  
  // Subject extraction
  const subject = extractQuestionSubject(text, questionType)
  
  // Confidence scoring
  let confidence = 0.5
  if (hasQuestionMark) confidence += 0.3
  if (startsWithQuestion) confidence += 0.2
  
  return {
    isQuestion: hasQuestionMark || startsWithQuestion,
    questionType,
    subject,
    intent: detectIntentFromQuestion(text, subject),
    confidence,
    needsDirectAnswer: hasQuestionMark && startsWithQuestion
  }
}
```

**Examples:**
- "what's my streak?" → `{ isQuestion: true, type: 'what', subject: 'streak', intent: 'streak', needsDirectAnswer: true }`
- "how many tips did I get this week?" → `{ isQuestion: true, type: 'how', subject: 'tips', intent: 'tips', needsDirectAnswer: true }`
- "show my stats" → `{ isQuestion: false, type: 'none', subject: 'stats', intent: 'stats', needsDirectAnswer: false }`

---

### 2. 📊 Neynar Score Display

**Current:** Score only used for filtering, not displayed to users

**Enhanced:** Show score as social proof and engagement metric

**Approach A: Badge/Tier Display**
```typescript
function formatNeynarScoreBadge(score: number | null): string {
  if (score === null) return ''
  
  // Tier mapping
  if (score >= 0.8) return '⭐ Elite' // Gold star
  if (score >= 0.5) return '✨ Active' // Sparkles
  if (score >= 0.3) return '🌟 Rising' // Glowing star
  return '⚡ Rookie' // Lightning
}

// Usage in reply
const scoreDisplay = formatNeynarScoreBadge(neynarScore)
const message = `gm ${handle}! ${scoreDisplay} | Level ${stats.level} ${stats.tierName}`
```

**Approach B: Score with Context**
```typescript
function formatNeynarScoreWithContext(score: number | null, username: string): string {
  if (score === null) return ''
  
  const percentage = Math.round(score * 100)
  
  if (score >= 0.8) {
    return `💎 Neynar ${percentage}/100 - You're in the top tier of Farcaster users!`
  }
  if (score >= 0.5) {
    return `✨ Neynar ${percentage}/100 - Strong community presence!`
  }
  if (score >= 0.3) {
    return `🌱 Neynar ${percentage}/100 - Building your reputation!`
  }
  return `⚡ Neynar ${percentage}/100 - Keep engaging to grow!`
}
```

**Approach C: Inline (Recommended for brevity)**
```typescript
function formatScoreInline(score: number | null): string {
  if (score === null || score < 0.3) return ''
  const badge = score >= 0.8 ? '⭐' : score >= 0.5 ? '✨' : '🌟'
  return `[${badge} ${(score * 100).toFixed(0)}]`
}

// Example output:
// "gm @user! [✨ 67] Level 5 Silver with 1,234 pts. +50 pts last 7d."
```

---

### 3. 🎭 Personalized Response System

**Add personality traits based on user behavior:**

```typescript
interface UserPersonality {
  archetype: 'grinder' | 'explorer' | 'social' | 'competitive' | 'casual'
  traits: string[]
  customGreeting: string
}

function determineUserPersonality(stats: BotUserStats, recentActivity: SummarisedEvents): UserPersonality {
  // High streak, consistent activity
  if (stats.streak > 14 && stats.totalPoints > 5000) {
    return {
      archetype: 'grinder',
      traits: ['consistent', 'dedicated', 'achievement-focused'],
      customGreeting: 'The legend returns'
    }
  }
  
  // Many different quest types, exploring features
  if (stats.questsCompleted > 20 && stats.streak < 7) {
    return {
      archetype: 'explorer',
      traits: ['curious', 'diverse', 'experimental'],
      customGreeting: 'Always on a new adventure'
    }
  }
  
  // High tips received/given
  if (stats.tipsAll > 2000) {
    return {
      archetype: 'social',
      traits: ['generous', 'connected', 'community-driven'],
      customGreeting: 'Community champion'
    }
  }
  
  // Check leaderboard rank frequently
  return {
    archetype: 'competitive',
    traits: ['ambitious', 'rank-focused', 'performance-driven'],
    customGreeting: 'Climbing the ranks'
  }
}
```

---

### 4. 💬 Context-Aware Responses

**Track conversation history for better follow-ups:**

```typescript
interface ConversationMemory {
  lastIntent: AgentIntentType
  lastAskedAbout: string[]
  answersSatisfied: boolean
  followUpCount: number
  lastInteraction: Date
}

// Enhanced response generation
function buildContextualResponse(
  question: QuestionAnalysis,
  stats: BotUserStats,
  context: ConversationMemory | null
): string {
  // Follow-up detection
  if (context && isFollowUpQuestion(question, context)) {
    return buildFollowUpResponse(question, stats, context)
  }
  
  // First-time user detection
  if (!context || context.followUpCount === 0) {
    return buildWelcomeResponse(question, stats)
  }
  
  // Regular response
  return buildStandardResponse(question, stats)
}

function isFollowUpQuestion(question: QuestionAnalysis, context: ConversationMemory): boolean {
  // "and what about..." or "how about..." patterns
  if (question.text.match(/^(and|but|how about|what about)/i)) return true
  
  // Asked within 5 minutes
  if (Date.now() - context.lastInteraction.getTime() < 5 * 60 * 1000) {
    // Related to same topic
    if (question.intent === context.lastIntent) return true
  }
  
  return false
}
```

---

### 5. 🚀 Direct Answer Format

**For questions, prioritize the direct answer first:**

**Current:**
```
gm @user! Level 5 Silver with 1,234 pts. +50 pts last 7d. Streak 3d. Profile → https://...
```

**Enhanced for "what's my streak?":**
```
🔥 Your streak: 3 days!

Keep it going @user! [✨ 67] Level 5 Silver | 1,234 pts total
Last GM: 2 hours ago → https://gmeowhq.art/Quest
```

**Enhanced for "how many tips this week?":**
```
💰 Tips this week: 150 pts across 5 boosts!

Looking good @user! [✨ 67] All-time tips: 850 pts
Leaderboard → https://gmeowhq.art/leaderboard
```

**Template:**
```typescript
function buildDirectAnswerFormat(
  question: QuestionAnalysis,
  answer: string,
  context: string,
  cta: string
): string {
  // Start with emoji that matches intent
  const emoji = getIntentEmoji(question.intent)
  
  // Direct answer first (bolded with emphasis)
  const direct = `${emoji} ${answer}!`
  
  // Context (stats, user info)
  const contextLine = context ? `\n\n${context}` : ''
  
  // Call to action (link)
  const ctaLine = cta ? `\n${cta}` : ''
  
  return trimToLimit(direct + contextLine + ctaLine)
}
```

---

## Implementation Plan

### Phase 1: Question Analysis Enhancement
**Files to modify:**
- `lib/agent-auto-reply.ts` - Add `analyzeQuestion()` function
- `lib/bot-config-types.ts` - Add question analysis types

**Tasks:**
1. Create `QuestionAnalysis` type definition
2. Implement `analyzeQuestion()` function
3. Extract question subjects (streak, tips, rank, etc.)
4. Calculate confidence scores
5. Add unit tests for question patterns

### Phase 2: Neynar Score Display
**Files to modify:**
- `lib/agent-auto-reply.ts` - Add score formatting functions
- `lib/rarity-tiers.ts` - Extend with Neynar score tiers

**Tasks:**
1. Create score badge/tier mapping
2. Add `formatNeynarScoreBadge()` helper
3. Integrate score display into all response messages
4. Add score explanation to help text
5. Test score display across different tiers

### Phase 3: Personalization System
**Files to modify:**
- `lib/agent-auto-reply.ts` - Add personality detection
- `lib/bot-cache.ts` - Cache personality profiles

**Tasks:**
1. Define user archetypes (grinder, explorer, social, competitive, casual)
2. Implement `determineUserPersonality()` based on stats
3. Create archetype-specific greeting variants
4. Add personality hints to response tone
5. Cache personality profiles for performance

### Phase 4: Direct Answer Format
**Files to modify:**
- `lib/agent-auto-reply.ts` - Refactor all `build*Message()` functions

**Tasks:**
1. Create `buildDirectAnswerFormat()` template
2. Refactor `buildStatsMessage()` for questions
3. Refactor `buildTipsMessage()` for questions
4. Refactor `buildStreakMessage()` for questions
5. Add intent-specific emojis
6. Test character limits with new format

### Phase 5: Context-Aware Follow-ups
**Files to modify:**
- `lib/bot-cache.ts` - Extend conversation context
- `lib/agent-auto-reply.ts` - Add follow-up detection

**Tasks:**
1. Extend `ConversationMemory` with more fields
2. Implement `isFollowUpQuestion()` detection
3. Create follow-up response variants
4. Add first-time user welcome flow
5. Test multi-turn conversations

---

## Testing Strategy

### Unit Tests
```typescript
// test: question detection
expect(analyzeQuestion("what's my streak?")).toMatchObject({
  isQuestion: true,
  questionType: 'what',
  subject: 'streak',
  intent: 'streak',
  needsDirectAnswer: true
})

// test: score badge
expect(formatNeynarScoreBadge(0.85)).toBe('⭐ Elite')
expect(formatNeynarScoreBadge(0.6)).toBe('✨ Active')

// test: personality
const grinderStats = { streak: 20, totalPoints: 10000, questsCompleted: 15 }
expect(determineUserPersonality(grinderStats).archetype).toBe('grinder')
```

### Integration Tests
```typescript
// test: direct answer for streak question
const result = await buildAgentAutoReply({
  fid: 12345,
  text: "what's my streak?",
  username: "testuser"
}, config)

expect(result.ok).toBe(true)
expect(result.text).toContain('🔥 Your streak:')
expect(result.text).toContain('days!')
```

### Manual Testing Scenarios
1. **Question Variations**
   - "what's my streak?"
   - "how many tips this week?"
   - "show me my rank"
   - "can you tell me my XP?"

2. **Score Display**
   - User with 0.85 Neynar score (⭐ Elite)
   - User with 0.6 Neynar score (✨ Active)
   - User with 0.35 Neynar score (🌟 Rising)

3. **Personality Types**
   - Grinder: 30-day streak, 20k pts
   - Explorer: 50 quests, low streak
   - Social: 5k tips given/received
   - Competitive: Frequent leaderboard checks

4. **Follow-up Conversations**
   - Ask about stats, then ask about streak
   - Ask about tips, then ask about quests
   - Multiple questions in 5-minute window

---

## Example Outputs (Before/After)

### Scenario 1: Streak Question

**Before:**
```
gm @alice! Level 5 Silver on deck with 1,234 pts. Streak 7d. 
Last GM 2 hours ago. Profile → https://gmeowhq.art/profile
```

**After:**
```
🔥 Your streak: 7 days strong!

Impressive @alice! [✨ 65] Level 5 Silver | 1,234 pts
Last GM: 2 hours ago. Keep it rolling → https://gmeowhq.art/Quest
```

---

### Scenario 2: Tips This Week

**Before:**
```
gm @bob! Tips last 7d: 150 pts across 3 boosts. 
All-time tips 850 pts. Leaderboard → https://gmeowhq.art/leaderboard
```

**After:**
```
💰 This week's tips: 150 pts from 3 generous boosts!

Solid week @bob! [⭐ 82] All-time: 850 pts
You're in the top 10% → https://gmeowhq.art/leaderboard
```

---

### Scenario 3: First-Time User (Welcome)

**Before:**
```
gm friend! 👋 Link your wallet to unlock stats & insights. 
Get started → https://gmeowhq.art/profile
```

**After:**
```
gm friend! 👋 Welcome to Gmeow HQ!

I can help you track your streak, tips, quests & rank. 
First, link your wallet to get started → https://gmeowhq.art/profile

Try asking: "what's my streak?" or "show my stats"
```

---

### Scenario 4: Competitive User (Personality)

**User Profile:** High rank, frequent leaderboard checks, 15k points

**Before:**
```
gm @charlie! Level 8 Gold shell with 15,234 pts. 
Scope your rank → https://gmeowhq.art/leaderboard
```

**After:**
```
The climb continues! 💪 [⭐ 88]

@charlie, you're at #47 with 15,234 pts (Level 8 Gold)
+350 pts this week - closing in on #40! → https://gmeowhq.art/leaderboard
```

---

## Technical Considerations

### Performance
- ✅ Use existing cache system for personality profiles
- ✅ Question analysis adds <10ms overhead
- ✅ Score display is just string formatting
- ⚠️ Watch for character limit with richer responses

### Backward Compatibility
- ✅ All existing intents still work
- ✅ Fallback to old format if analysis fails
- ✅ No breaking changes to webhook API
- ✅ Metadata still includes all debug info

### Edge Cases
- Empty/null Neynar scores → Hide badge
- Very long usernames → Truncate handle
- Character limit exceeded → Trim context first, keep direct answer
- Follow-up timeout → Treat as new conversation

---

## Rollout Strategy

### Stage 1: Canary (10% of users)
- Deploy question analysis + score display
- Monitor error rates
- Collect user feedback via admin dashboard

### Stage 2: Gradual Rollout (50%)
- Add personalization if Stage 1 successful
- Monitor character limit issues
- A/B test response formats

### Stage 3: Full Rollout (100%)
- Deploy all features
- Update documentation
- Add to admin panel insights

---

## Success Metrics

### Quantitative
- **Response time:** <500ms (95th percentile)
- **Answer relevance:** 80%+ of questions get direct answers
- **Character usage:** 80-95% of limit (engaging but not truncated)
- **Cache hit rate:** 70%+ for personality profiles
- **Error rate:** <1% for question analysis

### Qualitative
- Users say "that answered my question"
- More follow-up questions (shows engagement)
- Positive mentions of bot personality
- Higher retention of bot interactions

---

## Documentation Updates

**Files to create/update:**
1. `docs/features/bot-qa-system.md` - Question analysis documentation
2. `docs/features/bot-personality.md` - Personality system guide
3. `README.md` - Update bot capabilities section
4. `lib/agent-auto-reply.ts` - Inline code comments

**Admin Panel:**
- Add "Question Analysis" tab showing detected intents
- Add "Personality Insights" showing user archetypes
- Add "Response Preview" tool for testing

---

## Next Steps

**Choose your approach:**

**Option A: Quick Win (1-2 hours)**
- Add Neynar score inline display
- Improve direct answer format for questions
- Deploy to production

**Option B: Full Enhancement (1-2 days)**
- Implement all 5 phases
- Add comprehensive tests
- Gradual rollout with monitoring

**Option C: Iterative (1 week)**
- Phase 1: Question analysis (Day 1-2)
- Phase 2: Score display (Day 3)
- Phase 3: Personalization (Day 4-5)
- Phase 4-5: Follow-ups & testing (Day 6-7)

**Recommended: Option A for immediate improvement, then iterate to Option C**

---

## Questions for You

1. **Score display preference:** Inline badge `[✨ 67]`, full tier `✨ Active (67)`, or both?
2. **Personality priority:** Which archetypes matter most for your community?
3. **Response tone:** Keep technical ("pts", "XP") or more casual ("points", "experience")?
4. **Follow-up window:** 5 minutes or 15 minutes for conversation context?
5. **Emoji usage:** Current level OK or tone it down for professionalism?

Let me know which option you prefer and I'll implement it! 🚀
