# Badge Admin Panel

**Phase 3B: Badge Management UI**

Version: 2.1.0  
Last Updated: January 15, 2025

---

## Overview

The Badge Admin Panel provides a comprehensive UI for managing the badge system. Accessible at `/admin`, it features 4 tabs for template management, mint queue monitoring, badge registry viewing, and manual badge assignment.

## Architecture

### Component Structure

```
BadgeManagerPanel (550+ lines)
├── Tab 1: Badge Templates
│   ├── Template list with edit/delete
│   ├── Create new template form
│   └── Template preview
├── Tab 2: Mint Queue
│   ├── Queue status overview
│   ├── Pending/Processing/Failed filters
│   ├── Retry failed mints
│   └── Manual mint trigger
├── Tab 3: Badge Registry
│   ├── All badges list
│   ├── Tier filter (mythic, legendary, epic, rare, common)
│   ├── Badge detail modal
│   └── Registry version info
└── Tab 4: Manual Assignment
    ├── FID input
    ├── Badge type selector
    ├── Tier selector
    ├── Chain selector
    └── Assign + Queue mint button
```

### File Location

**Component**: `/components/admin/BadgeManagerPanel.tsx`

**Lines**: 550+ (Phase 3B implementation)

**Dependencies**:
- `@/lib/badges` - Badge utilities
- `@/lib/contract-mint` - Minting functions
- `@supabase/supabase-js` - Database client

---

## Features

### Tab 1: Badge Templates

**Purpose**: Manage badge metadata templates

**Capabilities**:
- View all badge templates
- Create new template (name, description, image URL, tier)
- Edit existing template
- Delete template
- Preview template with tier styling

**Template Schema**:
```typescript
interface BadgeTemplate {
  id: string
  badgeType: string           // Slug (e.g., "gmeow_vanguard")
  name: string                // Display name
  description: string         // Badge description
  imageUrl: string            // Badge image URL
  tier: TierType              // mythic, legendary, epic, rare, common
  metadata: {
    attributes: Array<{
      trait_type: string
      value: string
    }>
  }
}
```

**UI Components**:
- Template card with tier color border
- Edit form (modal)
- Delete confirmation dialog
- Image preview

---

### Tab 2: Mint Queue

**Purpose**: Monitor and manage badge minting queue

**Capabilities**:
- View all mint queue items
- Filter by status (pending, processing, minted, failed)
- View mint details (FID, badge type, chain, tx hash)
- Retry failed mints
- Manually trigger mints
- Delete failed queue items

**Queue Item Display**:
```typescript
interface MintQueueDisplay {
  id: number
  fid: number
  badgeType: string
  chain: string
  status: 'pending' | 'processing' | 'minted' | 'failed'
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  createdAt: string
  mintedAt: string | null
  txHash: string | null
}
```

**Status Colors**:
- **Pending**: Blue
- **Processing**: Yellow
- **Minted**: Green
- **Failed**: Red

**Actions**:
- **Retry**: Re-queue failed mint (if `retryCount < maxRetries`)
- **View TX**: Open block explorer (if minted)
- **Delete**: Remove from queue (failed only)

---

### Tab 3: Badge Registry

**Purpose**: Browse complete badge registry

**Capabilities**:
- View all badges in registry
- Filter by tier
- Search by badge name/type
- View badge details (modal)
- See badge metadata (name, description, image, attributes)
- Copy badge ID/type

**Badge Detail Modal**:
- Large badge image preview
- Full metadata display
- Tier information
- Badge ID + badge type
- Attributes list
- Creation date

**Registry Metadata**:
```typescript
interface BadgeRegistry {
  version: string            // "2.0.0"
  lastUpdated: string        // ISO timestamp
  description: string
  tiers: Record<TierType, TierConfig>
  badges: Badge[]
}
```

**Tier Filter Buttons**:
- All (default)
- Mythic (purple)
- Legendary (gold)
- Epic (blue)
- Rare (light purple)
- Common (gray)

---

### Tab 4: Manual Assignment

**Purpose**: Manually assign badges to users

**Capabilities**:
- Assign badge to specific FID
- Select badge type from registry
- Override tier (optional)
- Choose target chain
- Option to queue mint immediately
- Validation before assignment

**Form Fields**:
```typescript
interface ManualAssignmentForm {
  fid: number                 // Required: Farcaster ID
  badgeType: string           // Required: Badge registry slug
  tier?: TierType             // Optional: Override default tier
  chain: ChainKey             // Required: Target blockchain
  queueMint: boolean          // Optional: Auto-queue for minting
}
```

**Validation**:
- ✅ FID must be positive integer
- ✅ Badge type must exist in registry
- ✅ User cannot have duplicate badge (same type)
- ✅ Tier must be valid if overridden

**Actions**:
1. **Assign Only**: Create `user_badges` entry (no minting)
2. **Assign + Queue**: Create entry + add to `mint_queue`

**Success Response**:
```typescript
{
  success: true,
  badge: {
    id: string
    badgeId: string
    badgeType: string
    tier: TierType
    assignedAt: string
    minted: false
  },
  queueId?: number  // If queued for minting
}
```

---

## State Management

### React State Variables (13 total)

```typescript
// Active tab
const [activeTab, setActiveTab] = useState<'templates' | 'queue' | 'registry' | 'assign'>('templates')

// Template management
const [templates, setTemplates] = useState<BadgeTemplate[]>([])
const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null)
const [showTemplateForm, setShowTemplateForm] = useState(false)

// Mint queue
const [queueItems, setQueueItems] = useState<MintQueueItem[]>([])
const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'processing' | 'minted' | 'failed'>('all')

// Badge registry
const [registryBadges, setRegistryBadges] = useState<Badge[]>([])
const [tierFilter, setTierFilter] = useState<'all' | TierType>('all')
const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

// Manual assignment
const [assignFid, setAssignFid] = useState('')
const [assignBadgeType, setAssignBadgeType] = useState('')
const [assignTier, setAssignTier] = useState<TierType | ''>('')
const [assignChain, setAssignChain] = useState<ChainKey>('base')

// UI state
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Callback Functions (5 total)

```typescript
// Fetch data
const fetchTemplates = async () => { /* ... */ }
const fetchQueueItems = async () => { /* ... */ }
const fetchRegistryBadges = async () => { /* ... */ }

// Actions
const handleAssignBadge = async () => { /* ... */ }
const handleRetryMint = async (queueId: number) => { /* ... */ }
```

---

## API Integration

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/badges/templates` | GET | Fetch all templates |
| `/api/badges/templates` | POST | Create new template |
| `/api/badges/templates/:id` | PATCH | Update template |
| `/api/badges/templates/:id` | DELETE | Delete template |
| `/api/badges/registry` | GET | Fetch badge registry |
| `/api/badges/list` | GET | Fetch user badges |
| `/api/badges/assign` | POST | Manually assign badge |
| `/api/badges/mint/queue` | GET | Fetch mint queue |
| `/api/badges/mint/queue/:id/retry` | POST | Retry failed mint |

### Example API Calls

**Fetch Templates**:
```typescript
const response = await fetch('/api/badges/templates')
const templates = await response.json()
```

**Assign Badge**:
```typescript
const response = await fetch('/api/badges/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fid: 12345,
    badgeType: 'gmeow_vanguard',
    tier: 'legendary',
    chain: 'base',
    queueMint: true
  })
})
```

**Retry Mint**:
```typescript
const response = await fetch(`/api/badges/mint/queue/${queueId}/retry`, {
  method: 'POST'
})
```

---

## Styling

### Tier Color System

```typescript
const tierColors: Record<TierType, string> = {
  mythic: '#9C27FF',      // Purple
  legendary: '#FFD966',   // Gold
  epic: '#61DFFF',        // Blue
  rare: '#A18CFF',        // Light Purple
  common: '#D3D7DC',      // Gray
}
```

### Component Styles

**Card Backgrounds**:
```css
.pixel-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

**Tier Pills**:
```css
.tier-pill {
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: {tierColor}20;
  color: {tierColor};
  border: 1px solid {tierColor}40;
}
```

**Status Badges**:
- Pending: `bg-blue-500/20 text-blue-400`
- Processing: `bg-yellow-500/20 text-yellow-400`
- Minted: `bg-green-500/20 text-green-400`
- Failed: `bg-red-500/20 text-red-400`

---

## Access Control

### Admin Authentication

**Route Protection**: `/admin` route requires admin authentication

**Auth Check**:
```typescript
// middleware.ts or admin layout
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('fid', user.fid)
  .single()

if (profile.role !== 'admin') {
  redirect('/403')
}
```

**Admin Roles**:
- `admin`: Full access to badge management
- `moderator`: Read-only access (future)
- `user`: No access

---

## Error Handling

### User-Facing Errors

**Display Strategy**:
- Toast notifications for success/error
- Inline error messages for form validation
- Error boundaries for component crashes

**Common Errors**:
```typescript
{
  'BADGE_ALREADY_ASSIGNED': 'This user already has this badge',
  'INVALID_FID': 'Invalid Farcaster ID',
  'BADGE_NOT_FOUND': 'Badge not found in registry',
  'MINT_FAILED': 'Failed to queue badge for minting',
  'INSUFFICIENT_PERMISSIONS': 'Admin access required',
}
```

### Error Recovery

**Failed Mints**:
1. Display error message from queue
2. Show retry button (if retries remaining)
3. Show delete button (if max retries exceeded)

**Network Errors**:
1. Show generic "Network error" message
2. Retry button for user-initiated retry
3. Auto-retry for background operations

---

## Performance

### Data Loading

**Initial Load**:
- Templates: Fetch on mount
- Queue: Fetch on mount
- Registry: Fetch on mount (cached)
- Assignments: Lazy load on tab switch

**Refresh Strategy**:
- Auto-refresh queue every 30 seconds (when tab active)
- Manual refresh button for templates/registry
- Real-time updates via Supabase subscriptions (future)

### Optimization

**Code Splitting**:
```typescript
// Lazy load admin panel
const BadgeManagerPanel = lazy(() => import('@/components/admin/BadgeManagerPanel'))
```

**Memoization**:
```typescript
const filteredQueue = useMemo(() => 
  queueItems.filter(item => queueFilter === 'all' || item.status === queueFilter),
  [queueItems, queueFilter]
)
```

---

## Testing

### Manual Testing

1. **Templates Tab**:
   - Create new template
   - Edit existing template
   - Delete template
   - Verify tier colors

2. **Mint Queue Tab**:
   - Filter by status
   - Retry failed mint
   - View transaction on explorer

3. **Registry Tab**:
   - Filter by tier
   - Open badge detail modal
   - Search badges

4. **Manual Assignment Tab**:
   - Assign badge to FID
   - Queue mint
   - Verify assignment in database

### Automated Testing

Run verification script:
```bash
./scripts/qa/verify-phase-3b.sh
```

---

## Future Enhancements

### Phase 3B+ Features

1. **Bulk Assignment**: CSV upload for batch assignments
2. **Badge Analytics**: Charts for assignment/mint stats
3. **User Search**: Search by username/FID
4. **Audit Log**: Track all admin actions
5. **Real-Time Updates**: WebSocket for live queue updates

---

## Related Documentation

- [Badge Share Frame](./share-frame.md) - Phase 3C sharing system
- [Mint Queue System](./mint-queue.md) - Phase 3A minting infrastructure
- [Badge Registry](./registry-format.md) - Metadata specification

---

**Version**: 2.1.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready
