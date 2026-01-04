/**
 * Quest Completion Client Component
 * Handles client-side animations and interactions
 * 
 * Updated: December 31, 2025 - Added on-chain claiming support
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShareIcon from '@mui/icons-material/Share';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { QuestClaimButton } from './QuestClaimButton';
import { useAuthContext } from '@/lib/contexts/AuthContext';
import type { QuestClaimSignature } from '@/lib/quests/oracle-signature';

interface QuestCompleteClientProps {
  questId: string;
  xpReward: number;
  tokenReward: number;
  hasNftReward: boolean;
  pointsReward?: number; // Points are separate from XP
}

export default function QuestCompleteClient({
  questId,
  xpReward,
  tokenReward,
  hasNftReward,
  pointsReward = 0,
}: QuestCompleteClientProps) {
  const router = useRouter();
  const { fid: userFid } = useAuthContext();
  const [showConfetti, setShowConfetti] = useState(true);
  const [claimSignature, setClaimSignature] = useState<QuestClaimSignature | null>(null);
  const [questTitle, setQuestTitle] = useState<string>('');
  const [numericQuestId, setNumericQuestId] = useState<number | null>(null);
  
  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch quest completion data to get claim signature
  useEffect(() => {
    if (!userFid) return;
    
    async function fetchClaimSignature() {
      try {
        const response = await fetch(`/api/quests/unclaimed?fid=${userFid}`);
        if (!response.ok) return;
        
        const data = await response.json();
        const unclaimedQuest = data.unclaimed_quests?.find(
          (q: any) => q.unified_quests?.slug === questId || q.unified_quests?.id.toString() === questId
        );
        
        if (unclaimedQuest && unclaimedQuest.claim_signature) {
          setClaimSignature(unclaimedQuest.claim_signature);
          setQuestTitle(unclaimedQuest.unified_quests?.title || '');
          setNumericQuestId(unclaimedQuest.quest_id);
        }
      } catch (error) {
        console.error('Failed to fetch claim signature:', error);
      }
    }
    
    fetchClaimSignature();
  }, [questId, userFid]);
  
  const handleShare = () => {
    const rewards = [];
    if (xpReward > 0) rewards.push(`${xpReward} XP`);
    if (pointsReward > 0) rewards.push(`${pointsReward} Points`);
    const rewardText = rewards.join(' and ');
    
    const text = `Just completed a quest on @gmeowbased and earned ${rewardText}! ${
      hasNftReward ? 'Plus an exclusive NFT badge!' : ''
    }\n\nJoin the Base community quest: https://gmeowhq.art/quests/{slug}`;
    
    // Open Farcaster compose
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
    window.open(warpcastUrl, '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-gray-200 dark:from-gray-900 dark:via-slate-900 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Animated Background Particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              initial={{
                top: '50%',
                left: '50%',
                scale: 0,
                opacity: 1,
              }}
              animate={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
      
      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-2xl w-full"
      >
        {/* Trophy Icon */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 0.5,
                delay: 0.5,
                repeat: 2,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 96 }} className="text-yellow-400" />
            </motion.div>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0 bg-yellow-400 blur-xl rounded-full -z-10"
            />
          </div>
        </motion.div>
        
        {/* Completion Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 drop-shadow-md">
            Quest Complete!
          </h1>
          <p className="text-xl text-gray-800 dark:text-gray-100 font-semibold">
            Amazing work! You've earned incredible rewards.
          </p>
        </motion.div>
        
        {/* Rewards Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* XP Reward */}
          {xpReward > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-amber-100 to-yellow-200 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 backdrop-blur-md rounded-2xl p-6 border-2 border-amber-300 dark:border-yellow-700 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <EmojiEventsIcon className="w-6 h-6 text-amber-700 dark:text-yellow-300" />
                <span className="text-sm text-gray-900 dark:text-white font-bold">XP Earned</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                +{xpReward.toLocaleString()}
              </div>
            </motion.div>
          )}
          
          {/* Points Reward */}
          {pointsReward > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="bg-gradient-to-br from-blue-100 to-cyan-200 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 backdrop-blur-md rounded-2xl p-6 border-2 border-blue-300 dark:border-blue-700 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <AutoAwesomeIcon className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                <span className="text-sm text-gray-900 dark:text-white font-bold">Points</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                +{pointsReward.toLocaleString()}
              </div>
            </motion.div>
          )}
          
          {/* Token Reward */}
          {tokenReward > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-green-100 to-emerald-200 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 backdrop-blur-md rounded-2xl p-6 border-2 border-green-300 dark:border-green-700 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <AutoAwesomeIcon className="w-6 h-6 text-green-700 dark:text-green-300" />
                <span className="text-sm text-gray-900 dark:text-white font-bold">Tokens</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                +{tokenReward}
              </div>
            </motion.div>
          )}
          
          {/* NFT Reward */}
          {hasNftReward && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-purple-100 to-fuchsia-200 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 backdrop-blur-md rounded-2xl p-6 border-2 border-purple-300 dark:border-purple-700 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <AutoAwesomeIcon className="w-6 h-6 text-purple-700 dark:text-purple-300" />
                <span className="text-sm text-gray-900 dark:text-white font-bold">NFT Badge</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                Unlocked!
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Claim Rewards Button (if unclaimed) */}
        {claimSignature && numericQuestId && userFid && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-blue-300 dark:border-blue-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">
                Ready to claim your rewards on-chain?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Claim your {pointsReward} points on the blockchain to use them in the GMeowbased ecosystem.
              </p>
              <QuestClaimButton
                questId={numericQuestId}
                questTitle={questTitle}
                signature={claimSignature}
                userFid={userFid}
                onClaimSuccess={() => {
                  router.refresh();
                }}
              />
            </div>
          </motion.div>
        )}
        
        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-700 dark:bg-purple-600 text-white rounded-xl px-6 py-4 font-bold hover:bg-purple-800 dark:hover:bg-purple-500 transition-colors shadow-lg"
          >
            <ShareIcon className="w-5 h-5" />
            Share on Farcaster
          </button>
          
          <Link
            href="/quests"
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-6 py-4 font-bold border-2 border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-lg"
          >
            Browse More Quests
            <ArrowForwardIcon className="w-5 h-5" />
          </Link>
        </motion.div>
        
        {/* View Profile Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6"
        >
          <Link
            href="/profile"
            className="text-gray-800 dark:text-gray-100 hover:text-purple-700 dark:hover:text-yellow-300 transition-colors text-sm font-bold underline"
          >
            View Your Profile →
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
