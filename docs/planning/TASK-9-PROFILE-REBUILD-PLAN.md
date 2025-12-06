# Task 9: Profile Page Rebuild - Professional Hybrid Template Strategy

**Created**: December 5, 2025  
**Status**: Planning  
**Goal**: Rebuild profile page with professional patterns from major platforms  
**Estimated Time**: 8-10 hours  
**Strategy**: Multi-template hybrid (trezoadmin-41 + gmeowbased0.6 + music)

---

## 📋 Overview

**Principle**: Full migration - Remove all old profile components and rebuild with professional templates.

**Reference Platforms**:
- **Twitter/X**: Clean profile header, tab navigation, activity feed
- **LinkedIn**: Professional stats, experience timeline, skills section
- **GitHub**: Contribution graph, pinned projects, activity timeline
- **Discord**: Status badges, roles, activity tracking

**Current State**: Old components using mixed patterns (components/profile/*)  
**Target State**: Professional hybrid template components with 25-35% adaptation

---

## 🎯 Component Architecture

### Template Selection Matrix

| Component | Template Source | Adaptation | Files | Platform Reference |
|-----------|----------------|------------|-------|-------------------|
| **ProfileHeader** | trezoadmin-41 + gmeowbased0.6 | 30% | 1 | Twitter header |
| **ProfileStats** | trezoadmin-41/MyProfile/ProfileIntro | 25% | 1 | LinkedIn stats |
| **ProfileTabs** | trezoadmin-41/UIElements/Tabs | 30% | 1 | GitHub tabs |
| **QuestActivity** | music/datatable + gmeowbased0.6 cards | 35% | 1 | GitHub activity |
| **BadgeCollection** | gmeowbased0.6/nft-card | 10% | 1 | Discord roles |
| **ProfileSettings** | music/forms + trezoadmin-41 | 35% | 1 | Twitter settings |
| **SocialLinks** | gmeowbased0.6/profile-info-view | 15% | 1 | LinkedIn socials |
| **ActivityTimeline** | trezoadmin-41/RecentActivity | 40% | 1 | LinkedIn experience |

---

## 📦 Phase 1: Profile Header & Hero (3-4 hours)

### 1.1 ProfileHeader Component

**Template**: trezoadmin-41/MyProfile/ProfileIntro.tsx + gmeowbased0.6/profile.tsx  
**Adaptation**: 30%  
**Platform Reference**: Twitter profile header

**Features**:
- Cover image with gradient overlay
- Avatar with wallet badge (Base chain)
- User display name + @username
- Farcaster FID badge
- Bio/description (150 chars max)
- Wallet address with copy button
- Social links (Twitter, Warpcast, GitHub)
- Edit profile button (owner only)

**Key Patterns**:
```tsx
// From gmeowbased0.6 - Wallet copy functionality
const [copyButtonStatus, setCopyButtonStatus] = useState(false);
function handleCopyToClipboard() {
  copyToClipboard(userAddress);
  setCopyButtonStatus(true);
  setTimeout(() => setCopyButtonStatus(false), 2500);
}

// From trezoadmin-41 - Card structure
<div className="trezo-card bg-white dark:bg-[#0c1427] mb-[25px] p-[20px] md:p-[25px] rounded-md">
  {/* Header content */}
</div>
```

**Data Sources**:
- Farcaster user data (via Neynar API)
- Wallet address (from context)
- User profile (Supabase `user_profiles` table)

---

### 1.2 ProfileStats Component

**Template**: trezoadmin-41/MyProfile/ProfileIntro.tsx (stats section)  
**Adaptation**: 25%  
**Platform Reference**: LinkedIn profile stats

**Stats Display**:
- **Total XP**: leaderboard_calculations.viral_xp
- **BASE Points**: leaderboard_calculations.base_points
- **Quest Completions**: Count from user_quest_progress
- **Badge Count**: Count from user_badge_collection
- **Rank**: leaderboard_calculations.rank
- **Streak**: Current daily streak

**Layout**:
```tsx
// 3-column grid on desktop, 2-column on mobile
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
  {stats.map(stat => (
    <div key={stat.label}>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {stat.value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {stat.label}
      </div>
    </div>
  ))}
</div>
```

---

### 1.3 SocialLinks Component

**Template**: gmeowbased0.6/profile-info-view.tsx (socials section)  
**Adaptation**: 15%  
**Platform Reference**: LinkedIn contact info

**Features**:
- Farcaster (Warpcast profile link)
- Twitter/X (if connected)
- GitHub (if connected)
- Ethereum address (ENS if available)
- Base address (primary)
- Copy buttons for addresses

**Icon Usage**: Use existing components/icons/ (93 SVG icons available)

---

## 📦 Phase 2: Tab Navigation & Content (3-4 hours)

### 2.1 ProfileTabs Component

**Template**: trezoadmin-41/UIElements/Tabs  
**Adaptation**: 30%  
**Platform Reference**: GitHub profile tabs

**Tab Structure**:
```tsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: <GridIcon /> },
  { id: 'quests', label: 'Quests', icon: <CheckCircleIcon />, badge: completedCount },
  { id: 'badges', label: 'Badges', icon: <BadgeIcon />, badge: badgeCount },
  { id: 'activity', label: 'Activity', icon: <ClockIcon /> },
]
```

**Features**:
- Mobile: Horizontal scroll tabs (thumb-friendly)
- Desktop: Full tab bar with icons + labels
- Badge count indicators
- Smooth scroll to section
- Active state styling

---

### 2.2 QuestActivity Component

**Template**: music/datatable + gmeowbased0.6/collection-card  
**Adaptation**: 35%  
**Platform Reference**: GitHub contribution activity

**Features**:
- Quest cards grid (completed quests)
- Filter: All / Completed / In Progress
- Sort: Recent / Oldest / XP Earned
- Empty state: "No quests yet" (music/datatable/empty-state)
- Pagination (music/ui/pagination)

**Quest Card**:
- Quest thumbnail
- Title + difficulty badge
- XP earned + completion date
- Quick view button

---

### 2.3 BadgeCollection Component

**Template**: gmeowbased0.6/nft-card.tsx  
**Adaptation**: 10%  
**Platform Reference**: Discord roles/badges

**Features**:
- Badge grid (3 cols mobile, 4 cols desktop)
- Tier filtering (mythic, legendary, epic, rare, common)
- Badge card: image + name + tier + earned date
- Locked badges (show requirements)
- Total count: X/280+ badges

**Badge Card Structure**:
```tsx
<div className="relative overflow-hidden rounded-2xl bg-white dark:bg-light-dark">
  <div className="aspect-square relative">
    <Image src={badge.image_url} fill alt={badge.name} />
    {!badge.earned && <div className="absolute inset-0 bg-black/60" />}
  </div>
  <div className="p-4">
    <h3 className="font-semibold">{badge.name}</h3>
    <p className="text-sm text-gray-600">{badge.tier}</p>
    {badge.earned && <p className="text-xs mt-2">Earned {badge.earned_at}</p>}
  </div>
</div>
```

---

### 2.4 ActivityTimeline Component

**Template**: trezoadmin-41/MyProfile/RecentActivity.tsx  
**Adaptation**: 40%  
**Platform Reference**: LinkedIn activity feed

**Activity Types**:
- Quest completed
- Badge earned
- XP milestone reached
- Leaderboard rank changed
- Quest created (if creator)

**Timeline Item**:
```tsx
<div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
    <ActivityIcon />
  </div>
  <div>
    <p className="font-medium">{activity.title}</p>
    <p className="text-sm text-gray-600">{activity.description}</p>
    <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
  </div>
</div>
```

**Data Source**: xp_transactions table + user_quest_progress

---

## 📦 Phase 3: Settings & Preferences (2-3 hours)

### 3.1 ProfileSettings Component

**Template**: music/ui/forms + trezoadmin-41/form-layout-01  
**Adaptation**: 35%  
**Platform Reference**: Twitter settings

**Settings Sections**:

**Account Settings**:
- Display name (text input)
- Username (text input, validation)
- Bio (textarea, 150 char limit)
- Cover image upload (gmeowbased0.7/FileUploader pattern)
- Avatar upload

**Notification Preferences**:
- Quest reminders (toggle)
- Badge earned (toggle)
- Quest invites (toggle)
- Leaderboard updates (toggle)
- Email notifications (toggle)

**Privacy Settings**:
- Profile visibility (public/private)
- Show wallet address (toggle)
- Show quest history (toggle)
- Show badge collection (toggle)

**Connected Accounts**:
- Farcaster (always connected, show FID)
- Wallet (Base address, show/hide)
- Twitter (connect/disconnect button)
- GitHub (connect/disconnect button)

**Form Pattern** (from music):
```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  <div>
    <label className="block text-sm font-medium mb-2">
      Display Name
    </label>
    <input
      type="text"
      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
    />
  </div>
  {/* More fields */}
  <button type="submit" className="btn-primary">
    Save Changes
  </button>
</form>
```

---

## 🗂️ File Structure

```
app/
├── profile/
│   ├── page.tsx (main profile page)
│   ├── [fid]/
│   │   └── page.tsx (view other user profiles)
│   └── settings/
│       └── page.tsx (user settings)
│
components/
├── profile/
│   ├── ProfileHeader.tsx ✅ NEW
│   ├── ProfileStats.tsx ✅ NEW
│   ├── SocialLinks.tsx ✅ NEW
│   ├── ProfileTabs.tsx ✅ NEW
│   ├── QuestActivity.tsx ✅ NEW
│   ├── BadgeCollection.tsx ✅ NEW
│   ├── ActivityTimeline.tsx ✅ NEW
│   └── ProfileSettings.tsx ✅ NEW
│
lib/
├── profile/
│   ├── types.ts (ProfileData, ProfileStats, Activity types)
│   ├── profile-service.ts (fetch user profile data)
│   ├── stats-calculator.ts (calculate profile stats)
│   └── activity-service.ts (fetch user activity)
```

---

## 🎨 Design Specifications

### Color Palette (from globals.css)

**Primary**: `hsl(var(--primary))` - Brand color  
**Background**: `hsl(var(--background))` - Page background  
**Card**: `hsl(var(--card))` - Component cards  
**Muted**: `hsl(var(--muted))` - Secondary text  
**Border**: `hsl(var(--border))` - Dividers  

**Badge Tiers** (existing):
```css
.badge-mythic { background: var(--badge-tier-mythic); }
.badge-legendary { background: var(--badge-tier-legendary); }
.badge-epic { background: var(--badge-tier-epic); }
.badge-rare { background: var(--badge-tier-rare); }
.badge-common { background: var(--badge-tier-common); }
```

### Typography

**Display Name**: text-2xl font-bold  
**Username**: text-base text-muted-foreground  
**Section Headers**: text-xl font-semibold  
**Stats Values**: text-3xl font-bold  
**Stats Labels**: text-sm text-muted-foreground  
**Body Text**: text-base  
**Timestamps**: text-xs text-muted-foreground  

### Spacing

**Card Padding**: p-6 (mobile), p-8 (desktop)  
**Section Gaps**: space-y-6  
**Grid Gaps**: gap-4 (mobile), gap-6 (desktop)  
**Component Margins**: mb-6  

### Responsive Breakpoints

```tsx
// Mobile-first (Tailwind defaults)
sm: '640px'  // Small tablets
md: '768px'  // Tablets
lg: '1024px' // Desktop
xl: '1280px' // Large desktop
```

---

## 📊 Data Schema

### Profile Data Structure

```typescript
interface ProfileData {
  // Farcaster data
  fid: number
  username: string
  display_name: string
  bio: string
  avatar_url: string
  verified: boolean
  
  // Wallet data
  address: string // Base address
  ens_name?: string
  
  // Profile customization
  cover_image_url?: string
  social_links: {
    twitter?: string
    github?: string
    warpcast: string // Always present
  }
  
  // Stats (from leaderboard_calculations)
  stats: {
    viral_xp: number
    base_points: number
    rank: number
    quest_completions: number
    badge_count: number
    streak_days: number
  }
  
  // Settings
  settings: {
    profile_visibility: 'public' | 'private'
    show_wallet: boolean
    show_quest_history: boolean
    show_badge_collection: boolean
    notifications: {
      quest_reminders: boolean
      badge_earned: boolean
      quest_invites: boolean
      leaderboard_updates: boolean
      email: boolean
    }
  }
}
```

### Activity Data Structure

```typescript
interface ActivityItem {
  id: string
  type: 'quest_completed' | 'badge_earned' | 'xp_milestone' | 'rank_changed' | 'quest_created'
  title: string
  description: string
  timestamp: Date
  metadata: {
    quest_id?: string
    badge_id?: string
    xp_amount?: number
    old_rank?: number
    new_rank?: number
  }
}
```

---

## 🔌 API Integration

### Endpoints Needed

**GET /api/user/profile/:fid**
- Fetch complete profile data
- Returns: ProfileData + stats + activity
- Auth: Public for public profiles, requires auth for private

**PUT /api/user/profile**
- Update profile information
- Body: Partial<ProfileData>
- Auth: Required (must be profile owner)

**GET /api/user/profile/:fid/activity**
- Fetch user activity timeline
- Params: ?page=1&limit=20
- Returns: ActivityItem[]
- Auth: Public for public profiles

**GET /api/user/profile/:fid/quests**
- Fetch user quest completions
- Params: ?status=completed&sort=recent
- Returns: Quest[]
- Auth: Public for public profiles

**GET /api/user/profile/:fid/badges**
- Fetch user badge collection
- Params: ?tier=all
- Returns: Badge[]
- Auth: Public for public profiles

**PUT /api/user/profile/settings**
- Update profile settings
- Body: Partial<ProfileData['settings']>
- Auth: Required (must be profile owner)

---

## ✅ Implementation Checklist

### Phase 1: Profile Header & Hero (3-4 hours) ✅ COMPLETE

- [x] Create `lib/profile/types.ts` with ProfileData interface
- [x] Create `lib/profile/profile-service.ts` with data fetching
- [x] Create `lib/profile/stats-calculator.ts` for stats computation
- [x] Build `components/profile/ProfileHeader.tsx`
  - [x] Cover image with overlay
  - [x] Avatar with Base badge
  - [x] Name, username, FID display
  - [x] Bio section
  - [x] Edit button (owner only)
- [x] Build `components/profile/ProfileStats.tsx`
  - [x] 6 stat cards (XP, Points, Quests, Badges, Rank, Streak)
  - [x] Responsive grid (2 cols mobile, 3 cols desktop)
  - [x] Number formatting (1,234 format)
- [x] Build `components/profile/SocialLinks.tsx`
  - [x] Warpcast, Twitter, GitHub links
  - [x] Wallet address with copy button
  - [x] Icon buttons with tooltips
- [x] Create API route `app/api/user/profile/[fid]/route.ts` with **10-layer security**
- [ ] Test on mobile (375px) and desktop (1280px) - DEFERRED TO PHASE 4

### Phase 2: Tab Navigation & Content (3-4 hours)

- [ ] Build `components/profile/ProfileTabs.tsx`
  - [ ] Tab bar with 4 tabs (Overview, Quests, Badges, Activity)
  - [ ] Badge count indicators
  - [ ] Mobile: Horizontal scroll
  - [ ] Desktop: Full tab bar
  - [ ] Active state styling
- [ ] Build `components/profile/QuestActivity.tsx`
  - [ ] Quest cards grid (gmeowbased0.6 pattern)
  - [ ] Filter: All/Completed/In Progress
  - [ ] Sort: Recent/Oldest/XP
  - [ ] Empty state component
  - [ ] Pagination
- [ ] Build `components/profile/BadgeCollection.tsx`
  - [ ] Badge grid (3/4 cols responsive)
  - [ ] Tier filtering dropdown
  - [ ] Badge card with image + tier + earned date
  - [ ] Locked badge state (grayscale + lock icon)
  - [ ] Total count display
- [ ] Build `components/profile/ActivityTimeline.tsx`
  - [ ] Activity items with icons
  - [ ] Timestamp formatting (relative)
  - [ ] Activity type icons
  - [ ] Load more button
- [ ] Create `lib/profile/activity-service.ts` for activity fetching
- [ ] Create API routes for quests/badges/activity
- [ ] Test all tab switching and data loading

### Phase 3: Settings & Preferences (2-3 hours)

- [ ] Build `components/profile/ProfileSettings.tsx`
  - [ ] Account settings section (name, username, bio, images)
  - [ ] Notification preferences (toggles)
  - [ ] Privacy settings (visibility, show/hide options)
  - [ ] Connected accounts (Farcaster, Twitter, GitHub)
  - [ ] Form validation
  - [ ] Save changes button with loading state
  - [ ] Success/error notifications
- [ ] Create `app/profile/settings/page.tsx`
- [ ] Create API route `app/api/user/profile/settings/route.ts`
- [ ] Implement cover image upload (use gmeowbased0.7 FileUploader pattern)
- [ ] Implement avatar upload
- [ ] Test all form fields and validation
- [ ] Test mobile responsiveness (375px)

### Phase 4: Polish & Testing (1-2 hours)

- [ ] Add loading skeletons (trezoadmin-41/Skeleton)
- [ ] Add error boundaries
- [ ] Verify all icon usage (use components/icons/ only)
- [ ] Test dark mode
- [ ] Test mobile responsiveness (375px → 1920px)
- [ ] Verify WCAG AA contrast (use test-quest-contrast-real.cjs)
- [ ] Test profile visibility settings (public/private)
- [ ] Test view other user profiles (/profile/[fid])
- [ ] Test edit profile (owner only)
- [ ] Performance audit (lazy load images)

---

## 🧪 Testing Strategy

### Manual Testing Checklist

**Profile Header**:
- [ ] Cover image displays correctly
- [ ] Avatar loads and displays Base badge
- [ ] Name, username, FID display correctly
- [ ] Bio truncates at 150 chars
- [ ] Wallet copy button works
- [ ] Edit button only shows for profile owner
- [ ] Social links open in new tab

**Profile Stats**:
- [ ] All 6 stats display correct values
- [ ] Numbers format correctly (1,234 format)
- [ ] Stats update on quest completion
- [ ] Responsive grid works (2/3 cols)

**Tab Navigation**:
- [ ] All tabs switch content correctly
- [ ] Badge counts update dynamically
- [ ] Mobile horizontal scroll works
- [ ] Active tab styling clear

**Quest Activity**:
- [ ] Quest cards display correctly
- [ ] Filter works (All/Completed/In Progress)
- [ ] Sort works (Recent/Oldest/XP)
- [ ] Pagination works
- [ ] Empty state shows when no quests

**Badge Collection**:
- [ ] Badge grid displays correctly
- [ ] Tier filter works
- [ ] Locked badges show grayscale + requirements
- [ ] Earned badges show date
- [ ] Total count accurate

**Activity Timeline**:
- [ ] Activity items display correctly
- [ ] Icons match activity type
- [ ] Timestamps format correctly (relative)
- [ ] Load more button works

**Profile Settings**:
- [ ] All form fields editable
- [ ] Form validation works
- [ ] Image upload works (cover + avatar)
- [ ] Toggle switches work
- [ ] Save button shows loading state
- [ ] Success notification shows
- [ ] Changes persist after page reload

### Automated Testing

**Contrast Testing** (WCAG AA):
```bash
node scripts/test-quest-contrast-real.cjs --files "components/profile/**/*.tsx"
```

**Mobile Responsive Testing**:
```bash
# Create test script
./scripts/test-profile-mobile.sh
# Tests: Container padding, responsive grids, touch targets, overflow
```

**E2E Testing**:
```bash
# Create test script
./scripts/test-profile-e2e.sh
# Tests: Profile load, tab switching, settings save, image upload
```

---

## 📝 Migration Steps

### Step 1: Backup Old Components (5 min)

```bash
# Backup old profile components
mkdir -p components/profile.backup
cp -r components/profile/* components/profile.backup/

# Backup old profile page
cp app/profile/page.tsx app/profile/page.tsx.backup
```

### Step 2: Delete Old Components (5 min)

```bash
# Delete old profile components
rm -rf components/profile/*

# Keep route, delete content
echo "'use client'\nexport default function ProfilePage() {\n  return <div>Profile - Under Reconstruction</div>\n}" > app/profile/page.tsx
```

### Step 3: Implement New Components (8-10 hours)

Follow Phase 1 → Phase 2 → Phase 3 → Phase 4 checklists above.

### Step 4: Update Documentation (15 min)

- Update `FOUNDATION-REBUILD-ROADMAP.md` Task 9 status
- Update `CURRENT-TASK.md` with profile completion
- Create completion summary in `docs/phase-reports/`

---

## 🎯 Success Criteria

**Functionality** (100% required):
- ✅ Profile header displays user data correctly
- ✅ Profile stats calculate and display accurately
- ✅ Tab navigation switches content smoothly
- ✅ Quest activity shows completed quests
- ✅ Badge collection displays with tier filtering
- ✅ Activity timeline shows recent activity
- ✅ Profile settings save changes correctly
- ✅ Image upload works for cover + avatar
- ✅ View other user profiles works (/profile/[fid])
- ✅ Privacy settings hide content when private

**Design** (100% required):
- ✅ Mobile-responsive (375px → 1920px)
- ✅ Dark mode support
- ✅ WCAG AA contrast compliance
- ✅ Touch targets ≥ 44px (mobile)
- ✅ Professional UI matching big platforms
- ✅ Consistent spacing (Tailwind utilities)
- ✅ Loading states for all async operations
- ✅ Error states with clear messages

**Performance** (target):
- ✅ Profile load < 1.5s
- ✅ Tab switching instant (<100ms)
- ✅ Image lazy loading
- ✅ Optimized bundle size

---

## 📚 References

**Template Files**:
- `planning/template/trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/MyProfile/`
- `planning/template/gmeowbased0.6/src/components/profile/`
- `planning/template/music/common/resources/client/ui/`

**Documentation**:
- `docs/migration/TEMPLATE-SELECTION.md` - Component selection guide
- `FOUNDATION-REBUILD-ROADMAP.md` - Overall roadmap
- `docs/planning/TASK-8.5-CORRECTIONS-APPLIED.md` - Icon system, MCP tools

**Platform References**:
- Twitter/X Profile: https://twitter.com/elonmusk
- LinkedIn Profile: https://www.linkedin.com/in/williamhgates/
- GitHub Profile: https://github.com/torvalds
- Discord User Profile: User settings → My Account

---

**Ready to Start**: Phase 1 (Profile Header & Hero) - 3-4 hours estimated
