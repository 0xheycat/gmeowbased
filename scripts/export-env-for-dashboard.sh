#!/bin/bash
# Vercel Manual Update Helper
# Generates commands for updating environment variables via Vercel Dashboard
# Use this when CLI is blocked by fair use limits

set -e

echo "======================================"
echo "Vercel Environment Variables Exporter"
echo "For Manual Dashboard Update"
echo "======================================"
echo ""
echo "⚠️  This generates a list of variables to update manually"
echo "    Go to: https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Error: .env.local not found!"
    exit 1
fi

# Output file
OUTPUT="vercel-env-variables.txt"
rm -f "$OUTPUT"

echo "Extracting environment variables from .env.local..."
echo ""

# Header
cat >> "$OUTPUT" << EOF
VERCEL ENVIRONMENT VARIABLES UPDATE
Generated: $(date)
Source: .env.local
Total Variables: $(grep -cE "^[A-Z_][A-Z0-9_]*=" .env.local)

UPDATE THESE IN VERCEL DASHBOARD:
https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables

For each variable below:
1. Click "Add New" or edit existing
2. Set for: Production, Preview, Development (all three)
3. Copy the value exactly as shown

================================================================================

EOF

# Counter
count=0

# Extract critical Phase 9 variables first
echo "=== PHASE 9 CRITICAL VARIABLES (UPDATE THESE FIRST) ===" >> "$OUTPUT"
echo "" >> "$OUTPUT"

phase9_vars=(
    "NEXT_PUBLIC_RPC_BASE"
    "RPC_BASE"
    "RPC_BASE_HTTP"
    "RPC_API_KEY"
    "NEXT_PUBLIC_SUBSQUID_URL"
    "SUBSQUID_API_KEY"
    "NEXT_PUBLIC_GM_BASE_SCORING"
)

for var in "${phase9_vars[@]}"; do
    value=$(grep "^${var}=" .env.local 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$value" ]; then
        echo "[$((++count))] ${var}" >> "$OUTPUT"
        echo "    ${value}" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
    fi
done

# All other variables
echo "=== ALL OTHER VARIABLES ===" >> "$OUTPUT"
echo "" >> "$OUTPUT"

while IFS= read -r line; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Extract variable name and value
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"
        
        # Skip if already in phase9_vars
        skip=false
        for phase9_var in "${phase9_vars[@]}"; do
            if [ "$var_name" = "$phase9_var" ]; then
                skip=true
                break
            fi
        done
        
        if [ "$skip" = true ]; then
            continue
        fi
        
        # Remove surrounding quotes
        var_value="${var_value#\"}"
        var_value="${var_value%\"}"
        var_value="${var_value#\'}"
        var_value="${var_value%\'}"
        
        echo "[$((++count))] ${var_name}" >> "$OUTPUT"
        echo "    ${var_value}" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
    fi
done < .env.local

# Summary
cat >> "$OUTPUT" << EOF

================================================================================
SUMMARY
================================================================================
Total variables to update: $count

PRIORITY ORDER:
1. Update Phase 9 critical variables first (top 7 variables)
2. Then update remaining variables
3. Redeploy after all updates

IMPORTANT:
- Set each variable for ALL environments: Production, Preview, Development
- Copy values exactly (watch for trailing spaces)
- Don't modify .env.local (it's the source of truth)

After updating all variables in Vercel Dashboard:
1. Trigger a redeploy from Vercel Dashboard
2. Or wait for git push to trigger automatic deploy
================================================================================
EOF

echo "✅ Environment variables exported to: $OUTPUT"
echo ""
echo "Next steps:"
echo "1. Open: https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables"
echo "2. Open: $OUTPUT (in another window)"
echo "3. Update each variable in Vercel Dashboard"
echo "4. Start with Phase 9 critical variables (first 7)"
echo ""
cat "$OUTPUT"
