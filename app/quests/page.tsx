/**
 * Professional Quest Grid Page - Task 8.1: Active Filtering
 * Path: /quests
 * Features: Real-time quest data + active filtering with search
 */

'use client';

import { Suspense, useState, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import QuestGrid from '@/components/quests/QuestGrid';
import QuestFilters from '@/components/quests/QuestFilters';
import { useQuests } from '@/hooks/useQuests';
import { QuestGridSkeleton } from '@/components/quests/skeletons';
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
    xpRange: { min: 0, max: 10000 },
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
    
    // XP range filter
    if (quest.reward_points < filters.xpRange.min || quest.reward_points > filters.xpRange.max) {
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
      
      case 'xp-high':
        return sorted.sort((a, b) => b.reward_points - a.reward_points);
      
      case 'xp-low':
        return sorted.sort((a, b) => a.reward_points - b.reward_points);
      
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
  
  if (isLoading) {
    return <QuestGridSkeleton />;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load quests
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error.message || "We couldn't load the quests. Please try again."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
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
  
  const displayQuests = sortedQuests || quests;
  
  return (
    <div className="space-y-8">
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
                xpRange: { min: 0, max: 10000 },
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
                xpRange: { min: 0, max: 10000 },
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
    </div>
  );
}
