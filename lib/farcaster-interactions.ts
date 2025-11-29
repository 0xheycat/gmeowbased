/**
 * Farcaster Interaction Handlers
 * Handles likes, recasts, replies, and publishing casts
 */

const NEYNAR_API_BASE = 'https://api.neynar.com'

function getApiKey(): string | undefined {
  return (
    process.env.NEYNAR_API_KEY ||
    process.env.NEYNAR_GLOBAL_API ||
    process.env.NEXT_PUBLIC_NEYNAR_API_KEY ||
    undefined
  )
}

/**
 * Get signer UUID from environment
 * This should be set up via Neynar's signer creation flow
 */
function getSignerUuid(): string | undefined {
  return process.env.NEYNAR_SIGNER_UUID || process.env.NEXT_PUBLIC_NEYNAR_SIGNER_UUID
}

async function neynarPost<T = any>(
  path: string,
  body: Record<string, any>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[neynarPost] No API key configured')
    return { success: false, error: 'No API key configured' }
  }

  const url = new URL(path, NEYNAR_API_BASE)

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-neynar-experimental': 'false',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`[neynarPost] ${path} failed:`, res.status, data)
      return {
        success: false,
        error: data?.message || data?.error || `Request failed with status ${res.status}`,
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[neynarPost] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

async function neynarDelete<T = any>(
  path: string,
  body: Record<string, any>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[neynarDelete] No API key configured')
    return { success: false, error: 'No API key configured' }
  }

  const url = new URL(path, NEYNAR_API_BASE)

  try {
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-neynar-experimental': 'false',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`[neynarDelete] ${path} failed:`, res.status, data)
      return {
        success: false,
        error: data?.message || data?.error || `Request failed with status ${res.status}`,
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[neynarDelete] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Like a cast
 * @param castHash - Hash of the cast to like
 * @returns Success status and error message if any
 */
export async function likeCast(castHash: string): Promise<{ success: boolean; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  const result = await neynarPost('/v2/farcaster/reaction', {
    signer_uuid: signerUuid,
    reaction_type: 'like',
    target: castHash,
  })

  return result
}

/**
 * Remove like from a cast
 * @param castHash - Hash of the cast to unlike
 * @returns Success status and error message if any
 */
export async function unlikeCast(castHash: string): Promise<{ success: boolean; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  const result = await neynarDelete('/v2/farcaster/reaction', {
    signer_uuid: signerUuid,
    reaction_type: 'like',
    target: castHash,
  })

  return result
}

/**
 * Recast a cast
 * @param castHash - Hash of the cast to recast
 * @returns Success status and error message if any
 */
export async function recastCast(castHash: string): Promise<{ success: boolean; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  const result = await neynarPost('/v2/farcaster/reaction', {
    signer_uuid: signerUuid,
    reaction_type: 'recast',
    target: castHash,
  })

  return result
}

/**
 * Remove recast from a cast
 * @param castHash - Hash of the cast to unrecast
 * @returns Success status and error message if any
 */
export async function unrecastCast(castHash: string): Promise<{ success: boolean; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  const result = await neynarDelete('/v2/farcaster/reaction', {
    signer_uuid: signerUuid,
    reaction_type: 'recast',
    target: castHash,
  })

  return result
}

/**
 * Reply to a cast
 * @param castHash - Hash of the cast to reply to
 * @param text - Reply text
 * @returns Success status, cast hash, and error message if any
 */
export async function replyCast(
  castHash: string,
  text: string
): Promise<{ success: boolean; castHash?: string; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  if (!text.trim()) {
    return { success: false, error: 'Reply text cannot be empty' }
  }

  const result = await neynarPost<{ cast: { hash: string } }>('/v2/farcaster/cast', {
    signer_uuid: signerUuid,
    text: text.trim(),
    parent: castHash,
  })

  if (result.success && result.data?.cast?.hash) {
    return { success: true, castHash: result.data.cast.hash }
  }

  return { success: false, error: result.error }
}

/**
 * Publish a new cast
 * @param text - Cast text
 * @param channelId - Optional channel ID to post in
 * @param embeds - Optional embeds (URLs, images)
 * @returns Success status, cast hash, and error message if any
 */
export async function publishCast(
  text: string,
  options?: {
    channelId?: string
    embeds?: string[]
  }
): Promise<{ success: boolean; castHash?: string; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  if (!text.trim()) {
    return { success: false, error: 'Cast text cannot be empty' }
  }

  const body: Record<string, any> = {
    signer_uuid: signerUuid,
    text: text.trim(),
  }

  if (options?.channelId) {
    body.channel_id = options.channelId
  }

  if (options?.embeds && options.embeds.length > 0) {
    body.embeds = options.embeds.map((url) => ({ url }))
  }

  const result = await neynarPost<{ cast: { hash: string } }>('/v2/farcaster/cast', body)

  if (result.success && result.data?.cast?.hash) {
    return { success: true, castHash: result.data.cast.hash }
  }

  return { success: false, error: result.error }
}

/**
 * Delete a cast
 * @param castHash - Hash of the cast to delete
 * @returns Success status and error message if any
 */
export async function deleteCast(castHash: string): Promise<{ success: boolean; error?: string }> {
  const signerUuid = getSignerUuid()
  if (!signerUuid) {
    return { success: false, error: 'No signer configured' }
  }

  const result = await neynarDelete('/v2/farcaster/cast', {
    signer_uuid: signerUuid,
    target_hash: castHash,
  })

  return result
}
