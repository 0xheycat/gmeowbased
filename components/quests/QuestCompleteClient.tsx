/**
 * Quest Completion Client Component
 * Handles client-side animations and interactions
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

interface QuestCompleteClientProps {
  questId: string;
  xpReward: number;
  tokenReward: number;
  hasNftReward: boolean;
}

export default function QuestCompleteClient({
  questId,
  xpReward,
  tokenReward,
  hasNftReward,
}: QuestCompleteClientProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  const handleShare = () => {
    const text = `Just completed a quest on @gmeowbased and earned ${xpReward} XP! ${
      hasNftReward ? 'Plus an exclusive NFT badge!' : ''
    }\n\nJoin the Base community quest: https://gmeowhq.art/quests/${questId}`;
    
    // Open Farcaster compose
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
    window.open(warpcastUrl, '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Quest Complete!
          </h1>
          <p className="text-xl text-primary-100">
            Amazing work! You've earned incredible rewards.
          </p>
        </motion.div>
        
        {/* Rewards Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* XP Reward */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-2">
              <EmojiEventsIcon className="w-6 h-6 text-yellow-400" />
              <span className="text-sm text-primary-100">XP Earned</span>
            </div>
            <div className="text-3xl font-bold text-white">
              +{xpReward.toLocaleString()}
            </div>
          </motion.div>
          
          {/* Token Reward */}
          {tokenReward > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-2">
                <AutoAwesomeIcon className="w-6 h-6 text-green-400" />
                <span className="text-sm text-primary-100">Tokens</span>
              </div>
              <div className="text-3xl font-bold text-white">
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
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-2">
                <AutoAwesomeIcon className="w-6 h-6 text-purple-400" />
                <span className="text-sm text-primary-100">NFT Badge</span>
              </div>
              <div className="text-3xl font-bold text-white">
                Unlocked!
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-primary-600 rounded-xl px-6 py-4 font-semibold hover:bg-primary-50 transition-colors"
          >
            <ShareIcon className="w-5 h-5" />
            Share on Farcaster
          </button>
          
          <Link
            href="/quests"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800/80 dark:bg-slate-700/80 backdrop-blur-md text-white rounded-xl px-6 py-4 font-semibold border border-white/20 hover:bg-slate-700/90 dark:hover:bg-slate-600/90 transition-colors"
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
            className="text-primary-100 hover:text-white transition-colors text-sm"
          >
            View Your Profile →
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
