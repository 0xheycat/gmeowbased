# Multi-Wallet Cache - Quick Start Guide

Quick reference for using the multi-wallet cache system in your components and APIs.

---

## 🚀 Client-Side Usage (Components)

### Basic Usage - Get All Wallets

```tsx
import { useWallets } from '@/lib/contexts/AuthContext'

function MyComponent() {
  const wallets = useWallets()
  
  return (
    <div>
      <h2>You have {wallets.length} wallets connected</h2>
      <ul>
        {wallets.map(wallet => (
          <li key={wallet}>{wallet}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Full Context Access

```tsx
import { useAuthContext } from '@/lib/contexts/AuthContext'

function Dashboard() {
  const { fid, address, cachedWallets, isAuthenticated } = useAuthContext()
  
  if (!isAuthenticated) {
    return <ConnectWallet />
  }
  
  return (
    <div>
      <p>FID: {fid}</p>
      <p>Primary Address: {address}</p>
      <p>All Wallets ({cachedWallets.length}):</p>
      <ul>
        {cachedWallets.map(wallet => (
          <li key={wallet}>{wallet}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Activity Feed with Multi-Wallet

```tsx
import { useWallets } from '@/lib/contexts/AuthContext'
import { getPointsTransactions } from '@/lib/subsquid/points-transactions'

function ActivityFeed() {
  const wallets = useWallets()
  const [activities, setActivities] = useState([])
  
  useEffect(() => {
    async function loadActivities() {
      // Query Subsquid for ALL wallets in parallel
      const results = await Promise.all(
        wallets.map(wallet => getPointsTransactions(wallet, { limit: 100 }))
      )
      
      // Flatten and sort by timestamp
      const allActivities = results.flat().sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
      
      setActivities(allActivities)
    }
    
    if (wallets.length > 0) {
      loadActivities()
    }
  }, [wallets])
  
  return (
    <div>
      {activities.map(activity => (
        <ActivityCard key={activity.id} {...activity} />
      ))}
    </div>
  )
}
```

### Quest Eligibility Check

```tsx
import { useWallets } from '@/lib/contexts/AuthContext'

function QuestCard({ questId }) {
  const wallets = useWallets()
  const [isEligible, setIsEligible] = useState(false)
  
  useEffect(() => {
    async function checkEligibility() {
      // Check if ANY wallet meets requirements
      const checks = await Promise.all(
        wallets.map(wallet => checkQuestRequirement(wallet, questId))
      )
      
      setIsEligible(checks.some(result => result.eligible))
    }
    
    if (wallets.length > 0) {
      checkEligibility()
    }
  }, [wallets, questId])
  
  return (
    <div className={isEligible ? 'eligible' : 'not-eligible'}>
      {isEligible ? '✅ Eligible' : '❌ Not Eligible'}
    </div>
  )
}
```

---

## 🔌 Server-Side Usage (API Routes)

### Basic API - Get Wallets for FID

```typescript
// app/api/my-endpoint/route.ts
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fid = Number(searchParams.get('fid'))
  
  // Get all cached wallets from database
  const wallets = await getAllWalletsForFID(fid)
  
  return Response.json({ 
    fid,
    wallets,
    count: wallets.length 
  })
}
```

### Activity API with Multi-Wallet Scanning

```typescript
// app/api/user/activity/[fid]/route.ts
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'
import { getPointsTransactions } from '@/lib/subsquid/points-transactions'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  const fid = Number(params.fid)
  
  // Get all wallets for this FID
  const wallets = await getAllWalletsForFID(fid)
  
  // Query Subsquid for each wallet in parallel
  const allActivities = await Promise.all(
    wallets.map(wallet => getPointsTransactions(wallet, { limit: 100 }))
  )
  
  // Flatten and sort
  const activities = allActivities
    .flat()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  
  return Response.json({
    success: true,
    fid,
    wallets_scanned: wallets.length,
    activities
  })
}
```

### Stats Aggregation Across Wallets

```typescript
// app/api/stats/[fid]/route.ts
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'
import { createClient } from '@/lib/supabase/edge'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  const fid = Number(params.fid)
  const wallets = await getAllWalletsForFID(fid)
  const supabase = createClient()
  
  // Aggregate stats across all wallets
  const { data: stats } = await supabase
    .from('wallet_stats')
    .select('*')
    .in('wallet_address', wallets)
  
  const totalPoints = stats?.reduce((sum, s) => sum + s.points, 0) || 0
  const totalBadges = stats?.reduce((sum, s) => sum + s.badges_count, 0) || 0
  
  return Response.json({
    fid,
    wallets_count: wallets.length,
    total_points: totalPoints,
    total_badges: totalBadges,
    breakdown: stats
  })
}
```

---

## 🧪 Testing & Debugging

### Demo Component

```tsx
// Add to any page for testing
import { WalletCacheDemo } from '@/components/WalletCacheDemo'

export default function TestPage() {
  return (
    <div className="p-8">
      <h1>Multi-Wallet Cache Test</h1>
      <WalletCacheDemo />
    </div>
  )
}
```

### Console Verification

After connecting wallet, check browser console for:

```
[AuthProvider] Authenticating via wallet address: 0x7539...
[AuthProvider] ✅ Successfully authenticated: { fid: 18139, username: 'heycat' }
[AuthProvider] Cached 3 wallets for FID 18139
```

### API Testing

```bash
# Test profile endpoint
curl "http://localhost:3000/api/user/profile/18139" | jq

# Test activity with multi-wallet
curl "http://localhost:3000/api/user/activity/18139?limit=10" | jq '.wallets_scanned'

# Expected: Should show number of wallets scanned (3 for FID 18139)
```

---

## 🎯 Common Patterns

### Pattern 1: Conditional Rendering Based on Wallet Count

```tsx
function MultiWalletIndicator() {
  const wallets = useWallets()
  
  if (wallets.length === 0) return null
  
  return (
    <div className="badge">
      {wallets.length} wallet{wallets.length > 1 ? 's' : ''}
    </div>
  )
}
```

### Pattern 2: Loading State

```tsx
function WalletList() {
  const { cachedWallets, isLoading } = useAuthContext()
  
  if (isLoading) {
    return <div>Loading wallets...</div>
  }
  
  if (cachedWallets.length === 0) {
    return <div>No wallets found. Connect to sync.</div>
  }
  
  return (
    <ul>
      {cachedWallets.map(w => <li key={w}>{w}</li>)}
    </ul>
  )
}
```

### Pattern 3: Primary vs All Wallets

```tsx
function WalletDisplay() {
  const { address, cachedWallets } = useAuthContext()
  
  // Primary connected wallet
  const primary = address
  
  // All other wallets
  const others = cachedWallets.filter(w => 
    w.toLowerCase() !== primary?.toLowerCase()
  )
  
  return (
    <div>
      <p>Primary: {primary}</p>
      {others.length > 0 && (
        <>
          <p>Additional wallets:</p>
          <ul>
            {others.map(w => <li key={w}>{w}</li>)}
          </ul>
        </>
      )}
    </div>
  )
}
```

---

## 🔄 Force Refresh (Advanced)

### Manual Wallet Sync

```tsx
import { useAuthContext } from '@/lib/contexts/AuthContext'
import { syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'

function WalletRefreshButton() {
  const { fid, authenticate } = useAuthContext()
  const [syncing, setSyncing] = useState(false)
  
  const handleRefresh = async () => {
    if (!fid) return
    
    setSyncing(true)
    try {
      await syncWalletsFromNeynar(fid, true) // forceUpdate = true
      await authenticate() // Refresh context
    } catch (err) {
      console.error('Sync failed:', err)
    }
    setSyncing(false)
  }
  
  return (
    <button onClick={handleRefresh} disabled={syncing}>
      {syncing ? 'Syncing...' : 'Refresh Wallets'}
    </button>
  )
}
```

---

## 📊 Real-World Example: Complete Activity Page

```tsx
// app/activity/page.tsx
'use client'

import { useAuthContext, useWallets } from '@/lib/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { getPointsTransactions } from '@/lib/subsquid/points-transactions'

export default function ActivityPage() {
  const { fid, isAuthenticated, isLoading } = useAuthContext()
  const wallets = useWallets()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    async function loadActivities() {
      if (wallets.length === 0) return
      
      setLoading(true)
      try {
        // Scan ALL wallets in parallel
        const results = await Promise.all(
          wallets.map(wallet => 
            getPointsTransactions(wallet, { limit: 100 })
          )
        )
        
        // Flatten, sort, deduplicate
        const all = results.flat()
        const sorted = all.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )
        
        setActivities(sorted)
      } catch (err) {
        console.error('Failed to load activities:', err)
      }
      setLoading(false)
    }
    
    loadActivities()
  }, [wallets])
  
  if (isLoading) {
    return <div>Loading authentication...</div>
  }
  
  if (!isAuthenticated) {
    return <div>Please connect wallet to view activities</div>
  }
  
  return (
    <div>
      <h1>Activity Feed</h1>
      <p>FID: {fid}</p>
      <p>Scanning {wallets.length} wallet(s)</p>
      
      {loading ? (
        <div>Loading activities...</div>
      ) : (
        <div>
          <p>{activities.length} activities found</p>
          {activities.map(activity => (
            <ActivityCard key={activity.id} {...activity} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## ✅ Best Practices

1. **Always check wallet count before querying**
   ```tsx
   if (wallets.length === 0) return null
   ```

2. **Use parallel queries for multiple wallets**
   ```tsx
   await Promise.all(wallets.map(w => query(w)))
   ```

3. **Handle loading states properly**
   ```tsx
   const { isLoading } = useAuthContext()
   if (isLoading) return <Spinner />
   ```

4. **Deduplicate results when scanning multiple wallets**
   ```tsx
   const unique = [...new Set(results.map(r => r.id))]
   ```

5. **Use convenience hook for simple cases**
   ```tsx
   const wallets = useWallets() // Instead of destructuring
   ```

---

## 🎉 Summary

**Client-Side**: Use `useWallets()` hook for instant access to cached wallets  
**Server-Side**: Use `getAllWalletsForFID(fid)` to get wallets from database  
**Auto-Sync**: Wallets cached automatically on connect (no manual triggers)  
**Performance**: Zero database queries after initial auth

The multi-wallet cache is now fully integrated and ready to use throughout your application!
