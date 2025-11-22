# Stage 5.19: Production Deployment Guide

**Date:** November 19, 2025  
**Previous Stage:** 5.18 (Testing) - ✅ PASSED  
**Status:** 🚀 READY FOR DEPLOYMENT

## Pre-Deployment Checklist

- ✅ Stage 5.17: Dynamic frame images implemented (commits: c88f46b, fa7ed38)
- ✅ Stage 5.18: Code verification tests passed (15/15)
- ✅ Documentation complete (FRAME-DYNAMIC-IMAGE-FIX-PLAN.md, FRAME-FIX-SUMMARY.md)
- ✅ Git working directory clean
- ✅ All changes committed to main branch

## Deployment Steps

### 1. Verify Git Status
```bash
git status
git log --oneline -5
```

Expected output:
```
On branch main
nothing to commit, working tree clean

fa7ed38 docs: Add comprehensive frame implementation documentation
c88f46b feat: Implement dynamic frame images with personalized user data
```

### 2. Deploy to Production
```bash
vercel --prod
```

Expected prompts:
```
? Set up and deploy "~/Desktop/2025/Gmeowbased"? [Y/n] Y
? Which scope do you want to deploy to? 0xheycat
? Link to existing project? [Y/n] Y
? What's the name of your existing project? gmeowbased
🔗  Linked to 0xheycat/gmeowbased
🔍  Inspect: https://vercel.com/0xheycat/gmeowbased/...
✅  Production: https://gmeowhq.art
```

### 3. Monitor Deployment
```bash
# Watch deployment logs
vercel logs --follow

# Check deployment status
vercel ls
```

### 4. Test Production Endpoints

#### Test Frame Image Generation
```bash
# Test GM frame
curl -I "https://gmeowhq.art/api/frame/image?type=gm&user=0x1234567890123456789012345678901234567890&fid=848516&gmCount=42&streak=7&rank=15&chain=base"

# Expected: HTTP/2 200, content-type: image/png

# Test quest frame
curl -I "https://gmeowhq.art/api/frame/image?type=quest&questId=123&questName=Daily+GM&reward=500+XP&expires=24h&progress=60"

# Expected: HTTP/2 200, content-type: image/png

# Test leaderboard frame
curl -I "https://gmeowhq.art/api/frame/image?type=leaderboard&season=Season+5&limit=10&chain=base"

# Expected: HTTP/2 200, content-type: image/png
```

#### Test Frame Metadata
```bash
# Test frame route integration
curl -s "https://gmeowhq.art/api/frame?type=quest&questId=123&chain=base" | grep "fc:frame"

# Expected: <meta name="fc:frame" content='{"version":"next",...' />
```

### 5. Warpcast Testing

#### Frame Validator
1. Open https://warpcast.com/~/developers/frames
2. Test frame URL: `https://gmeowhq.art/api/frame?type=gm&user=0x1234567890123456789012345678901234567890&fid=848516`
3. Verify:
   - ✅ Frame renders correctly
   - ✅ Image loads (1200x800, 3:2 ratio)
   - ✅ Dynamic data shows (gmCount, streak, rank)
   - ✅ Load time < 1s

#### Live Cast Testing
1. Create new cast in Warpcast
2. Paste frame URL: `https://gmeowhq.art/api/frame?type=quest&questId=123&chain=base`
3. Verify frame preview shows:
   - ✅ Personalized quest data
   - ✅ Dynamic image (not static frame-image.png)
   - ✅ Correct button labels

### 6. Performance Monitoring

```bash
# Monitor production logs for errors
vercel logs --follow

# Check specific frame requests
vercel logs --follow | grep "/api/frame/image"

# Monitor response times
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s "https://gmeowhq.art/api/frame/image?type=gm&gmCount=100"
```

Expected performance:
- Image generation: < 500ms
- Total response time: < 1s
- Cache hit ratio: > 90% (after warmup)

### 7. Rollback Plan

If issues are detected:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific commit
git checkout <previous-commit>
vercel --prod
git checkout main
```

## Post-Deployment Verification

### ✅ Checklist
- [ ] All frame types render correctly (GM, quest, leaderboard)
- [ ] Dynamic images show personalized data
- [ ] Image dimensions: 1200x800 (3:2 ratio)
- [ ] Response times < 1s
- [ ] No errors in production logs
- [ ] Warpcast frame validator passes
- [ ] Live casts display frames correctly

### 📊 Success Metrics
- Frame load success rate: > 99%
- Average response time: < 500ms
- Cache hit rate: > 90%
- User engagement: Monitor click-through rates

## Troubleshooting

### Issue: Images not loading
```bash
# Check image route logs
vercel logs | grep "/api/frame/image"

# Test direct image URL
curl -I "https://gmeowhq.art/api/frame/image?type=gm&gmCount=100"
```

### Issue: Static images still showing
```bash
# Verify buildDynamicFrameImageUrl is deployed
curl -s "https://gmeowhq.art/api/frame?type=gm" | grep "api/frame/image"

# Should see: /api/frame/image?type=gm&...
# Should NOT see: /frame-image.png
```

### Issue: Slow response times
```bash
# Check image generation performance
time curl -o /tmp/test.png "https://gmeowhq.art/api/frame/image?type=gm&gmCount=100"

# If > 1s, consider:
# - Increasing revalidate time
# - Adding edge caching
# - Optimizing ImageResponse rendering
```

## Documentation Updates

After successful deployment, update:
1. ✅ CHANGELOG.md - Add Stage 5.19 deployment entry
2. ✅ README.md - Update frame documentation
3. ✅ PRODUCTION_TEST_RESULTS.md - Record test results

## Next Steps (Future Enhancements)

1. **Add more frame types**
   - Badge frames
   - Guild frames
   - Referral frames

2. **Optimize performance**
   - Implement edge caching
   - Add image compression
   - Preload common layouts

3. **Analytics integration**
   - Track frame views
   - Monitor conversion rates
   - A/B test designs

---

**Ready to deploy!** 🚀

Run: `vercel --prod`
