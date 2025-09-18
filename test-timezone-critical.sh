#!/bin/bash

# Critical Timezone Conversion Test Runner
# This script runs the essential timezone tests to ensure the traffic data
# export functionality continues to work correctly.

echo "🕐 Running Critical Timezone Conversion Tests..."
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ℹ️  These tests verify that the 'very very backwards' traffic pattern bug stays fixed${NC}"
echo -e "${BLUE}ℹ️  Key validation: August 1st midnight Tokyo → Record ID 35976${NC}"
echo ""

# Run the core timezone conversion tests
echo -e "${YELLOW}1. Running Core Timezone Conversion Tests...${NC}"
pnpm vitest run src/lib/tests/DeviceDataService.timezone.test.ts --reporter=verbose

TIMEZONE_EXIT_CODE=$?

# Run the integration tests (database queries)
echo ""
echo -e "${YELLOW}2. Running Traffic Data Integration Tests...${NC}"
pnpm vitest run src/lib/tests/TrafficDataIntegration.test.ts --reporter=verbose

INTEGRATION_EXIT_CODE=$?

# Run the CSV logic tests (skip API tests that require auth)
echo ""
echo -e "${YELLOW}3. Running CSV Generation Logic Tests...${NC}"
pnpm vitest run src/lib/tests/CSVExportValidation.test.ts --testNamePattern="CSV Generation Logic Tests" --reporter=verbose

CSV_EXIT_CODE=$?

echo ""
echo "================================================"

# Summary
if [ $TIMEZONE_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ] && [ $CSV_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CRITICAL TIMEZONE TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Traffic data export timezone conversion is working correctly${NC}"
    echo -e "${GREEN}✅ August 1st midnight Tokyo correctly converts to July 31st 3PM UTC${NC}"
    echo -e "${GREEN}✅ No 'backwards' traffic patterns detected${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME CRITICAL TESTS FAILED!${NC}"
    echo -e "${RED}❌ Please review the timezone conversion logic${NC}"
    
    if [ $TIMEZONE_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}   - Core timezone conversion tests failed${NC}"
    fi
    
    if [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}   - Database integration tests failed${NC}"
    fi
    
    if [ $CSV_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}   - CSV generation tests failed${NC}"
    fi
    
    exit 1
fi