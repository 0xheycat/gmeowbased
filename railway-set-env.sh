#!/bin/bash
# Import environment variables to Railway

echo "Importing environment variables to Railway..."

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove quotes from value if present
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  
  echo "Setting $key..."
  railway variables --set "$key=$value" 2>&1 | grep -v "variable set"
done < .env.local

echo "✅ Environment variables imported!"
