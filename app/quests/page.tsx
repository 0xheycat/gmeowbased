/**
 * Professional Quest Grid Page - Phase 4: Hybrid Architecture Migration
 * Path: /quests
 * 
 * @architecture Hybrid Data Layer
 * - Quest definitions: Supabase (quest_definitions table via /api/quests)
 * - Quest completions: Subsquid GraphQL (Quest entity with totalCompletions)
 * 
 * @template music/* - Loading states, error boundaries, animations
 * 
 * Features:
 * - Real-time quest data from Supabase
 * - Completion stats from Subsquid GraphQL (on-chain truth)
 * - Active filtering with search
 * - Music template loading (Skeleton wave animation)
 * - Professional error states with retry
 * - Framer Motion animations
 */

'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import QuestGrid from '@/components/quests/QuestGrid';
import QuestFilters from '@/components/quests/QuestFilters';
import { useQuests } from '@/hooks/useQuests';
import { useActiveQuests } from '@/hooks/useQuestSubsquid';
import { QuestGridSkeleton } from '@/components/quests/skeletons';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestFilterState, QuestSortOption } from '@/components/quests/QuestFilters';
import type { Quest } from '@/lib/supabase/types/quest';

const DEMO_USER_FID = 3;

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Explore Quests
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto">
            Complete quests, earn XP, and level up your Farcaster journey
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              All Quests
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Explore all available quests and start earning rewards
            </p>
          </div>
          
          <Suspense fallback={<QuestGridSkeleton />}>
            <QuestGridWithData userFid={DEMO_USER_FID} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function QuestGridWithData({ userFid }: { userFid: number }) {
  // Filter state
  const [filters, setFilters] = useState<QuestFilterState>({
    categories: [],
    difficulties: [],
    statuses: [],
    pointsRange: { min: 0, max: 10000 },
    participantRange: { min: 0, max: 1000 },
    dateRange: null,
    isFeatured: null,
    search: '',
  });
  
  // Sort state
  const [sortBy, setSortBy] = useState<QuestSortOption>('trending');
  
  // Build API filters from filter state
  const apiFilters = {
    category: filters.categories.length === 1 && (filters.categories[0] === 'onchain' || filters.categories[0] === 'social') 
      ? filters.categories[0] as 'onchain' | 'social'
      : undefined,
    difficulty: filters.difficulties.length === 1 ? filters.difficulties[0] as 'beginner' | 'intermediate' | 'advanced' : undefined,
    search: filters.search || undefined,
    limit: 20,
  };
  
  const { quests, isLoading, error, refetch } = useQuests(apiFilters);
  
  // Client-side filtering for multi-select and advanced filters
  const filteredQuests = quests?.filter(quest => {
    // Multi-category filter (when more than 1 selected)
    if (filters.categories.length > 1 && !filters.categories.includes(quest.category)) {
      return false;
    }
    
    // Multi-difficulty filter (when more than 1 selected)
    if (filters.difficulties.length > 1 && quest.difficulty && !filters.difficulties.includes(quest.difficulty)) {
      return false;
    }
    
    // Status filter (client-side only, not in API)
    if (filters.statuses.length > 0 && !filters.statuses.includes(quest.status)) {
      return false;
    }
    
    // Points range filter
    if (quest.reward_points_awarded < filters.pointsRange.min || quest.reward_points_awarded > filters.pointsRange.max) {
      return false;
    }
    
    // Participant range filter
    if (quest.participant_count < filters.participantRange.min || quest.participant_count > filters.participantRange.max) {
      return false;
    }
    
    // Featured filter - skip for now (not in Quest type)
    // Will implement when Quest type is updated with featured property
    
    // Date range filter - skip for now (Quest doesn't have createdAt)
    // Will implement when Quest type is updated with timestamps
    
    return true;
  });
  
  // Sorting logic
  const sortQuests = (questsToSort: Quest[]): Quest[] => {
    const sorted = [...questsToSort];
    
    switch (sortBy) {
      case 'trending':
        // Sort by participant count (popularity metric)
        return sorted.sort((a, b) => b.participant_count - a.participant_count);
      
      case 'points-high':
        return sorted.sort((a, b) => b.reward_points_awarded - a.reward_points_awarded);
      
      case 'points-low':
        return sorted.sort((a, b) => a.reward_points_awarded - b.reward_points_awarded);
      
      case 'newest':
        // Sort by ID in reverse (higher ID = newer)
        return sorted.sort((a, b) => b.id - a.id);
      
      case 'ending-soon':
        // Sort by expiry_date if available, otherwise put at end
        return sorted.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        });
      
      case 'most-participants':
        return sorted.sort((a, b) => b.participant_count - a.participant_count);
      
      default:
        return sorted;
    }
  };
  
  const sortedQuests = filteredQuests ? sortQuests(filteredQuests) : [];
  
  // Hybrid data: Supabase quest definitions + Subsquid completion stats
  const { quests: onchainQuests, loading: onchainLoading } = useActiveQuests(100);
  
  // Merge Supabase quests with Subsquid completion data
  const questsWithCompletions = useMemo(() => {
    if (!quests || !onchainQuests) return quests;
    
    return quests.map(quest => {
      // Find matching on-chain quest by onchain_quest_id
      const onchainQuest = quest.onchain_quest_id 
        ? onchainQuests.find(oq => oq.id === String(quest.onchain_quest_id))
        : null;
      
      return {
        ...quest,
        // Override completion_count with on-chain truth
        completion_count: onchainQuest?.totalCompletions || quest.completion_count || 0,
        participant_count: onchainQuest?.totalCompletions || quest.participant_count || 0,
        // Track if quest is on-chain deployed
        is_onchain: !!onchainQuest,
      };
    });
  }, [quests, onchainQuests]);
  
  if (isLoading || onchainLoading) {
    return (
      <div 
        role="status"
        aria-live="polite"
        aria-label="Loading quests"
        className="space-y-8"
      >
        {/* Filters Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <Skeleton variant="rect" className="h-12 w-full mb-4" animation="wave" />
          <div className="flex gap-3">
            <Skeleton variant="rect" className="h-10 w-32" animation="wave" />
            <Skeleton variant="rect" className="h-10 w-32" animation="wave" />
            <Skeleton variant="rect" className="h-10 w-32" animation="wave" />
          </div>
        </div>
        
        {/* Quest Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <Skeleton variant="rect" className="h-56 w-full" animation="wave" />
              <div className="p-6">
                <Skeleton variant="text" className="h-6 w-3/4 mb-3" animation="wave" />
                <Skeleton variant="text" className="h-4 w-full mb-2" animation="wave" />
                <Skeleton variant="text" className="h-4 w-2/3" animation="wave" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <motion.div 
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center py-16 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Animated Error Icon */}
        <motion.svg
          className="w-16 h-16 text-red-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </motion.svg>
        
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load quests
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          {error.message || "We couldn't load the quests from Supabase. Please try again."}
        </p>
        
        <motion.button
          onClick={() => refetch()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }
  
  if (!quests || quests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No quests available yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Click below to seed the database with sample quests
        </p>
        <button
          onClick={async () => {
            await fetch('/api/quests/seed', { method: 'POST' });
            refetch();
          }}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Seed Quests & Refresh
        </button>
      </div>
    );
  }
  
  const displayQuests = sortedQuests || questsWithCompletions || quests;
  
  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Filters + Sort + Search */}
      <QuestFilters
        filters={filters}
        sortBy={sortBy}
        onFiltersChange={setFilters}
        onSortChange={setSortBy}
        isLoading={isLoading}
      />
      
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{displayQuests.length}</span> of {quests.length} quests
        </p>
        {displayQuests.length !== quests.length && (
          <button
            onClick={() => {
              setFilters({
                categories: [],
                difficulties: [],
                statuses: [],
                pointsRange: { min: 0, max: 10000 },
                participantRange: { min: 0, max: 1000 },
                dateRange: null,
                isFeatured: null,
                search: '',
              });
              setSortBy('trending');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
      
      {/* Quest Grid */}
      {displayQuests.length > 0 ? (
        <QuestGrid quests={displayQuests} userFid={userFid} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No quests match your filters
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Try adjusting your search, filter, or sort criteria
          </p>
          <button
            onClick={() => {
              setFilters({
                categories: [],
                difficulties: [],
                statuses: [],
                pointsRange: { min: 0, max: 10000 },
                participantRange: { min: 0, max: 1000 },
                dateRange: null,
                isFeatured: null,
                search: '',
              });
              setSortBy('trending');
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Clear All & Reset Sort
          </button>
        </div>
      )}
    </motion.div>
  );
}
