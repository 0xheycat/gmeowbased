// Barrel export for components/ui
export { Button, buttonVariants } from './button'
export { default as Loader } from './loader'
export { RankProgress } from './RankProgress'
// Notification system removed - use Dialog for confirmations
export { LiveEventBridge } from './LiveEventBridge'
export { LayoutModeProvider, useLayoutMode } from './layout-mode-context'
export { LayoutModeSwitch } from './LayoutModeSwitch'
export { ThemeToggle } from './ThemeToggle'

// Gmeow components (only existing files)
export { default as GmeowAvatar } from './gmeow-avatar'
export { default as GmeowBadge } from './gmeow-badge'
export { default as GmeowCollapse } from './gmeow-collapse'
export { default as GmeowInputLabel } from './gmeow-input-label'
export { default as GmeowLoader } from './gmeow-loader'
export { default as GmeowScrollbar } from './gmeow-scrollbar'

// Note: The following exports are commented out because files don't exist
// export { default as ErrorDialog } from './error-dialog'
// export { default as GmeowAlert } from './gmeow-alert'
// export { default as GmeowDialog } from './gmeow-dialog'
// export { default as GmeowTab } from './gmeow-tab'

// Re-exports from headlessui (no default exports)
export { Disclosure as GmeowDisclosure } from './gmeow-disclosure'
export { Menu as GmeowDropdown } from './gmeow-dropdown'
export { Switch as GmeowSwitch } from './gmeow-switch'
export { Transition as GmeowTransition } from './gmeow-transition'
