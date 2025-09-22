# 🕐 Critical Timezone Conversion Tests

This directory contains comprehensive tests to ensure the timezone conversion functionality for traffic data export remains working correctly. These tests prevent regression of the "very very backwards" traffic patterns bug.

## 🎯 Critical Validation

The key requirement verified by these tests:
- **August 1st midnight Tokyo time** should convert to **July 31st 3:00 PM UTC**
- This specific conversion returns **Record ID 35976** in the production database
- Traffic patterns should be realistic (high during day, low at night) - NOT backwards

## 📋 Test Files

### 1. `DeviceDataService.timezone.test.ts` - Core Unit Tests
- Tests `convertUserTimezoneToUTC()` and `convertUTCToUserTimezone()` methods
- Validates the critical August 1st midnight Tokyo → July 31st 3PM UTC conversion
- Tests edge cases: DST transitions, leap years, year boundaries
- Validates round-trip conversion accuracy
- **Key Test**: `should convert August 1st midnight Tokyo to July 31st 3PM UTC (CRITICAL TEST)`

### 2. `TrafficDataIntegration.test.ts` - Database Integration Tests
- Tests complete flow from date range input to database query results
- Validates that Record ID 35976 is found for August 1st midnight Tokyo
- Confirms 744 records exist for full August 2025 (31 days × 24 hours)
- Verifies realistic traffic patterns (day > night traffic)
- Tests data completeness and quality
- **Key Test**: `should find record ID 35976 for August 1st midnight Tokyo (CRITICAL TEST)`

### 3. `CSVExportValidation.test.ts` - CSV Format Tests
- Tests CSV export formatting and content
- Validates timezone formatting in CSV output
- Confirms realistic traffic patterns in CSV data
- Tests CSV structure and completeness
- Includes mock tests that work without a running server
- **Key Test**: CSV generation logic for timezone conversion

## 🚀 Running the Tests

### Quick Critical Test Run
```bash
# Run just the essential timezone tests
./test-timezone-critical.sh
```

### Individual Test Files
```bash
# Core timezone conversion logic
pnpm vitest run src/lib/tests/DeviceDataService.timezone.test.ts

# Database integration validation
pnpm vitest run src/lib/tests/TrafficDataIntegration.test.ts

# CSV export formatting
pnpm vitest run src/lib/tests/CSVExportValidation.test.ts
```

### All Unit Tests
```bash
pnpm test:unit
```

## ✅ Success Criteria

The tests confirm the fix is working when:

1. **Core Conversion**: August 1st midnight Tokyo converts to July 31st 3PM UTC
2. **Database Verification**: Record ID 35976 is found for the correct timestamp
3. **Data Quality**: Day traffic > night traffic (realistic patterns)
4. **CSV Format**: Proper timezone formatting in exports
5. **Completeness**: Full month of data available (744 records for August)

## 🔧 Test Results

Recent test run confirms:
- ✅ **16 timezone conversion tests** - All critical tests passing
- ✅ **5 integration tests** - Database queries working correctly
- ✅ **Record ID 35976** found for August 1st midnight Tokyo
- ✅ **744 records** for complete August 2025 dataset
- ✅ **Realistic traffic patterns** - Day: 2875, Night: 37 (correct ratio)
- ✅ **100% data completeness** for the test month

## 🛡️ Preventing Regression

These tests serve as a safety net to ensure:
- Future code changes don't break timezone conversion
- The "backwards traffic pattern" bug doesn't return
- CSV exports continue showing correct timestamps
- Database queries use proper UTC conversion
- API endpoints maintain timezone awareness

## 📊 Key Test Data Points

- **Device EUI**: `110110145241600107`
- **Critical Record ID**: `35976`
- **Critical Timestamp**: August 1st 2025 00:00:00 Tokyo → July 31st 2025 15:00:00 UTC
- **Expected Traffic**: 0 people, 6 cars, 1 truck (realistic midnight data)
- **Test Timezone**: `Asia/Tokyo` (UTC+9)

Run these tests regularly to ensure the timezone conversion logic remains robust and accurate!