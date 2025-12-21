'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import HomeIcon from '@mui/icons-material/Home'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/quests', label: 'Quests', icon: SportsEsportsIcon },
  { href: '/leaderboard', label: 'Leaderboard', icon: EmojiEventsIcon },
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav 
      role="navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800"
    >
      {/* Safe area padding for iOS home indicator */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2 safe-x">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`${
                    isActive
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon sx={{ fontSize: 24 }} />
                </motion.div>
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {label}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
