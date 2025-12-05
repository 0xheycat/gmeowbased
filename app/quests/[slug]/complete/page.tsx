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
    token?: string;
    nft?: string;
  }>;
}

export default async function QuestCompletePage({ params, searchParams }: QuestCompletePageProps) {
  // Await params and searchParams (Next.js 15 requirement)
  const { slug } = await params;
  const search = await searchParams;
  
  const xpReward = parseInt(search.xp || '0');
  const tokenReward = search.token ? parseFloat(search.token) : 0;
  const hasNftReward = search.nft === 'true';
  
  return (
    <QuestCompleteClient
      questId={slug}
      xpReward={xpReward}
      tokenReward={tokenReward}
      hasNftReward={hasNftReward}
    />
  );
}
