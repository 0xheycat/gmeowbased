'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { GuildPreview } from './types'

type Props = {
  guilds: GuildPreview[]
}

export function GuildsShowcase({ guilds }: Props) {
  const topGuilds = useMemo(() => guilds.slice().sort((a, b) => b.points - a.points).slice(0, 3), [guilds])

  return (
    <section className="guilds">
      <h2>Top guilds</h2>
      <div className="guild-grid">
        {topGuilds.map((guild) => (
          <div key={guild.id} className="guild-card">
            <div className="guild-icon" aria-hidden>
              🛡️
            </div>
            <h3>{guild.name}</h3>
            <div className="guild-stats">
              <div>
                <span className="guild-value">{guild.members}</span>
                <span className="guild-label">Members</span>
              </div>
              <div>
                <span className="guild-value">{guild.points.toLocaleString()}</span>
                <span className="guild-label">Points</span>
              </div>
            </div>
            <Link href={guild.href}>JOIN GUILD</Link>
          </div>
        ))}
      </div>
      <div className="guild-actions">
        <Link className="btn-primary" href="/Guild">
          BROWSE ALL GUILDS
        </Link>
        <Link className="btn-secondary" href="/Guild">
          CREATE YOUR GUILD
        </Link>
      </div>
    </section>
  )
}
