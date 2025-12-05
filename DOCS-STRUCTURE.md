# Documentation Structure

**Updated**: December 5, 2025  
**Status**: Reorganized - Clean root with 5 core documents + archive system

---

## 📋 Root Directory (Core Documents Only)

These are the **ONLY** documents that should remain in the root:

### 1. FOUNDATION-REBUILD-ROADMAP.md
- **Purpose**: Master project roadmap tracking all phases
- **Status**: Always current - update after every phase completion
- **Sections**: Phases 1-5 with detailed tasks, timelines, and completion status
- **Size**: ~140KB (comprehensive)
- **Updates**: After phase completion, milestone achievement, or major testing

### 2. CURRENT-TASK.md
- **Purpose**: Active work status - what we're doing RIGHT NOW
- **Status**: Updated in real-time during development
- **Contents**: Current phase summary, recent fixes, testing results
- **Size**: ~95KB (detailed current state)
- **Updates**: Daily during active development

### 3. VIRAL-FEATURES-RESEARCH.md
- **Purpose**: Feature research and viral mechanics analysis
- **Status**: Reference document for feature planning
- **Contents**: Viral features research, engagement patterns, best practices
- **Size**: ~24KB
- **Updates**: When new features researched or viral patterns analyzed

### 4. DOCS-STRUCTURE.md (this file)
- **Purpose**: Documentation organization guide
- **Status**: Reference document for maintaining clean structure
- **Contents**: Folder structure, file purposes, organization rules
- **Updates**: When documentation structure changes

### 5. .instructions.md
- **Purpose**: AI agent instructions and coding standards
- **Status**: System configuration document
- **Contents**: Code style rules, project conventions, agent guidelines
- **Updates**: When coding standards or project patterns evolve

**Archive Policy**: All completed task reports, historical audits, and superseded documents move to `/docs/archive/`

---

## 📁 /docs Directory Structure

### /docs/phase-reports/
**Purpose**: Historical phase completion reports and status updates

**Contents**:
- `PHASE-*.md` - Phase completion summaries
- `LEADERBOARD-V2.*-COMPLETE.md` - Leaderboard version releases
- `LEADERBOARD-*-DEPLOYMENT-COMPLETE.md` - Deployment confirmations
- `LEADERBOARD-*-FINAL-STATUS.md` - Final phase status
- `LEADERBOARD-*-INTEGRATION.md` - Integration reports

---

### /docs/archive/
**Purpose**: Historical and completed documentation (Organized Archive System)

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
