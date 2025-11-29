/**
 * ViralMetrics Component
 * 
 * Displays viral engagement statistics on landing page
 * Uses aggregated metrics (not requiring user FID)
 * 
 * Template Compliance:
 * - Uses Card, StatsCard from tailwick-primitives (Tailwick v2.0)
 * - Uses Gmeowbased v0.1 SVG icons
 * - No inline card styles, proper component composition
 */

import Image from 'next/image'
import { Card, CardBody, StatsCard, EmptyState } from '@/components/ui/tailwick-primitives'

// ========================================
// TYPES
// ========================================

type ViralMetricsData = {
  totalCasts: number
  viralCasts: number // score >= 3.0
  avgEngagementScore: number
  topTier: {
    count: number
    percentage: number
  }
}

// ========================================
// DATA FETCHING
// ========================================

async function getViralMetrics(): Promise<ViralMetricsData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Use stats API which now includes viral metrics
    const res = await fetch(`${baseUrl}/api/stats`, {
      next: { revalidate: 120 }, // Cache for 2 minutes
    })
    
    if (!res.ok) {
      console.error('Stats API error:', res.status)
      return {
        totalCasts: 0,
        viralCasts: 0,
        avgEngagementScore: 0,
        topTier: { count: 0, percentage: 0 }
      }
    }
    
    const stats = await res.json()
    
    // Calculate metrics from stats
    const totalCasts = stats.totalCasts || 0
    const viralCasts = stats.totalViralCasts || 0
    const avgScore = totalCasts > 0 ? (viralCasts / totalCasts) * 5 : 0 // Estimate
    const topTierPercentage = totalCasts > 0 ? (viralCasts / totalCasts) * 100 : 0
    
    return {
      totalCasts,
      viralCasts,
      avgEngagementScore: avgScore,
      topTier: {
        count: viralCasts,
        percentage: topTierPercentage
      }
    }
  } catch (error) {
    console.error('Failed to fetch viral metrics:', error)
    return {
      totalCasts: 0,
      viralCasts: 0,
      avgEngagementScore: 0,
      topTier: { count: 0, percentage: 0 }
    }
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-yellow-400' // Legendary
  if (score >= 3.5) return 'text-orange-400' // Mega Viral
  if (score >= 2.5) return 'text-pink-400'   // Viral
  if (score >= 1.5) return 'text-purple-400' // Popular
  return 'text-blue-400' // Engaging
}

function getScoreLabel(score: number): string {
  if (score >= 4.5) return 'Legendary'
  if (score >= 3.5) return 'Mega Viral'
  if (score >= 2.5) return 'Viral'
  if (score >= 1.5) return 'Popular'
  return 'Engaging'
}

function getScoreIcon(score: number): string {
  // Return icon path based on score tier
  if (score >= 4.5) return '/assets/icons/Trophy Icon.svg' // Legendary
  if (score >= 3.5) return '/assets/icons/Badges Icon.svg'  // Mega Viral
  if (score >= 2.5) return '/assets/icons/Thumbs Up Icon.svg' // Viral
  if (score >= 1.5) return '/assets/icons/Fav Heart Icon.svg' // Popular
  return '/assets/icons/Credits Icon.svg' // Engaging
}

// ========================================
// VIRAL METRICS (SERVER COMPONENT)
// ========================================

export async function ViralMetrics() {
  const metrics = await getViralMetrics()

  if (metrics.totalCasts === 0) {
    return (
      <EmptyState
        icon="/assets/icons/Thumbs Up Icon.svg"
        iconAlt="Engagement"
        title="No Viral Content Yet"
        description="Start creating engaging content to see your viral metrics and engagement statistics!"
        action={
          <a
            href="/app/badges"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Share Your First Badge
          </a>
        }
      />
    )
  }

  const avgScoreColor = getScoreColor(metrics.avgEngagementScore)
  const scoreLabel = getScoreLabel(metrics.avgEngagementScore)
  const scoreIcon = getScoreIcon(metrics.avgEngagementScore)

  return (
    <div>
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          icon="/assets/icons/Newsfeed Icon.svg"
          iconAlt="Total Casts"
          label="Total Casts"
          value={formatNumber(metrics.totalCasts)}
          gradient="purple"
        />
        
        <StatsCard
          icon="/assets/icons/Thumbs Up Icon.svg"
          iconAlt="Viral Casts"
          label="Viral Casts"
          value={formatNumber(metrics.viralCasts)}
          gradient="pink"
        />
        
        <StatsCard
          icon={scoreIcon}
          iconAlt="Score"
          label="Avg Score"
          value={metrics.avgEngagementScore.toFixed(1)}
          gradient="orange"
        />
      </div>

      {/* Engagement Stats */}
      <Card gradient="purple">
        <CardBody>
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Community Engagement
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Viral Rate */}
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">
                {metrics.topTier.percentage.toFixed(1)}%
              </div>
              <div className="text-purple-200">Viral Rate</div>
              <div className="text-sm text-purple-300/70 mt-1">
                {formatNumber(metrics.viralCasts)} / {formatNumber(metrics.totalCasts)} casts
              </div>
            </div>

            {/* Quality Indicator */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${avgScoreColor} mb-2`}>
                {scoreLabel}
              </div>
              <div className="text-purple-200">Quality Level</div>
              <div className="text-sm text-purple-300/70 mt-1">
                Based on engagement score
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.topTier.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-purple-300/70 mt-2">
              <span>Low Engagement</span>
              <span>High Engagement</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ========================================
// LOADING SKELETON
// ========================================

export function ViralMetricsLoading() {
  return (
    <div className="animate-pulse">
      {/* Primary Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-purple-800/20 p-6 border border-purple-700/30"
          >
            <div className="text-center space-y-3">
              <div className="h-10 w-10 bg-purple-700/30 rounded-full mx-auto"></div>
              <div className="h-10 w-20 bg-purple-700/30 rounded mx-auto"></div>
              <div className="h-4 w-24 bg-purple-700/30 rounded mx-auto"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Engagement Stats Skeleton */}
      <div className="rounded-2xl bg-purple-800/20 p-8 border border-purple-700/30">
        <div className="h-6 w-48 bg-purple-700/30 rounded mx-auto mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-12 w-24 bg-purple-700/30 rounded mx-auto"></div>
              <div className="h-4 w-20 bg-purple-700/30 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ========================================
// SECTION WRAPPER (for landing page)
// ========================================

export function ViralMetricsSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-gmeow">
            Community Engagement
          </h2>
          <p className="text-purple-300 text-lg max-w-2xl mx-auto">
            See how the Gmeowbased community creates viral content
          </p>
        </div>

        <ViralMetrics />
      </div>
    </section>
  )
}
