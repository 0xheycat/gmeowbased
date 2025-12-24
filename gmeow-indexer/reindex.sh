#!/bin/bash
# Subsquid Re-Index Script - Priority 2
# Run this after verifying code changes are complete
# Estimated time: 18-24 hours

set -e  # Exit on error

echo "========================================="
echo "🚨 SUBSQUID RE-INDEX - PRIORITY 2"
echo "========================================="
echo ""
echo "⚠️  WARNING: This will DELETE all existing Subsquid data"
echo "⚠️  Duration: ~24 hours for full re-index"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "📍 Working directory: /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer"
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

echo ""
echo "🔍 Step 1/6: Verifying build..."
if ! npm run build > /dev/null 2>&1; then
    echo "❌ Build failed! Fix errors before re-indexing."
    exit 1
fi
echo "✅ Build passed"

echo ""
echo "🛑 Step 2/6: Stopping any running processor..."
pkill -f "node.*main.js" 2>/dev/null || echo "   No processor running"
sleep 2

echo ""
echo "🗑️  Step 3/6: Dropping old database..."
psql -U postgres -c "DROP DATABASE IF EXISTS squid CASCADE;" 2>&1 | grep -v "NOTICE" || true
echo "✅ Old database dropped"

echo ""
echo "🆕 Step 4/6: Creating fresh database..."
psql -U postgres -c "CREATE DATABASE squid;" 2>&1 | grep -v "NOTICE" || true
echo "✅ Fresh database created"

echo ""
echo "📋 Step 5/6: Applying schema migrations..."
npm run db:migrate
echo "✅ Schema migrated with NEW field names:"
echo "   - Guild.treasuryPoints"
echo "   - Quest.pointsAwarded"
echo "   - DailyStats.dailyPointsAwarded"

echo ""
echo "🚀 Step 6/6: Starting re-index process..."
echo "   Start block: 39,270,005"
echo "   Estimated time: 18-24 hours"
echo ""

# Start processor in background
nohup npm run process > reindex.log 2>&1 &
PID=$!
echo $PID > processor.pid

echo "✅ Re-index started!"
echo ""
echo "📊 Process ID: $PID"
echo "📄 Log file: reindex.log"
echo ""
echo "========================================="
echo "✅ RE-INDEX INITIATED"
echo "========================================="
echo ""
echo "Monitor progress:"
echo "  tail -f reindex.log"
echo ""
echo "Check status:"
echo "  psql -U postgres -d squid -c \"SELECT COUNT(*) FROM guild;\""
echo "  psql -U postgres -d squid -c \"SELECT COUNT(*) FROM quest;\""
echo ""
echo "Stop processor:"
echo "  kill \$(cat processor.pid)"
echo ""
echo "📖 Full guide: SUBSQUID-REINDEX-GUIDE.md"
echo ""
