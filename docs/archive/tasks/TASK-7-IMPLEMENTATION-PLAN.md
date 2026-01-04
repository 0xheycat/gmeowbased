# Task 7: Real Data Integration - Implementation Plan

**Date**: December 4, 2025  
**Current Score**: 95/100  
**Target Score**: 97/100 (+2 points)  
**Duration**: 4-5 hours  
**Status**: 🚀 IN PROGRESS

---

## 🎯 Mission

Replace mock quest data with real Farcaster integration, implement user progress tracking, and connect leaderboard to actual user data.

**Key Decision**: Focus on feature implementation. API security deferred to Phase 7 (API Cleanup) after core features rebuilt.

---

## 📋 Implementation Phases

### Phase 1: Farcaster API Basic Integration (1.5-2 hours)

**Objective**: Connect to Farcaster to fetch real user data and quest activity

#### 1.1: Neynar SDK Setup (15 min)
```bash
# Check if already installed
pnpm list @neynar/nodejs-sdk

# Install if needed
pnpm add @neynar/nodejs-sdk
```

**Configuration**:
```typescript
// lib/api/farcaster/client.ts
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

export async function getUserByFid(fid: number) {
  const response = await neynar.fetchBulkUsers([fid]);
  return response.users[0];
}

export async function getUserCasts(fid: number, limit: number = 25) {
  const response = await neynar.fetchAllCastsCreatedByUser(fid, {
    limit,
  });
  return response.casts;
}

export async function getChannelDetails(channelId: string) {
  const response = await neynar.lookupChannel(channelId);
  return response.channel;
}
```

#### 1.2: Quest Data Model (30 min)
```typescript
// lib/api/quests/types.ts
export interface Quest {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: 'onchain' | 'social' | 'creative' | 'learn';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Quest metadata
  coverImage: string;
  badgeImage?: string;
  xpReward: number;
  estimatedTime: string;
  
  // Quest requirements
  requirements: QuestRequirement[];
  
  // Quest status
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate?: string;
  endDate?: string;
  
  // Creator info
  creator: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
  
  // Statistics
  participantCount: number;
  completionCount: number;
  successRate: number;
}

export interface QuestRequirement {
  id: string;
  type: 'cast' | 'follow' | 'like' | 'recast' | 'channel_join' | 'token_hold' | 'nft_own';
  description: string;
  target?: string; // FID, channel ID, token address, etc.
  amount?: number;
  completed: boolean;
}

export interface UserProgress {
  userId: string; // FID as string
  questId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100
  requirements: {
    [requirementId: string]: {
      completed: boolean;
      completedAt?: string;
      proof?: string; // Cast hash, transaction hash, etc.
    };
  };
  startedAt?: string;
  completedAt?: string;
  xpEarned?: number;
}
```

#### 1.3: Quest Service (45 min)
```typescript
// lib/api/quests/service.ts
import { Quest, UserProgress } from './types';
import { getUserByFid, getUserCasts } from '../farcaster/client';

// Mock quest database (replace with Supabase later)
const QUESTS_DB = new Map<string, Quest>();
const USER_PROGRESS_DB = new Map<string, UserProgress>();

export class QuestService {
  // Get all active quests
  async getActiveQuests(filters?: {
    category?: Quest['category'];
    difficulty?: Quest['difficulty'];
    limit?: number;
  }): Promise<Quest[]> {
    let quests = Array.from(QUESTS_DB.values()).filter(q => q.status === 'active');
    
    if (filters?.category) {
      quests = quests.filter(q => q.category === filters.category);
    }
    
    if (filters?.difficulty) {
      quests = quests.filter(q => q.difficulty === filters.difficulty);
    }
    
    if (filters?.limit) {
      quests = quests.slice(0, filters.limit);
    }
    
    return quests;
  }
  
  // Get quest by ID with user progress
  async getQuestWithProgress(questId: string, userFid: number): Promise<{
    quest: Quest;
    progress: UserProgress;
  }> {
    const quest = QUESTS_DB.get(questId);
    if (!quest) {
      throw new Error(`Quest not found: ${questId}`);
    }
    
    const progressKey = `${userFid}:${questId}`;
    let progress = USER_PROGRESS_DB.get(progressKey);
    
    // Initialize progress if not exists
    if (!progress) {
      progress = {
        userId: userFid.toString(),
        questId,
        status: 'not_started',
        progress: 0,
        requirements: {},
      };
      USER_PROGRESS_DB.set(progressKey, progress);
    }
    
    return { quest, progress };
  }
  
  // Check quest requirements and update progress
  async checkQuestProgress(questId: string, userFid: number): Promise<UserProgress> {
    const { quest, progress } = await this.getQuestWithProgress(questId, userFid);
    
    // Check each requirement
    for (const requirement of quest.requirements) {
      const completed = await this.checkRequirement(requirement, userFid);
      
      progress.requirements[requirement.id] = {
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
    }
    
    // Calculate overall progress
    const totalRequirements = quest.requirements.length;
    const completedRequirements = Object.values(progress.requirements).filter(r => r.completed).length;
    progress.progress = (completedRequirements / totalRequirements) * 100;
    
    // Update status
    if (progress.progress === 100 && progress.status !== 'completed') {
      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.xpEarned = quest.xpReward;
    } else if (progress.progress > 0 && progress.status === 'not_started') {
      progress.status = 'in_progress';
      progress.startedAt = new Date().toISOString();
    }
    
    // Save progress
    const progressKey = `${userFid}:${questId}`;
    USER_PROGRESS_DB.set(progressKey, progress);
    
    return progress;
  }
  
  // Check individual requirement
  private async checkRequirement(requirement: QuestRequirement, userFid: number): Promise<boolean> {
    switch (requirement.type) {
      case 'cast':
        // Check if user has cast with specific content/hash
        const casts = await getUserCasts(userFid, 100);
        return casts.some(cast => 
          requirement.target ? cast.hash === requirement.target : casts.length > 0
        );
      
      case 'follow':
        // Check if user follows target FID
        const user = await getUserByFid(userFid);
        return requirement.target 
          ? user.follower_count > 0 // Simplified check
          : false;
      
      // Add more requirement types as needed
      default:
        return false;
    }
  }
  
  // Seed initial quests (for testing)
  async seedQuests(): Promise<void> {
    const seedQuests: Quest[] = [
      {
        id: 'quest-1',
        title: 'First Cast on Farcaster',
        slug: 'first-cast',
        description: 'Make your first cast on Farcaster to earn 100 XP',
        category: 'social',
        difficulty: 'beginner',
        coverImage: '/images/quests/first-cast.jpg',
        badgeImage: '/images/badges/first-cast.png',
        xpReward: 100,
        estimatedTime: '5 minutes',
        requirements: [
          {
            id: 'req-1',
            type: 'cast',
            description: 'Create your first cast',
            completed: false,
          },
        ],
        status: 'active',
        creator: {
          fid: 3,
          username: 'dwr',
          displayName: 'Dan Romero',
          pfpUrl: 'https://i.imgur.com/k9fXs2m.jpg',
        },
        participantCount: 1250,
        completionCount: 980,
        successRate: 78,
      },
      // Add more seed quests...
    ];
    
    seedQuests.forEach(quest => {
      QUESTS_DB.set(quest.id, quest);
    });
  }
}

export const questService = new QuestService();
```

---

### Phase 2: API Routes Implementation (1-1.5 hours)

**Objective**: Create Next.js API routes for quest data

#### 2.1: Quest List API (20 min)
```typescript
// app/api/quests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { questService } from '@/lib/api/quests/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as any;
    const difficulty = searchParams.get('difficulty') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    
    const quests = await questService.getActiveQuests({
      category,
      difficulty,
      limit,
    });
    
    return NextResponse.json({
      success: true,
      data: quests,
      count: quests.length,
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}
```

#### 2.2: Quest Details API (20 min)
```typescript
// app/api/quests/[questId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { questService } from '@/lib/api/quests/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { questId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userFid = searchParams.get('userFid');
    
    if (!userFid) {
      return NextResponse.json(
        { success: false, error: 'User FID required' },
        { status: 400 }
      );
    }
    
    const result = await questService.getQuestWithProgress(
      params.questId,
      parseInt(userFid)
    );
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quest' },
      { status: 500 }
    );
  }
}
```

#### 2.3: Progress Check API (20 min)
```typescript
// app/api/quests/[questId]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { questService } from '@/lib/api/quests/service';

export async function POST(
  request: NextRequest,
  { params }: { params: { questId: string } }
) {
  try {
    const body = await request.json();
    const { userFid } = body;
    
    if (!userFid) {
      return NextResponse.json(
        { success: false, error: 'User FID required' },
        { status: 400 }
      );
    }
    
    const progress = await questService.checkQuestProgress(
      params.questId,
      userFid
    );
    
    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error checking progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check progress' },
      { status: 500 }
    );
  }
}
```

---

### Phase 3: Frontend Integration (1.5-2 hours)

**Objective**: Connect UI components to real API data

#### 3.1: Quest Data Fetching Hook (30 min)
```typescript
// hooks/useQuests.ts
import useSWR from 'swr';
import { Quest } from '@/lib/api/quests/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useQuests(filters?: {
  category?: string;
  difficulty?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/quests?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  
  return {
    quests: data?.data as Quest[] | undefined,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useQuestDetails(questId: string, userFid: number) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/quests/${slug}?userFid=${userFid}`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // 30 seconds
    }
  );
  
  return {
    quest: data?.data?.quest,
    progress: data?.data?.progress,
    isLoading,
    error,
    refetch: mutate,
  };
}
```

#### 3.2: Update Quest Grid Component (30 min)
```typescript
// components/quests/QuestGrid.tsx - Update to use real data
import { useQuests } from '@/hooks/useQuests';

export default function QuestGrid({ 
  userFid,
  category,
  difficulty,
}: {
  userFid?: number;
  category?: string;
  difficulty?: string;
}) {
  const { quests, isLoading, error, refetch } = useQuests({
    category,
    difficulty,
    limit: 20,
  });
  
  if (isLoading) {
    return <QuestGridSkeleton />;
  }
  
  if (error) {
    return (
      <ErrorState
        title="Failed to load quests"
        message="We couldn't load the quests. Please try again."
        onRetry={refetch}
      />
    );
  }
  
  if (!quests || quests.length === 0) {
    return (
      <EmptyState
        title="No quests found"
        message="Try adjusting your filters or check back later for new quests."
      />
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quests.map((quest, index) => (
        <QuestCard
          key={quest.id}
          {...quest}
          priority={index < 3}
          userFid={userFid}
        />
      ))}
    </div>
  );
}
```

#### 3.3: Update Quest Page (30 min)
```typescript
// app/quests/page.tsx - Connect to real data
import { Suspense } from 'react';
import { QuestGrid } from '@/components/quests/QuestGrid';
import { QuestFilters } from '@/components/quests/QuestFilters';

export default function QuestsPage() {
  // TODO: Get userFid from auth context
  const userFid = 3; // Hardcoded for now
  
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Hero Section */}
      <section className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            Explore Quests
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)]">
            Complete quests, earn XP, and level up your Farcaster journey
          </p>
        </div>
      </section>
      
      {/* Filters */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div>Loading filters...</div>}>
            <QuestFilters />
          </Suspense>
        </div>
      </section>
      
      {/* Quest Grid */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<QuestGridSkeleton />}>
            <QuestGrid userFid={userFid} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
```

---

### Phase 4: User Progress Tracking (30-45 min)

**Objective**: Track and display user quest progress

#### 4.1: Progress Component (20 min)
```typescript
// components/quests/QuestProgress.tsx
import { UserProgress } from '@/lib/api/quests/types';

export function QuestProgress({ progress }: { progress: UserProgress }) {
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">Progress</span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {Math.round(progress.progress)}%
          </span>
        </div>
        <div className="h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-500"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>
      
      {/* Requirements Checklist */}
      <div className="space-y-2">
        {Object.entries(progress.requirements).map(([reqId, reqProgress]) => (
          <div key={reqId} className="flex items-center gap-3">
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${reqProgress.completed 
                ? 'border-[var(--color-success)] bg-[var(--color-success)]' 
                : 'border-[var(--color-border)]'
              }
            `}>
              {reqProgress.completed && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${
              reqProgress.completed 
                ? 'text-[var(--color-text-primary)]' 
                : 'text-[var(--color-text-secondary)]'
            }`}>
              Requirement {reqId}
            </span>
          </div>
        ))}
      </div>
      
      {/* Status Badge */}
      <div className="pt-2">
        <span className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          ${progress.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
          ${progress.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''}
          ${progress.status === 'not_started' ? 'bg-gray-100 text-gray-800' : ''}
        `}>
          {progress.status === 'completed' && '✓ Completed'}
          {progress.status === 'in_progress' && '⏳ In Progress'}
          {progress.status === 'not_started' && '🎯 Not Started'}
        </span>
      </div>
    </div>
  );
}
```

#### 4.2: Check Progress Button (15 min)
```typescript
// components/quests/CheckProgressButton.tsx
import { useState } from 'react';

export function CheckProgressButton({ 
  questId, 
  userFid,
  onProgressUpdate 
}: { 
  questId: string;
  userFid: number;
  onProgressUpdate: (progress: any) => void;
}) {
  const [isChecking, setIsChecking] = useState(false);
  
  async function handleCheck() {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/quests/${slug}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userFid }),
      });
      
      const result = await response.json();
      if (result.success) {
        onProgressUpdate(result.data);
      }
    } catch (error) {
      console.error('Failed to check progress:', error);
    } finally {
      setIsChecking(false);
    }
  }
  
  return (
    <button
      onClick={handleCheck}
      disabled={isChecking}
      className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
    >
      {isChecking ? 'Checking...' : 'Check Progress'}
    </button>
  );
}
```

---

## 📊 Score Impact Breakdown

**Total Target**: +2 points (95 → 97/100)

### Implementation Scores:
- Phase 1: Farcaster API Integration → +0.5
- Phase 2: API Routes → +0.5
- Phase 3: Frontend Integration → +0.7
- Phase 4: Progress Tracking → +0.3

### Quality Multipliers:
- Real data vs mock data: +0.5
- User progress tracking: +0.3
- Error handling: +0.2
- Loading states (already done): Maintained

**Expected Final Score**: 97/100 ✅

---

## ✅ Testing Checklist

### Phase 1 Tests:
- [ ] Neynar SDK connects successfully
- [ ] User data fetches correctly (test with FID 3)
- [ ] Quest service seeds initial quests
- [ ] Quest requirements check logic works

### Phase 2 Tests:
- [ ] GET /api/quests returns quest list
- [ ] GET /api/quests/[id] returns quest details
- [ ] POST /api/quests/[id]/progress updates progress
- [ ] Error handling works (invalid FID, missing quest)

### Phase 3 Tests:
- [ ] QuestGrid displays real quests
- [ ] Filters work with API data
- [ ] Loading states show correctly
- [ ] Error states show with retry option
- [ ] Empty states show when no quests

### Phase 4 Tests:
- [ ] Progress bar updates correctly
- [ ] Requirements checklist shows completion status
- [ ] Check progress button works
- [ ] Progress persists across page refreshes

---

## 📝 Documentation Updates

**After Task 7 Complete**:
1. Update CURRENT-TASK.md → Score: 97/100
2. Update FOUNDATION-REBUILD-ROADMAP.md → Task 7 complete
3. Create TASK-7-COMPLETION-REPORT.md
4. Update todo list → Mark Task 7 complete

---

## 🚀 Implementation Order

1. **Phase 1** (1.5-2h): Set up Farcaster integration + Quest service
2. **Phase 2** (1-1.5h): Create API routes
3. **Phase 3** (1.5-2h): Connect frontend to APIs
4. **Phase 4** (30-45min): Implement progress tracking
5. **Testing** (30-45min): Verify all features work
6. **Documentation** (15-20min): Update completion docs

**Total Estimated Time**: 4-5 hours  
**Target Completion**: Same day

---

## 🔄 API Security Note

**Reminder**: This implementation uses basic API calls without heavy security (rate limiting, caching, etc.).

**Why**: Pre-build stage, focus on feature completeness first.

**When to secure**: Phase 7 (API Cleanup) after all core features rebuilt.

**Reference**: See API-SECURITY-STRATEGY.md for full security implementation when ready.

---

**Status**: 🚀 READY TO START  
**Next Step**: Begin Phase 1 - Farcaster API Basic Integration
