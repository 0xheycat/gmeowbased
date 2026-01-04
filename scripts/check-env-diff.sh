#!/bin/bash
# Quick comparison between .env.local and Vercel environment

set -e

echo "Comparing .env.local with Vercel environment..."
echo ""

# Critical Phase 9 variables
echo "=== CRITICAL PHASE 9 VARIABLES ==="
echo ""

check_var() {
    local var_name="$1"
    local local_val=$(grep "^${var_name}=" .env.local 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | head -c 50)
    local vercel_val=$(grep "^${var_name}=" .env.vercel 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | head -c 50)
    
    if [ -z "$local_val" ]; then
        echo "⚠️  $var_name: NOT IN .env.local"
        return
    fi
    
    if [ -z "$vercel_val" ]; then
        echo "❌ $var_name: MISSING FROM VERCEL"
        echo "   Local: ${local_val}..."
        return
    fi
    
    if [ "$local_val" = "$vercel_val" ]; then
        echo "✅ $var_name: SYNCED"
    else
        echo "❌ $var_name: DIFFERENT"
        echo "   Local:  ${local_val}..."
        echo "   Vercel: ${vercel_val}..."
    fi
}

# Pull current Vercel environment
echo "Pulling current Vercel environment..."
vercel env pull .env.vercel 2>/dev/null || {
    echo "Error: Cannot pull Vercel environment (fair use limit?)"
    exit 1
}
echo ""

# Check critical variables
check_var "NEXT_PUBLIC_RPC_BASE"
check_var "RPC_BASE"
check_var "RPC_BASE_HTTP"
check_var "NEXT_PUBLIC_SUBSQUID_URL"
check_var "SUBSQUID_API_KEY"
check_var "RPC_API_KEY"
check_var "NEXT_PUBLIC_GM_BASE_SCORING"
check_var "NEXT_PUBLIC_GM_BASE_CORE"
check_var "NEXT_PUBLIC_GM_BASE_GUILD"
check_var "NEXT_PUBLIC_GM_BASE_REFERRAL"

echo ""
echo "=== VARIABLE COUNTS ==="
local_count=$(grep -cE "^[A-Z_]+=.+" .env.local 2>/dev/null || echo "0")
vercel_count=$(grep -cE "^[A-Z_]+=.+" .env.vercel 2>/dev/null || echo "0")
echo "Local (.env.local):  $local_count variables"
echo "Vercel (.env.vercel): $vercel_count variables"
echo "Difference:          $((local_count - vercel_count)) variables"

echo ""
echo "=== RECOMMENDATION ==="
if [ $((local_count - vercel_count)) -gt 5 ]; then
    echo "⚠️  Significant differences detected!"
    echo "   Run: ./scripts/sync-vercel-env.sh"
else
    echo "✅ Environments are relatively in sync"
fi
