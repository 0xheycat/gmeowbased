#!/usr/bin/env bash
# Device Testing Script
# Runs Playwright tests across all configured devices

set -e

echo "🧪 Gmeowbased Device Testing Suite"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
TEST_TYPE=${1:-all}
HEADED=${2:-false}

# Function to run tests for a device category
run_device_tests() {
  local device=$1
  local name=$2
  
  echo -e "${BLUE}Testing on $name...${NC}"
  
  if [ "$HEADED" = "--headed" ]; then
    pnpm exec playwright test --project="$device" --headed
  else
    pnpm exec playwright test --project="$device"
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $name tests passed${NC}"
  else
    echo -e "${RED}✗ $name tests failed${NC}"
    exit 1
  fi
  echo ""
}

# Main test execution
case $TEST_TYPE in
  desktop)
    echo -e "${YELLOW}Running Desktop Tests${NC}"
    echo ""
    run_device_tests "chromium" "Desktop Chrome"
    run_device_tests "firefox" "Desktop Firefox"
    run_device_tests "webkit" "Desktop Safari"
    ;;
    
  tablet)
    echo -e "${YELLOW}Running Tablet Tests${NC}"
    echo ""
    run_device_tests "tablet-ipad" "iPad Pro"
    run_device_tests "tablet-android" "Galaxy Tab S4"
    ;;
    
  mobile)
    echo -e "${YELLOW}Running Mobile Tests${NC}"
    echo ""
    run_device_tests "mobile-iphone-12" "iPhone 12"
    run_device_tests "mobile-iphone-se" "iPhone SE"
    run_device_tests "mobile-pixel-5" "Pixel 5"
    run_device_tests "mobile-small" "Small Mobile"
    ;;
    
  ios)
    echo -e "${YELLOW}Running iOS Device Tests${NC}"
    echo ""
    run_device_tests "mobile-iphone-12" "iPhone 12"
    run_device_tests "mobile-iphone-se" "iPhone SE"
    run_device_tests "mobile-iphone-14-pro" "iPhone 14 Pro Max"
    ;;
    
  android)
    echo -e "${YELLOW}Running Android Device Tests${NC}"
    echo ""
    run_device_tests "mobile-pixel-5" "Pixel 5"
    run_device_tests "mobile-galaxy-s9" "Galaxy S9+"
    ;;
    
  all)
    echo -e "${YELLOW}Running Full Device Test Suite${NC}"
    echo ""
    
    echo "📱 Desktop Browsers..."
    run_device_tests "chromium" "Desktop Chrome"
    run_device_tests "firefox" "Desktop Firefox"
    run_device_tests "webkit" "Desktop Safari"
    
    echo "📱 Tablets..."
    run_device_tests "tablet-ipad" "iPad Pro"
    
    echo "📱 Mobile Devices..."
    run_device_tests "mobile-iphone-12" "iPhone 12"
    run_device_tests "mobile-pixel-5" "Pixel 5"
    run_device_tests "mobile-small" "Small Mobile"
    ;;
    
  quick)
    echo -e "${YELLOW}Running Quick Device Test (Representative Sample)${NC}"
    echo ""
    run_device_tests "chromium" "Desktop Chrome"
    run_device_tests "mobile-iphone-12" "iPhone 12"
    ;;
    
  *)
    echo -e "${RED}Invalid test type: $TEST_TYPE${NC}"
    echo ""
    echo "Usage: ./test-devices.sh [type] [--headed]"
    echo ""
    echo "Test types:"
    echo "  all      - Run all device tests (default)"
    echo "  desktop  - Desktop browsers only"
    echo "  tablet   - Tablet devices only"
    echo "  mobile   - All mobile devices"
    echo "  ios      - iOS devices only"
    echo "  android  - Android devices only"
    echo "  quick    - Quick smoke test (Chrome + iPhone)"
    echo ""
    echo "Options:"
    echo "  --headed - Run tests in headed mode (visible browser)"
    echo ""
    echo "Examples:"
    echo "  ./test-devices.sh mobile"
    echo "  ./test-devices.sh desktop --headed"
    echo "  ./test-devices.sh quick"
    exit 1
    ;;
esac

echo -e "${GREEN}✓ All device tests completed successfully!${NC}"
echo ""
echo "📊 View detailed report:"
echo "   pnpm test:e2e:report"
