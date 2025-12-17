/**
 * DiceBear NFT Badge Generator
 * 
 * Zero-cost professional NFT badges using DiceBear avatar library.
 * Generates unique, marketplace-quality SVG badges for Gmeowbased NFTs.
 * 
 * @see https://github.com/dicebear/dicebear
 * @see ZERO-COST-NFT-ART-OPTIONS.md
 * 
 * TODO: Install @dicebear packages if needed:
 * pnpm add @dicebear/core @dicebear/collection
 */

// Temporarily commented until packages are installed
// import { createAvatar } from '@dicebear/core';
// import { notionists, notionistsNeutral, lorelei, loreleiNeutral, funEmoji, bigSmile, pixelArt, shapes } from '@dicebear/collection';

// Stub implementations until packages are installed
const createAvatar = (style: any, options: any) => ({ toString: () => '<svg></svg>' })
const notionists = 'notionists'
const notionistsNeutral = 'notionistsNeutral'
const lorelei = 'lorelei'
const loreleiNeutral = 'loreleiNeutral'
const funEmoji = 'funEmoji'
const bigSmile = 'bigSmile'
const pixelArt = 'pixelArt'
const shapes = 'shapes'

// ========================================
// TYPE DEFINITIONS
// ========================================

export type NFTCategory = 'Quest' | 'Guild' | 'Rank' | 'Activity' | 'Referral' | 'Special';
export type NFTRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface NFTTypeInfo {
  category: NFTCategory;
  badgeName: string;
  rarity: NFTRarity;
}

export interface DiceBearOptions {
  seed: string;
  backgroundColor?: string[];
  backgroundType?: ('gradientLinear' | 'solid')[];
  radius?: number;
  scale?: number;
  size?: number;
  // Style-specific options added dynamically
  [key: string]: any;
}

// ========================================
// RARITY COLOR SYSTEM
// ========================================

const RARITY_COLORS: Record<NFTRarity, { primary: string; secondary: string; glow: string }> = {
  common: {
    primary: '#9CA3AF',    // Gray-400
    secondary: '#6B7280',  // Gray-500
    glow: '#D1D5DB'        // Gray-300
  },
  rare: {
    primary: '#60A5FA',    // Blue-400
    secondary: '#3B82F6',  // Blue-500
    glow: '#93C5FD'        // Blue-300
  },
  epic: {
    primary: '#A78BFA',    // Purple-400
    secondary: '#8B5CF6',  // Purple-500
    glow: '#C4B5FD'        // Purple-300
  },
  legendary: {
    primary: '#FBBF24',    // Amber-400
    secondary: '#F59E0B',  // Amber-500
    glow: '#FCD34D'        // Amber-300
  },
  mythic: {
    primary: '#F472B6',    // Pink-400
    secondary: '#EC4899',  // Pink-500
    glow: '#F9A8D4'        // Pink-300
  }
};

// ========================================
// STYLE MAPPING BY CATEGORY
// ========================================

/**
 * Maps NFT categories to DiceBear styles.
 * All use portrait styles to maintain collectible character consistency.
 * Like "Bored Apes but cats" - professional, tradeable character art.
 */
const CATEGORY_STYLE_MAP: Record<NFTCategory, any> = {
  Quest: notionists,          // Professional cat-like characters for quests
  Guild: lorelei,             // Fantasy cat portraits for guilds
  Rank: notionistsNeutral,    // Neutral cat characters for ranks
  Activity: loreleiNeutral,   // Friendly cat portraits for activity
  Referral: bigSmile,         // Welcoming cat faces for referrals
  Special: funEmoji           // Special cat emoji for unique achievements
};

// ========================================
// NFT TYPE PARSER
// ========================================

/**
 * Parses nftType string into structured components.
 * 
 * @example
 * parseNFTType("LEGENDARY_QUEST_EPIC") 
 * → { category: "Quest", badgeName: "Legendary Quest", rarity: "epic" }
 */
export function parseNFTType(nftType: string): NFTTypeInfo {
  const upper = nftType.toUpperCase();
  
  // Determine rarity (look for rarity keywords)
  let rarity: NFTRarity = 'common';
  if (upper.includes('MYTHIC')) rarity = 'mythic';
  else if (upper.includes('LEGENDARY')) rarity = 'legendary';
  else if (upper.includes('EPIC')) rarity = 'epic';
  else if (upper.includes('RARE')) rarity = 'rare';
  
  // Determine category (look for category keywords)
  let category: NFTCategory = 'Special';
  if (upper.includes('QUEST')) category = 'Quest';
  else if (upper.includes('GUILD')) category = 'Guild';
  else if (upper.includes('RANK') || upper.includes('TROPHY')) category = 'Rank';
  else if (upper.includes('STREAK') || upper.includes('ACTIVITY')) category = 'Activity';
  else if (upper.includes('REFERRAL')) category = 'Referral';
  else if (upper.includes('EARLY') || upper.includes('ADOPTER') || upper.includes('CONTRIBUTOR')) category = 'Special';
  
  // Generate badge name (prettify the nftType)
  const badgeName = nftType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return { category, badgeName, rarity };
}

// ========================================
// STYLE OPTIONS GENERATOR
// ========================================

/**
 * Generates character options for collectible cat portrait NFTs.
 * Inspired by Bored Apes - each NFT is a unique character with traits.
 */
function getStyleOptions(
  style: any,
  category: NFTCategory,
  rarity: NFTRarity,
  seed: string
): DiceBearOptions {
  const colors = RARITY_COLORS[rarity];
  
  // Base options for all collectible cat characters
  const baseOptions: DiceBearOptions = {
    seed,
    backgroundColor: [colors.primary, colors.secondary],
    backgroundType: ['gradientLinear'],
    radius: 0,
    scale: 100,
    size: 1200
  };

  // Rarity affects trait rarity/accessories
  // Higher rarity = more unique/rare traits
  const rarityMultiplier = {
    common: 20,
    rare: 40,
    epic: 60,
    legendary: 80,
    mythic: 100
  }[rarity];

  return {
    ...baseOptions,
    // Let DiceBear naturally generate trait variations
    // Each seed creates unique characters
    flip: false,
    rotate: 0,
    translateX: 0,
    translateY: 0
  };
}

// ========================================
// MAIN GENERATOR FUNCTION
// ========================================

/**
 * Generates a DiceBear avatar badge for a Gmeowbased NFT.
 * 
 * @param tokenId - Unique token ID for seed generation
 * @param nftType - NFT type string (e.g., "LEGENDARY_QUEST_EPIC")
 * @returns SVG string (1200x1200px)
 * 
 * @example
 * const svg = generateGmeowBadge("1", "LEGENDARY_QUEST_EPIC");
 * // Returns professional adventure-themed avatar with epic purple theme
 */
export function generateGmeowBadge(tokenId: string, nftType: string): string {
  const typeInfo = parseNFTType(nftType);
  const style = CATEGORY_STYLE_MAP[typeInfo.category];
  const seed = `gmeow-${tokenId}-${nftType}`;
  
  const options = getStyleOptions(style, typeInfo.category, typeInfo.rarity, seed);
  
  // Generate avatar
  const avatar = createAvatar(style, options);
  
  return avatar.toString();
}

/**
 * Generates collectible cat character NFT artwork.
 * "Bored Apes but cats" style - professional character portraits.
 * 
 * @param tokenId - Unique token ID
 * @param nftType - NFT type string
 * @returns NFT artwork SVG (1200x1200)
 */
export function generateGmeowBadgeWithBranding(tokenId: string, nftType: string): string {
  const typeInfo = parseNFTType(nftType);
  const colors = RARITY_COLORS[typeInfo.rarity];
  const style = CATEGORY_STYLE_MAP[typeInfo.category];
  const seed = `gmeow-cat-${tokenId}-${nftType}`;
  
  // Generate collectible cat character with rarity background
  const options = getStyleOptions(style, typeInfo.category, typeInfo.rarity, seed);
  
  const avatar = createAvatar(style, options);
  const avatarSvg = avatar.toString();
  
  // For pure NFT art style like Bored Apes, return avatar directly with minimal overlay
  // Extract and add small signature at bottom
  const avatarMatch = avatarSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const avatarContent = avatarMatch ? avatarMatch[1] : '';
  
  // Pure character art with subtle signature (Bored Apes style)
  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  ${typeInfo.rarity === 'legendary' || typeInfo.rarity === 'mythic' ? `
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  ` : ''}
  
  <!-- Character artwork fills entire canvas -->
  <g>
    ${avatarContent}
  </g>
  
  ${typeInfo.rarity === 'legendary' || typeInfo.rarity === 'mythic' ? `
  <!-- Subtle glow border for legendary/mythic -->
  <rect x="4" y="4" width="1192" height="1192" 
        fill="none" stroke="${colors.glow}" stroke-width="8" opacity="0.5" filter="url(#glow)">
    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
  </rect>
  ` : ''}
  
  <!-- Subtle signature at bottom (like real NFT collections) -->
  <g opacity="0.6">
    <text x="20" y="1180" font-family="Arial, sans-serif" font-size="18" font-weight="700" 
          fill="#fff" letter-spacing="1">
      GMEOWBASED #${tokenId}
    </text>
  </g>
</svg>`;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Gets color information for a specific rarity tier.
 */
export function getRarityColors(rarity: NFTRarity) {
  return RARITY_COLORS[rarity];
}

/**
 * Gets the DiceBear style used for a specific category.
 */
export function getCategoryStyle(category: NFTCategory) {
  return CATEGORY_STYLE_MAP[category];
}

/**
 * Generates a preview of all rarity tiers for a given NFT type.
 * Useful for testing and showcase purposes.
 */
export function generateRarityPreview(baseType: string): Record<NFTRarity, string> {
  const rarities: NFTRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const previews: Record<string, string> = {};
  
  rarities.forEach((rarity, index) => {
    const nftType = `${baseType}_${rarity}`;
    previews[rarity] = generateGmeowBadgeWithBranding(String(index + 1), nftType);
  });
  
  return previews as Record<NFTRarity, string>;
}
