#!/bin/bash
# Comprehensive test script for onboarding endpoints
# Tests address extraction, score calculation, and data integrity

set -e

BASE_URL="${1:-http://localhost:3000}"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}🧪 Onboarding System Test Suite${NC}\n"

# Test FIDs with different profiles
TEST_FIDS=(
  "3:dwr:Mythic"         # Dan (Farcaster co-founder)
  "2:v:Mythic"           # Varun (Farcaster co-founder)  
  "18139:heycat:Epic"    # HEY CAT (test user)
  "5650:degenbot:Legendary" # Popular bot account
)

echo -e "${BOLD}Test 1: User Profile API${NC}"
echo "Testing FID detection and profile fetching..."
for test_case in "${TEST_FIDS[@]}"; do
  IFS=':' read -r fid username expected_tier <<< "$test_case"
  echo -e "\n${YELLOW}Testing FID $fid (@$username)${NC}"
  
  response=$(curl -s "${BASE_URL}/api/user/profile?fid=${fid}")
  
  # Check if response contains expected fields
  if echo "$response" | jq -e '.fid and .username and .custodyAddress and .verifiedAddresses' > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Profile fetched successfully"
    echo "    FID: $(echo $response | jq -r '.fid')"
    echo "    Username: @$(echo $response | jq -r '.username')"
    echo "    Custody: $(echo $response | jq -r '.custodyAddress')"
    verified_count=$(echo $response | jq '.verifiedAddresses.eth_addresses | length')
    echo "    Verified addresses: $verified_count"
  else
    echo -e "  ${RED}✗${NC} Profile fetch failed"
    echo "$response" | jq '.'
  fi
done

echo -e "\n${BOLD}Test 2: Neynar Score API${NC}"
echo "Testing score calculation and tier assignment..."
for test_case in "${TEST_FIDS[@]}"; do
  IFS=':' read -r fid username expected_tier <<< "$test_case"
  echo -e "\n${YELLOW}Testing FID $fid (@$username) - Expected: $expected_tier${NC}"
  
  response=$(curl -s "${BASE_URL}/api/neynar/score?fid=${fid}")
  
  if echo "$response" | jq -e '.score and .tier' > /dev/null 2>&1; then
    score=$(echo "$response" | jq -r '.score')
    tier=$(echo "$response" | jq -r '.tier')
    followers=$(echo "$response" | jq -r '.metrics.followerCount')
    power_badge=$(echo "$response" | jq -r '.metrics.powerBadge')
    
    echo -e "  ${GREEN}✓${NC} Score calculated successfully"
    echo "    Score: $score"
    echo "    Tier: $tier"
    echo "    Followers: $followers"
    echo "    Power Badge: $power_badge"
    
    # Validate tier mapping
    if [[ "$tier" == "${expected_tier,,}" ]]; then
      echo -e "    ${GREEN}✓${NC} Tier matches expected ($expected_tier)"
    else
      echo -e "    ${YELLOW}⚠${NC}  Tier mismatch (expected: $expected_tier, got: $tier)"
    fi
  else
    echo -e "  ${RED}✗${NC} Score calculation failed"
    echo "$response" | jq '.'
  fi
done

echo -e "\n${BOLD}Test 3: Onboarding Complete API${NC}"
echo "Testing full onboarding flow with address extraction..."

# Use a less common FID to avoid "already onboarded" errors
TEST_FID=5650  # Popular account but less likely to be in our test DB

echo -e "\n${YELLOW}Testing onboarding for FID $TEST_FID${NC}"

# First, check if already onboarded
response=$(curl -s -X POST "${BASE_URL}/api/onboard/complete" \
  -H "Content-Type: application/json" \
  -d "{\"fid\": ${TEST_FID}}")

if echo "$response" | jq -e '.alreadyOnboarded' > /dev/null 2>&1; then
  echo -e "  ${YELLOW}⚠${NC}  User already onboarded (skipping)"
  echo "  Testing with response data..."
else
  echo -e "  ${GREEN}✓${NC} New onboarding completed"
fi

# Validate response structure
if echo "$response" | jq -e '.success and .tier and .neynarScore and .profile' > /dev/null 2>&1; then
  echo -e "\n  ${BOLD}Onboarding Response:${NC}"
  echo "    Success: $(echo $response | jq -r '.success')"
  echo "    Tier: $(echo $response | jq -r '.tier')"
  echo "    Neynar Score: $(echo $response | jq -r '.neynarScore')"
  echo "    Points Awarded: $(echo $response | jq -r '.rewards.totalPoints')"
  echo "    XP Awarded: $(echo $response | jq -r '.rewards.totalXP')"
  
  echo -e "\n  ${BOLD}Profile Data:${NC}"
  echo "    FID: $(echo $response | jq -r '.profile.fid')"
  echo "    Wallet Address: $(echo $response | jq -r '.profile.wallet_address')"
  echo "    Custody Address: $(echo $response | jq -r '.profile.custody_address')"
  verified=$(echo $response | jq -r '.profile.verified_addresses | length')
  echo "    Verified Addresses: $verified"
  echo "    Neynar Score (DB): $(echo $response | jq -r '.profile.neynar_score')"
  echo "    Tier (DB): $(echo $response | jq -r '.profile.neynar_tier')"
  
  # Validation checks
  echo -e "\n  ${BOLD}Validation:${NC}"
  
  wallet=$(echo $response | jq -r '.profile.wallet_address')
  custody=$(echo $response | jq -r '.profile.custody_address')
  verified_arr=$(echo $response | jq -r '.profile.verified_addresses')
  
  if [[ "$wallet" != "null" && "$wallet" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "    ${GREEN}✓${NC} Wallet address extracted: $wallet"
  else
    echo -e "    ${YELLOW}⚠${NC}  Wallet address missing or invalid"
  fi
  
  if [[ "$custody" != "null" && "$custody" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "    ${GREEN}✓${NC} Custody address extracted: $custody"
  else
    echo -e "    ${RED}✗${NC} Custody address missing or invalid"
  fi
  
  if [[ "$verified_arr" != "null" ]]; then
    echo -e "    ${GREEN}✓${NC} Verified addresses array stored"
  else
    echo -e "    ${YELLOW}⚠${NC}  Verified addresses not stored"
  fi
  
  # Check score consistency
  api_score=$(echo $response | jq -r '.neynarScore')
  db_score=$(echo $response | jq -r '.profile.neynar_score')
  if [[ "$api_score" == "$db_score" ]]; then
    echo -e "    ${GREEN}✓${NC} Neynar score consistent (API: $api_score, DB: $db_score)"
  else
    echo -e "    ${RED}✗${NC} Score mismatch (API: $api_score, DB: $db_score)"
  fi
  
else
  echo -e "  ${RED}✗${NC} Invalid response structure"
  echo "$response" | jq '.'
fi

echo -e "\n${BOLD}Test 4: Error Handling${NC}"
echo "Testing validation and error responses..."

echo -e "\n${YELLOW}Test 4a: Invalid FID (negative)${NC}"
response=$(curl -s -X POST "${BASE_URL}/api/onboard/complete" \
  -H "Content-Type: application/json" \
  -d '{"fid": -1}')
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Correctly rejected: $(echo $response | jq -r '.error')"
else
  echo -e "  ${RED}✗${NC} Should have rejected invalid FID"
fi

echo -e "\n${YELLOW}Test 4b: Invalid FID (non-existent)${NC}"
response=$(curl -s -X POST "${BASE_URL}/api/onboard/complete" \
  -H "Content-Type: application/json" \
  -d '{"fid": 999999999}')
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Correctly rejected: $(echo $response | jq -r '.error')"
else
  echo -e "  ${RED}✗${NC} Should have rejected non-existent FID"
fi

echo -e "\n${YELLOW}Test 4c: Missing FID${NC}"
response=$(curl -s -X POST "${BASE_URL}/api/onboard/complete" \
  -H "Content-Type: application/json" \
  -d '{}')
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Correctly rejected: $(echo $response | jq -r '.error')"
else
  echo -e "  ${RED}✗${NC} Should have rejected missing FID"
fi

echo -e "\n${BOLD}🎉 Test Suite Complete!${NC}\n"
