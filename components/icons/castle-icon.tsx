export function CastleIcon(props: React.SVGAttributes<{}>) {
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
        d="M3 21h18M4 18h16M6 18V6M18 18V6M8 6V3h2v3h4V3h2v3M6 6h2m10 0h-2M10 12h4m-4 3h4"
      />
    </svg>
  )
}
