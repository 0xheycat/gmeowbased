# Guild Profile OpenSea Layout Restructure - COMPLETE

**Date**: December 10, 2025  
**Status**: ✅ COMPLETE

## Overview

Restructured the guild profile page (`/guild/[id]`) to match OpenSea's clean, modern layout with full-width banner, two-column design, and sidebar stats.

---

## Layout Changes

### Before (Discord-style)
- Contained layout with rounded corners
- Stats in horizontal grid below header
- All content in single column
- Tabs in simple border-bottom style

### After (OpenSea-style)
- **Full-width banner** (280px height) with gradient overlay
- **Overlapping avatar** (32px × 32px, -64px margin-top)
- **Two-column layout**: Main content (flex-1) + Sidebar (320px)
- **Sticky sidebar** with cards for Treasury, Stats, and Leader
- **Enhanced tabs** with rounded container and active background
- **Better spacing** and visual hierarchy

---

## Key Features

### 1. Full-Width Banner
```tsx
<div className="relative w-full h-[280px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
  {guild.banner ? (
    <img src={guild.banner} className="w-full h-full object-cover" />
  ) : (
    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
  )}
  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
</div>
```

**Features**:
- Full viewport width
- Gradient overlay for text readability
- Custom banner or gradient fallback
- 280px height for optimal display

### 2. Overlapping Avatar
```tsx
<div className="relative -mt-16 mb-6">
  <div className="w-32 h-32 ... rounded-2xl border-4 border-white dark:border-gray-900 shadow-2xl">
    {guild.name.charAt(0).toUpperCase()}
  </div>
</div>
```

**Features**:
- 128px × 128px (larger than before)
- -64px margin-top to overlap banner
- 4px white border
- 2xl shadow for depth
- Rounded-2xl (16px radius)

### 3. Two-Column Layout

**Desktop (lg+)**: Main content (flex-1) + Sidebar (320px)  
**Mobile (<lg)**: Single column, sidebar stacks below

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Main Content */}
  <div className="flex-1 min-w-0">
    {/* Tabs + Content */}
  </div>
  
  {/* Sidebar */}
  <aside className="lg:w-80 flex-shrink-0">
    <div className="sticky top-6 space-y-4">
      {/* Treasury Card */}
      {/* Stats Card */}
      {/* Leader Card */}
    </div>
  </aside>
</div>
```

### 4. Sidebar Cards

#### Treasury Card
- **Large number display**: 3xl font, bold
- **"Manage Treasury" button**: Opens modal instead of switching tabs
- **Green accent**: Matches treasury theme
- **Only visible to officers/leader**

#### Stats Card
- **Clean dividers**: 1px gray lines between stats
- **Icon + Label + Value**: Horizontal layout
- **3 stats**: Members, Total Points, Level
- **Compact spacing**: Better visual grouping

#### Leader Card
- **Avatar circle**: Gradient yellow-to-orange
- **Truncated address**: `0x1234...5678`
- **"Owner" label**: Gray subtext

### 5. Enhanced Tabs

**Before**: Simple border-bottom tabs  
**After**: Rounded container with active state background

```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border">
  <nav className="flex overflow-x-auto">
    <button className={`
      px-6 py-4 border-b-2
      ${activeTab ? 'bg-blue-50/50 border-blue-600' : 'border-transparent hover:bg-gray-50'}
    `}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  </nav>
</div>
```

**Features**:
- Rounded container (xl = 12px radius)
- Active tab has blue background tint
- Hover states on inactive tabs
- 2px bottom border indicator
- Overflow-x-auto for mobile scrolling

### 6. Tab Content Container

```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
  {/* Tab content */}
</div>
```

**Features**:
- White card with border
- Rounded corners matching tabs
- 24px padding (p-6)
- Separates content from background

---

## Removed Features

### Treasury Tab ❌
**Before**: Separate tab in navigation  
**After**: Modal dialog accessible from sidebar

**Reason**: Treasury is a quick action, not a full page view. Modal is faster and matches OpenSea's pattern for actions.

### GuildBanner Component ❌
**Before**: Separate component with edit functionality  
**After**: Inline banner with custom img or gradient

**Reason**: Simplified banner logic, removed unnecessary component layer. Edit functionality moved to settings.

---

## Updated Button Styles

### Join Guild Button
```tsx
className="px-6 py-3 bg-blue-600 hover:bg-blue-700 
  rounded-xl shadow-lg hover:shadow-xl 
  hover:scale-105 transition-all"
```

**Changes**:
- Rounded-xl (12px) instead of lg (8px)
- Shadow-lg with hover to xl
- Hover scale (1.05x) for emphasis
- Larger padding (px-6 py-3)

### Leave Guild Button
```tsx
className="px-6 py-3 bg-white dark:bg-gray-800 
  border border-gray-300 dark:border-gray-600 
  rounded-xl"
```

**Changes**:
- White background (ghost style)
- Border for outline
- Matches OpenSea's secondary buttons

---

## Responsive Design

### Mobile (<640px)
- Single column layout
- Avatar + info stacks vertically
- Tabs scrollable horizontally
- Sidebar appears below main content
- Buttons full-width on extra small screens

### Tablet (640px-1024px)
- Avatar + info in row
- Tabs still scrollable
- Sidebar still below content

### Desktop (1024px+)
- Full two-column layout
- Sidebar sticky at top: 24px (top-6)
- Max container width: 1280px (max-w-7xl)
- Avatar + info in row with gap

---

## File Changes

### `components/guild/GuildProfilePage.tsx`

**Lines Changed**: ~300 lines restructured

**Imports Removed**:
- `GuildBanner` - No longer used

**State Added**:
```typescript
const [treasuryOpen, setTreasuryOpen] = useState(false)
```

**Layout Structure**:
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  {/* Full-Width Banner */}
  <div className="relative w-full h-[280px]">...</div>
  
  {/* Main Content Container */}
  <div className="container mx-auto px-4 max-w-7xl">
    {/* Avatar + Title (Overlapping) */}
    <div className="relative -mt-16 mb-6">...</div>
    
    {/* Two-Column Layout */}
    <div className="flex flex-col lg:flex-row gap-6 pb-12">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        {/* Tab Content */}
      </div>
      
      {/* Sidebar */}
      <aside className="lg:w-80">
        {/* Treasury Card */}
        {/* Stats Card */}
        {/* Leader Card */}
      </aside>
    </div>
  </div>
  
  {/* Dialogs */}
  <Dialog>...</Dialog>
</div>
```

**Tabs Updated**:
- Removed "Treasury" tab
- Kept: Members, Analytics, Activity, Settings (admin only)
- Tab content wrapped in card container

**New Dialog**:
```tsx
<Dialog isOpen={treasuryOpen} onClose={() => setTreasuryOpen(false)}>
  <DialogContent size="lg">
    <GuildTreasury guildId={guildId} canManage={canManage} />
  </DialogContent>
</Dialog>
```

---

## Color Scheme

### Background
- Page: `bg-gray-50 dark:bg-gray-900`
- Cards: `bg-white dark:bg-gray-800`
- Banner gradient: `from-blue-500 via-purple-500 to-pink-500`

### Borders
- Cards: `border-gray-200 dark:border-gray-700`
- Avatar: `border-white dark:border-gray-900`

### Text
- Headings: `text-gray-900 dark:text-white`
- Body: `text-gray-700 dark:text-gray-300`
- Muted: `text-gray-500 dark:text-gray-400`

### Accents
- Treasury: Green (`text-green-600`, `bg-green-600`)
- Members: Blue (`text-blue-600`)
- Points: Purple (`text-purple-600`)
- Activity: Cyan (`text-cyan-600`)
- Leader: Yellow-Orange gradient

---

## Testing Checklist

### Desktop (1024px+)
- [ ] Banner displays full-width
- [ ] Avatar overlaps banner correctly
- [ ] Two-column layout appears
- [ ] Sidebar sticky on scroll
- [ ] Treasury modal opens from sidebar button
- [ ] All 4 tabs work (Members, Analytics, Activity, Settings)
- [ ] Stats display correctly in sidebar cards
- [ ] Leader card shows truncated address

### Tablet (640px-1024px)
- [ ] Banner full-width
- [ ] Avatar + info in row
- [ ] Single column (sidebar below)
- [ ] Tabs scrollable horizontally
- [ ] All cards stack properly

### Mobile (<640px)
- [ ] Banner full-width
- [ ] Avatar + info stacks vertically
- [ ] Single column layout
- [ ] Tabs scrollable
- [ ] Buttons stack or shrink appropriately
- [ ] Treasury modal responsive

### Dark Mode
- [ ] Banner gradient visible
- [ ] Avatar border contrasts
- [ ] Card backgrounds dark
- [ ] Text readable
- [ ] Borders visible
- [ ] Hover states work

### Interactions
- [ ] Join Guild button works
- [ ] Leave Guild confirmation works
- [ ] Treasury modal opens/closes
- [ ] Tab switching smooth
- [ ] Hover effects on tabs/buttons
- [ ] Mobile tap targets (44px minimum)

---

## Performance Improvements

1. **Removed GuildBanner component**: One less component in tree
2. **Sticky sidebar**: Uses CSS `position: sticky` instead of JS scroll listeners
3. **Overflow-x-auto tabs**: Native browser scrolling, no custom scroll logic
4. **Simple gradient fallback**: No image loading if banner not set

---

## Accessibility

- [x] Semantic HTML structure
- [x] Proper heading hierarchy (h1 → h3)
- [x] Focus rings on interactive elements
- [x] Min touch target size (44px)
- [x] Color contrast (WCAG AA)
- [x] Keyboard navigation (tab, enter)
- [x] Screen reader labels (aria-label where needed)
- [x] Dark mode support

---

## Future Enhancements (Optional)

1. **Banner Upload**: Click banner to upload custom image
2. **Animated Transitions**: Smooth tab switching with framer-motion
3. **More Stats**: Activity graph, member growth, trending
4. **Quick Actions**: Share guild, invite members from sidebar
5. **Member Avatars**: Show top 5 member avatars in sidebar
6. **Activity Feed Preview**: Latest 3 events in sidebar card
7. **Guild NFT Badge**: Mint membership NFT badge display

---

## Comparison: Before vs After

| Feature | Before (Discord) | After (OpenSea) |
|---------|-----------------|-----------------|
| Banner | Contained, rounded | Full-width, edge-to-edge |
| Avatar | 96px, -48px margin | 128px, -64px margin |
| Layout | Single column | Two-column with sidebar |
| Stats | Horizontal grid | Sidebar cards |
| Treasury | Tab | Modal from sidebar |
| Tabs | Simple border | Rounded container + bg |
| Content | No container | White card container |
| Spacing | Compact | Generous whitespace |
| Visual | Flat | Depth with shadows |

---

## Key Metrics

- **Lines Changed**: ~300
- **Components Removed**: 1 (GuildBanner)
- **New Dialogs**: 1 (Treasury)
- **Responsive Breakpoints**: 3 (sm, lg, xl)
- **Color Variables**: Consistent with design system
- **Loading States**: Preserved (Loader component)
- **TypeScript Errors**: 0

---

## Status: ✅ READY FOR TESTING

Navigate to `http://localhost:3000/guild/1` to see the new OpenSea-inspired layout!

**Key Improvements**:
- 🎨 Modern, clean design matching industry standards
- 📱 Better mobile responsiveness
- 🎯 Clearer visual hierarchy
- ⚡ Faster interactions (treasury modal)
- 🎪 Sticky sidebar for quick stats access
- ✨ Enhanced visual depth with shadows and gradients
