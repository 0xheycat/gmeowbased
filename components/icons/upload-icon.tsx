import { createSvgIcon } from '@/lib/icons/create-svg-icon'

const UploadIcon = createSvgIcon(
  <>
    <path
      d="M12 4L12 16M12 4L8 8M12 4L16 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M4 20H20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </>,
  'UploadIcon'
)

export default UploadIcon
