import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk'

let cachedClient: NeynarAPIClient | null = null
let cachedApiKey: string | null = null

function resolveApiKey(): string | null {
  return (
    process.env.NEYNAR_API_KEY ||
    process.env.NEYNAR_GLOBAL_API ||
    process.env.NEXT_PUBLIC_NEYNAR_API_KEY ||
    null
  )
}

export function getNeynarServerClient(): NeynarAPIClient {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new Error('Missing Neynar API key. Set NEYNAR_API_KEY or NEYNAR_GLOBAL_API in your environment.')
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    const config = new Configuration({ apiKey })
    cachedClient = new NeynarAPIClient(config)
    cachedApiKey = apiKey
  }

  return cachedClient
}

export function resetNeynarClientCache() {
  cachedClient = null
  cachedApiKey = null
}
