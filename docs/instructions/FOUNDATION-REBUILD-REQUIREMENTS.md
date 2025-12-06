# Foundation Rebuild Requirements - Core Principles

**Created**: December 5, 2025  
**Purpose**: Global requirements for all foundation rebuilds  
**Status**: Active - Must be followed for ALL new development  
**Website**: [gmeowhq.art](https://gmeowhq.art) - Base Network Farcaster Miniapp

---

## 🎯 Core Principles

These 12 requirements MUST be followed for every page rebuild, component creation, and API development. No exceptions.

---

## 1. Icon Usage - Professional SVG Standards

**Rule**: Only use icons from `components/icons/` directory (93 production-ready SVG icons available).

**Implementation**:
```typescript
// ✅ CORRECT - Use existing icons
import { GridIcon, ClockIcon, BadgeIcon } from '@/components/icons'

// ❌ WRONG - Do not use emoji or external icon libraries
<span>🎯</span>  // Never use emojis
import { Icon } from 'lucide-react'  // Never import external icons
```

**If icon doesn't exist**:
1. Search `docs/migration/TEMPLATE-SELECTION.md` for tested template icons
2. Extract icon SVG from template (maintain attribution)
3. Add to `components/icons/` with proper TypeScript types
4. Document in icon index file

**Quality Standards**:
- SVG viewBox: `"0 0 24 24"` (standard)
- Stroke width: `2` (consistent)
- No hardcoded colors - use `currentColor`
- Proper TypeScript types with `SVGProps<SVGSVGElement>`
- Accessibility: Add `aria-label` when used standalone

---

## 2. 10-Layer API Security Pattern

**Rule**: ALL new APIs must implement professional 10-layer security used by big platforms.

**Architecture** (from `app/api/user/profile/[fid]/route.ts`):

```typescript
/**
 * 10-Layer Security Architecture:
 * 1. Rate Limiting (Upstash Redis sliding window)
 * 2. Request Validation (Zod schemas)
 * 3. Authentication (Admin session JWT)
 * 4. RBAC - Role-Based Access Control
 * 5. Input Sanitization (XSS prevention)
 * 6. SQL Injection Prevention (Parameterized queries)
 * 7. CSRF Protection (SameSite cookies + Origin validation)
 * 8. Privacy Controls (visibility checks)
 * 9. Audit Logging (all changes tracked)
 * 10. Error Masking (no sensitive data in errors)
 */

// LAYER 1: Rate Limiting
const rateLimitResult = await rateLimit(ip, apiLimiter);
if (!rateLimitResult.success) {
  return createErrorResponse({
    type: ErrorType.RATE_LIMIT,
    message: 'Too many requests',
    statusCode: 429,
  });
}

// LAYER 2: Request Validation
const validation = RequestSchema.safeParse(body);
if (!validation.success) {
  return handleValidationError(validation.error);
}

// LAYER 3: Authentication
const auth = await validateAdminRequest(request);
if (!auth.ok) {
  return handleAuthError();
}

// LAYER 4: RBAC
if (requesterFid !== resourceOwnerId) {
  return handleAuthorizationError();
}

// LAYER 5: Input Sanitization
const sanitized = sanitizeInput(userInput);

// LAYER 6: SQL Injection Prevention
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', sanitized.id);  // Parameterized query

// LAYER 7: CSRF Protection
if (!validateOrigin(request)) {
  return createErrorResponse({
    type: ErrorType.AUTHORIZATION,
    message: 'Invalid origin',
    statusCode: 403,
  });
}

// LAYER 8: Privacy Controls
const privacyCheck = await checkPrivacy(resourceId, requesterId);
if (!privacyCheck.allowed) {
  return handleAuthorizationError(privacyCheck.reason);
}

// LAYER 9: Audit Logging
await auditChange(resourceId, action, changes, requesterId, ip);

// LAYER 10: Error Masking
return NextResponse.json({
  success: true,
  data: cleanData,  // No sensitive info
  meta: {
    responseTime: `${Date.now() - startTime}ms`,
    timestamp: new Date().toISOString(),
    version: '1.0',
  },
});
```

**Professional Headers** (Twitter, GitHub, LinkedIn, Stripe patterns):
```typescript
const headers = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Remaining': String(rateLimitResult.remaining),
  'X-RateLimit-Reset': String(rateLimitResult.reset),
  'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  'ETag': Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32),
}
```

---

## 3. Template Selection - Professional Hybrid Strategy

**Rule**: ALWAYS read `docs/migration/TEMPLATE-SELECTION.md` before creating ANY component.

**Required Process**:
1. **Read template selection guide** - Understand template categories
2. **Choose appropriate template** - Match component type to template
3. **Verify adaptation percentage** - Target 10-40% (professional range)
4. **Document template source** - Add to component header
5. **Use hybrid approach** - Combine multiple templates when needed

**Example Header**:
```typescript
/**
 * ProfileEditModal Component
 * 
 * Template Strategy: music/ui/forms + trezoadmin-41/form-layout-01
 * Adaptation: 35%
 * Platform Reference: Twitter settings modal
 * 
 * Features:
 * - Display name editing (2-50 chars)
 * - Bio editing (150 char limit)
 * - Avatar/cover upload
 * - Social links
 * 
 * @module components/profile/ProfileEditModal
 */
```

**Template Categories** (from TEMPLATE-SELECTION.md):
- **Forms**: music/ui/forms, trezoadmin-41/form-layout
- **Cards**: gmeowbased0.6/collection-card, music/cards
- **Navigation**: trezoadmin-41/UIElements/Tabs, DashboardMobileTabs
- **Data Tables**: music/datatable
- **Stats/Metrics**: trezoadmin-41/ProfileIntro

---

## 4. No Rework - Professional First Time

**Rule**: Meet ALL requirements with enhancement criteria on FIRST implementation. No compromises.

**Before Starting**:
- [ ] Read planning document (e.g., TASK-9-PROFILE-REBUILD-PLAN.md)
- [ ] Verify Supabase schema (use Supabase MCP)
- [ ] Check template selection guide
- [ ] List all requirements
- [ ] Identify edge cases
- [ ] Plan error handling
- [ ] Design null-safety patterns

**During Implementation**:
- [ ] Follow template patterns (10-40% adaptation)
- [ ] Implement 10-layer security (APIs)
- [ ] Add comprehensive error handling
- [ ] Include loading states
- [ ] Add accessibility (WCAG 2.1 AA)
- [ ] Mobile-first responsive (375px → 1920px)
- [ ] Dark mode support
- [ ] TypeScript strict mode (no `any` types)

**After Implementation**:
- [ ] Test all edge cases
- [ ] Verify TypeScript compilation (0 errors)
- [ ] Run test suite (target 95%+ pass rate)
- [ ] Check accessibility with test tools
- [ ] Test mobile responsiveness
- [ ] Update documentation

---

## 5. Never Compromise - Fix Issues Immediately

**Rule**: Any detected bug, issue, or error MUST be fixed immediately with professional developer patterns.

**Professional Patterns**:

**Null Safety**:
```typescript
// ✅ CORRECT - Comprehensive null checks
const supabase = getSupabaseServerClient();
if (!supabase) {
  return createErrorResponse({
    type: ErrorType.DATABASE,
    message: 'Database connection unavailable',
    statusCode: 503,
  });
}

const { data, error } = await supabase.from('table').select('*');
if (error || !data) {
  return handleDatabaseError(error);
}

// ❌ WRONG - Assuming values exist
const { data } = await supabase.from('table').select('*');
return NextResponse.json({ data });  // data might be null!
```

**Array Safety**:
```typescript
// ✅ CORRECT - Safe sorting with null checks
const sorted = quests.sort((a, b) => {
  const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
  const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
  return dateB - dateA;
});

// ❌ WRONG - Unsafe sorting
const sorted = quests.sort((a, b) => 
  new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
);  // Crashes if completed_at is null!
```

**Error Handling**:
```typescript
// ✅ CORRECT - Specific error types
try {
  const result = await apiCall();
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }
  if (error instanceof AuthError) {
    return handleAuthError(error.message);
  }
  return handleInternalError(error as Error);
}

// ❌ WRONG - Generic error handling
try {
  const result = await apiCall();
  return NextResponse.json({ data: result });
} catch (error) {
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}
```

---

## 6. Supabase Schema Verification

**Rule**: ALWAYS verify current schema from Supabase database before ANY rebuild using Supabase MCP.

**Process**:
1. **Activate Supabase MCP tools**: `activate_database_migration_tools()`
2. **List tables**: Check all tables in schema
3. **Verify columns**: Confirm column names, types, constraints
4. **Check relationships**: Foreign keys, joins
5. **Document schema**: Add to component/API header

**Example Verification**:
```typescript
/**
 * Profile API Endpoint
 * 
 * Supabase Schema Verified: December 5, 2025
 * 
 * Tables Used:
 * - user_profiles (21 columns):
 *   * fid: BIGINT PRIMARY KEY
 *   * wallet_address: TEXT
 *   * display_name: TEXT
 *   * bio: TEXT
 *   * avatar_url: TEXT
 *   * cover_image_url: TEXT
 *   * social_links: JSONB
 *   * metadata: JSONB
 *   * profile_visibility: TEXT DEFAULT 'public'
 * 
 * - leaderboard_calculations (18 columns):
 *   * address: TEXT PRIMARY KEY
 *   * farcaster_fid: INTEGER
 *   * base_points: INTEGER
 *   * viral_xp: INTEGER
 *   * rank: INTEGER
 *   * level: INTEGER
 */
```

**Schema Validation Checklist**:
- [ ] Table exists in database
- [ ] All columns exist with correct types
- [ ] Primary keys match query patterns
- [ ] Foreign keys properly referenced
- [ ] JSONB fields have correct structure
- [ ] Array fields handled safely
- [ ] Nullable fields have null checks

---

## 7. Delete Old Foundation References

**Rule**: Before rebuilding any page, scan entire codebase and REMOVE all files still using old patterns from old foundations.

**Scan Process**:
```bash
# Find old component patterns
grep -r "old-pattern-name" components/
grep -r "deprecated-function" lib/

# Find old API patterns
grep -r "old-api-endpoint" app/api/
grep -r "legacy-" app/

# Find old styles
grep -r "old-css-class" components/
grep -r "inline-style" components/
```

**Files to Remove**:
- Old UI components using deprecated patterns
- Old API routes without 10-layer security
- Old utility functions with unsafe patterns
- Old test files for removed components
- Old documentation referencing removed code

**Files to Keep**:
- `lib/api/utils/auth` - Core business logic (verified safe)
- Active API routes with proper security
- Template files in `planning/template/`
- Documentation in `docs/`

**Example: Profile Rebuild**:
```bash
# ✅ CORRECT - Kept secure business logic
lib/api/utils/auth/

# ✅ CORRECT - New professional components
components/profile/ProfileHeader.tsx
components/profile/ProfileStats.tsx
components/profile/ProfileEditModal.tsx

# ❌ REMOVED - Old unsafe patterns
components/profile/OldProfileCard.tsx  # Deleted
components/profile/LegacySettings.tsx  # Deleted
```

---

## 8. GitHub Cron Jobs Only

**Rule**: If cron job requirements exist, create them immediately using ONLY GitHub Actions cron.

**Setup Process**:
1. **Check local environment**: Verify GitHub CLI installed
   ```bash
   gh --version
   ```

2. **If not installed**, update immediately:
   ```bash
   # Ubuntu/Debian
   sudo apt install gh
   
   # macOS
   brew install gh
   
   # Authenticate
   gh auth login
   ```

3. **Create workflow file**: `.github/workflows/cron-job-name.yml`

**Example Cron Workflow**:
```yaml
name: Daily Profile Stats Update

on:
  schedule:
    # Run at 00:00 UTC daily
    - cron: '0 0 * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-stats:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run stats update script
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: node scripts/cron/update-profile-stats.js
      
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Cron Job Failed: Profile Stats Update',
              body: 'The scheduled profile stats update job failed. Please investigate.',
              labels: ['cron-failure', 'bug']
            })
```

**Cron Schedule Examples**:
- Every hour: `'0 * * * *'`
- Every 6 hours: `'0 */6 * * *'`
- Daily at midnight: `'0 0 * * *'`
- Weekly on Monday: `'0 0 * * 1'`
- Monthly on 1st: `'0 0 1 * *'`

**Best Practices**:
- Use `workflow_dispatch` for manual testing
- Add failure notifications
- Store secrets in GitHub Secrets
- Use service accounts (not user tokens)
- Log execution results
- Add retry logic for transient failures

---

## 9. Pre-Rebuild Codebase Scan

**Rule**: Before starting to rebuild ANY page, scan ENTIRE codebase, then remove ALL files still using old patterns from old foundations.

**Scanning Strategy** (learned from profile rebuild):

**Step 1: Identify Target Page**
```bash
# Find all files related to target page
find . -name "*target-name*" -type f

# Check imports and dependencies
grep -r "import.*target" --include="*.tsx" --include="*.ts"
```

**Step 2: Find Old Patterns**
```bash
# Old component patterns
grep -r "class Component" components/
grep -r "componentDidMount" components/
grep -r "inline styles" components/

# Old API patterns
grep -r "req, res" app/api/
grep -r "export default" app/api/
grep -r "any.*:" app/api/

# Old database patterns
grep -r "multichain" lib/
grep -r "ethereum" lib/
grep -r "polygon" lib/
```

**Step 3: Create Removal Plan**
```markdown
## Files to Remove
- [ ] components/old-component.tsx - Uses deprecated patterns
- [ ] lib/old-service.ts - No 10-layer security
- [ ] app/api/old-endpoint/route.ts - Unsafe error handling

## Files to Keep
- [x] lib/api/utils/auth - Core business logic (verified)
- [x] components/icons/ - Professional SVG icons
- [x] lib/supabase.ts - Database client
```

**Step 4: Execute Removal**
```bash
# Remove old files
git rm components/old-component.tsx
git rm lib/old-service.ts

# Commit removal
git commit -m "chore: Remove old patterns before [page] rebuild"
```

**Step 5: Verify Clean State**
```bash
# Check for any remaining references
grep -r "OldComponent" .
grep -r "old-service" .

# Run TypeScript check
npx tsc --noEmit
```

---

## 10. Remove Old Agent Instructions

**Rule**: Remove old agent instructions and update with core principles from new foundation.

**Old Instructions to Remove**:
- Emoji usage instructions
- Old template references (removed templates)
- Deprecated API patterns
- Old testing strategies
- Outdated deployment instructions

**New Instructions to Add**:
```markdown
# Agent Instructions - Foundation Rebuild

## Core Principles
1. Use icons from components/icons/ (93 SVG icons)
2. Implement 10-layer API security for all endpoints
3. Read TEMPLATE-SELECTION.md before creating components
4. Verify Supabase schema with MCP before implementation
5. No rework - professional quality first time
6. Fix all issues immediately with professional patterns

## Template Strategy
- Multi-template hybrid (10-40% adaptation)
- Document template sources in component headers
- Reference big platform patterns (Twitter, GitHub, LinkedIn)

## Quality Standards
- TypeScript: 0 errors, strict mode
- Testing: 95%+ pass rate
- Accessibility: WCAG 2.1 AA compliance
- Mobile-first: 375px → 1920px
- Dark mode: Full support
```

---

## 11. Bug Scanning Requirements

**Rule**: Scan for ANY bugs or issues and fix them IMMEDIATELY using professional dev patterns BEFORE the next phase begins.

**Scan Categories**:

**1. TypeScript Errors**:
```bash
# Full type check
npx tsc --noEmit

# Target: 0 errors
```

**2. Null Safety**:
```bash
# Find potential null reference errors
grep -r "!\." --include="*.tsx" --include="*.ts"  # Non-null assertions
grep -r "\?" --include="*.tsx" --include="*.ts" | grep -v "?:"  # Optional chaining usage
```

**3. Array Operations**:
```bash
# Find unsafe array operations
grep -r ".sort(" --include="*.tsx" --include="*.ts"
grep -r ".map(" --include="*.tsx" --include="*.ts"
grep -r ".filter(" --include="*.tsx" --include="*.ts"
```

**4. API Error Handling**:
```bash
# Find APIs without proper error handling
grep -r "async function" app/api/ | grep -v "try"
```

**5. Security Issues**:
```bash
# Find potential security issues
grep -r "dangerouslySetInnerHTML" --include="*.tsx"
grep -r "eval(" --include="*.ts" --include="*.tsx"
grep -r "innerHTML" --include="*.ts" --include="*.tsx"
```

**6. Performance Issues**:
```bash
# Find potential performance issues
grep -r "useEffect(\[\])" --include="*.tsx"  # Empty dependency arrays
grep -r "useState.*{}" --include="*.tsx"  # Complex initial state
```

**Scan Checklist Before Next Phase**:
- [ ] 0 TypeScript errors
- [ ] All null checks in place
- [ ] Array operations are safe
- [ ] APIs have error handling
- [ ] No security vulnerabilities
- [ ] Performance optimized
- [ ] Tests passing (95%+)
- [ ] Accessibility verified
- [ ] Mobile responsive tested
- [ ] Dark mode working

---

## 12. Platform Context

**Website**: [gmeowhq.art](https://gmeowhq.art)  
**Network**: Base (Base Network only - no multichain)  
**Framework**: Farcaster Miniapps + base.dev miniapps  
**Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, Supabase  
**Target**: Base Network users, Farcaster community

**Key Characteristics**:
- Base-only chain (all addresses are Base addresses)
- Farcaster integration (via Neynar API)
- Quest system with BASE Points
- Badge system with 5 tiers (mythic, legendary, epic, rare, common)
- Leaderboard with viral XP tracking
- Social gamification features

**Development Standards**:
- Mobile-first design (375px → 1920px)
- Dark mode by default
- Accessibility: WCAG 2.1 AA
- Performance: Lighthouse score 90+
- Security: 10-layer architecture
- Testing: 95%+ test coverage

---

## 🚀 Quick Start Checklist

Before starting any new feature or rebuild:

- [ ] Read this document (FOUNDATION-REBUILD-REQUIREMENTS.md)
- [ ] Read TEMPLATE-SELECTION.md for component patterns
- [ ] Read planning document for specific feature (e.g., TASK-9-PROFILE-REBUILD-PLAN.md)
- [ ] Verify Supabase schema with MCP
- [ ] Scan codebase for old patterns to remove
- [ ] Check components/icons/ for available icons
- [ ] Review 10-layer security architecture
- [ ] Plan null-safety patterns
- [ ] Design error handling strategy
- [ ] Set up testing approach
- [ ] Document template sources
- [ ] Begin implementation with professional patterns

---

## 📚 Related Documentation

- `docs/migration/TEMPLATE-SELECTION.md` - Template strategy guide
- `docs/migration/COMPONENT-MIGRATION-STRATEGY.md` - Migration patterns
- `FOUNDATION-REBUILD-ROADMAP.md` - Overall project roadmap
- `CURRENT-TASK.md` - Current work status
- `docs/planning/TASK-9-PROFILE-REBUILD-PLAN.md` - Profile rebuild example

---

## ✅ Success Criteria

A rebuild is considered successful when:

1. **Quality**: 0 TypeScript errors, 95%+ test pass rate
2. **Security**: 10-layer architecture implemented (APIs)
3. **Templates**: Proper templates selected (10-40% adaptation)
4. **Icons**: All icons from components/icons/
5. **Schema**: Supabase schema verified and documented
6. **Cleanup**: Old patterns removed
7. **Testing**: Comprehensive tests passing
8. **Accessibility**: WCAG 2.1 AA compliant
9. **Mobile**: Responsive 375px → 1920px
10. **Documentation**: Complete and updated
11. **No Rework**: Professional quality first time
12. **Professional**: Follows big platform patterns

---

**Last Updated**: December 5, 2025  
**Status**: Active - Enforced on all development  
**Questions**: See FOUNDATION-REBUILD-ROADMAP.md or ask in development chat
