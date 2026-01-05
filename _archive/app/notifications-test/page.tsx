/**
 * Notification Priority System - Test Page
 * 
 * Manual testing interface for priority-based notification system
 * Phase 4: Event System Integration Testing
 * 
 * Tests:
 * - Priority filtering (critical/high/medium/low)
 * - XP rewards display toggle
 * - Per-category priority overrides
 * - All 10 connected event types
 * 
 * DATE: December 15, 2025
 * Website: https://gmeowhq.art
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'

type EventType = 
  | 'tier_mega_viral' | 'tier_viral' | 'tier_popular' | 'tier_engaging' | 'tier_active'
  | 'badge_mythic' | 'badge_legendary' | 'badge_epic' | 'badge_rare' | 'badge_common'
  | 'quest_daily' | 'quest_weekly' | 'quest_special'
  | 'tip_received' | 'tip_milestone'
  | 'gm_streak' | 'gm_reminder'
  | 'level_up' | 'level_milestone'
  | 'reward_referral' | 'reward_bonus'
  | 'social_follow' | 'social_activity'
  | 'mention_cast' | 'mention_reply'
  | 'guild_join' | 'guild_activity'

type Priority = 'critical' | 'high' | 'medium' | 'low'

interface TestEvent {
  type: EventType
  category: 'achievement' | 'badge' | 'quest' | 'tip' | 'gm' | 'level' | 'reward' | 'social' | 'mention' | 'guild'
  name: string
  xp: number
  priority: Priority
  emoji: string
}

const TEST_EVENTS: TestEvent[] = [
  // Viral Tiers (achievement category - critical/high/medium)
  { type: 'tier_mega_viral', category: 'achievement', name: 'Mega Viral Cast', xp: 200, priority: 'critical', emoji: '🔥' },
  { type: 'tier_viral', category: 'achievement', name: 'Viral Cast', xp: 150, priority: 'critical', emoji: '⚡' },
  { type: 'tier_popular', category: 'achievement', name: 'Popular Cast', xp: 100, priority: 'high', emoji: '✨' },
  { type: 'tier_engaging', category: 'achievement', name: 'Engaging Cast', xp: 50, priority: 'high', emoji: '💫' },
  { type: 'tier_active', category: 'achievement', name: 'Active Cast', xp: 25, priority: 'medium', emoji: '🌟' },
  
  // Badges (badge category - high/medium)
  { type: 'badge_mythic', category: 'badge', name: 'Mythic Badge', xp: 100, priority: 'high', emoji: '👑' },
  { type: 'badge_legendary', category: 'badge', name: 'Legendary Badge', xp: 75, priority: 'high', emoji: '🏆' },
  { type: 'badge_epic', category: 'badge', name: 'Epic Badge', xp: 50, priority: 'high', emoji: '💎' },
  { type: 'badge_rare', category: 'badge', name: 'Rare Badge', xp: 35, priority: 'medium', emoji: '🎖️' },
  { type: 'badge_common', category: 'badge', name: 'Common Badge', xp: 25, priority: 'medium', emoji: '🏅' },
  
  // Quests (quest category - medium/high)
  { type: 'quest_daily', category: 'quest', name: 'Daily Quest', xp: 20, priority: 'medium', emoji: '📋' },
  { type: 'quest_weekly', category: 'quest', name: 'Weekly Quest', xp: 50, priority: 'medium', emoji: '📅' },
  { type: 'quest_special', category: 'quest', name: 'Special Quest', xp: 100, priority: 'high', emoji: '⭐' },
  
  // Tips (tip category - medium/high)
  { type: 'tip_received', category: 'tip', name: 'Tip Received', xp: 10, priority: 'medium', emoji: '💰' },
  { type: 'tip_milestone', category: 'tip', name: 'Tip Milestone', xp: 50, priority: 'high', emoji: '💵' },
  
  // GM (gm category - low)
  { type: 'gm_streak', category: 'gm', name: 'GM Streak', xp: 5, priority: 'low', emoji: '☀️' },
  { type: 'gm_reminder', category: 'gm', name: 'GM Reminder', xp: 0, priority: 'low', emoji: '⏰' },
  
  // Levels (level category - high/critical)
  { type: 'level_up', category: 'level', name: 'Level Up', xp: 100, priority: 'high', emoji: '🆙' },
  { type: 'level_milestone', category: 'level', name: 'Level Milestone', xp: 200, priority: 'critical', emoji: '🎯' },
  
  // Rewards (reward category - high)
  { type: 'reward_referral', category: 'reward', name: 'Referral Reward', xp: 50, priority: 'high', emoji: '🎁' },
  { type: 'reward_bonus', category: 'reward', name: 'Bonus Reward', xp: 75, priority: 'high', emoji: '🎉' },
  
  // Social (social category - low)
  { type: 'social_follow', category: 'social', name: 'New Follower', xp: 5, priority: 'low', emoji: '👥' },
  { type: 'social_activity', category: 'social', name: 'Friend Activity', xp: 5, priority: 'low', emoji: '🤝' },
  
  // Mentions (mention category - medium)
  { type: 'mention_cast', category: 'mention', name: 'Mentioned in Cast', xp: 10, priority: 'medium', emoji: '💬' },
  { type: 'mention_reply', category: 'mention', name: 'Reply to Cast', xp: 10, priority: 'medium', emoji: '↩️' },
  
  // Guild (guild category - medium)
  { type: 'guild_join', category: 'guild', name: 'Guild Member', xp: 20, priority: 'medium', emoji: '🏰' },
  { type: 'guild_activity', category: 'guild', name: 'Guild Activity', xp: 15, priority: 'medium', emoji: '⚔️' },
]

export default function NotificationTestPage() {
  // Get actual auth state (this is what NotificationBell uses!)
  const { fid, address, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [testFid, setTestFid] = useState('18139')
  const [selectedEvent, setSelectedEvent] = useState<EventType>('tier_active')
  const [lastResult, setLastResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [showTestResults, setShowTestResults] = useState(false)

  const selectedEventData = TEST_EVENTS.find(e => e.type === selectedEvent)!

  const handleCheckAuth = async () => {
    try {
      // First check client-side auth context (this is what the bell uses!)
      console.log('[Check Auth] Current useAuth() state:', { fid, address })
      
      // If we have auth from context, show it immediately
      if (fid) {
        setAuthInfo({
          authenticated: true,
          fid: fid,
          source: 'AuthContext (client)',
          address: address,
          note: 'This is what NotificationBell sees',
        })
        return
      }
      
      // Fallback: check server-side cookies (less reliable)
      const response = await fetch('/api/auth/whoami')
      const data = await response.json()
      setAuthInfo({
        ...data,
        source: 'Cookies (server)',
        note: data.authenticated 
          ? 'FID found in cookies' 
          : 'No FID in cookies - but check AuthContext above',
      })
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthInfo({ 
        authenticated: false,
        error: 'Failed to fetch auth info',
        source: 'Error',
      })
    }
  }

  const handleCheckDatabase = async () => {
    try {
      const response = await fetch(`/api/notifications/debug?fid=${testFid}`)
      const data = await response.json()
      setDebugInfo(data)
      setShowDebug(true)
    } catch (error) {
      console.error('Debug check failed:', error)
      setDebugInfo({ error: 'Failed to fetch debug info' })
    }
  }

  const handleRunFullTest = async () => {
    setIsLoading(true)
    const results: any[] = []
    
    for (const event of TEST_EVENTS) {
      try {
        // Send test notification
        const sendResponse = await fetch('/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: parseInt(testFid), eventType: event.type }),
        })
        const sendResult = await sendResponse.json()
        
        // Wait 500ms for database write
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if notification exists in database
        const debugResponse = await fetch(`/api/notifications/debug?fid=${testFid}`)
        const debugData = await debugResponse.json()
        
        // Check if this notification appears in recent notifications
        const found = debugData.recentNotifications?.some((n: any) => 
          n.title?.includes(event.name) || n.description?.includes(event.name)
        )
        
        results.push({
          event: event.name,
          type: event.type,
          category: event.category,
          priority: event.priority,
          saved: sendResult.inAppNotification?.saved || false,
          foundInDB: found,
          passed: sendResult.inAppNotification?.saved && found,
          pushSent: sendResult.pushNotification?.sent || false,
          error: sendResult.error || null,
        })
        
        console.log(`[Test] ${event.name}: ${sendResult.inAppNotification?.saved && found ? '✅ PASS' : '❌ FAIL'}`)
      } catch (error) {
        results.push({
          event: event.name,
          type: event.type,
          category: event.category,
          priority: event.priority,
          saved: false,
          foundInDB: false,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    setTestResults(results)
    setShowTestResults(true)
    setIsLoading(false)
  }

  const handleSendNotification = async () => {
    setIsLoading(true)
    setLastResult('')

    try {
      const fid = parseInt(testFid)
      if (isNaN(fid) || fid <= 0) {
        setLastResult('❌ Invalid FID - must be a positive number')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid,
          eventType: selectedEvent,
        }),
      })

      const result = await response.json()

      // Show comprehensive status
      let message = ''
      
      // In-app notification status
      if (result.inAppNotification?.saved) {
        message += `✅ In-App Notification Saved\n`
        message += `📍 Location: ${result.inAppNotification.location}\n\n`
        message += `🔔 TO SEE NOTIFICATION:\n`
        message += `1. Look at bell icon (top right) for badge number\n`
        message += `2. Click the bell to open dropdown\n`
        message += `3. Bell auto-refreshes when opened\n`
        message += `4. Or click the refresh button in the dropdown\n\n`
      } else {
        message += `❌ In-App Notification Failed to Save\n`
        message += `⚠️ Error: ${result.inAppNotification?.message || 'Unknown error'}\n`
        message += `🐛 Check browser console for details\n\n`
      }
      
      // Push notification status
      if (result.pushNotification?.sent) {
        message += `✅ Push Notification Sent\n`
        message += `📱 Check Farcaster app for push notification\n`
        message += `Event: ${result.event} (+${result.xp} XP)\n`
        message += `Priority: ${result.priority?.toUpperCase()}\n`
      } else {
        message += `⚠️ Push Notification Not Sent\n\n`
        
        const reason = result.pushNotification?.reason || 'Unknown'
        message += `Reason: ${reason}\n\n`
        
        if (result.pushNotification?.filtered) {
          message += `🔍 Priority Filter Active:\n`
          message += `• Event priority: ${result.priority?.toUpperCase()}\n`
          message += `• Category: ${result.category}\n`
          message += `\n💡 To receive push notifications:\n`
          message += `1. Go to /settings\n`
          message += `2. Lower your priority threshold to "${result.priority}" or below\n`
          message += `3. Or set "${result.category}" category override to "low"\n`
          message += `4. Try again\n\n`
          message += `Note: In-app notification still saved! Check your bell 🔔`
        } else if (result.pushNotification?.rateLimited) {
          message += `⏱️ Rate limit exceeded. Wait 30 seconds and try again.\n\n`
          message += `Note: In-app notification still saved! Check your bell 🔔`
        } else {
          message += `This usually means:\n`
          message += `• FID ${testFid} doesn't have notification token registered\n`
          message += `• User hasn't enabled push in Farcaster app\n`
          message += `• Neynar API error\n\n`
          message += `✅ Good news: In-app notification is saved!\n`
          message += `Check your notification bell (top right) 🔔`
        }
      }
      
      setLastResult(message)
    } catch (error) {
      setLastResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">
            Notification Priority System - Test Page
          </h1>
          <p className="mt-2 text-lg text-zinc-400">
            Phase 4: Event System Integration Testing
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Test priority filtering, XP rewards, and category overrides
          </p>
        </div>

        {/* Bell Notification Banner */}
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">🔔</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-400">Test Notifications Saved to Bell</h3>
              <p className="mt-1 text-sm text-blue-300/80">
                All test notifications are saved to your notification history, even if push notifications are filtered.
                Check the <strong>notification bell (top right)</strong> to see all test results.
              </p>
              <div className="mt-2 flex gap-2">
                <span className="text-xs text-blue-300/60">✅ In-app notifications: Always saved</span>
                <span className="text-xs text-blue-300/60">📱 Push notifications: Depends on priority threshold</span>
              </div>
            </div>
          </div>
        </div>

        {/* Important: FID Authentication Notice */}
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-400">Important: You Must Be Logged In</h3>
              <p className="mt-1 text-sm text-yellow-300/80">
                The notification bell only shows notifications for the <strong>currently logged-in FID</strong>.
                Testing with a different FID (like 18139) won't show in your bell unless you're logged in as that FID.
              </p>
              <div className="mt-2 space-y-1 text-xs text-yellow-300/70">
                <div>✅ To test: Use your own FID (the one you're logged in with)</div>
                <div>✅ Check browser console: Look for "[NotificationBell] Loading notifications for FID: YOUR_FID"</div>
                <div>✅ Click "Check Database" to verify notifications were saved</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Test Controls */}
          <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-white">Test Controls</h2>

            {/* FID Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Test Farcaster ID
              </label>
              <input
                type="text"
                value={testFid}
                onChange={(e) => setTestFid(e.target.value)}
                placeholder="Enter FID (e.g., 18139)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                User must have notification preferences set up
              </p>
            </div>

            {/* Event Type Selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Event Type ({TEST_EVENTS.length} test events across 10 categories)
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value as EventType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="🏆 Achievement (Viral Tiers) - Critical/High/Medium">
                  {TEST_EVENTS.filter(e => e.category === 'achievement').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏅 Badges - High/Medium">
                  {TEST_EVENTS.filter(e => e.category === 'badge').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📋 Quests - Medium/High">
                  {TEST_EVENTS.filter(e => e.category === 'quest').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="💰 Tips - Medium/High">
                  {TEST_EVENTS.filter(e => e.category === 'tip').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🆙 Levels - High/Critical">
                  {TEST_EVENTS.filter(e => e.category === 'level').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🎁 Rewards - High">
                  {TEST_EVENTS.filter(e => e.category === 'reward').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="💬 Mentions - Medium">
                  {TEST_EVENTS.filter(e => e.category === 'mention').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏰 Guild - Medium">
                  {TEST_EVENTS.filter(e => e.category === 'guild').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="☀️ GM - Low">
                  {TEST_EVENTS.filter(e => e.category === 'gm').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👥 Social - Low">
                  {TEST_EVENTS.filter(e => e.category === 'social').map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.emoji} {event.name} (+{event.xp} XP) - {event.priority}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selected Event Info */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">Selected Event</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Event:</span>
                  <span className="text-white">{selectedEventData.emoji} {selectedEventData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category:</span>
                  <span className="text-white">{selectedEventData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">XP Reward:</span>
                  <span className="font-semibold text-green-400">+{selectedEventData.xp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Priority:</span>
                  <span className={`font-medium ${
                    selectedEventData.priority === 'critical' ? 'text-red-400' :
                    selectedEventData.priority === 'high' ? 'text-orange-400' :
                    selectedEventData.priority === 'medium' ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    {selectedEventData.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category:</span>
                  <span className="text-white">{selectedEventData.category}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleSendNotification}
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {isLoading ? 'Sending...' : '🔔 Send Single'}
              </button>
              <button
                onClick={handleRunFullTest}
                disabled={isLoading}
                className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {isLoading ? '⏳ Testing...' : '🧪 Test All Events'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCheckDatabase}
                className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                🔍 Check DB
              </button>
              <button
                onClick={handleCheckAuth}
                className="rounded-lg border border-purple-600 bg-purple-900/30 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-800/30"
              >
                👤 My FID
              </button>
            </div>

            {/* Real-time Auth Status (what NotificationBell sees) */}
            <div className={`rounded-lg border p-4 ${
              isAuthenticated && fid
                ? 'border-green-800 bg-green-950/20' 
                : 'border-yellow-800 bg-yellow-950/20'
            }`}>
              <div className="text-sm space-y-2">
                <div className="font-semibold text-white/90 mb-2">
                  🔐 Current Authentication (Real-time)
                </div>
                
                {authLoading ? (
                  <div className="text-yellow-400">⏳ Loading auth state...</div>
                ) : isAuthenticated && fid ? (
                  <>
                    <div className="font-semibold text-green-400">
                      ✅ Authenticated as FID: {fid}
                    </div>
                    {address && (
                      <div className="text-xs text-green-300/70">
                        Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                      </div>
                    )}
                    <div className="text-xs text-green-300/70 mt-1">
                      NotificationBell will show notifications for FID {fid}
                    </div>
                    
                    {testFid !== String(fid) && (
                      <div className="mt-2 rounded bg-yellow-900/30 p-2 text-xs text-yellow-300">
                        ⚠️ <strong>FID Mismatch!</strong><br/>
                        Testing with: FID {testFid}<br/>
                        Logged in as: FID {fid}<br/>
                        <span className="text-yellow-400">
                          → Use FID {fid} for testing to see notifications in bell
                        </span>
                      </div>
                    )}
                  </>
                ) : address ? (
                  <>
                    <div className="font-semibold text-yellow-400">
                      ⚠️ Wallet connected but no Farcaster profile found
                    </div>
                    <div className="text-xs text-yellow-300/70">
                      Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                    <div className="text-xs text-yellow-300/70 mt-1">
                      This wallet may not be linked to a Farcaster account.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-yellow-400">
                      ⚠️ Not authenticated
                    </div>
                    <div className="text-xs text-yellow-300/70">
                      Connect your wallet to see notifications in the bell.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Auth Info from API (if checked) */}
            {authInfo && (
              <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-3 mt-2">
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-blue-400 mb-1">
                    🔍 Server-side Check ({authInfo.source})
                  </div>
                  <pre className="text-xs text-blue-300/70 overflow-auto">
                    {JSON.stringify(authInfo, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result Display */}
            {lastResult && (
              <div className={`rounded-lg border p-4 ${
                lastResult.startsWith('✅') ? 'border-green-800 bg-green-950/50' :
                lastResult.startsWith('⚠️') ? 'border-yellow-800 bg-yellow-950/50' :
                'border-red-800 bg-red-950/50'
              }`}>
                <pre className="whitespace-pre-wrap text-sm text-zinc-300">
                  {lastResult}
                </pre>
              </div>
            )}

            {/* Debug Info Panel */}
            {showDebug && debugInfo && (
              <div className="rounded-lg border border-purple-800 bg-purple-950/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-purple-400">🔍 Database Debug Info</h3>
                  <button
                    onClick={() => setShowDebug(false)}
                    className="text-xs text-purple-300 hover:text-purple-100"
                  >
                    Close
                  </button>
                </div>
                
                {debugInfo.error ? (
                  <div className="text-red-400">{debugInfo.error}</div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2 rounded bg-purple-900/30 p-3">
                      <div>
                        <div className="text-xs text-purple-300">Total</div>
                        <div className="text-lg font-bold text-white">{debugInfo.counts?.total || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-300">Active</div>
                        <div className="text-lg font-bold text-green-400">{debugInfo.counts?.active || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-300">Test</div>
                        <div className="text-lg font-bold text-blue-400">{debugInfo.counts?.test || 0}</div>
                      </div>
                    </div>

                    {debugInfo.recentNotifications && debugInfo.recentNotifications.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-purple-300">Recent Notifications:</div>
                        <div className="max-h-40 space-y-1 overflow-y-auto rounded bg-zinc-900/50 p-2">
                          {debugInfo.recentNotifications.map((notif: any, i: number) => (
                            <div key={i} className="text-xs text-zinc-400">
                              <span className="text-purple-300">{notif.title}</span> · {notif.category} · {new Date(notif.created_at).toLocaleTimeString()}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded bg-zinc-900/50 p-3 text-center text-zinc-500">
                        No notifications found in database for FID {testFid}
                      </div>
                    )}

                    {debugInfo.errors?.all && (
                      <div className="rounded bg-red-900/20 p-2 text-xs text-red-400">
                        Error: {debugInfo.errors.all}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Test Results Panel */}
            {showTestResults && testResults.length > 0 && (
              <div className="rounded-lg border border-green-800 bg-green-950/20 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-400">🧪 Full System Test Results</h3>
                    <p className="text-xs text-green-300/70 mt-1">
                      Tested {testResults.length} events · {testResults.filter(r => r.passed).length} passed · {testResults.filter(r => !r.passed).length} failed
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTestResults(false)}
                    className="text-xs text-green-300 hover:text-green-100"
                  >
                    Close
                  </button>
                </div>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4 rounded bg-green-900/30 p-3">
                  <div className="text-center">
                    <div className="text-xs text-green-300">Total</div>
                    <div className="text-lg font-bold text-white">{testResults.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-green-300">Passed</div>
                    <div className="text-lg font-bold text-green-400">{testResults.filter(r => r.passed).length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-red-300">Failed</div>
                    <div className="text-lg font-bold text-red-400">{testResults.filter(r => !r.passed).length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-blue-300">Success Rate</div>
                    <div className="text-lg font-bold text-blue-400">
                      {Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Results List */}
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {testResults.map((result, i) => (
                    <div 
                      key={i}
                      className={`rounded border p-3 text-xs ${
                        result.passed 
                          ? 'border-green-700 bg-green-900/20' 
                          : 'border-red-700 bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {result.passed ? '✅' : '❌'}
                            </span>
                            <span className="font-semibold text-white">
                              {result.event}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              result.priority === 'critical' ? 'bg-red-900/50 text-red-300' :
                              result.priority === 'high' ? 'bg-orange-900/50 text-orange-300' :
                              result.priority === 'medium' ? 'bg-blue-900/50 text-blue-300' :
                              'bg-gray-900/50 text-gray-300'
                            }`}>
                              {result.priority}
                            </span>
                          </div>
                          <div className="mt-1 text-zinc-400">
                            {result.category} · {result.type}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className={result.saved ? 'text-green-400' : 'text-red-400'}>
                          {result.saved ? '✓' : '✗'} Saved to DB
                        </div>
                        <div className={result.foundInDB ? 'text-green-400' : 'text-red-400'}>
                          {result.foundInDB ? '✓' : '✗'} Found in DB
                        </div>
                        <div className={result.pushSent ? 'text-blue-400' : 'text-zinc-500'}>
                          {result.pushSent ? '✓' : '○'} Push Sent
                        </div>
                      </div>
                      
                      {result.error && (
                        <div className="mt-2 rounded bg-red-900/30 p-2 text-xs text-red-300">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Export Button */}
                <button
                  onClick={() => {
                    const data = JSON.stringify(testResults, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `notification-test-results-${Date.now()}.json`
                    a.click()
                  }}
                  className="mt-4 w-full rounded-lg border border-green-600 bg-green-900/30 px-4 py-2 text-sm font-semibold text-green-300 transition-colors hover:bg-green-800/30"
                >
                  📥 Export Results as JSON
                </button>
              </div>
            )}
          </div>

          {/* Documentation */}
          <div className="space-y-6">
            {/* Testing Instructions */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-white">Testing Instructions</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-zinc-300">1. Setup User Preferences</h3>
                  <p className="text-zinc-400">
                    Go to <code className="rounded bg-zinc-800 px-1 py-0.5 text-blue-400">/settings</code> and configure:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-500">
                    <li>Priority threshold (critical/high/medium/low)</li>
                    <li>XP rewards display toggle</li>
                    <li>Per-category priority overrides</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-zinc-300">2. Test Priority Filtering</h3>
                  <ul className="space-y-1 text-zinc-400">
                    <li>• Set threshold to <strong>high</strong></li>
                    <li>• Send <strong>medium</strong> priority event → should NOT send</li>
                    <li>• Send <strong>high</strong> priority event → should send</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-zinc-300">3. Test XP Display</h3>
                  <ul className="space-y-1 text-zinc-400">
                    <li>• Toggle XP display <strong>off</strong> → no "+X XP" in body</li>
                    <li>• Toggle XP display <strong>on</strong> → includes "+X XP"</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-zinc-300">4. Test Category Override</h3>
                  <ul className="space-y-1 text-zinc-400">
                    <li>• Set badge category to <strong>low</strong> priority</li>
                    <li>• Set threshold to <strong>medium</strong></li>
                    <li>• Badge events should NOT send push</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Notification Bell Integration */}
            <div className="rounded-2xl border border-purple-800 bg-purple-950/20 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-purple-400">🔔 Notification Bell Integration</h2>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-purple-900/30 p-3">
                  <div className="font-semibold text-purple-300">Two-Tier Notification System</div>
                  <div className="mt-2 text-purple-200/80">
                    Every test notification is saved to two places:
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400">1.</span>
                    <div>
                      <div className="font-semibold text-white">In-App (Notification Bell)</div>
                      <div className="text-zinc-400">
                        ✅ Always saved to <code className="text-purple-300">user_notification_history</code> table
                      </div>
                      <div className="text-zinc-400">
                        ✅ Appears in bell dropdown (top right)
                      </div>
                      <div className="text-zinc-400">
                        ✅ Shows even if push notification is filtered
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400">2.</span>
                    <div>
                      <div className="font-semibold text-white">Push Notification (Farcaster)</div>
                      <div className="text-zinc-400">
                        ⚡ Sent via Neynar API
                      </div>
                      <div className="text-zinc-400">
                        🔒 Respects priority threshold settings
                      </div>
                      <div className="text-zinc-400">
                        ⚠️ Requires user to have notification token
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 rounded-lg border border-purple-700/30 bg-purple-900/20 p-3">
                  <div className="text-xs text-purple-300">
                    <strong>💡 Pro Tip:</strong> Check your notification bell after each test to see
                    all notifications, including those filtered from push. This helps identify
                    whether filtering is working correctly or if there are token/API issues.
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 4 Status */}
            <div className="rounded-2xl border border-green-800 bg-green-950/20 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-green-400">Phase 4 Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <div className="font-semibold text-white">Event Systems Connected (3)</div>
                    <div className="text-zinc-400">Viral tiers, badge awards, badge mints</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <div className="font-semibold text-white">Priority Filtering</div>
                    <div className="text-zinc-400">All events respect user thresholds</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <div className="font-semibold text-white">Bell Integration</div>
                    <div className="text-zinc-400">All tests saved to notification history</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <div className="font-semibold text-white">XP Rewards Integration</div>
                    <div className="text-zinc-400">27 event types with XP amounts</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <div>
                    <div className="font-semibold text-white">Manual Testing Required</div>
                    <div className="text-zinc-400">Use this page to verify filtering works</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Coverage */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-white">Test Coverage</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Test Events:</span>
                  <span className="font-semibold text-green-400">{TEST_EVENTS.length} types</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Categories:</span>
                  <span className="text-white">10 categories</span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🏆 Achievement</span>
                    <span className="text-zinc-400">5 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🏅 Badge</span>
                    <span className="text-zinc-400">5 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">📋 Quest</span>
                    <span className="text-zinc-400">3 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">💰 Tip</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🆙 Level</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🎁 Reward</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">💬 Mention</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🏰 Guild</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">☀️ GM</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">👥 Social</span>
                    <span className="text-zinc-400">2 events</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/settings"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700"
            >
              ⚙️ Settings
            </a>
            <a
              href="/notifications"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700"
            >
              🔔 Notifications
            </a>
            <a
              href="/profile"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700"
            >
              👤 Profile
            </a>
            <a
              href="/api/notifications/preferences"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700"
            >
              📡 API Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
