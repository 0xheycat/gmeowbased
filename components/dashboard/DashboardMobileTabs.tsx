import clsx from 'clsx'

export type DashboardMobileTabConfig<Id extends string = string> = {
  id: Id
  label: string
  icon?: string
}

export type DashboardMobileTabsProps<Id extends string = string> = {
  tabs: DashboardMobileTabConfig<Id>[]
  activeTab: Id
  onTabChange: (id: Id) => void
}

export default function DashboardMobileTabs<Id extends string = string>({
  tabs,
  activeTab,
  onTabChange,
}: DashboardMobileTabsProps<Id>) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-2">
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            className={clsx(
              'flex min-w-[7.5rem] min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] uppercase tracking-[0.18em] transition',
              active
                ? 'bg-emerald-500/15 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.35)] border border-emerald-400/60'
                : 'bg-slate-100/90 dark:bg-white/5 text-slate-700 dark:text-slate-500/70 dark:text-slate-950 dark:text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:border-emerald-300/40 hover:text-slate-950 dark:text-white'
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon ? <span aria-hidden>{tab.icon}</span> : null}
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
