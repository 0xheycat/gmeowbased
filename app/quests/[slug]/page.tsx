/**
 * Professional Quest Detail Page
 * Phase 2.7: Quest Page Rebuild
 * 
 * Path: /quests/[slug]
 * Template: gmeowbased0.6 (0-10% adaptation)
 * Features: Multi-step tasks, progress tracking, verification, rewards
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { getQuestBySlug } from '@/lib/supabase/queries/quests';
import { QuestProgress } from '@/components/quests';
import { QuestVerification } from '@/components/quests/QuestVerification';
import { QuestAnalytics } from '@/components/quests/QuestAnalytics';
import type { Quest, QuestTask } from '@/lib/supabase/types/quest';

interface QuestDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: QuestDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const quest = await getQuestBySlug(slug);
  
  if (!quest) {
    return {
      title: 'Quest Not Found',
    };
  }
  
  return {
    title: `${quest.title} - Quests - Gmeowbased`,
    description: quest.description,
    openGraph: {
      images: quest.cover_image_url ? [quest.cover_image_url] : [],
    },
  };
}

export default async function QuestDetailPage({ params }: QuestDetailPageProps) {
  const { slug } = await params;
  
  // TODO: Get user FID from auth session
  const userFid = undefined; // Replace with actual auth
  
  const quest = await getQuestBySlug(slug, userFid);
  
  if (!quest) {
    notFound();
  }
  
  const tasks = quest.tasks as QuestTask[];
  const hasMultipleTasks = tasks && tasks.length > 1;
  const currentTaskIndex = quest.user_progress?.current_task_index || 0;
  const progressPercentage = quest.user_progress?.progress_percentage || 0;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Cover Image */}
      <div className="relative h-[400px] bg-gradient-to-br from-primary-500 to-primary-700">
        {quest.cover_image_url && (
          <Image
            src={quest.cover_image_url}
            alt={quest.title}
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
            {/* Breadcrumb */}
            <nav className="mb-4">
              <ol className="flex items-center space-x-2 text-sm text-white/80">
                <li>
                  <Link href="/quests" className="hover:text-white transition-colors">
                    Quests
                  </Link>
                </li>
                <ChevronRightIcon className="w-4 h-4" />
                <li className="text-white font-medium">{quest.title}</li>
              </ol>
            </nav>
            
            {/* Title & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {/* Category Badge */}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-100 border border-primary-300/30">
                    {quest.category === 'onchain' ? '⛓️ On-Chain' : '👥 Social'}
                  </span>
                  
                  {/* Difficulty Badge */}
                  {quest.difficulty && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      quest.difficulty === 'beginner'
                        ? 'bg-green-500/20 text-green-100 border border-green-300/30'
                        : quest.difficulty === 'intermediate'
                        ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-300/30'
                        : 'bg-red-500/20 text-red-100 border border-red-300/30'
                    }`}>
                      {quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
                    </span>
                  )}
                  
                  {/* Locked Badge */}
                  {quest.is_locked && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-800/80 text-gray-200 border border-gray-600/50">
                      <LockIcon className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {quest.title}
                </h1>
                
                <p className="text-lg text-white/90 max-w-3xl">
                  {quest.description}
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="flex sm:flex-col gap-4 sm:gap-2 text-white">
                <div className="flex items-center gap-2 text-sm">
                  <EmojiEventsIcon className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold">{quest.reward_points} XP</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <PeopleIcon className="w-5 h-5" />
                  <span>{quest.participant_count} joined</span>
                </div>
                {quest.estimated_time_minutes && (
                  <div className="flex items-center gap-2 text-sm">
                    <AccessTimeIcon className="w-5 h-5" />
                    <span>~{quest.estimated_time_minutes} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tasks */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overall Progress */}
            {quest.user_progress && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Your Progress
                  </h2>
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {progressPercentage}% Complete
                  </span>
                </div>
                
                <QuestProgress
                  value={progressPercentage}
                  size="lg"
                  variant="solid"
                  color="primary"
                />
              </div>
            )}
            
            {/* Quest Tasks */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {hasMultipleTasks ? 'Quest Steps' : 'Quest Objective'}
              </h2>
              
              {hasMultipleTasks ? (
                <div className="space-y-4">
                  {tasks.map((task, index) => {
                    const isCompleted = quest.user_progress?.completed_tasks.includes(index);
                    const isCurrent = index === currentTaskIndex;
                    const isLocked = index > currentTaskIndex && !isCompleted;
                    
                    return (
                      <div
                        key={task.id}
                        className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : isCurrent
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Step Number / Status Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {isCompleted ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : isLocked ? (
                            <LockIcon className="w-6 h-6 text-gray-400" />
                          ) : (
                            <RadioButtonUncheckedIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                          )}
                        </div>
                        
                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Step {index + 1}
                            </span>
                            {isCompleted && (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                ✓ Completed
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {task.title}
                          </h3>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-600 dark:text-gray-400">
                    {quest.description}
                  </p>
                </div>
              )}
            </div>

            {/* Quest Verification Component */}
            {!quest.is_locked && (
              <QuestVerification 
                quest={quest}
                userFid={userFid}
                onVerificationComplete={(taskIndex) => {
                  console.log(`Task ${taskIndex} completed`)
                  // TODO: Refresh quest data
                }}
                onQuestComplete={() => {
                  console.log('Quest completed!')
                  // TODO: Redirect to completion page or refresh
                }}
              />
            )}
          </div>
          
          {/* Right Column: Rewards & Info */}
          <div className="space-y-6">
            {/* Rewards Card */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <EmojiEventsIcon className="w-5 h-5 text-yellow-600" />
                Rewards
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">XP Points</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    +{quest.reward_points}
                  </span>
                </div>
                
                {quest.token_reward_amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Token Reward</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {quest.token_reward_amount} tokens
                    </span>
                  </div>
                )}
                
                {quest.nft_reward_contract && (
                  <div className="pt-3 border-t border-yellow-200 dark:border-yellow-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      🎨 Exclusive NFT Badge
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Requirements Card */}
            {quest.min_viral_xp_required > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Requirements
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {quest.is_locked ? (
                      <>
                        <LockIcon className="w-4 h-4 text-red-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Minimum {quest.min_viral_xp_required} Viral Points required
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Viral XP requirement met
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Quest Analytics */}
            <QuestAnalytics
              questId={quest.id.toString()}
              completionCount={quest.completion_count || 0}
              participantCount={quest.participant_count}
              recentCompleters={[]}
            />
            
            {/* Quest Creator */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Quest Creator
              </h3>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                  {quest.creator_fid.toString().slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    User {quest.creator_fid}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Quest Creator
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
