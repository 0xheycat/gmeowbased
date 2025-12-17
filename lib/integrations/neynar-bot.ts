const SIGNER_ENV_KEYS = ['NEYNAR_BOT_SIGNER_UUID', 'SIGNER_UUID'] as const
const FID_ENV_KEYS = ['NEYNAR_BOT_FID', 'FARCASTER_BOT_FID', 'NEXT_PUBLIC_FARCASTER_BOT_FID'] as const
const WEBHOOK_ENV_KEYS = ['NEYNAR_WEBHOOK_SECRET', 'NEXT_PUBLIC_NEYNAR_WEBHOOK_SECRET'] as const
const API_KEY_ENV_KEYS = ['NEYNAR_API_KEY', 'NEYNAR_GLOBAL_API', 'NEXT_PUBLIC_NEYNAR_API_KEY'] as const

function pickFirstDefined(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

export function resolveBotSignerUuid(): string | null {
  return pickFirstDefined(SIGNER_ENV_KEYS)
}

export function resolveBotFid(): number | null {
  const raw = pickFirstDefined(FID_ENV_KEYS)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function resolveWebhookSecret(): string | null {
  return pickFirstDefined(WEBHOOK_ENV_KEYS)
}

export function resolveNeynarApiKey(): string | null {
  return pickFirstDefined(API_KEY_ENV_KEYS)
}

export function previewSecret(value: string | null | undefined, options: { start?: number; end?: number } = {}): string | null {
  if (!value) return null
  const start = options.start ?? 6
  const end = options.end ?? 4
  if (value.length <= start + end + 2) return value
  const head = value.slice(0, start)
  const tail = value.slice(-end)
  return `${head}…${tail}`
}
