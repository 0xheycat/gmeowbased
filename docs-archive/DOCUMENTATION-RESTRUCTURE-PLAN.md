# 📂 Documentation Restructure Plan

**Date**: December 7, 2025  
**Goal**: Reduce root documentation from 37 files to 5 core files, archive the rest  
**Reason**: Too many docs causing confusion, need clean structure

---

## Current State (37 MD files in root)

**Analysis**:
- ❌ Too many "COMPLETE" summary docs (15+ files)
- ❌ Overlapping content across multiple files
- ❌ Hard to find current status
- ❌ Mix of active + archived documentation

**Problem**: Documentation overload makes it harder to find what matters

---

## Proposed Structure

### ✅ Keep in Root (5 core files)
1. **FOUNDATION-REBUILD-ROADMAP.md** - Master roadmap with all task progress
2. **CURRENT-TASK.md** - Active task status (Task 11 currently)
3. **VIRAL-FEATURES-RESEARCH.md** - Feature research and viral mechanics
4. **ENV-VARIABLES-GUIDE.md** - Environment setup (needed for onboarding)
5. **README.md** - Project overview (create if doesn't exist)

### 📁 Archive to `docs-archive/`

#### `docs-archive/completed-phases/task-8-quest/`
Move quest-related completion docs:
- QUEST-SYSTEM-COMPLETE.md
- QUEST-AUTOMATION-CLARIFICATION.md
- QUEST-AUTOMATION-FINAL-SUMMARY.md
- QUEST-AUTOMATION-GITHUB-CONFIG.md

#### `docs-archive/completed-phases/task-9-profile/`
Move profile-related completion docs:
- PROFILE-FIXES-SUMMARY.md
- PROFILE-KEYBOARD-SHORTCUTS.md

#### `docs-archive/completed-phases/task-10-referral-guild/`
Move referral/guild completion docs:
- MIGRATION-REFERRAL-GUILD.md
- PHASE-1-COMPLETE-SUMMARY.md
- PHASE-4-5-IMPLEMENTATION-COMPLETE.md
- PHASE-4-COMPLETE-SUMMARY.md
- PHASE-4-DEPLOYMENT-COMPLETE.md
- PHASE-4-HISTORICAL-STATS-COMPLETE.md
- PHASE-4-LOCAL-TESTING-COMPLETE.md
- PHASE-5-ADVANCED-ANALYTICS-COMPLETE.md
- PHASE-5-API-QUICK-REFERENCE.md
- PHASE-5-API-SECURITY-COMPLETE.md
- STATS-PHASE-1-COMPLETE.md
- STATS-PHASE-2-COMPLETE.md
- STATS-PROFESSIONAL-ANALYSIS.md

#### `docs-archive/infrastructure/`
Move infrastructure docs:
- BRIDGE-STATS-COMPLETE.md
- CONTRACT-COMPILATION-COMPLETE.md
- CRON-SECURITY-GUIDE.md
- SUPABASE-STORAGE-SETUP.md (also in docs/setup/)
- ICON-SYSTEM-COMPLETE.md
- WORKFLOW-STANDARDIZATION-COMPLETE.md
- WORKFLOW-STANDARDIZATION-PLAN.md

#### `docs-archive/migrations/`
Move migration docs:
- FRAME-MIGRATION-PLAN.md
- FRAME-MIGRATION-QUICKSTART.md
- FRAME-MIGRATION-STATUS.md

#### `docs-archive/security/`
Move security docs:
- PRODUCTION-SECURITY-CHECKLIST.md

### 📁 Keep in `docs/` (Organized Structure)

**Current `docs/` structure is good**:
```
docs/
├── api/                    # API documentation
├── audits/                 # Historical audits
├── learnings/              # Key learnings (NEW)
│   └── REBUILD-KEY-LEARNINGS.md
├── migration/              # Migration guides
├── performance/            # Performance optimization
├── phase-reports/          # Historical phase reports
├── planning/               # Setup and planning
├── seo/                    # SEO optimization
├── setup/                  # Setup guides
└── user-guide/             # User documentation (Phase 5)
```

---

## Migration Commands

### Step 1: Create archive directories
```bash
mkdir -p docs-archive/completed-phases/task-8-quest
mkdir -p docs-archive/completed-phases/task-9-profile
mkdir -p docs-archive/completed-phases/task-10-referral-guild
mkdir -p docs-archive/infrastructure
mkdir -p docs-archive/migrations
mkdir -p docs-archive/security
```

### Step 2: Move quest docs
```bash
mv QUEST-SYSTEM-COMPLETE.md docs-archive/completed-phases/task-8-quest/
mv QUEST-AUTOMATION-CLARIFICATION.md docs-archive/completed-phases/task-8-quest/
mv QUEST-AUTOMATION-FINAL-SUMMARY.md docs-archive/completed-phases/task-8-quest/
mv QUEST-AUTOMATION-GITHUB-CONFIG.md docs-archive/completed-phases/task-8-quest/
```

### Step 3: Move profile docs
```bash
mv PROFILE-FIXES-SUMMARY.md docs-archive/completed-phases/task-9-profile/
mv PROFILE-KEYBOARD-SHORTCUTS.md docs-archive/completed-phases/task-9-profile/
```

### Step 4: Move referral/guild docs
```bash
mv MIGRATION-REFERRAL-GUILD.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-1-COMPLETE-SUMMARY.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-4-5-IMPLEMENTATION-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-4-COMPLETE-SUMMARY.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-4-DEPLOYMENT-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-4-HISTORICAL-STATS-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-4-LOCAL-TESTING-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-5-ADVANCED-ANALYTICS-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-5-API-QUICK-REFERENCE.md docs-archive/completed-phases/task-10-referral-guild/
mv PHASE-5-API-SECURITY-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv STATS-PHASE-1-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv STATS-PHASE-2-COMPLETE.md docs-archive/completed-phases/task-10-referral-guild/
mv STATS-PROFESSIONAL-ANALYSIS.md docs-archive/completed-phases/task-10-referral-guild/
```

### Step 5: Move infrastructure docs
```bash
mv BRIDGE-STATS-COMPLETE.md docs-archive/infrastructure/
mv CONTRACT-COMPILATION-COMPLETE.md docs-archive/infrastructure/
mv CRON-SECURITY-GUIDE.md docs-archive/infrastructure/
mv ICON-SYSTEM-COMPLETE.md docs-archive/infrastructure/
mv WORKFLOW-STANDARDIZATION-COMPLETE.md docs-archive/infrastructure/
mv WORKFLOW-STANDARDIZATION-PLAN.md docs-archive/infrastructure/
```

### Step 6: Move migration docs
```bash
mv FRAME-MIGRATION-PLAN.md docs-archive/migrations/
mv FRAME-MIGRATION-QUICKSTART.md docs-archive/migrations/
mv FRAME-MIGRATION-STATUS.md docs-archive/migrations/
```

### Step 7: Move security docs
```bash
mv PRODUCTION-SECURITY-CHECKLIST.md docs-archive/security/
```

### Step 8: Move reference docs (keep accessible)
```bash
mv ABI-QUICK-REFERENCE.md docs/api/
```

### Step 9: Update DOCS-STRUCTURE.md
Update the docs structure file to reflect new organization

---

## Final Root Directory (5 files)

After migration, root should only have:
1. FOUNDATION-REBUILD-ROADMAP.md (master roadmap)
2. CURRENT-TASK.md (Task 11 status)
3. VIRAL-FEATURES-RESEARCH.md (feature research)
4. ENV-VARIABLES-GUIDE.md (setup guide)
5. README.md (project overview)

Plus:
- .instructions.md (hidden, for agent instructions)
- DOCS-STRUCTURE.md (directory reference)

**Total**: 7 markdown files (down from 37)

---

## Benefits

1. ✅ **Cleaner root**: Easy to find current status
2. ✅ **Better organization**: Related docs grouped
3. ✅ **Archived history**: Old docs preserved but not in the way
4. ✅ **Easier navigation**: Clear structure in docs/
5. ✅ **Less confusion**: No duplicate/overlapping docs in root

---

## Verification

After migration:
```bash
# Count files in root
find . -maxdepth 1 -type f -name "*.md" | wc -l
# Should be: 7 (down from 37)

# Verify archives
ls -la docs-archive/completed-phases/
ls -la docs-archive/infrastructure/
ls -la docs-archive/migrations/
ls -la docs-archive/security/

# Verify docs/ structure
tree docs/
```

---

## Next Steps

1. Execute migration commands
2. Update DOCS-STRUCTURE.md
3. Update FOUNDATION-REBUILD-ROADMAP.md links
4. Commit with message: "docs: restructure root documentation (37 → 7 files)"
5. Proceed to Task 11 Phase 5 (Documentation)
