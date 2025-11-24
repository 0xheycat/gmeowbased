'use client'

import { useEffect, useRef } from 'react'
import { getPublicClient } from '@wagmi/core'
import { useAccount, useConfig } from 'wagmi'

import { useNotifications } from '@/components/ui/live-notifications'
import {
  CHAIN_IDS,
  CHAIN_KEYS,
  GM_CONTRACT_ABI,
  getContractAddress,
  normalizeQuestStruct,
  type ChainKey,
} from '@/lib/gm-utils'

const SEEN_STORAGE_KEY = 'gmeow_live_events_seen'
const SEEN_TTL_MS = 1000 * 60 * 30

function loadSeen(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(SEEN_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => typeof ts === 'number' && now - ts < SEEN_TTL_MS),
    )
  } catch (err) {
    console.warn('LiveEventBridge loadSeen failed', err)
    return {}
  }
}

function persistSeen(seen: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(seen))
  } catch (err) {
    console.warn('LiveEventBridge persistSeen failed', err)
  }
}

type LogLike = {
  transactionHash?: string | null
  logIndex?: number | null
  args?: Record<string, unknown>
}

function makeEventKey(chain: ChainKey, log: LogLike) {
  return `${chain}:${log.transactionHash || '0x0'}:${log.logIndex ?? -1}`
}

function shortAddress(value?: string) {
  if (!value) return ''
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatTokenAmount(value: unknown) {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isFinite(value)) return value.toString()
  if (typeof value === 'string' && value.length) return value
  return ''
}

export function LiveEventBridge() {
  const { address } = useAccount()
  const wagmiConfig = useConfig()
  const { push } = useNotifications()
  const seenRef = useRef<Record<string, number>>({})

  useEffect(() => {
    seenRef.current = loadSeen()
  }, [address])

  useEffect(() => {
    const stops: Array<() => void> = []

    const markSeen = (key: string) => {
      seenRef.current[key] = Date.now()
      persistSeen(seenRef.current)
    }

    const shouldSkip = (key: string) => {
      const ts = seenRef.current[key]
      if (!ts) return false
      if (Date.now() - ts > SEEN_TTL_MS) {
        delete seenRef.current[key]
        persistSeen(seenRef.current)
        return false
      }
      return true
    }

    if (!address) {
      return () => {
        stops.forEach((stop) => {
          try {
            stop?.()
          } catch {}
        })
      }
    }

    for (const chain of CHAIN_KEYS) {
      const chainId = CHAIN_IDS[chain]
      const client = getPublicClient(wagmiConfig, { chainId })
      if (!client) continue

      const baseConfig = {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        poll: true,
        pollingInterval: 15000, // Increased from 8s to 15s to reduce RPC pressure
      } as const

      const register = (stop?: () => void) => {
        if (stop) stops.push(stop)
      }

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'PointsTipped',
          args: { to: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawPoints = log.args?.points
              let points = 0
              if (typeof rawPoints === 'bigint') points = Number(rawPoints)
              else if (typeof rawPoints === 'number') points = rawPoints
              else if (typeof rawPoints === 'string') {
                const parsed = Number(rawPoints)
                if (Number.isFinite(parsed)) points = parsed
              }
              const fromArg = log.args?.from
              const fromAddress = typeof fromArg === 'string' ? fromArg : undefined
              push({
                tone: 'info',
                title: 'Tip received',
                description: points > 0
                  ? `+${points.toLocaleString()} points${fromAddress ? ` from ${fromAddress.slice(0, 6)}…${fromAddress.slice(-4)}` : ''} on ${chain}`
                  : `New tip activity${fromAddress ? ` from ${fromAddress.slice(0, 6)}…${fromAddress.slice(-4)}` : ''}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'QuestCompleted',
          args: { user: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawQuestId = log.args?.questId
              const questId = typeof rawQuestId === 'bigint' ? rawQuestId : BigInt(rawQuestId as string | number | bigint)
              const rawPoints = log.args?.pointsAwarded
              let points = 0
              if (typeof rawPoints === 'bigint') points = Number(rawPoints)
              else if (typeof rawPoints === 'number') points = rawPoints
              else if (typeof rawPoints === 'string') {
                const parsed = Number(rawPoints)
                if (Number.isFinite(parsed)) points = parsed
              }
              const rewardToken = typeof log.args?.rewardToken === 'string' ? log.args.rewardToken : undefined
              const tokenAmount = formatTokenAmount(log.args?.tokenAmount)
              const fragments: string[] = []
              if (points > 0) fragments.push(`+${points.toLocaleString()} points`)
              if (tokenAmount) {
                fragments.push(`${tokenAmount} token${tokenAmount === '1' ? '' : 's'}${rewardToken ? ` (${shortAddress(rewardToken)})` : ''}`)
              }
              push({
                tone: 'success',
                title: 'Quest completion logged',
                description: fragments.length
                  ? `Quest #${questId.toString()} ${fragments.join(' & ')} on ${chain}.`
                  : `Quest #${questId.toString()} marked complete. Claim any remaining rewards.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GuildRewardClaimed',
          args: { member: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawGuildId = log.args?.guildId
              const rawPoints = log.args?.points
              const guildId = typeof rawGuildId === 'bigint' ? rawGuildId : BigInt(rawGuildId as string | number | bigint)
              let points = 0
              if (typeof rawPoints === 'bigint') points = Number(rawPoints)
              else if (typeof rawPoints === 'number') points = rawPoints
              else if (typeof rawPoints === 'string') {
                const parsed = Number(rawPoints)
                if (Number.isFinite(parsed)) points = parsed
              }
              push({
                tone: 'success',
                title: 'Guild reward claimed',
                description: `Guild #${guildId.toString()} sent ${points.toLocaleString()} points on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GuildCreated',
          args: { leader: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawGuildId = log.args?.guildId
              if (rawGuildId === undefined) return
              const name = typeof log.args?.name === 'string' && log.args.name.length ? log.args.name : undefined
              const guildId = typeof rawGuildId === 'bigint' ? rawGuildId : BigInt(rawGuildId as string | number | bigint)
              push({
                tone: 'success',
                title: 'Guild deployed',
                description: `${name || `Guild #${guildId.toString()}`} launched on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GuildJoined',
          args: { member: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawGuildId = log.args?.guildId
              if (rawGuildId === undefined) return
              const guildId = typeof rawGuildId === 'bigint' ? rawGuildId : BigInt(rawGuildId as string | number | bigint)
              push({
                tone: 'success',
                title: 'Guild joined',
                description: `Membership confirmed for guild #${guildId.toString()} on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GuildPointsDeposited',
          args: { from: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawGuildId = log.args?.guildId
              const rawAmount = log.args?.amount
              if (rawGuildId === undefined || rawAmount === undefined) return
              const guildId = typeof rawGuildId === 'bigint' ? rawGuildId : BigInt(rawGuildId as string | number | bigint)
              let amountLabel = ''
              if (typeof rawAmount === 'bigint') amountLabel = rawAmount.toString()
              else if (typeof rawAmount === 'number') amountLabel = rawAmount.toLocaleString()
              else if (typeof rawAmount === 'string' && rawAmount.length) amountLabel = rawAmount
              push({
                tone: 'info',
                title: 'Guild treasury boosted',
                description: amountLabel
                  ? `Deposited ${amountLabel} points into guild #${guildId.toString()} on ${chain}.`
                  : `Guild #${guildId.toString()} treasury updated on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'ReferralRewardClaimed',
          args: { referrer: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawPoints = log.args?.pointsReward
              let points = 0
              if (typeof rawPoints === 'bigint') points = Number(rawPoints)
              else if (typeof rawPoints === 'number') points = rawPoints
              else if (typeof rawPoints === 'string') {
                const parsed = Number(rawPoints)
                if (Number.isFinite(parsed)) points = parsed
              }
              push({
                tone: 'success',
                title: 'Referral reward unlocked',
                description: points > 0
                  ? `Referral payout delivered: ${points.toLocaleString()} points on ${chain}.`
                  : `Referral reward updated on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'ERC20Payout',
          args: { to: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawQuestId = log.args?.questId
              if (rawQuestId === undefined) return
              const questId = typeof rawQuestId === 'bigint' ? rawQuestId : BigInt(rawQuestId as string | number | bigint)
              const tokenAddress = typeof log.args?.token === 'string' ? log.args.token : undefined
              const tokenAmountRaw = log.args?.amount
              const tokenAmount = formatTokenAmount(tokenAmountRaw)
              const amountLabel = tokenAmount ? `${tokenAmount} token${tokenAmount === '1' ? '' : 's'}` : 'token reward'
              const tokenFragment = tokenAddress ? `${amountLabel} (${shortAddress(tokenAddress)})` : amountLabel
              push({
                tone: 'success',
                title: 'Token reward received',
                description: `Quest #${questId.toString()} delivered ${tokenFragment} on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'ERC20Refund',
          args: { to: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const rawQuestId = log.args?.questId
              if (rawQuestId === undefined) return
              const questId = typeof rawQuestId === 'bigint' ? rawQuestId : BigInt(rawQuestId as string | number | bigint)
              const tokenAddress = typeof log.args?.token === 'string' ? log.args.token : undefined
              const tokenAmount = formatTokenAmount(log.args?.amount)
              const amountLabel = tokenAmount ? `${tokenAmount} token${tokenAmount === '1' ? '' : 's'}` : 'token escrow'
              const tokenFragment = tokenAddress ? `${amountLabel} (${shortAddress(tokenAddress)})` : amountLabel
              push({
                tone: 'info',
                title: 'Quest escrow refunded',
                description: `Quest #${questId.toString()} returned ${tokenFragment} on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GMEvent',
          args: { user: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const streakRaw = log.args?.newStreak
              const pointsRaw = log.args?.rewardPoints
              const streak = typeof streakRaw === 'bigint' ? Number(streakRaw) : typeof streakRaw === 'number' ? streakRaw : 0
              const points = typeof pointsRaw === 'bigint' ? Number(pointsRaw) : typeof pointsRaw === 'number' ? pointsRaw : 0
              push({
                tone: 'success',
                title: 'GM streak extended',
                description: `Daily GM locked in on ${chain}${streak ? ` — streak ${streak}` : ''}${points ? ` (+${points.toLocaleString()} points)` : ''}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'GMSent',
          args: { user: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const streakRaw = log.args?.streak
              const pointsRaw = log.args?.pointsEarned
              const streak = typeof streakRaw === 'bigint' ? Number(streakRaw) : typeof streakRaw === 'number' ? streakRaw : 0
              const points = typeof pointsRaw === 'bigint' ? Number(pointsRaw) : typeof pointsRaw === 'number' ? pointsRaw : 0
              push({
                tone: 'info',
                title: 'GM sent',
                description: `You sent a GM on ${chain}${streak ? ` — streak ${streak}` : ''}${points ? ` (+${points.toLocaleString()} points)` : ''}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'BadgeMinted',
          args: { to: address },
          onLogs: (logs) => {
            logs.forEach((log: LogLike) => {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) return
              const badgeType = typeof log.args?.badgeType === 'string' ? log.args.badgeType : 'Badge'
              const tokenIdRaw = log.args?.tokenId
              const tokenId = typeof tokenIdRaw === 'bigint' ? tokenIdRaw.toString() : typeof tokenIdRaw === 'number' ? tokenIdRaw.toString() : undefined
              push({
                tone: 'success',
                title: 'Badge minted',
                description: `${badgeType}${tokenId ? ` #${tokenId}` : ''} just arrived on ${chain}.`,
              })
              markSeen(key)
            })
          },
        }),
      )

      register(
        client.watchContractEvent({
          ...baseConfig,
          eventName: 'QuestClosed',
          onLogs: async (logs) => {
            for (const log of logs as LogLike[]) {
              const key = makeEventKey(chain, log)
              if (shouldSkip(key)) continue
              const rawQuestId = log.args?.questId
              if (rawQuestId === undefined) continue
              let questIdBigInt: bigint
              if (typeof rawQuestId === 'bigint') questIdBigInt = rawQuestId
              else if (typeof rawQuestId === 'number') questIdBigInt = BigInt(rawQuestId)
              else if (typeof rawQuestId === 'string') questIdBigInt = BigInt(rawQuestId)
              else continue

              const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
                Promise.race([
                  promise,
                  new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
                ])

              try {
                const questRaw = await rpcTimeout(
                  client.readContract({
                    address: getContractAddress(chain),
                    abi: GM_CONTRACT_ABI,
                    functionName: 'getQuest',
                    args: [questIdBigInt],
                  }),
                  null
                )
                if (!questRaw) continue
                const quest = normalizeQuestStruct(questRaw)
                if (quest?.creator && typeof quest.creator === 'string' && quest.creator.toLowerCase() === address.toLowerCase()) {
                  push({
                    tone: 'warning',
                    title: 'Quest closed',
                    description: `Quest #${questIdBigInt.toString()} has been closed on ${chain}. Double-check outstanding rewards.`,
                  })
                  markSeen(key)
                }
              } catch (err) {
                console.warn('Quest fetch failed', err)
              }
            }
          },
        }),
      )
    }

    return () => {
      stops.forEach((stop) => {
        try {
          stop?.()
        } catch {}
      })
    }
  }, [address, push, wagmiConfig])

  return null
}

export default LiveEventBridge
