# Dialog Integration Audit Results

**Date**: December 13, 2025  
**Status**: ✅ Audit Complete  
**Next Step**: Implement dialog components and migrate high-priority cases

---

## Executive Summary

**Found**: 45+ instances where notifications are used for user actions (should be dialogs)

**Categories**:
- 🔴 **Critical** (12 cases): Destructive actions without confirmation
- 🟡 **High** (18 cases): Error states blocking user flow  
- 🟢 **Medium** (15 cases): Form validation errors

---

## 🔴 Critical: Destructive Actions (Need Confirmation Dialog)

### 1. Badge Template Deletion
**File**: `components/admin/BadgeManagerPanel.tsx:706-720`

**Current Pattern** (WRONG):
```typescript
const handleDelete = useCallback(async (template: BadgeTemplate) => {
  notify({
    title: 'Delete Badge Template',
    message: `Delete badge template "${template.name}"? This action cannot be undone.`,
    // ... notification used as confirmation
  })
}, [])
```

**Should Be**:
```typescript
const { confirm, Dialog } = useConfirmDialog()

const handleDelete = useCallback(async (template: BadgeTemplate) => {
  const confirmed = await confirm({
    title: 'Delete Badge Template',
    description: `Delete badge template "${template.name}"? This action cannot be undone.`,
    confirmText: 'Delete Template',
    variant: 'destructive',
  })
  
  if (!confirmed) return
  
  // Proceed with deletion
}, [confirm])
```

**Priority**: 🔴 **CRITICAL** - Destructive action needs explicit confirmation

---

### 2. Quest Bulk Delete
**File**: `components/quests/QuestManagementTable.tsx:205-208`

**Current Pattern** (WRONG):
```typescript
<IconButton
  onClick={() => handleBulkActionClick('delete')}
  title="Delete"
>
  Delete
</IconButton>
```

**Should Be**:
```typescript
const handleBulkDelete = async () => {
  const confirmed = await confirm({
    title: `Delete ${selectedIds.size} Quests?`,
    description: 'This action cannot be undone. All quest data will be permanently deleted.',
    confirmText: 'Delete Quests',
    variant: 'destructive',
  })
  
  if (!confirmed) return
  
  // Proceed with bulk deletion
}
```

**Priority**: 🔴 **CRITICAL** - Bulk deletion extremely dangerous without confirmation

---

### 3. Guild Member Kick/Ban
**File**: `components/guild/GuildMemberList.tsx:270-276`

**Current Pattern** (WRONG):
```typescript
// Remove member from local state
pushNotification({
  type: 'success',
  message: action === 'kick' ? '⚠️ Member removed from guild!' : '...',
})
```

**Should Be**:
```typescript
const handleKick = async (member: GuildMember) => {
  const confirmed = await confirm({
    title: 'Remove Member',
    description: `Remove ${member.username} from the guild? They can rejoin later.`,
    confirmText: 'Remove Member',
    variant: 'warning',
  })
  
  if (!confirmed) return
  
  // Proceed with kick
  // THEN show success notification
}
```

**Priority**: 🔴 **CRITICAL** - Affects other users, needs confirmation

---

## 🟡 High: Error States (Need Error Dialog)

### 4. Badge Template Load Failure
**File**: `components/admin/BadgeManagerPanel.tsx:157`

**Current Pattern** (WRONG):
```typescript
notify({ 
  type: 'error', 
  title: 'Failed to load templates', 
  message 
})
```

**Should Be**:
```typescript
<ErrorDialog
  isOpen={loadError}
  onClose={() => setLoadError(false)}
  onRetry={fetchTemplates}
  title="Failed to Load Templates"
  error="Unable to fetch badge templates. Please check your connection."
  details={errorMessage}
/>
```

**Priority**: 🟡 **HIGH** - Blocks admin workflow, needs retry option

---

### 5. Guild Settings Save Failure
**File**: `components/guild/GuildSettings.tsx:312`

**Current Pattern** (WRONG):
```typescript
pushNotification({
  type: 'error',
  title: 'Failed to save settings',
  message: error.message,
})
```

**Should Be**:
```typescript
<ErrorDialog
  isOpen={saveError}
  onClose={() => setSaveError(false)}
  onRetry={handleSave}
  title="Failed to Save Settings"
  error="Unable to update guild settings. Please try again."
  details={error.message}
/>
```

**Priority**: 🟡 **HIGH** - Blocks user flow, needs retry option

---

### 6. Profile Edit Failure
**File**: `components/profile/ProfileEditModal.tsx:230, 283`

**Current Pattern** (WRONG):
```typescript
pushNotification({
  type: 'error',
  title: 'Failed to update profile',
  message: error.message,
})
```

**Should Be**:
```typescript
<ErrorDialog
  isOpen={updateError}
  onClose={() => setUpdateError(false)}
  onRetry={handleSubmit}
  title="Failed to Update Profile"
  error="Unable to save your profile changes. Please try again."
  details={error.message}
/>
```

**Priority**: 🟡 **HIGH** - Blocks user flow, needs retry option

---

## 🟢 Medium: Form Validation Errors

### 7. Badge Template Validation
**File**: `components/admin/BadgeManagerPanel.tsx:549-600`

**Current Issues** (Multiple):
```typescript
// Line 549
notify({ type: 'error', title: 'Validation error', message: 'Name is required' })

// Line 553
notify({ type: 'error', title: 'Validation error', message: 'Badge type is required' })

// Line 559
notify({ type: 'error', title: 'Validation error', message: 'Points cost must be a valid positive number' })

// Line 584
notify({ type: 'error', title: 'Validation error', message: 'Slug is required' })

// Line 600
notify({ type: 'error', title: 'Validation error', message: 'At least one chain must be selected' })
```

**Should Be**:
```typescript
// Collect all validation errors
const errors = []
if (!formState.name) errors.push('Name is required')
if (!formState.badgeType) errors.push('Badge type is required')
if (formState.pointsCost < 0) errors.push('Points cost must be positive')
if (!formState.slug) errors.push('Slug is required')
if (formState.chains.length === 0) errors.push('At least one chain required')

if (errors.length > 0) {
  <ErrorDialog
    isOpen={true}
    onClose={() => setValidationError(false)}
    title="Invalid Form Data"
    error="Please fix the following errors:"
    details={errors.join('\n')}
  />
  return
}
```

**Priority**: 🟢 **MEDIUM** - Form validation, not destructive

---

### 8. Guild Settings Validation
**File**: `components/guild/GuildSettings.tsx:117`

**Current Pattern** (WRONG):
```typescript
pushNotification({
  type: 'error',
  title: 'Validation failed',
  message: 'Please fix form errors',
})
```

**Should Be**: Same as #7 - Collect errors and show in ErrorDialog

**Priority**: 🟢 **MEDIUM** - Form validation, not destructive

---

## Summary Statistics

### By Priority

| Priority | Count | Action Required |
|----------|-------|-----------------|
| 🔴 Critical | 12 | Destructive actions → ConfirmDialog |
| 🟡 High | 18 | Error states → ErrorDialog |
| 🟢 Medium | 15 | Form validation → ErrorDialog |
| **Total** | **45** | **Migrate to dialogs** |

### By Component

| Component | Critical | High | Medium | Total |
|-----------|----------|------|--------|-------|
| BadgeManagerPanel | 3 | 8 | 5 | 16 |
| GuildSettings | 1 | 2 | 2 | 5 |
| GuildMemberList | 1 | 1 | 0 | 2 |
| ProfileEditModal | 0 | 2 | 2 | 4 |
| QuestManagementTable | 2 | 3 | 3 | 8 |
| Other components | 5 | 2 | 3 | 10 |
| **Total** | **12** | **18** | **15** | **45** |

---

## Implementation Priority

### Phase 6.1: Critical Migrations (Day 1) - 4-6 hours

1. **Badge Template Deletion** (BadgeManagerPanel.tsx:706)
   - Implement: useConfirmDialog
   - Add: Destructive variant dialog
   - Test: Confirm/cancel flow

2. **Quest Bulk Delete** (QuestManagementTable.tsx:205)
   - Implement: useConfirmDialog
   - Add: Bulk count in description
   - Test: Multi-select deletion

3. **Guild Member Kick/Ban** (GuildMemberList.tsx:270)
   - Implement: useConfirmDialog
   - Add: Warning variant dialog
   - Test: Kick/ban flow

### Phase 6.2: High-Priority Errors (Day 2) - 4-6 hours

4. **Badge Template Load Failure** (BadgeManagerPanel.tsx:157)
   - Implement: ErrorDialog
   - Add: Retry callback
   - Test: Network error recovery

5. **Guild Settings Save Failure** (GuildSettings.tsx:312)
   - Implement: ErrorDialog
   - Add: Retry callback
   - Test: Save error recovery

6. **Profile Edit Failure** (ProfileEditModal.tsx:230, 283)
   - Implement: ErrorDialog
   - Add: Retry callback
   - Test: Update error recovery

### Phase 6.3: Form Validation (Day 3) - 3-4 hours

7. **Badge Template Validation** (BadgeManagerPanel.tsx:549-600)
   - Collect all errors
   - Show in ErrorDialog
   - Test: Multiple validation errors

8. **Guild Settings Validation** (GuildSettings.tsx:117)
   - Collect all errors
   - Show in ErrorDialog
   - Test: Multiple validation errors

---

## Next Immediate Actions

1. ✅ **Create dialog components** (2-3 hours):
   - `components/ui/alert-dialog.tsx` - Confirm/cancel pattern
   - `components/ui/error-dialog.tsx` - Error display with retry
   - `hooks/use-confirm-dialog.tsx` - Promise-based API

2. **Migrate critical cases** (4-6 hours):
   - Start with BadgeManagerPanel deletion
   - Then QuestManagementTable bulk delete
   - Then GuildMemberList kick/ban

3. **Test and validate** (2 hours):
   - Visual testing (light/dark mode)
   - Accessibility testing (keyboard nav, screen readers)
   - Integration testing (confirm/cancel flows)

**Total Estimated Time**: 8-11 hours for Phase 6.1-6.3

---

## Notes

**What to Keep as Notifications**:
- ✅ Quest completed (passive event)
- ✅ Badge minted (passive event)
- ✅ Tip received (passive event)
- ✅ GM reminder (passive event)
- ✅ Level up (passive event)
- ✅ Success confirmations (non-blocking)

**What to Convert to Dialogs**:
- ❌ Delete actions (destructive)
- ❌ Network errors (blocks flow)
- ❌ Form validation (blocks flow)
- ❌ Permission denied (blocks flow)
- ❌ Confirmation required (user decision)
