export interface GMRecord {
  id: string
  userFid: number
  username?: string
  txHash: string
  timestamp: number
  date: string // YYYY-MM-DD format
  streak: number
}

export interface UserStreak {
  userFid: number
  username?: string
  currentStreak: number
  longestStreak: number
  totalGMs: number
  lastGMDate?: string
}

export interface LeaderboardEntry {
  rank: number
  userFid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  currentStreak: number
  totalGMs: number
}