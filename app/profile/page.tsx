'use client'
// we will rebuild profile page with profesional pattern including new structure , this is just temporary implementation with old patterns
// we will fully remove old components and hooks in the next iteration avoiding mix of old and new patterns
// after rebuilding profile page with new profesional patterns
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount } from 'wagmi'
import { ProfileStats } from '@/components/ProfileStats'
import { GMHistory } from '@/components/GMHistory'
import { ProfileSettings } from '@/components/profile/ProfileSettings'
import { ProfileNotificationCenter } from '@/components/profile/ProfileNotificationCenter'
import { ProfileHeroStats } from '@/components/profile/ProfileHeroStats'
import { ProfileStickyHeader } from '@/components/profile/ProfileStickyHeader'
import { FloatingActionMenu, type FloatingAction } from '@/components/profile/FloatingActionMenu'
import { useNotifications } from '@/components/ui/live-notifications'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { farcasterVerificationCache } from '@/lib/cache-storage'
import { upsertNotificationToken } from '@/lib/miniapp-notifications'
import type { ProfileOverviewData } from '@/lib/profile-types'
import { buildProfileOverview, pickAddressFromSource, normalizeAddress, type MiniAppUser } from '@/lib/profile-data'
import { fireMiniappReady, isAllowedReferrer, isEmbedded } from '@/lib/miniappEnv'
import { fetchUserByFid, fetchUserByUsername } from '@/lib/neynar'

export default function ProfilePage() {
  const { showNotification } = useNotifications()
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount()
  const [contextUser, setContextUser] = useState<MiniAppUser | null>(null)
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [contextAddress, setContextAddress] = useState<`0x${string}` | null>(null)
  const [profileData, setProfileData] = useState<ProfileOverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextReady, setContextReady] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [embeddedApp, setEmbeddedApp] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    return isEmbedded()
  })
  const [isManualEditing, setIsManualEditing] = useState(false)
  const [pushTokenRegistered, setPushTokenRegistered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [xpOverlay, setXpOverlay] = useState<XpEventPayload | null>(null)

  // we will rebuild profile page with profesional pattern
  
  return (
    <div>
      <p>Profile page - under reconstruction</p>
    </div>
  )
} 