# Frames Page - Visual Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (Sticky)                                                 │
│ ┌─────────┐                                   ┌────────────┐   │
│ │ 🐾 Gmeow│  Guild Quests Leaderboard ... →   │   Frames   │   │
│ └─────────┘                                   └────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                     │
│                                                                 │
│  ┌───┐                                                         │
│  │ 📤 │  Your Frames                                           │
│  └───┘  Share your achievements on Farcaster                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │  🏆 Badge│ │ │  🏆 Leader│ │ │  🎯 Points│ │
│ │Collection│ │ │  board   │ │ │  Balance │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │
│              │              │              │
│ Showcase     │ Share your   │ Display your │
│ your earned  │ rank and     │ total points │
│ badges       │ stats        │ and rewards  │
│              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │ 📋 Copy  │ │ │ 📋 Copy  │ │ │ 📋 Copy  │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │
│ ┌─────┬─────┐ │ ┌─────┬─────┐ │ ┌─────┬─────┐ │
│ │🔍Pre│📤Shr│ │ │🔍Pre│📤Shr│ │ │🔍Pre│📤Shr│ │
│ └─────┴─────┘ │ └─────┴─────┘ │ └─────┴─────┘ │
│              │              │              │
├──────────────┼──────────────┼──────────────┤
│ (Repeat for GM, Guild, Referral, Stats, Verify) │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INFO BOX                                                        │
│                                                                 │
│ 💡 How to Share Frames on Farcaster                           │
│                                                                 │
│ 1. Click Copy URL to copy your personalized frame link        │
│ 2. Click Preview to see how your frame looks before sharing   │
│ 3. Click Share to post directly to Farcaster with one click   │
│ 4. Your frames update automatically as you earn achievements! │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Individual Frame Card (Detailed)

```
┌─────────────────────────────────────────┐
│ ░░░░░░░░░░░░ (Gradient on hover) ░░░░░░│
│                                         │
│  ┌─────┐                               │
│  │ 🏆  │  (Icon with gradient bg)      │
│  └─────┘                               │
│                                         │
│  Badge Collection (Title - 2xl bold)   │
│  Showcase your earned badges           │
│  and achievements (Description)        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ✓ Copied! / 📋 Copy URL        │ │ ← Changes on click
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────┬───────────────────┐ │
│  │ 🔍 Preview   │  📤 Share        │ │
│  └───────────────┴───────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## Color Schemes per Frame

### Badge Collection
```
Gradient: Yellow → Orange
Background: from-yellow-500/20 to-orange-500/20
Icon: 🏆 Award (Gold)
Border Hover: yellow-500/50
```

### Leaderboard
```
Gradient: Purple → Pink
Background: from-purple-500/20 to-pink-500/20
Icon: 🏆 Trophy (Purple)
Border Hover: purple-500/50
```

### Points Balance
```
Gradient: Blue → Cyan
Background: from-blue-500/20 to-cyan-500/20
Icon: 🎯 Target (Blue)
Border Hover: blue-500/50
```

### GM Streak
```
Gradient: Amber → Yellow
Background: from-amber-500/20 to-yellow-500/20
Icon: ☀️ Sun (Yellow)
Border Hover: amber-500/50
```

### Guild Membership
```
Gradient: Green → Emerald
Background: from-green-500/20 to-emerald-500/20
Icon: 👥 Users (Green)
Border Hover: green-500/50
```

### Referral Stats
```
Gradient: Pink → Rose
Background: from-pink-500/20 to-rose-500/20
Icon: 🎁 Gift (Pink)
Border Hover: pink-500/50
```

### Onchain Stats
```
Gradient: Indigo → Violet
Background: from-indigo-500/20 to-violet-500/20
Icon: 📈 TrendingUp (Indigo)
Border Hover: indigo-500/50
```

### Verify Account
```
Gradient: Teal → Cyan
Background: from-teal-500/20 to-cyan-500/20
Icon: ✓ CheckCircle (Teal)
Border Hover: teal-500/50
```

## Interaction States

### Copy URL Button
**Default State:**
```
┌────────────────────┐
│ 📋 Copy URL       │ ← Gray background, gray border
└────────────────────┘
```

**Hover State:**
```
┌────────────────────┐
│ 📋 Copy URL       │ ← Darker gray, lighter border
└────────────────────┘
```

**Copied State (2 seconds):**
```
┌────────────────────┐
│ ✓ Copied!         │ ← Green background, green border
└────────────────────┘
```

### Preview Button
```
┌──────────────┐
│ 🔍 Preview  │ ← Gray background, gray border
└──────────────┘
   ↓ Click
Opens new tab → /frame/badge/123456
```

### Share Button
```
┌──────────────┐
│ 📤 Share    │ ← Purple background, purple border
└──────────────┘
   ↓ Click
Opens Warpcast Composer:
https://warpcast.com/~/compose
  ?text=Check%20out%20my%20Badge%20Collection!
  &embeds[]=https://gmeowbased.com/frame/badge/123456
```

## Mobile View (< 768px)

```
┌─────────────────────────────┐
│ HEADER                      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 📤 Your Frames              │
│ Share your achievements     │
└─────────────────────────────┘

┌─────────────────────────────┐
│  ┌───┐                      │
│  │🏆 │ Badge Collection     │
│  └───┘                      │
│  Showcase your earned badges│
│                             │
│  ┌─────────────────────┐   │
│  │ 📋 Copy URL        │   │
│  └─────────────────────┘   │
│  ┌─────────┬───────────┐   │
│  │🔍Preview│📤 Share  │   │
│  └─────────┴───────────┘   │
└─────────────────────────────┘

┌─────────────────────────────┐
│  ┌───┐                      │
│  │🏆 │ Leaderboard          │
│  └───┘                      │
│  ...                        │
└─────────────────────────────┘

(Stack continues for all 8 frames)
```

## Profile Page Integration

### Profile Header - Before
```
┌─────────────────────────────────────────────┐
│ Cover Image                                 │
│                         ┌──────────────┐   │
│                         │ Edit Profile │   │
│                         └──────────────┘   │
└─────────────────────────────────────────────┘
```

### Profile Header - After
```
┌─────────────────────────────────────────────┐
│ Cover Image                                 │
│    ┌───────────────┬──────────────┐        │
│    │📤 Share Frames│ Edit Profile │        │
│    └───────────────┴──────────────┘        │
└─────────────────────────────────────────────┘
```

**Note:** "Share Frames" button only visible to profile owner

## User Flow Example

### Step 1: User visits their profile
```
/profile/123456
↓
Sees "Share Frames" button
```

### Step 2: Click "Share Frames"
```
Redirects to → /frames
↓
Gallery loads with 8 frame cards
Each card personalized with FID 123456
```

### Step 3: Choose frame to share
```
User hovers over "Badge Collection" card
↓
Gradient background appears
Card lifts slightly (shadow effect)
```

### Step 4: Copy URL
```
Click "Copy URL"
↓
Clipboard: https://gmeowbased.com/frame/badge/123456
Button shows: "✓ Copied!" (green, 2 seconds)
```

### Step 5: Share to Farcaster
```
Click "Share"
↓
Opens Warpcast composer in new tab
Pre-filled text: "Check out my Badge Collection!"
Embedded frame URL auto-renders as interactive frame
User edits text if desired, then posts
↓
Cast appears in Farcaster feed with:
- Custom text
- Interactive badge frame image
- Buttons: "View Badge", "View Profile"
```

## Animation Timeline

### Page Load
```
0ms:  Header appears (instant)
0ms:  Gallery container appears
100ms: Card 1 (Badge) fades in from bottom
200ms: Card 2 (Leaderboard) fades in
300ms: Card 3 (Points) fades in
400ms: Card 4 (GM) fades in
500ms: Card 5 (Guild) fades in
600ms: Card 6 (Referral) fades in
700ms: Card 7 (Stats) fades in
800ms: Card 8 (Verify) fades in
900ms: Info box fades in
```

### Card Hover
```
0ms:   Mouse enters card
200ms: Gradient opacity: 0 → 100%
200ms: Shadow appears
200ms: Border color lightens
```

### Copy Button Click
```
0ms:   Click detected
0ms:   Copy to clipboard
50ms:  Button background: gray → green
50ms:  Icon: 📋 → ✓
50ms:  Text: "Copy URL" → "Copied!"
2000ms: Revert to default state
```

## Accessibility Features

### Keyboard Navigation
- Tab through all frame cards
- Enter/Space to activate buttons
- Focus indicators on all interactive elements

### Screen Readers
- Descriptive aria-labels for all buttons
- Frame descriptions read aloud
- Copy confirmation announced

### Color Contrast
- All text meets WCAG AA standards
- Minimum 4.5:1 contrast ratio
- Color not sole indicator of state

## Error States

### Not Authenticated
```
┌─────────────────────────────┐
│  Loading...                 │
│  (Spinner animation)        │
└─────────────────────────────┘
↓ (Redirect after 1s)
/login?redirect=/frames
```

### Clipboard Permission Denied
```
Copy URL button shows:
"❌ Failed to copy"
(Red, 2 seconds, then revert)
```

### Share Window Blocked
```
Share button shows tooltip:
"Please allow popups to share"
```

## Performance Metrics

**Target Load Times:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 2.5s
- Frame Images: Lazy loaded
- Total Page Size: < 500KB (without images)

**Optimization:**
- All icons from lucide-react (single import)
- Gradients via CSS (no images)
- Frame images loaded on-demand
- Warpcast composer opens in new tab (no iframe)

## Testing Checklist

- [ ] All 8 frame cards display correctly
- [ ] Copy URL copies correct personalized URL
- [ ] Preview opens frame in new tab
- [ ] Share opens Warpcast with embedded frame
- [ ] Mobile responsive (1-column stack)
- [ ] Tablet responsive (2-column grid)
- [ ] Desktop responsive (3-column grid)
- [ ] Hover animations smooth
- [ ] Copy confirmation shows for 2 seconds
- [ ] Keyboard navigation works
- [ ] Screen reader announces all actions
- [ ] Not authenticated redirects to login
- [ ] Profile "Share Frames" button works
- [ ] Navigation "Frames" link works
- [ ] All gradients display correctly
- [ ] All icons display correctly
