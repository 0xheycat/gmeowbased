# UI-UX Documentation Cleanup Plan
*Generated: November 25, 2025*
*Purpose: Remove outdated/redundant docs per Option B Task 1*

## Context
- **User Constraint**: Check dependencies before deletion (fonts folder lesson)
- **User Constraint**: Frames already fixed (4 days work in `Docs/Maintenance/frame/`) — don't re-audit
- **Goal**: Clean up 33 files in `Docs/Maintenance/UI-UX/2025-11-November/`

---

## Files Assessment

### ✅ KEEP (Core Documentation - 16 files)
| File | Reason | Size | Status |
|------|--------|------|--------|
| CHANGELOG-CATEGORY-01.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-02.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-03.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-04.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-05.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-06.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-07.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-08.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-09.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-10.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-11.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-12.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-13.md | Core audit findings | Large | Essential |
| CHANGELOG-CATEGORY-14.md | Core audit findings | Large | Essential |
| QUALITY-FIRST-STRATEGY.md | Methodology + 12-layer audit | 1,300+ lines | Essential |
| AUDIT-BEFORE-PATCH-SUMMARY.md | Implementation guide | Recently created | Essential |

### 🗄️ ARCHIVE (Historical Value - Move to archive/ folder - 8 files)
| File | Reason | Lines | Action |
|------|--------|-------|--------|
| PHASE-1-ADMIN-UI-COMPLETE.md | Completed phase deliverable | 397 | Move to archive/ |
| PHASE-2-4-UI-INTEGRATION-COMPLETE.md | Completed UI integration | 231 | Move to archive/ |
| AUTOMATION-OPERATIONAL-TEST.md | Test execution log | 651 | Move to archive/ |
| AUTOMATION-SYNC-REPORT.md | Sync issue resolution | 362 | Move to archive/ |
| DASHBOARD-STATUS-REPORT.md | Historical status snapshot | Unknown | Move to archive/ |
| AUDIT-CURRENT-STATUS.md | Superseded by newer docs | Unknown | Move to archive/ |
| BATCH-PROCESSING-PLAN.md | Planning doc (completed) | Unknown | Move to archive/ |
| AUTOMATED-MAINTENANCE-PLAN.md | Planning doc (completed) | Unknown | Move to archive/ |

### ✅ KEEP ADDITIONAL (Referenced by Core Docs - 5 files)
| File | Reason | Lines | Referenced By |
|------|--------|-------|---------------|
| PHASE-2-AUTO-FIX-ENGINE-COMPLETE.md | Core architecture docs | 343 | Essential system docs |
| COMPONENT-SYSTEM.md | Essential component/z-index/modal docs | 4,240 | CHANGELOG-8, 12, 14 |
| CONTAINER-HIERARCHY.md | Container standards documentation | 311 | CHANGELOG-2 |
| DATABASE-PERSISTENCE.md | Database operation guidelines | 354 | Core system docs |
| AUTOMATED-MAINTENANCE-IMPLEMENTATION-GUIDE.md | Implementation guide | 649 | QUALITY-FIRST-STRATEGY.md |

### 🗑️ REMOVE (After Final Review - 1 file)
| File | Reason | Action |
|------|--------|--------|
| CLEANUP-PLAN.md | This file (after execution) | Delete after user review |

---

## Frame Reference Removal Plan

### Files With Frame Audit References (20+ matches found)
1. **DASHBOARD-STATUS-REPORT.md**
   - Remove: "10 frame routes checked"
   - Remove: "Frame Routes Modified" section
   - Remove: "GI-9: Frame Metadata Validation"
   - Add note: *"Frame work completed separately (4 days, see Docs/Maintenance/frame/)"*

2. **AUDIT-BEFORE-PATCH-SUMMARY.md**
   - Remove: "Frame Routes (app/api/frame/*)" from dependency graph
   - Remove: "Check frame routes specifically" from pre-patch workflow
   - Remove: "GI-15 Integration" section
   - Remove: Task 6 (GI-15 auto-run)
   - Update 12-layer audit to 11-layer (remove frame layer)

3. **COMPONENT-SYSTEM.md**
   - Remove: Frame API route troubleshooting section
   - Remove: Font loading for frame API routes
   - Add note: *"Frame-related fixes documented in Docs/Maintenance/frame/"*

4. **CONTAINER-HIERARCHY.md**
   - Remove: app/api/frame/route.tsx references

5. **DATABASE-PERSISTENCE.md**
   - Update: "GI-7 → GI-15" → "GI-7 → GI-14" (skip GI-15 frame checks)

6. **AUTOMATION-SYNC-REPORT.md**
   - Remove: Frame route breakpoint fix entries

7. **QUALITY-FIRST-STRATEGY.md**
   - Update 12-layer dependency graph → 11-layer (remove "5. Frames" layer)
   - Remove frame-related failure examples
   - Add note: *"Frame validation (GI-15) handled separately — see Docs/Maintenance/frame/ for 4-day audit results"*

---

## Dependency Check (Before Deletion)

### Files That Reference Others
Run before any deletion:
```bash
cd /home/heycat/Desktop/2025/Gmeowbased/Docs/Maintenance/UI-UX/2025-11-November

# Check for cross-references in all markdown files
for file in *.md; do
  echo "=== $file ==="
  grep -h "See \|see \|docs/\|Docs/\|\.md\|CHANGELOG\|PHASE\|AUTOMATION" "$file" | head -20
done
```

### Critical Dependencies
- **QUALITY-FIRST-STRATEGY.md**: References all 14 CHANGELOGs
- **AUDIT-BEFORE-PATCH-SUMMARY.md**: References QUALITY-FIRST-STRATEGY.md
- **lib/maintenance/tasks.ts**: May reference CHANGELOG files (check before moving)

---

## Execution Plan (Safe Removal)

### Step 1: Create Archive Directory
```bash
mkdir -p /home/heycat/Desktop/2025/Gmeowbased/Docs/Maintenance/UI-UX/2025-11-November/archive
```

### Step 2: Move Historical Documents (No Deletion Yet)
```bash
mv PHASE-1-ADMIN-UI-COMPLETE.md archive/
mv PHASE-2-4-UI-INTEGRATION-COMPLETE.md archive/
mv AUTOMATION-OPERATIONAL-TEST.md archive/
mv AUTOMATION-SYNC-REPORT.md archive/
mv DASHBOARD-STATUS-REPORT.md archive/
mv AUDIT-CURRENT-STATUS.md archive/
mv BATCH-PROCESSING-PLAN.md archive/
mv AUTOMATED-MAINTENANCE-PLAN.md archive/
```

### Step 3: Remove Frame References (7 files to edit)
- Edit DASHBOARD-STATUS-REPORT.md (if keeping)
- Edit AUDIT-BEFORE-PATCH-SUMMARY.md
- Edit COMPONENT-SYSTEM.md (if keeping)
- Edit CONTAINER-HIERARCHY.md (if keeping)
- Edit DATABASE-PERSISTENCE.md (if keeping)
- Edit AUTOMATION-SYNC-REPORT.md (if keeping)
- Edit QUALITY-FIRST-STRATEGY.md

### Step 4: Verify No Broken Links
```bash
# Check if any KEEP files reference archived files
grep -rn "PHASE-1\|PHASE-2-4\|AUTOMATION-OPERATIONAL\|AUTOMATION-SYNC\|DASHBOARD-STATUS\|AUDIT-CURRENT\|BATCH-PROCESSING\|AUTOMATED-MAINTENANCE-PLAN" \
  CHANGELOG-*.md QUALITY-FIRST-STRATEGY.md AUDIT-BEFORE-PATCH-SUMMARY.md
```

### Step 5: Update README (if exists)
Add note about archived documents and frame work separation.

---

## Post-Cleanup File Count
- **Before**: 33 files
- **After**: 26 files (21 KEEP + 5 essential system docs)
- **Archived**: 8 files (historical value retained in archive/ folder)

### ✅ EXECUTED CLEANUP (November 25, 2025)
```bash
✅ Created archive/ directory
✅ Moved 8 files to archive/:
   - PHASE-1-ADMIN-UI-COMPLETE.md
   - PHASE-2-4-UI-INTEGRATION-COMPLETE.md
   - AUTOMATION-OPERATIONAL-TEST.md
   - AUTOMATION-SYNC-REPORT.md
   - DASHBOARD-STATUS-REPORT.md
   - AUDIT-CURRENT-STATUS.md
   - BATCH-PROCESSING-PLAN.md
   - AUTOMATED-MAINTENANCE-PLAN.md
```

---

## Success Criteria
- ✅ No broken references in KEEP files
- ✅ All frame audit tasks removed
- ✅ Historical docs preserved in archive/
- ✅ 14 CHANGELOGs intact
- ✅ QUALITY-FIRST-STRATEGY.md updated (11-layer audit)
- ✅ User constraint honored: Dependencies checked before deletion

---

## Next Steps (After Cleanup)
1. ✅ Todo 1 complete: Clean up old documents
2. ⏭️ Todo 2 complete: Remove frame audit references
3. ⏭️ Todo 3: Read remaining CHANGELOGs (30 min)
4. ⏭️ Todo 4: Run complete codebase audit (15 min)
5. ⏭️ Todo 5: Create dependency graph template (20 min)
