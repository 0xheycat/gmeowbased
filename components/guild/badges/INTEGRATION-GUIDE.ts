/**
 * Badge System Integration Guide
 * 
 * This file demonstrates how to integrate the badge system into existing guild components.
 * 
 * Components created:
 * - BadgeIcon: Single badge display with tooltip
 * - BadgeShowcase: Max 6 badges with overflow counter
 * - BadgeGrid: All badges in grid layout
 * - BadgeCategory: Grouped badge display
 */

// ============================================
// Example 1: GuildMemberList Integration
// ============================================

/*
import { BadgeShowcase } from '@/components/guild/badges'

interface GuildMember {
  address: string
  role: 'owner' | 'officer' | 'member'
  badges?: Badge[]  // Add this field
}

// In the member list component:
<div className="flex items-center justify-between p-4">
  <div className="flex items-center gap-3">
    <Avatar address={member.address} />
    <div>
      <div className="font-semibold">{member.address}</div>
      <BadgeShowcase 
        badges={member.badges || []} 
        maxDisplay={4}
        size="sm"
      />
    </div>
  </div>
  <div>
    {/* Promote/Demote buttons *\/}
  </div>
</div>
*/

// ============================================
// Example 2: Guild Profile Header
// ============================================

/*
import { BadgeCategory } from '@/components/guild/badges'

// Show guild's top achievements in profile header:
<div className="mt-6">
  <h3 className="text-lg font-semibold mb-3">Guild Achievements</h3>
  <BadgeCategory
    title="Featured Badges"
    badges={guild.topAchievements}
    size="lg"
  />
</div>
*/

// ============================================
// Example 3: Member Profile Modal
// ============================================

/*
import { BadgeGrid } from '@/components/guild/badges'

function MemberProfileModal({ member }: { member: GuildMember }) {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.address}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Badges ({member.badges.length})</h4>
            <BadgeGrid 
              badges={member.badges} 
              columns={6}
              size="md"
            />
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Stats</h4>
            {/* Member stats *\/}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
*/

// ============================================
// Example 4: Badge Earning Logic
// ============================================

/*
import { SAMPLE_BADGES } from '@/components/guild/badges'

// When a member performs an action, check if they earn a badge:
async function checkAndAwardBadges(member: GuildMember, action: string) {
  const earnedBadges: Badge[] = []
  
  // Check for streak badges
  if (action === 'daily_login' && member.loginStreak === 7) {
    earnedBadges.push(SAMPLE_BADGES.streak7)
  }
  
  // Check for contribution badges
  if (action === 'points_deposit' && member.totalContributed >= 10000) {
    earnedBadges.push(SAMPLE_BADGES.treasury)
  }
  
  // Check for activity badges
  if (action === 'quest_complete' && member.questsCompleted >= 50) {
    earnedBadges.push(SAMPLE_BADGES.questMaster)
  }
  
  // Save to database
  if (earnedBadges.length > 0) {
    await saveMemberBadges(member.address, earnedBadges)
    
    // Show notification
    pushNotification({
      event: 'badge_minted',
      category: 'badge',
      message: `You earned ${earnedBadges.length} new badge(s)!`,
      duration: 3000,
    })
  }
}
*/

// ============================================
// Example 5: Badge Priority System Usage
// ============================================

/*
// The BadgeShowcase component automatically sorts badges by priority:
// 1. Role badges (Owner > Officer > Member)
// 2. Special badges (Verified, Partner, Supporter)
// 3. Founding badges (Founder, Early Member, First Officer)
// 4. Achievement badges (sorted by rarity)
// 5. Activity badges (sorted by rarity)

// Just pass all badges, the component handles sorting:
<BadgeShowcase badges={allMemberBadges} maxDisplay={6} />
*/

// ============================================
// Example 6: API Response Format
// ============================================

/*
// Update your API to return badges with members:
// GET /api/guild/[guildId]/members

interface MemberWithBadges {
  address: string
  role: 'owner' | 'officer' | 'member'
  joinedAt: string
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    category: 'founder' | 'activity' | 'role' | 'special' | 'achievement'
    earnedAt: string
  }>
}

// Example response:
{
  "members": [
    {
      "address": "0x123...",
      "role": "owner",
      "joinedAt": "2025-01-01T00:00:00Z",
      "badges": [
        {
          "id": "owner",
          "name": "Guild Owner",
          "description": "Owner of this guild",
          "icon": "/badges/role/crown.svg",
          "rarity": "legendary",
          "category": "role",
          "earnedAt": "2025-01-01T00:00:00Z"
        },
        {
          "id": "founder",
          "name": "Guild Founder",
          "description": "Created this guild",
          "icon": "/badges/founder/founder.svg",
          "rarity": "legendary",
          "category": "founder",
          "earnedAt": "2025-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
*/

// ============================================
// Example 7: Supabase Schema
// ============================================

/*
-- Table: guild_member_badges
CREATE TABLE guild_member_badges (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL,
  member_address TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  UNIQUE(guild_id, member_address, badge_id)
);

-- Index for fast lookups
CREATE INDEX idx_member_badges ON guild_member_badges(guild_id, member_address);

-- Query to get member with badges:
SELECT 
  m.address,
  m.role,
  m.joined_at,
  json_agg(
    json_build_object(
      'id', b.badge_id,
      'name', b.metadata->>'name',
      'description', b.metadata->>'description',
      'icon', b.metadata->>'icon',
      'rarity', b.metadata->>'rarity',
      'category', b.metadata->>'category',
      'earnedAt', b.earned_at
    )
  ) as badges
FROM guild_members m
LEFT JOIN guild_member_badges b ON b.guild_id = m.guild_id AND b.member_address = m.address
WHERE m.guild_id = $1
GROUP BY m.address, m.role, m.joined_at;
*/

export {}
