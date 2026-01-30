# Cache Metrics Dashboard - Quick Reference

**URL**: `/admin/cache-metrics`  
**Access**: Admin authentication required  
**Update Frequency**: 5 seconds (auto-refresh)

---

## Dashboard Overview

### Metric Cards

1. **🎯 Cache Hit Rate**
   - **What**: Percentage of requests served from cache
   - **Target**: >95%
   - **Color**: Blue gradient
   - **Formula**: `cacheHits / (cacheHits + cacheMisses) × 100`

2. **📡 RPC Calls**
   - **What**: Total blockchain RPC calls since reset
   - **Target**: <10/min (with Phase 8.4 optimizations)
   - **Color**: Purple gradient
   - **Resets**: On server restart

3. **⚡ Avg Latency**
   - **What**: Average response time for scoring operations
   - **Target**: <50ms
   - **Color**: Green gradient
   - **Units**: milliseconds

### Status Indicators

| Status | Hit Rate | Color | Icon | Action Required |
|--------|----------|-------|------|-----------------|
| **Healthy** | >95% | 🟢 Green | ✅ | None - system optimal |
| **Warning** | 80-95% | 🟡 Yellow | ⚠️ | Monitor for degradation |
| **Degraded** | <80% | 🔴 Red | 🔴 | Investigate immediately |

### Charts

1. **Cache Hit Rate Trend** (Area Chart)
   - Last 20 data points (100 seconds = ~1.7 minutes)
   - Blue gradient fill
   - Y-axis: 0-100%
   - Shows cache effectiveness over time

2. **RPC Calls** (Line Chart)
   - Purple stroke
   - Shows RPC call accumulation
   - Spikes indicate cache misses

3. **Average Latency** (Line Chart)
   - Green stroke
   - Shows performance consistency
   - Spikes indicate slow operations

---

## Controls

### Auto-Refresh Toggle
```
🔄 Auto-Refresh ON  → Metrics update every 5 seconds
⏸️ Auto-Refresh OFF → Manual refresh only
```

**Use Cases**:
- ON: Real-time monitoring (default)
- OFF: Analyzing historical trends, taking screenshots

### Manual Refresh
```
🔄 Refresh Now → Fetch latest metrics immediately
```

**Use Cases**:
- After cache invalidation
- Debugging specific issues
- Validating changes

### Cache Invalidation
```
Input: 0x... (Ethereum address)
Button: 🗑️ Invalidate Cache
```

**What It Does**:
1. Clears 4 cache keys for the address:
   - `scoring:user-stats:{address}`
   - `scoring:total-score:{address}`
   - `scoring:user-tier:{address}`
   - `scoring:score-breakdown:{address}`
2. Next request fetches fresh data from contract
3. Dashboard shows cache miss spike

**When to Use**:
- After manual score adjustments
- Testing cache invalidation
- Debugging stale data issues
- User reports incorrect scores

---

## Reading the Dashboard

### Healthy System
```
Cache Hit Rate: 97.5%
RPC Calls: 8
Avg Latency: 42ms
Status: ✅ Healthy

Charts:
- Hit rate stable around 95-100%
- RPC calls growing slowly
- Latency consistently <50ms
```

### Warning Signs
```
Cache Hit Rate: 85%
RPC Calls: 45
Avg Latency: 78ms
Status: ⚠️ Warning

Investigation:
- Hit rate dropping
- RPC calls increasing faster than normal
- Latency climbing

Possible Causes:
- High traffic
- Cache TTL expired
- Recent deployments
- Database issues
```

### Degraded System
```
Cache Hit Rate: 65%
RPC Calls: 120
Avg Latency: 150ms
Status: 🔴 Degraded

Action Required:
1. Check server logs for errors
2. Verify RPC endpoint health
3. Check Redis/cache availability
4. Review recent code changes
5. Consider increasing cache TTL
```

---

## Common Scenarios

### Scenario 1: Testing Cache Invalidation
**Steps**:
1. Note current cache hit rate (e.g., 96%)
2. Enter test address: `0x8870c155666809609176260f2b65a626c000d773`
3. Click "🗑️ Invalidate Cache"
4. Observe metrics:
   - Cache misses +1
   - RPC calls +4
   - Hit rate temporarily drops (e.g., 95%)
5. Wait 30 seconds
6. Hit rate recovers to >95%

**Expected Result**: ✅ Cache invalidation working correctly

### Scenario 2: Monitoring Production Deployment
**Steps**:
1. Deploy new scoring changes
2. Enable auto-refresh
3. Monitor for 5 minutes
4. Look for:
   - Hit rate remains >90%
   - RPC calls stay reasonable
   - Latency doesn't spike
   - No error alerts

**Red Flags**:
- ❌ Hit rate drops below 80%
- ❌ RPC calls >100 in 1 minute
- ❌ Latency >200ms sustained
- ❌ Status changes to degraded

### Scenario 3: Performance Optimization
**Before Optimization**:
```
Cache Hit Rate: 60%
RPC Calls: 500/hour
Avg Latency: 120ms
```

**After Phase 8.4.1 (Cache Invalidation)**:
```
Cache Hit Rate: 88%
RPC Calls: 100/hour (-80%)
Avg Latency: 65ms (-46%)
```

**After Phase 8.4 Full (5min TTL)**:
```
Cache Hit Rate: 96%
RPC Calls: <10/min (-98%)
Avg Latency: 42ms (-65%)
```

---

## Troubleshooting

### Issue: Hit Rate Dropping
**Symptoms**: Hit rate <90%, increasing RPC calls

**Diagnosis**:
1. Check cache TTL settings (`lib/cache/server.ts`)
2. Verify Redis/KV availability
3. Check for excessive invalidations
4. Review traffic patterns (sudden spike?)

**Solutions**:
- Increase cache TTL (30s → 5min)
- Scale Redis instance
- Optimize invalidation logic
- Add request throttling

### Issue: High Latency
**Symptoms**: Avg latency >100ms, slow responses

**Diagnosis**:
1. Check RPC endpoint health
2. Verify database connection pool
3. Review contract read complexity
4. Check network latency

**Solutions**:
- Use faster RPC provider
- Increase database connections
- Optimize contract calls
- Add CDN for static assets

### Issue: Dashboard Not Updating
**Symptoms**: Metrics frozen, charts not moving

**Diagnosis**:
1. Check browser console for errors
2. Verify `/api/scoring/metrics` endpoint
3. Check auto-refresh toggle
4. Test manual refresh

**Solutions**:
- Refresh browser
- Check network tab (F12)
- Verify server is running
- Check admin authentication

---

## API Endpoint

### GET /api/scoring/metrics

**Response**:
```json
{
  "metrics": {
    "rpcCalls": 150,
    "cacheHits": 1200,
    "cacheMisses": 150,
    "avgLatency": 45,
    "lastReset": 1767425149221,
    "cacheHitRate": 88.89,
    "uptime": "15.3 minutes"
  },
  "status": "healthy",
  "timestamp": "2026-01-03T07:25:49.234Z"
}
```

**Status Codes**:
- `200` - Success
- `500` - Server error
- `401` - Unauthorized (admin auth required)

---

## Best Practices

### Monitoring
✅ **DO**:
- Check dashboard after deployments
- Monitor during high-traffic periods
- Set up alerts for degraded status
- Review weekly performance trends

❌ **DON'T**:
- Ignore warning status
- Invalidate cache unnecessarily
- Disable auto-refresh during incidents
- Forget to check after major changes

### Cache Invalidation
✅ **DO**:
- Invalidate after score corrections
- Test with single addresses first
- Monitor impact on metrics
- Document invalidation reasons

❌ **DON'T**:
- Mass invalidate without reason
- Invalidate during peak traffic
- Forget to verify results
- Invalidate production without testing

### Performance Optimization
✅ **DO**:
- Baseline metrics before changes
- Test optimizations in staging
- Monitor for regressions
- Document performance improvements

❌ **DON'T**:
- Optimize without measuring
- Change multiple things at once
- Ignore latency spikes
- Skip performance testing

---

## Quick Commands

### Check Metrics (CLI)
```bash
curl -s http://localhost:3000/api/scoring/metrics | jq '.'
```

### Invalidate Cache (CLI)
```bash
curl -s "http://localhost:3000/api/admin/scoring?address=0x..." | jq '.'
```

### Monitor Continuously (CLI)
```bash
watch -n 5 'curl -s http://localhost:3000/api/scoring/metrics | jq ".metrics"'
```

---

## Related Documentation

- [PHASE-8.4.2-IMPLEMENTATION-SUMMARY.md](./PHASE-8.4.2-IMPLEMENTATION-SUMMARY.md) - Implementation details
- [PHASE-8.4.1-IMPLEMENTATION-SUMMARY.md](./PHASE-8.4.1-IMPLEMENTATION-SUMMARY.md) - Cache invalidation
- [TEST-EXECUTION-GUIDE.md](./TEST-EXECUTION-GUIDE.md) - Testing procedures
- [HYBRID-ARCHITECTURE-MIGRATION-PLAN.md](./HYBRID-ARCHITECTURE-MIGRATION-PLAN.md) - Overall architecture

---

**Last Updated**: January 3, 2026  
**Phase**: 8.4.2 - Cache Metrics Dashboard  
**Status**: ✅ Production Ready
