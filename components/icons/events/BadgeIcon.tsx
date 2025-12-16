/**
 * Badge Event Icon
 * Professional SVG icon for badge claim XP celebration
 * Replaces emoji: 🏅
 */

import type { SVGProps } from 'react'

export function BadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Award medal */}
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <circle cx="12" cy="8" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  )
}
