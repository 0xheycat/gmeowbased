export function extractHttpErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const maybeResponse = (error as any)?.response
    const dataMessage = maybeResponse?.data?.error || maybeResponse?.data?.message || maybeResponse?.data?.detail
    if (typeof dataMessage === 'string' && dataMessage.length > 0) {
      const status = maybeResponse?.status
      return status ? `HTTP ${status}: ${dataMessage}` : dataMessage
    }
    if ('message' in (error as any) && typeof (error as any).message === 'string') {
      return (error as any).message
    }
  }
  return fallback
}
