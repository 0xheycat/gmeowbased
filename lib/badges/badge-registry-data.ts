/**
 * Badge Registry Data
 * 
 * Embedded badge registry for production deployment.
 * This avoids filesystem reads which fail in Vercel's /var/task/ environment.
 * 
 * Source: planning/badge/badge-registry.json
 * Last Updated: 2025-11-19
 */

import type { BadgeRegistry } from './badges'

export const BADGE_REGISTRY: BadgeRegistry = {
  "version": "1.0.0",
  "lastUpdated": "2025-11-15T00:00:00Z",
  "description": "Complete badge registry for Gmeowbased platform with tier-based Neynar scoring system",
  "tiers": {
    "common": {
      "name": "Common",
      "color": "#D3D7DC",
      "scoreRange": { "min": 0, "max": 0.3 },
      "pointsBonus": 0,
      "bgGradient": "from-gray-900/20 via-slate-800/15 to-gray-900/20"
    },
    "rare": {
      "name": "Rare",
      "color": "#A18CFF",
      "scoreRange": { "min": 0.3, "max": 0.5 },
      "pointsBonus": 100,
      "bgGradient": "from-indigo-900/20 via-purple-800/15 to-indigo-900/20"
    },
    "epic": {
      "name": "Epic",
      "color": "#61DFFF",
      "scoreRange": { "min": 0.5, "max": 0.8 },
      "pointsBonus": 200,
      "bgGradient": "from-cyan-900/20 via-blue-800/15 to-cyan-900/20"
    },
    "legendary": {
      "name": "Legendary",
      "color": "#FFD966",
      "scoreRange": { "min": 0.8, "max": 1.0 },
      "pointsBonus": 400,
      "bgGradient": "from-yellow-900/20 via-amber-800/15 to-yellow-900/20"
    },
    "mythic": {
      "name": "Mythic",
      "color": "#9C27FF",
      "scoreRange": { "min": 1.0, "max": 999 },
      "pointsBonus": 1000,
      "bgGradient": "from-purple-900/20 via-violet-800/15 to-purple-900/20"
    }
  },
  "badges": [
    {
      "id": "neon-initiate",
      "name": "Neon Initiate",
      "slug": "neon-initiate",
      "badgeType": "neon_initiate",
      "tier": "common",
      "description": "The official welcome token for travelers who complete the GMEOW HQ onboarding ritual and light their first GM.",
      "chain": "base",
      "contractAddress": "0x0000000000000000000000000000000000000000",
      "pointsCost": 240,
      "imageUrl": "/badges/neon-initiate-square.png",
      "artPath": "badge/neon-initiate-square.png",
      "active": true,
      "autoAssign": true,
      "assignmentRule": "onboarding_complete",
      "metadata": {
        "tier": "common",
        "season": "Onboarding",
        "rarity": "common",
        "rarityLabel": "Common",
        "supplyCap": null,
        "lore": "Every cosmic journey starts with a single neon pawprint.",
        "externalUrl": "https://gmeowhq.art/badges/neon-initiate",
        "image": "/badges/neon-initiate.png",
        "frame": {
          "palette": {
            "primary": "#D3D7DC",
            "secondary": "#8B9099",
            "background": "#1a1a1a",
            "accent": "#FFFFFF"
          },
          "imageCrop": {
            "width": 800,
            "height": 800,
            "x": 0,
            "y": 0
          }
        },
        "unlockCriteria": [
          "Finish the cinematic intro",
          "Verify a Neynar profile",
          "Send the first GM cast from GMEOW HQ"
        ],
        "onchainNotes": "Free mint on Base with optional soulbound enforcement once onboarding completes.",
        "supabaseNotes": "Use as the default seed template with metadata tracking onboarding step completion.",
        "attributes": [
          { "trait_type": "Quest", "value": "Intro Complete" },
          { "trait_type": "Identity", "value": "Neynar Verified" },
          { "trait_type": "Tier", "value": "Common" }
        ]
      }
    },
    {
      "id": "pulse-runner",
      "name": "Pulse Runner",
      "slug": "pulse-runner",
      "badgeType": "pulse_runner",
      "tier": "rare",
      "description": "Honors community catalysts sprinting between GMEOW HQ quests, frames, and guild vaults to keep momentum alive.",
      "chain": "ink",
      "contractAddress": "0x0000000000000000000000000000000000000000",
      "pointsCost": 280,
      "imageUrl": "/badges/pulse-runner-square.png",
      "artPath": "badge/pulse-runner-square.png",
      "active": true,
      "autoAssign": true,
      "assignmentRule": "neynar_score_tier",
      "metadata": {
        "tier": "rare",
        "season": "Cadence",
        "rarity": "rare",
        "rarityLabel": "Rare",
        "guildContributions": 2,
        "supplyCap": 10000,
        "lore": "Pulse Runners sprint between decks to ensure every signal gets answered.",
        "externalUrl": "https://gmeowhq.art/badges/pulse-runner",
        "image": "/badges/pulse-runner.png",
        "frame": {
          "palette": {
            "primary": "#A18CFF",
            "secondary": "#7B5FD3",
            "background": "#1a0f2e",
            "accent": "#D4B5FF"
          },
          "imageCrop": {
            "width": 800,
            "height": 800,
            "x": 0,
            "y": 0
          }
        },
        "unlockCriteria": [
          "Complete five weekly quests",
          "Contribute to two guild vaults",
          "Host a frame engagement streak",
          "Neynar score: 0.3 - 0.5"
        ],
        "onchainNotes": "Experiment with Ink for minting while keeping community alignment metadata prominently flagged.",
        "supabaseNotes": "Record metadata.guildContributions = 2 and log frame streak references for dashboards.",
        "attributes": [
          { "trait_type": "Quests", "value": "5 Weekly Clears" },
          { "trait_type": "Frames", "value": "Engagement Streak" },
          { "trait_type": "Tier", "value": "Rare" },
          { "trait_type": "Score Range", "value": "0.3 - 0.5" }
        ]
      }
    },
    {
      "id": "signal-luminary",
      "name": "Signal Luminary",
      "slug": "signal-luminary",
      "badgeType": "signal_luminary",
      "tier": "epic",
      "description": "Reserved for broadcast specialists who keep GMEOW HQ signals bright, accurate, and always on tempo.",
      "chain": "unichain",
      "contractAddress": "0x0000000000000000000000000000000000000000",
      "pointsCost": 360,
      "imageUrl": "/badges/signal-luminary-square.png",
      "artPath": "badge/signal-luminary-square.png",
      "active": true,
      "autoAssign": true,
      "assignmentRule": "neynar_score_tier",
      "metadata": {
        "tier": "epic",
        "season": "Signal",
        "rarity": "epic",
        "rarityLabel": "Epic",
        "streakRequirement": 14,
        "telemetry": true,
        "supplyCap": 5000,
        "lore": "Luminaries tune every frequency until the deck glows with synchronized optimism.",
        "externalUrl": "https://gmeowhq.art/badges/signal-luminary",
        "image": "/badges/signal-luminary.png",
        "frame": {
          "palette": {
            "primary": "#61DFFF",
            "secondary": "#3AB8E0",
            "background": "#0a1a2e",
            "accent": "#A8EDFF"
          },
          "imageCrop": {
            "width": 800,
            "height": 800,
            "x": 0,
            "y": 0
          }
        },
        "unlockCriteria": [
          "Maintain a 14-day GM streak",
          "Refresh the admin analytics dashboard 10 times without failure",
          "Trigger 50 or more tip events",
          "Neynar score: 0.5 - 0.8"
        ],
        "onchainNotes": "Batch mint on Unichain and mirror streak telemetry through the HQ analytics rail.",
        "supabaseNotes": "Include metadata.streakRequirement = 14 and metadata.telemetry = true for filtering.",
        "attributes": [
          { "trait_type": "Frequency", "value": "14-Day Streak" },
          { "trait_type": "Output", "value": "50+ Tips Routed" },
          { "trait_type": "Tier", "value": "Epic" },
          { "trait_type": "Score Range", "value": "0.5 - 0.8" }
        ]
      }
    },
    {
      "id": "warp-navigator",
      "name": "Warp Navigator",
      "slug": "warp-navigator",
      "badgeType": "warp_navigator",
      "tier": "legendary",
      "description": "Issued to cross-chain tacticians who route missions between every GMEOW HQ sector without losing sync.",
      "chain": "op",
      "contractAddress": "0x0000000000000000000000000000000000000000",
      "pointsCost": 420,
      "imageUrl": "/badges/warp-navigator-square.png",
      "artPath": "badge/warp-navigator-square.png",
      "active": true,
      "autoAssign": true,
      "assignmentRule": "neynar_score_tier",
      "metadata": {
        "tier": "legendary",
        "season": "Voyagers",
        "rarity": "legendary",
        "rarityLabel": "Legendary",
        "questsRequired": 3,
        "supplyCap": 2500,
        "lore": "When the deck needs to be everywhere at once, Navigators braid warp threads into a single pulse.",
        "externalUrl": "https://gmeowhq.art/badges/warp-navigator",
        "image": "/badges/warp-navigator.png",
        "frame": {
          "palette": {
            "primary": "#FFD966",
            "secondary": "#D4AF37",
            "background": "#1a1410",
            "accent": "#FFF7D6"
          },
          "imageCrop": {
            "width": 800,
            "height": 800,
            "x": 0,
            "y": 0
          }
        },
        "unlockCriteria": [
          "Complete three cross-chain quests in a season",
          "Sync the guild treasury across Base, Optimism, and Celo",
          "Dispatch two automation scripts without failure",
          "Neynar score: 0.8 - 1.0"
        ],
        "onchainNotes": "Use a multi-chain token URI that resolves back to GMEOW HQ and log mission progress off-chain.",
        "supabaseNotes": "Attach metadata.questsRequired = 3 and store automation run IDs for auditing.",
        "attributes": [
          { "trait_type": "Discipline", "value": "Cross-chain Mastery" },
          { "trait_type": "Loadout", "value": "Guild Sync Beacon" },
          { "trait_type": "Tier", "value": "Legendary" },
          { "trait_type": "Score Range", "value": "0.8 - 1.0" }
        ]
      }
    },
    {
      "id": "gmeow-vanguard",
      "name": "Gmeow Vanguard",
      "slug": "gmeow-vanguard",
      "badgeType": "gmeow_vanguard",
      "tier": "mythic",
      "description": "Flagship insignia for the original operators who stabilized the GMEOW HQ command deck during launch.",
      "chain": "base",
      "contractAddress": "0x0000000000000000000000000000000000000000",
      "pointsCost": 500,
      "imageUrl": "/badges/gmeow-vanguard-square.png",
      "artPath": "badge/gmeow-vanguard-square.png",
      "active": true,
      "autoAssign": true,
      "assignmentRule": "neynar_score_tier",
      "metadata": {
        "tier": "mythic",
        "season": "Founders",
        "rarity": "mythic",
        "rarityLabel": "Mythic",
        "supplyCap": 500,
        "lore": "Forged in neon stardust during the first GM transmissions across Base orbit.",
        "externalUrl": "https://gmeowhq.art/badges/gmeow-vanguard",
        "image": "/badges/gmeow-vanguard.png",
        "frame": {
          "palette": {
            "primary": "#9C27FF",
            "secondary": "#7B1DD9",
            "background": "#0f0322",
            "accent": "#D89EFF"
          },
          "imageCrop": {
            "width": 800,
            "height": 800,
            "x": 0,
            "y": 0
          }
        },
        "unlockCriteria": [
          "Lead 5 verified GM streak rallies",
          "Complete the launch day quest arc",
          "Broadcast a GMEOW frame cast",
          "Neynar score: ≥ 1.0"
        ],
        "onchainNotes": "Mint on Base to keep deployment costs low and enforce the supply cap with a contract guard.",
        "supabaseNotes": "Set metadata.supplyCap = 500 and require manual review before toggling active = true.",
        "attributes": [
          { "trait_type": "Spirit", "value": "Relentless Optimism" },
          { "trait_type": "Alignment", "value": "Command Deck" },
          { "trait_type": "Aura", "value": "Hyper-neon Teal Pulse" },
          { "trait_type": "Tier", "value": "Mythic" },
          { "trait_type": "Score Range", "value": "≥ 1.0" }
        ]
      }
    }
  ]
}
