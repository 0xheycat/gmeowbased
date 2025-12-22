# Documentation Structure

**Updated**: December 22, 2025 ✨ **MAJOR CLEANUP**  
**Status**: Cleaned - 133 → 9 root files, archived 374+ completed docs  
**Change**: Comprehensive reorganization - moved all phase reports, migrations, audits, and infrastructure docs to organized folders

---

## 📋 Root Directory (9 Essential Documents)

**Before**: 133 markdown files (severe planning overload)  
**After**: 9 markdown files (ultra-clean, focused)  
**Reduction**: 93% cleanup (124 files moved to organized folders)

### 1. FOUNDATION-REBUILD-ROADMAP.md
- **Purpose**: Master project roadmap tracking all tasks (Task 9-12 complete)
- **Status**: ✅ Updated with Task 12 Phase 1 completion (Notification Priority System)
- **Sections**: Tasks 1-12 with phases, statistics, and completion status
- **Size**: ~200KB (comprehensive master roadmap)
- **Updates**: After phase completion, milestone achievement

### 2. CURRENT-TASK.md
- **Purpose**: Active work status - Task 12 (Notification Priority System)
- **Status**: ✅ Phase 1 Complete (Backend Infrastructure 100%), Phase 2 Next (UI Rebuild)
- **Contents**: Current phase summary, database schema, helper functions, priority icons
- **Size**: ~180KB (detailed current state with all Phase 1 results)
- **Updates**: Daily during active development

### 3. MULTI-WALLET-CACHE-ARCHITECTURE.md ← 🔥 UPDATE #1
- **Purpose**: Multi-wallet cache system architecture and flow diagram
- **Status**: ✅ 100% Implemented - Production ready
- **Contents**: 3-layer sync architecture, useWallets() hook, 99% cache hit rate
- **Key Features**: Real-time < 200ms, on-demand background, batch cron 6hrs
- **Updates**: Reference for route migrations using multi-wallet aggregation

### 4. UNIFIED-CALCULATION-BUG-FIXES-DEC-20-2025.md ← 🔥 UPDATE #2
- **Purpose**: Unified calculator enhancements and bug fixes
- **Status**: ✅ 100% Implemented - 32 total exports, 6 new functions
- **Contents**: calculateIncrementalBonus, formatMemberAge, formatLastActive, etc.
- **Bug Fix**: Level progression off-by-one (299 pts = Level 1, not Level 2)
- **Updates**: Reference for using new calculator functions in routes

### 5. ROUTE-MIGRATION-CHECKLIST.md
- **Purpose**: Comprehensive route migration checklist with UPDATE #1 and UPDATE #2
- **Status**: ✅ Complete - 465 lines, 21-point compliance checklist
- **Contents**: 3-layer architecture patterns, multi-wallet aggregation, new calculator functions
- **Key Sections**: Documentation refs, implementation example, verification steps
- **Updates**: Use before migrating any route (copy into prompt)

### 6. TEMPLATE-SELECTION-SESSION-COMPLETE.md
- **Purpose**: Template selection guide and component patterns
- **Status**: ✅ Complete - 11 usable templates, professional patterns documented
- **Contents**: Skeleton component, tabs system, dialog/modal, buttons, forms
- **Key Decisions**: Multi-template hybrid strategy (80% adaptation acceptable)
- **Updates**: Reference for foundation component rebuilds

### 7. ENV-VARIABLES-GUIDE.md
- **Purpose**: Environment setup guide for local development
- **Status**: Reference document for onboarding
- **Contents**: Required env vars, API keys, configuration
- **Updates**: When new environment variables added

### 8. DOCS-STRUCTURE.md (this file)
- **Purpose**: Documentation organization guide
- **Status**: ✅ Updated Dec 22, 2025 - Major cleanup complete
- **Contents**: Folder structure, file purposes, archive locations
- **Updates**: When documentation structure changes

### 9. .instructions.md (hidden)
- **Purpose**: AI agent instructions and coding standards
- **Status**: System configuration document
- **Contents**: Code style rules, project conventions, agent guidelines
- **Updates**: When coding standards or project patterns evolve

**Archive Policy**: All completed task reports (374+ files) moved to organized folders under `/docs-archive/` and `/docs/`

---

## 📁 /docs Directory Structure

### /docs/architecture/
**Purpose**: System architecture documentation ✨ NEW (Dec 22, 2025)

**Folders**:
- `/subsquid/` - Subsquid indexer and Layer 1 compliance docs (55 files)
  * SUBSQUID-*.md - Indexer configuration, schema, testing
  * LAYER-1-*.md - Blockchain compliance, audit findings
  * 3-LAYER-*.md - Three-layer architecture documentation

- `/nft/` - NFT system architecture (4 files)
  * NFT-SYSTEM-ARCHITECTURE-PART-*.md - Complete NFT implementation

- `/scoring/` - Calculation and scoring system (7 files)
  * CALCULATION-*.md - Calculation audit reports
  * COMPLETE-CALCULATION-SYSTEM.md - Full calculation system docs
  * POINTS-VS-XP-*.md - Points vs XP architecture
  * UNIFIED-CALCULATOR-*.md - Calculator migration docs
  * REMAINING-CALCULATOR-*.md - Pending migrations

- `/multi-wallet/` - Multi-wallet cache system (3 files)
  * MULTI-WALLET-CACHE-COMPLETE.md - Implementation completion
  * MULTI-WALLET-CACHE-QUICK-START.md - Quick start guide
  * MULTI-WALLET-CACHE-SUMMARY.md - Summary documentation

---

### /docs/audits/
**Purpose**: Technical audits, test reports, analysis documents ✨ NEW (Dec 22, 2025)

**Contents** (26 files):
- `AUDIT-*.md` - General audit reports
- `*-AUDIT-*.md` - Component-specific audits (CSS, infrastructure, bot, etc.)
- `PART-*-AUDIT-*.md` - Multi-part audit series
- `COMPREHENSIVE-*.md` - Comprehensive analysis documents

---

### /docs/api/
**Purpose**: API documentation and references  
**Contents**:
- `ABI-QUICK-REFERENCE.md` - Smart contract ABI reference

---

### /docs/learnings/
**Purpose**: Key learnings from rebuild phases  
**Contents**:
- `REBUILD-KEY-LEARNINGS.md` - Comprehensive lessons from Task 9-11
  * What worked: Multi-template hybrid, 10-layer security, Supabase MCP
  * What didn't: Bulk tools, over-planning, test tool bugs
  * Professional patterns: Component structure, API security, accessibility
  * Metrics: 95-100 quality scores, 100% WCAG AAA, 4-6x faster dev speed

---

### /docs/setup/
**Purpose**: Setup and configuration guides  
**Contents**:
- `SUPABASE-STORAGE-SETUP.md` - Storage bucket configuration

---

## 📁 /docs-archive Directory Structure

**Purpose**: Archive for completed task documentation (374+ files organized)

### /docs-archive/completed-phases/
**Purpose**: Task-specific completion documentation ✨ EXPANDED (Dec 22, 2025)

**Structure**:
```
/docs-archive/completed-phases/
  ├── /phase-reports/             # All PHASE-*.md completion reports (100+ files)
  ├── /guild/                     # Guild analytics (5 files)
  ├── /leaderboard/               # Leaderboard implementation (8 files)
  ├── /bot/                       # Bot system (6 files)
  └── /misc/                      # Other completed features (140+ files)
```

**Contents**:

#### /phase-reports/ (100+ files) ✨ NEW
- All `PHASE-*.md` completion reports from Task 1-12
- Organized chronologically by phase number
- Includes subsystem completions (PHASE-3.2, PHASE-7.6, PHASE-8.1.5, etc.)

#### /guild/ (5 files)
- `GUILD-*.md` - Guild analytics implementation
- JSONB structures, cache implementation, sync refactor

#### /leaderboard/ (8 files)
- `LEADERBOARD-*.md` - Leaderboard 3-layer implementation
- Version releases, deployment reports

#### /bot/ (6 files)
- `BOT-*.md` - Bot system refactoring and architecture
- `FARCASTER-BOT-*.md` - Farcaster bot enhancements (Parts 1-3)

#### /misc/ (140+ files)
- Pending rewards, badge templates, badge claim migrations
- Supabase migrations, hybrid implementations
- Gaming platform patterns, API field naming
- Route path fixes, TypeScript error fixes, type regeneration
- Test results, GitHub automation, GM transactions
- `PHASE-4-HISTORICAL-STATS-COMPLETE.md` - Historical stats implementation
- `PHASE-4-LOCAL-TESTING-COMPLETE.md` - Local testing results
- `PHASE-5-ADVANCED-ANALYTICS-COMPLETE.md` - Advanced analytics
- `PHASE-5-API-QUICK-REFERENCE.md` - API quick reference
- `PHASE-5-API-SECURITY-COMPLETE.md` - API security implementation
- `STATS-PHASE-1-COMPLETE.md` - Stats Phase 1
- `STATS-PHASE-2-COMPLETE.md` - Stats Phase 2
- `STATS-PROFESSIONAL-ANALYSIS.md` - Stats professional analysis

---

### /docs-archive/migrations/ ✨ EXPANDED (Dec 22, 2025)
**Purpose**: Migration plans and status reports

**Contents** (15 files):
- All migration documentation moved from root
- `MIGRATION-*.md` - Migration audit reports, honest assessments, status updates
- `*-MIGRATION-*.md` - Specific migration plans (referral, guild, badge, viral routes)
- `SYSTEMATIC-MIGRATION-PLAN.md` - Systematic migration approach

---

### /docs-archive/infrastructure/ ✨ EXPANDED (Dec 22, 2025)
**Purpose**: Infrastructure and build system documentation

**Contents** (12 files):
- `INFRASTRUCTURE-*.md` - Infrastructure audits, resilience, consolidation
- `RPC-*.md` - RPC client consolidation
- `CRON-*.md` - Cron setup and security
- Build system and workflow standardization docs

---

### /docs-archive/security/ ✨ EXPANDED (Dec 22, 2025)
**Purpose**: Security checklists and guidelines

**Contents** (3 files):
- `WALLET-*.md` - Wallet compromise analysis, rescue guides
- Security checklist documentation

---

### /docs-archive/misc/
**Purpose**: Miscellaneous archived documentation ✨ NEW (Dec 22, 2025)

**Contents**:
- Documentation metadata and update reports
- Old restructure plans

---

## 📊 Documentation Statistics

**Before Cleanup** (Dec 22, 2025 morning):
- Root directory: 133 markdown files
- Docs directory: ~100 files
- Total: ~230+ files
- **Problem**: Severe planning overload, impossible to find current status

**After Cleanup** (Dec 22, 2025 afternoon):
- Root directory: 9 markdown files (93% reduction ✨)
- Active docs: ~100 files in /docs/ (organized in folders)
- Archived docs: 374+ files in /docs-archive/ (organized by category)
- **Result**: Ultra-clean root, easy navigation, clear organization

**Files Moved** (Dec 22, 2025):
- Phase reports: 100+ files → docs-archive/completed-phases/phase-reports/
- Guild: 5 files → docs-archive/completed-phases/guild/
- Leaderboard: 8 files → docs-archive/completed-phases/leaderboard/
- Bot: 6 files → docs-archive/completed-phases/bot/
- Misc completed: 140+ files → docs-archive/completed-phases/misc/
- Migrations: 15 files → docs-archive/migrations/
- Infrastructure: 12 files → docs-archive/infrastructure/
- Security: 3 files → docs-archive/security/
- Subsquid/Layer-1: 55 files → docs/architecture/subsquid/
- NFT: 4 files → docs/architecture/nft/
- Scoring: 7 files → docs/architecture/scoring/
- Multi-wallet: 3 files → docs/architecture/multi-wallet/
- Audits: 26 files → docs/audits/

**Total Cleanup**: 124 files moved from root to organized folders (93% reduction)

---

## 🎯 Quick Navigation

### Need to migrate a route?
→ `/ROUTE-MIGRATION-CHECKLIST.md` (comprehensive 21-point checklist)  
→ `/MULTI-WALLET-CACHE-ARCHITECTURE.md` (UPDATE #1)  
→ `/UNIFIED-CALCULATION-BUG-FIXES-DEC-20-2025.md` (UPDATE #2)

### Need current task status?
→ `/CURRENT-TASK.md` (Task 12: Notification Priority System)  
→ `/FOUNDATION-REBUILD-ROADMAP.md` (Master roadmap, Tasks 1-12)

### Need template patterns?
→ `/TEMPLATE-SELECTION-SESSION-COMPLETE.md` (11 templates, component patterns)

### Need environment setup?
→ `/ENV-VARIABLES-GUIDE.md` (API keys, configuration)

### Need architecture docs?
→ `/docs/architecture/subsquid/` (Layer 1 compliance, Subsquid)  
→ `/docs/architecture/scoring/` (Unified calculator)  
→ `/docs/architecture/multi-wallet/` (Multi-wallet cache)  
→ `/docs/architecture/nft/` (NFT system)

### Need audit reports?
→ `/docs/audits/` (26 audit reports)

### Need historical context?
→ `/docs-archive/completed-phases/` (374+ completed task reports)  
→ `/docs-archive/migrations/` (15 migration plans)  
→ `/docs-archive/infrastructure/` (12 infrastructure docs)

