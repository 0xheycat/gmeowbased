'use client'

import Image from 'next/image'
import Link from 'next/link'

export function FooterSection() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">
            <Image src="/logo.png" alt="GMEOW" width={42} height={42} />
            <span>GMEOW</span>
          </div>
          <p>Turn your Farcaster vibes into rewards.</p>
          <div className="links">
            <Link href="https://warpcast.com/heycat" target="_blank" rel="noreferrer">
              📡 Warpcast
            </Link>
            <Link href="https://github.com/0xheycat" target="_blank" rel="noreferrer">
              🐙 GitHub
            </Link>
            <Link href="https://twitter.com/0xheycat" target="_blank" rel="noreferrer">
              🐦 Twitter
            </Link>
          </div>
        </div>
        <div className="footer-right">
          <div className="cta">
            <h3>Ready to earn?</h3>
            <Link className="btn-primary" href="/quests">
              START YOUR ADVENTURE
            </Link>
          </div>
          <div className="stats">
            <div>
              <span className="stat-value">2,341</span>
              <span className="stat-label">Cats Joined</span>
            </div>
            <div>
              <span className="stat-value">14,200</span>
              <span className="stat-label">Gmeow Points Earned</span>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} GMEOW. All rights reserved.</span>
        <div className="foot-links">
          <Link href="/quests">Quests</Link>
          <Link href="/guild">Guilds</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </div>
      </div>
    </footer>
  )
}
