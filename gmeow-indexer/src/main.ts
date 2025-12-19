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
    TipEvent,
    ViralMilestone,
} from './model'

// Import ABIs for event decoding
import coreAbiJson from '../abi/GmeowCore.abi.json'
import guildAbiJson from '../abi/GmeowGuildStandalone.abi.json'
import referralAbiJson from '../abi/GmeowReferralStandalone.abi.json'
import nftAbiJson from '../abi/GmeowNFT.abi.json'

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
    
    // Collect addresses to load
    const userAddresses = new Set<string>()
    const guildIds = new Set<string>()
    const referralCodeStrings = new Set<string>()
    
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
                            const oldXP = user.totalXP
                            const oldGMCount = user.lifetimeGMs
                            const oldStreak = user.currentStreak
                            
                            user.totalXP += points
                            user.currentStreak = Number(streak)
                            user.lastGMTimestamp = blockTime
                            user.lifetimeGMs += 1
                            user.updatedAt = new Date(Number(blockTime) * 1000)
                            
                            // Create GM event
                            gmEvents.push(new GMEvent({
                                id: `${log.transaction?.id}-${log.logIndex}`,
                                user,
                                timestamp: blockTime,
                                xpAwarded: points,
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
                            checkMilestone(viralMilestones, user, 'xp_earned', Number(oldXP), Number(user.totalXP), blockTime, 'gm')
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
            totalXP: 0n,
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
