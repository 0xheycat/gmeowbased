'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/lib/contexts'

/**
 * Profile Page - Redirect to current user's profile
 * 
 * This page redirects to /profile/[fid] for the current user.
 * If no user is logged in, redirects to dashboard.
 * 
 * See: docs/planning/TASK-9-PROFILE-REBUILD-PLAN.md
 */

export default function ProfileRedirectPage() {
  const router = useRouter()
  const { fid, isAuthenticated, isLoading } = useAuthContext()

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return

    // If authenticated with FID, redirect to user's profile
    if (isAuthenticated && fid) {
      router.push(`/profile/${fid}`)
      return
    }

    // If not authenticated, redirect to dashboard
    router.push('/dashboard')
  }, [router, fid, isAuthenticated, isLoading])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mx-auto animate-pulse">
          <svg className="h-8 w-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-white/60">Loading profile...</p>
      </div>
    </div>
  )
}
