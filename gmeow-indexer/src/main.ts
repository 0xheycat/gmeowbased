/**
 * #file: gmeow-indexer/src/main.ts
 * 
 * TODO:
 * - Add batch processing for large blocks (>1000 events)
 * - Add retry logic for failed database inserts
 * - Add metrics tracking (events processed, errors)
 * - Consider indexing metadata JSON from IPFS/HTTP
 * 
 * FEATURES:
 * - Indexes all Gmeow contract events (Core, Guild, Badge, NFT, Referral)
 * - Captures NFTMinted events with nftType and metadataURI
 * - Tracks user XP, streaks, guilds, badges, and referrals
 * - Batch processing for performance optimization
 * - Automatic user creation and relationship management
 * 
 * PHASE: Phase 1 - Critical Infrastructure (Week 1, Day 2-3)
 * DATE: December 16, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - NFT-SYSTEM-ARCHITECTURE-PART-4.md (Section 17, Task 2.2)
 * - READY-FOR-PHASE-2.md (Day 2: Subsquid Indexer Enhancement)
 * 
 * SUGGESTIONS:
 * - Add health check endpoint for monitoring
 * - Add Sentry integration for error tracking
 * - Consider adding event replay functionality
 * - Add data validation before database insert
 * 
 * CRITICAL FOUND:
 * - ⚠️ NFTMinted event MUST be parsed before Transfer event (contains additional data)
 * - ⚠️ Subsquid codegen must be run after schema changes (sqd codegen)
 * - ⚠️ Database migrations required after schema updates
 * - ⚠️ Missing nftType/metadataURI = fallback to 'UNKNOWN' and empty string
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO assuming event order (always check topic hash)
 * - ❌ NO hardcoded contract addresses (use processor config)
 * - ❌ NO skipping error handling
 * - ❌ NO blocking database operations (use batching)
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

import {TypeormDatabase} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import *  as ethers from 'ethers'
import {processor, CORE_ADDRESS, GUILD_ADDRESS, BADGE_ADDRESS, NFT_ADDRESS, REFERRAL_ADDRESS, SCORING_ADDRESS} from './processor'
import { recordFailure, recordSuccess, isRateLimitError } from './rpc-manager'
import {
    User,
    GMEvent,
    Guild,
    GuildMember,
    GuildEvent,
    GuildPointsDepositedEvent,
    GuildLevelUpEvent,
    BadgeMint,
    NFTMint,
    NFTTransfer,
    ReferralCode,
    ReferralUse,
    ReferrerSet,
    TipEvent,
    ViralMilestone,
    Quest,
    QuestCompletion,
    PointsTransaction,
    TreasuryOperation,
    BadgeStake,
    PowerBadge,
    StatsUpdatedEvent,
    LevelUpEvent,
    RankUpEvent,
} from './model'

// Import ABIs for event decoding
import coreAbiJson from '../abi/GmeowCore.abi.json'
import guildAbiJson from '../abi/GmeowGuildStandalone.abi.json'
import referralAbiJson from '../abi/GmeowReferralStandalone.abi.json'
import nftAbiJson from '../abi/GmeowNFT.abi.json'
import scoringAbiJson from '../abi/ScoringModule.abi.json'

// Import webhook utility
import { sendWebhook, createWebhookEvent } from './webhook'

// Create interfaces for event decoding
const coreInterface = new ethers.Interface(coreAbiJson)
const guildInterface = new ethers.Interface(guildAbiJson)
const referralInterface = new ethers.Interface(referralAbiJson)
const nftInterface = new ethers.Interface(nftAbiJson)
const scoringInterface = new ethers.Interface(scoringAbiJson)

// ERC721 Transfer event signature
const TRANSFER_SIGNATURE = 'Transfer(address,address,uint256)'

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    const startBlock = ctx.blocks.at(0)?.header.height
    const endBlock = ctx.blocks.at(-1)?.header.height
    ctx.log.info(`📦 Processing blocks ${startBlock} to ${endBlock}`)
    
    // Maps for batch processing
    const users = new Map<string, User>()
    const gmEvents: GMEvent[] = []
    const guilds = new Map<string, Guild>()
    const guildMembers = new Map<string, GuildMember>()
    const guildEvents: GuildEvent[] = []
    const guildPointsDepositedEvents: GuildPointsDepositedEvent[] = []
    const guildLevelUpEvents: GuildLevelUpEvent[] = []
    const badgeMints: BadgeMint[] = []
    const nftMints: NFTMint[] = []
    const nftTransfers: NFTTransfer[] = []
    const referralCodes = new Map<string, ReferralCode>()
    const referralUses: ReferralUse[] = []
    
    // Phase 7: Tip events and milestones
    const tipEvents: any[] = [] // TipEvent type
    const viralMilestones: any[] = [] // ViralMilestone type
    
    // Phase 8: Quest system
    const quests = new Map<string, Quest>()
    const questCompletions: QuestCompletion[] = []
    
    // Phase 8.2: Points & Treasury system
    const pointsTransactions: any[] = [] // PointsTransaction type
    const treasuryOperations: any[] = [] // TreasuryOperation type
    const badgeStakes: any[] = [] // BadgeStake type (Phase 8.3)
    const powerBadges: any[] = [] // PowerBadge type (Phase 8.3)
    
    // Phase 3.2G: ScoringModule events (Jan 1, 2026)
    const statsUpdatedEvents: StatsUpdatedEvent[] = []
    const levelUpEvents: LevelUpEvent[] = []
    const rankUpEvents: RankUpEvent[] = []
    
    // Collect addresses to load
    const userAddresses = new Set<string>()
    const guildIds = new Set<string>()
    const referralCodeStrings = new Set<string>()
    const questIds = new Set<string>()
    
    // First pass: collect addresses and IDs
    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            try {
                if (log.address === CORE_ADDRESS) {
                    const topic = log.topics[0]
                    if (topic === coreInterface.getEvent('GMEvent')?.topicHash ||
                        topic === coreInterface.getEvent('GMSent')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            userAddresses.add(userAddr)
                        }
                    }
                    // Phase 8: Collect quest IDs
                    else if (topic === coreInterface.getEvent('QuestAdded')?.topicHash ||
                             topic === coreInterface.getEvent('QuestAddedERC20')?.topicHash ||
                             topic === coreInterface.getEvent('OnchainQuestAdded')?.topicHash ||
                             topic === coreInterface.getEvent('QuestCompleted')?.topicHash ||
                             topic === coreInterface.getEvent('QuestClosed')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        if (decoded && decoded.args.questId) {
                            questIds.add(decoded.args.questId.toString())
                        }
                    }
                } else if (log.address === GUILD_ADDRESS) {
                    const topic = log.topics[0]
                    if (topic === guildInterface.getEvent('GuildCreated')?.topicHash ||
                        topic === guildInterface.getEvent('GuildJoined')?.topicHash ||
                        topic === guildInterface.getEvent('GuildLeft')?.topicHash ||
                        topic === guildInterface.getEvent('GuildPointsDeposited')?.topicHash ||
                        topic === guildInterface.getEvent('GuildLevelUp')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        if (decoded) {
                            guildIds.add(decoded.args.guildId.toString())
                            if (decoded.args.member) {
                                userAddresses.add(decoded.args.member.toLowerCase())
                            }
                            if (decoded.args.leader) {
                                userAddresses.add(decoded.args.leader.toLowerCase())
                            }
                        }
                    }
                } else if (log.address === REFERRAL_ADDRESS) {
                    const topic = log.topics[0]
                    if (topic === referralInterface.getEvent('ReferralCodeRegistered')?.topicHash ||
                        topic === referralInterface.getEvent('ReferralRewardClaimed')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        if (decoded) {
                            if (decoded.args.user) {
                                userAddresses.add(decoded.args.user.toLowerCase())
                            }
                            if (decoded.args.referrer) {
                                userAddresses.add(decoded.args.referrer.toLowerCase())
                            }
                            if (decoded.args.referee) {
                                userAddresses.add(decoded.args.referee.toLowerCase())
                            }
                            if (decoded.args.code) {
                                referralCodeStrings.add(decoded.args.code)
                            }
                        }
                    }
                } else if (log.address === SCORING_ADDRESS) {
                    // Phase 3.2G: Collect user addresses from ScoringModule events
                    const topic = log.topics[0]
                    if (topic === scoringInterface.getEvent('StatsUpdated')?.topicHash ||
                        topic === scoringInterface.getEvent('LevelUp')?.topicHash ||
                        topic === scoringInterface.getEvent('RankUp')?.topicHash) {
                        const decoded = scoringInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        if (decoded && decoded.args.user) {
                            userAddresses.add(decoded.args.user.toLowerCase())
                        }
                    }
                }
            } catch (e) {
                ctx.log.warn(`Failed to decode log in block ${block.header.height}: ${e}`)
            }
        }
    }
    
    // Load existing entities
    if (userAddresses.size > 0) {
        const existingUsers = await ctx.store.findBy(User, {
            id: In([...userAddresses])
        })
        for (let user of existingUsers) {
            users.set(user.id, user)
        }
        ctx.log.info(`📥 Loaded ${existingUsers.length} existing users`)
    }
    
    if (guildIds.size > 0) {
        const existingGuilds = await ctx.store.findBy(Guild, {
            id: In([...guildIds])
        })
        for (let guild of existingGuilds) {
            guilds.set(guild.id, guild)
        }
        ctx.log.info(`📥 Loaded ${existingGuilds.length} existing guilds`)
    }
    
    if (referralCodeStrings.size > 0) {
        const existingCodes = await ctx.store.findBy(ReferralCode, {
            id: In([...referralCodeStrings])
        })
        for (let code of existingCodes) {
            referralCodes.set(code.id, code)
        }
        ctx.log.info(`📥 Loaded ${existingCodes.length} existing referral codes`)
    }
    
    // Phase 8: Load existing quests
    if (questIds.size > 0) {
        const existingQuests = await ctx.store.findBy(Quest, {
            id: In([...questIds])
        })
        for (let quest of existingQuests) {
            quests.set(quest.id, quest)
        }
        ctx.log.info(`📥 Loaded ${existingQuests.length} existing quests`)
    }
    
    // Second pass: process events
    for (let block of ctx.blocks) {
        const blockTime = BigInt(block.header.timestamp) / 1000n
        
        for (let log of block.logs) {
            try {
                // Core contract events
                if (log.address === CORE_ADDRESS) {
                    const topic = log.topics[0]
                    
                    // Handle GMEvent or GMSent
                    if (topic === coreInterface.getEvent('GMEvent')?.topicHash ||
                        topic === coreInterface.getEvent('GMSent')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            // Contract emits GMSent(user, reward, newStreak) but ABI expects (user, streak, pointsEarned)
                            // So we need to swap: streak field contains points, pointsEarned contains streak
                            const points = decoded.args.rewardPoints || decoded.args.streak || 0n
                            const streak = decoded.args.newStreak || decoded.args.pointsEarned || 0n
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            const oldPoints = user.totalEarnedFromGMs
                            const oldGMCount = user.lifetimeGMs
                            const oldStreak = user.currentStreak
                            
                            // Update both pointsBalance (current) and totalEarnedFromGMs (cumulative earned)
                            user.pointsBalance += points
                            user.totalEarnedFromGMs += points
                            user.currentStreak = Number(streak)
                            user.lastGMTimestamp = blockTime
                            user.lifetimeGMs += 1
                            user.updatedAt = new Date(Number(blockTime) * 1000)
                            
                            // Create GM event
                            gmEvents.push(new GMEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                timestamp: blockTime,
                                pointsAwarded: points,
                                streakDay: Number(streak),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            // Phase 7: Check for GM milestones
                            if (oldGMCount === 0) {
                                // First GM milestone
                                viralMilestones.push({
                                    id: `${userAddr}-first_gm-${blockTime}`,
                                    user: user,
                                    milestoneType: 'first_gm',
                                    value: 1n,
                                    timestamp: new Date(Number(blockTime) * 1000),
                                    castHash: null,
                                    notificationSent: false,
                                    previousValue: 0n,
                                    requiredValue: 1n,
                                    category: 'gm'
                                })
                                user.milestoneCount += 1
                            }
                            checkMilestone(viralMilestones, user, 'gm_count', oldGMCount, user.lifetimeGMs, blockTime, 'gm')
                            checkMilestone(viralMilestones, user, 'points_earned', Number(oldPoints), Number(user.totalEarnedFromGMs), blockTime, 'gm')
                            checkMilestone(viralMilestones, user, 'streak_days', oldStreak, user.currentStreak, blockTime, 'gm')
                        }
                    }
                    
                    // Phase 7: Handle PointsTipped event
                    else if (topic === coreInterface.getEvent('PointsTipped')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const fromAddr = decoded.args.from.toLowerCase()
                            const toAddr = decoded.args.to.toLowerCase()
                            const points = decoded.args.points || 0n
                            
                            // Get or create both users
                            let fromUser = getOrCreateUser(users, fromAddr, blockTime)
                            let toUser = getOrCreateUser(users, toAddr, blockTime)
                            
                            // Update tip totals
                            fromUser.totalTipsGiven = (fromUser.totalTipsGiven || 0n) + points
                            toUser.totalTipsReceived = (toUser.totalTipsReceived || 0n) + points
                            
                            // Create tip event
                            tipEvents.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                from: fromUser,
                                to: toUser,
                                amount: points,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                                isFirstTip: tipEvents.filter(t => t.from.id === fromAddr).length === 0,
                                dailyTipCount: tipEvents.filter(t => t.from.id === fromAddr).length + 1,
                            })
                            
                            // Phase 7: Check for tip milestones
                            const oldTipsReceived = (toUser.totalTipsReceived || 0n) - points
                            checkMilestone(viralMilestones, toUser, 'tips_received', Number(oldTipsReceived), Number(toUser.totalTipsReceived), blockTime, 'tips')
                            checkMilestone(viralMilestones, fromUser, 'tips_given', Number(fromUser.totalTipsGiven - points), Number(fromUser.totalTipsGiven), blockTime, 'tips')
                            
                            ctx.log.info(`💰 Tip: ${fromAddr.slice(0,6)} → ${toAddr.slice(0,6)} (${points} points)`)
                        }
                    }
                    
                    // Phase 8.2: Handle PointsDeposited event
                    else if (topic === coreInterface.getEvent('PointsDeposited')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.who.toLowerCase()
                            const amount = decoded.args.amount || 0n
                            
                            // Update user points balance
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            user.pointsBalance += amount
                            
                            pointsTransactions.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                transactionType: 'DEPOSIT',
                                user: userAddr,
                                amount,
                                from: log.transaction?.from?.toLowerCase() || null,
                                to: userAddr,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            // Send webhook notification
                            sendWebhook(createWebhookEvent(
                                'PointsDeposited',
                                { user: userAddr, amount: amount.toString(), from: log.transaction?.from?.toLowerCase() },
                                new Date(Number(blockTime) * 1000),
                                log.transaction?.id || '',
                                block.header.height
                            )).catch(err => ctx.log.warn(`Webhook failed: ${err}`))
                            
                            ctx.log.info(`💳 Points Deposited: ${userAddr.slice(0,6)} (+${amount})`)
                        }
                    }
                    
                    // Phase 8.2: Handle PointsWithdrawn event
                    else if (topic === coreInterface.getEvent('PointsWithdrawn')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.who.toLowerCase()
                            const amount = decoded.args.amount || 0n
                            
                            // Update user points balance
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            user.pointsBalance -= amount
                            
                            pointsTransactions.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                transactionType: 'WITHDRAW',
                                user: userAddr,
                                amount,
                                from: userAddr,
                                to: decoded.args.to?.toLowerCase() || null,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`💸 Points Withdrawn: ${userAddr.slice(0,6)} (-${amount})`)
                        }
                    }
                    
                    // Phase 8.2: Handle ERC20EscrowDeposited event
                    else if (topic === coreInterface.getEvent('ERC20EscrowDeposited')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const token = decoded.args.token.toLowerCase()
                            const from = decoded.args.from.toLowerCase()
                            const amount = decoded.args.amount || 0n
                            const questId = decoded.args.questId
                            
                            treasuryOperations.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                operationType: 'ESCROW_DEPOSIT',
                                token,
                                amount,
                                from,
                                to: null,
                                questId: questId ? BigInt(questId) : null,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`🔒 ERC20 Escrow: ${from.slice(0,6)} → Quest #${questId} (${amount})`)
                        }
                    }
                    
                    // Phase 8.2: Handle ERC20Payout event
                    else if (topic === coreInterface.getEvent('ERC20Payout')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const token = decoded.args.token.toLowerCase()
                            const to = decoded.args.to.toLowerCase()
                            const amount = decoded.args.amount || 0n
                            const questId = decoded.args.questId
                            
                            treasuryOperations.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                operationType: 'PAYOUT',
                                token,
                                amount,
                                from: CORE_ADDRESS,
                                to,
                                questId: questId ? BigInt(questId) : null,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`💰 ERC20 Payout: Quest #${questId} → ${to.slice(0,6)} (${amount})`)
                        }
                    }
                    
                    // Phase 8.2: Handle ERC20Refund event
                    else if (topic === coreInterface.getEvent('ERC20Refund')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const token = decoded.args.token.toLowerCase()
                            const to = decoded.args.to.toLowerCase()
                            const amount = decoded.args.amount || 0n
                            const questId = decoded.args.questId
                            
                            treasuryOperations.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                operationType: 'REFUND',
                                token,
                                amount,
                                from: CORE_ADDRESS,
                                to,
                                questId: questId ? BigInt(questId) : null,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`↩️ ERC20 Refund: Quest #${questId} → ${to.slice(0,6)} (${amount})`)
                        }
                    }
                    
                    // Phase 8.3: Handle StakedForBadge event
                    else if (topic === coreInterface.getEvent('StakedForBadge')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const who = decoded.args.who.toLowerCase()
                            const points = decoded.args.points || 0n
                            const badgeId = decoded.args.badgeId || 0n
                            
                            // Create a new stake record
                            badgeStakes.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user: who,
                                badgeId,
                                stakeType: 'STAKED',
                                stakedAt: new Date(Number(blockTime) * 1000),
                                unstakedAt: null,
                                isActive: true,
                                rewardsEarned: 0n,
                                lastRewardClaim: null,
                                isPowerBadge: false, // Will be updated by PowerBadgeSet event
                                powerMultiplier: null,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            // Send webhook notification
                            sendWebhook(createWebhookEvent(
                                'StakedForBadge',
                                { user: who, badgeId: badgeId.toString(), points: points.toString() },
                                new Date(Number(blockTime) * 1000),
                                log.transaction?.id || '',
                                block.header.height
                            )).catch(err => ctx.log.warn(`Webhook failed: ${err}`))
                            
                            ctx.log.info(`🎖️ Badge Staked: ${who.slice(0,6)} staked Badge #${badgeId} (${points} points)`)
                        }
                    }
                    
                    // Phase 8.3: Handle UnstakedForBadge event
                    else if (topic === coreInterface.getEvent('UnstakedForBadge')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const who = decoded.args.who.toLowerCase()
                            const points = decoded.args.points || 0n
                            const badgeId = decoded.args.badgeId || 0n
                            
                            // Create an unstake record
                            badgeStakes.push({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user: who,
                                badgeId,
                                stakeType: 'UNSTAKED',
                                stakedAt: null,
                                unstakedAt: new Date(Number(blockTime) * 1000),
                                isActive: false,
                                rewardsEarned: 0n, // TODO: Calculate from contract state
                                lastRewardClaim: null,
                                isPowerBadge: false,
                                powerMultiplier: null,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`🎖️ Badge Unstaked: ${who.slice(0,6)} unstaked Badge #${badgeId} (${points} points)`)
                        }
                    }
                    
                    // Phase 8.3: Handle PowerBadgeSet event
                    else if (topic === coreInterface.getEvent('PowerBadgeSet')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const fid = decoded.args.fid
                            const hasPowerBadge = decoded.args.hasPowerBadge
                            const setBy = log.transaction?.from?.toLowerCase() || ''
                            
                            powerBadges.push({
                                id: fid.toString(),
                                fid,
                                isPowerBadge: hasPowerBadge,
                                setBy,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            })
                            
                            ctx.log.info(`🔥 Power Badge ${hasPowerBadge ? 'Granted' : 'Revoked'}: FID ${fid} by ${setBy.slice(0,6)}`)
                        }
                    }
                    
                    // Phase 8: Handle QuestAdded event
                    else if (topic === coreInterface.getEvent('QuestAdded')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const creator = decoded.args.creator.toLowerCase()
                            const questType = decoded.args.questType || 0
                            const rewardPoints = decoded.args.rewardPoints || 0n
                            
                            let quest = new Quest({
                                id: questId,
                                questType: questType === 0 ? 'social' : questType === 1 ? 'onchain' : 'erc20',
                                creator,
                                contractAddress: CORE_ADDRESS,
                                rewardPoints,
                                rewardToken: null,
                                rewardTokenAmount: null,
                                onchainType: null,
                                targetAsset: null,
                                targetAmount: null,
                                targetData: null,
                                createdAt: new Date(Number(blockTime) * 1000),
                                createdBlock: block.header.height,
                                closedAt: null,
                                closedBlock: null,
                                isActive: true,
                                totalCompletions: 0,
                                pointsAwarded: 0n,
                                totalTokensAwarded: 0n,
                                txHash: log.transaction?.id || '',
                            })
                            quests.set(questId, quest)
                            
                            ctx.log.info(`🎯 Quest Added: #${questId} by ${creator.slice(0,6)} (${rewardPoints} points)`)
                        }
                    }
                    
                    // Phase 8: Handle QuestAddedERC20 event
                    else if (topic === coreInterface.getEvent('QuestAddedERC20')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const creator = decoded.args.creator.toLowerCase()
                            const rewardToken = decoded.args.rewardToken.toLowerCase()
                            const rewardAmount = decoded.args.rewardAmount || 0n
                            const questType = decoded.args.questType || 0
                            
                            let quest = new Quest({
                                id: questId,
                                questType: 'erc20',
                                creator,
                                contractAddress: CORE_ADDRESS,
                                rewardPoints: 0n,
                                rewardToken,
                                rewardTokenAmount: rewardAmount,
                                onchainType: null,
                                targetAsset: null,
                                targetAmount: null,
                                targetData: null,
                                createdAt: new Date(Number(blockTime) * 1000),
                                createdBlock: block.header.height,
                                closedAt: null,
                                closedBlock: null,
                                isActive: true,
                                totalCompletions: 0,
                                pointsAwarded: 0n,
                                totalTokensAwarded: 0n,
                                txHash: log.transaction?.id || '',
                            })
                            quests.set(questId, quest)
                            
                            ctx.log.info(`🎯 ERC20 Quest Added: #${questId} (${rewardAmount} ${rewardToken.slice(0,6)})`)
                        }
                    }
                    
                    // Phase 8: Handle OnchainQuestAdded event
                    else if (topic === coreInterface.getEvent('OnchainQuestAdded')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const onchainType = decoded.args.onchainType || 0
                            const asset = decoded.args.asset.toLowerCase()
                            const requiredAmount = decoded.args.requiredAmount || 0n
                            const callData = decoded.args.callData || ''
                            
                            let quest = quests.get(questId)
                            if (quest) {
                                quest.questType = 'onchain'
                                quest.onchainType = onchainType
                                quest.targetAsset = asset
                                quest.targetAmount = requiredAmount
                                quest.targetData = callData
                            }
                            
                            ctx.log.info(`🎯 Onchain Quest Added: #${questId} (type ${onchainType})`)
                        }
                    }
                    
                    // Phase 8: Handle QuestCompleted event (CRITICAL)
                    else if (topic === coreInterface.getEvent('QuestCompleted')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const userAddr = decoded.args.user.toLowerCase()
                            const pointsAwarded = decoded.args.pointsAwarded || 0n
                            const fid = decoded.args.fid || 0n
                            const rewardToken = decoded.args.rewardToken?.toLowerCase() || null
                            const tokenAmount = decoded.args.tokenAmount || 0n
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            
                            // Update user points balance
                            user.pointsBalance += pointsAwarded
                            
                            // Get quest
                            let quest = quests.get(questId)
                            if (quest) {
                                quest.totalCompletions += 1
                                quest.pointsAwarded += pointsAwarded
                                if (tokenAmount > 0n) {
                                    quest.totalTokensAwarded += tokenAmount
                                }
                            }
                            
                            // Create quest completion
                            questCompletions.push(new QuestCompletion({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                quest: quest || undefined,
                                user,
                                pointsAwarded,
                                tokenReward: tokenAmount > 0n ? tokenAmount : null,
                                rewardToken,
                                fid,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            // Check for quest completion milestones
                            const userCompletions = questCompletions.filter(qc => qc.user?.id === userAddr).length
                            checkMilestone(viralMilestones, user, 'quests_completed', userCompletions - 1, userCompletions, blockTime, 'quests')
                            
                            // Send webhook notification
                            sendWebhook(createWebhookEvent(
                                'QuestCompleted',
                                { user: userAddr, questId, pointsAwarded: pointsAwarded.toString(), fid },
                                new Date(Number(blockTime) * 1000),
                                log.transaction?.id || '',
                                block.header.height
                            )).catch(err => ctx.log.warn(`Webhook failed: ${err}`))
                            
                            ctx.log.info(`✅ Quest Completed: #${questId} by ${userAddr.slice(0,6)} (${pointsAwarded} points)`)
                        }
                    }
                    
                    // Phase 8: Handle QuestClosed event
                    else if (topic === coreInterface.getEvent('QuestClosed')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            
                            let quest = quests.get(questId)
                            if (quest) {
                                quest.isActive = false
                                quest.closedAt = new Date(Number(blockTime) * 1000)
                                quest.closedBlock = block.header.height
                            }
                            
                            ctx.log.info(`🚫 Quest Closed: #${questId}`)
                        }
                    }
                }
                
                // Guild contract events
                else if (log.address === GUILD_ADDRESS) {
                    const topic = log.topics[0]
                    
                    // Handle GuildCreated
                    if (topic === guildInterface.getEvent('GuildCreated')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const guildId = decoded.args.guildId.toString()
                            const leader = decoded.args.leader.toLowerCase()
                            
                            // Phase 1.2: Create guild with default values (will be synced from contract every 100 blocks)
                            let guild = new Guild({
                                id: guildId,
                                name: '', // Will be synced from getGuildInfo()
                                owner: leader,
                                createdAt: blockTime,
                                totalMembers: 1,
                                level: 0, // Will be synced from getGuildInfo()
                                isActive: true, // Default to true, will be synced from getGuildInfo()
                                treasuryPoints: 0n,
                            })
                            guilds.set(guildId, guild)
                            
                            // Create guild event
                            guildEvents.push(new GuildEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                guild,
                                eventType: 'CREATED',
                                user: leader,
                                amount: 0n,
                                timestamp: blockTime,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            // Add leader as first member
                            const user = getOrCreateUser(users, leader, blockTime)
                            const memberId = `${guildId}-${leader}`
                            guildMembers.set(memberId, new GuildMember({
                                id: memberId,
                                guild,
                                user,
                                joinedAt: blockTime,
                                role: 'leader', // Phase 2.1: Leader role
                                pointsContributed: 0n,
                                isActive: true,
                            }))
                        }
                    }
                    
                    // Handle GuildJoined
                    else if (topic === guildInterface.getEvent('GuildJoined')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const guildId = decoded.args.guildId.toString()
                            const member = decoded.args.member.toLowerCase()
                            
                            let guild = guilds.get(guildId)
                            if (guild) {
                                guild.totalMembers += 1
                                
                                // Add member
                                const user = getOrCreateUser(users, member, blockTime)
                                const memberId = `${guildId}-${member}`
                                guildMembers.set(memberId, new GuildMember({
                                    id: memberId,
                                    guild,
                                    user,
                                    joinedAt: blockTime,
                                    role: 'member',
                                    pointsContributed: 0n,
                                    isActive: true,
                                }))
                                
                                // Create guild event
                                guildEvents.push(new GuildEvent({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    guild,
                                    eventType: 'JOINED',
                                    user: member,
                                    amount: 0n,
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                            }
                        }
                    }
                    
                    // Handle GuildLeft
                    else if (topic === guildInterface.getEvent('GuildLeft')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const guildId = decoded.args.guildId.toString()
                            const member = decoded.args.member.toLowerCase()
                            
                            let guild = guilds.get(guildId)
                            if (guild) {
                                guild.totalMembers = Math.max(0, guild.totalMembers - 1)
                                
                                // Mark member as inactive
                                const memberId = `${guildId}-${member}`
                                const guildMember = guildMembers.get(memberId)
                                if (guildMember) {
                                    guildMember.isActive = false
                                }
                                
                                // Create guild event
                                guildEvents.push(new GuildEvent({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    guild,
                                    eventType: 'LEFT',
                                    user: member,
                                    amount: 0n,
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                            }
                        }
                    }
                    
                    // Handle GuildPointsDeposited
                    // Contract: event GuildPointsDeposited(uint256 guildId, address from, uint256 amount)
                    // 4-Layer: Contract (camelCase) → Subsquid (camelCase) → DB (snake_case) → API (camelCase)
                    else if (topic === guildInterface.getEvent('GuildPointsDeposited')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const guildId = decoded.args.guildId.toString()
                            const from = decoded.args.from.toLowerCase() // Contract field name (camelCase)
                            const amount = decoded.args.amount // Contract field name (camelCase)
                            
                            // Create GuildPointsDepositedEvent entity (Layer 2 - exact contract names)
                            guildPointsDepositedEvents.push(new GuildPointsDepositedEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                guildId, // Contract: uint256 guildId (camelCase - source of truth)
                                from,    // Contract: address from (camelCase - source of truth)
                                amount,  // Contract: uint256 amount (camelCase - source of truth)
                                timestamp: blockTime,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`💰 GuildPointsDeposited: guildId=${guildId}, from=${from}, amount=${amount.toString()}`)  
                        }
                    }
                    
                    // Handle GuildLevelUp
                    // Contract: event GuildLevelUp(uint256 guildId, uint8 newLevel)
                    // 4-Layer: Contract (camelCase) → Subsquid (camelCase) → DB (snake_case) → API (camelCase)
                    // Note: Event emitted automatically when guildTreasuryPoints() crosses level thresholds
                    else if (topic === guildInterface.getEvent('GuildLevelUp')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const guildId = decoded.args.guildId.toString()
                            const newLevel = Number(decoded.args.newLevel) // Contract field name (uint8 → number)
                            
                            // Create GuildLevelUpEvent entity (Layer 2 - exact contract names)
                            guildLevelUpEvents.push(new GuildLevelUpEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                guildId,   // Contract: uint256 guildId (camelCase - source of truth)
                                newLevel,  // Contract: uint8 newLevel (camelCase - source of truth)
                                timestamp: blockTime,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`📈 GuildLevelUp: guildId=${guildId}, newLevel=${newLevel}`)
                        }
                    }
                    
                    // Phase 8: Handle GuildQuestCreated event
                    else if (topic === guildInterface.getEvent('GuildQuestCreated')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const guildId = decoded.args.guildId.toString()
                            const creator = decoded.args.creator.toLowerCase()
                            const rewardPoints = decoded.args.rewardPoints || 0n
                            
                            let quest = new Quest({
                                id: questId,
                                questType: 'guild',
                                creator,
                                contractAddress: GUILD_ADDRESS,
                                rewardPoints,
                                rewardToken: null,
                                rewardTokenAmount: null,
                                onchainType: null,
                                targetAsset: guildId, // Store guildId in targetAsset for guild quests
                                targetAmount: null,
                                targetData: null,
                                createdAt: new Date(Number(blockTime) * 1000),
                                createdBlock: block.header.height,
                                closedAt: null,
                                closedBlock: null,
                                isActive: true,
                                totalCompletions: 0,
                                pointsAwarded: 0n,
                                totalTokensAwarded: 0n,
                                txHash: log.transaction?.id || '',
                            })
                            quests.set(questId, quest)
                            
                            ctx.log.info(`🛡️ Guild Quest Created: #${questId} for Guild #${guildId}`)
                        }
                    }
                    
                    // Phase 8: Handle GuildRewardClaimed event (Guild quest completion)
                    else if (topic === guildInterface.getEvent('GuildRewardClaimed')?.topicHash) {
                        const decoded = guildInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId?.toString() || 'unknown'
                            const guildId = decoded.args.guildId.toString()
                            const claimer = decoded.args.claimer.toLowerCase()
                            const reward = decoded.args.reward || 0n
                            
                            // Get or create user
                            let user = getOrCreateUser(users, claimer, blockTime)
                            
                            // Get quest
                            let quest = quests.get(questId)
                            if (quest) {
                                quest.totalCompletions += 1
                                quest.pointsAwarded += reward
                            }
                            
                            // Create quest completion
                            questCompletions.push(new QuestCompletion({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                quest: quest || undefined,
                                user,
                                pointsAwarded: reward,
                                tokenReward: null,
                                rewardToken: null,
                                fid: 0n, // Guild quests don't have FID
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`🛡️ Guild Reward Claimed: Quest #${questId} by ${claimer.slice(0,6)} in Guild #${guildId}`)
                        }
                    }
                    
                    // Phase 9: Handle QuestAdded event (User quest creation with escrow)
                    else if (topic === coreInterface.getEvent('QuestAdded')?.topicHash) {
                        const decoded = coreInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const creator = decoded.args.creator.toLowerCase()
                            const questType = Number(decoded.args.questType)
                            const rewardPerUserPoints = decoded.args.rewardPerUserPoints || 0n
                            const maxCompletions = decoded.args.maxCompletions || 0n
                            
                            // Calculate escrow amount
                            const escrowAmount = rewardPerUserPoints * maxCompletions
                            
                            // Create quest entity
                            let quest = new Quest({
                                id: questId,
                                questType: 'user', // User-generated quest (vs 'guild')
                                creator,
                                contractAddress: CORE_ADDRESS,
                                rewardPoints: rewardPerUserPoints,
                                rewardToken: null,
                                rewardTokenAmount: null,
                                onchainType: questType,
                                targetAsset: null,
                                targetAmount: null,
                                targetData: null,
                                createdAt: new Date(Number(blockTime) * 1000),
                                createdBlock: block.header.height,
                                closedAt: null,
                                closedBlock: null,
                                isActive: true,
                                totalCompletions: 0,
                                pointsAwarded: 0n,
                                totalTokensAwarded: 0n,
                                txHash: log.transaction?.id || '',
                            })
                            quests.set(questId, quest)
                            
                            ctx.log.info(`🎯 Quest Added: #${questId} by ${creator.slice(0,6)} | ${rewardPerUserPoints} pts/completion | ${maxCompletions} max | ${escrowAmount} total escrow`)
                        }
                    }
                }
                
                // Badge/NFT events
                else if (log.address === BADGE_ADDRESS || log.address === NFT_ADDRESS) {
                    const topic = log.topics[0]
                    
                    // NFT Contract: Try NFTMinted event first (has nftType and metadataURI)
                    if (log.address === NFT_ADDRESS && topic === nftInterface.getEvent('NFTMinted')?.topicHash) {
                        try {
                            const decoded = nftInterface.parseLog({
                                topics: log.topics as string[],
                                data: log.data
                            })
                            
                            if (decoded) {
                                nftMints.push(new NFTMint({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    tokenId: decoded.args.tokenId,
                                    to: decoded.args.recipient.toLowerCase(),
                                    nftType: decoded.args.nftType || 'UNKNOWN',
                                    metadataURI: decoded.args.metadataURI || '',
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                                ctx.log.debug(`✨ NFTMinted: tokenId=${decoded.args.tokenId} type=${decoded.args.nftType}`)
                            }
                        } catch (error) {
                            ctx.log.warn(`Failed to parse NFTMinted event: ${error}`)
                        }
                    }
                    // Fallback: Standard ERC721 Transfer event (for legacy mints or other contracts)
                    else if (topic === ethers.id(TRANSFER_SIGNATURE)) {
                        const from = '0x' + log.topics[1]?.slice(26).toLowerCase()
                        const to = '0x' + log.topics[2]?.slice(26).toLowerCase()
                        const tokenId = BigInt(log.topics[3] || '0')
                        
                        // Mint event (from zero address)
                        if (from === '0x0000000000000000000000000000000000000000') {
                            if (log.address === BADGE_ADDRESS) {
                                const user = getOrCreateUser(users, to, blockTime)
                                badgeMints.push(new BadgeMint({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    tokenId,
                                    user,
                                    badgeType: 'unknown', // Would need additional data
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                            } else if (log.address === NFT_ADDRESS) {
                                // Only create if NFTMinted wasn't already processed
                                // (NFTMinted is emitted alongside Transfer)
                                ctx.log.debug(`⚠️  Transfer mint detected without NFTMinted event - using fallback`)
                                nftMints.push(new NFTMint({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    tokenId,
                                    to,
                                    nftType: 'UNKNOWN',  // Fallback when NFTMinted not captured
                                    metadataURI: '',     // Fallback
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                            }
                        }
                        // Regular transfer (not a mint)
                        else if (log.address === NFT_ADDRESS) {
                            nftTransfers.push(new NFTTransfer({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                tokenId,
                                from,
                                to,
                                timestamp: blockTime,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                        }
                    }
                }
                
                // Referral contract events
                else if (log.address === REFERRAL_ADDRESS) {
                    const topic = log.topics[0]
                    
                    // Handle ReferralCodeRegistered
                    if (topic === referralInterface.getEvent('ReferralCodeRegistered')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            const code = decoded.args.code
                            
                            // Ensure user exists in users map
                            getOrCreateUser(users, userAddr, blockTime)
                            
                            // Create or update referral code
                            let referralCode = referralCodes.get(code)
                            if (!referralCode) {
                                referralCode = new ReferralCode({
                                    id: code,
                                    owner: userAddr,
                                    createdAt: blockTime,
                                    totalUses: 0,
                                    totalRewards: 0n,
                                })
                                referralCodes.set(code, referralCode)
                            }
                        }
                    }
                    
                    // Phase 8.4: Handle ReferrerSet
                    else if (topic === referralInterface.getEvent('ReferrerSet')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const user = decoded.args.user.toLowerCase()
                            const referrer = decoded.args.referrer.toLowerCase()
                            
                            // Create ReferrerSet record for chain tracking
                            ctx.store.insert(new ReferrerSet({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                referrer,
                                timestamp: blockTime,
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`Referrer set: ${user.slice(0, 6)}... → ${referrer.slice(0, 6)}...`)
                        }
                    }
                    
                    // Handle ReferralRewardClaimed
                    else if (topic === referralInterface.getEvent('ReferralRewardClaimed')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const referrerAddr = decoded.args.referrer.toLowerCase()
                            const refereeAddr = decoded.args.referee.toLowerCase()
                            const pointsReward = decoded.args.pointsReward || 0n
                            const tokenReward = decoded.args.tokenReward || 0n
                            
                            // Ensure users exist in users map
                            getOrCreateUser(users, referrerAddr, blockTime)
                            getOrCreateUser(users, refereeAddr, blockTime)
                            
                            // Find referral code by owner
                            let referralCodeId: string | null = null
                            for (let [codeId, code] of referralCodes.entries()) {
                                if (code.owner === referrerAddr) {
                                    referralCodeId = codeId
                                    code.totalUses += 1
                                    code.totalRewards += pointsReward + tokenReward
                                    break
                                }
                            }
                            
                            // If we found a matching code, create referral use record
                            if (referralCodeId) {
                                const code = referralCodes.get(referralCodeId)!
                                
                                referralUses.push(new ReferralUse({
                                    id: `${log.transaction?.id}-${log.logIndex}`,
                                    code,
                                    referrer: referrerAddr,
                                    referee: refereeAddr,
                                    reward: pointsReward + tokenReward,
                                    timestamp: blockTime,
                                    blockNumber: block.header.height,
                                    txHash: log.transaction?.id || '',
                                }))
                            }
                        }
                    }
                    
                    // Phase 8: Referral contract also has quest events (same as Core)
                    else if (topic === referralInterface.getEvent('QuestAdded')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const creator = decoded.args.creator.toLowerCase()
                            const questType = decoded.args.questType || 0
                            const rewardPoints = decoded.args.rewardPoints || 0n
                            
                            let quest = new Quest({
                                id: questId,
                                questType: questType === 0 ? 'social' : questType === 1 ? 'onchain' : 'erc20',
                                creator,
                                contractAddress: REFERRAL_ADDRESS,
                                rewardPoints,
                                rewardToken: null,
                                rewardTokenAmount: null,
                                onchainType: null,
                                targetAsset: null,
                                targetAmount: null,
                                targetData: null,
                                createdAt: new Date(Number(blockTime) * 1000),
                                createdBlock: block.header.height,
                                closedAt: null,
                                closedBlock: null,
                                isActive: true,
                                totalCompletions: 0,
                                pointsAwarded: 0n,
                                totalTokensAwarded: 0n,
                                txHash: log.transaction?.id || '',
                            })
                            quests.set(questId, quest)
                            
                            ctx.log.info(`🔗 Referral Quest Added: #${questId}`)
                        }
                    }
                    
                    else if (topic === referralInterface.getEvent('QuestCompleted')?.topicHash) {
                        const decoded = referralInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const questId = decoded.args.questId.toString()
                            const userAddr = decoded.args.user.toLowerCase()
                            const pointsAwarded = decoded.args.pointsAwarded || 0n
                            
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            let quest = quests.get(questId)
                            
                            if (quest) {
                                quest.totalCompletions += 1
                                quest.pointsAwarded += pointsAwarded
                            }
                            
                            questCompletions.push(new QuestCompletion({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                quest: quest || undefined,
                                user,
                                pointsAwarded,
                                tokenReward: null,
                                rewardToken: null,
                                fid: 0n,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`🔗 Referral Quest Completed: #${questId} by ${userAddr.slice(0,6)}`)
                        }
                    }
                }
                
                // Phase 3.2G: ScoringModule contract events (Jan 1, 2026)
                else if (log.address === SCORING_ADDRESS) {
                    const topic = log.topics[0]
                    
                    // Handle StatsUpdated event
                    if (topic === scoringInterface.getEvent('StatsUpdated')?.topicHash) {
                        const decoded = scoringInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            const totalScore = decoded.args.totalScore
                            const level = Number(decoded.args.level)
                            const rankTier = Number(decoded.args.rankTier)
                            const multiplier = Number(decoded.args.multiplier)
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            
                            // Update user scoring fields from event
                            user.level = level
                            user.rankTier = rankTier
                            user.totalScore = totalScore
                            user.multiplier = multiplier
                            user.updatedAt = new Date(Number(blockTime) * 1000)
                            
                            // FIX (Jan 11, 2026): Read score component breakdowns from contract state
                            // StatsUpdated event doesn't include viralPoints, questPoints, etc.
                            // We need to query contract state to get the actual values
                            try {
                                const blockHeader = block.header
                                
                                // Read viralPoints from contract state
                                const viralPointsData = await ctx._chain.client.call('eth_call', [{
                                    to: SCORING_ADDRESS,
                                    data: scoringInterface.encodeFunctionData('viralPoints', [decoded.args.user])
                                }, blockHeader.hash])
                                user.viralPoints = BigInt(viralPointsData)
                                
                                // Read questPoints from contract state
                                const questPointsData = await ctx._chain.client.call('eth_call', [{
                                    to: SCORING_ADDRESS,
                                    data: scoringInterface.encodeFunctionData('questPoints', [decoded.args.user])
                                }, blockHeader.hash])
                                user.questPoints = BigInt(questPointsData)
                                
                                // Read guildPoints from contract state
                                const guildPointsData = await ctx._chain.client.call('eth_call', [{
                                    to: SCORING_ADDRESS,
                                    data: scoringInterface.encodeFunctionData('guildPoints', [decoded.args.user])
                                }, blockHeader.hash])
                                user.guildPoints = BigInt(guildPointsData)
                                
                                // Read referralPoints from contract state
                                const referralPointsData = await ctx._chain.client.call('eth_call', [{
                                    to: SCORING_ADDRESS,
                                    data: scoringInterface.encodeFunctionData('referralPoints', [decoded.args.user])
                                }, blockHeader.hash])
                                user.referralPoints = BigInt(referralPointsData)
                                
                                // Read gmPoints (scoringPointsBalance) from contract state
                                const gmPointsData = await ctx._chain.client.call('eth_call', [{
                                    to: SCORING_ADDRESS,
                                    data: scoringInterface.encodeFunctionData('scoringPointsBalance', [decoded.args.user])
                                }, blockHeader.hash])
                                user.gmPoints = BigInt(gmPointsData)
                                
                                ctx.log.info(`   ✅ Read score components: viral=${user.viralPoints}, quest=${user.questPoints}, guild=${user.guildPoints}, referral=${user.referralPoints}, gm=${user.gmPoints}`)
                            } catch (err: any) {
                                ctx.log.warn(`   ⚠️  Failed to read score components for ${userAddr}: ${err.message}`)
                                // Keep existing values on error (don't reset to 0)
                            }
                            
                            // Determine trigger type from transaction context
                            // Note: This is a simplification - in production you'd analyze the tx to determine trigger
                            let triggerType = 'UNKNOWN'
                            let triggerAmount = 0n
                            
                            // Try to infer from recent events in same block/tx
                            // For now, we'll set generic values
                            triggerType = 'MANUAL' // Default, could be enhanced with tx analysis
                            triggerAmount = totalScore // Use total score as placeholder
                            
                            // Create StatsUpdatedEvent
                            statsUpdatedEvents.push(new StatsUpdatedEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                totalScore,
                                level,
                                rankTier,
                                multiplier,
                                triggerType,
                                triggerAmount,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`📊 Stats Updated: ${userAddr.slice(0,6)}... Level ${level}, Tier ${rankTier}, Score ${totalScore}`)
                        }
                    }
                    
                    // Handle LevelUp event
                    else if (topic === scoringInterface.getEvent('LevelUp')?.topicHash) {
                        const decoded = scoringInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            const oldLevel = Number(decoded.args.oldLevel)
                            const newLevel = Number(decoded.args.newLevel)
                            const totalScore = decoded.args.totalScore
                            const levelGap = newLevel - oldLevel
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            
                            // Update user level tracking
                            user.level = newLevel
                            user.lastLevelUpAt = new Date(Number(blockTime) * 1000)
                            user.totalLevelUps += 1
                            user.updatedAt = new Date(Number(blockTime) * 1000)
                            
                            // Create LevelUpEvent
                            levelUpEvents.push(new LevelUpEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                oldLevel,
                                newLevel,
                                totalScore,
                                levelGap,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`🆙 Level Up: ${userAddr.slice(0,6)}... ${oldLevel} → ${newLevel} (Score: ${totalScore})`)
                        }
                    }
                    
                    // Handle RankUp event
                    else if (topic === scoringInterface.getEvent('RankUp')?.topicHash) {
                        const decoded = scoringInterface.parseLog({
                            topics: log.topics as string[],
                            data: log.data
                        })
                        
                        if (decoded) {
                            const userAddr = decoded.args.user.toLowerCase()
                            const oldTier = Number(decoded.args.oldTier)
                            const newTier = Number(decoded.args.newTier)
                            const totalScore = decoded.args.totalScore
                            const tierGap = newTier - oldTier
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            
                            // Calculate new multiplier (contract logic: 100 + tier * 40)
                            const newMultiplier = 100 + newTier * 40
                            
                            // Update user rank tracking
                            user.rankTier = newTier
                            user.multiplier = newMultiplier
                            user.lastRankUpAt = new Date(Number(blockTime) * 1000)
                            user.totalRankUps += 1
                            user.updatedAt = new Date(Number(blockTime) * 1000)
                            
                            // Create RankUpEvent
                            rankUpEvents.push(new RankUpEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                oldTier,
                                newTier,
                                totalScore,
                                tierGap,
                                newMultiplier,
                                timestamp: new Date(Number(blockTime) * 1000),
                                blockNumber: block.header.height,
                                txHash: log.transaction?.id || '',
                            }))
                            
                            ctx.log.info(`⭐ Rank Up: ${userAddr.slice(0,6)}... Tier ${oldTier} → ${newTier} (Multiplier: ${newMultiplier}, Score: ${totalScore})`)
                        }
                    }
                }
                
            } catch (e) {
                ctx.log.warn(`⚠️  Failed to process log at block ${block.header.height}: ${e}`)
            }
        }
    }
    
    // BUG #16 FIX: Read actual treasury points from contract storage
    // CRITICAL: Events can be incomplete (external calls, reorgs). Must read contract state.
    if (guilds.size > 0) {
        try {
            const { getCurrentEndpoint } = await import('./rpc-manager')
            const rpcEndpoint = getCurrentEndpoint()
            const provider = new ethers.JsonRpcProvider(rpcEndpoint.url)
            const guildContract = new ethers.Contract(
                GUILD_ADDRESS,
                guildAbiJson,
                provider
            )
            
            ctx.log.info(`📊 Reading treasury points for ${guilds.size} guilds from contract...`)
            
            // Batch read treasury points for all guilds
            for (const [guildId, guild] of guilds) {
                try {
                    const treasuryPoints = await guildContract.guildTreasuryPoints(BigInt(guildId))
                    guild.treasuryPoints = treasuryPoints
                    ctx.log.info(`   Guild #${guildId}: ${treasuryPoints} treasury points`)
                } catch (err: any) {
                    ctx.log.warn(`⚠️  Failed to read treasury for guild #${guildId}: ${err.message}`)
                }
            }
            
            recordSuccess()
        } catch (err: any) {
            ctx.log.warn(`⚠️  Failed to read contract state: ${err.message}`)
            recordFailure(err)
        }
    }
    
    // Batch save all entities
    if (users.size > 0) {
        await ctx.store.upsert([...users.values()])
        ctx.log.info(`💾 Saved ${users.size} users`)
    }
    
    // Phase 8: Save quests and completions
    if (quests.size > 0) {
        await ctx.store.upsert([...quests.values()])
        ctx.log.info(`💾 Saved ${quests.size} quests`)
    }
    
    if (questCompletions.length > 0) {
        await ctx.store.insert(questCompletions)
        ctx.log.info(`💾 Saved ${questCompletions.length} quest completions`)
    }
    
    if (gmEvents.length > 0) {
        await ctx.store.insert(gmEvents)
        ctx.log.info(`💾 Saved ${gmEvents.length} GM events`)
    }
    
    if (guilds.size > 0) {
        await ctx.store.upsert([...guilds.values()])
        ctx.log.info(`💾 Saved ${guilds.size} guilds`)
    }
    
    if (guildMembers.size > 0) {
        await ctx.store.upsert([...guildMembers.values()])
        ctx.log.info(`💾 Saved ${guildMembers.size} guild members`)
    }
    
    if (guildEvents.length > 0) {
        await ctx.store.insert(guildEvents)
        ctx.log.info(`💾 Saved ${guildEvents.length} guild events`)
    }
    
    // Phase 3: Save GuildPointsDeposited events (Layer 2 - Subsquid database)
    if (guildPointsDepositedEvents.length > 0) {
        await ctx.store.insert(guildPointsDepositedEvents)
        ctx.log.info(`💾 Saved ${guildPointsDepositedEvents.length} guild points deposited events`)
    }
    
    // Phase 4: Save GuildLevelUp events (Layer 2 - Subsquid database)
    if (guildLevelUpEvents.length > 0) {
        await ctx.store.insert(guildLevelUpEvents)
        ctx.log.info(`💾 Saved ${guildLevelUpEvents.length} guild level up events`)
    }
    
    if (badgeMints.length > 0) {
        await ctx.store.insert(badgeMints)
        ctx.log.info(`💾 Saved ${badgeMints.length} badge mints`)
    }
    
    if (nftMints.length > 0) {
        await ctx.store.insert(nftMints)
        ctx.log.info(`💾 Saved ${nftMints.length} NFT mints`)
    }
    
    // Phase 7: Save tip events
    if (tipEvents.length > 0) {
        await ctx.store.insert(tipEvents.map(t => new TipEvent(t)))
        ctx.log.info(`💾 Saved ${tipEvents.length} tip events`)
    }
    
    // Phase 7: Save viral milestones
    if (viralMilestones.length > 0) {
        await ctx.store.insert(viralMilestones.map(m => new ViralMilestone(m)))
        ctx.log.info(`💾 Saved ${viralMilestones.length} viral milestones`)
    }
    
    if (nftTransfers.length > 0) {
        await ctx.store.insert(nftTransfers)
        ctx.log.info(`💾 Saved ${nftTransfers.length} NFT transfers`)
    }
    
    if (referralCodes.size > 0) {
        await ctx.store.upsert([...referralCodes.values()])
        ctx.log.info(`💾 Saved ${referralCodes.size} referral codes`)
    }
    
    if (referralUses.length > 0) {
        await ctx.store.insert(referralUses)
        ctx.log.info(`💾 Saved ${referralUses.length} referral uses`)
    }
    
    // Phase 8.2: Save points transactions
    if (pointsTransactions.length > 0) {
        await ctx.store.insert(pointsTransactions.map(p => new PointsTransaction(p)))
        ctx.log.info(`💾 Saved ${pointsTransactions.length} points transactions`)
    }
    
    // Phase 8.2: Save treasury operations
    if (treasuryOperations.length > 0) {
        await ctx.store.insert(treasuryOperations.map(t => new TreasuryOperation(t)))
        ctx.log.info(`💾 Saved ${treasuryOperations.length} treasury operations`)
    }
    
    // Phase 8.3: Save badge stakes
    if (badgeStakes.length > 0) {
        await ctx.store.insert(badgeStakes.map(b => new BadgeStake(b)))
        ctx.log.info(`💾 Saved ${badgeStakes.length} badge stakes`)
    }
    
    // Phase 8.3: Save power badges
    if (powerBadges.length > 0) {
        await ctx.store.upsert(powerBadges.map(p => new PowerBadge(p)))
        ctx.log.info(`💾 Saved ${powerBadges.length} power badges`)
    }
    
    // Phase 3.2G: Save ScoringModule events (Jan 1, 2026)
    if (statsUpdatedEvents.length > 0) {
        await ctx.store.insert(statsUpdatedEvents)
        ctx.log.info(`💾 Saved ${statsUpdatedEvents.length} stats updated events`)
    }
    
    if (levelUpEvents.length > 0) {
        await ctx.store.insert(levelUpEvents)
        ctx.log.info(`💾 Saved ${levelUpEvents.length} level up events`)
    }
    
    if (rankUpEvents.length > 0) {
        await ctx.store.insert(rankUpEvents)
        ctx.log.info(`💾 Saved ${rankUpEvents.length} rank up events`)
    }
    
    // BUG #16 FIX: Periodic sync of ALL guilds with contract state
    // Run every 100 blocks to ensure treasury balances stay up-to-date
    // PHASE 1.2: Enhanced with getGuildInfo() to sync name, level, isActive, member count
    const currentBlock = endBlock || 0
    if (currentBlock % 100 === 0) {
        try {
            const { getCurrentEndpoint } = await import('./rpc-manager')
            const rpcEndpoint = getCurrentEndpoint()
            const provider = new ethers.JsonRpcProvider(rpcEndpoint.url)
            const guildContract = new ethers.Contract(
                GUILD_ADDRESS,
                guildAbiJson,
                provider
            )
            
            // Load ALL guilds from database
            const allGuilds = await ctx.store.findBy(Guild, {})
            if (allGuilds.length > 0) {
                ctx.log.info(`🔄 Syncing ${allGuilds.length} guilds from contract (Phase 1.2)...`)
                
                for (const guild of allGuilds) {
                    try {
                        // Phase 1.2: Read full guild info from contract
                        const guildInfo = await guildContract.getGuildInfo(BigInt(guild.id))
                        
                        // Update all fields from contract (source of truth)
                        let updated = false
                        
                        if (guild.name !== guildInfo.name) {
                            ctx.log.info(`   Guild #${guild.id}: name updated "${guild.name}" → "${guildInfo.name}"`)
                            guild.name = guildInfo.name
                            updated = true
                        }
                        
                        if (guild.owner !== guildInfo.leader.toLowerCase()) {
                            ctx.log.info(`   Guild #${guild.id}: leader changed ${guild.owner} → ${guildInfo.leader.toLowerCase()}`)
                            guild.owner = guildInfo.leader.toLowerCase()
                            updated = true
                        }
                        
                        const contractLevel = Number(guildInfo.level)
                        if (guild.level !== contractLevel) {
                            ctx.log.info(`   Guild #${guild.id}: level ${guild.level} → ${contractLevel}`)
                            guild.level = contractLevel
                            updated = true
                        }
                        
                        if (guild.isActive !== guildInfo.active) {
                            ctx.log.info(`   Guild #${guild.id}: active ${guild.isActive} → ${guildInfo.active}`)
                            guild.isActive = guildInfo.active
                            updated = true
                        }
                        
                        const contractMembers = Number(guildInfo.memberCount)
                        if (guild.totalMembers !== contractMembers) {
                            ctx.log.info(`   Guild #${guild.id}: members ${guild.totalMembers} → ${contractMembers}`)
                            guild.totalMembers = contractMembers
                            updated = true
                        }
                        
                        if (guild.treasuryPoints !== guildInfo.treasuryPoints) {
                            ctx.log.info(`   Guild #${guild.id}: treasury ${guild.treasuryPoints} → ${guildInfo.treasuryPoints}`)
                            guild.treasuryPoints = guildInfo.treasuryPoints
                            updated = true
                        }
                        
                        if (updated) {
                            ctx.log.info(`   ✅ Guild #${guild.id} synced from contract`)
                        }
                    } catch (err: any) {
                        ctx.log.warn(`⚠️  Failed to read guild info for #${guild.id}: ${err.message}`)
                    }
                }
                
                // Save updated guilds
                await ctx.store.upsert(allGuilds)
                ctx.log.info(`✅ Guild sync complete at block ${currentBlock} (Phase 1.2)`)
                
                // Phase 2.1: Sync member roles from contract storage
                ctx.log.info(`🔄 Syncing member roles from contract (Phase 2.1)...`)
                for (const guild of allGuilds) {
                    try {
                        // Get all members for this guild
                        const members = await ctx.store.findBy(GuildMember, { guild: { id: guild.id } })
                        if (members.length === 0) continue
                        
                        let rolesUpdated = 0
                        for (const member of members) {
                            const memberAddress = member.user.id // User ID is the wallet address
                            
                            // Determine role from contract
                            let newRole = 'member' // Default
                            
                            // Check if leader (guild owner)
                            if (memberAddress.toLowerCase() === guild.owner.toLowerCase()) {
                                newRole = 'leader'
                            } else {
                                // Check if officer via contract storage
                                try {
                                    const isOfficer = await guildContract.guildOfficers(BigInt(guild.id), memberAddress)
                                    if (isOfficer) {
                                        newRole = 'officer'
                                    }
                                } catch (err: any) {
                                    // If contract call fails, keep as member
                                    ctx.log.warn(`   Failed to check officer status for ${memberAddress}: ${err.message}`)
                                }
                            }
                            
                            // Update if role changed
                            if (member.role !== newRole) {
                                ctx.log.info(`   Guild #${guild.id}: ${memberAddress} role ${member.role} → ${newRole}`)
                                member.role = newRole
                                rolesUpdated++
                            }
                        }
                        
                        // Save updated members
                        if (rolesUpdated > 0) {
                            await ctx.store.upsert(members)
                            ctx.log.info(`   ✅ Guild #${guild.id}: ${rolesUpdated} role(s) updated`)
                        }
                    } catch (err: any) {
                        ctx.log.warn(`⚠️  Failed to sync roles for guild #${guild.id}: ${err.message}`)
                    }
                }
                ctx.log.info(`✅ Member role sync complete at block ${currentBlock} (Phase 2.1)`)
                recordSuccess()
            }
        } catch (err: any) {
            ctx.log.warn(`⚠️  Guild sync failed: ${err.message}`)
            recordFailure(err)
        }
    }
    
    ctx.log.info(`✅ Batch complete: ${startBlock} to ${endBlock}`)
})

// Helper: Get or create user
function getOrCreateUser(
    users: Map<string, User>,
    address: string,
    timestamp: bigint
): User {
    const addr = address.toLowerCase()
    let user = users.get(addr)
    if (!user) {
        user = new User({
            id: addr,
            pointsBalance: 0n, // Current spendable balance
            totalEarnedFromGMs: 0n, // Cumulative earned from GM events
            currentStreak: 0,
            lastGMTimestamp: 0n,
            lifetimeGMs: 0,
            // Phase 7: Tip tracking
            totalTipsGiven: 0n,
            totalTipsReceived: 0n,
            // Phase 7: Milestones
            milestoneCount: 0,
            // Phase 3.2G: ScoringModule fields (initialized to defaults)
            level: 0,
            rankTier: 0,
            totalScore: 0n,
            multiplier: 100, // Base multiplier (1.0x)
            gmPoints: 0n,
            viralPoints: 0n,
            questPoints: 0n,
            guildPoints: 0n,
            referralPoints: 0n,
            xpIntoLevel: 0n,
            xpToNextLevel: 100n, // Default XP for first level
            pointsIntoTier: 0n,
            pointsToNextTier: 1000n, // Default points for first tier
            totalLevelUps: 0,
            totalRankUps: 0,
            createdAt: new Date(Number(timestamp) * 1000),
            updatedAt: new Date(Number(timestamp) * 1000),
        })
        users.set(addr, user)
    }
    return user
}

// Phase 7: Milestone detection helper
function checkMilestone(
    milestones: any[],
    user: User,
    type: string,
    oldValue: number,
    newValue: number,
    timestamp: bigint,
    category: string
): void {
    // Define milestone thresholds
    const thresholds: Record<string, number[]> = {
        'tips_received': [10, 50, 100, 500, 1000],
        'tips_given': [10, 50, 100, 500, 1000],
        'gm_count': [1, 7, 30, 100, 365],
        'xp_earned': [100, 500, 1000, 5000, 10000],
        'streak_days': [3, 7, 14, 30, 100]
    }
    
    const milestoneThresholds = thresholds[type] || []
    
    // Check if we crossed any milestone threshold
    for (const threshold of milestoneThresholds) {
        if (oldValue < threshold && newValue >= threshold) {
            const milestoneId = `${user.id}-${type}-${threshold}-${timestamp}`
            milestones.push({
                id: milestoneId,
                user: user,
                milestoneType: `${type}_${threshold}`,
                value: BigInt(newValue),
                timestamp: new Date(Number(timestamp) * 1000),
                castHash: null,
                notificationSent: false,
                previousValue: BigInt(oldValue),
                requiredValue: BigInt(threshold),
                category: category
            })
            
            // Increment user milestone count
            user.milestoneCount += 1
        }
    }
}
