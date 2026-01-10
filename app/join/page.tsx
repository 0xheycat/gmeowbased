/**
 * Join Page - Referral Code Acceptance Landing Page
 * 
 * Route: /join?ref=CODE
 * 
 * Purpose: Landing page for users clicking referral links
 * Validates the referral code and guides user through acceptance flow
 * 
 * Flow:
 * 1. Extract referral code from URL parameter
 * 2. Validate code exists and user is eligible
 * 3. Prompt wallet connection if needed
 * 4. Display acceptance form with rewards breakdown
 * 5. Handle transaction and show success celebration
 * 
 * States:
 * - Loading: Validating code
 * - Invalid: Code doesn't exist or invalid format
 * - Already Set: User already has a referrer
 * - Self-Referral: User trying to use own code
 * - Valid: Show acceptance form
 * - Success: Referral accepted, show celebration
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { useValidateReferralCode } from '@/hooks/useValidateReferralCode'
import { ReferralAcceptanceForm } from '@/components/referral/ReferralAcceptanceForm'
import { 
  CheckCircleIcon, 
  RefreshIcon,
  HomeIcon
} from '@/components/icons'
import Link from 'next/link'

function JoinPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  
  // Extract referral code from URL
  const refCode = searchParams.get('ref')
  const [showSuccess, setShowSuccess] = useState(false)

  // Validate referral code
  const { isValid, owner, alreadySet, loading, error, refetch } = useValidateReferralCode(
    refCode,
    address
  )

  // Store pending referral in localStorage for post-auth
  useEffect(() => {
    if (refCode && !isConnected) {
      localStorage.setItem('pendingReferral', refCode)
    }
  }, [refCode, isConnected])

  // Clear pending referral after acceptance
  const handleSuccess = () => {
    localStorage.removeItem('pendingReferral')
    setShowSuccess(true)
    
    // Redirect to referral dashboard after 3 seconds
    setTimeout(() => {
      router.push('/referral')
    }, 3000)
  }

  // No referral code in URL
  if (!refCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 text-yellow-400 mx-auto text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-white">
            No Referral Code Provided
          </h1>
          <p className="text-white/70">
            Referral links should include a code parameter. Ask your friend to share their referral link again.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <HomeIcon className="w-5 h-5" />
            Go to Homepage
          </Link>
        </motion.div>
      </div>
    )
  }

  // Loading state
  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <RefreshIcon className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
          <p className="text-white/70">Validating referral code...</p>
        </motion.div>
      </div>
    )
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircleIcon className="w-20 h-20 text-emerald-400 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">
            Welcome Aboard! 🎉
          </h1>
          <p className="text-white/70">
            You've successfully joined with referral code <span className="font-mono font-bold text-blue-400">{refCode.toUpperCase()}</span>
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-emerald-400 font-semibold">+25 Points Earned!</p>
          </div>
          <p className="text-sm text-white/50">
            Redirecting to your referral dashboard...
          </p>
        </motion.div>
      </div>
    )
  }

  // Error states
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 text-red-400 mx-auto text-6xl">❌</div>
          <h1 className="text-2xl font-bold text-white">
            {alreadySet ? 'Already Have a Referrer' : 'Invalid Referral Code'}
          </h1>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
          
          {alreadySet ? (
            <div className="space-y-4">
              <p className="text-white/70">
                You can only set a referrer once. Check your referral dashboard to see who referred you.
              </p>
              <Link
                href="/referral"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                View Referral Dashboard →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={refetch}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshIcon className="w-5 h-5" />
                Retry
              </button>
              <Link
                href="/"
                className="block text-blue-400 hover:text-blue-300 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // Valid code - Show acceptance form
  if (isValid && owner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold text-white"
            >
              Join Gmeowbased! 🐱
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/70 text-lg"
            >
              You've been invited to join the community
            </motion.p>
          </div>

          {/* Acceptance Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ReferralAcceptanceForm
              code={refCode}
              ownerAddress={owner}
              onSuccess={handleSuccess}
              onError={(error) => {
                console.error('[JoinPage] Acceptance error:', error)
              }}
            />
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center pt-6 border-t border-white/10"
          >
            <p className="text-sm text-white/50">
              Don't have a wallet?{' '}
              <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
                Learn how to get started
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Fallback (shouldn't reach here)
  return null
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <RefreshIcon className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
