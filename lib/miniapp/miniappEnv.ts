const ALLOWED_SUFFIXES = ['farcaster.xyz', 'warpcast.com', 'base.dev', 'gmeowhq.art']

export function isEmbedded(): boolean {
  try {
    const embedded = typeof window !== 'undefined' && window.self !== window.top
    console.log('[miniappEnv] isEmbedded:', embedded)
    return embedded
  } catch {
    console.log('[miniappEnv] isEmbedded: false (error)')
    return false
  }
}

export function referrerHost(): string | null {
  try {
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    if (!ref) {
      console.log('[miniappEnv] referrerHost: null (no referrer)')
      return null
    }
    const hostname = new URL(ref).hostname
    console.log('[miniappEnv] referrerHost:', hostname, 'from:', ref)
    return hostname
  } catch (err) {
    console.log('[miniappEnv] referrerHost: null (error parsing)', err)
    return null
  }
}

export function isAllowedReferrer(): boolean {
  const h = referrerHost()
  const allowed = !!h && ALLOWED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
  console.log('[miniappEnv] isAllowedReferrer:', allowed, 'host:', h, 'allowedSuffixes:', ALLOWED_SUFFIXES)
  return allowed
}

// Probe the miniapp. Returns true if SDK is available and handshakes successfully.
// MCP best practice: Use 10s timeout for mobile networks (Dec 2025)
// 
// Detection strategy:
// 1. Check referrer + embedded (web Farcaster/base.dev)
// 2. Check embedded only, no referrer (mobile web with stripped referrer)
// 3. Try SDK directly regardless of embedding (mobile WebView - doesn't set iframe flags)
export async function probeMiniappReady(timeoutMs = 10000): Promise<boolean> {
  // Strategy 1: Check referrer + embedded (works on web)
  if (isEmbedded() && isAllowedReferrer()) {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      const ok = await Promise.race<boolean>([
        (async () => {
          await sdk.context
          await sdk.actions.ready?.()
          return true
        })(),
        new Promise<boolean>((r) => setTimeout(() => r(false), timeoutMs)),
      ])
      if (ok) {
        console.log('[miniappEnv] probeMiniappReady: true (referrer + SDK)')
        return true
      }
    } catch {
      console.warn('[miniappEnv] probeMiniappReady: SDK handshake failed with allowed referrer')
    }
  }

  // Strategy 2: If embedded but no referrer (common on mobile), try SDK directly
  // This is important for mobile Farcaster which strips referrer for privacy
  if (isEmbedded() && !referrerHost()) {
    console.log('[miniappEnv] No referrer detected, trying SDK directly (mobile with iframe)')
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      const ok = await Promise.race<boolean>([
        (async () => {
          await sdk.context
          await sdk.actions.ready?.()
          console.log('[miniappEnv] probeMiniappReady: true (embedded + SDK, no referrer)')
          return true
        })(),
        new Promise<boolean>((r) => setTimeout(() => r(false), timeoutMs)),
      ])
      if (ok) return true
    } catch (err) {
      console.warn('[miniappEnv] probeMiniappReady: Strategy 2 failed', err)
    }
  }

  // Strategy 3: Mobile WebView fallback - try SDK directly without iframe/referrer checks
  // On mobile WebView (iOS/Android), window.self === window.top even though it's Farcaster
  // The SDK may still be available and functional
  console.log('[miniappEnv] Trying SDK direct detection (mobile WebView fallback)...')
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    console.log('[miniappEnv] SDK imported, attempting context handshake...')
    
    const ok = await Promise.race<boolean>([
      (async () => {
        // Check if SDK context is available
        const context = await sdk.context
        if (context) {
          console.log('[miniappEnv] SDK context available:', {
            user: context.user?.fid,
            client: context.client?.clientFid,
          })
          
          // Try ready action if available
          if (sdk.actions?.ready) {
            await sdk.actions.ready()
          }
          
          console.log('[miniappEnv] probeMiniappReady: true (WebView SDK direct)')
          return true
        }
        return false
      })(),
      new Promise<boolean>((r) => setTimeout(() => r(false), timeoutMs)),
    ])
    
    if (ok) return true
  } catch (err) {
    console.warn('[miniappEnv] probeMiniappReady: All strategies failed', {
      error: String(err),
      embedded: isEmbedded(),
      referrer: referrerHost(),
    })
  }

  console.log('[miniappEnv] probeMiniappReady: false (SDK not available in this context)')
  return false
}

export async function getMiniappContext(): Promise<any | null> {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Try to get context with timeout (works on web and mobile WebView)
    const context = await Promise.race([
      sdk.context,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 10000)
      )
    ])
    
    if (context) {
      console.log('[getMiniappContext] Got context:', { fid: (context as any).user?.fid })
      return context
    }
    
    return null
  } catch (error) {
    console.warn('[getMiniappContext] Failed to get context:', error)
    return null
  }
}

// Safe composer: use SDK if ready, else open Warpcast web composer.
export async function safeComposeCast(opts: { text: string; embeds?: string[] }) {
  const ok = await probeMiniappReady()
  if (ok) {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      if (sdk?.actions?.composeCast) {
        // embeds must be [], [string], or [string, string]
        const payload: { text: string; embeds?: [] | [string] | [string, string] } = {
          text: opts.text,
          ...(opts.embeds ? { embeds: asEmbedTuple(opts.embeds) } : {}),
        }
        return await sdk.actions.composeCast(payload)
      }
    } catch {
      // fall through to web composer
    }
  }
  const url =
    `https://warpcast.com/~/compose?text=${encodeURIComponent(opts.text)}` +
    (opts.embeds || []).map((e) => `&embeds[]=${encodeURIComponent(e)}`).join('')
  window.open(url, '_blank', 'noopener,noreferrer')
}

// embeds tuple normalizer
type EmbedTuple = [] | [string] | [string, string]
function asEmbedTuple(arr?: string[]): EmbedTuple | undefined {
  if (!arr) return undefined
  if (arr.length === 0) return []
  if (arr.length === 1) return [arr[0]]
  return [arr[0], arr[1]]
}

export async function fireMiniappReady(): Promise<void> {
  // Call as early as possible on the client; gate to embedded + allowed referrer
  console.log('[fireMiniappReady] Starting...')
  
  try {
    const embedded = isEmbedded()
    if (!embedded) {
      console.log('[fireMiniappReady] ✅ Not embedded, completing successfully (no SDK needed)')
      return
    }
    
    const allowedRef = isAllowedReferrer()
    if (!allowedRef) {
      console.warn('[fireMiniappReady] ⚠️ Not allowed referrer, completing anyway (will work without SDK)')
      return
    }

    console.log('[fireMiniappReady] 📦 Loading Farcaster SDK...')
    const { sdk } = await import('@farcaster/miniapp-sdk')
    console.log('[fireMiniappReady] SDK loaded, checking context...')
    
    // Try to get context with timeout
    try {
      await Promise.race([
        sdk.context,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Context timeout after 3s')), 3000))
      ])
      console.log('[fireMiniappReady] ✅ SDK context ready')
    } catch (contextError) {
      console.warn('[fireMiniappReady] ⚠️ Context timeout, proceeding anyway:', contextError)
      // Don't throw - continue without context
    }
    
    // Try to call ready action if available
    if (sdk.actions?.ready) {
      try {
        console.log('[fireMiniappReady] Calling sdk.actions.ready()...')
        await Promise.race([
          sdk.actions.ready(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ready timeout after 2s')), 2000))
        ])
        console.log('[fireMiniappReady] ✅ sdk.actions.ready() completed')
      } catch (readyError) {
        console.warn('[fireMiniappReady] ⚠️ ready() timeout/error (non-critical):', readyError)
        // Don't throw - app works without this
      }
    } else {
      console.log('[fireMiniappReady] ℹ️ sdk.actions.ready not available (older SDK?)')
    }
    
    console.log('[fireMiniappReady] ✅ Completed successfully')
  } catch (error) {
    console.error('[fireMiniappReady] ❌ Error occurred, but continuing anyway:', error)
    // NEVER throw - always let the app proceed
  }
}

/**
 * Get wallet address directly from Farcaster SDK
 * This is a fallback for when the wagmi Farcaster connector isn't available
 */
export async function getFarcasterWalletAddress(): Promise<string | null> {
  try {
    const context = await getMiniappContext()
    if (!context) {
      console.warn('[getFarcasterWalletAddress] No miniapp context')
      return null
    }

    const contextAny = context as any
    console.log('[getFarcasterWalletAddress] Full context:', JSON.stringify(contextAny, null, 2))
    
    // Check various possible locations for the account address
    const address = 
      contextAny.account?.address ??
      contextAny.walletAddress ??
      contextAny.address ??
      contextAny.user?.wallet?.address ??
      contextAny.user?.address ??
      (contextAny as any)?.accountAssociation?.payload  // Might be base64 encoded

    if (address && typeof address === 'string' && address.startsWith('0x')) {
      console.log('[getFarcasterWalletAddress] Got address:', address)
      return address
    }

    // If we have user info, that's still a connection indicator
    if (contextAny.user || contextAny.user?.fid) {
      console.log('[getFarcasterWalletAddress] Got user context (FID:', contextAny.user?.fid, ') but no address - may need to initialize account')
      return null
    }

    console.warn('[getFarcasterWalletAddress] No address or user found in context')
    return null
  } catch (error) {
    console.error('[getFarcasterWalletAddress] Error:', error)
    return null
  }
}

/**
 * Initialize Farcaster wallet connection
 * Calls SDK methods to establish connection
 */
export async function initializeFarcasterWallet(): Promise<boolean> {
  try {
    console.log('[initializeFarcasterWallet] Starting...')
    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Get context to verify we have account info
    const context = await getMiniappContext()
    if (context) {
      const contextAny = context as any
      console.log('[initializeFarcasterWallet] Context available after init:', {
        hasUser: !!contextAny.user,
        fid: contextAny.user?.fid,
        hasAccount: !!contextAny.account,
        hasWalletAddress: !!contextAny.account?.address,
      })
      return !!contextAny.user
    }
    
    return false
  } catch (error) {
    console.error('[initializeFarcasterWallet] Error:', error)
    return false
  }
}