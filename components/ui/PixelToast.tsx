'use client'

import * as React from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warn'
export type Toast = {
  id: number
  type: ToastType
  title: string
  message?: string
  linkHref?: string
  linkLabel?: string
  duration?: number
}

export function PixelToastContainer({
  toasts,
  onClose,
  hiddenTypes = ['warn', 'error'],
}: {
  toasts: Toast[]
  onClose: (id: number) => void
  hiddenTypes?: ToastType[]
}) {
  const [closing, setClosing] = React.useState<Record<number, boolean>>({})

  // Filter out hidden types (e.g., ['error'])
  const visibleToasts = React.useMemo(
    () => toasts.filter((t) => !hiddenTypes.includes(t.type)),
    [toasts, hiddenTypes]
  )

  const handleClose = (id: number) => {
    setClosing((s) => ({ ...s, [id]: true }))
    setTimeout(() => onClose(id), 180)
  }

  const handleClearAll = () => {
    // animate all visible out, then close
    const ids = visibleToasts.map((t) => t.id)
    setClosing(Object.fromEntries(ids.map((id) => [id, true])))
    setTimeout(() => {
      ids.forEach(onClose)
    }, 180)
  }

  if (!visibleToasts?.length) return null

  const typeEmoji = (t: ToastType) =>
    t === 'success' ? '✅' : t === 'error' ? '⛔' : t === 'warn' ? '⚠️' : '💬'

  const stripeColor = (t: ToastType) =>
    t === 'success'
      ? '#3ee38a'
      : t === 'error'
      ? '#ff6b6b'
      : t === 'warn'
      ? '#ffd166'
      : '#a07cff'

  return (
    <div
      className="fixed bottom-4 right-4 z-50 pointer-events-none site-font"
    >
      {/* BOARD card */}
      <div
        className="pointer-events-auto pixel-card px-toast-board"
        role="region"
        aria-label="Notifications board"
      >
        {/* Header */}
        <div className="px-toast-header">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-extrabold tracking-wide"
              style={{ textShadow: '0 2px 0 var(--px-outer)' }}
            >
              BOARD
            </span>
            <span className="pixel-pill text-[10px]">
              {visibleToasts.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--px-sub)]">
              Notifications
            </span>
            <button
              className="btn-secondary btn-sm"
              onClick={handleClearAll}
              aria-label="Clear all notifications"
            >
              Clear
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-toast-list">
          <ul className="flex flex-col gap-2">
            {visibleToasts.map((t) => {
              const isClosing = !!closing[t.id]
              const role = t.type === 'error' ? 'alert' : 'status'
              return (
                <li key={t.id} role={role}>
                  <div
                    className={`px-toast-item transition-transform ${
                      isClosing ? 'toast-animate-out' : 'toast-animate-in'
                    }`}
                  >
                    {/* Left stripe */}
                    <div
                      aria-hidden
                      className="px-toast-stripe"
                      style={{ background: stripeColor(t.type) }}
                    />
                    <div className="flex items-start gap-2">
                      <div
                        className="select-none px-toast-emoji"
                        aria-hidden
                      >
                        {typeEmoji(t.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-extrabold">
                          {t.title}
                        </div>
                        {t.message ? (
                          <div className="text-[12px] opacity-90 break-words mt-0.5">
                            {t.message}
                          </div>
                        ) : null}
                        {t.linkHref && t.linkLabel ? (
                          <div className="mt-2">
                            <a
                              className="pixel-pill text-[10px]"
                              href={t.linkHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t.linkLabel}
                            </a>
                          </div>
                        ) : null}
                      </div>

                      <button
                        className="pixel-pill text-[10px] shrink-0"
                        onClick={() => handleClose(t.id)}
                        aria-label="Dismiss notification"
                        title="Dismiss"
                      >
                        ✖
                      </button>
                    </div>

                    {/* Progress bar */}
                    {t.duration && t.duration > 0 ? (
                      <div className="px-toast-progress-track" aria-hidden>
                        <div
                          className="px-toast-progress"
                          style={{
                            background: stripeColor(t.type),
                            animationDuration: `${t.duration}ms`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* detail: styling lives in app/styles.css → PIXEL TOAST BOARD */}
    </div>
  )
}