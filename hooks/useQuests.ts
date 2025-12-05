/**
 * Quest Data Fetching Hooks
 * SWR-based hooks for quest data with caching and automatic revalidation
 */

import useSWR from 'swr';
import type { Quest, UserQuestProgress } from '@/lib/supabase/types/quest';

export interface QuestFilters {
  category?: 'onchain' | 'social';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  tags?: string[];
  userFid?: number;
  limit?: number;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

// ===========================
// Quest List Hook
// ===========================

export function useQuests(filters?: QuestFilters) {
  // Build query string
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  
  const queryString = params.toString();
  const url = `/api/quests${queryString ? `?${queryString}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
  
  return {
    quests: data?.data as Quest[] | undefined,
    isLoading,
    error: error || (data?.success === false ? new Error(data.error) : null),
    refetch: mutate,
  };
}

// ===========================
// Quest Details Hook
// ===========================

export function useQuestDetails(questId: string | null, userFid: number | null) {
  const shouldFetch = questId && userFid;
  const url = shouldFetch ? `/api/quests/${questId}?userFid=${userFid}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // 30 seconds
  });
  
  return {
    quest: data?.data?.quest as Quest | undefined,
    progress: data?.data?.progress as UserQuestProgress | undefined,
    isLoading,
    error: error || (data?.success === false ? new Error(data.error) : null),
    refetch: mutate,
  };
}

// ===========================
// Progress Check Hook
// ===========================

export function useCheckProgress() {
  const checkProgress = async (questId: string, userFid: number) => {
    const response = await fetch(`/api/quests/${questId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userFid }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to check progress');
    }
    
    return result;
  };
  
  return {
    checkProgress,
  };
}
