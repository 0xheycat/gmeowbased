# Documentation Automation Scripts

Automated tools for maintaining documentation quality and synchronization with code.

## Available Scripts

### 📝 JSDoc/TSDoc Extraction

Extracts documentation from code comments and generates markdown reference files.

```bash
pnpm run docs:extract

# With custom output directory
tsx scripts/docs/extract-jsdoc.ts --output=docs/api/generated
```

**What it does:**
- Scans `lib/` and `components/` for JSDoc comments
- Parses function signatures, parameters, return types
- Generates markdown API reference files
- Creates navigation index

**Output:**
- `docs/api/generated/lib-reference.md` - Library functions
- `docs/api/generated/component-reference.md` - Component APIs
- `docs/api/generated/README.md` - Index file

### 🌐 API Endpoint Documentation

Generates API documentation from Next.js route handlers.

```bash
pnpm run docs:api

# With custom output directory
tsx scripts/docs/generate-api-docs.ts --output=docs/api/generated
```

**What it does:**
- Scans `app/api/` for route files
- Extracts HTTP methods (GET, POST, etc.)
- Parses JSDoc comments for parameters
- Generates endpoint reference

**Output:**
- `docs/api/generated/endpoints.md` - Complete API reference

### 🔗 Link Validation

Validates all internal links in markdown files.

```bash
pnpm run docs:validate

# Auto-fix broken links (coming soon)
pnpm run docs:validate --fix
```

**What it checks:**
- File existence for relative links
- Anchor existence for hash links
- Case-sensitive path matching
- Suggests corrections for typos

**Exit codes:**
- `0` - All links valid
- `1` - Broken links found

### 📅 Outdated Detection

Detects documentation that may need updates based on file modification times.

```bash
pnpm run docs:outdated

# Custom threshold (default: 30 days)
tsx scripts/docs/check-outdated.ts --threshold=60
```

**What it checks:**
- Compares doc modification time with related source files
- Infers related files from doc content and structure
- Flags docs with critical or warning severity
- Suggests which files changed

**Severity levels:**
- 🔴 **Critical**: Doc > 60 days old, multiple newer source files
- ⚠️ **Warning**: Doc > 30 days old, some newer source files

### 🚀 Run All

Run all documentation checks and generators:

```bash
pnpm run docs:all
```

Equivalent to:
```bash
pnpm run docs:extract
pnpm run docs:api
pnpm run docs:validate
```

## Git Integration

### Pre-commit Hook

Add to `.git/hooks/pre-commit` (make executable with `chmod +x`):

```bash
#!/bin/bash

echo "🔍 Validating documentation links..."

if ! pnpm run docs:validate --quiet; then
  echo "❌ Documentation links validation failed!"
  echo "   Fix broken links before committing."
  echo "   Run: pnpm run docs:validate"
  exit 1
fi

echo "✅ Documentation validation passed"
```

### Pre-push Hook

Add to `.git/hooks/pre-push`:

```bash
#!/bin/bash

echo "📝 Checking for outdated documentation..."

if ! pnpm run docs:outdated --threshold=90; then
  echo "⚠️  Warning: Some documentation may be outdated"
  echo "   Consider updating before pushing."
  echo "   Run: pnpm run docs:outdated"
  # Don't block push, just warn
fi

echo "✅ Documentation check complete"
```

### GitHub Actions

Add to `.github/workflows/docs.yml`:

```yaml
name: Documentation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'lib/**'
      - 'components/**'
      - 'app/api/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Validate links
        run: pnpm run docs:validate
        
      - name: Check outdated docs
        run: pnpm run docs:outdated --threshold=30
        continue-on-error: true
        
      - name: Generate API docs
        run: pnpm run docs:all
        
      - name: Check for changes
        run: |
          if [[ -n $(git status --porcelain docs/) ]]; then
            echo "⚠️ Generated docs differ from committed version"
            git diff docs/
            exit 1
          fi
```

## CI/CD Integration

### Automated Documentation Updates

Schedule regular documentation updates:

```yaml
# .github/workflows/docs-update.yml
name: Update Documentation

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        
      - name: Generate docs
        run: |
          pnpm install
          pnpm run docs:all
          
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'docs: Update generated documentation'
          body: 'Auto-generated documentation update from code changes'
          branch: 'docs/auto-update'
```

## Best Practices

### Writing JSDoc Comments

```typescript
/**
 * Brief description of the function
 * 
 * Longer description with more details about what the function does,
 * edge cases, and important behavior notes.
 * 
 * @param userId - The Farcaster user ID
 * @param questId - The quest identifier
 * @returns Quest completion status with timestamp
 * 
 * @example
 * const status = await checkQuestCompletion('12345', 'quest-abc')
 * if (status.completed) {
 *   console.log('Quest completed at:', status.timestamp)
 * }
 * 
 * @throws {Error} If quest not found
 * @since 2.0.0
 */
export async function checkQuestCompletion(
  userId: string,
  questId: string
): Promise<QuestCompletionStatus> {
  // Implementation
}
```

### Documenting API Routes

```typescript
/**
 * Get quest details by ID
 * 
 * @param req - Next.js request object
 * @param params.id - Quest ID from URL parameter
 * @returns Quest data with completion stats
 * 
 * @example
 * GET /api/quest/quest-123
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Implementation
}
```

### Link Formatting

Use relative links in documentation:

```markdown
✅ Good: [See API Reference](../api/api-reference.md)
❌ Bad:  [See API Reference](/docs/api/api-reference.md)

✅ Good: [Frame System](./frame-system.md#architecture)
❌ Bad:  [Frame System](frame-system.md#Architecture)
```

## Troubleshooting

### "Command not found: tsx"

Install tsx globally or use via pnpm:
```bash
pnpm add -D tsx
```

### "ENOENT: no such file or directory"

Ensure you're running scripts from project root:
```bash
cd /path/to/gmeowbased
pnpm run docs:extract
```

### Link validation false positives

Some links may be case-sensitive on Linux but not on macOS/Windows. Always use exact casing that matches the actual file path.

### Outdated detection too sensitive

Adjust threshold:
```bash
# More lenient (90 days)
pnpm run docs:outdated --threshold=90

# More strict (14 days)
pnpm run docs:outdated --threshold=14
```

## Performance

- **JSDoc extraction**: ~5-10s for 200+ files
- **API doc generation**: ~2-3s for 20+ routes
- **Link validation**: ~3-5s for 100+ markdown files
- **Outdated detection**: ~10-15s for full scan

## Future Enhancements

- [ ] Auto-fix broken links with suggestions
- [ ] OpenAPI spec generation from API routes
- [ ] Diagram generation from code structure
- [ ] Change detection for incremental updates
- [ ] Integration with documentation site build
- [ ] Slack/Discord notifications for outdated docs
- [ ] Documentation coverage metrics
- [ ] AI-powered doc improvement suggestions
