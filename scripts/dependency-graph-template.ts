/**
 * Dependency Graph Template
 * 
 * Purpose: Pre-patch audit framework to prevent incomplete fixes
 * Usage: Copy template before ANY code change, audit all 12 layers
 * 
 * Context: After 4+ incidents of incomplete audits (typography broke frames,
 * breakpoints broke MiniApp, gap fix broke touch targets, API validation broke
 * frame auth), this template enforces complete dependency mapping.
 * 
 * Rule: NEVER patch until ALL layers pass audit
 */

/**
 * Issue Dependency Graph
 * Maps all affected layers for a single issue fix
 */
export interface IssueDependencyGraph {
  /** Issue metadata */
  issueId: string
  title: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  estimatedTime: string
  
  /** Blast radius assessment */
  blastRadius: 'low' | 'medium' | 'high' | 'critical'
  
  /** 12-Layer Audit Checklist (from QUALITY-FIRST-STRATEGY.md) */
  layers: {
    /** Layer 1: Component Level */
    components: {
      checked: boolean
      affected: string[]
      notes: string
      risks: string[]
    }
    
    /** Layer 2: Page Level */
    pages: {
      checked: boolean
      affected: string[]
      dynamicRoutes: boolean
      renderMode: 'server' | 'client' | 'mixed'
      notes: string
    }
    
    /** Layer 3: Layout Level */
    layouts: {
      checked: boolean
      rootLayoutAffected: boolean
      nestedLayoutsAffected: string[]
      viewportConfigChanged: boolean
      notes: string
    }
    
    /** Layer 4: CSS Level */
    css: {
      checked: boolean
      designTokensUsed: boolean
      mediaQueriesAffected: boolean
      darkModeAffected: boolean
      customPropertiesChanged: string[]
      notes: string
    }
    
    /** Layer 5: Frame/OG Level (⚠️ SKIP - Already Fixed, see Docs/Maintenance/frame/) */
    frames: {
      checked: boolean
      skip: true // Always true - frames already audited separately
      notes: '⚠️ Frame work completed (4 days). SKIP this layer for current UI-UX work.'
    }
    
    /** Layer 6: Metadata Level */
    metadata: {
      checked: boolean
      sitemapAffected: boolean
      openGraphUpdated: boolean
      twitterCardUpdated: boolean
      robotsTxtAffected: boolean
      notes: string
    }
    
    /** Layer 7: API Level */
    apis: {
      checked: boolean
      routesAffected: string[]
      neynarContractsStable: boolean
      supabaseSchemaMatches: boolean
      responsesTyped: boolean
      notes: string
    }
    
    /** Layer 8: Validation Level */
    validation: {
      checked: boolean
      zodSchemasPresent: boolean
      inputsSanitized: string[]
      edgeCasesCovered: boolean
      errorMessagesUserFriendly: boolean
      notes: string
    }
    
    /** Layer 9: Caching Level */
    caching: {
      checked: boolean
      cacheHeadersCorrect: boolean
      revalidationTimingSet: boolean
      staleWhileRevalidateUsed: boolean
      cdnCompatible: boolean
      notes: string
    }
    
    /** Layer 10: Mobile/Responsive Level */
    mobile: {
      checked: boolean
      worksOn375px: boolean
      touchTargetsMin44px: boolean
      usesDvhNotVh: boolean
      safeAreaInsetsRespected: boolean
      notes: string
    }
    
    /** Layer 11: MiniApp Level */
    miniapp: {
      checked: boolean
      embedWorks: boolean
      metadataCorrect: boolean
      warpcastLaunchTested: boolean
      buttonActionsValid: boolean
      notes: string
    }
    
    /** Layer 12: GI-7→GI-14 Compliance (GI-15 Frame Tests SKIP) */
    compliance: {
      checked: boolean
      gi7FrameFormat: 'skip' // Always skip - frames already fixed
      gi8InputValidation: boolean
      gi9FrameMetadata: 'skip' // Always skip - frames already fixed
      gi10Accessibility: boolean
      gi11Performance: boolean
      gi12MobileUx: boolean
      gi13ErrorHandling: boolean
      gi14Security: boolean
      gi15FrameParity: 'skip' // Always skip - frames already fixed
      notes: string
    }
  }
  
  /** Pre-patch validation commands */
  preValidation: {
    typeCheck: string // e.g., "pnpm tsc --noEmit"
    lint: string // e.g., "pnpm lint"
    tests: string // e.g., "pnpm test"
    build: string // e.g., "pnpm build"
  }
  
  /** Rollback plan */
  rollback: {
    gitCommitRequired: boolean
    backupFiles: string[]
    rollbackSteps: string[]
  }
  
  /** Implementation notes */
  implementation: {
    approach: string
    alternativesConsidered: string[]
    whyThisApproach: string
    potentialSideEffects: string[]
  }
}

/**
 * EXAMPLE 1: LOW BLAST RADIUS
 * Simple fix with minimal dependencies
 */
export const exampleLowBlastRadius: IssueDependencyGraph = {
  issueId: 'CAT9-AURORA-SPIN',
  title: 'Speed up Aurora spin animation from 9s to 4-6s',
  category: 'Performance',
  severity: 'low',
  estimatedTime: '5 minutes',
  blastRadius: 'low',
  
  layers: {
    components: {
      checked: true,
      affected: ['components/Quest/QuestLoadingDeck.tsx'],
      notes: 'Single component, no props passed down',
      risks: []
    },
    
    pages: {
      checked: true,
      affected: ['app/Quest/page.tsx'],
      dynamicRoutes: false,
      renderMode: 'client',
      notes: 'Only used in Quest loading state'
    },
    
    layouts: {
      checked: true,
      rootLayoutAffected: false,
      nestedLayoutsAffected: [],
      viewportConfigChanged: false,
      notes: 'No layout changes'
    },
    
    css: {
      checked: true,
      designTokensUsed: false,
      mediaQueriesAffected: false,
      darkModeAffected: false,
      customPropertiesChanged: ['--aurora-spin-duration'],
      notes: 'Only animation timing constant changed (9s → 6s)'
    },
    
    frames: {
      checked: true,
      skip: true,
      notes: '⚠️ Frame work completed (4 days). SKIP this layer for current UI-UX work.'
    },
    
    metadata: {
      checked: true,
      sitemapAffected: false,
      openGraphUpdated: false,
      twitterCardUpdated: false,
      robotsTxtAffected: false,
      notes: 'No metadata changes'
    },
    
    apis: {
      checked: true,
      routesAffected: [],
      neynarContractsStable: true,
      supabaseSchemaMatches: true,
      responsesTyped: true,
      notes: 'No API changes'
    },
    
    validation: {
      checked: true,
      zodSchemasPresent: true,
      inputsSanitized: [],
      edgeCasesCovered: true,
      errorMessagesUserFriendly: true,
      notes: 'No validation changes'
    },
    
    caching: {
      checked: true,
      cacheHeadersCorrect: true,
      revalidationTimingSet: true,
      staleWhileRevalidateUsed: false,
      cdnCompatible: true,
      notes: 'No caching changes'
    },
    
    mobile: {
      checked: true,
      worksOn375px: true,
      touchTargetsMin44px: true,
      usesDvhNotVh: true,
      safeAreaInsetsRespected: true,
      notes: 'Animation speed faster = better mobile performance'
    },
    
    miniapp: {
      checked: true,
      embedWorks: true,
      metadataCorrect: true,
      warpcastLaunchTested: false,
      buttonActionsValid: true,
      notes: 'Loading animation not critical for MiniApp'
    },
    
    compliance: {
      checked: true,
      gi7FrameFormat: 'skip',
      gi8InputValidation: true,
      gi9FrameMetadata: 'skip',
      gi10Accessibility: true,
      gi11Performance: true, // ✅ IMPROVED (faster animation)
      gi12MobileUx: true,
      gi13ErrorHandling: true,
      gi14Security: true,
      gi15FrameParity: 'skip',
      notes: 'Performance improved, no other compliance issues'
    }
  },
  
  preValidation: {
    typeCheck: 'pnpm tsc --noEmit',
    lint: 'pnpm lint components/Quest/QuestLoadingDeck.tsx',
    tests: 'pnpm test -- QuestLoadingDeck',
    build: 'pnpm build'
  },
  
  rollback: {
    gitCommitRequired: true,
    backupFiles: ['components/Quest/QuestLoadingDeck.tsx'],
    rollbackSteps: [
      'git revert HEAD',
      'Or manually: Change animation duration back to 9s'
    ]
  },
  
  implementation: {
    approach: 'Change CSS animation duration from 9s to 6s',
    alternativesConsidered: [
      '4s (too fast, feels jarring)',
      '8s (still too slow)'
    ],
    whyThisApproach: '6s = 0.167 rotations/sec (sweet spot between static and jarring)',
    potentialSideEffects: [
      'Users accustomed to slow spin may notice change',
      'Loading state feels more responsive (positive)'
    ]
  }
}

/**
 * EXAMPLE 2: MEDIUM BLAST RADIUS
 * Moderate complexity with cross-component dependencies
 */
export const exampleMediumBlastRadius: IssueDependencyGraph = {
  issueId: 'CAT5-ICON-SIZES',
  title: 'Migrate 50 hardcoded icon sizes to ICON_SIZES tokens',
  category: 'Iconography',
  severity: 'medium',
  estimatedTime: '2-3 hours',
  blastRadius: 'medium',
  
  layers: {
    components: {
      checked: true,
      affected: [
        'components/MobileNavigation.tsx',
        'components/ui/ThemeToggle.tsx',
        'components/layout/ProfileDropdown.tsx',
        'components/layout/gmeow/GmeowHeader.tsx',
        'components/layout/gmeow/GmeowSidebarLeft.tsx',
        '+ 45 more components (50 total instances)'
      ],
      notes: 'Widespread usage across navigation, headers, buttons',
      risks: [
        'Icon size changes may affect touch targets',
        'Spacing around icons may need adjustment',
        'Mobile vs desktop sizes may differ'
      ]
    },
    
    pages: {
      checked: true,
      affected: [
        'app/profile/[fid]/badges/page.tsx',
        'app/Dashboard/page.tsx',
        '+ 10 more pages with icons'
      ],
      dynamicRoutes: true,
      renderMode: 'mixed',
      notes: 'Profile pages use dynamic routes, must test [fid] param'
    },
    
    layouts: {
      checked: true,
      rootLayoutAffected: false,
      nestedLayoutsAffected: ['components/layout/gmeow/GmeowLayout.tsx'],
      viewportConfigChanged: false,
      notes: 'Gmeow layout uses icons in sidebar, header, footer'
    },
    
    css: {
      checked: true,
      designTokensUsed: true, // ✅ ICON_SIZES tokens
      mediaQueriesAffected: false,
      darkModeAffected: false,
      customPropertiesChanged: [],
      notes: 'No CSS changes, TypeScript import only'
    },
    
    frames: {
      checked: true,
      skip: true,
      notes: '⚠️ Frame work completed (4 days). SKIP this layer for current UI-UX work.'
    },
    
    metadata: {
      checked: true,
      sitemapAffected: false,
      openGraphUpdated: false,
      twitterCardUpdated: false,
      robotsTxtAffected: false,
      notes: 'No metadata changes'
    },
    
    apis: {
      checked: true,
      routesAffected: [],
      neynarContractsStable: true,
      supabaseSchemaMatches: true,
      responsesTyped: true,
      notes: 'No API changes (icons are frontend-only)'
    },
    
    validation: {
      checked: true,
      zodSchemasPresent: true,
      inputsSanitized: [],
      edgeCasesCovered: true,
      errorMessagesUserFriendly: true,
      notes: 'No validation changes'
    },
    
    caching: {
      checked: true,
      cacheHeadersCorrect: true,
      revalidationTimingSet: true,
      staleWhileRevalidateUsed: false,
      cdnCompatible: true,
      notes: 'No caching changes'
    },
    
    mobile: {
      checked: true,
      worksOn375px: true,
      touchTargetsMin44px: true, // ⚠️ RISK: Verify 14px icons don't shrink touch targets
      usesDvhNotVh: true,
      safeAreaInsetsRespected: true,
      notes: '⚠️ CRITICAL: Must verify touch targets still ≥44px after icon size changes'
    },
    
    miniapp: {
      checked: true,
      embedWorks: true,
      metadataCorrect: true,
      warpcastLaunchTested: true,
      buttonActionsValid: true,
      notes: 'MiniApp uses same components, must test embed'
    },
    
    compliance: {
      checked: true,
      gi7FrameFormat: 'skip',
      gi8InputValidation: true,
      gi9FrameMetadata: 'skip',
      gi10Accessibility: true, // ⚠️ Touch target risk
      gi11Performance: true,
      gi12MobileUx: true, // ⚠️ Test 375px viewport
      gi13ErrorHandling: true,
      gi14Security: true,
      gi15FrameParity: 'skip',
      notes: '⚠️ GI-10 (Accessibility) and GI-12 (Mobile UX) require extra testing'
    }
  },
  
  preValidation: {
    typeCheck: 'pnpm tsc --noEmit',
    lint: 'pnpm lint',
    tests: 'pnpm test',
    build: 'pnpm build'
  },
  
  rollback: {
    gitCommitRequired: true,
    backupFiles: [
      'lib/icon-sizes.ts',
      'All 50 affected component files'
    ],
    rollbackSteps: [
      'git revert HEAD',
      'Verify touch targets restored',
      'Test mobile navigation works'
    ]
  },
  
  implementation: {
    approach: 'Batch find-replace: size={20} → size={ICON_SIZES.lg}, add import',
    alternativesConsidered: [
      'Manual one-by-one (too slow, 50 files)',
      'AST transformation with jscodeshift (overkill for simple replacement)'
    ],
    whyThisApproach: 'Regex find-replace is fast, safe with TypeScript validation',
    potentialSideEffects: [
      '⚠️ Touch targets may shrink if icon wrapper padding not adjusted',
      '⚠️ Mobile navigation spacing may need tweaking',
      '✅ Global icon scale changes now possible (benefit)'
    ]
  }
}

/**
 * EXAMPLE 3: HIGH BLAST RADIUS
 * Complex fix affecting multiple systems
 */
export const exampleHighBlastRadius: IssueDependencyGraph = {
  issueId: 'CAT12-SHADOW-MIGRATION',
  title: 'Migrate 77 hardcoded box-shadow values to CSS variables',
  category: 'Visual Consistency',
  severity: 'high',
  estimatedTime: '3-4 hours',
  blastRadius: 'high',
  
  layers: {
    components: {
      checked: true,
      affected: [
        'hooks/useAutoSave.tsx',
        'components/LeaderboardList.tsx',
        'components/badge/BadgeInventory.tsx',
        'components/Quest/QuestCard.tsx',
        'components/Guild/GuildCard.tsx',
        '+ 72 more files (77 total instances)'
      ],
      notes: 'Affects cards, modals, dropdowns, buttons, badges, tooltips',
      risks: [
        'Visual depth perception may change',
        'Dark mode shadows may not translate correctly',
        'Layered shadows (inset + elevation) need careful migration',
        'Animation performance (box-shadow animates = paint thrashing)'
      ]
    },
    
    pages: {
      checked: true,
      affected: [
        'app/Dashboard/page.tsx',
        'app/Quest/page.tsx',
        'app/Guild/page.tsx',
        'app/leaderboard/page.tsx',
        'app/profile/[fid]/page.tsx',
        '+ 15 more pages'
      ],
      dynamicRoutes: true,
      renderMode: 'mixed',
      notes: 'Every major page uses cards/modals with shadows'
    },
    
    layouts: {
      checked: true,
      rootLayoutAffected: true, // ⚠️ CSS variables defined in app/globals.css
      nestedLayoutsAffected: ['Dashboard', 'Guild', 'Profile layouts'],
      viewportConfigChanged: false,
      notes: '⚠️ CRITICAL: CSS variable definitions in app/globals.css must be correct'
    },
    
    css: {
      checked: true,
      designTokensUsed: true, // ✅ Migrating TO tokens
      mediaQueriesAffected: false,
      darkModeAffected: true, // ⚠️ CRITICAL: Dark mode may need different shadow opacity
      customPropertiesChanged: [
        '--fx-inset-1',
        '--fx-inset-2',
        '--fx-elev-static',
        '--fx-elev-1',
        '--fx-elev-2'
      ],
      notes: '⚠️ CRITICAL: Dark mode shadows need testing (may be too dark or invisible)'
    },
    
    frames: {
      checked: true,
      skip: true,
      notes: '⚠️ Frame work completed (4 days). SKIP this layer for current UI-UX work.'
    },
    
    metadata: {
      checked: true,
      sitemapAffected: false,
      openGraphUpdated: false,
      twitterCardUpdated: false,
      robotsTxtAffected: false,
      notes: 'No metadata changes'
    },
    
    apis: {
      checked: true,
      routesAffected: [],
      neynarContractsStable: true,
      supabaseSchemaMatches: true,
      responsesTyped: true,
      notes: 'No API changes (shadows are frontend-only)'
    },
    
    validation: {
      checked: true,
      zodSchemasPresent: true,
      inputsSanitized: [],
      edgeCasesCovered: true,
      errorMessagesUserFriendly: true,
      notes: 'No validation changes'
    },
    
    caching: {
      checked: true,
      cacheHeadersCorrect: true,
      revalidationTimingSet: true,
      staleWhileRevalidateUsed: false,
      cdnCompatible: true,
      notes: 'No caching changes'
    },
    
    mobile: {
      checked: true,
      worksOn375px: true,
      touchTargetsMin44px: true,
      usesDvhNotVh: true,
      safeAreaInsetsRespected: true,
      notes: '⚠️ Mobile devices may render shadows differently (GPU acceleration)'
    },
    
    miniapp: {
      checked: true,
      embedWorks: true, // ⚠️ RISK: MiniApp may have different shadow rendering
      metadataCorrect: true,
      warpcastLaunchTested: true, // ⚠️ CRITICAL: Test Warpcast WebView rendering
      buttonActionsValid: true,
      notes: '⚠️ CRITICAL: Warpcast WebView may not support CSS variables or complex shadows'
    },
    
    compliance: {
      checked: true,
      gi7FrameFormat: 'skip',
      gi8InputValidation: true,
      gi9FrameMetadata: 'skip',
      gi10Accessibility: true,
      gi11Performance: true, // ⚠️ RISK: box-shadow animations = paint thrashing
      gi12MobileUx: true,
      gi13ErrorHandling: true,
      gi14Security: true,
      gi15FrameParity: 'skip',
      notes: '⚠️ GI-11 (Performance): box-shadow animations in gacha-glow-* need GPU alternatives'
    }
  },
  
  preValidation: {
    typeCheck: 'pnpm tsc --noEmit',
    lint: 'pnpm lint',
    tests: 'pnpm test',
    build: 'pnpm build'
  },
  
  rollback: {
    gitCommitRequired: true,
    backupFiles: [
      'app/globals.css (CSS variable definitions)',
      'All 77 affected component/page files'
    ],
    rollbackSteps: [
      'git revert HEAD~3..HEAD (if multi-commit)',
      'Verify visual hierarchy restored',
      'Test dark mode shadows',
      'Test MiniApp Warpcast rendering',
      'Clear browser cache (CSS variables cached)'
    ]
  },
  
  implementation: {
    approach: 'Phased migration: inset shadows first, then elevation, then animated shadows',
    alternativesConsidered: [
      'All-at-once (too risky, 77 files)',
      'Per-component basis (too slow)',
      'AST transformation (complex for CSS-in-JS mixed with Tailwind)'
    ],
    whyThisApproach: 'Phased = easier testing, faster rollback, incremental validation',
    potentialSideEffects: [
      '⚠️ CRITICAL: Dark mode shadows may need opacity adjustment',
      '⚠️ CRITICAL: Warpcast MiniApp may not render complex shadows',
      '⚠️ CRITICAL: Animated shadows (gacha-glow-*) may need transform alternatives',
      '⚠️ Visual hierarchy may shift (cards may appear flatter/deeper)',
      '⚠️ Browser cache may show old shadows until cleared',
      '✅ Global shadow scale now adjustable (benefit)',
      '✅ Consistent depth system across site (benefit)'
    ]
  }
}

/**
 * USAGE INSTRUCTIONS
 * 
 * 1. Copy template before ANY code change
 * 2. Fill out ALL 12 layers (don't skip!)
 * 3. Run pre-validation commands
 * 4. If ANY layer fails → STOP and fix dependencies first
 * 5. Commit with descriptive message including issueId
 * 6. Test each layer's success criteria
 * 7. If ANY test fails → rollback immediately
 * 
 * Remember: Time spent auditing < time spent debugging incomplete fixes
 */

const dependencyGraphExamples = {
  exampleLowBlastRadius,
  exampleMediumBlastRadius,
  exampleHighBlastRadius
}

export default dependencyGraphExamples
