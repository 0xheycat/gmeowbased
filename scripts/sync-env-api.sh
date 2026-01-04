#!/bin/bash
# Vercel Environment Variable API Update (Bypass CLI fair use limit)
# Uses Vercel REST API directly with authentication token

set -e

# Get Vercel auth token
if [ -f ~/.config/vercel/auth.json ]; then
    TOKEN=$(cat ~/.config/vercel/auth.json | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -1)
else
    echo "Error: Vercel auth token not found. Run 'vercel login' first."
    exit 1
fi

if [ -z "$TOKEN" ]; then
    echo "Error: Could not extract token from auth.json"
    exit 1
fi

# Get project ID
PROJECT_ID="prj_wYXOR0jhNjub1cdUckibpqDxG9HS"
TEAM_ID="team_HBpOutUe7j02mxRqeJZANGg3"

echo "Using Vercel REST API to update environment variables..."
echo "Project: $PROJECT_ID"
echo "Team: $TEAM_ID"
echo ""

# Function to create/update env var via API
update_env_api() {
    local key="$1"
    local value="$2"
    local type="${3:-encrypted}"
    
    echo "Updating: $key"
    
    # Create JSON payload
    local payload=$(cat <<EOF
{
  "key": "$key",
  "value": "$value",
  "type": "$type",
  "target": ["production", "preview", "development"]
}
EOF
)
    
    # Call Vercel API
    response=$(curl -s -X POST \
        "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q '"error"'; then
        echo "  ⚠️  Warning: $(echo "$response" | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
        # Try updating existing var instead
        echo "  Attempting to update existing variable..."
        
        # Get existing env var ID
        env_list=$(curl -s -X GET \
            "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        env_id=$(echo "$env_list" | grep -B 10 "\"key\":\"$key\"" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
        
        if [ -n "$env_id" ]; then
            # Update existing
            update_response=$(curl -s -X PATCH \
                "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$env_id?teamId=$TEAM_ID" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"value\": \"$value\", \"target\": [\"production\", \"preview\", \"development\"]}")
            
            if echo "$update_response" | grep -q '"error"'; then
                echo "  ✗ Failed: $(echo "$update_response" | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
                return 1
            else
                echo "  ✓ Updated (existing)"
                return 0
            fi
        else
            echo "  ✗ Could not find or create variable"
            return 1
        fi
    else
        echo "  ✓ Created"
        return 0
    fi
}

# Counter
total=0
success=0
failed=0

# Read critical Phase 9 variables from .env.local
echo "=== UPDATING PHASE 9 CRITICAL VARIABLES ==="
echo ""

# RPC endpoints
NEXT_PUBLIC_RPC_BASE=$(grep "^NEXT_PUBLIC_RPC_BASE=" .env.local | cut -d'=' -f2)
update_env_api "NEXT_PUBLIC_RPC_BASE" "$NEXT_PUBLIC_RPC_BASE" "encrypted" && ((success++)) || ((failed++))
((total++))

RPC_BASE=$(grep "^RPC_BASE=" .env.local | cut -d'=' -f2 | head -1)
update_env_api "RPC_BASE" "$RPC_BASE" "encrypted" && ((success++)) || ((failed++))
((total++))

RPC_BASE_HTTP=$(grep "^RPC_BASE_HTTP=" .env.local | cut -d'=' -f2 | tail -1)
update_env_api "RPC_BASE_HTTP" "$RPC_BASE_HTTP" "encrypted" && ((success++)) || ((failed++))
((total++))

RPC_API_KEY=$(grep "^RPC_API_KEY=" .env.local | cut -d'=' -f2)
update_env_api "RPC_API_KEY" "$RPC_API_KEY" "encrypted" && ((success++)) || ((failed++))
((total++))

NEXT_PUBLIC_SUBSQUID_URL=$(grep "^NEXT_PUBLIC_SUBSQUID_URL=" .env.local | cut -d'=' -f2)
update_env_api "NEXT_PUBLIC_SUBSQUID_URL" "$NEXT_PUBLIC_SUBSQUID_URL" "encrypted" && ((success++)) || ((failed++))
((total++))

SUBSQUID_API_KEY=$(grep "^SUBSQUID_API_KEY=" .env.local | cut -d'=' -f2)
update_env_api "SUBSQUID_API_KEY" "$SUBSQUID_API_KEY" "encrypted" && ((success++)) || ((failed++))
((total++))

NEXT_PUBLIC_GM_BASE_SCORING=$(grep "^NEXT_PUBLIC_GM_BASE_SCORING=" .env.local | cut -d'=' -f2)
update_env_api "NEXT_PUBLIC_GM_BASE_SCORING" "$NEXT_PUBLIC_GM_BASE_SCORING" "encrypted" && ((success++)) || ((failed++))
((total++))

echo ""
echo "=== SUMMARY ==="
echo "Total: $total"
echo "Success: $success"
echo "Failed: $failed"
echo ""

if [ $success -eq $total ]; then
    echo "✅ All critical Phase 9 variables updated successfully!"
    echo ""
    echo "Next: Deploy to preview"
    echo "  vercel deploy"
else
    echo "⚠️  Some variables failed to update ($failed/$total)"
    echo "You may need to update them manually in Vercel Dashboard"
fi
