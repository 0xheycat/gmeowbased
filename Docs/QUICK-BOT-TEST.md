# 🎯 Quick Test Commands for @heycat

## Cast These on Warpcast to Test Bot:

### 1. Stats & Progress
```
@gmeowbased show my stats
@gmeowbased how much xp do I have?
@gmeowbased my progress this week
```

### 2. Quests
```
@gmeowbased what quests can I do?
@gmeowbased recommend me some quests
@gmeowbased show active quests
```

### 3. Leaderboard & Rank
```
@gmeowbased show leaderboard
@gmeowbased what's my rank?
@gmeowbased top pilots
```

### 4. Streak
```
@gmeowbased my streak
@gmeowbased streak status
gm @gmeowbased
```

### 5. Tips
```
@gmeowbased my tips
@gmeowbased how much have I been tipped?
```

### 6. Help
```
@gmeowbased help
@gmeowbased commands
```

---

## Expected Bot Behavior:

✅ **Reply within 1-3 seconds**  
✅ **Include frame embed with single button**  
✅ **Button text relevant to intent** ("View Stats", "Browse Quests", etc.)  
✅ **Clicking button launches full Mini App**  
✅ **Frame image shows preview of data**  

---

## If Bot Doesn't Reply:

1. Check your Neynar score at https://neynar.com
   - Need 0.5+ to interact
   - Build score by casting & engaging

2. Verify wallet connected
   - Go to https://warpcast.com/~/settings/verified-addresses
   - Connect at least one wallet address

3. Check rate limit
   - Maximum 5 requests per minute
   - Wait 60 seconds and try again

4. View logs
   ```bash
   vercel logs --follow
   ```

---

## Frame Embed Checklist:

When bot replies, verify:
- [ ] Frame image loads (1200x800, 3:2 ratio)
- [ ] Single button visible (not multiple buttons)
- [ ] Button text ≤ 32 characters
- [ ] Clicking button opens Mini App in webview
- [ ] Splash screen shows briefly (if configured)
- [ ] App loads with correct data for your FID
- [ ] Can interact using SDK actions (composeCast, etc.)

---

## Next Steps:

1. ✅ **Test basic interaction** (cast "@gmeowbased show my stats")
2. ✅ **Verify frame works** (click embed, test Mini App)
3. ✅ **Test all 6 command types** (use list above)
4. ✅ **Check response quality** (relevant replies, correct data)
5. ✅ **Choose enhancement** (review BOT-ENHANCEMENT-AUDIT.md)
6. 🚀 **Implement Option 2, 3, 4, or 5**

---

**Status**: Ready to test! 🎉  
**Your FID**: 18139  
**Your Username**: @heycat  
**Bot Username**: @gmeowbased  
**Bot FID**: 1069798

**Start by casting: "@gmeowbased show my stats" on Warpcast!**
