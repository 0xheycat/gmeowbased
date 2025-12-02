'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'
import { createGMTransaction, hasGMToday, getTodayDateString, getTimeUntilMidnight } from '@/lib/gmeow-utils'
import { useNotifications } from '@/components/ui/live-notifications'

export function GMButton() {
  const { address, isConnected } = useAccount()
  const { sendTransaction, isPending, isSuccess, data: txHash, error: txError } = useSendTransaction()
  const [gmToday, setGmToday] = useState(false)
  const [streak, setStreak] = useState(0)
  const [timeUntilReset, setTimeUntilReset] = useState('')

  const { showNotification } = useNotifications()

  // Check if user already GM'd today (using localStorage for demo)
  useEffect(() => {
    const checkGMStatus = () => {
      const gmHistory = JSON.parse(localStorage.getItem(`gm_history_${address}`) || '[]')
      const lastGM = gmHistory[gmHistory.length - 1]
      setGmToday(hasGMToday(lastGM))
      setStreak(gmHistory.length) // Simple streak calculation for demo
    }
    if (address) checkGMStatus()
  }, [address])

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const timeLeft = getTimeUntilMidnight()
      const hours = Math.floor(timeLeft / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      setTimeUntilReset(`${hours}h ${minutes}m`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleGM = async () => {
    if (!isConnected || gmToday) {
      // Silently skip - no action needed
      return
    }
    try {
      const transaction = createGMTransaction()
      sendTransaction(transaction)
    } catch (error: any) {
      console.error('Failed to send GM transaction:', error?.message || String(error))
    }
  }

  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: `GM! ☀️ Just completed day ${streak + 1} of my GM streak on Base! 🔥\n\nJoin me in spreading good vibes daily 💪`,
        embeds: [window.location.origin],
      })
    } catch (error: any) {
      console.error('Failed to share:', error?.message || String(error))
    }
  }

  // Handle transaction result
  useEffect(() => {
    if (txError) {
      console.error('GM tx error:', txError.message)
    }
  }, [txError])

  useEffect(() => {
    if (isSuccess && txHash) {
      const gmHistory = JSON.parse(localStorage.getItem(`gm_history_${address}`) || '[]')
      gmHistory.push(getTodayDateString())
      localStorage.setItem(`gm_history_${address}`, JSON.stringify(gmHistory))
      setGmToday(true)
      setStreak((prev) => prev + 1)
      showNotification(
        `🎉 GM sent! Streak day ${streak + 1} recorded.`,
        'gm_sent',
        7000,
        'achievement'
      )
    }
  }, [isSuccess, txHash, address, streak, showNotification])

  // UI
  if (gmToday) {
    return (
      <div className="relative site-font">
        <div className="pixel-card space-y-4 text-center">
          <div className="text-6xl mb-2">🔥</div>
          <h2 className="pixel-heading mb-1">GM Sent Today!</h2>
          <p className="text-[var(--px-sub)]">
            Current streak: <span className="font-bold text-orange-300">{streak} days</span>
          </p>
          <p className="text-xs text-[var(--px-sub)]">Next GM in: {timeUntilReset}</p>
          <button onClick={handleShare} className="pixel-button w-full">📢 Share Your Streak</button>
          {txHash && (
            <p className="text-xs text-[var(--px-sub)]">
              <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                View on BaseScan ↗
              </a>
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative site-font">
      <div className="pixel-card space-y-4 text-center">
        <div className="text-6xl mb-2">☀️</div>
        <h2 className="pixel-heading mb-1">Ready for GM?</h2>
        <p className="text-[var(--px-sub)]">Send your daily GM on Base</p>
        {streak > 0 && (
          <p className="text-xs text-[var(--px-sub)]">
            Your streak: <span className="font-bold text-orange-300">{streak} days</span>
          </p>
        )}
        <button
          onClick={handleGM}
          disabled={!isConnected || isPending}
          className="pixel-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="rounded-full h-4 w-4 animate-spin gm-spinner"
              />
              Sending GM…
            </div>
          ) : (
            'Send GM (Free) 🚀'
          )}
        </button>
        <p className="text-xs text-[var(--px-sub)]">Free transaction on Base ⚡</p>
      </div>
    </div>
  )
}