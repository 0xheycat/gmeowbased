export function DiamondIcon(props: React.SVGAttributes<{}>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3L5 9l7 12 7-12-4-6H9z"
      />
      <path d="M12 21L5 9h14l-7 12z" />
      <path d="M5 9h14M12 3v18M9 3l3 6-3 12M15 3l-3 6 3 12" />
    </svg>
  )
}
