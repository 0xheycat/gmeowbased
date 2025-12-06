export function TrophyIcon(props: React.SVGAttributes<{}>) {
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
      <path d="M6 3H4a2 2 0 00-2 2v3a2 2 0 002 2h2M18 3h2a2 2 0 012 2v3a2 2 0 01-2 2h-2M12 16v2M9 21h6" />
    </svg>
  )
}
