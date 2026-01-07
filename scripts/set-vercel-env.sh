#!/bin/bash
# Set all environment variables to Vercel
# Usage: ./scripts/set-vercel-env.sh

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

echo "🔧 Setting environment variables in Vercel..."
echo ""

# Read each line and set in Vercel
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" =~ ^# ]]; then
    continue
  fi
  
  # Skip VERCEL_OIDC_TOKEN (auto-injected by Vercel)
  if [[ "$key" == "VERCEL_OIDC_TOKEN" ]]; then
    echo "⏭️  Skipping $key (auto-injected by Vercel)"
    continue
  fi
  
  echo "📝 Setting: $key"
  echo "$value" | vercel env add "$key" production --force > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Set successfully"
  else
    echo "   ⚠️  May already exist or failed"
  fi
  
done < <(grep -E "^[A-Z_]+=" "$ENV_FILE")

echo ""
echo "✨ Done! Now redeploy with: vercel --prod"
