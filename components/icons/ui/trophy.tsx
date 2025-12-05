/**
 * Trophy Icon Component
 * Source: /assets/gmeow-icons/Trophy Icon.svg
 * Converted to React component with color support
 * NO EMOJIS - SVG only
 */

export function Trophy(props: React.SVGAttributes<{}>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      <path d="M19.968,4.031C19.941,5.666,19.579,11,15.99,11h-0.125c-0.426,2.357-2.111,2.999-5.858,2.999c-3.748,0-5.434-0.642-5.859-2.999H4.009c-3.588,0-3.951-5.333-3.977-6.969L0,2h2.028h1.98h0.015V0H15.99v2l0,0h1.98H20L19.968,4.031z M4.009,3.999L1.994,4c0,0,0.112,4.999,2.015,4.999V3.999z M13.993,2H6.02v7.6c0,2.384,0.741,2.399,3.987,2.399c3.245,0,3.986-0.015,3.986-2.399V2z M17.973,3.999H15.99v5C17.893,8.999,18.006,4,18.006,4L17.973,3.999z M11.005,15.999H13c2.206,0,3.993,1.789,3.993,4h-1.989h-0.006c0-1.104-0.896-2.001-1.998-2.001h-1.995H9.009H7.013c-1.102,0-1.996,0.896-1.996,2.001H4.996H3.02c0-2.211,1.788-4,3.993-4h1.996v-2.001h0.998h0.998V15.999z" />
    </svg>
  )
}

/**
 * Gold Trophy (1st place)
 * Usage: <TrophyGold className="w-6 h-6" />
 */
export function TrophyGold(props: React.SVGAttributes<{}>) {
  return <Trophy className="text-gold" {...props} />
}

/**
 * Silver Trophy (2nd place)
 * Usage: <TrophySilver className="w-6 h-6" />
 */
export function TrophySilver(props: React.SVGAttributes<{}>) {
  return <Trophy className="text-gray-300" {...props} />
}

/**
 * Bronze Trophy (3rd place)
 * Usage: <TrophyBronze className="w-6 h-6" />
 */
export function TrophyBronze(props: React.SVGAttributes<{}>) {
  return <Trophy className="text-orange-600" {...props} />
}
