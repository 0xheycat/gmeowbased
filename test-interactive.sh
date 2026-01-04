#!/bin/bash

# Interactive Testing Helper for Phase 1 & 2 Migration
# Opens each test page and waits for user confirmation

echo "🧪 Interactive Testing - Phase 1 & 2 Migration"
echo "=============================================="
echo ""
echo "This script will guide you through testing each migrated page."
echo "Press ENTER to continue to the next test, or Ctrl+C to exit."
echo ""

# Test 1: Leaderboard (Phase 1)
echo "📋 Test 1: Leaderboard Page (Phase 1)"
echo "--------------------------------------"
echo "Opening: http://localhost:3000/leaderboard"
echo ""
echo "What to check:"
echo "  ✓ Leaderboard table displays user data"
echo "  ✓ TierBadge components show colored badges"
echo "  ✓ 'View Details' button works"
echo "  ✓ ScoreDetailsModal opens with breakdown"
echo "  ✓ NO offline columns (Quest Points, Guild Bonus, etc.)"
echo ""
echo "DevTools check:"
echo "  1. Open DevTools (F12)"
echo "  2. Go to Network tab"
echo "  3. Filter by 'graphql'"
echo "  4. Look for GET_LEADERBOARD query"
echo "  5. Verify query time < 100ms"
echo ""
read -p "Press ENTER when ready to open leaderboard page..." 

# Open leaderboard in browser (works on most Linux systems)
if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000/leaderboard" 2>/dev/null &
elif command -v gnome-open > /dev/null; then
    gnome-open "http://localhost:3000/leaderboard" 2>/dev/null &
elif command -v firefox > /dev/null; then
    firefox "http://localhost:3000/leaderboard" 2>/dev/null &
else
    echo "Please manually open: http://localhost:3000/leaderboard"
fi

echo "✅ Leaderboard page should be open in your browser"
echo ""
read -p "Press ENTER after testing leaderboard page..." 

# Test 2: Dashboard (Phase 2)
echo ""
echo "📋 Test 2: Dashboard Page (Phase 2)"
echo "------------------------------------"
echo "Opening: http://localhost:3000/dashboard"
echo ""
echo "What to check:"
echo "  ✓ Navigate to 'GM & Stats' tab"
echo "  ✓ DashboardStatsWidget shows: Total Score, Level, Tier, Multiplier"
echo "  ✓ LevelProgress shows: XP progress bar"
echo "  ✓ TierProgress shows: Points to next tier"
echo "  ✓ RecentActivity shows: Recent level ups & rank ups"
echo ""
echo "DevTools check:"
echo "  1. Network tab → Filter 'graphql'"
echo "  2. Look for GET_USER_STATS query"
echo "  3. Look for GET_LEVEL_UPS query"
echo "  4. Look for GET_RANK_UPS query"
echo "  5. Verify all queries < 100ms"
echo ""
read -p "Press ENTER when ready to open dashboard page..." 

if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000/dashboard" 2>/dev/null &
elif command -v gnome-open > /dev/null; then
    gnome-open "http://localhost:3000/dashboard" 2>/dev/null &
elif command -v firefox > /dev/null; then
    firefox "http://localhost:3000/dashboard" 2>/dev/null &
else
    echo "Please manually open: http://localhost:3000/dashboard"
fi

echo "✅ Dashboard page should be open in your browser"
echo ""
read -p "Press ENTER after testing dashboard page..." 

# Test 3: Profile (Phase 2)
echo ""
echo "📋 Test 3: Profile Page (Phase 2)"
echo "----------------------------------"
echo "Opening: http://localhost:3000/profile"
echo ""
echo "What to check:"
echo "  ✓ ProfileStats shows: Total Score, Level, Tier, Multiplier"
echo "  ✓ Viral Points, Quest Points display"
echo "  ✓ Current streak, Lifetime GMs display"
echo "  ✓ Data matches dashboard values"
echo "  ✓ Profile avatar, bio, social links work (Supabase)"
echo ""
echo "DevTools check:"
echo "  1. Network tab → Filter 'graphql'"
echo "  2. Look for GET_USER_STATS query"
echo "  3. Verify query < 100ms"
echo "  4. Check Console tab for errors (should be 0 NEW errors)"
echo ""
read -p "Press ENTER when ready to open profile page..." 

if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000/profile" 2>/dev/null &
elif command -v gnome-open > /dev/null; then
    gnome-open "http://localhost:3000/profile" 2>/dev/null &
elif command -v firefox > /dev/null; then
    firefox "http://localhost:3000/profile" 2>/dev/null &
else
    echo "Please manually open: http://localhost:3000/profile"
fi

echo "✅ Profile page should be open in your browser"
echo ""
read -p "Press ENTER after testing profile page..." 

# Final Summary
echo ""
echo "🎉 Testing Complete!"
echo "===================="
echo ""
echo "Final Checklist:"
echo "  [ ] Leaderboard loads data from GraphQL"
echo "  [ ] Leaderboard has NO offline columns"
echo "  [ ] TierBadge component works"
echo "  [ ] ScoreDetailsModal works"
echo "  [ ] Dashboard 'GM & Stats' tab loads"
echo "  [ ] Dashboard 4 widgets display"
echo "  [ ] Profile page loads scoring data"
echo "  [ ] All GraphQL queries < 100ms"
echo "  [ ] No NEW console errors"
echo "  [ ] Data matches between pages"
echo ""
echo "📊 Performance Check:"
echo "  1. Open DevTools → Lighthouse"
echo "  2. Click 'Analyze page load'"
echo "  3. Check LCP < 2.5s, CLS < 0.1"
echo ""
echo "🐛 Console Errors:"
echo "  - Pre-existing API route errors are OK (not from migration)"
echo "  - NEW errors on leaderboard/dashboard/profile = report them"
echo ""
echo "📝 Next Steps:"
echo "  ✅ All tests pass → Proceed to Phase 2.5 or Phase 3"
echo "  ❌ Issues found → Document and fix before proceeding"
echo ""
echo "Full documentation:"
echo "  - TESTING-GUIDE.md"
echo "  - BROWSER-TEST-CHECKLIST.md"
echo "  - HYBRID-ARCHITECTURE-MIGRATION-PLAN.md"
echo ""
