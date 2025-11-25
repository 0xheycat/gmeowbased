'use client'

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
  const { push: pushNotification } = useNotifications()
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

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const ensureFarcasterLinked = useCallback(async (addr: `0x${string}`) => {
    // Check unified cache first (localStorage with 2min TTL)
    const cached = farcasterVerificationCache.get(addr)
    if (cached !== null) {
      return cached
    }
    
    try {
      const res = await fetch(`/api/farcaster/fid?address=${encodeURIComponent(addr)}`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Unable to verify address link')
      }
      const payload = (await res.json()) as { ok?: boolean; fid?: number }
      const linked = Boolean(payload?.fid)
      
      // Cache result in unified storage (persists across page reloads)
      farcasterVerificationCache.set(addr, linked)
      return linked
    } catch (err) {
      console.error('Farcaster link validation failed:', err)
      // Don't cache errors - allow retry
      throw err
    }
  }, [])

    // Floating action button handlers
  const handleQuickShare = useCallback(async () => {
    if (!profileData?.frameUrl) {
      pushNotification({ tone: 'warning', title: 'No frame URL', description: 'Profile frame is not available yet.' })
      return
    }
    const shareUrl = profileData.frameUrl
    const shareText = `Check out my GMEOW profile!`
    try {
      const { openWarpcastComposer } = await import('@/lib/share')
      await openWarpcastComposer(shareText, shareUrl)
      pushNotification({ tone: 'success', title: 'Opening share', description: 'Redirecting to Warpcast composer...' })
    } catch (err) {
      console.error('Share failed:', err)
      pushNotification({ tone: 'error', title: 'Share failed', description: 'Could not open composer.' })
    }
  }, [profileData?.frameUrl, pushNotification])

  const handleQuickCopy = useCallback(() => {
    if (!address) {
      pushNotification({ tone: 'warning', title: 'No address', description: 'No wallet address to copy.' })
      return
    }
    navigator.clipboard.writeText(address).then(
      () => pushNotification({ tone: 'success', title: 'Copied!', description: 'Wallet address copied to clipboard.' }),
      () => pushNotification({ tone: 'error', title: 'Copy failed', description: 'Could not copy address.' })
    )
  }, [address, pushNotification])

  const handleQuickGM = useCallback(() => {
    pushNotification({ 
      tone: 'info', 
      title: 'Send GM', 
      description: 'Navigate to home page to send your daily GM!',
      href: '/',
      actionLabel: 'Go to Home'
    })
  }, [pushNotification])

  const floatingActions = useMemo<FloatingAction[]>(() => [
    { icon: '⚡', label: 'Send GM', onClick: handleQuickGM },
    { icon: '📤', label: 'Share', onClick: handleQuickShare, disabled: !profileData?.frameUrl },
    { icon: '📋', label: 'Copy', onClick: handleQuickCopy, disabled: !address },
  ], [handleQuickGM, handleQuickShare, handleQuickCopy, profileData?.frameUrl, address])

  const registerPushNotifications = useCallback(async () => {
    if (!contextUser?.fid || !embeddedApp) {
      return false
    }

    try {
      // Get notification context from SDK
      const context = await sdk.context
      const notificationDetails = context?.client?.notificationDetails

      if (!notificationDetails?.url || !notificationDetails?.token) {
        pushNotification({
          tone: 'warning',
          category: 'system',
          title: 'Notifications Unavailable',
          description: 'Push notifications are not available in this context.',
          duration: 5000,
        })
        return false
      }

      // Register token with backend
      const success = await upsertNotificationToken({
        fid: contextUser.fid,
        token: notificationDetails.token,
        notificationUrl: notificationDetails.url,
        status: 'enabled',
        eventType: 'profile_registration',
        walletAddress: address ?? undefined,
      })

      if (success) {
        setPushTokenRegistered(true)
        pushNotification({
          tone: 'success',
          category: 'system',
          title: 'Push Notifications Enabled',
          description: 'You will receive notifications for important events.',
          duration: 5000,
        })
        return true
      } else {
        throw new Error('Token registration failed')
      }
    } catch (error) {
      console.error('[Push] Registration error:', error)
      pushNotification({
        tone: 'error',
        category: 'system',
        title: 'Push Registration Failed',
        description: 'Unable to enable push notifications. Try again later.',
        duration: 5000,
      })
      return false
    }
  }, [contextUser, embeddedApp, address, pushNotification])

  const selectAddress = useCallback(
    async (
      addr: `0x${string}`,
      options?: {
        requireLinked?: boolean
        resetManualMessage?: boolean
        pinAsContext?: boolean
      },
    ): Promise<boolean> => {
      const normalized = addr.toLowerCase() as `0x${string}`
      if (options?.requireLinked) {
        try {
          const linked = await ensureFarcasterLinked(normalized)
          if (!linked) {
            setProfileData(null)
            setError('This wallet is not linked to Farcaster. Choose a verified address.')
            setManualMessage('Wallet is not linked to Farcaster.')
            pushNotification({
              tone: 'warning',
              category: 'system',
              title: 'Not Linked',
              description: 'This wallet is not connected to Farcaster.',
              duration: 5000,
            })
            return false
          }
          pushNotification({
            tone: 'success',
            category: 'system',
            title: 'Wallet Verified',
            description: 'Farcaster link confirmed.',
            duration: 2000,
          })
        } catch {
          setProfileData(null)
          setError('Unable to verify Farcaster link. Try again in a moment.')
          setManualMessage('Verification failed—please retry.')
          pushNotification({
            tone: 'error',
            category: 'system',
            title: 'Verification Error',
            description: 'Unable to verify Farcaster link. Try again.',
            duration: 5000,
          })
          return false
        }
      }

      setAddress(normalized)
      if (options?.pinAsContext) {
        setContextAddress(normalized)
      }
      if (options?.resetManualMessage) setManualMessage(null)
      setError(null)
      setContextReady(true)
      return true
    },
    [ensureFarcasterLinked, pushNotification],
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const embedded = isEmbedded()
        setEmbeddedApp(embedded)
        const referrer = typeof document !== 'undefined' ? document.referrer : ''
        const allowed = embedded ? isAllowedReferrer() : false

        if (!embedded) {
          setContextReady(true)
          setError(null)
          setManualMessage((prev) => prev ?? 'Paste any Farcaster-linked wallet to explore stats from the web.')
          return
        }

        if (!allowed && referrer) {
          if (active) {
            setError('Launch this miniapp from Warpcast to sync your Farcaster identity.')
            setContextReady(true)
          }
          return
        }

        await fireMiniappReady()
        const context = await sdk.context
        if (!active) return

        const userObj = (context?.user || null) as MiniAppUser | null
        setContextUser(userObj)

        const resolved = pickAddressFromSource(context) || pickAddressFromSource(userObj)
        if (resolved) {
          // Cache Farcaster-linked address
          farcasterVerificationCache.set(resolved, true)
          await selectAddress(resolved, { requireLinked: false, resetManualMessage: true, pinAsContext: true })
        }

        setContextReady(true)
      } catch (err) {
        if (!active) return
        console.error('Failed to load user context:', err)
        setError('Unable to load Farcaster context. Refresh and try again.')
        setContextReady(true)
      }
    })()
    return () => {
      active = false
    }
  }, [selectAddress])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const manual = params.get('address') ?? params.get('addr') ?? params.get('user')
    if (!manual) return
    const normalized = /^0x[a-fA-F0-9]{40}$/.test(manual.trim()) ? (manual.trim().toLowerCase() as `0x${string}`) : null
    if (!normalized) return
    setManualInput(normalized)
    setManualMessage('Checking Farcaster link…')
    void (async () => {
      const ok = await selectAddress(normalized, { requireLinked: true })
      if (ok) {
        setManualMessage(null)
      }
    })()
  }, [selectAddress])

  useEffect(() => {
    if (address || !contextUser) return
    let cancelled = false

    ;(async () => {
      try {
        const fallbackUser = contextUser.fid
          ? await fetchUserByFid(contextUser.fid)
          : contextUser.username
            ? await fetchUserByUsername(contextUser.username)
            : null
        if (cancelled) return
        if (!fallbackUser) return

        const merged = {
          ...contextUser,
          ...fallbackUser,
          walletAddress: fallbackUser.walletAddress ?? contextUser.walletAddress,
          custodyAddress: fallbackUser.custodyAddress ?? contextUser.custodyAddress,
          verifications: fallbackUser.verifications ?? contextUser.verifications,
          verifiedAddresses: fallbackUser.verifications ?? contextUser.verifiedAddresses,
        }
        const resolved = pickAddressFromSource(merged)
        if (resolved) {
          // Cache Farcaster-linked address from fallback
          farcasterVerificationCache.set(resolved, true)
          await selectAddress(resolved, { requireLinked: false, resetManualMessage: true, pinAsContext: true })
          setError(null)
        }
      } catch (err) {
        if (!cancelled) console.warn('Farcaster address lookup failed:', err)
      } finally {
        if (!cancelled) setContextReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, contextUser, selectAddress])

  useEffect(() => {
    if (!contextReady) return
    if (address) return
    
    // Try wagmi wallet as fallback if not embedded miniapp
    if (embeddedApp === false && isWagmiConnected && wagmiAddress) {
      void selectAddress(wagmiAddress, { requireLinked: true, resetManualMessage: true })
      return
    }
    
    if (embeddedApp === false) {
      if (error) setError(null)
      return
    }
    if (error) return
    setError('No connected wallet detected. Connect a wallet in Warpcast.')
  }, [contextReady, address, error, embeddedApp, isWagmiConnected, wagmiAddress, selectAddress])

  const handleManualSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const normalized = normalizeAddress(manualInput)
      if (!normalized) {
        setManualMessage('Enter a valid 0x wallet address.')
        return
      }
      setManualInput(normalized)
      setManualMessage('Checking Farcaster link…')
      const ok = await selectAddress(normalized, { requireLinked: true })
      if (ok) {
        setManualMessage(null)
        setIsManualEditing(false)
      }
    },
    [manualInput, selectAddress],
  )

  const handleManualChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setIsManualEditing(true)
    setManualInput(event.target.value)
    if (manualMessage) setManualMessage(null)
  }, [manualMessage])

  const handleManualBlur = useCallback(() => {
    setIsManualEditing(false)
  }, [])

  useEffect(() => {
    if (!address) return
    if (isManualEditing) return
    setManualInput(address)
  }, [address, isManualEditing])

  useEffect(() => {
    if (profileData?.address) {
      setManualMessage(`Tracking wallet ${profileData.address}`)
    }
  }, [profileData?.address])

  const trackedAddress = profileData?.address ?? address ?? contextAddress ?? null
  const activeWalletLabel = trackedAddress ? `${trackedAddress.slice(0, 6)}…${trackedAddress.slice(-4)}` : null
  const isUsingFallbackWallet = Boolean(contextAddress && address && contextAddress !== address)
  const gmHistoryUser = contextUser
    ? {
        fid: contextUser.fid ?? 0,
        username: contextUser.username,
        displayName: contextUser.displayName,
      }
    : { fid: 0 }
  const compactLayout = embeddedApp !== false
  const cardStatus = (() => {
    if (error) {
      return {
        tone: 'alert',
        label: 'Attention required',
        detail: error,
      }
    }
    if (loading) {
      return {
        tone: 'loading',
        label: 'Sync in progress',
        detail: 'Pulling on-chain activity and Neynar identity.',
      }
    }
    if (profileData) {
      return {
        tone: 'ready',
        label: 'Stream active',
        detail: 'Stats refreshed from the latest GM activity.',
      }
    }
    if (contextReady && !trackedAddress) {
      if (embeddedApp === false) {
        return {
          tone: 'idle',
          label: 'Web explorer mode',
          detail: 'Paste any wallet below to view Farcaster-linked progress.',
        }
      }
      return {
        tone: 'idle',
        label: 'Awaiting signal',
        detail: 'Connect from Warpcast or supply a wallet below.',
      }
    }
    return {
      tone: 'idle',
      label: 'Ready to sync',
      detail: 'Paste any wallet address to inspect its footprint.',
    }
  })()
  const loadProfile = useCallback(
    async (addr: `0x${string}`, miniUser: MiniAppUser | null, signal?: AbortSignal) => {
      if (signal?.aborted) return
      setLoading(true)
      setError(null)

      try {
        const overview = await buildProfileOverview(addr, miniUser)
        if (signal?.aborted) return
        if (!overview.fid) {
          setProfileData(null)
          setError('This wallet no longer resolves to a Farcaster identity.')
          setManualMessage('Wallet is not currently linked to Farcaster.')
          pushNotification({
            tone: 'error',
            category: 'system',
            title: 'Profile Not Found',
            description: 'This wallet is not linked to Farcaster.',
            duration: 5000,
          })
          return
        }
        setProfileData(overview)
        pushNotification({
          tone: 'success',
          category: 'system',
          title: 'Profile Loaded',
          description: `Welcome back, ${overview.displayName || 'user'}!`,
          duration: 3000,
        })
      } catch (err) {
        if (signal?.aborted) return
        console.error('Profile load failed:', err)
        setError((err as Error)?.message || 'Failed to load profile data.')
        setProfileData(null)
        pushNotification({
          tone: 'error',
          category: 'system',
          title: 'Load Failed',
          description: (err as Error)?.message || 'Unable to load profile data.',
          duration: 5000,
        })
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [pushNotification],
  )

  useEffect(() => {
    if (!address) {
      setProfileData(null)
      return
    }
    const controller = new AbortController()
    void loadProfile(address, contextUser, controller.signal)
    return () => {
      controller.abort()
      setLoading(false)
    }
  }, [address, contextUser, loadProfile])

  const loadingContext = !contextReady && !address && !error

  if (loadingContext) {
    return (
      <div className="relative min-h-screen pixel-page">
        <div className="pixel-bg-overlay" aria-hidden>
          <div className="pixel-grid-overlay" />
          <div className="pixel-dither-overlay" />
          <div className="pixel-scanlines-overlay" />
        </div>

        <main className={`container relative z-10 mx-auto ${compactLayout ? 'px-3 py-6 pb-[calc(56px+env(safe-area-inset-bottom,0px)+1rem)]' : 'px-4 py-10 pb-24 sm:pb-16'}`}>
          <section className={`mega-card${compactLayout ? ' mega-card--compact' : ''}`}>
            <div className="mega-card__shadow" aria-hidden />
            <div className="mega-card__glare" aria-hidden />
            <div className="mega-card__layer mega-card__layer--loading">
              <div className="mega-card__loading">
                <div className="mega-card__loading-spinner" />
                <p className="mega-card__status-title">Preparing context</p>
                <p className="mega-card__status-copy">Syncing with Warpcast…</p>
              </div>
            </div>
          </section>

          {/* Floating Action Button (Mobile + Miniapp Only) */}
          {isMobile && embeddedApp && address && (
            <FloatingActionMenu
              actions={floatingActions}
              className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-50"
            />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pixel-page">
      <div className="pixel-bg-overlay" aria-hidden>
        <div className="pixel-grid-overlay" />
        <div className="pixel-dither-overlay" />
        <div className="pixel-scanlines-overlay" />
      </div>

      <main className={`container relative z-10 mx-auto ${compactLayout ? 'px-3 py-6 pb-[calc(56px+env(safe-area-inset-bottom,0px)+1rem)]' : 'px-4 py-10 pb-24 sm:pb-16'}`}>
        {/* Mobile Sticky Header */}
        {isMobile && profileData && address && (
          <ProfileStickyHeader
            avatarUrl={profileData.farcasterUser?.pfpUrl}
            displayName={profileData.username || profileData.displayName || 'Unknown'}
            address={address}
            totalPoints={profileData.totalPoints}
            globalRank={profileData.globalRank ?? null}
          />
        )}

        {/* Mobile Hero Stats */}
        {isMobile && profileData && (
          <ProfileHeroStats
            totalPoints={profileData.totalPoints}
            globalRank={profileData.globalRank ?? null}
            streak={profileData.streak}
          />
        )}

        <section className={`mega-card${compactLayout ? ' mega-card--compact' : ''}`}>
          <div className="mega-card__shadow" aria-hidden />
          <div className="mega-card__glare" aria-hidden />
          <div className="mega-card__layer">
            <header className="mega-card__header">
              <div className="mega-card__header-left">
                <span className="mega-card__glyph" aria-hidden>SYNC</span>
                <div className={`mega-card__status mega-card__status--${cardStatus.tone}`}>
                  <p className="mega-card__status-title">{cardStatus.label}</p>
                  <p className="mega-card__status-copy">{cardStatus.detail}</p>
                </div>
              </div>
              <div className="mega-card__header-right">
                {activeWalletLabel ? (
                  <span className="mega-card__chip" title={trackedAddress || undefined}>
                    {activeWalletLabel}
                  </span>
                ) : (
                  <span className="mega-card__chip mega-card__chip--muted">No wallet synced</span>
                )}
                {isUsingFallbackWallet ? <span className="mega-card__chip mega-card__chip--accent">Manual override</span> : null}
              </div>
            </header>

            <div className="mega-card__grid">
              <div className="mega-card__panel mega-card__panel--controls">
                <form onSubmit={handleManualSubmit} className="mega-card__form" aria-label="Wallet selector">
                  <label className="mega-card__label" htmlFor="profile-address">
                    Wallet lookup
                  </label>
                  <div className="mega-card__input-row gap-2 sm:gap-3">
                    <input
                      id="profile-address"
                      value={manualInput}
                      onChange={handleManualChange}
                      onFocus={() => setIsManualEditing(true)}
                      onBlur={handleManualBlur}
                      placeholder="0xabc..."
                      className="pixel-input mega-card__input"
                      spellCheck={false}
                      autoComplete="off"
                      inputMode="text"
                    />
                    <button type="submit" className="pixel-button mega-card__submit min-h-6">
                      Sync
                    </button>
                  </div>
                  <div className="mega-card__actions">
                    {contextAddress ? (
                      <button
                        type="button"
                        className="mega-card__ghost min-h-[44px] py-2"
                        onClick={() => {
                          setManualInput(contextAddress)
                          setManualMessage('Switched to linked wallet.')
                          void selectAddress(contextAddress, { requireLinked: false, pinAsContext: true })
                        }}
                        disabled={!address || address === contextAddress}
                      >
                        Use linked
                      </button>
                    ) : (
                      <span className="mega-card__ghost mega-card__ghost--disabled">No linked wallet</span>
                    )}
                    <div className="mega-card__hint">
                      {manualMessage
                          ? manualMessage
                          : contextAddress
                            ? 'Linked wallet ready. Paste a different address to inspect it.'
                            : embeddedApp === false
                              ? 'Explore from desktop by pasting a Farcaster-linked wallet.'
                              : 'Paste any wallet to explore Farcaster activity.'}
                    </div>
                  </div>
                  {error ? <p className="mega-card__note mega-card__note--error">{error}</p> : null}
                </form>
              </div>

              <div className="mega-card__slot mega-card__slot--history">
                <GMHistory user={gmHistoryUser} address={trackedAddress ?? undefined} />
              </div>
            </div>

            <div className="mt-6 flex justify-center sm:mt-8 lg:mt-10">
              <div className="w-full max-w-5xl space-y-6">
                {contextUser?.fid && embeddedApp && (
                  <ProfileSettings
                    fid={contextUser.fid}
                    onPushRegistrationRequest={registerPushNotifications}
                  />
                )}
                
                <ProfileNotificationCenter />
                
                <ProfileStats
                  address={address ?? undefined}
                  data={profileData}
                  loading={loading}
                  error={error}
                />
                
                {pushTokenRegistered && (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-center">
                    <p className="text-[12px] text-emerald-100">
                      ✅ Push notifications active for this session
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <XPEventOverlay open={Boolean(xpOverlay)} payload={xpOverlay} onClose={() => setXpOverlay(null)} />
    </div>
  )
}