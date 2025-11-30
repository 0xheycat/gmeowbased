'use client'

import Link from 'next/link'
import type { LeaderboardEntry } from './types'

type Props = {
  leaders: LeaderboardEntry[]
}

export function LeaderboardSection({ leaders }: Props) {
  return (
    <section className="leaderboard">
      <h2>Top cats 🏆</h2>
      <div className="table">
        <div className="header">
          <span>RANK</span>
          <span>USER</span>
          <span>POINTS</span>
          <span>BADGES</span>
        </div>
        {leaders.map((leader) => (
          <div key={leader.rank} className="row">
            <span className="rank">
              {leader.rank <= 3 ? <span className={`medal medal-${leader.rank}`}>{leader.rank}</span> : leader.rank}
            </span>
            <span className="user">@{leader.username}</span>
            <span>{leader.points.toLocaleString()}</span>
            <span>{leader.badgeCount}</span>
          </div>
        ))}
      </div>
      <div className="actions">
        <Link className="btn-primary" href="/leaderboard">
          VIEW FULL LEADERBOARD
        </Link>
      </div>
    </section>
  )
}
