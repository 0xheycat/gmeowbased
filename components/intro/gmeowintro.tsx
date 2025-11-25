'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchUserByUsername } from '@/lib/neynar'

const STORAGE_KEY = 'gmeow:intro.hero.v1'
const DEFAULT_IDENTIFY_ENDPOINT = '/api/frame/identify'
const DEFAULT_PREFETCH_ENDPOINT = '/api/frame/'
const VERIFIED_TOKEN_SOURCE = 'https://tokens.coingecko.com/base/all.json'
const VERIFIED_TOKEN_SYMBOLS = ['USDC', 'WETH', 'CBETH', 'ENA', 'DAI+', 'USDE'] as const

type FinishContext = {
  username?: string | null
  fid?: number | null
  wallet?: string | null
  durationMs?: number
}

type MegaIntroProps = {
  onFinish?: (context: FinishContext) => void
  showOnce?: boolean
  forceShow?: boolean
  identifyEndpoint?: string | null
  prefetchEndpoint?: string | null
  respectReducedMotion?: boolean
  enableAudio?: boolean
}

type IdentityShape = {
  username: string | null
  displayName: string | null
  fid: number | null
  walletAddress: string | null
  custodyAddress: string | null
  powerBadge: boolean
}

type VerifiedSymbol = (typeof VERIFIED_TOKEN_SYMBOLS)[number]

type VerifiedToken = {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI?: string
}

type Step = {
  title: string
  detail: string
}

type Safeguard = {
  title: string
  detail: string
}

type PlaybookEntry = {
  title: string
  bullets: string[]
}

type EligibilitySignal = {
  label: string
  detail: string
  status: 'success' | 'pending' | 'info' | 'error'
}

const CREATOR_STEPS: Step[] = [
  {
    title: 'Draft the quest',
    detail:
      'Start from a daily GM, partner drop, or blank template. We pre-load recommended quest settings and reward logic.',
  },
  {
    title: 'Pick a verified reward',
    detail:
      'Choose from Coingecko-verified Base tokens or keep it XP-only. No unvetted contracts ever touch your quest.',
  },
  {
    title: 'Configure eligibility & notifications',
    detail:
      'Gate by streak length, guild membership, power badge, or custom allowlists. Preview the Warpcast push copy before it ships.',
  },
  {
    title: 'Run it live',
    detail:
      'Prefetch analytics, sync to Warpcast frames, and monitor completions in real time. Pause or edit without redeploying.',
  },
]

const BUILT_IN_SAFEGUARDS: Safeguard[] = [
  {
    title: 'Verified token registry',
    detail:
      'Only assets from the Coingecko Base list make the cut. We trim to reviewed symbols to avoid typo airdrops and exploits.',
  },
  {
    title: 'Quest simulator',
    detail:
      'Stage your quest in a sandbox with mocked wallets and FIDs before you publish. Confirm reward math and eligibility behaviour safely.',
  },
  {
    title: 'Automatic fail-safes',
    detail:
      'Rate limits, quest expiry windows, and optional signer review mode protect partners from runaway claims.',
  },
]

const PARTNER_PLAYBOOK: PlaybookEntry[] = [
  {
    title: 'Launch cadence',
    bullets: [
      'Monday: daily GM streak quest with XP-only rewards.',
      'Wednesday: partner token reward + Warpcast push.',
      'Friday: guild-exclusive boost gated by power badge holders.',
    ],
  },
  {
    title: 'Quality bar',
    bullets: [
      'Prefer ERC20s with audited contracts and healthy liquidity.',
      'Reference the onchain action in quest copy and rewards.',
      'Bundle quests with Warpcast frames or miniapp links for conversion.',
    ],
  },
]

const TOKEN_FALLBACK_METADATA: Record<VerifiedSymbol, { name: string; decimals: number }> = {
  USDC: { name: 'USD Coin', decimals: 6 },
  WETH: { name: 'Wrapped Ether', decimals: 18 },
  CBETH: { name: 'Coinbase Wrapped Staked ETH', decimals: 18 },
  ENA: { name: 'Ethena', decimals: 18 },
  'DAI+': { name: 'Mountain Protocol DAI+', decimals: 18 },
  USDE: { name: 'Ethena USDe', decimals: 18 },
}

const FALLBACK_TOKENS: VerifiedToken[] = VERIFIED_TOKEN_SYMBOLS.map((symbol) => ({
  symbol,
  name: TOKEN_FALLBACK_METADATA[symbol].name,
  decimals: TOKEN_FALLBACK_METADATA[symbol].decimals,
  address: '',
}))

const VERIFIED_TOKEN_SYMBOL_SET = new Set<string>(VERIFIED_TOKEN_SYMBOLS)

const STATUS_ICON: Record<EligibilitySignal['status'], string> = {
  success: '✅',
  pending: '⏳',
  info: '💡',
  error: '⚠️',
}

const STATUS_SR_LABEL: Record<EligibilitySignal['status'], string> = {
  success: 'ready',
  pending: 'pending',
  info: 'informational',
  error: 'action required',
}

function usePrefersReducedMotion(shouldRespect: boolean) {
  const [prefers, setPrefers] = useState(false)

  useEffect(() => {
    if (!shouldRespect) {
      setPrefers(false)
      return
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setPrefers(false)
      return
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handle = () => setPrefers(media.matches)
    handle()
    media.addEventListener('change', handle)
    return () => media.removeEventListener('change', handle)
  }, [shouldRespect])

  return shouldRespect ? prefers : false
}

function useVerifiedTokenList(visible: boolean) {
  const [tokens, setTokens] = useState<VerifiedToken[]>(FALLBACK_TOKENS)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!visible) return
    if (status === 'loading' || status === 'ready') return

    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setStatus('loading')
      try {
        const res = await fetch(VERIFIED_TOKEN_SOURCE, { signal: controller.signal })
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const json = (await res.json()) as { tokens?: VerifiedToken[] }
        const candidates = Array.isArray(json?.tokens) ? json.tokens : []
        const filtered = candidates.filter((token) => VERIFIED_TOKEN_SYMBOL_SET.has(token.symbol))
        const sorted = VERIFIED_TOKEN_SYMBOLS.map((symbol) =>
          filtered.find((token) => token.symbol === symbol)
        ).filter(Boolean) as VerifiedToken[]
        if (!cancelled && sorted.length) {
          setTokens(sorted)
          setStatus('ready')
        } else if (!cancelled) {
          setTokens(FALLBACK_TOKENS)
          setStatus('error')
        }
      } catch (err) {
        if (cancelled) return
        console.warn('Failed to load verified token list:', err)
        setTokens(FALLBACK_TOKENS)
        setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [visible, status])

  return { tokens, status }
}

function shortAddress(value?: string | null, keep = 4) {
  if (!value) return ''
  if (!value.startsWith('0x') || value.length <= keep * 2 + 2) return value
  return `${value.slice(0, keep + 2)}…${value.slice(-keep)}`
}

function toTitle(handle: IdentityShape | null): string | null {
  if (!handle) return null
  if (handle.username) return `@${handle.username}`
  if (handle.displayName) return handle.displayName
  return null
}

export function MegaIntro({
  onFinish,
  showOnce = true,
  forceShow = false,
  identifyEndpoint = DEFAULT_IDENTIFY_ENDPOINT,
  prefetchEndpoint = DEFAULT_PREFETCH_ENDPOINT,
  respectReducedMotion = true,
  enableAudio = false,
}: MegaIntroProps) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [identity, setIdentity] = useState<IdentityShape | null>(null)
  const [identityStatus, setIdentityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameUser, setUsernameUser] = useState<IdentityShape | null>(null)
  const [loadingStage, setLoadingStage] = useState<'scanning' | 'checking' | 'ready' | null>(null)

  const closeTimerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const prefersReducedMotion = usePrefersReducedMotion(respectReducedMotion)
  const { tokens, status: tokenStatus } = useVerifiedTokenList(visible)

  const finishIntro = useCallback(
    (reason: 'cta' | 'skip') => {
      if (finishedRef.current) return
      finishedRef.current = true
      setClosing(true)

      if (showOnce) {
        try {
          window.localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          // ignore storage errors
        }
      }

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const duration =
        startTimeRef.current != null ? Math.max(0, Math.round(endTime - startTimeRef.current)) : undefined

      onFinish?.({
        username: identity?.username ?? identity?.displayName ?? null,
        fid: identity?.fid ?? null,
        wallet: identity?.walletAddress ?? identity?.custodyAddress ?? null,
        durationMs: duration,
      })

      const closeDelay = prefersReducedMotion ? 80 : reason === 'skip' ? 140 : 320

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
      closeTimerRef.current = window.setTimeout(() => {
        setVisible(false)
        setClosing(false)
        closeTimerRef.current = null
      }, closeDelay)
    },
    [identity, onFinish, prefersReducedMotion, showOnce]
  )

  useEffect(() => {
    if (forceShow) {
      setVisible(true)
      return
    }
    if (!showOnce) {
      setVisible(true)
      return
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      setVisible(!stored)
    } catch {
      setVisible(true)
    }
  }, [forceShow, showOnce])

  useEffect(() => {
    if (!visible) return undefined

    finishedRef.current = false
    setClosing(false)
    setIdentity(null)
    setIdentityStatus('idle')
    startTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finishIntro('skip')
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, finishIntro])

  useEffect(() => {
    if (!visible) return
    if (!identifyEndpoint) {
      setIdentityStatus('error')
      return
    }
    if (identityStatus !== 'idle') return

    const endpoint = identifyEndpoint

    let cancelled = false
    const controller = new AbortController()

    async function loadIdentity() {
      setIdentityStatus('loading')
      // Debounce to prevent blocking mobile UI
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        const res = await fetch(endpoint, { signal: controller.signal, method: 'GET' })
        if (!res.ok) throw new Error(`Identify endpoint responded with ${res.status}`)
        const json = await res.json()
        if (cancelled) return
        const next: IdentityShape = {
          username: json.username ?? json.user ?? json.handle ?? null,
          displayName: json.displayName ?? json.name ?? null,
          fid:
            typeof json.fid === 'number'
              ? json.fid
              : typeof json.fid === 'string'
                ? Number.parseInt(json.fid, 10)
                : typeof json.userFid === 'number'
                  ? json.userFid
                  : null,
          walletAddress:
            typeof json.walletAddress === 'string'
              ? json.walletAddress
              : typeof json.wallet === 'string'
                ? json.wallet
                : typeof json.address === 'string'
                  ? json.address
                  : typeof json.primaryAddress === 'string'
                    ? json.primaryAddress
                    : typeof json.custodyAddress === 'string'
                      ? json.custodyAddress
                      : null,
          custodyAddress:
            typeof json.custodyAddress === 'string' ? json.custodyAddress : null,
          powerBadge: Boolean(
            json.powerBadge ||
              json.hasPowerBadge ||
              (Array.isArray(json.badges) && json.badges.includes('power'))
          ),
        }
        setIdentity(next)
        setIdentityStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.warn('Failed to load identity for intro:', err)
        setIdentity(null)
        setIdentityStatus('error')
      }
    }

    void loadIdentity()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [visible, identifyEndpoint, identityStatus])

  // Add loading stage animation effect
  useEffect(() => {
    if (identityStatus === 'loading') {
      setLoadingStage('scanning')
      const timer1 = setTimeout(() => setLoadingStage('checking'), 1200)
      const timer2 = setTimeout(() => setLoadingStage('ready'), 2400)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    } else if (identityStatus === 'ready') {
      setLoadingStage('ready')
    } else {
      setLoadingStage(null)
    }
  }, [identityStatus])

  // Username lookup handler
  const handleUsernameSubmit = useCallback(async () => {
    const username = usernameInput.trim().replace(/^@/, '')
    if (!username || usernameLoading) return
    
    setUsernameLoading(true)
    try {
      const user = await fetchUserByUsername(username)
      if (user) {
        const mappedUser: IdentityShape = {
          username: user.username ?? null,
          displayName: user.displayName ?? null,
          fid: user.fid ?? null,
          walletAddress: (user.verifications?.[0] as `0x${string}`) ?? null,
          custodyAddress: user.custodyAddress ?? null,
          powerBadge: user.powerBadge ?? false,
        }
        setUsernameUser(mappedUser)
        // Optionally update identity
        if (!identity || identityStatus === 'error') {
          setIdentity(mappedUser)
          setIdentityStatus('ready')
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user by username:', error)
    } finally {
      setUsernameLoading(false)
    }
  }, [usernameInput, usernameLoading, identity, identityStatus])

  useEffect(() => {
    if (!visible) return
    if (!prefetchEndpoint) return
    fetch(prefetchEndpoint).catch(() => null)
  }, [visible, prefetchEndpoint])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [])

  const heroNotice = useMemo(() => {
    if (loadingStage === 'scanning') return '✨ Scanning your profile...'
    if (loadingStage === 'checking') return '🔍 Checking OG eligibility...'
    if (identityStatus === 'loading') return 'Linking your Farcaster identity…'
    if (identity) {
      const handle = toTitle(identity)
      const badge = identity.powerBadge ? ' • Power badge detected' : ''
      const isOG = identity.fid != null && identity.fid < 10000
      const ogTag = isOG ? ' 🏆 OG Pioneer Detected!' : ''
      return `Signed in${handle ? ` as ${handle}` : ''}${badge}${ogTag}`
    }
    if (identityStatus === 'error') return 'Could not reach Neynar — continue in offline mode.'
    return 'Quest creator opens in sandbox mode until you link a Farcaster handle.'
  }, [identity, identityStatus, loadingStage])

  const eligibilitySignals = useMemo<EligibilitySignal[]>(() => {
    const isOG = identity?.fid != null && identity.fid < 10000
    return [
      {
        label: 'Farcaster identity',
        detail:
          identity?.fid != null
            ? `FID ${identity.fid}${isOG ? ' 🏆 OG Pioneer' : ''}`
            : identityStatus === 'loading'
              ? 'Resolving via Neynar…'
              : 'We link your Farcaster handle automatically on first publish.',
        status: identity?.fid != null ? 'success' : identityStatus === 'error' ? 'error' : 'pending',
      },
      {
        label: 'Wallet ready',
        detail: identity?.walletAddress
          ? shortAddress(identity.walletAddress)
          : 'Connect a wallet to distribute token rewards. XP-only quests work immediately.',
        status: identity?.walletAddress ? 'success' : 'info',
      },
      {
        label: 'Power badge bonus',
        detail: identity?.powerBadge
          ? 'Bonus trust enabled — unlock partner-only quests.'
          : 'Optional, but earns higher partner trust scores.',
        status: identity?.powerBadge ? 'success' : 'info',
      },
      ...(isOG ? [{
        label: '100 XP Bonus Eligible',
        detail: 'OG users (FID < 10,000) + new users qualify for welcome bonus!',
        status: 'success' as const,
      }] : []),
    ]
  }, [identity, identityStatus])

  if (!visible) return null

  const rootClassName = [
    'mega-intro-root',
    closing ? 'is-closing' : '',
    prefersReducedMotion ? 'prefers-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName} role="dialog" aria-modal="true" aria-label="GMEOW quest creator intro">
      <div className="intro-shell">
        <header className="intro-hero">
          <div className="hero-copy">
            <span className="hero-pill">Quest creator</span>
            <h1 className="hero-title">Launch quests that partners trust</h1>
            <p className="hero-subtitle">
              Verified Base tokens, built-in eligibility checks, and real-time notifications — all in a single streamlined
              flow. Ship drops in minutes without sacrificing safety.
            </p>
            <div className="hero-meta" role="status">
              {heroNotice}
            </div>
            <div className="hero-cta">
              <button type="button" className="hero-button primary" onClick={() => finishIntro('cta')}>
                Enter the quest creator
              </button>
              <button type="button" className="hero-button secondary" onClick={() => finishIntro('skip')}>
                Remind me later
              </button>
            </div>
          </div>
          <TokenPreview tokens={tokens} status={tokenStatus} />
        </header>

        <section className="intro-grid">
          <article className="grid-card">
            <h2 className="card-title">Quest builder flow</h2>
            <ul className="card-list">
              {CREATOR_STEPS.map((step, index) => (
                <li key={step.title} className="card-list-item">
                  <span className="list-index" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                  <div className="list-body">
                    <p className="list-heading">{step.title}</p>
                    <p className="list-detail">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="grid-card">
            <h2 className="card-title">Built-in safeguards</h2>
            <ul className="card-list">
              {BUILT_IN_SAFEGUARDS.map((item) => (
                <li key={item.title} className="card-list-item">
                  <span className="bullet" aria-hidden>🛡️</span>
                  <div className="list-body">
                    <p className="list-heading">{item.title}</p>
                    <p className="list-detail">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="grid-card">
            <h2 className="card-title">Eligibility signals</h2>
            <ul className="card-list signal-list">
              {eligibilitySignals.map((signal) => (
                <li key={signal.label} className={`signal-item status-${signal.status}`}>
                  <span className="signal-icon" aria-hidden>{STATUS_ICON[signal.status]}</span>
                  <div className="list-body">
                    <p className="list-heading">{signal.label}</p>
                    <p className="list-detail">{signal.detail}</p>
                  </div>
                  <span className="sr-only">{`Status: ${STATUS_SR_LABEL[signal.status]}`}</span>
                </li>
              ))}
            </ul>
            
            {/* Username lookup input */}
            {(!identity || identityStatus === 'error') && (
              <div className="username-lookup" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)', borderRadius: '12px' }}>
                <p className="text-sm font-semibold text-amber-400" style={{ marginBottom: '0.75rem' }}>
                  🔍 Lookup Farcaster User
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUsernameSubmit()
                    }}
                    placeholder="Enter @username"
                    disabled={usernameLoading}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                    }}
                  />
                  <button
                    onClick={handleUsernameSubmit}
                    disabled={!usernameInput.trim() || usernameLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: usernameLoading ? 'rgba(255, 215, 0, 0.2)' : 'linear-gradient(135deg, #ffd700, #ffed4e)',
                      border: '1px solid #ffd700',
                      borderRadius: '8px',
                      color: '#000',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: usernameLoading ? 'wait' : 'pointer',
                    }}
                  >
                    {usernameLoading ? '...' : 'Lookup'}
                  </button>
                </div>
                {usernameUser && (
                  <div className="text-xs text-amber-400" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                    ✅ Found: @{usernameUser.username} (FID: {usernameUser.fid})
                    {usernameUser.fid && usernameUser.fid < 10000 && (
                      <span style={{ display: 'block', marginTop: '0.25rem', fontWeight: '600' }}>
                        🏆 OG Pioneer Detected!
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="grid-card">
            <h2 className="card-title">Partner playbook</h2>
            <div className="playbook">
              {PARTNER_PLAYBOOK.map((entry) => (
                <div key={entry.title} className="playbook-entry">
                  <p className="list-heading">{entry.title}</p>
                  <ul>
                    {entry.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="intro-footer">
          <p>
            Need deeper access? Ping <a href="mailto:partners@gmeow.gg">partners@gmeow.gg</a> for custom safeguards, daily reporting,
            or shared quest ownership.
          </p>
          {enableAudio ? (
            <p className="intro-footer-note">Cinematic audio cues live in the legacy intro — this streamlined mode stays silent.</p>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

type TokenPreviewProps = {
  tokens: VerifiedToken[]
  status: 'idle' | 'loading' | 'ready' | 'error'
}

function TokenPreview({ tokens, status }: TokenPreviewProps) {
  return (
    <div className="token-preview" role="region" aria-live="polite" aria-label="Verified token picker preview">
      <div className="token-preview-header">
        <h2>Verified Base tokens</h2>
        <p>Curated from the Coingecko registry to keep partner drops safe.</p>
      </div>
      <div className="token-grid">
        {tokens.map((token) => (
          <div key={token.symbol} className="token-card">
            {token.logoURI ? (
              <Image
                src={token.logoURI}
                alt={`${token.symbol} logo`}
                className="token-logo"
                width={64}
                height={64}
              />
            ) : (
              <div className="token-logo fallback" aria-hidden>{token.symbol.slice(0, 1)}</div>
            )}
            <div className="token-meta">
              <span className="token-symbol">{token.symbol}</span>
              <span className="token-name">{token.name}</span>
              {token.address ? <span className="token-address">{shortAddress(token.address, 6)}</span> : null}
              <span className="token-decimals">{token.decimals} decimals</span>
            </div>
          </div>
        ))}
      </div>
      <div className="token-footnote">
        {status === 'loading'
          ? 'Loading token metadata…'
          : status === 'error'
            ? 'Live feed unavailable — showing fallback metadata.'
            : 'Live metadata refreshed from Coingecko.'}
      </div>
    </div>
  )
}

export default MegaIntro
