# Task 4: Accessibility Audit - Implementation Plan

**Date**: December 4, 2025  
**Status**: 🔄 IN PROGRESS  
**Duration**: 2-3 hours (estimated)  
**Score Target**: +1 point (92/100 → 93/100)

## Overview

Comprehensive accessibility audit and enhancement of all Quest System components to ensure WCAG 2.1 AA compliance and excellent screen reader experience.

## 🎯 Success Criteria

### WCAG 2.1 AA Requirements
- ✅ **Perceivable**: All information presented in multiple ways
- ✅ **Operable**: All functionality available via keyboard
- ✅ **Understandable**: Clear labels, instructions, error messages
- ✅ **Robust**: Compatible with assistive technologies

### Target Score Breakdown
- **Keyboard Navigation** (0.3 points): Tab/Enter/Escape/Arrow keys for all interactions
- **ARIA Attributes** (0.3 points): Proper labels, roles, states, live regions
- **Focus Management** (0.2 points): Visible focus indicators, logical tab order
- **Screen Reader Support** (0.2 points): VoiceOver/NVDA compatibility

**Total**: +1.0 point

## 📋 Implementation Checklist

### Phase 1: Keyboard Navigation (30-40 min)

#### QuestAnalyticsDashboard.tsx
- [ ] Metric cards: Tab to focus, Enter to expand details (if interactive)
- [ ] Charts: Keyboard accessible tooltips (Recharts built-in support)
- [ ] Error retry button: Tab + Enter/Space
- [ ] Skip to content link (for screen readers)

#### QuestManagementTable.tsx
- [ ] Table rows: Tab through rows, Enter to select/view
- [ ] Sort headers: Tab + Enter/Space to sort
- [ ] Bulk action checkboxes: Tab + Space to toggle
- [ ] Bulk action buttons: Tab + Enter to execute
- [ ] Search/filter inputs: Tab to focus, type to filter
- [ ] Escape key: Clear selection, close modals

#### QuestFilters.tsx
- [ ] Filter button: Tab + Enter to expand/collapse
- [ ] Filter chips: Tab through chips, Enter/Space to remove
- [ ] Clear All button: Tab + Enter to clear
- [ ] Category/difficulty/status buttons: Tab + Enter/Space to toggle
- [ ] Range sliders: Tab + Arrow keys to adjust
- [ ] Date inputs: Tab + Arrow keys/type to select
- [ ] Featured checkbox: Tab + Space to toggle
- [ ] Escape key: Collapse filter panel

#### empty-states.tsx
- [ ] Action buttons: Tab + Enter/Space to execute
- [ ] Retry button: Tab + Enter to retry
- [ ] Create quest button: Tab + Enter to navigate

### Phase 2: ARIA Attributes (40-50 min)

#### QuestAnalyticsDashboard.tsx
```tsx
// Metric cards
<motion.div
  role="article"
  aria-label={`${title}: ${value}`}
  aria-describedby={trend ? `trend-${title}` : undefined}
>
  {trend && (
    <div id={`trend-${title}`} aria-label={`Trending ${trend >= 0 ? 'up' : 'down'} by ${Math.abs(trend)} percent`}>
      {/* Trend indicator */}
    </div>
  )}
</motion.div>

// Charts
<div role="img" aria-label="Quest completions chart showing 7-day trend">
  <ResponsiveContainer>...</ResponsiveContainer>
</div>

// Error state
<motion.div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {/* Error content */}
</motion.div>
```

#### QuestManagementTable.tsx
```tsx
// Table
<table aria-label="Quest management table" aria-describedby="table-description">
  <caption id="table-description" className="sr-only">
    Table showing all quests with sortable columns and bulk actions
  </caption>
  <thead>
    <tr>
      <th scope="col" aria-sort={sortConfig.key === 'title' ? sortConfig.direction : 'none'}>
        <button
          aria-label={`Sort by title ${sortConfig.key === 'title' ? sortConfig.direction : ''}`}
          onClick={() => handleSort('title')}
        >
          Title
        </button>
      </th>
    </tr>
  </thead>
</table>

// Bulk actions
<div role="toolbar" aria-label="Bulk actions">
  <button
    aria-label="Delete selected quests"
    aria-disabled={selectedQuests.length === 0}
    disabled={selectedQuests.length === 0}
  >
    Delete ({selectedQuests.length})
  </button>
</div>

// Selection checkbox
<input
  type="checkbox"
  aria-label={`Select quest: ${quest.title}`}
  checked={isSelected}
  onChange={() => toggleSelect(quest.id)}
/>
```

#### QuestFilters.tsx
```tsx
// Filter panel
<motion.div
  role="region"
  aria-label="Quest filters"
  aria-expanded={isExpanded}
  id="filter-panel"
>
  {/* Filter content */}
</motion.div>

// Filter button
<motion.button
  aria-controls="filter-panel"
  aria-expanded={isExpanded}
  aria-label={`Filters ${isExpanded ? 'expanded' : 'collapsed'}. ${activeFilterCount} active filters`}
>
  Filters
  {activeFilterCount > 0 && (
    <span aria-label={`${activeFilterCount} filters active`}>
      {activeFilterCount}
    </span>
  )}
</motion.button>

// Filter chips
<motion.button
  aria-label={`Remove ${label} filter`}
  onClick={onRemove}
>
  <span>{label}</span>
  <X className="w-3.5 h-3.5" aria-hidden="true" />
</motion.button>

// Range sliders
<div role="group" aria-labelledby="xp-range-label">
  <label id="xp-range-label">XP Range</label>
  <input
    type="range"
    aria-label="Minimum XP"
    aria-valuemin={0}
    aria-valuemax={10000}
    aria-valuenow={filters.xpRange.min}
  />
</div>
```

#### empty-states.tsx
```tsx
// Empty state
<motion.div
  role="status"
  aria-label={title}
>
  {icon && (
    <div aria-hidden="true">
      {icon}
    </div>
  )}
  <h3 id="empty-state-title">{title}</h3>
  <p id="empty-state-description">{description}</p>
</motion.div>

// Error state
<motion.div
  role="alert"
  aria-live="assertive"
  aria-labelledby="error-title"
  aria-describedby="error-message"
>
  <AlertCircle aria-hidden="true" />
  <h3 id="error-title">{title}</h3>
  <p id="error-message">{message}</p>
  {onRetry && (
    <motion.button
      aria-label="Retry loading data"
      onClick={onRetry}
    >
      <RefreshCw aria-hidden="true" />
      Try Again
    </motion.button>
  )}
</motion.div>
```

### Phase 3: Focus Indicators (20-30 min)

#### Add to globals.css
```css
/* Focus indicators - WCAG AA compliant */
*:focus-visible {
  outline: 2px solid #3b82f6; /* blue-500 */
  outline-offset: 2px;
  border-radius: 4px;
}

/* Dark mode focus */
.dark *:focus-visible {
  outline-color: #60a5fa; /* blue-400 */
}

/* High contrast focus for buttons */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Focus within for interactive containers */
.card:focus-within {
  box-shadow: 0 0 0 2px #3b82f6;
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 100;
}

.skip-to-content:focus {
  top: 8px;
}
```

#### Update Component Styles
```tsx
// Interactive cards
<motion.div
  tabIndex={0}
  className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl"
>

// Buttons (ensure consistent focus styles)
<motion.button
  className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
>

// Filter chips
<motion.button
  className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
>
```

### Phase 4: Screen Reader Testing (30-40 min)

#### Testing Checklist

**VoiceOver (Mac)**:
- [ ] Navigate with Cmd+F5 to enable VoiceOver
- [ ] Tab through all components
- [ ] Verify all labels are announced correctly
- [ ] Test form inputs announce purpose
- [ ] Test buttons announce action
- [ ] Test table navigation (Ctrl+Option+Arrow keys)
- [ ] Test live regions announce updates (toasts, errors)

**NVDA (Windows)**:
- [ ] Enable NVDA (Ctrl+Alt+N)
- [ ] Tab through components
- [ ] Test heading navigation (H key)
- [ ] Test button navigation (B key)
- [ ] Test form navigation (F key)
- [ ] Test table navigation (T key, Ctrl+Alt+Arrow keys)
- [ ] Test live region announcements

**Chrome DevTools Accessibility**:
- [ ] Run Lighthouse accessibility audit (target: 95+)
- [ ] Check contrast ratios (WCAG AA: 4.5:1 for text)
- [ ] Verify ARIA attributes are valid
- [ ] Check for duplicate IDs
- [ ] Verify semantic HTML structure

### Phase 5: Color Contrast Verification (15-20 min)

#### Text Contrast Requirements
- **Normal text** (< 18pt): 4.5:1 minimum
- **Large text** (≥ 18pt or 14pt bold): 3:1 minimum
- **UI components**: 3:1 minimum

#### Audit Checklist
- [ ] Primary text on white background: `text-gray-900` (contrast ratio?)
- [ ] Secondary text on white: `text-gray-600` (contrast ratio?)
- [ ] Primary text on dark background: `text-white` (contrast ratio?)
- [ ] Secondary text on dark: `text-gray-400` (contrast ratio?)
- [ ] Link colors: `text-primary-600` (contrast ratio?)
- [ ] Button text on colored backgrounds
- [ ] Status indicators (success/error/warning colors)
- [ ] Chart colors (ensure distinguishable)

#### Tools
- Chrome DevTools Contrast Checker
- WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)
- Color Oracle (color blindness simulator)

## 🧪 Testing Strategy

### Manual Testing (1 hour)
1. **Keyboard-only navigation** (15 min)
   - Unplug mouse/disable trackpad
   - Navigate entire /quests/manage page
   - Complete all tasks (expand filters, select quests, etc.)

2. **Screen reader testing** (20 min)
   - VoiceOver: Test 3 main components
   - NVDA: Test table and filters
   - Verify all content is accessible

3. **Focus indicator visibility** (10 min)
   - Tab through all interactive elements
   - Verify focus visible in light mode
   - Verify focus visible in dark mode

4. **Contrast verification** (15 min)
   - Check all text/background combinations
   - Test with Color Oracle (protanopia/deuteranopia)
   - Verify UI component contrast

### Automated Testing (15 min)
1. **Lighthouse audit**
   - Run accessibility audit
   - Target score: 95+
   - Fix any reported issues

2. **axe DevTools**
   - Install browser extension
   - Scan /quests/manage page
   - Address all violations

3. **WAVE (Web Accessibility Evaluation Tool)**
   - Scan page for errors
   - Check for missing alt text
   - Verify ARIA usage

## 📊 Score Justification: +1 Point

**Before**: 92/100 (Tasks 1-3 complete)  
**After**: 93/100 (Task 4 complete)

### Why +1 Point:

1. **WCAG AA Compliance** (+0.4): Full keyboard navigation, ARIA attributes
   - All interactive elements keyboard accessible
   - Proper ARIA labels, roles, and states
   - Live regions for dynamic content

2. **Screen Reader Support** (+0.3): Excellent compatibility
   - VoiceOver/NVDA tested and working
   - Semantic HTML structure
   - Clear content hierarchy

3. **Visual Accessibility** (+0.3): Focus indicators, color contrast
   - 2px blue outline on all focusable elements
   - WCAG AA contrast ratios verified
   - Reduced motion support (already implemented)

**Total**: +1 point

## 🚀 Next Steps After Completion

1. **Update Documentation**
   - Create TASK-4-COMPLETION-REPORT.md
   - Update CURRENT-TASK.md with Task 4 status
   - Update FOUNDATION-REBUILD-ROADMAP.md (92% → 93%)

2. **Proceed to Task 5: Mobile Optimization** (2-3h, +1 point)
   - Touch targets (minimum 44×44px)
   - Swipe gestures for table/filters
   - Safe area insets for notched devices
   - Mobile-specific interactions

---

**Ready to implement!** Let's achieve WCAG AA compliance and excellent screen reader support. 🎯
