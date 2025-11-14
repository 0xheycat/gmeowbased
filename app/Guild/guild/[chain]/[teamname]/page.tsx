import { notFound } from 'next/navigation'
import type { ChainKey } from '@/lib/gm-utils'
import { extractTeamIdFromSlug } from '@/lib/team'
import GuildManagementPage from '@/components/Guild/GuildManagementPage'

const SUPPORTED_CHAIN_KEYS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']

function isChainKey(value: string): value is ChainKey {
  return SUPPORTED_CHAIN_KEYS.includes(value as ChainKey)
}

type PageParams = { params: Promise<{ chain: string; teamname: string }> }

export default async function Page({ params }: PageParams) {
  const { chain, teamname } = await params
  if (!isChainKey(chain)) notFound()
  const teamId = extractTeamIdFromSlug(teamname)
  if (!teamId) notFound()
  return <GuildManagementPage chain={chain} teamId={teamId} slug={teamname} />
}