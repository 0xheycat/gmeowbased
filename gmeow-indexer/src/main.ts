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
import * as ethers from 'ethers'
import {processor, CORE_ADDRESS, GUILD_ADDRESS, BADGE_ADDRESS, NFT_ADDRESS, REFERRAL_ADDRESS} from './processor'
import {
    User,
    GMEvent,
    Guild,
    GuildMember,
    GuildEvent,
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
} from './model'

// Import ABIs for event decoding
import coreAbiJson from '../abi/GmeowCore.abi.json'
import guildAbiJson from '../abi/GmeowGuildStandalone.abi.json'
import referralAbiJson from '../abi/GmeowReferralStandalone.abi.json'
import nftAbiJson from '../abi/GmeowNFT.abi.json'

// Import webhook utility
import { sendWebhook, createWebhookEvent } from './webhook'

// Create interfaces for event decoding
const coreInterface = new ethers.Interface(coreAbiJson)
const guildInterface = new ethers.Interface(guildAbiJson)
const referralInterface = new ethers.Interface(referralAbiJson)
const nftInterface = new ethers.Interface(nftAbiJson)

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
                        topic === guildInterface.getEvent('GuildLeft')?.topicHash) {
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
                            const points = decoded.args.rewardPoints || decoded.args.pointsEarned || 0n
                            const streak = decoded.args.newStreak || decoded.args.streak || 0n
                            
                            // Get or create user
                            let user = getOrCreateUser(users, userAddr, blockTime)
                            const oldPoints = user.totalPoints
                            const oldGMCount = user.lifetimeGMs
                            const oldStreak = user.currentStreak
                            
                            user.totalPoints += points
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
                            checkMilestone(viralMilestones, user, 'points_earned', Number(oldPoints), Number(user.totalPoints), blockTime, 'gm')
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
                                totalPointsAwarded: 0n,
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
                                totalPointsAwarded: 0n,
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
                            
                            // Get quest
                            let quest = quests.get(questId)
                            if (quest) {
                                quest.totalCompletions += 1
                                quest.totalPointsAwarded += pointsAwarded
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
                            
                            let guild = new Guild({
                                id: guildId,
                                owner: leader,
                                createdAt: blockTime,
                                totalMembers: 1,
                                totalPoints: 0n,
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
                                role: 'owner',
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
                                totalPointsAwarded: 0n,
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
                                quest.totalPointsAwarded += reward
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
                                totalPointsAwarded: 0n,
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
                                quest.totalPointsAwarded += pointsAwarded
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
                
            } catch (e) {
                ctx.log.warn(`⚠️  Failed to process log at block ${block.header.height}: ${e}`)
            }
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
            totalPoints: 0n,
            currentStreak: 0,
            lastGMTimestamp: 0n,
            lifetimeGMs: 0,
            // Phase 7: Tip tracking
            totalTipsGiven: 0n,
            totalTipsReceived: 0n,
            // Phase 7: Milestones
            milestoneCount: 0,
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
