import { domainManifestSchema } from '@farcaster/miniapp-core'
import { NextResponse } from 'next/server'

const DEFAULT_BASE_URL = 'https://gmeowhq.art'
const PLACEHOLDER_PATTERN = /^(?:REPLACE|PLACEHOLDER|TODO|FILL_ME)/i
const DEFAULT_BASE_BUILDER_OWNER = '0xB4F2fF92E8ccbbeAb7094cef5514A15aeBbbD11F'

const ACCOUNT_ASSOCIATION_ENVS = {
  header: 'FARCASTER_ACCOUNT_ASSOCIATION_HEADER',
  payload: 'FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD',
  signature: 'FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE',
} as const

type AssociationKey = keyof typeof ACCOUNT_ASSOCIATION_ENVS

function readEnv(name: string): string | null {
  const raw = process.env[name]
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveAssociationValue(key: AssociationKey): string {
  const envName = ACCOUNT_ASSOCIATION_ENVS[key]
  const value = readEnv(envName)
  if (!value) {
    // In development/preview, allow serving with placeholder values
    if (process.env.NODE_ENV !== 'production') {
      return `PLACEHOLDER_${key.toUpperCase()}_TO_BE_SIGNED`
    }
    throw new Error(`Missing required Farcaster account association env: ${envName}`)
  }
  if (PLACEHOLDER_PATTERN.test(value) && process.env.NODE_ENV === 'production') {
    throw new Error(`Replace placeholder value for ${envName} before serving the manifest`)
  }
  return value
}

function resolveAccountAssociation() {
  return {
    header: resolveAssociationValue('header'),
    payload: resolveAssociationValue('payload'),
    signature: resolveAssociationValue('signature'),
  }
}

function resolveBaseBuilder() {
  const raw = readEnv('BASE_BUILDER_OWNER_ADDRESS') ?? DEFAULT_BASE_BUILDER_OWNER
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    throw new Error('BASE_BUILDER_OWNER_ADDRESS must be a valid 0x-prefixed Ethereum address')
  }
  return { ownerAddress: raw }
}

const buildBaseUrl = () => {
  const candidate = process.env.MAIN_URL ?? DEFAULT_BASE_URL

  try {
    return new URL(candidate)
  } catch {
    return new URL(DEFAULT_BASE_URL)
  }
}

const toAbsoluteUrl = (pathname: string, baseUrl: URL) =>
  new URL(pathname, baseUrl).toString()

export async function GET() {
  try {
    const baseUrl = buildBaseUrl()
    const accountAssociation = resolveAccountAssociation()
    const baseBuilder = resolveBaseBuilder()

    const manifestCore = domainManifestSchema.parse({
      accountAssociation,
      miniapp: {
        version: '1',
        name: 'GMEOW - adventure',
        iconUrl: toAbsoluteUrl('/favicon.ico', baseUrl),
        homeUrl: toAbsoluteUrl('/', baseUrl),
        splashImageUrl: toAbsoluteUrl('/splash.png', baseUrl),
        splashBackgroundColor: '#FEF3E2',
        webhookUrl: toAbsoluteUrl('/api/neynar/webhook', baseUrl),
        subtitle: 'Daily GM Quest Hub',
        description:
          'GMEOW Adventure turns your morning GM into a multiplayer quest—lock in streaks, complete onchain challenges, and climb the community leaderboard.',
        primaryCategory: 'social',
        tags: ['gm', 'streak', 'base', 'social', 'daily'],
        heroImageUrl: toAbsoluteUrl('/hero.png', baseUrl),
        tagline: 'Keep your GM streak alive',
        ogTitle: 'GMEOW Adventure GM Quests',
        ogDescription:
          'Daily GM quests, onchain streaks, and leaderboard rewards with GMEOW Adventure.',
        ogImageUrl: toAbsoluteUrl('/og-image.png', baseUrl),
        canonicalDomain: baseUrl.hostname,
        requiredChains: ['eip155:8453'],
        requiredCapabilities: [
          'actions.ready',
          'actions.composeCast',
          'wallet.getEthereumProvider',
        ],
      },
    })

    const manifest = {
      ...manifestCore,
      baseBuilder,
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build domain manifest'
    return NextResponse.json(
      { ok: false, error: 'manifest_generation_failed', message },
      { status: 500 },
    )
  }
}