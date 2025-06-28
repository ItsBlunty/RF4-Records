# Top Baits Date Range Debug Script

## Overview

The `debug_top_baits_dates.py` script helps diagnose issues with the Top Baits feature where users see "no data" in certain date ranges (like "Last Reset" period).

## What it does

1. **Calculates Reset Dates**: Shows exactly what date ranges Top Baits is using for each period
2. **Database Analysis**: Counts how many records exist in each date range
3. **Sample Data**: Shows sample records from each period to verify data exists
4. **Timezone Validation**: Checks for timezone-related issues
5. **Environment Check**: Verifies database connection and environment variables

## Usage

### Basic Usage (Local Development)
```bash
python debug_top_baits_dates.py
```

### Help
```bash
python debug_top_baits_dates.py --help
```

### Production Database Debugging
```bash
# Option 1: Set environment variable
export DATABASE_URL='postgresql://user:pass@host:port/database'
python debug_top_baits_dates.py

# Option 2: Run directly on production server
# (where DATABASE_URL is already set)
python debug_top_baits_dates.py
```

## Common Issues the Script Identifies

### 1. Empty Database
**Symptom**: Total records = 0
**Solution**: Import data or connect to correct database

### 2. Wrong Database Connection
**Symptom**: Local SQLite database when expecting production data
**Solution**: Set `DATABASE_URL` environment variable

### 3. Date Calculation Issues
**Symptom**: Reset dates don't fall on Sundays or seem incorrect
**Solution**: Check timezone settings and date calculation logic

### 4. Data Freshness Issues
**Symptom**: Newest records are days/weeks old
**Solution**: Check data import/sync process

### 5. Timezone Mismatches
**Symptom**: Records exist but don't appear in expected date ranges
**Solution**: Verify timezone handling in created_at fields

## Output Explanation

### Date Ranges
- **This Week (Last Reset)**: From most recent Sunday 6PM UTC to present
- **Last Week**: From previous Sunday 6PM UTC to most recent Sunday 6PM UTC  
- **Three Weeks Ago**: Two weeks before that

### Record Counts
- ✅ **Good**: Hundreds or thousands of records in each period
- 🟡 **Warning**: Very few records (might be normal for recent periods)
- 🔴 **Problem**: Zero records (indicates database or date issues)

### Sample Records
Shows actual database records with creation timestamps to verify data exists and dates are correct.

## Production Debugging Steps

1. **Run script locally first** to understand the date ranges being used
2. **Connect to production database** using DATABASE_URL environment variable
3. **Compare results** - if production has data but local doesn't, it's a connection issue
4. **Check data freshness** - if newest records are old, it's a data sync issue
5. **Verify timezone handling** - if dates seem off, it's likely timezone-related

## Files Used

- `debug_top_baits_dates.py` - Main debug script
- `simplified_records.py` - Date calculation functions
- `database.py` - Database connection and Record model

## Example Output

```
============================================================
  DATABASE RECORD ANALYSIS
============================================================
Total records in database: 15,432

Oldest record: 2025-01-01 08:15:23 UTC
Newest record: 2025-06-27 14:22:11 UTC

============================================================
  RECORDS COUNT BY PERIOD
============================================================
This Week (Last Reset): 1,234 records
  ✅ Good number of records in this period.
Last Week: 2,156 records  
  ✅ Good number of records in this period.
Three Weeks Ago: 1,987 records
  ✅ Good number of records in this period.
```

This output shows a healthy database with good data distribution across all periods.