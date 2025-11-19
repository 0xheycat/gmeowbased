# Frame Dynamic Image Testing

See FRAME-FIX-SUMMARY.md for test URLs and quick reference.

## Test Checklist

### GM Frame Tests
- [ ] Test URL: `https://gmeowhq.art/api/frame/image?type=gm&user=0x123&fid=848516&gmCount=42&streak=7&rank=15&chain=base`
- [ ] Verify dimensions: 1200x800
- [ ] Check gmCount, streak, rank display
- [ ] Verify emoji rendering: 🌅

### Quest Frame Tests  
- [ ] Test URL: `https://gmeowhq.art/api/frame/image?type=quest&questId=123&questName=Daily+GM&reward=500+XP&expires=24h&progress=60`
- [ ] Verify dimensions: 1200x800
- [ ] Check quest name, reward, expires display
- [ ] Verify progress bar at 60%

### Leaderboard Frame Tests
- [ ] Test URL: `https://gmeowhq.art/api/frame/image?type=leaderboard&season=Season+5&limit=10&chain=base`
- [ ] Verify dimensions: 1200x800
- [ ] Check season display
- [ ] Verify emojis: �� 🥇 🎯 ⚡ 🌟

### Integration Tests
- [ ] Frame route generates dynamic image URLs
- [ ] Warpcast frame validator passes
- [ ] Image generation < 1s
- [ ] Cache headers present

## Test Commands

```bash
# Test locally
pnpm dev
curl -I "http://localhost:3000/api/frame/image?type=gm&user=0x123&gmCount=42"

# Test production
curl -I "https://gmeowhq.art/api/frame/image?type=gm&user=0x123&gmCount=42"
```

## Status

✅ Implementation complete (Stage 5.17)
🔄 Ready for testing (Stage 5.18)
⏳ Pending production deployment (Stage 5.19)

