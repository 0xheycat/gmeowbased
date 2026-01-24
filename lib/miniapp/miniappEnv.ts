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

// Probe the miniapp. Only returns true if we're embedded in an allowed referrer and SDK handshakes.
// MCP best practice: Use 10s timeout for mobile networks (Dec 2025)
// IMPORTANT: On mobile, referrer is often stripped for privacy, so we also try SDK detection directly
export async function probeMiniappReady(timeoutMs = 10000): Promise<boolean> {
  // Check referrer first (works on web)
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

  // Fallback: If embedded but no referrer (common on mobile), try SDK directly
  // This is important for mobile Farcaster which strips referrer for privacy
  if (isEmbedded() && !referrerHost()) {
    console.log('[miniappEnv] No referrer detected, trying SDK directly (likely mobile)')
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
      return !!ok
    } catch (err) {
      console.warn('[miniappEnv] probeMiniappReady: SDK failed on mobile fallback', err)
      return false
    }
  }

  console.log('[miniappEnv] probeMiniappReady: false (not embedded or missing referrer)')
  return false
}

export async function getMiniappContext(): Promise<any | null> {
  try {
    // Check if we're embedded and allowed first
    if (!isEmbedded() || !isAllowedReferrer()) {
      return null
    }

    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Wait for context with longer timeout for mobile
    const context = await Promise.race([
      sdk.context,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 10000)
      )
    ])
    
    return context
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