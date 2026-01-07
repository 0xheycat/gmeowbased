#!/bin/bash
set -e

echo "🧹 Cleaning and re-uploading Vercel environment variables..."
echo ""

# Read .env.local and get all variable names
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

# Extract all variable names (skip empty lines, comments, and lines with only whitespace)
# Also filter out VERCEL_OIDC_TOKEN
VARS=$(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | cut -d'=' -f1 | grep -v '^VERCEL_OIDC_TOKEN$')

echo "📋 Found $(echo "$VARS" | wc -l) environment variables"
echo ""

# Step 1: Remove all existing variables
echo "🗑️  Step 1: Removing all existing variables from Vercel..."
for VAR_NAME in $VARS; do
    echo -n "   Removing: $VAR_NAME ... "
    vercel env rm "$VAR_NAME" production -y 2>/dev/null || echo -n "[not found] "
    echo "✓"
done
echo ""

# Step 2: Add all variables back with clean values
echo "📝 Step 2: Adding variables with clean values..."
for VAR_NAME in $VARS; do
    # Extract value: get line starting with VAR_NAME=, take everything after first =
    # Remove inline comments (everything after #)
    # Then trim ALL whitespace/newlines/carriage returns from both ends
    VAR_VALUE=$(grep "^${VAR_NAME}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -d '\n\r')
    
    # Skip if empty value
    if [ -z "$VAR_VALUE" ]; then
        echo "   ⚠️  Skipping $VAR_NAME (empty value)"
        continue
    fi
    
    echo -n "   Adding: $VAR_NAME = \"$VAR_VALUE\" ... "
    
    # Use printf to ensure no trailing newline, pipe to vercel env add
    printf "%s" "$VAR_VALUE" | vercel env add "$VAR_NAME" production > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅"
    else
        echo "❌ FAILED"
    fi
done

echo ""
echo "✨ Done! All environment variables cleaned and re-uploaded."
echo ""
echo "Next step: Deploy with 'vercel --prod'"
