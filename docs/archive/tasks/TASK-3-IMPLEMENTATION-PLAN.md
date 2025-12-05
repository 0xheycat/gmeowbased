# Task 3: Framer Motion Animations - Implementation Plan

## Tested Patterns from Templates

### Pattern 1: Card Hover Lift (gmeowbased0.6/collection-card.tsx)
```tsx
// Original pattern:
className="group relative overflow-hidden rounded-lg transition-transform hover:-translate-y-1"

// Enhanced with Framer Motion:
<motion.div
  whileHover={{ y: -4, transition: { duration: 0.2 } }}
  className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow"
/>
```

### Pattern 2: Staggered List Entry (gacha-animation.css)
```tsx
// CSS pattern:
.gacha-stagger-item-1 { animation-delay: 0.1s; }
.gacha-stagger-item-2 { animation-delay: 0.2s; }
.gacha-stagger-item-3 { animation-delay: 0.3s; }

// Framer Motion:
{items.map((item, index) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.3, ease: 'easeOut' }}
  />
))}
```

### Pattern 3: Chart Entrance Animation (gacha-animation.css)
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
>
  <ResponsiveContainer>...</ResponsiveContainer>
</motion.div>
```

### Pattern 4: Filter Panel Expand/Collapse (AnimatePresence)
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Filter content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 5: Button Micro-interactions (PreviewCard.tsx)
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
  Click me
</motion.button>
```

### Pattern 6: Reduced Motion Support (useReducedMotion)
```tsx
import { useReducedMotion } from 'framer-motion';

const prefersReducedMotion = useReducedMotion();

<motion.div
  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

## Implementation Checklist

### File 1: QuestAnalyticsDashboard.tsx
- [ ] Add framer-motion import
- [ ] Wrap metric cards in motion.div with stagger (0.1s delay each)
- [ ] Add whileHover={{ y: -4 }} to metric cards
- [ ] Animate chart containers (initial + animate)
- [ ] Add useReducedMotion support

### File 2: QuestManagementTable.tsx
- [ ] Add framer-motion import
- [ ] Staggered table row entry (0.05s delay per row)
- [ ] Animate header row
- [ ] Add AnimatePresence for row removal
- [ ] Add useReducedMotion support

### File 3: QuestFilters.tsx
- [ ] Add framer-motion import
- [ ] AnimatePresence for expanded panel
- [ ] Animate filter chips (stagger on appear)
- [ ] Button hover/tap animations
- [ ] Add useReducedMotion support

### File 4: empty-states.tsx
- [ ] Add framer-motion import
- [ ] Fade-in animation for empty states
- [ ] Button hover animations
- [ ] Icon bounce animation
- [ ] Add useReducedMotion support

### File 5: app/quests/manage/page.tsx
- [ ] Add page-level entrance animation
- [ ] Stagger section appearance

## Animation Timing

```
0ms    - Page loads
0-100ms - Metric cards stagger in (4 cards × 100ms = 400ms total)
500ms  - First chart appears
600ms  - Second chart appears (left)
700ms  - Third chart appears (right)
```

## Performance Considerations

1. **GPU Acceleration**: Use transform/opacity only
2. **Will-change**: Framer Motion handles automatically
3. **Reduced Motion**: Support prefers-reduced-motion
4. **Mobile**: Lighter animations on mobile (optional)

## Testing Checklist

- [ ] Desktop Chrome: 60fps animations
- [ ] Mobile Safari: Smooth performance
- [ ] Firefox: No stutter
- [ ] Reduced motion: Animations disabled
- [ ] Dark mode: Animations work correctly
