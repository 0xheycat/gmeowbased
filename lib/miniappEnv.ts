const ALLOWED_SUFFIXES = ['farcaster.xyz', 'warpcast.com', 'base.dev', 'gmeowhq.art']

export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return false
  }
}

export function referrerHost(): string | null {
  try {
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    if (!ref) return null
    return new URL(ref).hostname
  } catch {
    return null
  }
}

export function isAllowedReferrer(): boolean {
  const h = referrerHost()
  return !!h && ALLOWED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
}

// Probe the miniapp. Only returns true if we’re embedded in an allowed referrer and SDK handshakes.
export async function probeMiniappReady(timeoutMs = 800): Promise<boolean> {
  if (!isEmbedded() || !isAllowedReferrer()) return false
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
    return !!ok
  } catch {
    return false
  }
}

export async function getMiniappContext(): Promise<any | null> {
  try {
    // Check if we're embedded and allowed first
    if (!isEmbedded() || !isAllowedReferrer()) {
      console.log('[getMiniappContext] Not in miniapp environment')
      return null
    }

    console.log('[getMiniappContext] Loading SDK...')
    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Wait for context with timeout
    const context = await Promise.race([
      sdk.context,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 5000)
      )
    ])
    
    console.log('[getMiniappContext] ✅ Got context:', context)
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
  try {
    if (!isEmbedded()) {
      console.log('[miniappEnv] Not embedded, skipping ready call')
      return
    }
    
    if (!isAllowedReferrer()) {
      console.log('[miniappEnv] Referrer not allowed:', referrerHost())
      return
    }

    console.log('[miniappEnv] Embedded in allowed referrer, loading SDK...')
    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Wait for context to be available with extended timeout
    console.log('[miniappEnv] Waiting for SDK context...')
    const context = await Promise.race([
      sdk.context,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Context timeout')), 8000))
    ])
    
    console.log('[miniappEnv] SDK context ready:', context)
    
    // Call ready action with retry logic
    if (sdk.actions?.ready) {
      console.log('[miniappEnv] Calling actions.ready()...')
      try {
        await Promise.race([
          sdk.actions.ready(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ready timeout')), 5000))
        ])
        console.log('[miniappEnv] ✅ actions.ready() completed successfully')
      } catch (readyError) {
        console.warn('[miniappEnv] ⚠️ actions.ready() timed out, but continuing:', readyError)
        // Don't throw - allow app to continue even if ready() times out
      }
    } else {
      console.warn('[miniappEnv] ⚠️ actions.ready not available on SDK')
    }
  } catch (error) {
    console.error('[miniappEnv] ❌ Error in fireMiniappReady:', error)
    // Don't throw - allow app to continue even on error
  }
}