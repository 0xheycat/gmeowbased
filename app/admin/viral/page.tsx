/**
 * Admin Viral Dashboard Page
 * 
 * Comprehensive dashboard for monitoring Phase 5.1 viral notification system.
 * Includes tier upgrade feed, notification analytics, achievement stats,
 * top viral casts leaderboard, and webhook health monitoring.
 * 
 * Admin-only access required.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { redirect } from 'next/navigation'
import { validateAdminRequest } from '@/lib/admin-auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Client components - dynamically loaded to reduce initial bundle
const TierUpgradeFeed = dynamic(() => import('@/components/admin/viral/TierUpgradeFeed'), {
  loading: () => <div className="animate-pulse rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 h-96" />,
})

const NotificationAnalytics = dynamic(() => import('@/components/admin/viral/NotificationAnalytics'), {
  loading: () => <div className="animate-pulse rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 h-96" />,
})

const AchievementDistribution = dynamic(() => import('@/components/admin/viral/AchievementDistribution'), {
  loading: () => <div className="animate-pulse rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 h-96" />,
})

const TopViralCasts = dynamic(() => import('@/components/admin/viral/TopViralCasts'), {
  loading: () => <div className="animate-pulse rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 h-96" />,
})

const WebhookHealthMonitor = dynamic(() => import('@/components/admin/viral/WebhookHealthMonitor'), {
  loading: () => <div className="animate-pulse rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 h-96" />,
})

export default async function ViralAdminPage() {
  // Admin auth check
  const headersList = await headers()
  const request = new NextRequest('https://dummy.com', {
    headers: headersList,
  })

  const auth = await validateAdminRequest(request)
  
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    redirect('/admin/login')
  }

  return (
    <div className="dash-root relative mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pt-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.32em] text-[var(--px-sub)]">
            Gmeow Admin
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">
            🔔 Viral Notifications Dashboard
          </h1>
          <p className="mt-1 text-[12px] text-[var(--px-sub)]">
            Real-time monitoring for Phase 5.1 viral engagement notifications
          </p>
        </div>

        <Link
          className="pixel-button btn-sm border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5 text-slate-950 dark:text-slate-950 dark:text-white hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
          href="/admin"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-[13px] font-semibold text-emerald-200">
              Phase 5.1 Viral Notifications Active
            </h3>
            <p className="mt-1 text-[11px] text-emerald-300/80">
              Monitoring tier upgrades (active → viral → mega_viral), achievement unlocks,
              notification delivery analytics, and webhook health across all users.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="space-y-6">
        {/* Row 1: Tier Upgrades + Notification Analytics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TierUpgradeFeed limit={50} autoRefresh refreshInterval={10000} />
          <NotificationAnalytics />
        </div>

        {/* Row 2: Achievement Distribution + Top Viral Casts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AchievementDistribution />
          <TopViralCasts />
        </div>

        {/* Row 3: Webhook Health (full width) */}
        <WebhookHealthMonitor />
      </div>

      {/* Footer Notes */}
      <div className="mt-8 rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-4">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-950 dark:text-white/70">
          📝 Admin Notes
        </h4>
        <ul className="space-y-1 text-[11px] text-slate-950 dark:text-white/60">
          <li>
            • <strong>Tier Upgrades:</strong> Real-time feed of users leveling up viral tiers.
            Auto-refreshes every 10 seconds.
          </li>
          <li>
            • <strong>Notification Analytics:</strong> Success rates, failure breakdown, and daily
            trends for notification delivery.
          </li>
          <li>
            • <strong>Achievements:</strong> Distribution charts showing how many users unlocked
            each viral achievement type.
          </li>
          <li>
            • <strong>Top Casts:</strong> Leaderboard of highest-scoring viral casts with engagement
            metrics (likes, recasts, replies).
          </li>
          <li>
            • <strong>Webhook Health:</strong> Real-time monitoring of Neynar webhook status,
            processing times, and recent errors.
          </li>
        </ul>
      </div>
    </div>
  )
}
