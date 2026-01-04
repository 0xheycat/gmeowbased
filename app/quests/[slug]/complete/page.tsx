/**
 * Professional Quest Completion Page
 * Phase 2.7: Quest Page Rebuild
 * 
 * Path: /quests/[slug]/complete
 * Template: gmeowbased0.6 + Framer Motion animations
 * Features: Celebration animation, reward display, share to Farcaster
 */

import QuestCompleteClient from '@/components/quests/QuestCompleteClient';

interface QuestCompletePageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    xp?: string;
    points?: string;
    token?: string;
    nft?: string;
  }>
}

export default async function QuestCompletePage({ params, searchParams }: QuestCompletePageProps) {
  // Await params and searchParams (Next.js 15 requirement)
  const { slug } = await params;
  const search = await searchParams;
  
  // Get rewards from URL params first
  let xpReward = parseInt(search.xp || '0');
  let pointsReward = parseInt(search.points || '0');
  
  // If no rewards in URL, fetch from API and calculate XP
  if (!xpReward && !pointsReward) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quests/${slug}`);
      if (response.ok) {
        const data = await response.json();
        // Points from quest definition (onchain spendable)
        pointsReward = data.data?.reward_points_awarded || 0;
        
        // XP calculated from quest category (offline metric)
        const category = data.data?.category || 'custom';
        const XP_MULTIPLIERS: Record<string, number> = {
          social: 1.0,
          onchain: 1.5,
          creative: 1.2,
          learn: 1.0,
          hybrid: 2.0,
          custom: 1.0,
        };
        const multiplier = XP_MULTIPLIERS[category] || 1.0;
        xpReward = Math.floor(pointsReward * multiplier);
      }
    } catch (error) {
      console.error('Failed to fetch quest rewards:', error);
    }
  }
  
  const tokenReward = search.token ? parseFloat(search.token) : 0;
  const hasNftReward = search.nft === 'true';
  
  return (
    <QuestCompleteClient
      questId={slug}
      xpReward={xpReward}
      pointsReward={pointsReward}
      tokenReward={tokenReward}
      hasNftReward={hasNftReward}
    />
  );
}
