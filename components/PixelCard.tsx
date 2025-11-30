import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'

export function PixelCard({
  title,
  action,
  className,
  children,
}: PropsWithChildren<{ title?: ReactNode; action?: ReactNode; className?: string }>) {
  return (
    <section className={clsx('pixel-card', 'site-font', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title ? <h2 className="pixel-section-title">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}