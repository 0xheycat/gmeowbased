#!/bin/bash
echo "=== COMPLETE MANIFEST AUDIT ==="
echo ""

echo "1️⃣ LOCAL STATIC FILE (public/.well-known/farcaster.json):"
if [ -f "public/.well-known/farcaster.json" ]; then
  echo "   ✅ File exists"
  echo "   Version: $(cat public/.well-known/farcaster.json | jq -r '.miniapp.version')"
  echo "   Button: $(cat public/.well-known/farcaster.json | jq -r '.miniapp.buttonTitle')"
  echo "   Account: $(cat public/.well-known/farcaster.json | jq -r '.accountAssociation.header' | base64 -d | jq -r '.type')"
  echo "   Screenshots: $(cat public/.well-known/farcaster.json | jq '.miniapp.screenshotUrls | length')"
else
  echo "   ❌ File not found"
fi

echo ""
echo "2️⃣ PRODUCTION STATIC FILE:"
PROD=$(curl -s "https://gmeowhq.art/.well-known/farcaster.json?nocache=$(date +%s)")
echo "   Version: $(echo "$PROD" | jq -r '.miniapp.version')"
echo "   Button: $(echo "$PROD" | jq -r '.miniapp.buttonTitle // "null"')"
echo "   Account: $(echo "$PROD" | jq -r '.accountAssociation.header' | base64 -d | jq -r '.type')"
echo "   Screenshots: $(echo "$PROD" | jq '.miniapp.screenshotUrls | length // 0')"

echo ""
echo "3️⃣ API ROUTE (app/api/manifest/route.ts):"
if [ -f "app/api/manifest/route.ts" ]; then
  echo "   ✅ File exists"
  grep -q "version: '1.1'" app/api/manifest/route.ts && echo "   ✅ Version 1.1" || echo "   ❌ Not version 1.1"
  grep -q "buttonTitle:" app/api/manifest/route.ts && echo "   ✅ Has buttonTitle" || echo "   ❌ Missing buttonTitle"
  grep -q "imageUrl:" app/api/manifest/route.ts && echo "   ✅ Has imageUrl" || echo "   ❌ Missing imageUrl"
  grep -q "screenshotUrls:" app/api/manifest/route.ts && echo "   ✅ Has screenshotUrls" || echo "   ❌ Missing screenshotUrls"
fi

echo ""
echo "4️⃣ ENVIRONMENT VARIABLES (.env.local):"
if [ -f ".env.local" ]; then
  echo "   ✅ File exists"
  grep -q "FARCASTER_ACCOUNT_ASSOCIATION_HEADER" .env.local && echo "   ✅ Has HEADER" || echo "   ⚠️  Missing HEADER (OK if using static file)"
  grep -q "FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD" .env.local && echo "   ✅ Has PAYLOAD" || echo "   ⚠️  Missing PAYLOAD (OK if using static file)"
  grep -q "FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE" .env.local && echo "   ✅ Has SIGNATURE" || echo "   ⚠️  Missing SIGNATURE (OK if using static file)"
else
  echo "   ⚠️  File not found (OK if using Vercel env vars)"
fi

echo ""
echo "5️⃣ GIT STATUS:"
echo "   Last commit: $(git log -1 --format='%h - %s')"
echo "   Pushed: $(git log -1 --format='%cr')"
echo "   Files changed in last commit:"
git show --name-only --pretty="" HEAD | head -5

echo ""
echo "6️⃣ COMPARISON:"
LOCAL_VERSION=$(cat public/.well-known/farcaster.json | jq -r '.miniapp.version')
PROD_VERSION=$(echo "$PROD" | jq -r '.miniapp.version')

if [ "$LOCAL_VERSION" == "$PROD_VERSION" ]; then
  echo "   ✅ LOCAL and PRODUCTION versions MATCH ($LOCAL_VERSION)"
else
  echo "   ❌ MISMATCH: Local=$LOCAL_VERSION, Production=$PROD_VERSION"
  echo "   ⏳ Vercel may still be deploying..."
fi

LOCAL_BUTTON=$(cat public/.well-known/farcaster.json | jq -r '.miniapp.buttonTitle')
PROD_BUTTON=$(echo "$PROD" | jq -r '.miniapp.buttonTitle // "null"')

if [ "$LOCAL_BUTTON" == "$PROD_BUTTON" ]; then
  echo "   ✅ Button titles MATCH"
else
  echo "   ❌ MISMATCH: Local='$LOCAL_BUTTON', Production='$PROD_BUTTON'"
fi

echo ""
echo "7️⃣ DIAGNOSIS:"
if [ "$LOCAL_VERSION" != "$PROD_VERSION" ]; then
  echo "   �� Production serving OLD manifest"
  echo "   Possible causes:"
  echo "   1. Vercel still deploying (wait 2-3 min)"
  echo "   2. Build failed (check Vercel logs)"
  echo "   3. CDN cache not cleared"
  echo "   4. Need to re-register miniapp"
fi

echo ""
echo "8️⃣ NEXT STEPS:"
echo "   1. Check Vercel deployment: https://vercel.com/deployments"
echo "   2. Look for commit: $(git log -1 --format='%h')"
echo "   3. Verify status is 'Ready' (not 'Building' or 'Error')"
echo "   4. If Ready but still old, wait 5 min for CDN propagation"
echo "   5. Re-register miniapp after deployment completes"
