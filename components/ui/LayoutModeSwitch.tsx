// LayoutModeSwitch component
'use client'

import { useLayoutMode } from './layout-mode-context'

export function LayoutModeSwitch() {
  const { mode, setMode } = useLayoutMode()

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => setMode('list')}
        className={`px-3 py-1 rounded ${
          mode === 'list' ? 'bg-white dark:bg-gray-600' : ''
        }`}
        aria-label="List view"
      >
        ☰
      </button>
      <button
        onClick={() => setMode('grid')}
        className={`px-3 py-1 rounded ${
          mode === 'grid' ? 'bg-white dark:bg-gray-600' : ''
        }`}
        aria-label="Grid view"
      >
        ▦
      </button>
      <button
        onClick={() => setMode('compact')}
        className={`px-3 py-1 rounded ${
          mode === 'compact' ? 'bg-white dark:bg-gray-600' : ''
        }`}
        aria-label="Compact view"
      >
        ▬
      </button>
    </div>
  )
}
