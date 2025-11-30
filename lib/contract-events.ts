import { type Abi, type AbiEvent } from 'viem'

import { GM_CONTRACT_ABI } from '@/lib/gmeow-utils'

export type ContractEventCategory =
  | 'gm'
  | 'quests'
  | 'economy'
  | 'badges'
  | 'referrals'
  | 'guilds'
  | 'admin'
  | 'erc20'
  | 'misc'

export type ContractEventReference = {
  label: string
  path: string
  symbol?: string
  note?: string
}

export type EventNotificationTemplate = {
  title: string
  body: string
  placeholders: string[]
  preview?: string
}

export type ContractEventDescriptor = {
  name: string
  signature: string
  category: ContractEventCategory
  description: string
  recommendedAutomations: string[]
  inputs: Array<{ name: string; type: string; indexed: boolean }>
  references: ContractEventReference[]
  notification?: EventNotificationTemplate | null
}

export const CONTRACT_EVENT_CATEGORY_LABEL: Record<ContractEventCategory, string> = {
  gm: 'GM streak',
  quests: 'Quests',
  economy: 'Points economy',
  badges: 'Badges',
  referrals: 'Referral system',
  guilds: 'Guild system',
  admin: 'Admin controls',
  erc20: 'Token escrows',
  misc: 'Miscellaneous',
}

const CATEGORY_ORDER: ContractEventCategory[] = [
  'gm',
  'quests',
  'economy',
  'erc20',
  'badges',
  'referrals',
  'guilds',
  'admin',
  'misc',
]

type EventMeta = {
  category: ContractEventCategory
  description: string
  automations?: string[]
  gmUtils?: string[]
  notification?: EventNotificationTemplate
}

const EVENT_METADATA: Record<string, EventMeta> = {
  GMEvent: {
    category: 'gm',
    description: 'Emitted whenever a pilot successfully completes their daily GM via sendGM.',
    automations: [
      'Update streak dashboards and user timelines',
      'Trigger streak-protection reminders or celebratory notifications',
    ],
    gmUtils: ['createSendGMTx', 'createGMTransaction'],
    notification: {
      title: 'Daily GM locked in',
      body: '@{username} just sent a GM and pushed their streak to {streak} — {rewardPoints} fresh points secured.',
      placeholders: ['username', 'streak', 'rewardPoints'],
      preview: '@catnapper hit streak 47 — 32 points secured.',
    },
  },
  GMSent: {
    category: 'gm',
    description: 'Lightweight GM signal consumed by historical charts and push notifications.',
    automations: ['Append GM history feed entries', 'Refresh contract GM counters'],
    gmUtils: ['createSendGMTx', 'createGMTransaction'],
    notification: {
      title: 'GM echo',
      body: '{streakLabel}: @{username} kept the vibes alive on Gmeow.',
      placeholders: ['username', 'streakLabel'],
      preview: 'Streak 12: @gmeowpilot kept the vibes alive on Gmeow.',
    },
  },
  QuestAdded: {
    category: 'quests',
    description: 'Quest creator escrowed points to publish a new points-only quest.',
    automations: ['Index quest metadata for discovery', 'Alert quest curators of new listings'],
    gmUtils: ['createAddQuestTx', 'createAddQuestTransaction'],
    notification: {
      title: 'New quest deployed',
      body: '@{creator} published **{questName}** on {chainLabel}. Gear up for {rewardPoints} points per completion.',
      placeholders: ['creator', 'questName', 'chainLabel', 'rewardPoints'],
      preview: '@pixelkat published **Neon Relay** on Base. Gear up for 25 points per completion.',
    },
  },
  QuestAddedERC20: {
    category: 'quests',
    description: 'Quest creator funded an ERC20-backed quest with token escrow.',
    automations: ['Validate token escrow balance', 'Highlight token-backed quests in admin view'],
    gmUtils: ['createAddQuestWithERC20Tx', 'createAddQuestWithERC20Transaction'],
    notification: {
      title: 'Token quest online',
      body: '@{creator} launched **{questName}** on {chainLabel} with {tokenAmount} {tokenSymbol} per pilot. Claim your slice.',
      placeholders: ['creator', 'questName', 'chainLabel', 'tokenAmount', 'tokenSymbol'],
      preview: '@glyph-cat launched **Vault Run** on Base with 5.0 GMEOW per pilot.',
    },
  },
  QuestClosed: {
    category: 'quests',
    description: 'Quest creator or owner closed a quest, refunding remaining escrow.',
    automations: ['Expire quest from discovery feeds', 'Notify participants of quest closure'],
    gmUtils: ['createCloseQuestTx', 'createBatchRefundQuestsTx'],
    notification: {
      title: 'Quest archived',
      body: '**{questName}** on {chainLabel} has been closed. Remaining escrow returned to @{creator}.',
      placeholders: ['questName', 'chainLabel', 'creator'],
      preview: '**Neon Relay** on Base has been closed. Remaining escrow returned to @pixelkat.',
    },
  },
  QuestCompleted: {
    category: 'quests',
    description: 'A quest completion was validated by the oracle signature workflow.',
    automations: ['Award progression badges', 'Record completion analytics for dashboards'],
    gmUtils: ['createCompleteQuestWithSigTx', 'createCompleteQuestTransaction'],
    notification: {
      title: 'Quest cleared',
      body: '@{player} completed **{questName}** on {chainLabel} and banked {rewardPoints} points.',
      placeholders: ['player', 'questName', 'chainLabel', 'rewardPoints'],
      preview: '@catnapper completed **Orbital Hop** on Base and banked 40 points.',
    },
  },
  PointsDeposited: {
    category: 'economy',
    description: 'Admin deposited points directly into a pilot balance.',
    automations: ['Audit manual point infusions', 'Sync treasury delta reports'],
    gmUtils: ['createDepositToTx'],
    notification: {
      title: 'Points injected',
      body: 'Gmeow treasury loaded {points} points into @{recipient}. Keep the ops humming.',
      placeholders: ['points', 'recipient'],
      preview: 'Gmeow treasury loaded 1,000 points into @guildmaster. Keep the ops humming.',
    },
  },
  PointsWithdrawn: {
    category: 'economy',
    description: 'Admin withdrew points from the reserve back to a wallet.',
    automations: ['Review treasury reserve changes', 'Alert finance channel of withdrawals'],
    gmUtils: ['createWithdrawContractReserveTx'],
    notification: {
      title: 'Reserve adjusted',
      body: 'Treasure keeper reclaimed {points} points to @{recipient}. Update the books.',
      placeholders: ['points', 'recipient'],
      preview: 'Treasure keeper reclaimed 2,500 points to @ops. Update the books.',
    },
  },
  PointsTipped: {
    category: 'economy',
    description: 'Peer-to-peer tip transferred points between users.',
    automations: ['Surface high-value tipping activity', 'Update social proof widgets'],
    gmUtils: ['createTipUserTx'],
    notification: {
      title: 'Tip dispatched',
      body: '@{sender} tipped @{receiver} {points} points for stellar vibes.',
      placeholders: ['sender', 'receiver', 'points'],
      preview: '@quasar tipped @pilotone 75 points for stellar vibes.',
    },
  },
  BadgeMinted: {
    category: 'badges',
    description: 'Minted a soulbound badge for achievements or referrals.',
    automations: ['Send badge celebration notifications', 'Update badge rarity counts'],
    gmUtils: ['createMintBadgeFromPointsTx'],
    notification: {
      title: 'Badge minted',
      body: '@{recipient} just locked the **{badgeType}** badge inside Gmeow.',
      placeholders: ['recipient', 'badgeType'],
      preview: '@catnapper just locked the **Bronze Recruiter** badge inside Gmeow.',
    },
  },
  FIDLinked: {
    category: 'admin',
    description: 'A wallet linked or refreshed its Farcaster FID mapping.',
    automations: ['Re-sync Farcaster identity metadata', 'Validate identity enrollments'],
    gmUtils: ['createSetFarcasterFidTx'],
    notification: {
      title: 'Identity synced',
      body: '@{address} linked Farcaster fid {fid}. Identity and socials are now in phase.',
      placeholders: ['address', 'fid'],
      preview: '@0xabc linked Farcaster fid 18139. Identity and socials are now in phase.',
    },
  },
  OracleSignerUpdated: {
    category: 'admin',
    description: 'Contract oracle signer rotated keys, affecting quest validations.',
    automations: ['Alert ops to rotate backend signer configs', 'Invalidate stale quest signatures'],
    notification: {
      title: 'Oracle rotated',
      body: 'Oracle signer updated to {address}. Refresh backend configs before approving more quests.',
      placeholders: ['address'],
      preview: 'Oracle signer updated to 0xF1a5...c0de. Refresh backend configs before approving more quests.',
    },
  },
  PowerBadgeSet: {
    category: 'admin',
    description: 'Admin toggled a Farcaster fid power badge flag.',
    automations: ['Refresh prestige badge displays', 'Recalculate bonus multipliers'],
    gmUtils: ['createSetPowerBadgeForFidTx'],
    notification: {
      title: 'Prestige updated',
      body: 'FID {fid} power badge status toggled to {status}. Sync tiers across Gmeow.',
      placeholders: ['fid', 'status'],
      preview: 'FID 18139 power badge status toggled to enabled. Sync tiers across Gmeow.',
    },
  },
  StakedForBadge: {
    category: 'badges',
    description: 'User staked points toward a badge slot.',
    automations: ['Track staking commitments', 'Inform badge pipeline of locked points'],
    gmUtils: ['createStakeForBadgeTx'],
    notification: {
      title: 'Badge stake locked',
      body: '@{staker} staked {points} points for badge #{badgeId}.',
      placeholders: ['staker', 'points', 'badgeId'],
      preview: '@glyph-cat staked 400 points for badge #12.',
    },
  },
  UnstakedForBadge: {
    category: 'badges',
    description: 'User unstaked points previously locked for a badge.',
    automations: ['Monitor badge attrition', 'Update available point balances'],
    gmUtils: ['createUnstakeForBadgeTx'],
    notification: {
      title: 'Badge stake released',
      body: '@{staker} reclaimed {points} points from badge #{badgeId}.',
      placeholders: ['staker', 'points', 'badgeId'],
      preview: '@glyph-cat reclaimed 200 points from badge #12.',
    },
  },
  ERC20EscrowDeposited: {
    category: 'erc20',
    description: 'Quest creator escrowed ERC20 tokens for future payouts.',
    automations: ['Verify token approvals and balances', 'Sync treasury token reserves'],
    notification: {
      title: 'Token escrow received',
      body: '@{creator} escrowed {amount} {tokenSymbol} for quest #{questId}. Treasury updated.',
      placeholders: ['creator', 'amount', 'tokenSymbol', 'questId'],
      preview: '@pixelkat escrowed 1,000 GMEOW for quest #42. Treasury updated.',
    },
  },
  ERC20Payout: {
    category: 'erc20',
    description: 'Quest payout transferred ERC20 rewards to a participant.',
    automations: ['Reconcile token escrow reductions', 'Notify winners of token rewards'],
    notification: {
      title: 'Token payout sent',
      body: '@{recipient} received {amount} {tokenSymbol} from quest #{questId}.',
      placeholders: ['recipient', 'amount', 'tokenSymbol', 'questId'],
      preview: '@catnapper received 25 GMEOW from quest #42.',
    },
  },
  ERC20Refund: {
    category: 'erc20',
    description: 'Unused ERC20 escrow returned to the quest creator.',
    automations: ['Audit refund operations', 'Update escrow coverage dashboards'],
    notification: {
      title: 'Token escrow refunded',
      body: '{amount} {tokenSymbol} returned to @{creator} from quest #{questId}.',
      placeholders: ['amount', 'tokenSymbol', 'creator', 'questId'],
      preview: '320 GMEOW returned to @pixelkat from quest #42.',
    },
  },
  TokenWhitelisted: {
    category: 'admin',
    description: 'Owner toggled token whitelist permissions.',
    automations: ['Validate automation whitelist caches', 'Alert ops about token eligibility'],
    gmUtils: ['createAddTokenToWhitelistTx', 'createSetTokenWhitelistEnabledTx'],
    notification: {
      title: 'Token whitelist updated',
      body: '{tokenSymbol} whitelist status set to {status}.',
      placeholders: ['tokenSymbol', 'status'],
      preview: 'GMEOW whitelist status set to enabled.',
    },
  },
  ReferralCodeRegistered: {
    category: 'referrals',
    description: 'Pilot registered a custom referral code.',
    automations: ['Publish referral directory updates', 'Evaluate fraud heuristics'],
    notification: {
      title: 'Referral code minted',
      body: '@{owner} claimed referral code **{code}** inside Gmeow.',
      placeholders: ['owner', 'code'],
      preview: '@orbital claimed referral code **COSMIC** inside Gmeow.',
    },
  },
  ReferrerSet: {
    category: 'referrals',
    description: 'A new pilot attributed their account to a referrer.',
    automations: ['Reward both parties with bonuses', 'Track referral funnel metrics'],
    gmUtils: ['createSetReferrerTx'],
    notification: {
      title: 'Referral linked',
      body: '@{pilot} joined under @{referrer}. Referral bonuses inbound.',
      placeholders: ['pilot', 'referrer'],
      preview: '@pilotone joined under @guildmaster. Referral bonuses inbound.',
    },
  },
  ReferralRewardClaimed: {
    category: 'referrals',
    description: 'Referral program paid points or tokens to a recruiter.',
    automations: ['Reconcile referral ledgers', 'Send appreciation notifications'],
    notification: {
      title: 'Referral reward claimed',
      body: '@{referrer} claimed {points} points from @{referee} joining the crew.',
      placeholders: ['referrer', 'points', 'referee'],
      preview: '@guildmaster claimed 100 points from @pilotone joining the crew.',
    },
  },
  GuildCreated: {
    category: 'guilds',
    description: 'A new guild was formed and the leader badge minted.',
    automations: ['Index guild directory entries', 'Trigger guild launch announcements'],
    gmUtils: ['createGuildTx'],
    notification: {
      title: 'Guild launched',
      body: '@{leader} founded **{guildName}**. Rally the pilots!',
      placeholders: ['leader', 'guildName'],
      preview: '@stellar founded **Nova Squadron**. Rally the pilots!',
    },
  },
  GuildJoined: {
    category: 'guilds',
    description: 'Member joined an existing guild.',
    automations: ['Update guild rosters', 'Notify guild captains of new members'],
    gmUtils: ['createJoinGuildTx'],
    notification: {
      title: 'New recruit',
      body: '@{member} joined **{guildName}**. Increase the briefing cadence.',
      placeholders: ['member', 'guildName'],
      preview: '@quasar joined **Nova Squadron**. Increase the briefing cadence.',
    },
  },
  GuildLeft: {
    category: 'guilds',
    description: 'Member exited their guild.',
    automations: ['Alert guild leadership', 'Adjust guild active member counts'],
    gmUtils: ['createLeaveGuildTx'],
    notification: {
      title: 'Member departed',
      body: '@{member} left **{guildName}**. Adjust roster and perks.',
      placeholders: ['member', 'guildName'],
      preview: '@quasar left **Nova Squadron**. Adjust roster and perks.',
    },
  },
  GuildLevelUp: {
    category: 'guilds',
    description: 'Guild crossed a point threshold and levelled up.',
    automations: ['Celebrate guild progression', 'Unlock new guild perks'],
    notification: {
      title: 'Guild ascended',
      body: '**{guildName}** climbed to level {level}! @{leader} keep the cadence going.',
      placeholders: ['guildName', 'level', 'leader'],
      preview: '**Nova Squadron** climbed to level 5! @stellar keep the cadence going.',
    },
  },
  GuildQuestCreated: {
    category: 'guilds',
    description: 'Guild leader created a guild-specific quest.',
    automations: ['Expose guild quests in dashboards', 'Notify guild members of new tasks'],
    gmUtils: ['createGuildQuestTx'],
    notification: {
      title: 'Guild mission posted',
      body: '**{guildName}** opened mission **{questName}** worth {rewardPoints} points.',
      placeholders: ['guildName', 'questName', 'rewardPoints'],
      preview: '**Nova Squadron** opened mission **Asteroid Sweep** worth 150 points.',
    },
  },
  GuildPointsDeposited: {
    category: 'guilds',
    description: 'Member deposited personal points into guild treasury.',
    automations: ['Track treasury inflows', 'Update guild leaderboard weights'],
    gmUtils: ['createDepositGuildPointsTx'],
    notification: {
      title: 'Treasury boost',
      body: '@{member} banked {points} points into **{guildName}** treasury.',
      placeholders: ['member', 'points', 'guildName'],
      preview: '@quasar banked 600 points into **Nova Squadron** treasury.',
    },
  },
  GuildTreasuryTokenDeposited: {
    category: 'guilds',
    description: 'Guild escrowed ERC20 tokens into treasury reserves.',
    automations: ['Monitor token-backed treasuries', 'Validate off-chain accounting entries'],
    notification: {
      title: 'Token treasury boost',
      body: '**{guildName}** escrowed {amount} {tokenSymbol} into treasury reserves.',
      placeholders: ['guildName', 'amount', 'tokenSymbol'],
      preview: '**Nova Squadron** escrowed 250 GMEOW into treasury reserves.',
    },
  },
  GuildRewardClaimed: {
    category: 'guilds',
    description: 'Guild member claimed a reward from treasury or quest completion.',
    automations: ['Reconcile treasury outflows', 'Highlight reward success stories'],
    gmUtils: ['createClaimGuildRewardTx'],
    notification: {
      title: 'Guild reward claimed',
      body: '@{member} pulled {points} points from **{guildName}** reward cache.',
      placeholders: ['member', 'points', 'guildName'],
      preview: '@quasar pulled 120 points from **Nova Squadron** reward cache.',
    },
  },
}

function isAbiEvent(item: unknown): item is AbiEvent {
  return Boolean(
    item &&
      typeof item === 'object' &&
      (item as AbiEvent).type === 'event' &&
      typeof (item as AbiEvent).name === 'string',
  )
}

function buildSignature(event: AbiEvent): string {
  const params = event.inputs?.map((input) => input.type) ?? []
  return `${event.name}(${params.join(',')})`
}

function buildReferences(eventName: string, gmUtilsSymbols: string[] = []): ContractEventReference[] {
  const references: ContractEventReference[] = [
    {
      label: 'GmeowMultiChain.sol',
      path: 'contract/GmeowMultiChain.sol',
      symbol: eventName,
    },
    {
      label: 'gmeowmultichain ABI',
      path: 'lib/abi/gmeowmultichain.json',
      symbol: eventName,
    },
  ]

  gmUtilsSymbols.forEach((symbol) => {
    references.push({
      label: 'gm-utils.ts',
      path: 'lib/gm-utils.ts',
      symbol,
    })
  })

  const seen = new Set<string>()
  return references.filter((ref) => {
    const key = `${ref.path}#${ref.symbol ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const RAW_EVENTS = (GM_CONTRACT_ABI as Abi).filter(isAbiEvent)

const EVENT_DESCRIPTORS: ContractEventDescriptor[] = RAW_EVENTS.map((event) => {
  const meta = EVENT_METADATA[event.name] ?? {
    category: 'misc',
    description: 'Emitted on-chain event defined in GmeowMultiChain.sol.',
  }

  const category = meta.category ?? 'misc'
  const signature = buildSignature(event)
  const references = buildReferences(event.name, meta.gmUtils ?? [])
  const recommendedAutomations = meta.automations ?? []

  return {
    name: event.name,
    signature,
    category,
    description: meta.description,
    recommendedAutomations,
    inputs: (event.inputs ?? []).map((input) => ({
      name: input.name ?? '',
      type: input.type,
      indexed: Boolean(input.indexed),
    })),
    references,
    notification: meta.notification ?? null,
  }
})
  .sort((a, b) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (categoryDelta !== 0) return categoryDelta
    return a.name.localeCompare(b.name)
  })

export const GM_CONTRACT_EVENTS: ContractEventDescriptor[] = EVENT_DESCRIPTORS

export function listContractEvents(options?: {
  category?: ContractEventCategory | ContractEventCategory[]
}): ContractEventDescriptor[] {
  if (!options?.category) {
    return [...GM_CONTRACT_EVENTS]
  }
  const categories = Array.isArray(options.category)
    ? options.category
    : [options.category]
  return GM_CONTRACT_EVENTS.filter((event) => categories.includes(event.category))
}

export function getContractEventByName(name: string): ContractEventDescriptor | null {
  return GM_CONTRACT_EVENTS.find(
    (event) => event.name.toLowerCase() === name.toLowerCase(),
  ) ?? null
}

export function listEventsWithNotifications(): ContractEventDescriptor[] {
  return GM_CONTRACT_EVENTS.filter((event) => Boolean(event.notification))
}
