# 🧪 Tailwind v4 Upgrade - Testing Checklist

**Date:** November 29, 2025  
**Dev Server:** http://localhost:3000  
**Status:** Ready for Testing ✅

---

## ✅ Pre-Flight Checks (Completed)

- [x] Build succeeds with no errors (52s compile)
- [x] All 81 pages generate successfully
- [x] No TypeScript errors
- [x] No ESLint errors (build-blocking)
- [x] No CSS syntax errors
- [x] Development server starts (1.5s)

---

## 🎨 Theme System Tests

### Dark Mode (Default)
Visit: http://localhost:3000

**Expected Results:**
- [ ] Background: Deep navy `#06091a`
- [ ] Text: Light colored (zinc-50 to zinc-400)
- [ ] Cards: Darker navy `#0a1628`
- [ ] Borders: Zinc-800 subtle borders
- [ ] Theme toggle shows: 🌙 Moon icon

**Pages to Test:**
- [ ] `/` - Landing page
- [ ] `/app` - Dashboard
- [ ] `/app/daily-gm` - Daily GM page
- [ ] `/app/quests` - Quest marketplace
- [ ] `/app/guilds` - Guild discovery
- [ ] `/app/profile` - User profile
- [ ] `/app/badges` - Badge collection
- [ ] `/app/leaderboard` - Leaderboard
- [ ] `/onboard` - Onboarding flow

### Light Mode
**How to Test:**
1. Click theme toggle button (moon icon)
2. Icon should change to: ☀️ Sun

**Expected Results:**
- [ ] Background: Light zinc-50 `#fafafa`
- [ ] Text: Dark colored (zinc-900 to zinc-600)
- [ ] Cards: White `#ffffff`
- [ ] Borders: Zinc-200 subtle borders
- [ ] Theme toggle shows: ☀️ Sun icon
- [ ] All text remains readable (good contrast)

**Pages to Test:**
- [ ] `/app` - Dashboard in light mode
- [ ] `/app/profile` - Profile cards (primary/warning/success/danger colors visible)
- [ ] `/app/quests` - Quest cards readable
- [ ] `/onboard` - Gradient blobs visible (primary/info)

### System Mode (NEW)
**How to Test:**
1. Click theme toggle twice (moon → sun → monitor)
2. Icon should change to: 🖥️ Monitor

**Expected Results:**
- [ ] Theme follows OS preference automatically
- [ ] On macOS/Linux: Right-click desktop > Settings > Appearance
- [ ] On Windows: Settings > Personalization > Colors
- [ ] Theme updates when OS theme changes
- [ ] Theme toggle shows: 🖥️ Monitor icon

**Test Scenarios:**
- [ ] OS Dark → App shows dark mode
- [ ] OS Light → App shows light mode
- [ ] Switch OS theme → App theme updates

### Theme Persistence
**How to Test:**
1. Set theme to light mode
2. Refresh page (F5)
3. Theme should remain light mode

**Expected Results:**
- [ ] Theme persists after page reload
- [ ] Theme persists after browser close/reopen
- [ ] Theme stored in localStorage: `__GMEOWBASED_LAYOUT_CONFIG__`

### Theme Toggle UI
**Desktop (Sidebar):**
- [ ] Theme toggle visible at bottom of sidebar
- [ ] Icon animates smoothly when clicked
- [ ] Tooltip shows: "Theme: [mode] • Click to cycle"
- [ ] Cycles through: dark → light → system → dark

**Mobile (Header):**
- [ ] Theme toggle visible in top-right header
- [ ] Works on mobile viewport (< 768px)
- [ ] Icon changes correctly
- [ ] Same cycling behavior as desktop

---

## 🎯 Color System Tests

### Profile Page Quick Actions
Visit: http://localhost:3000/app/profile

**Quest Card (Primary - Purple):**
- [ ] Dark mode: Purple glow visible
- [ ] Light mode: Purple tint visible
- [ ] Hover: Intensity increases
- [ ] Text: "X completed" readable

**Badges Card (Warning - Yellow):**
- [ ] Dark mode: Yellow glow visible
- [ ] Light mode: Yellow tint visible
- [ ] Hover: Intensity increases
- [ ] Text: "X earned" readable

**Guilds Card (Success - Green):**
- [ ] Dark mode: Green glow visible
- [ ] Light mode: Green tint visible
- [ ] Hover: Intensity increases
- [ ] Text: "X joined" readable

**Rank Card (Danger - Orange):**
- [ ] Dark mode: Orange glow visible
- [ ] Light mode: Orange tint visible
- [ ] Hover: Intensity increases
- [ ] Text: "#X" readable

### Badge Mint Page
Visit: http://localhost:3000/app/badges/mint

**NEW Badge Indicator:**
- [ ] Shows green badge: "NEW"
- [ ] Dark mode: Visible with good contrast
- [ ] Light mode: Visible with good contrast
- [ ] Uses `bg-success/90` (no hardcoded green-500)

### Onboard Page
Visit: http://localhost:3000/onboard

**Gradient Blobs:**
- [ ] Top-left blob: Purple (primary) visible
- [ ] Bottom-right blob: Blue (info) visible
- [ ] Dark mode: Subtle glow effect
- [ ] Light mode: Subtle tint effect
- [ ] No hardcoded purple-600 or blue-600

### Guilds Page
Visit: http://localhost:3000/app/guilds

**Chain Indicators:**
- [ ] Base: Blue circle
- [ ] Optimism: Red circle
- [ ] Circles are properly sized (no style errors)
- [ ] Size uses proper `px` units

---

## 🔍 No Hardcoded Colors Check

Run this command to verify:
```bash
cd /home/heycat/Desktop/2025/Gmeowbased
grep -rn "bg-\(purple\|blue\|green\|yellow\|orange\|red\)-[0-9]" app/app/*.tsx
```

**Expected Result:**
- [ ] No matches (all hardcoded colors removed)
- [ ] Only chain-specific semantic colors in guilds page (intentional)

---

## 📱 Responsive Tests

### Desktop (> 1024px)
- [ ] Theme toggle in sidebar visible
- [ ] All pages layout correctly
- [ ] Dark/light mode transitions smooth

### Tablet (768px - 1023px)
- [ ] Theme toggle in mobile header visible
- [ ] Sidebar collapses to mobile menu
- [ ] All pages readable

### Mobile (< 768px)
- [ ] Theme toggle in header works
- [ ] Mobile menu functional
- [ ] Text remains readable
- [ ] Touch targets large enough (40px+)

---

## ♿ Accessibility Tests

### Keyboard Navigation
- [ ] Tab to theme toggle button
- [ ] Press Enter to cycle theme
- [ ] Focus visible (outline or ring)
- [ ] All interactive elements reachable

### Screen Reader (Optional)
- [ ] Theme toggle announces: "Toggle theme (current: dark)"
- [ ] Button has proper ARIA label
- [ ] Mode changes announced

### Color Contrast
**Dark Mode:**
- [ ] Background `#06091a` vs Text `#f4f4f5` = 18.5:1 (AAA)
- [ ] All text meets WCAG AAA (7:1 minimum)

**Light Mode:**
- [ ] Background `#fafafa` vs Text `#18181b` = 17.9:1 (AAA)
- [ ] All text meets WCAG AAA

---

## 🚀 Performance Tests

### First Paint
- [ ] No flash of unstyled content (FOUC)
- [ ] Theme loads before first paint (script in <head>)
- [ ] Page renders smoothly

### Theme Switch Speed
- [ ] Dark → Light: < 100ms
- [ ] Light → System: < 100ms
- [ ] System → Dark: < 100ms

### Bundle Size
Run:
```bash
cd /home/heycat/Desktop/2025/Gmeowbased
pnpm build
```

**Check Output:**
- [ ] First Load JS: ~102kB shared
- [ ] CSS: Single file (gmeowbased-foundation.css)
- [ ] No warnings about large bundles

---

## 🐛 Edge Cases

### localStorage Disabled
**Test:**
1. Open DevTools → Application → Storage
2. Disable localStorage
3. Refresh page

**Expected:**
- [ ] Theme defaults to dark mode
- [ ] No console errors
- [ ] Theme toggle still works (doesn't persist)

### System Theme Change While App Open
**Test:**
1. Set theme to "system" mode
2. Change OS theme while app is open
3. App should update automatically

**Expected:**
- [ ] Theme updates in real-time (matchMedia listener)

### Rapid Theme Cycling
**Test:**
1. Click theme toggle 10 times rapidly

**Expected:**
- [ ] No race conditions
- [ ] No console errors
- [ ] Theme cycles correctly
- [ ] localStorage updates correctly

---

## ✅ Sign-Off Checklist

Before marking as complete:

- [ ] All dark mode tests pass
- [ ] All light mode tests pass
- [ ] System mode works correctly
- [ ] Theme persists across reloads
- [ ] No hardcoded colors remain
- [ ] Build succeeds with no warnings
- [ ] Performance is acceptable
- [ ] Accessibility requirements met
- [ ] Mobile/tablet responsive
- [ ] Documentation complete

---

## 📝 Test Results

**Tester:** _________________  
**Date:** _________________  
**Browser:** _________________  
**OS:** _________________  

**Overall Status:** [ ] PASS  [ ] FAIL  

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## 🆘 Troubleshooting

### Theme Not Switching
**Check:**
1. Open DevTools → Console (any errors?)
2. Check localStorage: `__GMEOWBASED_LAYOUT_CONFIG__`
3. Verify `data-theme` attribute on `<html>` tag
4. Check useLayoutContext is providing theme

### Colors Look Wrong
**Check:**
1. Inspect element → Computed styles
2. Verify CSS variables are defined
3. Check `gmeowbased-foundation.css` is loaded
4. Verify no inline styles overriding

### Build Fails
**Check:**
1. Run: `pnpm build`
2. Check for CSS syntax errors
3. Verify PostCSS config correct
4. Check Tailwind config valid

---

**Ready to Test:** http://localhost:3000  
**Documentation:** TAILWIND-V4-UPGRADE-COMPLETE.md
