# XP Event Overlay

## Overview

The XP Event Overlay is a stunning gold holographic notification system inspired by Yu-Gi-Oh! card aesthetics. It provides immersive visual and audio feedback when users earn XP.

## Features

### Visual Design
- **Gold Holographic Effect**: Shimmering gold gradient with rainbow iridescence
- **Particle System**: Dynamic particles that burst from the XP amount
- **Smooth Animations**: Card flip, scale, and fade transitions
- **Yu-Gi-Oh! Inspired**: Premium card design with ornate borders

### Audio Feedback
- **Achievement Sound**: Satisfying audio cue on XP gain
- **Volume Control**: Respects user preferences

### Technical Implementation
- **Component**: `components/XPEventOverlay.tsx`
- **Zero Layout Shift**: Portal-based rendering
- **Performance Optimized**: GPU-accelerated animations
- **Accessibility**: Respects `prefers-reduced-motion`

## Usage

### Basic Integration

```tsx
import { XPEventOverlay } from '@/components/XPEventOverlay'

function MyComponent() {
  return (
    <>
      <XPEventOverlay />
      {/* Your content */}
    </>
  )
}
```

### Triggering XP Events

The overlay automatically listens for XP events through the global event system:

```typescript
// Dispatch XP event
window.dispatchEvent(
  new CustomEvent('xpGained', {
    detail: {
      amount: 100,
      reason: 'Quest Completed',
      timestamp: Date.now()
    }
  })
)
```

## Animation States

1. **Idle**: Hidden, waiting for XP events
2. **Enter**: Card flips in with gold shimmer
3. **Active**: Particles burst, sound plays
4. **Exit**: Fades out smoothly

## Customization

### Styling

The overlay uses Tailwind CSS and can be customized via:

```css
/* Gold gradient colors */
--xp-gold-start: #ffd700
--xp-gold-end: #ffed4e

/* Holographic rainbow */
--xp-rainbow: linear-gradient(...)
```

### Animation Duration

```typescript
// Default: 3000ms
const OVERLAY_DURATION = 3000

// Adjust in component props
<XPEventOverlay duration={4000} />
```

## Performance

- **GPU Acceleration**: Uses `transform` and `opacity` for smooth 60fps
- **No Layout Thrashing**: Fixed position, portal rendering
- **Efficient Particles**: CSS-only particle system (no canvas)
- **Lazy Audio**: Sound loads on first XP event

## Accessibility

- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Screen Readers**: Announces XP gained with `aria-live="polite"`
- **Keyboard Focus**: Does not trap focus
- **Color Contrast**: Gold text on dark background meets WCAG AA

## Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

## Related

- [Progress XP Component](./progress-xp.md)
- [Profile Stats](./profile-stats.md)
- [Leaderboard System](./leaderboard-system.md)

## Examples

### Quest Completion

```typescript
// Award XP after quest completion
async function completeQuest(questId: string) {
  const xp = await awardQuestXP(questId)
  
  window.dispatchEvent(
    new CustomEvent('xpGained', {
      detail: { amount: xp, reason: 'Quest Complete' }
    })
  )
}
```

### Daily Streak

```typescript
// Award XP for daily login streak
function awardStreakBonus(streakDays: number) {
  const bonusXP = streakDays * 10
  
  window.dispatchEvent(
    new CustomEvent('xpGained', {
      detail: { amount: bonusXP, reason: `${streakDays} Day Streak!` }
    })
  )
}
```

## Testing

```bash
# Run component tests
pnpm test XPEventOverlay

# Run E2E tests
pnpm test:e2e xp-overlay

# Visual regression tests
pnpm test:visual xp-overlay
```

## Troubleshooting

### Overlay Not Appearing
- Check that `XPEventOverlay` is mounted in your component tree
- Verify XP events are being dispatched correctly
- Check browser console for errors

### Audio Not Playing
- Ensure audio file path is correct: `/audio/xp-gain.mp3`
- Check user has not muted site audio
- Verify browser supports Web Audio API

### Performance Issues
- Reduce particle count for lower-end devices
- Disable animations with `prefers-reduced-motion`
- Check GPU acceleration is enabled in browser

## Future Enhancements

- [ ] Different overlay styles for XP tiers (bronze, silver, gold, platinum)
- [ ] Custom particle effects per achievement type
- [ ] Sound variations for different XP amounts
- [ ] Mobile haptic feedback integration
- [ ] Multiplayer XP celebration synchronization
