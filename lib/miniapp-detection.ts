/**
 * Miniapp Detection Library - Gmeowbased
 * 
 * Reused from old foundation (100% working logic)
 * Detects Farcaster & Base.dev miniapp context
 * Handles SDK initialization and composeCast actions
 * 
 * Template Compliance: N/A (Backend logic only)
 */

const ALLOWED_HOSTS = ['farcaster.xyz', 'warpcast.com', 'base.dev', 'gmeowhq.art']

/**
 * Check if app is embedded in iframe
 */
export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return false
  }
}

/**
 * Get referrer hostname
 */
export function getReferrerHost(): string | null {
  try {
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    if (!ref) return null
    return new URL(ref).hostname
  } catch {
    return null
  }
}

/**
 * Check if referrer is allowed (Farcaster, Base, or our domain)
 */
export function isAllowedReferrer(): boolean {
  const host = getReferrerHost()
  return !!host && ALLOWED_HOSTS.some((allowed) => 
    host === allowed || host.endsWith(`.${allowed}`)
  )
}

/**
 * Probe miniapp SDK readiness
 * Returns true if embedded in allowed referrer and SDK handshakes successfully
 */
export async function probeMiniappReady(timeoutMs = 2000): Promise<boolean> {
  if (!isEmbedded() || !isAllowedReferrer()) return false
  
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    const ready = await Promise.race<boolean>([
      (async () => {
        await sdk.context
        await sdk.actions.ready?.()
        return true
      })(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ])
    
    return !!ready
  } catch {
    return false
  }
}

/**
 * Get miniapp context (Farcaster user data)
 * Returns null if not in miniapp or SDK not available
 */
export async function getMiniappContext(): Promise<any | null> {
  try {
    if (!isEmbedded() || !isAllowedReferrer()) {
      return null
    }

    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    const context = await Promise.race([
      sdk.context,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SDK context timeout')), 10000)
      )
    ])
    
    return context
  } catch (error) {
    console.warn('[getMiniappContext] Failed:', error)
    return null
  }
}

/**
 * Safe compose cast - Uses SDK if available, fallback to Warpcast web
 */
export async function safeComposeCast(opts: { 
  text: string
  embeds?: string[] 
}) {
  const ready = await probeMiniappReady()
  
  if (ready) {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      if (sdk?.actions?.composeCast) {
        const payload: { 
          text: string
          embeds?: [] | [string] | [string, string] 
        } = {
          text: opts.text,
          ...(opts.embeds ? { embeds: normalizeEmbeds(opts.embeds) } : {}),
        }
        
        return await sdk.actions.composeCast(payload)
      }
    } catch {
      // Fall through to web composer
    }
  }
  
  // Fallback: Open Warpcast web composer
  const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(opts.text)}` +
    (opts.embeds || []).map((e) => `&embeds[]=${encodeURIComponent(e)}`).join('')
  
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Normalize embeds array to SDK-compatible tuple
 */
type EmbedTuple = [] | [string] | [string, string]

function normalizeEmbeds(arr?: string[]): EmbedTuple | undefined {
  if (!arr) return undefined
  if (arr.length === 0) return []
  if (arr.length === 1) return [arr[0]]
  return [arr[0], arr[1]]
}

/**
 * Fire miniapp ready event
 * Call this on client mount to initialize SDK
 */
export async function fireMiniappReady(): Promise<void> {
  try {
    const embedded = isEmbedded()
    if (!embedded) {
      // Not embedded, success (no SDK needed)
      return
    }
    
    const allowed = isAllowedReferrer()
    if (!allowed) {
      console.warn('[fireMiniappReady] Not allowed referrer, proceeding anyway')
      return
    }

    const { sdk } = await import('@farcaster/miniapp-sdk')
    
    // Try to get context with timeout
    try {
      await Promise.race([
        sdk.context,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Context timeout')), 3000)
        )
      ])
    } catch {
      // Context timeout is non-critical
    }
    
    // Try to call ready action
    if (sdk.actions?.ready) {
      try {
        await Promise.race([
          sdk.actions.ready(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Ready timeout')), 2000)
          )
        ])
      } catch {
        // Ready timeout is non-critical
      }
    }
    
    // Dispatch custom event for app to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('miniapp:ready', { 
        detail: { ready: true } 
      }))
    }
  } catch (error) {
    console.error('[fireMiniappReady] Error:', error)
    // Never throw - always let app proceed
  }
}
