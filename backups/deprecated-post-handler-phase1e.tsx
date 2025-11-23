/**
 * DEPRECATED POST HANDLER - Phase 1E
 * 
 * This file contains the POST handler that was removed from app/api/frame/route.tsx
 * in Phase 1F (November 23, 2025) as part of Task 6.
 * 
 * REASON FOR REMOVAL:
 * - Farcaster deprecated POST buttons in 2024
 * - All frames migrated to 'link' action buttons in Phase 1E
 * - Handler was already commented out and non-functional
 * - 0 frames use POST actions (verified via grep)
 * 
 * PRESERVED FOR:
 * - Future reference if POST buttons are re-enabled
 * - Historical context for frame system evolution
 * - Potential reuse of action handler logic
 * 
 * ORIGINAL LOCATION: app/api/frame/route.tsx, lines 2930-3928 (999 lines)
 * REMOVED: November 23, 2025 (Phase 1F Task 6)
 * 
 * ACTION HANDLERS INCLUDED (15+):
 * - proxyVerify, verifyQuest: Quest verification proxy
 * - claimSig: Quest completion with signature
 * - joinGuild, createReferral: Blockchain transaction builders
 * - pointsMergePreview: Multi-chain points aggregation
 * - recordGM: GM button tracking (Supabase: gmeow_rank_events)
 * - getGMStats: Retrieve GM statistics (Supabase: frame_sessions)
 * - questProgress: Multi-step quest tracking
 * - viewBalance: On-chain points balance lookup
 * - refreshRank: Leaderboard rank query (Supabase: leaderboard_snapshots)
 * - checkBadges, mintBadge: Badge system (Supabase: user_badges, badge_templates)
 * - refreshStats: Mock onchain statistics
 * - viewGuild: Guild details (not yet implemented in DB)
 * - viewReferrals: Referral statistics (not yet implemented in DB)
 * - tipUser: Points tipping (mock implementation)
 * 
 * DEPENDENCIES:
 * - Rate limiting (GI-8 security)
 * - Supabase tables: gmeow_rank_events, frame_sessions, leaderboard_snapshots, user_badges, badge_templates
 * - @/lib/frame-state: generateSessionId, saveFrameState, loadFrameState
 * - @/lib/frame-messages: buildGMSuccessMessage, buildQuestProgressMessage, buildQuestCompleteMessage
 * - @/lib/frame-cache: invalidateUserFrames
 * - @/lib/fetch-user-stats: fetchUserStatsOnChain
 * - @/lib/rank-progress: calculateRankProgress
 * - Button action mappings for 9 frame types
 * 
 * USAGE (IF RE-ENABLED):
 * 1. Uncomment the export statement below
 * 2. Update CORS headers to include POST method
 * 3. Verify Farcaster supports POST buttons again
 * 4. Test all action handlers with real frame POST requests
 * 5. Update button mappings if frame types changed
 */

// NOTE: This code was commented out in the original file
// Uncomment the function below if POST buttons are re-enabled by Farcaster

/*
 * POST: interactive actions
 * Body:
 *  - action: "verifyQuest" | "claimSig" | "joinGuild" | "createReferral" | "proxyVerify"
 *  - payload: depends on action
 *
 * This endpoint is a convenience proxy to perform server-side operations, produce
 * signed messages, and return JSON. It does not mutate chain state (no tx sent).
 */
 
export async function POST(req: Request) {
  // Rate limiting (GI-8 security requirement)
  const clientIp = getClientIp(req)
  const { success } = await rateLimit(clientIp, apiLimiter)
  if (!success) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'retry-after': '60',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '0',
      }
    })
  }

  const traces: Trace = []
  const started = nowTs()
  try {
    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    if (contentType.includes('application/json')) body = await req.json().catch(() => ({}))
    else {
      // fallback: parse urlencoded if needed
      const txt = await req.text().catch(() => '')
      try { body = txt ? JSON.parse(txt) : {} } catch { body = Object.fromEntries(new URLSearchParams(txt)) }
    }
    tracePush(traces, 'post-received', { body })

    // Phase 1B.2: Extract buttonIndex from Farcaster frame POST request
    // Farcaster sends untrustedData.buttonIndex (1-indexed) when a frame button is clicked
    const buttonIndex = body.untrustedData?.buttonIndex || body.buttonIndex
    const fid = body.untrustedData?.fid || body.fid
    const frameType = body.untrustedData?.state?.frameType || body.frameType || ''
    const payload = body.payload || {}
    
    // Map buttonIndex to action based on frame type (Phase 1B.2)
    let action = (body.action || body.type || '').toString()
    
    if (buttonIndex && !action) {
      // Define button mappings for each frame type
      const buttonMappings: Record<string, Record<number, string>> = {
        gm: { 1: '', 2: 'recordGM', 3: 'getGMStats' }, // Button 1 = miniapp launch (link), 2 = Record GM, 3 = View Stats
        points: { 1: '', 2: 'viewBalance', 3: 'tipUser' },
        leaderboards: { 1: '', 2: 'refreshRank' },
        badge: { 1: '', 2: 'checkBadges', 3: 'mintBadge' },
        onchainstats: { 1: '', 2: 'refreshStats' },
        guild: { 1: '', 2: 'viewGuild' },
        referral: { 1: '', 2: 'viewReferrals' },
        quest: { 1: '', 2: 'questProgress' }, // Button 1 = miniapp, 2 = Progress check
        verify: { 1: '', 2: 'verifyFrame' },
      }
      
      const mapping = buttonMappings[frameType]
      if (mapping && mapping[buttonIndex]) {
        action = mapping[buttonIndex]
        tracePush(traces, 'button-action-mapped', { buttonIndex, frameType, action })
      }
    }
    
    tracePush(traces, 'action-resolved', { action, buttonIndex, frameType, fid })

    // QUICK PROXY: forward verifyQuest to your /api/quests/verify route if that's still your canonical verify handler
    if (action === 'proxyVerify' || action === 'verifyQuest') {
      // build a POST proxy to /api/quests/verify (server side)
      tracePush(traces, 'proxyVerify-start', { payload })

      const verifyUrl = `${req.url.replace(/\/api\/frame\/?$/, '')}/api/quests/verify`
      // but above might result in wrong url in development; build from origin instead:
      const forwardedHost = req.headers.get('x-forwarded-host')
      const origin = forwardedHost ? `https://${forwardedHost}` : (process.env.NEXT_PUBLIC_BASE_URL || '')
      const dest = origin ? `${origin.replace(/\/$/, '')}/api/quests/verify` : verifyUrl
      tracePush(traces, 'proxyVerify-dest', { dest, fallback: verifyUrl })
      // forward the payload
      const res = await fetch(dest, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const raw = await res.text().catch(() => '')
      let json: any = null
      try { json = raw ? JSON.parse(raw) : null } catch { json = raw }
      tracePush(traces, 'proxyVerify-res', { ok: res.ok, status: res.status, parsed: json })
      // safe JSON response
      return respondJson({ ok: true, proxied: true, dest, fallbackUrl: verifyUrl, status: res.status, body: json, traces, durationMs: nowTs() - started })
    }

    if (action === 'claimSig') {
      // Accepts payload: { chain, questId, user, fid, actionCode, deadline, nonce, sig }
      const { chain, questId, user, fid, actionCode, deadline, nonce, sig } = payload
      tracePush(traces, 'claimSig', { chain, questId, user, fid })
      if (!chain || !questId || !user || !sig) return respondJson({ ok: false, reason: 'missing fields for claimSig', traces }, { status: 400 })
      // We don't send the tx here; just return the call object (viem style) that frontend can feed into writeContract
      const callObj = gm.createCompleteQuestWithSigTx(questId, user, fid || 0, Number(actionCode || 0), deadline || 0, nonce || 0, sig, chain)
      tracePush(traces, 'claimSig-callobj', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    if (action === 'joinGuild') {
      const guildId = Number(payload.guildId || payload.id || 0)
      const chain = payload.chain || 'base'
      if (!guildId) return respondJson({ ok: false, reason: 'missing guildId', traces }, { status: 400 })
      const callObj = gm.createJoinGuildTx(guildId, chain)
      tracePush(traces, 'joinGuild-build', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    if (action === 'createReferral') {
      const code = payload.code || payload.referral || ''
      if (!code) return respondJson({ ok: false, reason: 'missing referral code', traces }, { status: 400 })
      const callObj = gm.createRegisterReferralCodeTx(String(code))
      tracePush(traces, 'createReferral', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    // points merge preview: build pseudo-flow showing merged points across chains (read-only)
    if (action === 'pointsMergePreview') {
      const user = payload.user || payload.addr || ''
      if (!user) return respondJson({ ok: false, reason: 'missing user address', traces }, { status: 400 })
      const chains = CHAIN_KEYS
      const results: any = {}
      for (const c of chains) {
        const s = await fetchUserStatsOnChain(user, c, traces)
        if (s.ok) {
          results[c] = {
            available: String(s.stats.available),
            locked: String(s.stats.locked),
            total: String(s.stats.total),
          }
        } else {
          results[c] = { error: s.error }
        }
      }
      // simple aggregated total
      let aggAvailable = 0n
      for (const c of chains) {
        const item = results[c]
        if (item && item.available) aggAvailable += BigInt(item.available)
      }
      tracePush(traces, 'points-merged', { aggAvailable: String(aggAvailable) })
      return respondJson({ ok: true, user, perChain: results, aggregatedAvailable: String(aggAvailable), traces, durationMs: nowTs() - started })
    }

    // Phase 1B: recordGM - Track GM button clicks in frames
    if (action === 'recordGM') {
      const { generateSessionId, saveFrameState } = await import('@/lib/frame-state')
      const { buildGMSuccessMessage } = await import('@/lib/frame-messages')
      const { invalidateUserFrames } = await import('@/lib/frame-cache')
      
      const fid = payload.fid || payload.untrustedData?.fid
      if (!fid) return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      
      // Create session for state tracking
      const sessionId = generateSessionId()
      const now = Date.now()
      
      // Query real GM data from gmeow_rank_events
      let gmCount = 0
      let streak = 0
      
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Get all GM events for this user
        const { data: gmEvents, error } = await supabase
          .from('gmeow_rank_events')
          .select('created_at, chain')
          .eq('fid', Number(fid))
          .eq('event_type', 'gm')
          .order('created_at', { ascending: false })
        
        if (!error && gmEvents) {
          gmCount = gmEvents.length
          
          // Calculate streak: count consecutive days with GM events
          if (gmEvents.length > 0) {
            streak = 1 // At least 1 if they have any GMs
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            for (let i = 0; i < gmEvents.length - 1; i++) {
              const currentDate = new Date(gmEvents[i].created_at)
              currentDate.setHours(0, 0, 0, 0)
              const nextDate = new Date(gmEvents[i + 1].created_at)
              nextDate.setHours(0, 0, 0, 0)
              
              const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
              
              if (dayDiff === 1) {
                streak++
              } else {
                break // Streak broken
              }
            }
          }
        }
      } catch (err) {
        tracePush(traces, 'recordGM-query-error', { error: String(err) })
        // Continue with gmCount=0, streak=0 if query fails
      }
      
      // Save state
      const saved = await saveFrameState(sessionId, Number(fid), {
        gmCount,
        streak,
        lastAction: 'recordGM',
        metadata: { timestamp: now },
      })
      
      if (!saved) {
        return respondJson({ ok: false, reason: 'failed to save state', traces }, { status: 500 })
      }
      
      // Invalidate all frame caches for this user
      await invalidateUserFrames(Number(fid))
      
      // Build success message
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
      const message = buildGMSuccessMessage({ fid: Number(fid), streak, gmCount, baseUrl })
      
      // Return updated frame URL with session
      const nextFrameUrl = `${baseUrl}/api/frame?type=gm&fid=${fid}&session=${sessionId}`
      
      tracePush(traces, 'recordGM', { fid, sessionId, gmCount, streak })
      return respondJson({ 
        ok: true, 
        message, 
        frameUrl: nextFrameUrl, 
        sessionId,
        gmCount,
        streak,
        traces, 
        durationMs: nowTs() - started 
      })
    }

    // Phase 1B.1: getGMStats - Retrieve user's GM statistics
    if (action === 'getGMStats') {
      const fid = payload.fid || payload.untrustedData?.fid
      if (!fid) return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      
      tracePush(traces, 'getGMStats-start', { fid })
      
      // Query Supabase for latest GM session for this user
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data: sessions, error } = await supabase
          .from('frame_sessions')
          .select('session_id, fid, state, created_at, updated_at')
          .eq('fid', Number(fid))
          .contains('state', { lastAction: 'recordGM' })
          .order('updated_at', { ascending: false })
          .limit(1)
        
        if (error) {
          tracePush(traces, 'getGMStats-db-error', { error: error.message })
          return respondJson({ ok: false, reason: 'database error', error: error.message, traces }, { status: 500 })
        }
        
        if (!sessions || sessions.length === 0) {
          tracePush(traces, 'getGMStats-no-data', { fid })
          return respondJson({ 
            ok: true, 
            fid: Number(fid),
            gmCount: 0,
            streak: 0,
            lastGM: null,
            message: 'No GM activity recorded yet. Send your first GM!',
            traces,
            durationMs: nowTs() - started
          })
        }
        
        const latestSession = sessions[0]
        const state = latestSession.state || {}
        const gmCount = Number(state.gmCount || 0)
        const streak = Number(state.streak || 0)
        const lastGMTimestamp = state.metadata?.timestamp || null
        const lastGM = lastGMTimestamp ? new Date(lastGMTimestamp).toISOString() : null
        
        tracePush(traces, 'getGMStats-success', { fid, gmCount, streak, lastGM })
        
        const message = `🌅 GM Stats for FID ${fid}:\n\n` +
                       `Total GMs: ${gmCount}\n` +
                       `Current Streak: ${streak} ${streak === 1 ? 'day' : 'days'}\n` +
                       `Last GM: ${lastGM ? new Date(lastGM).toLocaleDateString() : 'Never'}\n\n` +
                       `Keep the streak alive! 🚀`
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          gmCount,
          streak,
          lastGM,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'getGMStats-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to fetch GM stats', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B: questProgress - Track multi-step quest progress
    if (action === 'questProgress') {
      const { generateSessionId, saveFrameState, loadFrameState } = await import('@/lib/frame-state')
      const { buildQuestProgressMessage, buildQuestCompleteMessage } = await import('@/lib/frame-messages')
      
      const fid = payload.fid || payload.untrustedData?.fid
      const questId = payload.questId || payload.quest_id
      const sessionId = payload.session || payload.sessionId
      
      if (!fid || !questId) {
        return respondJson({ ok: false, reason: 'missing fid or questId', traces }, { status: 400 })
      }
      
      // Load existing session or create new
      const currentSession = sessionId ? await loadFrameState(sessionId) : null
      const newSessionId = currentSession?.session_id || generateSessionId()
      
      // Get current step from session or start at 1
      const currentStep = (currentSession?.state.currentStep || 0) + 1
      const totalSteps = 3 // Default quest steps
      
      // Update quest progress
      const questProgress = currentSession?.state.questProgress || {}
      questProgress[`step_${currentStep}`] = true
      
      const newState = {
        currentStep,
        questProgress,
        lastAction: 'questProgress',
        metadata: { questId, timestamp: Date.now() },
      }
      
      const saved = await saveFrameState(newSessionId, Number(fid), newState)
      
      if (!saved) {
        return respondJson({ ok: false, reason: 'failed to save state', traces }, { status: 500 })
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
      
      // Check if quest is complete
      const isComplete = currentStep >= totalSteps
      const message = isComplete
        ? buildQuestCompleteMessage({ questTitle: `Quest ${questId}`, points: 100, baseUrl })
        : buildQuestProgressMessage({ questTitle: `Quest ${questId}`, currentStep, totalSteps, baseUrl })
      
      const nextFrameUrl = `${baseUrl}/api/frame?type=quest&questId=${questId}&session=${newSessionId}`
      
      tracePush(traces, 'questProgress', { fid, questId, sessionId: newSessionId, currentStep, isComplete })
      return respondJson({ 
        ok: true, 
        message, 
        frameUrl: nextFrameUrl, 
        sessionId: newSessionId,
        currentStep,
        isComplete,
        traces, 
        durationMs: nowTs() - started 
      })
    }

    // Phase 1B.1: viewBalance - Retrieve user's points balance
    if (action === 'viewBalance') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewBalance-start', { fid, userAddr, chainKey })
      
      try {
        // If we have userAddr, fetch from contract
        const address = userAddr
        
        // If only FID provided, try to resolve to address (for now, return error)
        if (!address && fid) {
          tracePush(traces, 'viewBalance-fid-only', { fid })
          return respondJson({
            ok: false,
            reason: 'address required for balance lookup',
            message: 'Please provide your wallet address to view balance.',
            traces,
            durationMs: nowTs() - started
          }, { status: 400 })
        }
        
        // Fetch on-chain stats
        const statsResult = await fetchUserStatsOnChain(String(address), String(chainKey), traces)
        
        if (!statsResult.ok) {
          tracePush(traces, 'viewBalance-fetch-error', { error: statsResult.error })
          return respondJson({
            ok: false,
            reason: 'failed to fetch balance',
            error: statsResult.error,
            traces,
            durationMs: nowTs() - started
          }, { status: 500 })
        }
        
        const stats = statsResult.stats
        
        // Format balance data
        const available = Number(stats.available)
        const locked = Number(stats.locked)
        const total = Number(stats.total)
        
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Calculate rank progress from total points
        const progress = calculateRankProgress(total)
        
        const message = `💰 Points Balance on ${chainDisplay}:\n\n` +
                       `Available: ${formatInteger(available)} points\n` +
                       `Locked: ${formatInteger(locked)} points\n` +
                       `Total: ${formatInteger(total)} points\n\n` +
                       `Level ${progress.level} • ${progress.currentTier.name}\n` +
                       `${progress.xpIntoLevel}/${progress.xpForLevel} XP\n\n` +
                       `Keep earning! 🚀`
        
        tracePush(traces, 'viewBalance-success', { address, chainKey, available, locked, total })
        
        return respondJson({
          ok: true,
          user: address,
          chain: chainKey,
          balance: {
            available: String(stats.available),
            locked: String(stats.locked),
            total: String(stats.total),
          },
          rank: {
            level: progress.level,
            tier: progress.currentTier.name,
            xpIntoLevel: progress.xpIntoLevel,
            xpForLevel: progress.xpForLevel,
            xpToNextLevel: progress.xpToNextLevel,
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewBalance-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to fetch balance', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: refreshRank - Retrieve user's leaderboard rank and stats
    if (action === 'refreshRank') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'refreshRank-start', { fid, userAddr, chainKey })
      
      try {
        const address = userAddr
        
        // If only FID provided, return error (for now)
        if (!address && fid) {
          tracePush(traces, 'refreshRank-fid-only', { fid })
          return respondJson({
            ok: false,
            reason: 'address required for rank lookup',
            message: 'Please provide your wallet address to check your rank.',
            traces,
            durationMs: nowTs() - started
          }, { status: 400 })
        }
        
        // Fetch on-chain stats to get total points
        const statsResult = await fetchUserStatsOnChain(String(address), String(chainKey), traces)
        
        if (!statsResult.ok) {
          tracePush(traces, 'refreshRank-fetch-error', { error: statsResult.error })
          return respondJson({
            ok: false,
            reason: 'failed to fetch stats',
            error: statsResult.error,
            traces,
            durationMs: nowTs() - started
          }, { status: 500 })
        }
        
        const stats = statsResult.stats
        const total = Number(stats.total)
        
        // Calculate rank progress
        const progress = calculateRankProgress(total)
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Query real rank from leaderboard_snapshots
        let actualRank = 9999
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          const { data: leaderboardEntry, error } = await supabase
            .from('leaderboard_snapshots')
            .select('rank')
            .eq('address', address)
            .eq('chain', String(chainKey))
            .single()
          
          if (!error && leaderboardEntry && leaderboardEntry.rank) {
            actualRank = Number(leaderboardEntry.rank)
          } else if (total > 0) {
            // Fallback: calculate rank by counting users with more points
            const { count, error: countError } = await supabase
              .from('leaderboard_snapshots')
              .select('*', { count: 'exact', head: true })
              .eq('chain', String(chainKey))
              .gt('points', total)
            
            if (!countError && count !== null) {
              actualRank = count + 1
            }
          }
        } catch (err) {
          tracePush(traces, 'refreshRank-query-error', { error: String(err) })
          // Use fallback rank if query fails
        }
        
        // Phase 1D: Add rank milestone badges
        let rankDisplay = `#${formatInteger(actualRank)}`
        let rankBadge = ''
        
        if (actualRank === 1) {
          rankDisplay = `👑 #1 • Champion!`
          rankBadge = '👑'
        } else if (actualRank === 2) {
          rankDisplay = `🥈 #2 • Runner-up!`
          rankBadge = '🥈'
        } else if (actualRank === 3) {
          rankDisplay = `🥉 #3 • Bronze Medal!`
          rankBadge = '🥉'
        } else if (actualRank <= 10) {
          rankDisplay = `⭐ #${actualRank} • Top 10!`
          rankBadge = '⭐'
        } else if (actualRank <= 100) {
          rankDisplay = `🔥 #${actualRank} • Top 100!`
          rankBadge = '🔥'
        }
        
        const message = `🏆 Leaderboard Rank on ${chainDisplay}:\n\n` +
                       `Rank: ${rankDisplay}\n` +
                       `Total Points: ${formatInteger(total)}\n\n` +
                       `Level ${progress.level} • ${progress.currentTier.name}\n` +
                       `${progress.xpIntoLevel}/${progress.xpForLevel} XP (${Math.round(progress.percent * 100)}%)\n\n` +
                       `${total === 0 ? 'Start earning to climb the ranks! 🚀' : 'Keep grinding! 💪'}`
        
        tracePush(traces, 'refreshRank-success', { address, chainKey, rank: actualRank, total, rankBadge })
        
        return respondJson({
          ok: true,
          user: address,
          chain: chainKey,
          rank: actualRank,
          points: String(stats.total),
          level: progress.level,
          tier: progress.currentTier.name,
          xp: {
            current: progress.xpIntoLevel,
            max: progress.xpForLevel,
            toNext: progress.xpToNextLevel,
            percent: Math.round(progress.percent * 100),
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'refreshRank-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to refresh rank', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: checkBadges - Check user's badge eligibility
    if (action === 'checkBadges') {
      const fid = payload.fid || payload.untrustedData?.fid
      
      if (!fid) {
        return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      }
      
      tracePush(traces, 'checkBadges-start', { fid })
      
      try {
        // Query real badge data from user_badges and badge_templates
        let earnedBadges: any[] = []
        let eligibleBadges: any[] = []
        
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Get user's earned badges
        const { data: userBadges, error: badgesError } = await supabase
          .from('user_badges')
          .select('badge_id, assigned_at, badge_type, tier')
          .eq('fid', Number(fid))
        
        if (!badgesError && userBadges) {
          // Fetch badge templates for earned badges
          const badgeIds = userBadges.map(b => b.badge_id)
          if (badgeIds.length > 0) {
            const { data: templates, error: templatesError } = await supabase
              .from('badge_templates')
              .select('id, name, description, image_url')
              .in('id', badgeIds)
            
            if (!templatesError && templates) {
              earnedBadges = userBadges.map(ub => {
                const template = templates.find(t => t.id === ub.badge_id)
                let badgeName = template?.name || ub.badge_id
                
                // Phase 1D: Add rarity indicators
                if (ub.tier === 'legendary' || ub.badge_type === 'legendary') {
                  badgeName = `🌟 ${badgeName} (LEGENDARY)`
                } else if (ub.tier === 'rare' || ub.badge_type === 'rare') {
                  badgeName = `💎 ${badgeName} (RARE)`
                } else if (ub.tier === 'epic' || ub.badge_type === 'epic') {
                  badgeName = `⚡ ${badgeName} (EPIC)`
                }
                
                return {
                  id: ub.badge_id,
                  name: badgeName,
                  earned: true,
                  timestamp: ub.assigned_at,
                  tier: ub.tier,
                }
              })
            }
          }
        }
        
        // Get eligible badges (all active badges not yet earned)
        const { data: allBadges, error: allBadgesError } = await supabase
          .from('badge_templates')
          .select('id, name, description, points_cost')
          .eq('active', true)
        
        if (!allBadgesError && allBadges) {
          const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || [])
          eligibleBadges = allBadges
            .filter(b => !earnedBadgeIds.has(b.id))
            .map(b => ({
              id: b.id,
              name: b.name,
              requirement: b.description || `Cost: ${b.points_cost} points`,
              progress: b.points_cost ? `Available for ${b.points_cost} points` : 'Available',
            }))
            .slice(0, 5) // Limit to 5 eligible badges
        }
        
        // Phase 1D: Format message with visual hierarchy (earned vs eligible sections)
        const earnedSection = earnedBadges.length > 0
          ? `🏆 EARNED BADGES (${earnedBadges.length}):\n${earnedBadges.map(b => `✅ ${b.name}`).join('\n')}`
          : `🏅 No badges earned yet`
        
        const eligibleSection = eligibleBadges.length > 0
          ? `\n\n🎯 AVAILABLE BADGES (${eligibleBadges.length}):\n${eligibleBadges.map(b => `• ${b.name}`).join('\n')}`
          : ``
        
        const message = `🏅 Badge Collection for FID ${fid}:\n\n${earnedSection}${eligibleSection}\n\n🚀 Keep earning!`
        
        tracePush(traces, 'checkBadges-success', { fid, earned: earnedBadges.length, eligible: eligibleBadges.length })
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          badges: {
            earned: earnedBadges,
            eligible: eligibleBadges,
            total: earnedBadges.length,
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'checkBadges-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to check badges', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: mintBadge - Mint a badge NFT
    if (action === 'mintBadge') {
      const fid = payload.fid || payload.untrustedData?.fid
      const badgeId = payload.badgeId || payload.badge_id
      
      if (!fid) {
        return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      }
      
      if (!badgeId) {
        return respondJson({ ok: false, reason: 'missing badgeId', traces }, { status: 400 })
      }
      
      tracePush(traces, 'mintBadge-start', { fid, badgeId })
      
      try {
        // Mock mint (in production, create transaction call object)
        const message = `🎴 Badge Mint Initiated!\n\n` +
                       `Badge ID: ${badgeId}\n` +
                       `FID: ${fid}\n\n` +
                       `Check your wallet to complete the mint transaction.\n\n` +
                       `Congrats! 🎉`
        
        tracePush(traces, 'mintBadge-success', { fid, badgeId })
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          badgeId: Number(badgeId),
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'mintBadge-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to mint badge', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: refreshStats - Refresh onchain statistics
    if (action === 'refreshStats') {
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!userAddr) {
        return respondJson({ ok: false, reason: 'missing user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'refreshStats-start', { userAddr, chainKey })
      
      try {
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Mock stats refresh (in production, query Neynar/Explorer APIs)
        const stats = {
          transactions: 1247,
          contracts: 23,
          volume: '2.45 ETH',
          age: '542 days',
          lastActivity: '2 hours ago',
        }
        
        const message = `📊 Stats Refreshed on ${chainDisplay}:\n\n` +
                       `Transactions: ${stats.transactions}\n` +
                       `Contracts: ${stats.contracts}\n` +
                       `Volume: ${stats.volume}\n` +
                       `Age: ${stats.age}\n` +
                       `Last Activity: ${stats.lastActivity}\n\n` +
                       `Data updated! ✨`
        
        tracePush(traces, 'refreshStats-success', { userAddr, chainKey, stats })
        
        return respondJson({
          ok: true,
          user: userAddr,
          chain: chainKey,
          stats,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'refreshStats-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to refresh stats', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: viewGuild - View guild details
    if (action === 'viewGuild') {
      const guildId = payload.guildId || payload.guild_id || payload.teamname
      const chainKey = payload.chain || 'base'
      
      if (!guildId) {
        return respondJson({ ok: false, reason: 'missing guildId', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewGuild-start', { guildId, chainKey })
      
      try {
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // TODO: Implement real guild data once guilds table is created
        // Schema needed: guilds (id, name, chain, created_at), guild_members (guild_id, fid, joined_at, role)
        // For now, using placeholder data - guild system not yet implemented in database
        const guild = {
          id: guildId,
          name: `Guild ${guildId}`,
          members: 42,
          totalPoints: 125000,
          rank: 7,
          chain: chainDisplay,
        }
        
        const message = `⚔️ Guild Info:\n\n` +
                       `Name: ${guild.name}\n` +
                       `Members: ${guild.members}\n` +
                       `Total Points: ${formatInteger(guild.totalPoints)}\n` +
                       `Rank: #${guild.rank}\n` +
                       `Chain: ${guild.chain}\n\n` +
                       `Join the crew! 🛡️`
        
        tracePush(traces, 'viewGuild-success', { guildId, chainKey, guild })
        
        return respondJson({
          ok: true,
          guild,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewGuild-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to view guild', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: viewReferrals - View referral statistics
    if (action === 'viewReferrals') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewReferrals-start', { fid, userAddr })
      
      try {
        // TODO: Implement real referral data once referrals table is created
        // Schema needed: referrals (id, referrer_fid, referred_fid, code, created_at, points_earned)
        // For now, using placeholder data - referral system not yet implemented in database
        const referralCode = 'MEOW42'
        const stats = {
          code: referralCode,
          referrals: 15,
          activeReferrals: 12,
          totalPoints: 3750,
          rank: 23,
        }
        
        const message = `🎁 Your Referral Stats:\n\n` +
                       `Code: ${stats.code}\n` +
                       `Total Referrals: ${stats.referrals}\n` +
                       `Active: ${stats.activeReferrals}\n` +
                       `Points Earned: ${formatInteger(stats.totalPoints)}\n` +
                       `Referrer Rank: #${stats.rank}\n\n` +
                       `Share your code! 🚀`
        
        tracePush(traces, 'viewReferrals-success', { fid, userAddr, stats })
        
        return respondJson({
          ok: true,
          fid: fid ? Number(fid) : null,
          user: userAddr,
          referrals: stats,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewReferrals-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to view referrals', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: tipUser - Tip points to another user
    if (action === 'tipUser') {
      const fromFid = payload.fid || payload.untrustedData?.fid || payload.fromFid
      const toFid = payload.toFid || payload.to_fid || payload.recipient
      const amount = payload.amount || payload.points || 10
      
      if (!fromFid) {
        return respondJson({ ok: false, reason: 'missing sender fid', traces }, { status: 400 })
      }
      
      if (!toFid) {
        return respondJson({ ok: false, reason: 'missing recipient fid', traces }, { status: 400 })
      }
      
      tracePush(traces, 'tipUser-start', { fromFid, toFid, amount })
      
      try {
        // Mock tip (in production, update database and create transaction)
        const message = `💸 Tip Sent!\n\n` +
                       `From: FID ${fromFid}\n` +
                       `To: FID ${toFid}\n` +
                       `Amount: ${amount} points\n\n` +
                       `Generosity is the way! 🤝`
        
        tracePush(traces, 'tipUser-success', { fromFid, toFid, amount })
        
        return respondJson({
          ok: true,
          from: Number(fromFid),
          to: Number(toFid),
          amount: Number(amount),
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'tipUser-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to tip user', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // fallback: echo
    tracePush(traces, 'post-unknown-action', { action, payload })
    return respondJson({ ok: true, message: 'unknown action; no-op', action, payload, traces })
  } catch (e: any) {
    const msg = String(e?.message || e)
    return respondJson({ ok: false, reason: msg, traces: [{ ts: nowTs(), step: 'post-unhandled', info: msg }] }, { status: 500 })
  }
}

// Helper functions needed by POST handler (would need to be imported from proper modules)
// NOTE: These are placeholders - actual implementations exist in the original route.tsx file
function getClientIp(req: Request): string { return '127.0.0.1' }
function nowTs(): number { return Date.now() }
function tracePush(traces: any[], step: string, info: any): void { traces.push({ ts: nowTs(), step, info }) }
function respondJson(data: any, init?: any): Response { return new Response(JSON.stringify(data), init) }
function safeJson(obj: any): any { return obj }
function formatInteger(n: number): string { return n.toLocaleString() }
function getChainDisplayName(chain: string): string { return chain }
async function rateLimit(ip: string, limiter: any): Promise<{ success: boolean }> { return { success: true } }
async function fetchUserStatsOnChain(address: string, chain: string, traces: any[]): Promise<any> { return { ok: true, stats: { available: '0', locked: '0', total: '0' } } }
function calculateRankProgress(points: number): any { return { level: 1, currentTier: { name: 'Novice' }, xpIntoLevel: 0, xpForLevel: 100, xpToNextLevel: 100, percent: 0 } }

// Constants
const CHAIN_KEYS = ['base', 'optimism', 'arbitrum']
const apiLimiter = {}
const gm = {
  createCompleteQuestWithSigTx: (questId: any, user: any, fid: any, actionCode: any, deadline: any, nonce: any, sig: any, chain: any) => ({}),
  createJoinGuildTx: (guildId: any, chain: any) => ({}),
  createRegisterReferralCodeTx: (code: any) => ({}),
}
