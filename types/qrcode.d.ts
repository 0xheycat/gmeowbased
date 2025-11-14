declare module 'qrcode' {
  export function toString(text: string, opts?: any): Promise<string>
  export function toDataURL(text: string, opts?: any): Promise<string>
}