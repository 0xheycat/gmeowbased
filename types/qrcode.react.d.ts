declare module 'qrcode.react' {
  export const QRCodeSVG: import('react').ComponentType<{
    value: string
    size?: number
    includeMargin?: boolean
    level?: 'L' | 'M' | 'Q' | 'H'
    bgColor?: string
    fgColor?: string
  }>
  export const QRCodeCanvas: typeof QRCodeSVG
  const _default: typeof QRCodeSVG
  export default _default
}