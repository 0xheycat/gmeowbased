/**
 * Frame Compose Text Generator
 * Generates rich share text for Farcaster frame composer
 */

export interface ComposeTextContext {
  title?: string
  chain?: string
  username?: string
  streak?: number
  gmCount?: number
  level?: number
  tier?: string
  xp?: number
  badgeCount?: number
  progress?: number
  reward?: number
}

/**
 * Generate rich compose text for frame sharing based on frame type
 * Used in fc:frame:text meta tag for pre-filled cast composer
 */
export function getComposeText(frameType?: string, context?: ComposeTextContext): string {
  const { title, chain, username, streak, gmCount, level, tier, xp, badgeCount, progress, reward } = context || {}
  
  // Helper: Format XP for share text (K/M notation)
  const formatXpForShare = (xpValue: number): string => {
    if (xpValue >= 1_000_000) return `${(xpValue / 1_000_000).toFixed(1)}M`
    if (xpValue >= 10_000) return `${(xpValue / 1000).toFixed(1)}K`
    return xpValue.toLocaleString()
  }
  
  // Helper: Get chain emoji
  const getChainEmoji = (chainName: string): string => {
    const chains: Record<string, string> = {
      base: '🔵', ethereum: '⟠', optimism: '🔴',
      arbitrum: '🔷', polygon: '🟣', avalanche: '🔺',
      celo: '🌿', bnb: '🟡', avax: '🔺'
    }
    return chains[chainName.toLowerCase()] || '🌐'
  }
  
  switch (frameType) {
    case 'gm': {
      const hour = new Date().getHours()
      let timeEmoji = '🌅'
      let timeGreeting = 'GM'
      
      if (hour >= 5 && hour < 12) {
        timeEmoji = '☀️'
        timeGreeting = 'Good morning'
      } else if (hour >= 12 && hour < 17) {
        timeEmoji = '🌤️'
        timeGreeting = 'Good afternoon'
      } else if (hour >= 17 && hour < 21) {
        timeEmoji = '🌆'
        timeGreeting = 'Good evening'
      } else {
        timeEmoji = '🌙'
        timeGreeting = 'Good night'
      }
      
      // Elite tier: 30+ streak + Level 20+ + Mythic/Star Captain
      if (streak && streak >= 30 && level && level >= 20 && tier && (tier.includes('Mythic') || tier.includes('Star Captain'))) {
        return `${timeEmoji} ${timeGreeting}! 🔥 ${streak}-day streak + Lvl ${level} ${tier}! Unstoppable @gmeowbased`
      }
      
      // Mythic tier unlock
      if (tier && tier.includes('Mythic')) {
        return `${timeEmoji} ${timeGreeting}! 👑 Mythic GM unlocked! ${gmCount || 0} GMs • Join the elite @gmeowbased`
      }
      
      // Great tier: 30+ day streak
      if (streak && streak >= 30) {
        const levelSuffix = level && level >= 10 ? ` • Lvl ${level}` : ''
        return `${timeEmoji} ${timeGreeting}! 🔥 ${streak}-day streak${levelSuffix}! Legendary dedication @gmeowbased`
      }
      
      // Good tier: 7+ day streak
      if (streak && streak >= 7) {
        const levelSuffix = level && level >= 5 ? ` • Lvl ${level}` : ''
        return `${timeEmoji} ${timeGreeting}! ⚡ ${streak}-day streak${levelSuffix}! Hot streak @gmeowbased`
      }
      
      // High count with level
      if (gmCount && gmCount > 100 && level && level >= 10) {
        return `${timeEmoji} ${timeGreeting}! 🌅 ${gmCount} GMs • Lvl ${level}! Join the ritual @gmeowbased`
      }
      
      // High count only
      if (gmCount && gmCount > 100) {
        return `${timeEmoji} ${timeGreeting}! 🌅 ${gmCount} GMs and counting! Join the ritual @gmeowbased`
      }
      
      // Default with level
      if (level && level >= 5) {
        return `${timeEmoji} ${timeGreeting}! Just stacked my daily GM • Lvl ${level}! Join @gmeowbased`
      }
      
      return `${timeEmoji} ${timeGreeting}! Just stacked my daily GM ritual! Join the meow squad @gmeowbased`
    }
    
    case 'quest': {
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      const chainPrefix = chain ? `${chainEmoji} ` : ''
      
      // High progress (80%+)
      if (progress && progress >= 80) {
        const xpSuffix = reward ? ` • +${reward} XP` : ''
        return `⚔️ Almost done with "${title}"! ${progress}% complete${xpSuffix} ${chainPrefix}@gmeowbased`
      }
      
      // With XP reward
      if (reward && reward > 0) {
        return `⚔️ Quest active: "${title || 'Check it out'}" • Earn +${reward} XP ${chainPrefix}@gmeowbased`
      }
      
      // With chain context
      if (chain) {
        return `⚔️ New quest unlocked ${chainPrefix}on ${chain}! ${title || 'Check it out'} @gmeowbased`
      }
      
      return `⚔️ New quest unlocked! ${title || 'Check it out'} @gmeowbased`
    }
    
    case 'badge': {
      // High badge count (15+) with XP
      if (badgeCount && badgeCount >= 15 && xp && xp > 0) {
        return `🏆 ${badgeCount} badges collected! +${formatXpForShare(xp)} total XP earned! Badge hunter @gmeowbased`
      }
      
      // High badge count (10+)
      if (badgeCount && badgeCount >= 10) {
        const xpSuffix = xp && xp > 0 ? ` • +${formatXpForShare(xp)} XP` : ''
        return `🏆 ${badgeCount} badges collected${xpSuffix}! Badge master @gmeowbased`
      }
      
      // Medium badge count (5+)
      if (badgeCount && badgeCount >= 5) {
        return `🎖️ ${badgeCount} badges earned${username ? ` by @${username}` : ''}! Growing collection @gmeowbased`
      }
      
      // With XP earned
      if (xp && xp > 0) {
        return `🎖️ New badge unlocked! +${formatXpForShare(xp)} XP earned${username ? ` by @${username}` : ''} @gmeowbased`
      }
      
      return `🎖️ New badge earned${username ? ` by @${username}` : ''}! View the collection @gmeowbased`
    }
    
    case 'points': {
      // Elite tier (Mythic/Star Captain, Level 20+)
      if (tier && (tier.includes('Mythic') || tier.includes('Star Captain')) && level && level >= 20) {
        const xpText = xp ? `${formatXpForShare(xp)} XP` : `Lvl ${level}`
        return `🎯 ${tier} status! ${xpText} earned${username ? ` by @${username}` : ''} • Elite player @gmeowbased`
      }
      
      // High level (15+) with tier
      if (level && level >= 15 && tier) {
        const xpText = xp ? ` • ${formatXpForShare(xp)} XP` : ''
        return `🎯 Lvl ${level} ${tier}${xpText}${username ? ` by @${username}` : ''}! Climbing the ranks @gmeowbased`
      }
      
      // Level milestone (divisible by 5)
      if (level && level >= 10 && level % 5 === 0) {
        return `🎯 Level ${level} milestone${username ? ` by @${username}` : ''}! Keep grinding @gmeowbased`
      }
      
      // With level
      if (level && level >= 5) {
        return `💰 Lvl ${level} Points${username ? ` by @${username}` : ''}! Check my balance @gmeowbased`
      }
      
      return `💰 Check out ${username ? `@${username}'s` : 'my'} gmeowbased Points balance @gmeowbased`
    }
    
    case 'onchainstats': {
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      
      // With level badge
      if (level && level >= 10) {
        const chainSuffix = chain ? ` ${chainEmoji} on ${chain}` : ''
        return `📊 Lvl ${level} onchain stats${chainSuffix}${username ? ` by @${username}` : ''}! View profile @gmeowbased`
      }
      
      // With chain context
      if (chain) {
        return `📊 Flexing onchain stats ${chainEmoji} on ${chain}${username ? ` by @${username}` : ''}! @gmeowbased`
      }
      
      return `📊 Flexing onchain stats${username ? ` by @${username}` : ''}! View my profile @gmeowbased`
    }
    
    case 'leaderboards': {
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      const chainSuffix = chain ? ` ${chainEmoji} on ${chain}` : ''
      
      return `🏆 Climbing the ranks${chainSuffix}! Check the leaderboard @gmeowbased`
    }
    
    case 'guild':
      return '🛡️ Guild quests are live! Rally your squad @gmeowbased'
    
    case 'referral':
      return '🎁 Join me on gmeowbased! Share quests, earn rewards together @gmeowbased'
    
    case 'verify':
      return '✅ Verify your quests and unlock rewards @gmeowbased'
    
    default:
      return '🎮 Explore quests, guilds, and onchain adventures @gmeowbased'
  }
}
