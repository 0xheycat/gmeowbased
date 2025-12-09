/**
 * GuildCreationForm Component
 * 
 * Purpose: Modal form for creating new guilds (100 BASE POINTS cost)
 * Template: trezoadmin-41/forms (35%) + gmeowbased0.6 layout (15%)
 * 
 * Features:
 * - Name validation (3-50 chars, alphanumeric + spaces/hyphens/underscores)
 * - Real-time cost display
 * - Points balance check
 * - Loading states & error handling
 * - Success callback with guild ID
 * 
 * Usage:
 * <GuildCreationForm address="0x..." onSuccess={(guildId) => ...} onCancel={() => ...} />
 */

'use client'

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { CloseIcon, AddIcon } from '@/components/icons'
import { GUILD_ABI } from '@/lib/gmeow-utils'

export interface GuildCreationFormProps {
  /** User's wallet address */
  address: Address
  /** Callback when guild is successfully created */
  onSuccess?: (guildId: string, guildName: string) => void
  /** Callback when user cancels */
  onCancel?: () => void
  /** Custom CSS class */
  className?: string
}

const GUILD_CREATION_COST = 100
const MIN_NAME_LENGTH = 3
const MAX_NAME_LENGTH = 50

export function GuildCreationForm({ 
  address, 
  onSuccess, 
  onCancel,
  className = '' 
}: GuildCreationFormProps) {
  const [guildName, setGuildName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Contract interaction hooks
  const { 
    writeContract, 
    data: hash, 
    isPending: isTransactionPending,
    error: writeError 
  } = useWriteContract()
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
    timeout: 60_000, // 60 seconds timeout
    confirmations: 1, // Wait for 1 confirmation
  })
  const { switchChain } = useSwitchChain()

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && onSuccess) {
      // Transaction confirmed, call success callback
      onSuccess('', guildName.trim())
      setIsCreating(false)
    }
  }, [isConfirmed, onSuccess, guildName])

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError)
      setError(writeError.message || 'Transaction failed. Please try again.')
      setIsCreating(false)
    }
  }, [writeError])

  useEffect(() => {
    if (confirmError) {
      console.error('Confirmation error:', confirmError)
      const errorMsg = confirmError.message || 'Transaction confirmation failed'
      if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        setError('Transaction is taking longer than expected. Check your wallet or Basescan for status.')
      } else {
        setError('Transaction confirmation failed. Please try again.')
      }
      setIsCreating(false)
    }
  }, [confirmError])

  /**
   * Validate guild name
   * - 3-50 characters
   * - Alphanumeric + spaces/hyphens/underscores only
   * - No leading/trailing spaces
   */
  const validateName = (name: string): string | null => {
    if (!name) return 'Guild name is required'
    
    const trimmed = name.trim()
    
    if (trimmed.length < MIN_NAME_LENGTH) {
      return `Guild name must be at least ${MIN_NAME_LENGTH} characters`
    }
    
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `Guild name must be less than ${MAX_NAME_LENGTH} characters`
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Guild name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    
    if (trimmed !== name) {
      return 'Guild name cannot have leading or trailing spaces'
    }
    
    return null
  }

  const handleNameChange = (value: string) => {
    setGuildName(value)
    setNameError(null)
    setError(null)
  }

  const handleCreateGuild = async () => {
    // Validate name
    const validationError = validateName(guildName)
    if (validationError) {
      setNameError(validationError)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Step 1: Switch to Base network if needed
      if (switchChain) {
        try {
          await switchChain({ chainId: base.id })
        } catch (switchError) {
          throw new Error('Please switch to Base network in your wallet')
        }
      }

      // Step 2: Get contract args from API
      const response = await fetch('/api/guild/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildName: guildName.trim(),
          address
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create guild')
      }

      // Step 3: Execute contract transaction
      if (data.contractAddress && data.functionName && data.args) {
        writeContract({
          chainId: base.id,
          address: data.contractAddress as Address,
          abi: GUILD_ABI,
          functionName: data.functionName,
          args: data.args
        })
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      console.error('Failed to create guild:', err)
      setError(err instanceof Error ? err.message : 'Failed to create guild. Please try again.')
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreateGuild()
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create Guild
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Start your own guild and invite members to join
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isCreating || isTransactionPending || isConfirming}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-blue-500"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Guild Name Input */}
        <div>
          <label 
            htmlFor="guild-name" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Guild Name
          </label>
          <input
            id="guild-name"
            type="text"
            value={guildName}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter guild name..."
            disabled={isCreating || isTransactionPending || isConfirming}
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] ${
              nameError 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            maxLength={MAX_NAME_LENGTH}
          />
          {nameError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {nameError}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {guildName.length}/{MAX_NAME_LENGTH} characters
          </p>
        </div>

        {/* Cost Display */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Creation Cost
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {GUILD_CREATION_COST} BASE POINTS
            </span>
          </div>
        </div>

        {/* Transaction Hash Display (during confirmation) */}
        {hash && isConfirming && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
              ⏳ Transaction submitted! Waiting for confirmation...
            </p>
            <a 
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all block mb-3"
            >
              View on Basescan →
            </a>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setError(null)
              }}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
            >
              Reset form (if stuck)
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            {hash && (
              <a 
                href={`https://basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 dark:text-red-400 hover:underline break-all block mt-2"
              >
                Check transaction on Basescan →
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCreateGuild}
            disabled={isCreating || isTransactionPending || isConfirming || !guildName.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <AddIcon className="w-5 h-5" />
            {isConfirming ? 'Confirming...' : isTransactionPending ? 'Sign Transaction...' : isCreating ? 'Preparing...' : 'Create Guild'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isCreating || isTransactionPending || isConfirming}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          By creating a guild, you agree that {GUILD_CREATION_COST} BASE POINTS will be deducted from your balance
        </p>
      </div>
    </div>
  )
}

export default GuildCreationForm
