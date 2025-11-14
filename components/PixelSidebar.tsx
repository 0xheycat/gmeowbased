import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

export function PixelSidebar() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/leaderboard', label: 'Ranks', icon: '🏆' },
    { href: '/celo', label: 'GM', icon: '🌅' },
    { href: '/profile', label: 'Me', icon: '🐱' },
  ]
  return (
    <aside className="hidden md:block md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-64">
      <div className="pixel-frame p-3">
        <div className="pixel-nav-grid" />
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs pixel-pill">MENU</span>
          <span className="text-xs opacity-80 site-font">PIXEL</span>
        </div>
        <ul className="space-y-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href))
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md site-font',
                    active ? 'pixel-tab-active' : 'text-slate-200/80 hover:text-white'
                  )}
                >
                  <span className="pixel-icon">{it.icon}</span>
                  <span className="text-sm">{it.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}