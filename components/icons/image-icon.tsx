import { createSvgIcon } from '@/lib/icons/create-svg-icon'

const ImageIcon = createSvgIcon(
  <>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path
      d="M3 16L8 11L13 16M10 13L15 8L21 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </>,
  'ImageIcon'
)

export default ImageIcon
