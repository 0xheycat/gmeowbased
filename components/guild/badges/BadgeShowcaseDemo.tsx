'use client'

import { BadgeIcon, type Badge } from './BadgeIcon'
import { BadgeShowcase, BadgeGrid, BadgeCategory } from './BadgeShowcase'
import { useState } from 'react'

/**
 * Sample badge data for testing and showcase
 */
export const SAMPLE_BADGES: Record<string, Badge> = {
  // Founding Badges
  founder: {
    id: 'founder',
    name: 'Guild Founder',
    description: 'Created this guild',
    icon: '/badges/founder/founder.svg',
    rarity: 'legendary',
    category: 'founder',
    animated: true,
  },
  earlyMember: {
    id: 'early_member',
    name: 'Early Member',
    description: 'One of the first 50 members',
    icon: '/badges/founder/early-member.svg',
    rarity: 'epic',
    category: 'founder',
  },
  firstOfficer: {
    id: 'first_officer',
    name: 'First Officer',
    description: 'First member promoted to officer',
    icon: '/badges/founder/first-officer.svg',
    rarity: 'rare',
    category: 'founder',
  },

  // Activity Badges
  streak7: {
    id: 'streak_7',
    name: '7 Day Streak',
    description: 'Active for 7 consecutive days',
    icon: '/badges/activity/streak-7.svg',
    rarity: 'common',
    category: 'activity',
  },
  streak30: {
    id: 'streak_30',
    name: '30 Day Streak',
    description: 'Active for 30 consecutive days',
    icon: '/badges/activity/streak-30.svg',
    rarity: 'rare',
    category: 'activity',
  },
  topContributor: {
    id: 'top_contributor',
    name: 'Top Contributor',
    description: 'Top 10% points contributor',
    icon: '/badges/activity/top-contributor.svg',
    rarity: 'epic',
    category: 'activity',
  },
  questMaster: {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Completed 50+ quests',
    icon: '/badges/activity/quest-master.svg',
    rarity: 'rare',
    category: 'activity',
  },

  // Role Badges
  owner: {
    id: 'owner',
    name: 'Guild Owner',
    description: 'Owner of this guild',
    icon: '/badges/role/crown.svg',
    rarity: 'legendary',
    category: 'role',
    animated: true,
  },
  officer: {
    id: 'officer',
    name: 'Officer',
    description: 'Guild officer with elevated permissions',
    icon: '/badges/role/shield.svg',
    rarity: 'rare',
    category: 'role',
  },
  member: {
    id: 'member',
    name: 'Member',
    description: 'Active guild member',
    icon: '/badges/role/star.svg',
    rarity: 'common',
    category: 'role',
  },

  // Special Badges
  verified: {
    id: 'verified',
    name: 'Verified',
    description: 'Officially verified guild',
    icon: '/badges/special/verified.svg',
    rarity: 'epic',
    category: 'special',
  },
  partner: {
    id: 'partner',
    name: 'Partner',
    description: 'Official platform partner',
    icon: '/badges/special/partner.svg',
    rarity: 'legendary',
    category: 'special',
  },
  supporter: {
    id: 'supporter',
    name: 'Supporter',
    description: 'Donated $100+ equivalent',
    icon: '/badges/special/supporter.svg',
    rarity: 'epic',
    category: 'special',
  },

  // Achievement Badges
  treasury: {
    id: 'treasury_guardian',
    name: 'Treasury Guardian',
    description: 'Deposited 10,000+ points',
    icon: '/badges/achievement/treasury.svg',
    rarity: 'rare',
    category: 'achievement',
  },
  recruiter: {
    id: 'recruiter',
    name: 'Recruiter',
    description: 'Successfully invited 10+ members',
    icon: '/badges/achievement/recruiter.svg',
    rarity: 'rare',
    category: 'achievement',
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    description: 'Member for 365+ days',
    icon: '/badges/achievement/veteran.svg',
    rarity: 'epic',
    category: 'achievement',
  },
}

/**
 * Badge Showcase Component
 * 
 * Displays all badge variants for testing and demonstration.
 * Shows size variants, rarity levels, and hover effects.
 */
export function BadgeShowcaseDemo() {
  const [showAllBadges, setShowAllBadges] = useState(false)
  
  // Sample member with multiple badges
  const memberBadges = [
    SAMPLE_BADGES.owner,
    SAMPLE_BADGES.verified,
    SAMPLE_BADGES.founder,
    SAMPLE_BADGES.topContributor,
    SAMPLE_BADGES.veteran,
    SAMPLE_BADGES.treasury,
    SAMPLE_BADGES.recruiter,
    SAMPLE_BADGES.streak30,
    SAMPLE_BADGES.questMaster,
    SAMPLE_BADGES.supporter,
  ]
  
  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Badge System Showcase</h1>
        <p className="text-gray-400 mb-8">
          Professional badge system with tooltips, size variants, rarity colors, and animations
        </p>

        {/* BadgeShowcase Component Demo */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">BadgeShowcase Component (Member Profile)</h2>
          <div className="p-6 bg-slate-900 rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full"></div>
              <div>
                <h3 className="text-white font-semibold">Guild Master</h3>
                <div className="flex items-center gap-2 mt-1">
                  <BadgeShowcase
                    badges={memberBadges}
                    maxDisplay={6}
                    size="sm"
                    onShowAll={() => setShowAllBadges(!showAllBadges)}
                  />
                </div>
              </div>
            </div>
            
            {showAllBadges && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="text-white font-semibold mb-3">All Badges ({memberBadges.length})</h4>
                <BadgeGrid badges={memberBadges} columns={6} size="md" />
              </div>
            )}
          </div>
        </section>

        {/* Size Variants */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Size Variants</h2>
          <div className="flex items-center gap-8 p-6 bg-slate-900 rounded-lg">
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.founder} size="sm" />
              <p className="text-xs text-gray-400 mt-2">Small (16px)</p>
            </div>
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.founder} size="md" />
              <p className="text-xs text-gray-400 mt-2">Medium (24px)</p>
            </div>
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.founder} size="lg" />
              <p className="text-xs text-gray-400 mt-2">Large (32px)</p>
            </div>
          </div>
        </section>

        {/* Rarity Levels */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Rarity Levels</h2>
          <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-lg">
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.member} size="lg" />
              <p className="text-xs text-gray-400 mt-2">Common</p>
            </div>
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.streak30} size="lg" />
              <p className="text-xs text-gray-400 mt-2">Rare</p>
            </div>
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.verified} size="lg" />
              <p className="text-xs text-gray-400 mt-2">Epic</p>
            </div>
            <div className="text-center">
              <BadgeIcon badge={SAMPLE_BADGES.founder} size="lg" showGlow />
              <p className="text-xs text-gray-400 mt-2">Legendary</p>
            </div>
          </div>
        </section>

        {/* Badge Categories with BadgeCategory Component */}
        <section className="mb-12 space-y-8">
          <h2 className="text-xl font-bold text-white mb-4">All Badge Categories (BadgeCategory Component)</h2>
          
          <div className="p-6 bg-slate-900 rounded-lg space-y-8">
            <BadgeCategory
              title="Founding Badges"
              description="Limited edition badges for early supporters"
              badges={[SAMPLE_BADGES.founder, SAMPLE_BADGES.earlyMember, SAMPLE_BADGES.firstOfficer]}
              size="lg"
            />
            
            <BadgeCategory
              title="Activity Badges"
              description="Earned through consistent participation"
              badges={[SAMPLE_BADGES.streak7, SAMPLE_BADGES.streak30, SAMPLE_BADGES.topContributor, SAMPLE_BADGES.questMaster]}
              size="lg"
            />
            
            <BadgeCategory
              title="Role Badges"
              description="Official guild positions"
              badges={[SAMPLE_BADGES.owner, SAMPLE_BADGES.officer, SAMPLE_BADGES.member]}
              size="lg"
            />
            
            <BadgeCategory
              title="Special Badges"
              description="Exclusive recognition badges"
              badges={[SAMPLE_BADGES.verified, SAMPLE_BADGES.partner, SAMPLE_BADGES.supporter]}
              size="lg"
            />
            
            <BadgeCategory
              title="Achievement Badges"
              description="Milestone accomplishments"
              badges={[SAMPLE_BADGES.treasury, SAMPLE_BADGES.recruiter, SAMPLE_BADGES.veteran]}
              size="lg"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
