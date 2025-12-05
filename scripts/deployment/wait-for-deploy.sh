#!/bin/bash
echo "=== WAITING FOR VERCEL DEPLOYMENT ==="
echo ""
LAST_PUSH=$(git log -1 --format="%cr" origin/main)
echo "Last push: $LAST_PUSH"
echo "Commit: $(git log -1 --format="%h - %s" origin/main)"
echo ""
echo "Checking production status every 10 seconds..."
echo "Press Ctrl+C to stop"
echo ""

EXPECTED_VERSION="1.1"
EXPECTED_TYPE="custody"
COUNT=0

while true; do
  COUNT=$((COUNT + 1))
  
  # Bypass cache
  RESPONSE=$(curl -s "https://gmeowhq.art/.well-known/farcaster.json?v=$(date +%s)")
  
  VERSION=$(echo "$RESPONSE" | jq -r '.miniapp.version')
  TYPE=$(echo "$RESPONSE" | jq -r '.accountAssociation.header' | base64 -d 2>/dev/null | jq -r '.type' 2>/dev/null)
  BUTTON=$(echo "$RESPONSE" | jq -r '.miniapp.buttonTitle')
  
  echo "[$COUNT] Version: $VERSION | Type: $TYPE | Button: ${BUTTON:0:20}"
  
  if [[ "$VERSION" == "$EXPECTED_VERSION" ]] && [[ "$TYPE" == "$EXPECTED_TYPE" ]]; then
    echo ""
    echo "✅ DEPLOYMENT COMPLETE!"
    echo "✅ Version: $VERSION"
    echo "✅ Account type: $TYPE"
    echo "✅ Button title: $BUTTON"
    echo ""
    echo "🎉 Manifest is now live at https://gmeowhq.art/.well-known/farcaster.json"
    break
  fi
  
  sleep 10
done
