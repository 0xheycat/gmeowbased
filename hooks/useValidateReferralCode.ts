/**
 * useValidateReferralCode Hook
 * 
 * Validates referral code and checks user eligibility
 * Used in /join page to verify codes before acceptance
 * 
 * Validations:
 * - Code exists in contract
 * - User doesn't already have a referrer
 * - User isn't trying to refer themselves
 * 
 * @example
 * const { isValid, owner, alreadySet, loading, error } = useValidateReferralCode('MEOW123', address)
 */

import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import {
  getReferralOwner,
  canSetReferrer,
  validateReferralCode,
} from '@/lib/contracts/referral-contract'

export interface ValidateReferralCodeResult {
  /** Whether the code is valid and user can accept it */
  isValid: boolean
  /** Owner address of the referral code */
  owner: Address | null
  /** Whether user already has a referrer set */
  alreadySet: boolean
  /** Loading state during validation */
  loading: boolean
  /** Error message if validation fails */
  error: string | null
  /** Retry validation */
  refetch: () => void
}

/**
 * Hook to validate referral code and check user eligibility
 * 
 * @param code - Referral code from URL parameter (null to skip validation)
 * @param userAddress - Current user's wallet address (undefined if not connected)
 * @returns Validation result with isValid, owner, alreadySet, loading, error
 */
export function useValidateReferralCode(
  code: string | null,
  userAddress: Address | undefined
): ValidateReferralCodeResult {
  const [isValid, setIsValid] = useState(false)
  const [owner, setOwner] = useState<Address | null>(null)
  const [alreadySet, setAlreadySet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    let mounted = true

    const validate = async () => {
      // Skip if no code provided
      if (!code) {
        setLoading(false)
        setError('No referral code provided')
        return
      }

      setLoading(true)
      setError(null)
      setIsValid(false)
      setOwner(null)
      setAlreadySet(false)

      try {
        // Step 1: Validate code format
        const formatValidation = validateReferralCode(code.toUpperCase())
        if (!formatValidation.valid) {
          if (!mounted) return
          setError(formatValidation.error || 'Invalid code format')
          setLoading(false)
          return
        }

        // Step 2: Check if code exists on-chain
        const codeOwner = await getReferralOwner(code.toUpperCase())
        if (!codeOwner) {
          if (!mounted) return
          setError('Referral code does not exist')
          setLoading(false)
          return
        }

        if (!mounted) return
        setOwner(codeOwner)

        // If user not connected, code is valid but can't check user-specific conditions
        if (!userAddress) {
          setIsValid(true) // Valid code, but need wallet to proceed
          setLoading(false)
          return
        }

        // Step 3: Check if user is trying to refer themselves
        if (codeOwner.toLowerCase() === userAddress.toLowerCase()) {
          setError('You cannot use your own referral code')
          setLoading(false)
          return
        }

        // Step 4: Check if user already has a referrer
        const canSet = await canSetReferrer(userAddress)
        if (!canSet) {
          setAlreadySet(true)
          setError('You already have a referrer set')
          setLoading(false)
          return
        }

        // All checks passed!
        if (!mounted) return
        setIsValid(true)
        setLoading(false)
      } catch (err) {
        console.error('[useValidateReferralCode] Validation error:', err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to validate referral code')
        setLoading(false)
      }
    }

    validate()

    return () => {
      mounted = false
    }
  }, [code, userAddress, refetchTrigger])

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  return {
    isValid,
    owner,
    alreadySet,
    loading,
    error,
    refetch,
  }
}
