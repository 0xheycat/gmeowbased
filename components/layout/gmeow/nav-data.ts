import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  ChartLine,
  // @edit-start 2025-02-14 — Agent nav icon
  ChatsTeardrop,
  // @edit-end
  Compass,
  Gauge,
  HouseLine,
  ListChecks,
  SealCheck,
  Sparkle,
  Trophy,
  UsersThree,
  Wrench,
} from '@phosphor-icons/react'

export type FooterCallout = {
  id: string
  label: string
  description: string
  href: string
  icon: ComponentType<IconProps>
}

export const footerCallouts: FooterCallout[] = [
  {
    id: 'daily-gm',
    label: 'Daily GM Ritual',
    description: 'Drop a GM, climb the XP ladder, and keep your streak alive.',
    href: '/Quest',
    icon: Sparkle,
  },
  {
    id: 'guild-hq',
    label: 'Guild HQ',
    description: 'Coordinate squads, manage teams, and unlock shared rewards.',
    href: '/Guild',
    icon: UsersThree,
  },
]

export type NavQuickLink = {
  id: string
  label: string
  href: string
  icon: ComponentType<IconProps>
}

export const navIconLinks: NavQuickLink[] = [
  { id: 'home', label: 'Home', href: '/', icon: HouseLine },
  { id: 'dashboard', label: 'Dashboard', href: '/Dashboard', icon: Gauge },
  { id: 'quests', label: 'Quests', href: '/Quest', icon: ListChecks },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { id: 'guild', label: 'Guild', href: '/Guild', icon: UsersThree },
  // @edit-start 2025-02-14 — Add agent navigation link
  { id: 'agent', label: 'Agent', href: '/Agent', icon: ChatsTeardrop },
  { id: 'profile', label: 'Profile', href: '/profile', icon: Sparkle },
  { id: 'maintenance', label: 'Maintenance', href: '/maintenance', icon: Wrench },
  // @edit-end
]

export const navMobileShortcuts = navIconLinks

export const socialLinks: { id: string; label: string; href: string; icon: ComponentType<IconProps> }[] = [
  { id: 'warpcast', label: 'Warpcast', href: 'https://warpcast.com/heycat', icon: Compass },
  { id: 'twitter', label: 'Twitter', href: 'https://twitter.com/0xheycat', icon: Sparkle },
  { id: 'github', label: 'GitHub', href: 'https://github.com/0xheycat', icon: SealCheck },
  { id: 'status', label: 'Status Page', href: 'https://status.gmeowhq.art', icon: ChartLine },
]