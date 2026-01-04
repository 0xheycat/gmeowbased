#!/usr/bin/env bash
#
# Phase 8.4.1 Master Test Runner
# 
# Executes all automated tests for cache invalidation integration.
# Combines API tests, batch tests, and performance validation.
#
# Prerequisites:
# - Dev server running on localhost:3000 (pnpm dev)
# - jq installed (for JSON parsing)
# - Node.js installed (for JavaScript tests)
#
# Usage: ./scripts/run-all-tests.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Phase 8.4.1 Automated Test Suite            ║${NC}"
echo -e "${BLUE}║   Cache Invalidation Integration Tests        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}[SETUP]${NC} Checking prerequisites..."
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} jq is not installed. Please install: sudo apt install jq"
        exit 1
    fi
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Node.js is not installed"
        exit 1
    fi
    
    # Check if dev server is running
    if ! curl -s -f "$BASE_URL" > /dev/null 2>&1; then
        echo -e "${RED}[ERROR]${NC} Dev server is not running at $BASE_URL"
        echo -e "${YELLOW}[INFO]${NC} Please start with: pnpm dev"
        exit 1
    fi
    
    echo -e "${GREEN}[PASS]${NC} All prerequisites met"
    echo ""
}

# Run test suite
run_test_suite() {
    local test_name=$1
    local test_script=$2
    
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $test_name${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    if [ -f "$test_script" ]; then
        if bash "$test_script"; then
            echo -e "${GREEN}✓ $test_name completed successfully${NC}"
            return 0
        else
            echo -e "${RED}✗ $test_name failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}[ERROR]${NC} Test script not found: $test_script"
        return 1
    fi
}

run_node_test_suite() {
    local test_name=$1
    local test_script=$2
    
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $test_name${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    if [ -f "$test_script" ]; then
        if node "$test_script"; then
            echo -e "${GREEN}✓ $test_name completed successfully${NC}"
            return 0
        else
            echo -e "${RED}✗ $test_name failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}[ERROR]${NC} Test script not found: $test_script"
        return 1
    fi
}

# Main execution
main() {
    check_prerequisites
    
    local failed_tests=0
    
    # Test Suite 1: API Endpoint Tests
    if ! run_test_suite "API Endpoint Tests" "$SCRIPT_DIR/test-cache-invalidation.sh"; then
        ((failed_tests++))
    fi
    
    echo ""
    
    # Test Suite 2: Batch Invalidation Tests
    if ! run_node_test_suite "Batch Invalidation Tests" "$SCRIPT_DIR/test-batch-invalidation.js"; then
        ((failed_tests++))
    fi
    
    echo ""
    
    # Final Summary
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Test Execution Summary                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}✓ All test suites passed!${NC}"
        echo ""
        echo "Phase 8.4.1 cache invalidation integration is working correctly."
        echo "Ready for production deployment."
        echo ""
        exit 0
    else
        echo -e "${RED}✗ $failed_tests test suite(s) failed${NC}"
        echo ""
        echo "Please review the errors above and fix the issues."
        echo ""
        exit 1
    fi
}

# Run main function
main
