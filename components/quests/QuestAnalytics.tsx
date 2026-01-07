/**
 * QuestAnalytics - Completion statistics and recent completers
 * Phase 8.1.5: Quest Analytics UI
 * 
 * Features:
 * - Total completion count
 * - Completion rate (if view count available)
 * - Recent completers grid with avatars
 * - 7-day completion trend chart (optional)
 * 
 * Data Source: getQuestCompletions() from lib/subsquid-client.ts
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { cn } from '@/lib/utils'

interface QuestCompletion {
  id: string
  user: string
  completedAt: Date | string
  rewardAmount?: number
}

interface QuestAnalyticsProps {
  questId: string
  completionCount?: number
  participantCount?: number
  recentCompleters?: QuestCompletion[]
  className?: string
}

export function QuestAnalytics({
  questId,
  completionCount = 0,
  participantCount = 0,
  recentCompleters = [],
  className,
}: QuestAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localCompleters, setLocalCompleters] = useState<QuestCompletion[]>(recentCompleters)
  
  // Calculate completion rate if we have participant count
  const completionRate = participantCount > 0 
    ? Math.round((completionCount / participantCount) * 100)
    : null
  
  // Format date relative to now
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }
  
  // Load completions from API
  useEffect(() => {
    let mounted = true;
    
    const loadCompletions = async () => {
      setIsLoading(true);
      
      try {
        // Bug #18 fix: Correct API path is /api/quests/completions/[questId]
        const res = await fetch(`/api/quests/completions/${questId}?limit=10&period=7d`);
        
        if (!res.ok) {
          console.error(`API returned ${res.status}`);
          return;
        }
        
        const data = await res.json();
        
        if (mounted && data.completions) {
          setLocalCompleters(data.completions.map((c: any) => ({
            id: c.id,
            user: c.user.address,
            completedAt: c.completedAt,
            rewardAmount: parseInt(c.pointsAwarded),
          })));
        }
      } catch (err) {
        console.error('Failed to load quest completions:', err);
        // Silently fail - analytics is non-critical
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadCompletions();
    
    return () => {
      mounted = false;
    };
  }, [questId])
  
  if (completionCount === 0) {
    return null // Don't show if no completions yet
  }
  
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700',
      className
    )}>
      <div className="flex items-center gap-2 mb-6">
        <EmojiEventsIcon className="w-5 h-5 text-primary-500" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Completion Stats
        </h3>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Completions */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-1">
            <EmojiEventsIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase">
              Total Completions
            </span>
          </div>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {completionCount.toLocaleString()}
          </p>
        </div>
        
        {/* Completion Rate */}
        {completionRate !== null && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">
                Completion Rate
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {completionRate}%
            </p>
          </div>
        )}
      </div>
      
      {/* Recent Completers */}
      {localCompleters.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Recently Completed
          </h4>
          
          <div className="space-y-2">
            {localCompleters.slice(0, 5).map((completer, index) => (
              <div
                key={completer.id || index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* User Avatar Placeholder */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {completer.user.slice(2, 4).toUpperCase()}
                  </div>
                  
                  {/* User Address (shortened) */}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {completer.user.slice(0, 6)}...{completer.user.slice(-4)}
                  </span>
                </div>
                
                {/* Time */}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(completer.completedAt)}
                </span>
              </div>
            ))}
          </div>
          
          {/* View All Link */}
          {localCompleters.length > 5 && (
            <Link 
              href={`/quests/${slug}/completions`}
              className="block mt-4 text-center text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              View all {completionCount} completions →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
