/**
 * Dashboard GM Section - Server Component Wrapper
 * 
 * Wraps GMButton with user session data
 * Uses 'use client' in GMButton for interactivity
 * 
 * Date: December 14, 2025
 */

import { GMButton } from '@/components/GMButton'

export default async function DashboardGMSection() {
  // TODO: Get user FID from session/auth when implemented
  // For now, GMButton will work without FID (uses wallet address only)
  const userFid = undefined

  return (
    <div className="mb-6">
      <GMButton 
        variant="hero"
        chain="base"
        fid={userFid}
      />
    </div>
  )
}

export { DashboardGMSection }
