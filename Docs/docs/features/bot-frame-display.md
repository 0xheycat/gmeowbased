# Bot Frame Display

## Overview

The Bot Frame Display system enables the Gmeow bot to share interactive Farcaster frames in response to user mentions. The bot intelligently detects intent and serves the appropriate frame with full metadata compliance.

## Features

### Intent Detection
- **Smart Parsing**: Analyzes user messages to determine intent
- **Multi-Intent Support**: Handles quest, guild, leaderboard, mint, and profile intents
- **Context Awareness**: Considers user history and current state
- **Fallback Handling**: Default responses when intent is unclear

### Frame Types

#### Quest Frames
- Display quest details with progress
- Show requirements and rewards
- Include "Start Quest" button
- Mint achievement badge button

#### Guild Frames
- Show guild information and members
- Display guild leaderboard
- "Join Guild" call-to-action
- Mint guild badge option

#### Leaderboard Frames
- Real-time rankings display
- User position highlight
- Filter by timeframe (daily, weekly, all-time)
- Mint rank card button

#### Profile Frames
- User stats and achievements
- NFT badge collection
- XP and level progression
- Social links

### Technical Implementation
- **Component**: `lib/bot-frame-builder.ts`
- **Compliance**: Farcaster Frame v1.2 specification
- **Image Generation**: Dynamic OG images with Next.js Image API
- **URL Handling**: Clean, shareable frame URLs

## Frame Builder API

### Basic Usage

```typescript
import { buildFrameForIntent } from '@/lib/bot-frame-builder'

const frame = await buildFrameForIntent({
  intent: 'quest',
  targetId: 'quest-123',
  userId: 'user-456'
})
```

### Frame Structure

```typescript
interface FrameData {
  version: 'vNext'
  image: string
  imageAspectRatio: '1:1' | '1.91:1'
  buttons: FrameButton[]
  input?: FrameInput
  postUrl: string
  state?: Record<string, any>
}

interface FrameButton {
  label: string
  action: 'post' | 'link' | 'mint' | 'post_redirect'
  target?: string
}
```

### Intent Types

```typescript
type FrameIntent = 
  | 'quest'
  | 'guild' 
  | 'leaderboard'
  | 'profile'
  | 'mint'
  | 'share'
  | 'help'
```

## Intent Detection

### Message Analysis

The bot analyzes user messages using pattern matching:

```typescript
// Quest intent
if (message.includes('quest') || message.includes('mission')) {
  return { intent: 'quest', confidence: 0.9 }
}

// Guild intent
if (message.includes('guild') || message.includes('team')) {
  return { intent: 'guild', confidence: 0.9 }
}

// Leaderboard intent
if (message.includes('rank') || message.includes('leaderboard')) {
  return { intent: 'leaderboard', confidence: 0.8 }
}
```

### Context Enhancement

```typescript
async function detectIntentWithContext(
  message: string,
  userId: string,
  recentCasts: Cast[]
) {
  const baseIntent = detectIntent(message)
  const userContext = await getUserContext(userId)
  
  // Enhance with user's active quests, guild membership, etc.
  return enhanceIntent(baseIntent, userContext)
}
```

## Frame Routes

### Quest Frame Endpoint

```typescript
// app/api/frame/quest/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const quest = await getQuest(params.id)
  return buildQuestFrame(quest)
}
```

### Frame Metadata

```html
<!-- Frame v1.2 metadata -->
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://..." />
<meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
<meta property="fc:frame:button:1" content="Start Quest" />
<meta property="fc:frame:button:1:action" content="post" />
<meta property="fc:frame:button:1:target" content="https://..." />
<meta property="fc:frame:button:2" content="Mint Badge" />
<meta property="fc:frame:button:2:action" content="mint" />
<meta property="fc:frame:button:2:target" content="eip155:8453:..." />
```

## Bot Integration

### Webhook Handler

```typescript
// app/api/webhook/route.ts
export async function POST(req: Request) {
  const event = await req.json()
  
  if (event.type === 'cast.created' && isMention(event)) {
    const intent = await detectIntent(event.data.text)
    const frame = await buildFrameForIntent(intent)
    
    await replyWithFrame(event.data.hash, frame)
  }
}
```

### Reply with Frame

```typescript
async function replyWithFrame(
  parentHash: string,
  frame: FrameData
) {
  const frameUrl = await uploadFrame(frame)
  
  await neynarClient.publishCast({
    text: '', // Frame embeds don't need text
    embeds: [frameUrl],
    parent: parentHash,
    signer_uuid: BOT_SIGNER_UUID
  })
}
```

## Image Generation

### Dynamic OG Images

```typescript
// app/api/og/quest/[id]/route.tsx
import { ImageResponse } from 'next/og'

export async function GET(req: Request) {
  const { id } = params
  const quest = await getQuest(id)
  
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(...)',
      }}>
        <h1>{quest.title}</h1>
        <p>{quest.description}</p>
        <div>Reward: {quest.reward_xp} XP</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
```

## Testing

### Unit Tests

```typescript
describe('Bot Frame Builder', () => {
  it('should detect quest intent', () => {
    const intent = detectIntent('show me active quests')
    expect(intent.type).toBe('quest')
  })
  
  it('should build valid frame metadata', () => {
    const frame = buildQuestFrame(mockQuest)
    expect(frame.version).toBe('vNext')
    expect(frame.buttons).toHaveLength(2)
  })
})
```

### E2E Tests

```typescript
test('bot replies with frame on mention', async () => {
  // Simulate mention
  await sendMention('@gmeow show me quests')
  
  // Wait for bot reply
  const reply = await waitForReply()
  
  // Verify frame embed
  expect(reply.embeds[0]).toContain('/frame/quest')
})
```

## Frame URLs

### URL Structure

```
https://gmeow.art/frame/[type]/[id]

Examples:
- https://gmeow.art/frame/quest/quest-123
- https://gmeow.art/frame/guild/guild-456
- https://gmeow.art/frame/leaderboard/daily
- https://gmeow.art/frame/profile/user-789
```

### Query Parameters

```
?userId=user-123       # User context
&action=view          # Action tracking
&ref=bot-mention      # Referral source
```

## Performance

- **Image Caching**: OG images cached at CDN edge
- **Intent Detection**: <50ms average response time
- **Frame Generation**: <100ms per frame
- **Bot Response**: <2s total latency

## Best Practices

### Intent Detection
1. Use multiple signals (keywords, context, history)
2. Provide confidence scores for ambiguous cases
3. Default to helpful fallback responses
4. Log intents for continuous improvement

### Frame Design
1. Keep button labels concise (<20 characters)
2. Use high-contrast colors for readability
3. Include clear call-to-action
4. Test on mobile frame viewers

### Error Handling
1. Graceful degradation for missing data
2. Retry logic for API failures
3. User-friendly error messages
4. Fallback to text-only responses

## Related

- [Bot Auto-Reply System](./bot-auto-reply.md)
- [Frame API Reference](../api/frames.md)
- [Mint Buttons](./frame-mint-buttons.md)
- [Share URLs](./share-urls.md)

## Troubleshooting

### Frame Not Displaying
- Verify frame metadata compliance with validator
- Check image URL is publicly accessible
- Ensure buttons have valid actions and targets
- Test frame in Warpcast frame debugger

### Intent Not Detected
- Add more keyword patterns to detection logic
- Check confidence threshold settings
- Review recent failed detections in logs
- Consider user context enrichment

### Slow Response Times
- Optimize image generation pipeline
- Implement frame template caching
- Use CDN for static frame components
- Monitor database query performance
