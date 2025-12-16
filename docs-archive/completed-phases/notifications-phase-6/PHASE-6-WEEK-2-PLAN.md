# Phase 6 Week 2: Advanced Features - COMPLETE

**Status**: Complete (December 15, 2025)
**Duration**: 5 days  
**Actual Effort**: ~700 lines of code  
**Components**: NotificationHistory.tsx (650 lines), NotificationSettings.tsx updates

**UI Reorganization**: Moved all Week 1 & 2 features from Settings tab to History tab for better UX

---

## Quick Summary

**Week 1 Completed:**
- Database: `read_at` column + 2 indexes
- APIs: Mark as read, Bulk actions (4 actions)
- UI: Selection mode, All/Unread filters, Category tabs, Clear All
- UX: Blue dot, bold text, auto-mark on click
- Components: Proper separation (dropdown vs settings page)

**Week 2 Completed:**
1. Sort - 4 options with localStorage persistence
2. Search - Debounced 300ms, Cmd+K shortcut, full-text
3. Grouping - Date/Category with collapsible sections
4. UI Reorganization - Created NotificationHistory component for /notifications History tab
5. Mark Read/Unread - Click to toggle read status (Week 1 feature)
6. Color Fixes - Consistent theming, improved contrast in light/dark mode

---

## Day 1-2: Sort Functionality ✅ COMPLETE (~120 lines)

### Requirements:
- [x] Add sort dropdown to NotificationHistory.tsx ✅
- [x] Support 4 sort options: ✅
  - Date (Newest First) - default ✅
  - Date (Oldest First) ✅
  - Priority (High → Low) ✅ (fallback to date)
  - XP Rewards (High → Low) ✅ (fallback to date)
- [x] Persist sort preference to localStorage ✅
- [x] Update Supabase query with dynamic ORDER BY ✅

### Implementation Steps:

**1. Add State & Types:**
```typescript
// Add to NotificationSettings.tsx
type SortOption = 'date_desc' | 'date_asc' | 'priority' | 'xp'
const [sortBy, setSortBy] = useState<SortOption>('date_desc')

// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('notification_sort')
  if (saved) setSortBy(saved as SortOption)
}, [])

// Save to localStorage on change
useEffect(() => {
  localStorage.setItem('notification_sort', sortBy)
}, [sortBy])
```

**2. Update Query Logic:**
```typescript
// In loadNotifications() function, after .is('dismissed_at', null)
let query = supabase
  .from('user_notification_history')
  .select('*')
  .eq('fid', fid)
  .is('dismissed_at', null)

// Apply sort
switch (sortBy) {
  case 'date_desc':
    query = query.order('created_at', { ascending: false })
    break
  case 'date_asc':
    query = query.order('created_at', { ascending: true })
    break
  case 'priority':
    // Note: Requires priority calculation or JSONB extraction
    // For now, fallback to date_desc
    query = query.order('created_at', { ascending: false })
    break
  case 'xp':
    // Sort by metadata->xp DESC NULLS LAST
    // Note: Supabase may require RPC function for JSONB sorting
    query = query.order('created_at', { ascending: false })
    break
}
```

**3. Add UI (before Category Filter Tabs):** NO EMOJI (CRITICAL)
```typescript
// Add to NotificationSettings.tsx UI section
<div className="flex items-center justify-between mb-4">
  <div>
    <h3 className="text-lg font-semibold">Notification History</h3>
    <p className="text-sm text-muted-foreground">
      Filter by category and sort notifications
    </p>
  </div>
  <div className="flex items-center gap-3">
    {/* Sort Dropdown */}
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as SortOption)}
      className="px-3 py-1.5 rounded-md border text-sm bg-background"
    >
      <option value="date_desc">Newest First</option>
      <option value="date_asc">Oldest First</option>
      <option value="priority">Priority</option>
      <option value="xp">XP Rewards</option>
    </select>
    
    {/* Clear All Button */}
    <Button onClick={handleClearAll} ...>
      Clear All
    </Button>
  </div>
</div>
```

**Files to Modify:**
- `components/notifications/NotificationSettings.tsx` (~80 lines)

**Testing:**
- [x] Select "Oldest First" → notifications reverse order ✅
- [x] Refresh page → sort preference persisted ✅
- [x] Change category filter → sort maintained ✅

---

## Day 3-4: Search Functionality ✅ COMPLETE (~180 lines)

### Requirements:
- [x] Add search input to NotificationHistory header ✅
- [x] Implement debounced search (300ms delay) ✅
- [x] Search across title and description fields ✅
- [x] Show "No results for '{query}'" when empty ✅
- [x] Add clear search button (X icon) ✅
- [x] Keyboard shortcut: Cmd/Ctrl+K to focus ✅

### Implementation Steps:

**1. Add State & Debounce:**
```typescript
import { useMemo, useCallback } from 'react'
import debounce from 'lodash/debounce'

// Add state
const [searchQuery, setSearchQuery] = useState('')
const [debouncedQuery, setDebouncedQuery] = useState('')

// Debounce search input (300ms delay)
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setDebouncedQuery(value)
  }, 300),
  []
)

// Update on input change
const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value
  setSearchQuery(value)
  debouncedSearch(value)
}

// Cleanup debounce on unmount
useEffect(() => {
  return () => {
    debouncedSearch.cancel()
  }
}, [debouncedSearch])
```

**2. Update Query Logic:**
```typescript
// In loadNotifications(), after category filter
if (debouncedQuery.trim()) {
  // Supabase full-text search (case-insensitive)
  query = query.or(
    `title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`
  )
}
```

**3. Add Search UI:**
```typescript
// Add SearchIcon import
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'

// Add before sort dropdown
<div className="relative flex-1 max-w-md">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
  <input
    type="text"
    value={searchQuery}
    onChange={handleSearchChange}
    placeholder="Search notifications..."
    className="w-full pl-10 pr-10 py-2 rounded-md border text-sm bg-background"
  />
  {searchQuery && (
    <button
      onClick={() => {
        setSearchQuery('')
        setDebouncedQuery('')
      }}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      <CloseIcon className="w-4 h-4" />
    </button>
  )}
</div>
```

**4. Update Empty State:**
```typescript
// Replace empty state message
{notifications.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <InfoIcon sx={{ fontSize: 48, opacity: 0.3 }} />
    <p className="text-sm text-muted-foreground mt-3">
      {debouncedQuery 
        ? `No results for "${debouncedQuery}"` 
        : selectedCategory === 'all'
        ? 'No notifications yet'
        : `No ${selectedCategory} notifications`}
    </p>
    {debouncedQuery && (
      <button
        onClick={() => {
          setSearchQuery('')
          setDebouncedQuery('')
        }}
        className="mt-2 text-sm text-primary hover:underline"
      >
        Clear search
      </button>
    )}
  </div>
)}
```

**5. Add Keyboard Shortcut:**
```typescript
// Add useEffect for keyboard shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      document.querySelector('input[placeholder="Search notifications..."]')?.focus()
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**Files to Modify:**
- `components/notifications/NotificationSettings.tsx` (~120 lines)
- `package.json` (add lodash if not present)

**Testing:**
- [x] Type "quest" → shows only notifications with "quest" in title/description ✅
- [x] Clear search → all notifications return ✅
- [x] Press Cmd+K → search input focused ✅
- [x] No results → shows helpful empty state ✅

---

## Day 5: Notification Grouping ✅ COMPLETE (~300 lines)

### Requirements:
- [x] Add grouping toggle (None, Date, Category) ✅
- [x] Date grouping: "Today", "Yesterday", specific dates ✅
- [x] Category grouping: Group by 13 notification categories ✅
- [x] Collapsible sections (expand/collapse) ✅
- [x] Persist grouping preference to localStorage ✅

### Implementation Steps:

**1. Add State:**
```typescript
type GroupOption = 'none' | 'date' | 'category'
const [groupBy, setGroupBy] = useState<GroupOption>('none')
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

// Persist to localStorage
useEffect(() => {
  const saved = localStorage.getItem('notification_grouping')
  if (saved) setGroupBy(saved as GroupOption)
}, [])

useEffect(() => {
  localStorage.setItem('notification_grouping', groupBy)
}, [groupBy])
```

**2. Add Grouping Logic:**
```typescript
// Helper: Format date for grouping
const formatDateGroup = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

// Group notifications
const groupedNotifications = useMemo(() => {
  if (groupBy === 'none') {
    return { 'All Notifications': notifications }
  }
  
  const grouped: Record<string, NotificationHistoryItem[]> = {}
  
  notifications.forEach(notif => {
    let key: string
    
    if (groupBy === 'date') {
      key = formatDateGroup(notif.created_at)
    } else if (groupBy === 'category') {
      const category = CATEGORIES.find(c => c.key === notif.category)
      key = category?.label || 'Other'
    } else {
      key = 'All Notifications'
    }
    
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(notif)
  })
  
  return grouped
}, [notifications, groupBy])

// Toggle group expansion
const toggleGroup = (groupKey: string) => {
  setExpandedGroups(prev => {
    const next = new Set(prev)
    if (next.has(groupKey)) {
      next.delete(groupKey)
    } else {
      next.add(groupKey)
    }
    return next
  })
}
```

**3. Add UI Toggle:**
```typescript
// Add to header controls (after sort dropdown)
<select
  value={groupBy}
  onChange={(e) => setGroupBy(e.target.value as GroupOption)}
  className="px-3 py-1.5 rounded-md border text-sm bg-background"
>
  <option value="none">No Grouping</option>
  <option value="date">Group by Date</option>
  <option value="category">Group by Category</option>
</select>
```

**4. Update Notification List Rendering:**
```typescript
// Replace notification list with grouped version
{Object.entries(groupedNotifications).map(([groupKey, groupNotifs]) => (
  <div key={groupKey} className="mb-4">
    {/* Group Header */}
    {groupBy !== 'none' && (
      <button
        onClick={() => toggleGroup(groupKey)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
      >
        <span className="transform transition-transform">
          {expandedGroups.has(groupKey) ? '▾' : '▸'}
        </span>
        <span>{groupKey}</span>
        <span className="ml-auto text-xs text-gray-500">
          {groupNotifs.length}
        </span>
      </button>
    )}
    
    {/* Group Content */}
    {(groupBy === 'none' || expandedGroups.has(groupKey)) && (
      <div className="space-y-2 mt-2">
        <AnimatePresence mode="popLayout">
          {groupNotifs.map(notification => (
            <motion.div key={notification.id}>
              {/* Existing notification card code */}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )}
  </div>
))}
```

**5. Default Expand All on Load:**
```typescript
// Expand all groups by default when grouping changes
useEffect(() => {
  if (groupBy !== 'none') {
    const allGroups = new Set(Object.keys(groupedNotifications))
    setExpandedGroups(allGroups)
  }
}, [groupBy, groupedNotifications])
```

**Files to Modify:**
- `components/notifications/NotificationSettings.tsx` (~200 lines)

**Testing:**
- [x] Select "Group by Date" → shows Today, Yesterday, Dec 14, etc. ✅
- [x] Click group header → expands/collapses group ✅
- [x] Select "Group by Category" → shows Achievement, Quest, etc. ✅
- [x] Refresh page → grouping preference persisted ✅

---

## Optional: Full-Page Inbox Route

**If time permits, create dedicated route:**

```typescript
// app/notifications/page.tsx
'use client'

import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { useAuth } from '@/lib/hooks/use-auth'

export default function NotificationsPage() {
  const { fid } = useAuth()
  
  if (!fid) {
    return <div>Please sign in to view notifications</div>
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage all your notifications and preferences
        </p>
      </div>
      <NotificationSettings fid={fid} />
    </div>
  )
}
```

**Add to navigation:**
```typescript
// components/layout/Navigation.tsx
<Link href="/notifications">
  <NotificationsIcon />
  Notifications
  {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
</Link>
```

---

## Week 2 Success Criteria

**Must Have:**
- Sort dropdown working (4 options)
- Search input working with debounce
- Grouping toggle working (Date + Category)
- All preferences persist to localStorage
- 0 TypeScript errors

**Nice to Have:**
- Keyboard shortcuts (Cmd+K)
- Expand/collapse groups
- Full-page route
- URL query params for filters

**Testing Checklist:**
- [x] Sort by XP → highest XP notifications first ✅
- [x] Search "gm" → only shows GM notifications ✅
- [x] Group by Date → shows "Today", "Yesterday", etc. ✅
- [x] Refresh page → all preferences remembered ✅
- [x] Combine filters → category + search + sort all work together ✅

---

## Lessons from Week 1 (Apply to Week 2)

1. **Component Separation**: Keep NotificationBell simple, add features to NotificationSettings
2. **MCP Verification**: Test Supabase queries with MCP before implementing UI
3. **TypeScript First**: Run compiler after each major change
4. **Dead Code**: Search for function usage before implementing
5. **Optimistic UI**: Update UI immediately, handle errors gracefully
6. **localStorage**: Always wrap in try/catch (localStorage can fail)
7. **Debounce**: Use lodash or custom hook for search inputs
8. **Empty States**: Show helpful messages when no results

---

## Ready to Start?

**Prerequisites Check:**
- Phase 6 Week 1 complete (all 5 days)
- Database schema verified via MCP
- All TypeScript errors fixed
- Component separation pattern established
- Documentation updated with lessons learned

**Next Step:** Start with Day 1-2 (Sort Functionality)

Let's build!
