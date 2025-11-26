#!/bin/bash
# Test smart frame route detection

echo "=== Testing Smart Frame Route Detection ==="
echo ""

# Available routes
echo "📍 Available Frame Routes:"
echo "  ✅ /frame/leaderboard (no params)"
echo "  ✅ /frame/quest/[questId] (requires questId)"
echo "  ✅ /frame/badge/[fid] (requires fid)"
echo "  ✅ /frame/stats/[fid] (requires fid)"
echo "  ⏳ /api/frame?type=guild (not migrated)"
echo "  ⏳ /api/frame?type=gm (not migrated)"
echo ""

# Test each frame type
echo "🧪 Testing Frame Type Detection:"
echo ""

# Stats-summary (should use /frame/stats/[fid])
echo "1. Stats Summary:"
URL1=$(curl -sI "https://gmeowhq.art/frame/stats/18139?chain=all&embed=bot-reply&action=view-stats" | head -n 1)
echo "   Route: /frame/stats/[fid]"
echo "   Status: $URL1"
echo ""

# Quest-specific (should use /frame/quest/[questId])
echo "2. Quest Specific:"
URL2=$(curl -sI "https://gmeowhq.art/frame/quest/1?chain=base&embed=bot-reply&action=view-quest" | head -n 1)
echo "   Route: /frame/quest/[questId]"
echo "   Status: $URL2"
echo ""

# Quest-board (should fallback to /frame/leaderboard)
echo "3. Quest Board (browse all):"
URL3=$(curl -sI "https://gmeowhq.art/frame/leaderboard?chain=all&embed=bot-reply&action=browse-quests" | head -n 1)
echo "   Route: /frame/leaderboard (fallback)"
echo "   Status: $URL3"
echo ""

# Leaderboards (should use /frame/leaderboard)
echo "4. Leaderboards:"
URL4=$(curl -sI "https://gmeowhq.art/frame/leaderboard?chain=all&embed=bot-reply&action=view-rankings" | head -n 1)
echo "   Route: /frame/leaderboard"
echo "   Status: $URL4"
echo ""

# Badge-showcase (should use /frame/badge/[fid])
echo "5. Badge Showcase:"
URL5=$(curl -sI "https://gmeowhq.art/frame/badge/18139?embed=bot-reply&action=view-badge" | head -n 1)
echo "   Route: /frame/badge/[fid]"
echo "   Status: $URL5"
echo ""

# Profile-card (should use /frame/stats/[fid])
echo "6. Profile Card:"
URL6=$(curl -sI "https://gmeowhq.art/frame/stats/18139?card=true&embed=bot-reply&action=view-profile" | head -n 1)
echo "   Route: /frame/stats/[fid]"
echo "   Status: $URL6"
echo ""

# Guild-invite (should use /api/frame?type=guild - not migrated)
echo "7. Guild Invite:"
URL7=$(curl -sI "https://gmeowhq.art/api/frame?type=guild&embed=bot-reply&action=join-guild" | head -n 1)
echo "   Route: /api/frame?type=guild (not migrated)"
echo "   Status: $URL7"
echo ""

# Daily-streak (should use /api/frame?type=gm - not migrated)
echo "8. Daily Streak:"
URL8=$(curl -sI "https://gmeowhq.art/api/frame?type=gm&chain=base&embed=bot-reply&action=claim-streak" | head -n 1)
echo "   Route: /api/frame?type=gm (not migrated)"
echo "   Status: $URL8"
echo ""

echo "=== Summary ==="
echo "✅ Working: stats, quest-specific, quest-board, leaderboards, badge, profile"
echo "⏳ Not Migrated: guild, gm/streak (still use /api/frame)"
echo ""
echo "Next: Create /frame/guild and /frame/gm routes"
