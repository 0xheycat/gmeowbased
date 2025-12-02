/**
 * Toast Timer - Pausable/Resumable Timer for Notifications
 * Reference: planning/template/music/common/resources/client/ui/toast/toast-timer.ts
 * 
 * Features:
 * - Pause on hover
 * - Resume on unhover
 * - Tracks remaining time accurately
 * - Clean memory management
 */

export class ToastTimer {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private remaining: number
  private callback: () => void
  private startTime: number = 0

  constructor(callback: () => void, delay: number) {
    this.remaining = delay
    this.callback = callback
    this.resume()
  }

  pause() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
      this.remaining -= Date.now() - this.startTime
    }
  }

  resume() {
    if (!this.timerId && this.remaining > 0) {
      this.startTime = Date.now()
      this.timerId = setTimeout(this.callback, this.remaining)
    }
  }

  clear() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }
}
