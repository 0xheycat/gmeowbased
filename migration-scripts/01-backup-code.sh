#!/bin/bash

# Template Migration - Backup Script
# Backs up all critical code before migration

set -e

echo "🔄 Starting backup process..."

# Create backup directory with timestamp
BACKUP_DIR="backups/pre-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Backup directory: $BACKUP_DIR"

# Backup critical directories
echo "📂 Backing up app/..."
cp -r app/ "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  app/ not found"

echo "📂 Backing up components/..."
cp -r components/ "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  components/ not found"

echo "📂 Backing up lib/..."
cp -r lib/ "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  lib/ not found"

echo "📂 Backing up contract/..."
cp -r contract/ "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  contract/ not found"

# Backup config files
echo "📄 Backing up config files..."
cp package.json "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  package.json not found"
cp package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
cp pnpm-lock.yaml "$BACKUP_DIR/" 2>/dev/null || true
cp tailwind.config.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  tailwind.config.ts not found"
cp tsconfig.json "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  tsconfig.json not found"
cp next.config.js "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  next.config.js not found"
cp .env.local "$BACKUP_DIR/" 2>/dev/null || true

# Create backup manifest
cat > "$BACKUP_DIR/BACKUP-MANIFEST.txt" << EOF
Backup Created: $(date)
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse HEAD)
Node Version: $(node --version)
NPM Version: $(npm --version)

=== Backed Up Files ===
$(find "$BACKUP_DIR" -type f | wc -l) files

=== API Routes (Critical) ===
$(find app/api -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l) files

=== Business Logic (Critical) ===
$(find lib/ -name "*.ts" 2>/dev/null | wc -l) files

=== Smart Contracts (Critical) ===
$(find contract/ -name "*.sol" 2>/dev/null | wc -l) files

=== Components to Migrate ===
$(find components/ -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l) files
EOF

# Create restore script
cat > "$BACKUP_DIR/RESTORE.sh" << 'RESTORE_SCRIPT'
#!/bin/bash
# Restore from backup

set -e

echo "🔄 Restoring from backup..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd ../..

echo "📦 Restoring app/..."
rm -rf app/
cp -r "$SCRIPT_DIR/app/" ./

echo "📦 Restoring components/..."
rm -rf components/
cp -r "$SCRIPT_DIR/components/" ./

echo "📦 Restoring lib/..."
rm -rf lib/
cp -r "$SCRIPT_DIR/lib/" ./

echo "📦 Restoring contract/..."
rm -rf contract/
cp -r "$SCRIPT_DIR/contract/" ./

echo "📦 Restoring config files..."
cp "$SCRIPT_DIR/package.json" ./
cp "$SCRIPT_DIR/tailwind.config.ts" ./ 2>/dev/null || true
cp "$SCRIPT_DIR/tsconfig.json" ./ 2>/dev/null || true
cp "$SCRIPT_DIR/next.config.js" ./ 2>/dev/null || true

echo "✅ Restore complete!"
echo "Run: npm install"
RESTORE_SCRIPT

chmod +x "$BACKUP_DIR/RESTORE.sh"

# Summary
echo ""
echo "✅ Backup complete!"
echo ""
echo "📊 Backup Summary:"
cat "$BACKUP_DIR/BACKUP-MANIFEST.txt"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "🔄 To restore: bash $BACKUP_DIR/RESTORE.sh"
echo ""
