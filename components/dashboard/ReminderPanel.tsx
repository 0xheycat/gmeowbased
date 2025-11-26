"use client"

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type DashboardReminder = {
  id: string
  title: string
  description: string
  tone?: 'info' | 'success' | 'warn'
  actionLabel?: string
  href?: string
  onAction?: () => void
  icon?: string
}

const toneClasses: Record<NonNullable<DashboardReminder['tone']>, string> = {
  info: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  warn: 'border-amber-400/30 bg-amber-500/10 text-amber-50',
}

export function ReminderPanel({ reminders }: { reminders: DashboardReminder[] }) {
  return (
    <div className="pixel-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="pixel-section-title">Reminders</h3>
          <p className="text-[11px] text-[var(--px-sub)]">Quick nudges to keep streaks alive, claim escrow, and share your wins.</p>
        </div>
        <span className="pixel-pill text-[10px]">{reminders.length}</span>
      </div>
      {reminders.length ? (
        <ul className="space-y-3">
          {reminders.map((reminder) => {
            const toneClass = reminder.tone ? toneClasses[reminder.tone] : 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/80'
            return (
              <li
                key={reminder.id}
                className={cn('rounded-2xl border px-4 py-3 shadow-[0_16px_40px_rgba(8,19,45,0.32)] backdrop-blur', toneClass)}
              >
                <div className="flex items-start gap-3">
                  {reminder.icon ? (
                    <span className="text-lg" aria-hidden>
                      {reminder.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{reminder.title}</h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-950 dark:text-white/70">{reminder.description}</p>
                    {(reminder.actionLabel && (reminder.href || reminder.onAction)) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reminder.href ? (
                          <Link
                            href={reminder.href}
                            className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-5 text-[11px] uppercase tracking-[0.28em]')}
                          >
                            {reminder.actionLabel}
                          </Link>
                        ) : null}
                        {reminder.onAction ? (
                          <button
                            type="button"
                            className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-5 text-[11px] uppercase tracking-[0.28em]')}
                            onClick={reminder.onAction}
                          >
                            {reminder.actionLabel}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-white dark:border-slate-700/12 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
          Nothing on your radar right now. Keep momentum going and new reminders will appear here.
        </div>
      )}
    </div>
  )
}
