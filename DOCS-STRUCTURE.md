# Documentation Structure

**Updated**: December 7, 2025 ✨ **RESTRUCTURED**  
**Status**: Cleaned - 37 → 6 root files, archived 31 completed docs  
**Change**: Major reorganization - all completed phase docs archived

---

## 📋 Root Directory (6 Core Documents Only)

**Before**: 37 markdown files (planning overload)  
**After**: 6 markdown files (clean, focused)

### 1. FOUNDATION-REBUILD-ROADMAP.md
- **Purpose**: Master project roadmap tracking all tasks (Task 9-11 complete)
- **Status**: ✅ Updated with Task 11 Phase 4 completion (100% WCAG AAA)
- **Sections**: Tasks 1-11 with phases, statistics, and completion status
- **Size**: ~200KB (comprehensive master roadmap)
- **Updates**: After phase completion, milestone achievement

### 2. CURRENT-TASK.md
- **Purpose**: Active work status - Task 11 (Polish & Optimization)
- **Status**: ✅ Phase 4 Complete (Accessibility), Phase 5 Next (Documentation)
- **Contents**: Current phase summary, 48 accessibility fixes, test results
- **Size**: ~180KB (detailed current state with all Phase 4 results)
- **Updates**: Daily during active development

### 3. VIRAL-FEATURES-RESEARCH.md
- **Purpose**: Feature research and viral mechanics analysis
- **Status**: Reference document for feature planning
- **Contents**: Viral features research, engagement patterns, best practices
- **Size**: ~24KB
- **Updates**: When new features researched or viral patterns analyzed

### 4. ENV-VARIABLES-GUIDE.md
- **Purpose**: Environment setup guide for local development
- **Status**: Reference document for onboarding
- **Contents**: Required env vars, API keys, configuration
- **Updates**: When new environment variables added

### 5. DOCS-STRUCTURE.md (this file)
- **Purpose**: Documentation organization guide
- **Status**: ✅ Just updated with restructure (Dec 7, 2025)
- **Contents**: Folder structure, file purposes, archive locations
- **Updates**: When documentation structure changes

### 6. .instructions.md (hidden)
- **Purpose**: AI agent instructions and coding standards
- **Status**: System configuration document
- **Contents**: Code style rules, project conventions, agent guidelines
- **Updates**: When coding standards or project patterns evolve

**Archive Policy**: All completed task reports (31 files) moved to `/docs-archive/completed-phases/`

---

## 📁 /docs Directory Structure

### /docs/api/
**Purpose**: API documentation and references  
**New Files** (Dec 7):
- `ABI-QUICK-REFERENCE.md` - Smart contract ABI reference (moved from root)

---

### /docs/learnings/
**Purpose**: Key learnings from rebuild phases ✨ NEW (Dec 7, 2025)  
**Contents**:
- `REBUILD-KEY-LEARNINGS.md` - Comprehensive lessons from Task 9-11
  * What worked: Multi-template hybrid, 10-layer security, Supabase MCP
  * What didn't: Bulk tools, over-planning, test tool bugs
  * Professional patterns: Component structure, API security, accessibility
  * Metrics: 95-100 quality scores, 100% WCAG AAA, 4-6x faster dev speed

---

### /docs/setup/
**Purpose**: Setup and configuration guides  
**New Files** (Dec 7):
- `SUPABASE-STORAGE-SETUP.md` - Storage bucket configuration (moved from root)

---

### /docs/phase-reports/
**Purpose**: Historical phase completion reports and status updates (Task 10 referral/guild)

**Contents**:
- `PHASE-*.md` - Phase completion summaries
- `LEADERBOARD-V2.*-COMPLETE.md` - Leaderboard version releases
- `LEADERBOARD-*-DEPLOYMENT-COMPLETE.md` - Deployment confirmations
- `LEADERBOARD-*-FINAL-STATUS.md` - Final phase status
- `LEADERBOARD-*-INTEGRATION.md` - Integration reports

---

## 📁 /docs-archive Directory Structure ✨ NEW (Dec 7, 2025)

**Purpose**: Archive for completed task documentation (31 files moved from root)

### /docs-archive/completed-phases/
**Purpose**: Task-specific completion documentation

**Structure**:
```
/docs-archive/completed-phases/
  ├── /task-8-quest/              # Quest system (4 files)
  ├── /task-9-profile/            # Profile system (2 files)
  └── /task-10-referral-guild/    # Referral + Guild (13 files)
```

**Contents**:

#### /task-8-quest/ (4 files)
- `QUEST-SYSTEM-COMPLETE.md` - Quest system completion summary
- `QUEST-AUTOMATION-CLARIFICATION.md` - Automation setup clarification
- `QUEST-AUTOMATION-FINAL-SUMMARY.md` - Final automation summary
- `QUEST-AUTOMATION-GITHUB-CONFIG.md` - GitHub workflow configuration

#### /task-9-profile/ (2 files)
- `PROFILE-FIXES-SUMMARY.md` - Profile component fixes summary
- `PROFILE-KEYBOARD-SHORTCUTS.md` - Keyboard navigation implementation

#### /task-10-referral-guild/ (13 files)
- `MIGRATION-REFERRAL-GUILD.md` - Referral/guild migration plan
- `PHASE-1-COMPLETE-SUMMARY.md` - Phase 1 completion
- `PHASE-4-5-IMPLEMENTATION-COMPLETE.md` - Phases 4-5 completion
- `PHASE-4-COMPLETE-SUMMARY.md` - Phase 4 summary
- `PHASE-4-DEPLOYMENT-COMPLETE.md` - Phase 4 deployment
- `PHASE-4-HISTORICAL-STATS-COMPLETE.md` - Historical stats implementation
- `PHASE-4-LOCAL-TESTING-COMPLETE.md` - Local testing results
- `PHASE-5-ADVANCED-ANALYTICS-COMPLETE.md` - Advanced analytics
- `PHASE-5-API-QUICK-REFERENCE.md` - API quick reference
- `PHASE-5-API-SECURITY-COMPLETE.md` - API security implementation
- `STATS-PHASE-1-COMPLETE.md` - Stats Phase 1
- `STATS-PHASE-2-COMPLETE.md` - Stats Phase 2
- `STATS-PROFESSIONAL-ANALYSIS.md` - Stats professional analysis

---

### /docs-archive/infrastructure/ (6 files)
**Purpose**: Infrastructure and build system documentation

**Contents**:
- `BRIDGE-STATS-COMPLETE.md` - Bridge statistics implementation
- `CONTRACT-COMPILATION-COMPLETE.md` - Smart contract compilation
- `CRON-SECURITY-GUIDE.md` - Cron job security setup
- `ICON-SYSTEM-COMPLETE.md` - Icon system implementation
- `WORKFLOW-STANDARDIZATION-COMPLETE.md` - Workflow standardization
- `WORKFLOW-STANDARDIZATION-PLAN.md` - Workflow planning

---

### /docs-archive/migrations/ (3 files)
**Purpose**: Migration plans and status reports

**Contents**:
- `FRAME-MIGRATION-PLAN.md` - Frame migration planning
- `FRAME-MIGRATION-QUICKSTART.md` - Quick start guide
- `FRAME-MIGRATION-STATUS.md` - Migration status tracking

---

### /docs-archive/security/ (1 file)
**Purpose**: Security checklists and guidelines

**Contents**:
- `PRODUCTION-SECURITY-CHECKLIST.md` - Production security checklist

---

### /docs-archive/DOCUMENTATION-RESTRUCTURE-PLAN.md
**Purpose**: This restructure plan document  
**Contents**: Migration commands, before/after comparison, verification steps

---

## 📊 Documentation Statistics

**Before Restructure** (Dec 7, 2025 morning):
- Root directory: 37 markdown files
- Docs directory: ~50+ files
- Total: ~90 files
- **Problem**: Too many docs, hard to find current status

**After Restructure** (Dec 7, 2025 afternoon):
- Root directory: 6 markdown files (84% reduction ✨)
- Active docs: ~20 files in /docs/
- Archived docs: 31 files in /docs-archive/
- **Result**: Clean, organized, easy to navigate

**Files Moved**:
- Quest (Task 8): 4 files
- Profile (Task 9): 2 files
- Referral/Guild (Task 10): 13 files
- Infrastructure: 6 files
- Migrations: 3 files
- Security: 1 file
- API/Setup refs: 2 files
- **Total**: 31 files archived

---

**Structure**:
```
/docs/archive/
  ├── README.md                    # Archive overview and search guide
  ├── /quest-system/               # Quest system development history (11 files)
  ├── /security/                   # Security audits and strategies (2 files)
  ├── /phases/                     # Old phase completion reports (5 files)
  └── /tasks/                      # Individual task reports (17 files)
```

**Contents**:
- Quest System: NEW-QUEST-API-TEST-RESULTS.md, QUEST-SYSTEM-STATUS-REPORT.md, etc.
- Security: API-SECURITY-DOC-UPDATE.md, API-SECURITY-STRATEGY.md
- Phases: OLD-FOUNDATION-CLEANUP-SUMMARY.md, PHASE-2-3-GAP-ANALYSIS.md, etc.
- Tasks: TASK-2-COMPLETE.md through TASK-8.5-PHASE-2-COMPLETION-REPORT.md

**When to Move Here**: 
- ✅ Completed task reports (100% done)
- ✅ Historical audits superseded by current state
- ✅ Old phase reports (newer in /docs/phase-reports/)
- ✅ Superseded planning docs (current in /docs/planning/)

**Search Strategy**: See `docs/archive/README.md` for folder organization and document index

---

### /docs/phase-reports/
**Purpose**: Recent phase completion reports and major milestone documentation

**Contents**:
- `PHASE-*.md` - Phase completion summaries (current phases)
- `QUEST-*-COMPLETE.md` - Quest system completion reports
- `QUEST-CONTRAST-VERIFICATION.md` - Accessibility test reports
- `LEADERBOARD-V2.*-COMPLETE.md` - Leaderboard version releases
- `LEADERBOARD-*-DEPLOYMENT-COMPLETE.md` - Deployment confirmations
- `GITHUB-AUTOMATION-COMPLETE.md` - Automation setup completion

**Examples**:
- `PHASE-4-COMPLETE-FINAL.md` - Quest Creation Phase 4 completion (100%)
- `QUEST-CONTRAST-VERIFICATION.md` - WCAG AA compliance report (27/27 passed)
- `LEADERBOARD-V2.1-COMPLETE.md` - Leaderboard v2.1 release

**When to Add**: After completing any phase or major milestone  
**Archive When**: Superseded by newer phase reports (move to /docs/archive/phases/)

---

### /docs/audits/
**Purpose**: Technical audits, test reports, and analysis documents (Active/Recent Only)

**Contents**:
- `*-AUDIT*.md` - CSS audits, component audits, pattern audits
- `*-TEST*.md` - Test execution reports
- `*-REPORT*.md` - Comprehensive testing and analysis reports
- `*-RESULTS.md` - Test results and metrics
- `COMPREHENSIVE-*.md` - Multi-tool testing reports

**Examples**:
- `ADAPTIVE-CSS-AUDIT-SUITE-COMPLETE.md`
- `CHROME-MCP-TEST-REPORT.md`
- `LEADERBOARD-COMPREHENSIVE-TEST-REPORT.md`
- `VISUAL-CSS-BUG-REPORT.md`

**When to Add**: After running audits or comprehensive test suites  
**Archive When**: Audit findings resolved and documented in phase reports

---

### /docs/planning/
**Purpose**: Active feature planning, rebuild strategies, and enhancement proposals

**Contents**:
- `COMPARISON-*.md` - Comparison feature planning
- `DASHBOARD-*.md` - Dashboard rebuild plans
- `FRESH-*.md` - Fresh implementations
- `PAGE-*.md` - Page restructure plans
- `BOT-*.md` - Bot enhancement planning
- `TASK-*.md` - Active task implementation plans

**Examples**:
- `COMPARISON-GAMIFICATION.md`
- `DASHBOARD-REBUILD-PLAN.md`
- `PAGE-RESTRUCTURE-PLAN.md`
- `TASK-9-PROFILE-IMPROVEMENTS-PLAN.md` (next task)

**When to Add**: Before starting major features or rebuilds  
**Archive When**: Implementation complete and documented in phase reports

---

### /docs/migration/
**Purpose**: Template migration strategy and component mapping

**Contents**:
- `TEMPLATE-SELECTION.md` - Template analysis and selection
- `COMPONENT-MIGRATION-STRATEGY.md` - How to migrate components
- `COMPONENT-LIBRARY-REFERENCE.md` - Component inventory

**When to Update**: When planning template migrations

---

## 🔧 /scripts Directory Structure

### /scripts/testing/
**Purpose**: Test execution, screenshot generation, accessibility verification

**Contents**:
- `test-quest-contrast-real.cjs` - **Real WCAG contrast verification (650 lines)**
- `test-quest-pages-final.sh` - Quest functionality testing
- `test-all-frames-screenshots.cjs` - Frame screenshot automation
- `test-*.sh` - Various test execution scripts
- `backstop.config.js` - Visual regression testing config
- `jest.config.js` + `jest.setup.js` - Jest configuration
- `full-manifest-audit.sh` - PWA manifest audit

**Key Scripts**:
- **test-quest-contrast-real.cjs**: Automated WCAG 2.1 Level AA contrast verification
  - Parses Tailwind classes to hex values
  - Calculates real luminance ratios (not estimates)
  - Tests light + dark modes separately
  - Detects inline styles and hardcoded colors
  - Validates dark mode coverage

**When to Use**: During testing phases, QA verification, or accessibility audits

---

### /scripts/deployment/
**Purpose**: GitHub secrets, Vercel deployment, environment setup

**Contents**:
- `add-github-secrets.sh` - Add GitHub secrets via CLI
- `check-secrets-status.sh` - Verify secrets configuration
- `setup-github-secrets.sh` - Initial secrets setup
- `check-vercel-deploy.sh` - Check Vercel deployment status
- `force-vercel-deploy.sh` - Force redeploy to Vercel
- `update-env-account-association.sh` - Update environment variables
- `verify-deployment.sh` - Comprehensive deployment verification
- `wait-for-deploy.sh` - Wait for deployment completion

**When to Use**: During deployment, CI/CD setup, or environment configuration

---

### /scripts/maintenance/
**Purpose**: Code maintenance, fixing issues, optimization

**Contents**:
- `fix-all-opacity-issues.py` - Fix opacity CSS issues
- `fix-badge-issues-v2.py` - Badge system fixes (v2)
- `fix-badge-issues.py` - Badge system fixes (v1)

**When to Use**: For automated code fixes and maintenance tasks

---

### /scripts/legacy/
**Purpose**: Old Python scripts no longer in active use

**Contents**:
- Old `.py` scripts that have been replaced or deprecated

**When to Add**: When Python scripts are no longer needed but kept for reference

---

## 🔧 /config Directory Structure

### /config/testing/
**Purpose**: Testing framework configurations

**Contents**:
- `playwright.config.ts` - Playwright E2E testing config
- `lighthouserc.json` - Lighthouse CI configuration

**When to Update**: When modifying test configurations

---

### /config/monitoring/
**Purpose**: Error tracking and performance monitoring

**Contents**:
- `sentry.client.config.ts` - Sentry client-side config
- `sentry.server.config.ts` - Sentry server-side config
- `sentry.edge.config.ts` - Sentry edge runtime config

**When to Update**: When updating error tracking setup

---

### /config/deployment/
**Purpose**: Deployment and security configurations

**Contents**:
- `railway.json` - Railway deployment config
- `slither-report.json` - Smart contract security audit results

**When to Update**: During deployment setup or security audits

---

## 📖 Documentation Best Practices

### Document Lifecycle

```
1. Planning → /docs/planning/ (before implementation)
2. Active Work → Root + CURRENT-TASK.md (during development)
3. Completion → /docs/phase-reports/ (after phase done)
4. Historical → /docs/archive/ (when superseded)
```

**Example Flow - Quest Creation System**:
```
Planning: /docs/planning/TASK-8.5-QUEST-CREATION-PLAN.md
Active: CURRENT-TASK.md (updated daily)
Progress: NEW-QUEST-SYSTEM-BREAKDOWN.md (interim)
Completion: /docs/phase-reports/PHASE-4-COMPLETE-FINAL.md
Archive: /docs/archive/quest-system/*.md (historical)
```

---

### Updating Core Documents

**After Completing Any Task**:
1. Update `CURRENT-TASK.md` with latest status
2. Update `FOUNDATION-REBUILD-ROADMAP.md` phase completion
3. Create completion report in `/docs/phase-reports/` for major milestones
4. Move interim/historical docs to `/docs/archive/[category]/`

**When Starting New Phase**:
1. Check `FOUNDATION-REBUILD-ROADMAP.md` for phase requirements
2. Create planning docs in `/docs/planning/` if needed
3. Update `CURRENT-TASK.md` with new phase focus
4. Archive completed planning docs from previous phase

**When Completing Phase**:
1. Create completion summary in `/docs/phase-reports/`
2. Update `FOUNDATION-REBUILD-ROADMAP.md` with ✅ status and score
3. Update `CURRENT-TASK.md` with next phase preview
4. Move interim reports and audits to `/docs/archive/[category]/`

---

### Archive Management Rules

**Move to Archive When**:
- ✅ Task is 100% complete and documented in roadmap
- ✅ Phase report superseded by newer completion report
- ✅ Planning doc superseded by actual implementation
- ✅ Audit findings resolved and documented
- ✅ Historical context only (not actively referenced)

**Keep in Root/Active When**:
- ❌ Document updated daily (CURRENT-TASK.md)
- ❌ Master roadmap (FOUNDATION-REBUILD-ROADMAP.md)
- ❌ Active research (VIRAL-FEATURES-RESEARCH.md)
- ❌ System config (.instructions.md, DOCS-STRUCTURE.md)
- ❌ Recent phase reports (last 2-3 phases in /docs/phase-reports/)

**Archive Organization**:
```
/docs/archive/
  ├── /quest-system/     # All quest development history
  ├── /security/         # Security audits and strategies
  ├── /phases/           # Old phase completion reports
  ├── /tasks/            # Individual task completion reports
  └── README.md          # Archive index and search guide
```

---

### Naming Conventions

**Phase Reports**: `PHASE-X.X-[NAME]-COMPLETE.md`  
**Audit Reports**: `[FEATURE]-[TYPE]-AUDIT.md`  
**Test Reports**: `[FEATURE]-TEST-RESULTS.md` or `[FEATURE]-VERIFICATION.md`  
**Planning Docs**: `[FEATURE]-REBUILD-PLAN.md` or `TASK-X-[NAME]-PLAN.md`  
**Archive Index**: `docs/archive/README.md` (category overview)

---

## 🚫 What NOT to Keep in Root

- ❌ Old completion reports (→ `/docs/phase-reports/`)
- ❌ Audit results (→ `/docs/audits/`)
- ❌ Test reports (→ `/docs/audits/`)
- ❌ Planning documents (→ `/docs/planning/`)
- ❌ Scripts (→ `/scripts/[category]/`)
- ❌ Old versions (→ `/docs/archive/`)
- ❌ Temporary analysis files (delete or → `/docs/archive/`)

---

## 📊 Current Organization Stats

**Root Documents**: 4 core files (FOUNDATION, CURRENT-TASK, VIRAL-FEATURES, DOCS-STRUCTURE)  
**Phase Reports**: ~32 documents in `/docs/phase-reports/`  
**Audits**: ~30 documents in `/docs/audits/`  
**Planning**: ~12 documents in `/docs/planning/`  
**Migration**: 2 documents in `/docs/migration/`  
**Archive**: ~13 documents in `/docs/archive/`  
**Deployment Scripts**: 8 scripts in `/scripts/deployment/`  
**Testing Scripts**: ~20 scripts in `/scripts/testing/`  
**Legacy Scripts**: 3 scripts in `/scripts/legacy/`  
**Config Files**: 7 files in `/config/` subdirectories

**Total Organization**: 127+ files properly categorized  
**Root Reduction**: From 66 files → 4 docs + essential configs (93% cleaner)

---

## 🎯 Quick Reference

**Need to know current status?** → `CURRENT-TASK.md`  
**Need to see roadmap?** → `FOUNDATION-REBUILD-ROADMAP.md`  
**Need feature research?** → `VIRAL-FEATURES-RESEARCH.md`  
**Need phase history?** → `/docs/phase-reports/`  
**Need test results?** → `/docs/audits/`  
**Need to plan feature?** → `/docs/planning/`  
**Need to deploy?** → `/scripts/deployment/`  
**Need to run tests?** → `/scripts/testing/`  
**Need test configs?** → `/config/testing/`  
**Need monitoring setup?** → `/config/monitoring/`

---

**Maintained by**: Development team  
**Last cleanup**: December 3, 2025 (Final)  
**Next review**: After Phase 4 completion
