import { createSvgIcon } from '@/lib/icons/create-svg-icon'

const XIcon = createSvgIcon(
  <>
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
  'XIcon'
)

export default XIcon
