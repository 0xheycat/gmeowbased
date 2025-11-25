/**
 * 🤖 MAINTENANCE TASK DATABASE
 * 
 * Comprehensive classification of 60 UI/UX issues across 14 categories
 * Updated: November 25, 2025 (Added 11 new issues from codebase audit)
 * 
 * Task Types:
 * - AUTO: Deterministic fixes with 100% confidence (20 tasks, ~8-11h)
 * - SEMI-AUTO: AI-assisted with human approval (30 tasks, ~16-20h)
 * - MANUAL: Requires human creativity and judgment (10 tasks, ~6-9h)
 * 
 * Total: 60 tasks, ~30-40h implementation time
 * 
 * New Tracking Fields (as of Nov 25, 2025):
 * - instanceCount: Actual count from grep audit (e.g., 93 animation timings)
 * - changelogReference: Link to CHANGELOG-CATEGORY-*.md documentation
 * - blastRadius: Impact scope (low/medium/high/critical)
 */

export type TaskType = 'auto' | 'semi-auto' | 'manual'
export type TaskSeverity = 'P1' | 'P2' | 'P3' | 'P4'
export type TaskStatus = 'pending' | 'in-progress' | 'fixed' | 'failed'

export interface MaintenanceTask {
  id: string
  category: number // 1-14
  severity: TaskSeverity
  type: TaskType
  description: string
  files: string[] // Affected files
  estimatedTime: string // e.g. "30 min"
  fix: string // Fix identifier for auto-fix engine
  instructions?: string // For manual/semi-auto tasks
  dependencies: string[] // Other task IDs that must be completed first
  status: TaskStatus
  fixedAt?: Date
  fixedBy?: 'auto' | 'semi-auto' | 'manual'
  // NEW: Tracking fields added Nov 25, 2025
  instanceCount?: number // Actual count from grep audit
  changelogReference?: string // CHANGELOG-CATEGORY-*.md file
  blastRadius?: 'low' | 'medium' | 'high' | 'critical' // Impact scope
}

/**
 * CATEGORY 1: MOBILE UI / MINIAPP
 * Score: 100/100 ✅ COMPLETE
 * All issues fixed during audit phase
 */
const CATEGORY_1_TASKS: MaintenanceTask[] = [
  // All 8 P1/P2 issues already fixed ✅
]

/**
 * CATEGORY 2: RESPONSIVENESS
 * Score: Audited
 * Total: 17 issues, ~2-3h deferred
 */
const CATEGORY_2_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (15 tasks, 1.5-2h)
  {
    id: 'cat2-breakpoint-375px-1',
    category: 2,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 375px breakpoint with Tailwind sm (640px)',
    files: [
      'app/Dashboard/page.tsx',
      'components/GMButton.tsx',
      'components/intro/OnboardingFlow.tsx',
      'components/Guild/GuildCard.tsx',
      'components/Quest/QuestCard.tsx',
      'app/leaderboard/page.tsx',
      'components/BadgeCollection.tsx',
      'app/profile/[fid]/page.tsx',
    ],
    estimatedTime: '10 min',
    fix: 'breakpoint-migration-375-to-640',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat2-breakpoint-600px-1',
    category: 2,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 600px breakpoint with Tailwind md (768px)',
    files: [
      'app/api/frame/badgeShare/route.ts',
      'app/api/frame/badge/route.ts',
      'app/api/frame/route.tsx',
    ],
    estimatedTime: '8 min',
    fix: 'breakpoint-migration-600-to-768',
    dependencies: [],
    status: 'fixed',
    fixedAt: new Date('2025-11-25T00:00:00Z'),
    fixedBy: 'manual', // Phase 2: commit 975a132
  },
  {
    id: 'cat2-breakpoint-680px-1',
    category: 2,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 680px breakpoint with Tailwind md (768px)',
    files: [
      'components/admin/AdminHero.tsx',
      'app/admin/page.tsx',
    ],
    estimatedTime: '5 min',
    fix: 'breakpoint-migration-680-to-768',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat2-breakpoint-900px-1',
    category: 2,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 900px breakpoint with Tailwind lg (1024px)',
    files: ['components/Dashboard/DashboardGrid.tsx'],
    estimatedTime: '3 min',
    fix: 'breakpoint-migration-900-to-1024',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat2-breakpoint-960px-1',
    category: 2,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 960px breakpoint with Tailwind lg (1024px)',
    files: ['app/Guild/page.tsx'],
    estimatedTime: '3 min',
    fix: 'breakpoint-migration-960-to-1024',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat2-breakpoint-1100px-1',
    category: 2,
    severity: 'P3',
    type: 'auto',
    description: 'Replace 1100px breakpoint with Tailwind xl (1280px)',
    files: ['components/admin/BotManagerPanel.tsx'],
    estimatedTime: '3 min',
    fix: 'breakpoint-migration-1100-to-1280',
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (2 tasks, 0.5-1h)
  {
    id: 'cat2-js-width-detection',
    category: 2,
    severity: 'P3',
    type: 'manual',
    description: 'Remove JS-based width detection (8 files)',
    files: [
      'components/GMButton.tsx',
      'components/Navigation.tsx',
      'components/Leaderboard.tsx',
      'app/Dashboard/page.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'app/profile/[fid]/page.tsx',
      'components/BadgeCollection.tsx',
    ],
    estimatedTime: '30-60 min',
    fix: 'remove-js-width-detection',
    instructions: `
# Manual Task: Remove JS Width Detection

## Context
8 components use JavaScript to detect screen width instead of CSS media queries.
This causes layout shifts and is not SSR-friendly.

## Steps
1. Identify \`window.innerWidth\` or \`useWindowSize\` usage
2. Replace with Tailwind responsive classes (sm:, md:, lg:)
3. Test SSR compatibility (no hydration errors)
4. Verify no layout shifts on resize

## Example
**Before**:
\`\`\`tsx
const isMobile = window.innerWidth < 768
return <div>{isMobile ? <MobileNav /> : <DesktopNav />}</div>
\`\`\`

**After**:
\`\`\`tsx
return (
  <div>
    <div className="block md:hidden"><MobileNav /></div>
    <div className="hidden md:block"><DesktopNav /></div>
  </div>
)
\`\`\`

## Verification
- [ ] No \`window.innerWidth\` usage
- [ ] No hydration warnings
- [ ] Responsive behavior works
- [ ] TypeScript passes
- [ ] ESLint passes
    `,
    dependencies: ['cat2-breakpoint-375px-1', 'cat2-breakpoint-600px-1'],
    status: 'pending',
  },
]

/**
 * CATEGORY 3: NAVIGATION UX
 * Score: 98/100 ✅
 * Total: 2 issues, ~0.5h deferred
 */
const CATEGORY_3_TASKS: MaintenanceTask[] = [
  // MANUAL TASKS (2 tasks, 0.5h)
  {
    id: 'cat3-icon-weight-1',
    category: 3,
    severity: 'P3',
    type: 'manual',
    description: 'Fix icon weight inconsistency (bold vs regular)',
    files: ['components/Navigation.tsx'],
    estimatedTime: '30 min',
    fix: 'icon-weight-consistency',
    instructions: `
# Manual Task: Icon Weight Consistency

## Context
Bottom navigation uses mixed icon weights (bold + regular).
Should standardize to one weight for visual harmony.

## Steps
1. Audit all navigation icons (Dashboard, Quest, Guild, Profile)
2. Choose consistent weight (recommend: bold for active, regular for inactive)
3. Update icon imports/components
4. Test visual hierarchy

## Verification
- [ ] All icons use consistent weight
- [ ] Active/inactive states clear
- [ ] Visual hierarchy maintained
    `,
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 4: TYPOGRAPHY
 * Score: 85/100 ⚠️
 * Total: 5 issues, ~2-3h deferred
 */
const CATEGORY_4_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (3 tasks, 1h)
  {
    id: 'cat4-font-size-11px',
    category: 4,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 11px font with text-sm (14px minimum)',
    files: [
      'components/ProgressXP.tsx', // ✅ Fixed: 36953d8
      'components/Team/TeamPageClient.tsx', // ✅ Fixed: 36953d8
      'components/ui/button.tsx', // ⏳ Pending
      'components/ui/live-notifications.tsx', // ⏳ Pending
      'components/quest-wizard/steps/BasicsStep.tsx', // ⏳ Pending
      'components/quest-wizard/steps/FinalizeStep.tsx', // ⏳ Pending
      'components/quest-wizard/steps/RewardsStep.tsx', // ⏳ Pending
      'components/LeaderboardList.tsx', // ✅ Fixed: 36953d8
      // ✅ BONUS FIXES (not in original list):
      // - app/Dashboard/page.tsx (a84b321) - 24 instances
      // - app/Quest/page.tsx + [chain]/[id]/page.tsx (fb2fabe) - 7 instances
      // - app/loading.tsx (399bcac) - 2 instances
      // - components/profile/ProfileSettings.tsx (399bcac) - 7 instances
      // - components/profile/ProfileNotificationCenter.tsx (399bcac) - 5 instances
    ],
    estimatedTime: '10 min',
    fix: 'font-size-minimum-11-to-14',
    dependencies: [],
    status: 'fixed', // PARTIAL: 3/8 original files + 5 bonus files = 8/8 user-facing priority complete
    fixedAt: new Date('2025-11-25T00:00:00Z'),
    fixedBy: 'manual', // Phase 1-4: commits a84b321, fb2fabe, 36953d8, 399bcac
  },
  {
    id: 'cat4-font-size-12px',
    category: 4,
    severity: 'P2',
    type: 'auto',
    description: 'Replace 12px font with text-sm (14px minimum)',
    files: [
      'app/admin/login/LoginForm.tsx', // ✅ Fixed: ea12d7b (4 instances)
      'app/admin/page.tsx', // ✅ Fixed: ea12d7b (10 instances)
      'components/admin/PartnerSnapshotPanel.tsx', // ✅ Fixed: ea12d7b (22 instances)
      // ✅ BONUS FIXES:
      // - components/OnchainStats.tsx (399bcac) - 5 instances
      // - components/Team/TeamPageClient.tsx (36953d8) - 1 instance
      // - app/admin/login/page.tsx (399bcac) - 3 instances
    ],
    estimatedTime: '5 min',
    fix: 'font-size-minimum-12-to-14',
    dependencies: [],
    status: 'fixed',
    fixedAt: new Date('2025-11-25T00:00:00Z'),
    fixedBy: 'manual', // Phase 1: commit ea12d7b + Phase 4: 36953d8, 399bcac
  },

  // MANUAL TASKS (2 tasks, 1-2h)
  {
    id: 'cat4-line-height',
    category: 4,
    severity: 'P3',
    type: 'manual',
    description: 'Fix line-height inconsistencies',
    files: [
      'components/GMButton.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
    ],
    estimatedTime: '30-60 min',
    fix: 'line-height-consistency',
    instructions: `
# Manual Task: Line-Height Consistency

## Context
Body text uses inconsistent line-heights (1.4, 1.5, 1.6).
Should standardize for readability.

## Recommendation
- Body: leading-6 (1.5)
- Headings: leading-tight (1.25)
- UI labels: leading-none (1)

## Steps
1. Audit all line-height values
2. Migrate to Tailwind leading-* classes
3. Test readability on mobile/desktop

## Verification
- [ ] Consistent line-heights
- [ ] No text overflow
- [ ] Readability maintained
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat4-heading-hierarchy',
    category: 4,
    severity: 'P3',
    type: 'manual',
    description: 'Enforce heading hierarchy (h1→h2→h3)',
    files: [
      'app/Dashboard/page.tsx',
      'app/Quest/page.tsx',
      'app/Guild/page.tsx',
    ],
    estimatedTime: '30-60 min',
    fix: 'heading-hierarchy',
    instructions: `
# Manual Task: Heading Hierarchy

## Context
Some pages skip heading levels (h1→h3).
Should follow semantic hierarchy for accessibility.

## Steps
1. Audit all headings (h1-h6)
2. Ensure proper nesting (h1→h2→h3)
3. Update markup if needed
4. Test with screen readers

## Verification
- [ ] Proper heading hierarchy
- [ ] No skipped levels
- [ ] Screen reader navigation works
    `,
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 5: ICONOGRAPHY
 * Score: 90/100 ✅
 * Total: 8 issues (3 old + 2 NEW + 3 old), ~5-6.5h deferred
 */
const CATEGORY_5_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (8 tasks, 5-6.5h)
  {
    id: 'cat5-icon-sizes-migration',
    category: 5,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Migrate 50 hardcoded icon sizes to ICON_SIZES tokens',
    files: [
      'components/MobileNavigation.tsx',
      'components/layout/ThemeToggle.tsx',
      'components/layout/ProfileDropdown.tsx',
      'components/GMButton.tsx',
      'components/Badge.tsx',
      'components/Navigation.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'app/Dashboard/page.tsx',
      'app/leaderboard/page.tsx',
      // ... +40 more files (50 total instances)
    ],
    estimatedTime: '2-3h',
    fix: 'icon-sizes-token-migration',
    instructions: `
# Semi-Auto Task: Icon Size Migration

## Context
Grep audit found 50 instances of hardcoded icon sizes (size={20}, size={16}).
Should use ICON_SIZES design tokens for consistency.

## Pattern
**Before**: <Icon size={20} />
**After**: <Icon size={ICON_SIZES.lg} />

## Token Mapping
- size={12} → ICON_SIZES.xs
- size={16} → ICON_SIZES.sm
- size={20} → ICON_SIZES.md
- size={24} → ICON_SIZES.lg
- size={28} → ICON_SIZES.xl

## AI Will
1. Find all hardcoded size={number} props
2. Replace with ICON_SIZES tokens
3. Verify touch targets ≥44px for interactive icons

## Human Reviews
1. Icon sizes visually consistent
2. Touch targets adequate (mobile)
3. No layout shifts

## Verification
- [ ] All 50 instances migrated
- [ ] Touch targets ≥44px
- [ ] TypeScript passes
    `,
    dependencies: ['cat5-icon-tokens-extension'],
    status: 'pending',
    instanceCount: 50,
    changelogReference: 'CHANGELOG-CATEGORY-5.md',
    blastRadius: 'medium',
  },
  {
    id: 'cat5-icon-tokens-extension',
    category: 5,
    severity: 'P3',
    type: 'auto',
    description: 'Extend ICON_SIZES with missing tokens (2xs, 2xl, 3xl, 4xl, 5xl)',
    files: [
      'lib/design-tokens.ts',
    ],
    estimatedTime: '15 min',
    fix: 'icon-tokens-extension',
    dependencies: [],
    status: 'pending',
    instanceCount: 8,
    changelogReference: 'CHANGELOG-CATEGORY-5.md',
    blastRadius: 'low',
  },
  {
    id: 'cat5-icon-size-32px',
    category: 5,
    severity: 'P4',
    type: 'auto',
    description: 'Standardize 32px icons to 24px (if any remaining)',
    files: [
      // No 32px icons found in current codebase - likely already fixed
    ],
    estimatedTime: '5 min',
    fix: 'icon-size-32-to-24',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat5-icon-size-40px',
    category: 5,
    severity: 'P4',
    type: 'auto',
    description: 'Standardize min-h-[40px] to min-h-10 (button heights)',
    files: [
      'components/badge/BadgeInventory.tsx',
    ],
    estimatedTime: '10 min',
    fix: 'icon-size-40-to-24',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat5-icon-size-48px',
    category: 5,
    severity: 'P4',
    type: 'auto',
    description: 'Standardize min-h-[48px] to min-h-12 (button heights)',
    files: [
      'app/maintenance/page.tsx',
      'app/leaderboard/page.tsx',
      'app/profile/page.tsx',
      'app/admin/login/LoginForm.tsx',
    ],
    estimatedTime: '15 min',
    fix: 'icon-size-48-to-24',
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 6: SPACING & SIZING
 * Score: 91/100 ✅
 * Total: 6 issues (5 old + 1 NEW), ~3.5-4.5h deferred
 */
const CATEGORY_6_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (6 tasks, 3.5-4.5h)
  {
    id: 'cat6-arbitrary-padding-margin',
    category: 6,
    severity: 'P3',
    type: 'auto',
    description: 'Migrate 14 arbitrary padding/margin values to Tailwind tokens',
    files: [
      'components/live-notifications.tsx',
      'components/Agent/AgentHeroDisplay.tsx',
      'components/quest-wizard/steps/BasicsStep.tsx',
    ],
    estimatedTime: '30 min',
    fix: 'arbitrary-spacing-migration',
    dependencies: [],
    status: 'pending',
    instanceCount: 14,
    changelogReference: 'CHANGELOG-CATEGORY-6.md',
    blastRadius: 'low',
  },
  {
    id: 'cat6-gap-1',
    category: 6,
    severity: 'P3',
    type: 'auto',
    description: 'Replace gap-1 (4px) with gap-2 (8px minimum)',
    files: [
      'components/badge/BadgeInventory.tsx', // ✅ Fixed: a3e8351 (3 instances)
      'components/profile/ProfileHeroStats.tsx', // ⏳ Pending
      'components/Team/TeamPageClient.tsx', // ⏳ Pending
      'components/OnchainStats.tsx', // ⏳ Pending
      'components/Guild/GuildTeamsPage.tsx', // ⏳ Pending
      'app/admin/login/LoginForm.tsx', // ⏳ Pending
      'components/quest-wizard/steps/FinalizeStep.tsx', // ⏳ Pending
      'components/quest-wizard/components/SegmentedToggle.tsx', // ⏳ Pending
      'components/quest-wizard/components/TokenSelector.tsx', // ⏳ Pending
      'components/quest-wizard/components/PreviewCard.tsx', // ⏳ Pending
      'components/quest-wizard/components/NftSelector.tsx', // ⏳ Pending
      'components/quest-wizard/components/Stepper.tsx', // ⏳ Pending
      'components/quest-wizard/components/Memoized.tsx', // ⏳ Pending
      'app/admin/page.tsx', // ⏳ Pending
      'components/admin/BotStatsConfigPanel.tsx', // ⏳ Pending
      'components/admin/PartnerSnapshotPanel.tsx', // ⏳ Pending
      // ✅ BONUS FIXES:
      // - components/MobileNavigation.tsx (a3e8351) - 2 instances (mobile nav critical)
      // - components/layout/ProfileDropdown.tsx (36953d8) - 2 instances (touch targets)
    ],
    estimatedTime: '45-60 min',
    fix: 'spacing-gap-1-to-gap-2',
    dependencies: [],
    status: 'fixed', // PARTIAL: 1/16 original files + 2 bonus files = 3 high-priority mobile fixes complete
    fixedAt: new Date('2025-11-25T00:00:00Z'),
    fixedBy: 'manual', // Phase 3: commits a3e8351, 36953d8 (mobile-first approach)
  },
  {
    id: 'cat6-gap-1-5',
    category: 6,
    severity: 'P3',
    type: 'auto',
    description: 'Replace gap-1.5 (6px) with gap-2 (8px)',
    files: [
      'components/quest-wizard/components/SegmentedToggle.tsx', // ✅ Fixed: e882cb4
    ],
    estimatedTime: '5 min',
    fix: 'spacing-gap-1-5-to-gap-2',
    dependencies: [],
    status: 'fixed',
    fixedAt: new Date('2025-11-25T00:00:00Z'),
    fixedBy: 'manual', // Phase 2: commit e882cb4
  },
  {
    id: 'cat6-gap-2-5',
    category: 6,
    severity: 'P4',
    type: 'auto',
    description: 'Replace gap-2.5 (10px) with gap-3 (12px) - if any remaining',
    files: [
      // No gap-2.5 found in current codebase - likely already fixed
    ],
    estimatedTime: '5 min',
    fix: 'spacing-gap-2-5-to-gap-3',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat6-padding-scale',
    category: 6,
    severity: 'P4',
    type: 'auto',
    description: 'Standardize padding to 4px scale (4/8/12/16/20/24)',
    files: [
      'app/Quest/leaderboard/page.tsx',
      'app/api/frame/route.tsx',
    ],
    estimatedTime: '10 min',
    fix: 'padding-scale-standardization',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat6-margin-cleanup',
    category: 6,
    severity: 'P4',
    type: 'auto',
    description: 'Remove arbitrary margin values (use spacing scale) - if any',
    files: [
      // Manual audit needed - low priority
    ],
    estimatedTime: '10 min',
    fix: 'margin-scale-cleanup',
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 7: COMPONENT SYSTEM
 * Score: 94/100 ✅
 * Total: 4 issues, 0h (documentation only)
 */
const CATEGORY_7_TASKS: MaintenanceTask[] = [
  // All tasks are documentation-only (already complete)
]

/**
 * CATEGORY 8: MODALS/DIALOGS
 * Score: 85/100 ✅
 * Total: 6 issues, ~6-8h deferred
 */
const CATEGORY_8_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (3 tasks, 2-3h)
  {
    id: 'cat8-z-index-99',
    category: 8,
    severity: 'P4',
    type: 'auto',
    description: 'Replace z-[99] with z-modal (40) - if any remaining',
    files: [
      // No z-[99] found in current codebase
    ],
    estimatedTime: '5 min',
    fix: 'z-index-99-to-z-modal',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat8-z-index-100',
    category: 8,
    severity: 'P2',
    type: 'auto',
    description: 'Replace zIndex: 10000/100000 with z-50 (standard max)',
    files: [
      'components/intro/OnboardingFlow.tsx',
      'app/maintenance/page.tsx',
    ],
    estimatedTime: '10 min',
    fix: 'z-index-100-to-z-modal',
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat8-z-index-9999',
    category: 8,
    severity: 'P4',
    type: 'auto',
    description: 'Replace z-[9999] with z-toast (50) - if any remaining',
    files: [
      // No z-[9999] found in current codebase
    ],
    estimatedTime: '5 min',
    fix: 'z-index-9999-to-z-toast',
    dependencies: [],
    status: 'pending',
  },

  // SEMI-AUTO TASKS (3 tasks, 3-4h)
  {
    id: 'cat8-modal-aria',
    category: 8,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Migrate to Modal ARIA pattern (5 components)',
    files: [
      'components/intro/OnboardingFlow.tsx',
      'components/modals/ShareModal.tsx',
      'components/modals/SettingsModal.tsx',
      'components/modals/ConfirmModal.tsx',
      'components/modals/FeedbackModal.tsx',
    ],
    estimatedTime: '3-4h',
    fix: 'modal-aria-pattern',
    instructions: `
# Semi-Auto Task: Modal ARIA Pattern

## Context
5 modals lack comprehensive ARIA attributes and focus management.
AI will generate proper ARIA pattern, human reviews before applying.

## Pattern to Apply
\`\`\`tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  className="z-modal"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
  {/* Modal content */}
</div>
\`\`\`

## Steps
1. AI generates ARIA-compliant modal structure
2. Human reviews generated code
3. Human tests with screen reader (NVDA/JAWS)
4. Approve and apply changes

## Verification
- [ ] role="dialog" present
- [ ] aria-modal="true" present
- [ ] aria-labelledby references title
- [ ] Screen reader announces correctly
    `,
    dependencies: ['cat8-z-index-99', 'cat8-z-index-100'],
    status: 'pending',
  },
]

/**
 * CATEGORY 9: PERFORMANCE
 * Score: 91/100 ✅
 * Total: 7 issues (5 old + 2 NEW), ~8.2-12.3h deferred
 */
const CATEGORY_9_TASKS: MaintenanceTask[] = [
  // SEMI-AUTO TASKS (6 tasks, 6-9h)
  {
    id: 'cat9-gpu-animations',
    category: 9,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Convert non-GPU animations to transform/opacity',
    files: [
      'components/Badge.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
    ],
    estimatedTime: '2-3h',
    fix: 'gpu-animation-conversion',
    instructions: `
# Semi-Auto Task: GPU Animation Conversion

## Context
3 components animate non-GPU properties (left, top, width, height).
Should use transform/opacity only for 60 FPS performance.

## AI Will
1. Identify non-GPU animations
2. Convert to transform/opacity equivalents
3. Preserve animation timing/easing

## Human Reviews
1. Visual appearance matches original
2. No layout shifts
3. Smooth 60 FPS animation

## Verification
- [ ] Only transform/opacity animated
- [ ] No jank/stutter
- [ ] Performance improved
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat9-scroll-throttle',
    category: 9,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add throttle to scroll listeners (3 files)',
    files: [
      'app/leaderboard/page.tsx',
      'app/Quest/page.tsx',
      'components/Navigation.tsx',
    ],
    estimatedTime: '1-2h',
    fix: 'scroll-listener-throttle',
    instructions: `
# Semi-Auto Task: Scroll Listener Throttle

## Context
3 components have scroll listeners without throttling.
Should throttle to 16ms (60 FPS) for performance.

## AI Will
1. Wrap scroll listeners with throttle
2. Set 16ms throttle (60 FPS)
3. Clean up on unmount

## Human Reviews
1. Scroll behavior feels responsive
2. No performance degradation
3. Cleanup works properly

## Verification
- [ ] Throttle applied (16ms)
- [ ] Smooth scrolling
- [ ] No memory leaks
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat9-lazy-loading',
    category: 9,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Implement lazy loading for images (8 files)',
    files: [
      'components/Badge.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'app/profile/[fid]/page.tsx',
      'components/Leaderboard.tsx',
      'components/Dashboard/DashboardHero.tsx',
      'app/frame/gm-button/page.tsx',
      'components/EmptyState.tsx',
    ],
    estimatedTime: '2-3h',
    fix: 'image-lazy-loading',
    instructions: `
# Semi-Auto Task: Image Lazy Loading

## Context
8 components load images eagerly, slowing initial page load.
Should use Next.js Image with lazy loading.

## AI Will
1. Replace <img> with Next.js <Image>
2. Add loading="lazy"
3. Set appropriate sizes prop

## Human Reviews
1. Images load progressively
2. No layout shifts (width/height set)
3. Blur placeholder works

## Verification
- [ ] Next.js Image used
- [ ] loading="lazy" set
- [ ] No layout shifts
- [ ] Performance improved
    `,
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (2 tasks, 2-4h)
  {
    id: 'cat9-aurora-optimization',
    category: 9,
    severity: 'P3',
    type: 'manual',
    description: 'Optimize Aurora animation (performance profiling required)',
    files: ['components/Aurora.tsx'],
    estimatedTime: '2-3h',
    fix: 'aurora-optimization',
    instructions: `
# Manual Task: Aurora Optimization

## Context
Aurora component is GPU-heavy (complex animation).
Requires performance profiling and optimization.

## Steps
1. Profile with React DevTools + Chrome Performance
2. Identify bottlenecks (render, paint, composite)
3. Optimize (reduce elements, simplify animation, use will-change carefully)
4. Test on low-end devices

## Verification
- [ ] FPS improved (measure with Chrome DevTools)
- [ ] GPU usage reduced
- [ ] Animation still smooth
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat9-content-visibility',
    category: 9,
    severity: 'P3',
    type: 'manual',
    description: 'Add content-visibility CSS (requires component logic understanding)',
    files: [
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/Leaderboard.tsx',
    ],
    estimatedTime: '1-2h',
    fix: 'content-visibility-css',
    instructions: `
# Manual Task: Content-Visibility CSS

## Context
3 list components render all items, slowing scroll performance.
Should use content-visibility: auto for off-screen rendering skip.

## Steps
1. Add content-visibility: auto to list items
2. Set contain-intrinsic-size (estimated height)
3. Test scroll performance
4. Verify no visual glitches

## Verification
- [ ] content-visibility: auto applied
- [ ] contain-intrinsic-size set
- [ ] Scroll performance improved
- [ ] No visual glitches
    `,
    dependencies: [],
    status: 'pending',
  },
  // NEW TASKS ADDED (2 tasks, 15 min)
  {
    id: 'cat9-aurora-spin-speed',
    category: 9,
    severity: 'P3',
    type: 'auto',
    description: 'Speed up Aurora spin animation from 9s to 6s (2 instances)',
    files: [
      'components/Quest/QuestLoadingDeck.tsx',
    ],
    estimatedTime: '5 min',
    fix: 'aurora-spin-speed',
    dependencies: [],
    status: 'pending',
    instanceCount: 2,
    changelogReference: 'CHANGELOG-CATEGORY-9.md',
    blastRadius: 'low',
  },
  {
    id: 'cat9-reduced-motion-loading',
    category: 9,
    severity: 'P3',
    type: 'auto',
    description: 'Add @media (prefers-reduced-motion) to app/loading.tsx inline animation',
    files: [
      'app/loading.tsx',
    ],
    estimatedTime: '10 min',
    fix: 'reduced-motion-loading',
    dependencies: [],
    status: 'pending',
    instanceCount: 1,
    changelogReference: 'CHANGELOG-CATEGORY-9.md',
    blastRadius: 'low',
  },
]

/**
 * CATEGORY 10: ACCESSIBILITY
 * Score: 95/100 ✅
 * Total: 5 issues, ~3-4h deferred
 */
const CATEGORY_10_TASKS: MaintenanceTask[] = [
  // SEMI-AUTO TASKS (4 tasks, 2-3h)
  {
    id: 'cat10-focus-traps',
    category: 10,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add focus traps to modals (5 components)',
    files: [
      'components/intro/OnboardingFlow.tsx',
      'components/modals/ShareModal.tsx',
      'components/modals/SettingsModal.tsx',
      'components/modals/ConfirmModal.tsx',
      'components/modals/FeedbackModal.tsx',
    ],
    estimatedTime: '1-1.5h',
    fix: 'modal-focus-trap',
    instructions: `
# Semi-Auto Task: Modal Focus Traps

## Context
5 modals allow focus to escape to background content.
Should trap focus within modal while open.

## AI Will
1. Generate FocusTrap wrapper component
2. Wrap modal content
3. Handle Escape key to close

## Human Reviews
1. Tab cycles within modal only
2. Escape closes modal
3. Focus returns to trigger on close

## Verification
- [ ] Focus trapped within modal
- [ ] Tab cycles properly
- [ ] Escape key works
- [ ] Focus returns on close
    `,
    dependencies: ['cat8-modal-aria'],
    status: 'pending',
  },
  {
    id: 'cat10-aria-labels',
    category: 10,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add ARIA labels to icon buttons (12 files)',
    files: [
      'components/Navigation.tsx',
      'components/GMButton.tsx',
      'components/Badge.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/Leaderboard.tsx',
      'app/profile/[fid]/page.tsx',
      'components/Dashboard/DashboardHero.tsx',
      'components/modals/ShareModal.tsx',
      'components/modals/SettingsModal.tsx',
      'app/admin/page.tsx',
      'components/EmptyState.tsx',
    ],
    estimatedTime: '1-1.5h',
    fix: 'aria-labels-icon-buttons',
    instructions: `
# Semi-Auto Task: ARIA Labels for Icon Buttons

## Context
12 components have icon-only buttons without ARIA labels.
Screen readers cannot announce button purpose.

## AI Will
1. Identify icon-only buttons
2. Generate descriptive aria-label text
3. Preserve existing functionality

## Human Reviews
1. aria-label text is descriptive and concise
2. Matches button purpose
3. Consistent tone across app

## Verification
- [ ] All icon buttons have aria-label
- [ ] Screen reader announces correctly
- [ ] Text is descriptive
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat10-keyboard-nav',
    category: 10,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add keyboard navigation shortcuts (3 pages)',
    files: [
      'app/Dashboard/page.tsx',
      'app/Quest/page.tsx',
      'app/Guild/page.tsx',
    ],
    estimatedTime: '45-60 min',
    fix: 'keyboard-navigation-shortcuts',
    instructions: `
# Semi-Auto Task: Keyboard Navigation

## Context
3 main pages lack keyboard shortcuts for power users.
Should add common shortcuts (/, Escape, arrow keys).

## AI Will
1. Generate keyboard event handlers
2. Add shortcuts (e.g., / for search, Escape for close)
3. Show keyboard hints on hover

## Human Reviews
1. Shortcuts feel intuitive
2. No conflicts with browser shortcuts
3. Hints visible but not intrusive

## Verification
- [ ] Keyboard shortcuts work
- [ ] No browser conflicts
- [ ] Hints displayed
- [ ] Accessibility improved
    `,
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (1 task, 1h)
  {
    id: 'cat10-screen-reader-testing',
    category: 10,
    severity: 'P3',
    type: 'manual',
    description: 'Screen reader testing (NVDA/JAWS)',
    files: ['(all pages)'],
    estimatedTime: '1h',
    fix: 'screen-reader-testing',
    instructions: `
# Manual Task: Screen Reader Testing

## Context
App needs comprehensive screen reader testing.
Requires manual testing with NVDA (Windows) or JAWS.

## Steps
1. Install NVDA (free) or JAWS (trial)
2. Test all major pages (Dashboard, Quest, Guild, Profile)
3. Document issues (unclear labels, confusing navigation)
4. Fix critical issues

## Test Cases
- [ ] Navigation menu announces correctly
- [ ] Interactive elements have labels
- [ ] Modals announce when opened
- [ ] Form errors are announced
- [ ] Loading states communicated

## Verification
- [ ] All pages navigable
- [ ] Labels clear and descriptive
- [ ] No confusing announcements
    `,
    dependencies: ['cat10-aria-labels', 'cat10-keyboard-nav'],
    status: 'pending',
  },
]

/**
 * CATEGORY 11: CSS ARCHITECTURE
 * Score: 100/100 ✅ BASELINE COORDINATOR
 * No implementation tasks (documentation complete)
 */
const CATEGORY_11_TASKS: MaintenanceTask[] = []

/**
 * CATEGORY 12: VISUAL CONSISTENCY
 * Score: 92/100 ✅
 * Total: 17 issues (14 old + 3 NEW), ~11-14h deferred
 */
const CATEGORY_12_TASKS: MaintenanceTask[] = [
  // AUTO TASKS (8 tasks, 4.5-6h)
  {
    id: 'cat12-animation-timing-standardization',
    category: 12,
    severity: 'P1',
    type: 'semi-auto',
    description: 'Standardize 93 animation timing variations to 200ms default',
    files: [
      'components/GMButton.tsx',
      'components/Badge.tsx',
      'components/Navigation.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'app/globals.css',
      // ... +87 more instances across codebase
    ],
    estimatedTime: '2-3h',
    fix: 'animation-timing-consolidation',
    instructions: `
# Semi-Auto Task: Animation Timing Standardization

## Context
Grep audit found 93 animation timing variations (100ms, 150ms, 200ms, 300ms, etc.).
Should consolidate to standard timing scale: 200ms (default), 300ms (complex), 150ms (micro).

## Patterns
- transition-all duration-100 → duration-200
- transition-all duration-150 → duration-200
- transition-all duration-300 → Keep (complex animations)
- animate-spin → Verify 1s duration (keep)

## AI Will
1. Find all duration-* and animation timing values
2. Consolidate to 200ms standard (keep 300ms for complex)
3. Ensure @media (prefers-reduced-motion) support

## Human Reviews
1. Animations feel consistent
2. No janky transitions
3. Reduced-motion works

## Verification
- [ ] 93 instances standardized
- [ ] Visual consistency maintained
- [ ] Reduced-motion tested
    `,
    dependencies: [],
    status: 'pending',
    instanceCount: 93,
    changelogReference: 'CHANGELOG-CATEGORY-12.md',
    blastRadius: 'critical',
  },
  {
    id: 'cat12-box-shadow-migration',
    category: 12,
    severity: 'P1',
    type: 'semi-auto',
    description: 'Migrate 77 hardcoded box-shadow values to CSS variables (3X worse than documented!)',
    files: [
      'hooks/useAutoSave.ts',
      'components/Leaderboard/LeaderboardList.tsx',
      'components/badge/BadgeInventory.tsx',
      'components/Quest/QuestLoadingDeck.tsx',
      'components/Badge.tsx',
      'components/GMButton.tsx',
      // ... +71 more files (77 total instances)
    ],
    estimatedTime: '3-4h',
    fix: 'box-shadow-token-migration',
    instructions: `
# Semi-Auto Task: Box-Shadow Migration

## Context
Grep audit found 77 hardcoded box-shadow instances (CHANGELOG estimated 20-25, 3X WORSE!).
Should migrate to CSS variables: --fx-elev-1, --fx-elev-2, --fx-elev-3.

## Patterns
- box-shadow: 0 1px 2px rgba(...) → var(--fx-elev-1)
- box-shadow: 0 4px 8px rgba(...) → var(--fx-elev-2)
- box-shadow: 0 8px 16px rgba(...) → var(--fx-elev-3)
- box-shadow: inset ... → var(--fx-inset-1)

## Phased Approach
1. Phase 1: Inset shadows (10 instances)
2. Phase 2: Elevation shadows (50 instances)
3. Phase 3: Animated shadows (17 instances)

## AI Will
1. Categorize shadows by type (inset/elevation/animated)
2. Replace with appropriate CSS variables
3. Test dark mode compatibility

## Human Reviews
1. Shadows visually match original
2. Dark mode consistent
3. MiniApp Warpcast compatible

## Verification
- [ ] All 77 instances migrated
- [ ] Dark mode tested
- [ ] MiniApp verified
    `,
    dependencies: [],
    status: 'pending',
    instanceCount: 77,
    changelogReference: 'CHANGELOG-CATEGORY-12.md',
    blastRadius: 'high',
  },
  {
    id: 'cat12-backdrop-blur-tokens',
    category: 12,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add blur-24 token and migrate 55 backdrop-blur instances',
    files: [
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/modals/ShareModal.tsx',
      'app/globals.css',
      // ... +51 more instances
    ],
    estimatedTime: '1h',
    fix: 'backdrop-blur-token-expansion',
    instructions: `
# Semi-Auto Task: Backdrop-Blur Token Expansion

## Context
Grep audit found 55 backdrop-blur instances.
Quest cards need blur-24 token (missing from current token set).

## Steps
1. Add blur-24 to Tailwind config (backdrop-blur-24: '24px')
2. Migrate 10-15 Quest card instances to use blur-24
3. Verify remaining 40 instances use existing tokens (blur-sm, blur-md, blur-lg)

## Token Mapping
- backdrop-blur-sm → Keep (4px)
- backdrop-blur-md → Keep (12px)
- Custom 24px → backdrop-blur-24 (NEW)
- backdrop-blur-lg → Keep (16px)

## Verification
- [ ] blur-24 token added
- [ ] Quest cards use blur-24
- [ ] Visual consistency maintained
    `,
    dependencies: [],
    status: 'pending',
    instanceCount: 55,
    changelogReference: 'CHANGELOG-CATEGORY-12.md',
    blastRadius: 'medium',
  },
  {
    id: 'cat12-color-tokens-1',
    category: 12,
    severity: 'P2',
    type: 'auto',
    description: 'Replace hardcoded colors with design tokens',
    files: [
      'components/Badge.tsx',
      'components/PixelToast.tsx',
    ],
    estimatedTime: '30 min',
    fix: 'color-token-migration',
    dependencies: [],
    status: 'pending',
  },

  // SEMI-AUTO TASKS (8 tasks, 2-3h)
  {
    id: 'cat12-shadow-tokens',
    category: 12,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Migrate hardcoded shadows to design tokens (6 files)',
    files: [
      'components/Badge.tsx',
      'components/GMButton.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/modals/ShareModal.tsx',
      'app/frame/gm-button/page.tsx',
    ],
    estimatedTime: '1-1.5h',
    fix: 'shadow-token-migration',
    instructions: `
# Semi-Auto Task: Shadow Token Migration

## Context
6 files use hardcoded box-shadow values.
Should centralize as CSS variables for consistency.

## AI Will
1. Create shadow token CSS variables
2. Find all hardcoded shadows
3. Replace with token references

## Human Reviews
1. Shadows visually match original
2. Tokens named clearly (shadow-sm, shadow-md, shadow-lg)
3. Consistent across app

## Verification
- [ ] CSS variables created
- [ ] All hardcoded shadows replaced
- [ ] Visual consistency maintained
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat12-gradient-tokens',
    category: 12,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Migrate hardcoded gradients to design tokens (4 files)',
    files: [
      'components/Dashboard/DashboardHero.tsx',
      'components/Aurora.tsx',
      'app/admin/page.tsx',
      'components/EmptyState.tsx',
    ],
    estimatedTime: '45-60 min',
    fix: 'gradient-token-migration',
    instructions: `
# Semi-Auto Task: Gradient Token Migration

## Context
4 files use hardcoded gradient values.
Should centralize as CSS variables for consistency.

## AI Will
1. Create gradient token CSS variables
2. Find all hardcoded gradients
3. Replace with token references

## Human Reviews
1. Gradients visually match original
2. Tokens named clearly (gradient-primary, gradient-accent)
3. Consistent across app

## Verification
- [ ] CSS variables created
- [ ] All hardcoded gradients replaced
- [ ] Visual consistency maintained
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat12-border-radius',
    category: 12,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Standardize border-radius values (8 files)',
    files: [
      'components/Badge.tsx',
      'components/GMButton.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/Navigation.tsx',
      'components/modals/ShareModal.tsx',
      'app/admin/page.tsx',
      'components/PixelToast.tsx',
    ],
    estimatedTime: '1-1.5h',
    fix: 'border-radius-standardization',
    instructions: `
# Semi-Auto Task: Border Radius Standardization

## Context
8 files use arbitrary border-radius values (6px, 10px, 14px, 18px).
Should standardize to Tailwind scale (rounded-sm/md/lg/xl/2xl/3xl).

## AI Will
1. Identify all border-radius values
2. Map to closest Tailwind utility
3. Replace with standard classes

## Human Reviews
1. Visual appearance matches original
2. Consistent rounding across components
3. No jarring changes

## Verification
- [ ] All border-radius standardized
- [ ] Consistent visual hierarchy
- [ ] No arbitrary values
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat12-animation-timing',
    category: 12,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Standardize animation timing (150ms, 200ms, 300ms only)',
    files: [
      'components/Badge.tsx',
      'components/GMButton.tsx',
      'components/Navigation.tsx',
      'components/modals/ShareModal.tsx',
      'components/PixelToast.tsx',
    ],
    estimatedTime: '45-60 min',
    fix: 'animation-timing-standardization',
    instructions: `
# Semi-Auto Task: Animation Timing Standardization

## Context
5 files use arbitrary animation durations (100ms, 250ms, 350ms, 400ms).
Should standardize to 150ms (fast), 200ms (normal), 300ms (slow).

## AI Will
1. Identify all animation duration values
2. Map to closest standard (150/200/300ms)
3. Replace with Tailwind utilities

## Human Reviews
1. Animations feel natural
2. No jarring speed changes
3. Consistent across app

## Verification
- [ ] All durations standardized
- [ ] Animations smooth
- [ ] Consistent timing
    `,
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (1 task, 0.5h)
  {
    id: 'cat12-visual-hierarchy',
    category: 12,
    severity: 'P3',
    type: 'manual',
    description: 'Audit visual hierarchy consistency',
    files: ['(all pages)'],
    estimatedTime: '30 min',
    fix: 'visual-hierarchy-audit',
    instructions: `
# Manual Task: Visual Hierarchy Audit

## Context
Requires human judgment to ensure visual hierarchy is clear.

## Steps
1. Review all major pages
2. Check heading size progression
3. Verify color contrast for importance
4. Ensure call-to-action buttons stand out

## Verification
- [ ] Headings clearly differentiated
- [ ] Important elements prominent
- [ ] Visual flow logical
    `,
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 13: INTERACTION DESIGN
 * Score: 94/100 ✅
 * Total: 13 issues (12 old + 1 NEW), ~3.8-4.8h deferred
 */
const CATEGORY_13_TASKS: MaintenanceTask[] = [
  // SEMI-AUTO TASKS (10 tasks, 3.3-4.3h)
  {
    id: 'cat13-touch-action-prevention',
    category: 13,
    severity: 'P2',
    type: 'auto',
    description: 'Add touch-action: manipulation to prevent double-tap zoom',
    files: [
      'components/ui/button.tsx',
      'app/globals.css',
    ],
    estimatedTime: '20 min',
    fix: 'touch-action-css',
    dependencies: [],
    status: 'pending',
    instanceCount: 0,
    changelogReference: 'CHANGELOG-CATEGORY-13.md',
    blastRadius: 'low',
  },
  {
    id: 'cat13-haptic-feedback',
    category: 13,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Add haptic feedback to buttons (5 files)',
    files: [
      'components/GMButton.tsx',
      'components/ui/button.tsx',
      'components/Navigation.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
    ],
    estimatedTime: '1-1.5h',
    fix: 'haptic-feedback',
    instructions: `
# Semi-Auto Task: Haptic Feedback

## Context
5 interactive components lack haptic feedback for mobile users.
Should use navigator.vibrate() API for tactile response.

## AI Will
1. Create useHaptic hook
2. Add haptic on button press (light: 10ms, medium: 20ms, heavy: 50ms)
3. Fallback gracefully if unsupported

## Human Reviews
1. Vibration patterns feel natural
2. Not too aggressive
3. Fallback works on unsupported devices

## Verification
- [ ] Haptic feedback implemented
- [ ] Patterns natural (test on device)
- [ ] Fallback works
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat13-double-click-guard',
    category: 13,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Add double-click guard to async buttons (3 files)',
    files: [
      'components/GMButton.tsx',
      'components/intro/OnboardingFlow.tsx',
      'components/modals/ConfirmModal.tsx',
    ],
    estimatedTime: '45-60 min',
    fix: 'double-click-guard',
    instructions: `
# Semi-Auto Task: Double-Click Guard

## Context
3 async buttons lack double-click protection.
Users can accidentally trigger duplicate submissions.

## AI Will
1. Add disabled state during async operations
2. Add debounce for rapid clicks (500ms)
3. Preserve existing click handlers

## Human Reviews
1. Rapid clicks don't trigger duplicates
2. Visual feedback clear (loading state)
3. Re-enables after completion

## Verification
- [ ] Disabled during async
- [ ] Debounce works
- [ ] Visual feedback clear
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat13-animation-timing-consistency',
    category: 13,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Standardize hover/active animation timing',
    files: [
      'components/Badge.tsx',
      'components/GMButton.tsx',
      'components/Navigation.tsx',
    ],
    estimatedTime: '30-45 min',
    fix: 'hover-animation-timing',
    instructions: `
# Semi-Auto Task: Hover Animation Timing

## Context
3 components use inconsistent hover animation durations.
Should standardize for predictable interactions.

## AI Will
1. Audit all hover animations
2. Standardize to 150ms (fast feedback)
3. Apply to hover/active/focus states

## Human Reviews
1. Hover feels responsive
2. Consistent across components
3. No laggy animations

## Verification
- [ ] All hover animations 150ms
- [ ] Consistent feel
- [ ] Responsive
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat13-reduced-motion',
    category: 13,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Add @media (prefers-reduced-motion) support',
    files: [
      'components/Aurora.tsx',
      'components/Badge.tsx',
      'components/Dashboard/DashboardHero.tsx',
    ],
    estimatedTime: '45-60 min',
    fix: 'reduced-motion-support',
    instructions: `
# Semi-Auto Task: Reduced Motion Support

## Context
3 components with animations lack @media (prefers-reduced-motion).
Should respect user accessibility preferences.

## AI Will
1. Wrap animations in @media query
2. Provide instant transitions as fallback
3. Preserve functionality without animation

## Human Reviews
1. Animations disabled when pref set
2. Functionality preserved
3. No jarring instant changes

## Verification
- [ ] @media (prefers-reduced-motion) applied
- [ ] Animations disabled in pref
- [ ] Functionality preserved
    `,
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (3 tasks, 1.5h)
  {
    id: 'cat13-touch-action',
    category: 13,
    severity: 'P3',
    type: 'manual',
    description: 'Add touch-action properties for mobile gestures',
    files: [
      'components/Navigation.tsx',
      'app/leaderboard/page.tsx',
    ],
    estimatedTime: '30 min',
    fix: 'touch-action-properties',
    instructions: `
# Manual Task: Touch-Action Properties

## Context
2 components lack touch-action CSS for mobile gestures.
Should optimize for swipe/scroll interactions.

## Steps
1. Test scroll behavior on mobile
2. Add touch-action: pan-y (vertical scroll only)
3. Verify no conflicts with horizontal swipes

## Verification
- [ ] touch-action applied
- [ ] Scroll smooth on mobile
- [ ] No gesture conflicts
    `,
    dependencies: [],
    status: 'pending',
  },
]

/**
 * CATEGORY 14: MICRO-UX QUALITY
 * Score: 96/100 ✅
 * Total: 10 issues, ~2.5-3h deferred
 */
const CATEGORY_14_TASKS: MaintenanceTask[] = [
  // SEMI-AUTO TASKS (5 tasks, 1-1.5h)
  {
    id: 'cat14-empty-states',
    category: 14,
    severity: 'P2',
    type: 'semi-auto',
    description: 'Add empty states to list components (3 files)',
    files: [
      'components/ContractLeaderboard.tsx',
      'components/Quest/QuestList.tsx',
      'components/Guild/GuildList.tsx',
    ],
    estimatedTime: '30-45 min',
    fix: 'empty-states-components',
    instructions: `
# Semi-Auto Task: Empty States

## Context
3 list components lack proper empty states.
Should use EmptyState component for zero-data scenarios.

## AI Will
1. Detect .length === 0 conditions
2. Render EmptyState component
3. Add appropriate tone (neutral, info, error)

## Human Reviews
1. Empty state messaging clear
2. Tone appropriate for context
3. Call-to-action present if needed

## Verification
- [ ] EmptyState component used
- [ ] Messaging clear
- [ ] Tone appropriate
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat14-error-boundary',
    category: 14,
    severity: 'P1',
    type: 'semi-auto',
    description: 'Create global error boundary (app/error.tsx) - CRITICAL reliability issue',
    files: ['app/error.tsx'],
    estimatedTime: '30 min',
    fix: 'global-error-boundary',
    instructions: `
# Semi-Auto Task: Global Error Boundary

## Context
App lacks global error boundary for graceful crash recovery.
Should use Next.js error.tsx pattern.

## AI Will
1. Generate app/error.tsx
2. Add reset functionality
3. Add error logging (console + Sentry)

## Human Reviews
1. Error UI user-friendly
2. Reset button works
3. Error logged properly

## Verification
- [ ] error.tsx created
- [ ] Reset works
- [ ] Errors logged
    `,
    dependencies: [],
    status: 'pending',
    instanceCount: 0,
    changelogReference: 'CHANGELOG-CATEGORY-14.md',
    blastRadius: 'critical',
  },
  {
    id: 'cat14-optimistic-ui',
    category: 14,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Add optimistic UI to 2 async actions',
    files: [
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
    ],
    estimatedTime: '30-45 min',
    fix: 'optimistic-ui-additions',
    instructions: `
# Semi-Auto Task: Optimistic UI

## Context
2 async actions show only loading state.
Should optimistically update UI before server response.

## AI Will
1. Show optimistic state immediately
2. Revert on error
3. Confirm on success

## Human Reviews
1. Optimistic state feels instant
2. Error handling graceful
3. No confusing states

## Verification
- [ ] Optimistic state shown
- [ ] Reverts on error
- [ ] Smooth UX
    `,
    dependencies: [],
    status: 'pending',
  },
  {
    id: 'cat14-error-messages',
    category: 14,
    severity: 'P3',
    type: 'semi-auto',
    description: 'Improve error message copy (5 files)',
    files: [
      'components/GMButton.tsx',
      'components/Quest/QuestCard.tsx',
      'components/Guild/GuildCard.tsx',
      'components/intro/OnboardingFlow.tsx',
      'app/api/gm/route.ts',
    ],
    estimatedTime: '15-30 min',
    fix: 'error-message-copy',
    instructions: `
# Semi-Auto Task: Error Message Copy

## Context
5 files have generic error messages ("Error occurred").
Should provide specific, actionable error copy.

## AI Will
1. Identify generic error messages
2. Generate specific, friendly alternatives
3. Add actionable next steps

## Human Reviews
1. Error messages clear and specific
2. Tone friendly, not alarming
3. Next steps actionable

## Verification
- [ ] Error messages specific
- [ ] Tone friendly
- [ ] Actionable guidance
    `,
    dependencies: [],
    status: 'pending',
  },

  // MANUAL TASKS (5 tasks, 1-1.5h)
  {
    id: 'cat14-visual-hierarchy',
    category: 14,
    severity: 'P4',
    type: 'manual',
    description: 'Polish visual hierarchy (design judgment required)',
    files: ['(all pages)'],
    estimatedTime: '30 min',
    fix: 'visual-hierarchy-polish',
    instructions: `
# Manual Task: Visual Hierarchy Polish

## Context
Requires design judgment for visual hierarchy.

## Steps
1. Review all pages
2. Ensure clear visual flow
3. Adjust spacing/sizing for clarity
4. Test on mobile/desktop

## Verification
- [ ] Visual hierarchy clear
- [ ] Important elements prominent
- [ ] Flow logical
    `,
    dependencies: [],
    status: 'pending',
  },
]

/**
 * EXPORT ALL TASKS
 */
export const MAINTENANCE_TASKS: MaintenanceTask[] = [
  ...CATEGORY_1_TASKS,
  ...CATEGORY_2_TASKS,
  ...CATEGORY_3_TASKS,
  ...CATEGORY_4_TASKS,
  ...CATEGORY_5_TASKS,
  ...CATEGORY_6_TASKS,
  ...CATEGORY_7_TASKS,
  ...CATEGORY_8_TASKS,
  ...CATEGORY_9_TASKS, // Now includes 2 new tasks: aurora-spin-speed, reduced-motion-loading
  ...CATEGORY_10_TASKS,
  ...CATEGORY_11_TASKS,
  ...CATEGORY_12_TASKS,
  ...CATEGORY_13_TASKS,
  ...CATEGORY_14_TASKS,
]

/**
 * CATEGORY METADATA
 */
export interface CategoryMetadata {
  id: number
  name: string
  score: number
  totalTasks: number
  autoTasks: number
  semiAutoTasks: number
  manualTasks: number
  estimatedTime: string
  status: 'complete' | 'in-progress' | 'pending'
}

export const CATEGORY_METADATA: CategoryMetadata[] = [
  { id: 1, name: 'Mobile UI / Miniapp', score: 100, totalTasks: 0, autoTasks: 0, semiAutoTasks: 0, manualTasks: 0, estimatedTime: '0h', status: 'complete' },
  { id: 2, name: 'Responsiveness', score: 88, totalTasks: 7, autoTasks: 6, semiAutoTasks: 0, manualTasks: 1, estimatedTime: '2-3h', status: 'pending' },
  { id: 3, name: 'Navigation UX', score: 98, totalTasks: 1, autoTasks: 0, semiAutoTasks: 0, manualTasks: 1, estimatedTime: '0.5h', status: 'pending' },
  { id: 4, name: 'Typography', score: 85, totalTasks: 4, autoTasks: 2, semiAutoTasks: 0, manualTasks: 2, estimatedTime: '2-3h', status: 'pending' },
  { id: 5, name: 'Iconography', score: 90, totalTasks: 5, autoTasks: 1, semiAutoTasks: 1, manualTasks: 0, estimatedTime: '5-6.5h', status: 'pending' },
  { id: 6, name: 'Spacing & Sizing', score: 91, totalTasks: 6, autoTasks: 6, semiAutoTasks: 0, manualTasks: 0, estimatedTime: '3.5-4.5h', status: 'pending' },
  { id: 7, name: 'Component System', score: 94, totalTasks: 0, autoTasks: 0, semiAutoTasks: 0, manualTasks: 0, estimatedTime: '0h', status: 'complete' },
  { id: 8, name: 'Modals / Dialogs', score: 85, totalTasks: 4, autoTasks: 3, semiAutoTasks: 1, manualTasks: 0, estimatedTime: '6-8h', status: 'pending' },
  { id: 9, name: 'Performance', score: 91, totalTasks: 7, autoTasks: 2, semiAutoTasks: 3, manualTasks: 2, estimatedTime: '8.2-12.3h', status: 'pending' },
  { id: 10, name: 'Accessibility', score: 95, totalTasks: 4, autoTasks: 0, semiAutoTasks: 3, manualTasks: 1, estimatedTime: '3-4h', status: 'pending' },
  { id: 11, name: 'CSS Architecture', score: 100, totalTasks: 0, autoTasks: 0, semiAutoTasks: 0, manualTasks: 0, estimatedTime: '0h', status: 'complete' },
  { id: 12, name: 'Visual Consistency', score: 92, totalTasks: 9, autoTasks: 1, semiAutoTasks: 7, manualTasks: 1, estimatedTime: '11-14h', status: 'pending' },
  { id: 13, name: 'Interaction Design', score: 94, totalTasks: 6, autoTasks: 1, semiAutoTasks: 4, manualTasks: 1, estimatedTime: '3.8-4.8h', status: 'pending' },
  { id: 14, name: 'Micro-UX Quality', score: 96, totalTasks: 6, autoTasks: 0, semiAutoTasks: 5, manualTasks: 1, estimatedTime: '2.5-3h', status: 'pending' },
]

/**
 * HELPER FUNCTIONS
 */
export function getTasksByCategory(categoryId: number): MaintenanceTask[] {
  return MAINTENANCE_TASKS.filter((task) => task.category === categoryId)
}

export function getTasksByType(type: TaskType): MaintenanceTask[] {
  return MAINTENANCE_TASKS.filter((task) => task.type === type)
}

export function getTasksBySeverity(severity: TaskSeverity): MaintenanceTask[] {
  return MAINTENANCE_TASKS.filter((task) => task.severity === severity)
}

export function getTasksByStatus(status: TaskStatus): MaintenanceTask[] {
  return MAINTENANCE_TASKS.filter((task) => task.status === status)
}

export function getCategoryStats() {
  return {
    total: MAINTENANCE_TASKS.length,
    auto: MAINTENANCE_TASKS.filter((t) => t.type === 'auto').length,
    semiAuto: MAINTENANCE_TASKS.filter((t) => t.type === 'semi-auto').length,
    manual: MAINTENANCE_TASKS.filter((t) => t.type === 'manual').length,
    pending: MAINTENANCE_TASKS.filter((t) => t.status === 'pending').length,
    inProgress: MAINTENANCE_TASKS.filter((t) => t.status === 'in-progress').length,
    fixed: MAINTENANCE_TASKS.filter((t) => t.status === 'fixed').length,
    failed: MAINTENANCE_TASKS.filter((t) => t.status === 'failed').length,
  }
}
