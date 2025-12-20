#!/bin/bash
# Phase 8.4 Deployment Script - ReferrerSet Event
# Created: December 19, 2025

set -e

echo "🚀 Deploying Phase 8.4: ReferrerSet Event"
echo "=========================================="
echo ""

# Step 1: Build processor
echo "📦 Step 1/3: Building processor..."
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Apply migration
echo "🗄️  Step 2/3: Applying database migration..."
npm run db:migrate
echo "✅ Migration applied"
echo ""

# Step 3: Restart processor
echo "🔄 Step 3/3: Restarting processor..."
# Check if processor is running in screen
if screen -ls | grep -q "squid-processor"; then
    echo "Stopping existing processor..."
    screen -S squid-processor -X quit
    sleep 2
fi

# Start processor in screen
echo "Starting processor in background..."
screen -dmS squid-processor npm run process
sleep 3

# Check if processor started
if screen -ls | grep -q "squid-processor"; then
    echo "✅ Processor restarted successfully"
    echo ""
    echo "📊 To view processor logs:"
    echo "   screen -r squid-processor"
    echo "   (Press Ctrl+A then D to detach)"
else
    echo "⚠️  Warning: Processor may not have started. Check manually:"
    echo "   screen -ls"
fi

echo ""
echo "✨ Phase 8.4 deployment complete!"
echo ""
echo "📋 What was deployed:"
echo "   • ReferrerSet entity schema"
echo "   • Event handler for ReferrerSet"
echo "   • Database table: referrer_set (4 indexes)"
echo "   • 3 Subsquid client functions"
echo ""
echo "🔍 Verify deployment:"
echo "   • GraphQL: http://localhost:4350/graphql"
echo "   • Query: { referrerSets(limit: 5) { id user referrer } }"
echo ""
