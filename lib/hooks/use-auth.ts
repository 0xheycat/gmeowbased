'use client'

import { useContext } from 'react'
import { AuthContext } from '@/lib/contexts'
import type { AuthContextType } from '@/lib/contexts'

/**
 * Hook to access unified authentication state
 * 
 * Provides type-safe access to auth context across the entire app.
 * Replaces old patterns: useMiniKitAuth, useAccount + fetchUser, etc.
 * 
 * Based on Coinbase MCP best practices (Dec 2025).
 * 
 * @throws {Error} If used outside AuthProvider
 * 
 * @example Dashboard (require auth)
 * ```tsx
 * function Dashboard() {
 *   const { fid, profile, isAuthenticated, isLoading } = useAuth()
 *   
 *   if (isLoading) return <Loading />
 *   if (!isAuthenticated) return <ConnectWallet />
 *   
 *   return (
 *     <div>
 *       <h1>Welcome {profile?.displayName}!</h1>
 *       <p>FID: {fid}</p>
 *       <GMButton />
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example Profile Page (show own vs others)
 * ```tsx
 * function ProfilePage({ params }: { params: { fid: string } }) {
 *   const { fid: myFid, profile: myProfile } = useAuth()
 *   const profileFid = Number(params.fid)
 *   const isOwnProfile = myFid === profileFid
 *   
 *   return (
 *     <div>
 *       {isOwnProfile && <EditProfileButton />}
 *       <ProfileStats fid={profileFid} />
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example Quest Creation (require miniapp)
 * ```tsx
 * function QuestCreator() {
 *   const { isAuthenticated, isMiniappSession, authMethod } = useAuth()
 *   
 *   if (!isAuthenticated) {
 *     return <div>Please connect wallet or use Warpcast</div>
 *   }
 *   
 *   if (!isMiniappSession) {
 *     return <div>Quest creation only available in Warpcast miniapp</div>
 *   }
 *   
 *   return <QuestForm />
 * }
 * ```
 * 
 * @example Leaderboard (optional auth)
 * ```tsx
 * function Leaderboard() {
 *   const { fid, isAuthenticated } = useAuth()
 *   
 *   return (
 *     <div>
 *       {rankings.map(rank => (
 *         <LeaderboardRow
 *           key={rank.fid}
 *           {...rank}
 *           isCurrentUser={isAuthenticated && rank.fid === fid}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example Miniapp-specific features
 * ```tsx
 * function ShareButton() {
 *   const { isMiniappSession, miniappContext } = useAuth()
 *   
 *   if (!isMiniappSession) {
 *     return <WebShareButton />
 *   }
 *   
 *   return (
 *     <button onClick={() => {
 *       // Use Farcaster SDK composer
 *       miniappContext?.actions?.composeCast?.({ text: 'Check this out!' })
 *     }}>
 *       Share to Warpcast
 *     </button>
 *   )
 * }
 * ```
 * 
 * @see {@link AuthContextType} for full API reference
 * @see {@link AuthProvider} for provider setup
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
