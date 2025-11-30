export function PixelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pixel-frame px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h1 className="pixel-heading">{title}</h1>
        {subtitle ? <span className="text-xs text-[var(--px-sub)]">{subtitle}</span> : null}
      </div>
    </div>
  )
}