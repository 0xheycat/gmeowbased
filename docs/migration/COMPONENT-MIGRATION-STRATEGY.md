# 🔄 Component Migration Strategy - Phase 1 Foundation Rebuild

**Created**: December 1, 2025  
**Updated**: December 1, 2025 - **FULL MIGRATION Strategy**  
**Purpose**: Guide for agents on COMPLETE template adoption  
**Principle**: **Full Template Migration - Say Goodbye to Old Patterns!**

---

## 🎯 Core Strategy: FULL REPLACEMENT (Keep Core Functions Only)

### Why Full Migration?

**User Decision** (December 1, 2025):
- ❌ **NO partial enhancement** - Want professional patterns 100%
- ❌ **NO old UI patterns** - Template patterns are production-tested
- ✅ **FULL template adoption** - Replace old components completely
- ✅ **Keep core functions** - lib/api/utils stay (business logic)

**What This Means**:
- Replace old UI components with template versions
- Use professional layouts, not custom ones
- Adopt template design patterns completely
- Keep ONLY: database logic, API functions, utils, auth

**Migration Philosophy**:
```
OLD: Custom GmeowHeader → DELETE after migration
NEW: Template-based header with professional patterns

OLD: Basic HTML buttons → REPLACE with Button component
NEW: Professional Button with sizes, variants, loading states

OLD: Custom notification toast → KEEP (but enhance with template dropdown)
NEW: Template dropdown + toast system integration
```

---

## 🚨 What to KEEP vs DELETE

### ✅ KEEP (Core Functionality - Never Delete)

**1. Database Layer** (`supabase/`, `lib/*-history.ts`):
- ✅ Schema migrations (21 tables)
- ✅ Database query functions (`fetchNotifications()`, `saveNotification()`)
- ✅ Supabase client setup
- **Why**: Business logic, production data

**2. API Routes** (`app/api/`):
- ✅ Frame routes (`/api/frame/`)
- ✅ Farcaster integration
- ✅ Authentication endpoints
- ✅ Webhook handlers
- **Why**: Backend functionality, Farcaster protocol

**3. Utils/Helpers** (`lib/gmeow-utils/`, `lib/utils.ts`):
- ✅ Contract ABIs
- ✅ Blockchain utilities
- ✅ Data formatting functions
- ✅ Type definitions
- **Why**: Core business logic

**4. Authentication** (`lib/auth/`):
- ✅ Session management
- ✅ User authentication
- ✅ Permission checks
- **Why**: Security critical

**5. Notification Business Logic** (`lib/notification-history.ts`):
- ✅ `saveNotification()` function
- ✅ `fetchNotifications()` function
- ✅ `getNotificationCount()` function
- ✅ Database queries
- **Why**: Core functionality, not UI

---

### ❌ REPLACE (UI Components - Say Goodbye!)

**1. Layout Components** (`components/layout/gmeow/`):
- ❌ `GmeowLayout.tsx` → Replace with template dashboard layout
- ❌ `GmeowHeader.tsx` → Replace with template header (scroll effects, badges)
- ❌ `MobileNavigation.tsx` → Replace with template mobile nav
- **New Template**: `music/ui/layout/dashboard-layout.tsx` (120 lines)

**2. UI Components** (`components/ui/` - custom ones):
- ❌ Basic buttons → Replace with `Button` component
- ❌ Custom modals → Replace with `Dialog` system
- ❌ Basic forms → Replace with form validation system
- ✅ **KEEP**: `live-notifications.tsx` (toast system works perfectly!)
- **New Templates**: `music/ui/buttons/`, `music/ui/overlays/`, `music/ui/forms/`

**3. Page Components** (custom UI parts):
- ❌ `components/leaderboard/LeaderboardList.tsx` → Replace with DataTable
- ❌ `components/badge/BadgeInventory.tsx` → Replace with template card grid
- ❌ Custom profile dropdowns → Replace with template dropdown
- **New Template**: `music/datatable/data-table.tsx`

**4. CSS Custom Classes** (`app/globals.css`):
- ❌ Custom button classes → Use Button component
- ❌ Custom modal styles → Use Dialog component
- ❌ Custom form styles → Use form components
- ✅ **KEEP**: CSS variables, utility classes, base styles

---

## 📋 Full Migration Plan (Component-by-Component)

### 1️⃣ Navigation/Layout (Section 1.10) - FULL REPLACEMENT

**Current** (DELETE after migration):
- `components/layout/gmeow/GmeowLayout.tsx`
- `components/layout/gmeow/GmeowHeader.tsx` (125 lines)
- `components/MobileNavigation.tsx` (73 lines)

**New Template** (ADOPT fully):
- `music/ui/layout/dashboard-layout.tsx` (120 lines)
- `music/ui/layout/dashboard-navbar.tsx` (67 lines)
- `music/ui/layout/dashboard-sidenav.tsx` (95 lines)
- `trezoadmin-41/Header/index.tsx` (scroll effects pattern)

**Migration Steps**:
1. ✅ **Copy template files** → Create new layout system
   ```
   components/ui/layout/
   ├── dashboard-layout.tsx      (from music template)
   ├── dashboard-navbar.tsx      (from music template)
   ├── dashboard-content.tsx     (from music template)
   └── dashboard-sidenav.tsx     (from music template)
   ```

2. ✅ **Create new header** → `components/layout/Header.tsx` (NEW)
   - Copy from `trezoadmin-41/Header/index.tsx`
   - Add scroll effects (shadow on scroll > 100px)
   - Add NotificationBell with badge
   - Add animated theme toggle
   - Add professional profile dropdown

3. ✅ **Create new mobile nav** → Use template bottom tabs pattern
   - Copy from music template mobile navigation
   - Add smooth transitions
   - Add safe-area-inset

4. ✅ **Update app layout** → `app/layout.tsx`
   ```typescript
   // OLD (DELETE):
   import { GmeowLayout } from '@/components/layout/gmeow/GmeowLayout';
   
   // NEW (USE):
   import { DashboardLayout } from '@/components/ui/layout/dashboard-layout';
   import { Header } from '@/components/layout/Header';
   ```

5. ✅ **Test everything** → Ensure navigation works

6. ❌ **DELETE old files**:
   ```bash
   rm -rf components/layout/gmeow/
   ```

**Files Created**: 5 (new layout system)  
**Files Deleted**: 3 (old GmeowLayout, GmeowHeader, MobileNavigation)  
**Risk**: Medium (core navigation, test thoroughly!)

---

### 2️⃣ Notification System (Section 1.11) - HYBRID (Keep Toast + Add Dropdown)

**Current** (KEEP these!):
- ✅ `components/ui/live-notifications.tsx` (388 lines, perfect!)
- ✅ `lib/notification-history.ts` (328 lines, database functions)

**New Template** (ADD dropdown):
- `trezoadmin-41/Header/Notifications.tsx` (162 lines)

**Migration Steps**:
1. ✅ **Keep toast system** → No changes to `live-notifications.tsx`!

2. ✅ **Create NotificationBell component** → `components/ui/notification-bell.tsx` (NEW)
   ```typescript
   // Copy pattern from trezoadmin-41/Header/Notifications.tsx
   export function NotificationBell() {
     const [isOpen, setIsOpen] = useState(false);
     const [notifications, setNotifications] = useState([]);
     const dropdownRef = useRef<HTMLDivElement>(null);
     
     // Fetch from database
     useEffect(() => {
       const fetchData = async () => {
         const data = await fetchNotifications();
         setNotifications(data);
       };
       fetchData();
     }, []);
     
     // Outside-click detection
     useEffect(() => {
       const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
           setIsOpen(false);
         }
       };
       document.addEventListener("mousedown", handleClickOutside);
       return () => document.removeEventListener("mousedown", handleClickOutside);
     }, []);
     
     return (
       <div ref={dropdownRef} className="relative">
         <button onClick={() => setIsOpen(!isOpen)} className="relative">
           <Bell size={24} />
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 w-[6px] h-[6px] bg-orange-500 rounded-full" />
           )}
         </button>
         
         {isOpen && (
           <div className="absolute right-0 mt-2 w-[350px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
             {/* Notification list */}
           </div>
         )}
       </div>
     );
   }
   ```

3. ✅ **Use in new Header** → Import NotificationBell

4. ✅ **Populate /notifications page** → Full history view

**Files Created**: 1 (notification-bell.tsx)  
**Files Kept**: 2 (live-notifications.tsx, notification-history.ts)  
**Files Deleted**: 0  
**Risk**: Low (additive only)

---

### 3️⃣ Button System (Section 1.14) - FULL REPLACEMENT

**Current** (DELETE after migration):
- ❌ Basic HTML `<button>` tags (scattered)
- ❌ Custom button classes in CSS

**New Template** (ADOPT fully):
- `music/ui/buttons/button.tsx`

**Migration Steps**:
1. ✅ **Copy Button component** → `components/ui/button.tsx`
   ```typescript
   // From music/ui/buttons/button.tsx
   export interface ButtonProps {
     variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
     size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
     loading?: boolean;
     disabled?: boolean;
     fullWidth?: boolean;
     leftIcon?: ReactNode;
     rightIcon?: ReactNode;
     children: ReactNode;
   }
   ```

2. ✅ **Migrate ALL buttons** (search & replace):
   ```bash
   # Find all buttons
   grep -r "<button" --include="*.tsx" components/ app/
   
   # Replace one by one:
   # OLD: <button className="...">Click</button>
   # NEW: <Button variant="primary">Click</Button>
   ```

3. ✅ **Remove custom button CSS** → Clean up globals.css

4. ❌ **DELETE old button classes** from CSS

**Files Created**: 1 (button.tsx)  
**Files Modified**: 20-30 (all pages with buttons)  
**CSS Deleted**: Custom button classes  
**Risk**: Low (systematic replacement)

---

### 4️⃣ Dialog/Modal System (Section 1.15) - FULL REPLACEMENT

**Current** (DELETE after migration):
- ❌ Basic modals (Radix UI or custom)

**New Template** (ADOPT fully):
- `music/ui/overlays/` (dialog system)

**Migration Steps**:
1. ✅ **Copy Dialog system** → `components/ui/dialog/`
   ```
   components/ui/dialog/
   ├── dialog.tsx           (main component)
   ├── dialog-backdrop.tsx  (overlay)
   ├── dialog-header.tsx    (header with close)
   ├── dialog-footer.tsx    (footer with actions)
   └── index.ts            (exports)
   ```

2. ✅ **Migrate ALL modals**:
   ```bash
   # Find all modals
   grep -r "modal\\|Modal\\|dialog\\|Dialog" --include="*.tsx" components/
   
   # Replace with new Dialog component
   ```

3. ❌ **DELETE old modal components**

**Files Created**: 5 (dialog system)  
**Files Deleted**: 3-5 (old modals)  
**Risk**: Medium (user interactions)

---

### 5️⃣ Form System (Section 1.16) - FULL REPLACEMENT

**Current** (DELETE after migration):
- ❌ Basic HTML forms
- ❌ Custom validation (if any)

**New Template** (ADOPT fully):
- `music/ui/forms/` (203 form files!)

**Migration Steps**:
1. ✅ **Copy essential form components**:
   ```
   components/ui/form/
   ├── text-field.tsx       (with validation)
   ├── select.tsx           (dropdown)
   ├── checkbox.tsx         (checkbox + label)
   ├── switch.tsx           (toggle)
   ├── date-picker.tsx      (calendar)
   └── form-error.tsx       (error messages)
   ```

2. ✅ **Migrate ALL forms** (search & replace):
   ```bash
   # Find all forms
   grep -r "<input\\|<select\\|<textarea" --include="*.tsx" components/ app/
   
   # Replace with new form components
   ```

3. ❌ **DELETE custom form styles** from CSS

**Files Created**: 6-10 (form components)  
**Files Modified**: 10-15 (pages with forms)  
**Risk**: Medium (user input critical)

---

### 6️⃣ Data Tables (Section 1.17) - FULL REPLACEMENT

**Current** (DELETE after migration):
- ❌ `components/leaderboard/LeaderboardList.tsx`
- ❌ Guild table (basic HTML)

**New Template** (ADOPT fully):
- `music/datatable/data-table.tsx` (154 lines + 30 files)

**Migration Steps**:
1. ✅ **Copy DataTable system**:
   ```
   components/ui/data-table/
   ├── data-table.tsx                (main component)
   ├── data-table-header.tsx         (search + filters)
   ├── data-table-pagination.tsx     (pagination)
   ├── data-table-row.tsx            (row component)
   └── filters/                      (filter components)
   ```

2. ✅ **Migrate Leaderboard**:
   ```typescript
   // OLD (DELETE):
   import { LeaderboardList } from '@/components/leaderboard/LeaderboardList';
   
   // NEW (USE):
   import { DataTable } from '@/components/ui/data-table/data-table';
   
   <DataTable
     columns={leaderboardColumns}
     endpoint="/api/leaderboard"
     filters={[...]}
   />
   ```

3. ✅ **Migrate Guild table**

4. ❌ **DELETE old table components**:
   ```bash
   rm components/leaderboard/LeaderboardList.tsx
   ```

**Files Created**: 8-10 (data-table system)  
**Files Deleted**: 2 (LeaderboardList, Guild table)  
**Risk**: HIGH (critical user-facing tables, test extensively!)

---

## 📊 Full Migration Checklist

### Pre-Migration
- [ ] Read template source code
- [ ] Understand patterns and APIs
- [ ] Plan component props/interfaces
- [ ] List all files to be deleted

### During Migration
- [ ] Copy template component
- [ ] Customize for Gmeow (colors, branding)
- [ ] Test component in isolation
- [ ] Find all usages of old component
- [ ] Replace one usage at a time
- [ ] Test after each replacement
- [ ] Update imports

### Post-Migration
- [ ] All old usages replaced
- [ ] No references to old component
- [ ] Tests passing
- [ ] **DELETE old component files**
- [ ] **DELETE old CSS classes**
- [ ] Update documentation
- [ ] Commit changes

---

## 🚨 NEVER Delete These (Critical Functions)

1. ✅ **Database functions** (`lib/*-history.ts`, `lib/supabase.ts`)
2. ✅ **API routes** (`app/api/`)
3. ✅ **Utils** (`lib/gmeow-utils/`, `lib/utils.ts`)
4. ✅ **Auth** (`lib/auth/`)
5. ✅ **Contract ABIs** (`lib/abi/`)
6. ✅ **Type definitions** (`types/`)

**Rule**: If it's NOT a UI component → DON'T DELETE!

---

## 🎯 Phase 1 Migration Summary

| Section | Action | Old Files | New Files | Delete? |
|---------|--------|-----------|-----------|---------|
| 1.10 Navigation | **REPLACE** | GmeowLayout, GmeowHeader | DashboardLayout, Header | ✅ YES |
| 1.11 Notifications | **ADD** | Keep toast | NotificationBell | ❌ NO |
| 1.12 Theme | **ENHANCE** | Keep toggle | Add animation | ❌ NO |
| 1.13 Scroll | **ADD** | None | Add to Header | N/A |
| 1.14 Buttons | **REPLACE** | HTML buttons | Button component | ✅ YES (CSS) |
| 1.15 Dialogs | **REPLACE** | Old modals | Dialog system | ✅ YES |
| 1.16 Forms | **REPLACE** | HTML forms | Form components | ✅ YES (CSS) |
| 1.17 Tables | **REPLACE** | LeaderboardList | DataTable | ✅ YES |
| 1.18 Dropdowns | **REPLACE** | Basic dropdowns | Dropdown system | ✅ YES |

**Total Files to DELETE**: ~15-20 old UI components  
**Total Files to CREATE**: ~30-40 new template components  
**Total CSS to DELETE**: Custom button, form, modal styles

---

## 💡 Best Practices for Full Migration

**DO**:
- ✅ Copy entire template component (don't pick pieces)
- ✅ Customize colors/branding after copying
- ✅ Test new component thoroughly before migration
- ✅ Replace ALL usages (no mixing old + new)
- ✅ Delete old component immediately after 100% migrated
- ✅ Update docs after each section

**DON'T**:
- ❌ Mix old and new components
- ❌ Keep old components "just in case"
- ❌ Delete core functions (lib/api/utils)
- ❌ Skip testing migration
- ❌ Leave dead CSS classes

**Principle**: **Clean break from old patterns → Full template adoption!**

---

## 🔗 Related Documents

- **FOUNDATION-REBUILD-ROADMAP.md** - Phase 1-3 plan
- **TEMPLATE-SELECTION.md** - Template audit (7,973 components)
- **CURRENT-TASK.md** - Active work tracking
- **HONEST-FAILURE-ANALYSIS.md** - Past mistakes

---

**Last Updated**: December 1, 2025 - Full migration strategy  
**Next Review**: After each Phase 1 section completion  
**Principle**: **Full Template Migration > Progressive Enhancement**

### Why Not Delete Everything?

**Current Reality** (December 1, 2025):
- ✅ Notification toast system **WORKS** (388 lines, 45 events, Framer Motion)
- ✅ GmeowLayout + GmeowHeader **WORKS** (users can navigate)
- ✅ Database schema **STABLE** (21 tables, notification_history exists)
- ✅ Icon system **COMPLETE** (93 icons, production-ready)
- ⚠️ BUT: Missing professional patterns (scroll effects, badges, dropdowns, etc.)

**Risk of Full Replacement**:
- ❌ Breaks existing functionality
- ❌ Loses 2+ days of notification work
- ❌ Database migrations needed
- ❌ User experience disrupted
- ❌ Testing burden multiplied

**Better Approach**: **Progressive Enhancement**
- ✅ Keep what works
- ✅ Add professional patterns incrementally
- ✅ Migrate usage gradually
- ✅ Delete only when fully replaced + tested

---

## 📋 Component-by-Component Migration Plan

### 1️⃣ Navigation/Layout (Section 1.10)

**Current Components**:
- `components/layout/gmeow/GmeowLayout.tsx` (working)
- `components/layout/gmeow/GmeowHeader.tsx` (125 lines, working)
- `components/MobileNavigation.tsx` (73 lines, working)

**Template Available**:
- `music/ui/layout/dashboard-layout.tsx` (120 lines)
- `music/ui/layout/dashboard-navbar.tsx` (67 lines)
- `trezoadmin-41/Header/index.tsx` (82 lines, scroll effects)

**DECISION**: ✅ **ENHANCE existing** (NOT replace)

**Action Plan**:
1. **Study template patterns** → Extract scroll effects, badge pattern, animations
2. **Enhance GmeowHeader.tsx**:
   ```typescript
   // ADD scroll detection (from Trezoadmin)
   useEffect(() => {
     const handleScroll = () => {
       if (window.scrollY > 100) {
         setIsScrolled(true);
       } else {
         setIsScrolled(false);
       }
     };
     window.addEventListener('scroll', handleScroll);
     return () => window.removeEventListener('scroll', handleScroll);
   }, []);
   
   // ADD NotificationBell with badge (inline, not separate component yet)
   <button className="relative">
     <Bell size={24} />
     {unreadCount > 0 && (
       <span className="absolute -top-1 -right-1 bg-orange-500 w-[6px] h-[6px] rounded-full" />
     )}
   </button>
   ```
3. **Keep existing structure** → Just add professional features
4. **Test** → Ensure nothing breaks

**Files Modified**: 2 (GmeowHeader.tsx, MobileNavigation.tsx)  
**Files Created**: 0  
**Risk**: Low (additive changes only)

---

### 2️⃣ Notification System (Section 1.11)

**Current Components**:
- `components/ui/live-notifications.tsx` (388 lines, **COMPLETE**)
- `lib/notification-history.ts` (328 lines, database functions)
- `app/notifications/page.tsx` (28 lines, empty placeholder)

**Template Available**:
- `trezoadmin-41/Header/Notifications.tsx` (162 lines, dropdown pattern)

**DECISION**: ✅ **KEEP toast system + ADD dropdown**

**Action Plan**:
1. **Keep `live-notifications.tsx`** → Toast system already perfect!
2. **Create NEW component**: `components/ui/notification-bell.tsx` (120 lines)
   - Bell icon with badge
   - Dropdown list
   - Outside-click detection
   - Fetches from `notification_history` table
3. **Use in GmeowHeader**:
   ```typescript
   import { NotificationBell } from '@/components/ui/notification-bell';
   
   // Replace basic bell icon with:
   <NotificationBell />
   ```
4. **Connect systems**:
   - Toast → saves to database (already done via `saveNotification()`)
   - Bell dropdown → reads from database (use `fetchNotifications()`)
5. **Populate `/notifications` page** → Full history view

**Files Modified**: 1 (GmeowHeader.tsx)  
**Files Created**: 1 (notification-bell.tsx)  
**Files Kept**: 2 (live-notifications.tsx, notification-history.ts)  
**Risk**: Low (new component, existing systems stay)

---

### 3️⃣ Theme System (Section 1.12)

**Current Components**:
- Theme toggle in `GmeowHeader.tsx` (basic localStorage)
- `app/providers.tsx` has ThemeProvider (from next-themes)

**Template Available**:
- `music/ui/themes/theme-selector-context.ts`
- `music/ui/themes/use-is-dark-mode.ts`

**DECISION**: ✅ **KEEP next-themes + ADD animation**

**Action Plan**:
1. **Keep `next-themes`** → Already installed and working!
2. **Enhance theme toggle**:
   - Add moon/sun icon animation (Framer Motion)
   - Add smooth transition effect
   - Keep localStorage (next-themes handles it)
3. **Create utility hook** (if needed): `lib/theme/use-theme.ts`
   - Wrapper around `useTheme()` from next-themes
   - Add helper functions

**Files Modified**: 1 (GmeowHeader.tsx theme toggle)  
**Files Created**: 0-1 (optional hook)  
**Risk**: Minimal (next-themes already integrated)

---

### 4️⃣ Button System (Section 1.14)

**Current Components**:
- Basic HTML `<button>` tags scattered across app
- Some custom button classes in CSS

**Template Available**:
- `music/ui/buttons/button.tsx` (complete Button component)

**DECISION**: ✅ **CREATE new Button component + MIGRATE gradually**

**Action Plan**:
1. **Copy `button.tsx` from music template** → `components/ui/button.tsx`
2. **Customize for Gmeow**:
   - Keep our color scheme (primary = purple, etc.)
   - Add our specific variants
3. **Migration Strategy**:
   ```
   Phase A: Create Button component
   Phase B: Migrate high-traffic pages (Dashboard, Leaderboard)
   Phase C: Migrate remaining pages
   Phase D: Search for `<button` and replace remaining
   ```
4. **Mark old buttons**: Add `// TODO: Migrate to <Button>` comment

**Files Modified**: 10-15 pages (gradual migration)  
**Files Created**: 1 (button.tsx)  
**Files Deleted**: 0 (old buttons replaced gradually)  
**Risk**: Low (parallel existence, migrate at our pace)

---

### 5️⃣ Dialog/Modal System (Section 1.15)

**Current Components**:
- Basic modals (likely using Radix UI or custom)
- No organized dialog system

**Template Available**:
- `music/ui/overlays/` (86 dialog files!)

**DECISION**: ✅ **CREATE new Dialog component + MIGRATE gradually**

**Action Plan**:
1. **Copy dialog system** → `components/ui/dialog/` folder
   - `dialog.tsx` (main component)
   - `dialog-backdrop.tsx` (overlay)
   - `dialog-header.tsx`, `dialog-footer.tsx`
2. **Keep existing modals** → Don't break them!
3. **New features use new Dialog** → Progressive adoption
4. **Migrate old modals** → When touching that code anyway

**Files Created**: 4-5 (dialog system)  
**Risk**: Low (new system, old stays working)

---

### 6️⃣ Form System (Section 1.16)

**Current Components**:
- Basic HTML forms
- Some validation (likely react-hook-form or custom)

**Template Available**:
- `music/ui/forms/` (203 form files!)

**DECISION**: ✅ **CREATE professional form components + MIGRATE gradually**

**Action Plan**:
1. **Copy essential form components**:
   - `text-field.tsx` (with validation)
   - `select.tsx` (dropdown)
   - `checkbox.tsx`, `switch.tsx`
   - `date-picker.tsx` (if needed)
2. **Keep existing forms working**
3. **New forms use new components**
4. **Migrate old forms** → When adding features to those pages

**Files Created**: 5-10 (form components)  
**Risk**: Low (parallel existence)

---

### 7️⃣ Data Tables (Section 1.17)

**Current Components**:
- `components/leaderboard/LeaderboardList.tsx` (basic table)
- Guild table (basic HTML)

**Template Available**:
- `music/datatable/data-table.tsx` (154 lines + 30 files)

**DECISION**: ✅ **CREATE DataTable component + MIGRATE 2 tables**

**Action Plan**:
1. **Copy DataTable system** → `components/ui/data-table/`
2. **Migrate Leaderboard** (high priority, user-facing)
3. **Migrate Guild table** (if time permits)
4. **Keep old tables** → Delete only after new ones tested

**Files Created**: 5-10 (data-table system)  
**Files Modified**: 2 (Leaderboard, Guild pages)  
**Files Deleted**: 2 (old LeaderboardList after migration)  
**Risk**: Medium (critical user-facing tables)

---

## 📊 Migration Checklist Template

For each component migration, follow this checklist:

```markdown
### Component: [Name]

**Current State**:
- [ ] Component exists and works
- [ ] Used in X pages
- [ ] Has tests (if applicable)
- [ ] Users depend on it

**Template Available**:
- [ ] Found in: [path]
- [ ] Reviewed patterns
- [ ] Extracted useful code

**Migration Decision**: [ENHANCE / CREATE NEW / KEEP & EXTEND]

**Action Steps**:
1. [ ] Study template pattern
2. [ ] Create/enhance component
3. [ ] Test in isolation
4. [ ] Migrate first usage
5. [ ] Test integrated
6. [ ] Migrate remaining usages
7. [ ] Mark old as deprecated (if applicable)
8. [ ] Delete old (after 100% migrated)

**Risk Level**: [LOW / MEDIUM / HIGH]
**Estimated Time**: [X hours]
**Blocking Issues**: [None / List]
```

---

## 🚨 NEVER Delete These (Critical Infrastructure)

**DO NOT TOUCH** without explicit plan:

1. ✅ **Database schema** (`supabase/migrations/`)
   - 21 tables, production data
   - Migration = complex, risky

2. ✅ **Authentication system** (`lib/auth/`, `app/api/auth/`)
   - Users logged in, sessions active
   - Breaking = disaster

3. ✅ **Notification toast system** (`components/ui/live-notifications.tsx`)
   - Works perfectly (388 lines, 45 events)
   - Just ADD dropdown, don't replace

4. ✅ **Icon system** (`components/icons/`)
   - 93 icons, fully functional
   - Used everywhere

5. ✅ **Utils/helpers** (`lib/gmeow-utils/`)
   - 66 files, core functionality
   - Refactor only if broken

6. ✅ **API routes** (`app/api/`)
   - Frame routes, Farcaster integration
   - Working, leave alone

---

## 📝 Deprecation Process (When Replacing Components)

**Step-by-step**:

1. **Mark as deprecated** (add comment):
   ```typescript
   /**
    * @deprecated Use <Button> from @/components/ui/button instead
    * This component will be removed in Phase 2
    * Migration guide: /docs/migration/button.md
    */
   export function OldButton() { ... }
   ```

2. **Create migration guide** (if complex):
   ```markdown
   # Migration Guide: OldButton → Button
   
   ## Before
   <OldButton color="primary" onClick={...}>Click</OldButton>
   
   ## After
   <Button variant="primary" onClick={...}>Click</Button>
   
   ## Props Changed
   - color → variant
   - ...
   ```

3. **Migrate usages** (track progress):
   ```
   OldButton usages: 15 total
   - [x] Dashboard.tsx (migrated)
   - [x] Leaderboard.tsx (migrated)
   - [ ] Settings.tsx (pending)
   - [ ] Profile.tsx (pending)
   ...
   ```

4. **Delete old component** (after 100% migrated):
   - Search codebase: `grep -r "OldButton" --include="*.tsx"`
   - If 0 results → safe to delete
   - Delete file + update imports

---

## 🎯 Phase 1 Component Strategy Summary

| Section | Current | Template | Action | Risk |
|---------|---------|----------|--------|------|
| 1.10 Navigation | Works | Better patterns | **ENHANCE** | Low |
| 1.11 Notifications | Toast done | Dropdown pattern | **ADD NEW** | Low |
| 1.12 Theme | Works | Animated toggle | **ENHANCE** | Low |
| 1.13 Scroll | None | Shadow effect | **ADD NEW** | Low |
| 1.14 Buttons | Basic HTML | Professional | **CREATE + MIGRATE** | Low |
| 1.15 Dialogs | Basic | Professional | **CREATE + MIGRATE** | Low |
| 1.16 Forms | Basic HTML | Validation | **CREATE + MIGRATE** | Medium |
| 1.17 Tables | Basic | Professional | **CREATE + MIGRATE** | Medium |
| 1.18 Dropdowns | Basic | Keyboard nav | **CREATE + MIGRATE** | Low |

**Total Files to Delete**: 0 in Phase 1 (only enhance/add!)  
**Total Files to Create**: ~20-30 new components  
**Total Files to Modify**: ~10-15 (enhancement)

---

## 💡 Best Practices for Agents

**DO**:
- ✅ Study template pattern first
- ✅ Keep existing components working
- ✅ Create new components alongside old
- ✅ Test each change thoroughly
- ✅ Migrate gradually (page by page)
- ✅ Mark deprecated components
- ✅ Update docs after each section

**DON'T**:
- ❌ Delete working components prematurely
- ❌ Replace everything at once
- ❌ Break existing functionality
- ❌ Skip testing migration
- ❌ Forget to update imports
- ❌ Leave deprecated code forever

---

## 🔗 Related Documents

- **FOUNDATION-REBUILD-ROADMAP.md** - Phase 1-3 plan
- **TEMPLATE-SELECTION.md** - Template audit findings
- **CURRENT-TASK.md** - Active work tracking
- **HONEST-FAILURE-ANALYSIS.md** - Past mistakes

---

**Last Updated**: December 1, 2025  
**Next Review**: After each Phase 1 section completion  
**Principle**: **Progressive Enhancement > Destructive Replacement**
