#!/usr/bin/env python3
"""
Debug script for Top Baits date range issue.
This script analyzes the date ranges and record counts to identify why
users see no data in "Last Reset" period.
"""

from database import Record, SessionLocal
from optimized_records import (
    get_last_record_reset_date,
    get_two_resets_ago_date,
    get_three_resets_ago_date,
    get_four_resets_ago_date,
)
from datetime import datetime, timezone
import sys
import os


def print_separator(title=""):
    """Print a nice separator line"""
    if title:
        print(f"\n{'=' * 60}")
        print(f"  {title}")
        print(f"{'=' * 60}")
    else:
        print("-" * 60)


def format_datetime(dt):
    """Format datetime for display"""
    if dt is None:
        return "None"
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC")


def get_sample_records(db, start_date, end_date=None, limit=3):
    """Get sample records from a date range"""
    query = db.query(Record).filter(Record.created_at >= start_date)
    if end_date:
        query = query.filter(Record.created_at < end_date)

    records = query.order_by(Record.created_at.desc()).limit(limit).all()

    samples = []
    for record in records:
        samples.append(
            {
                "id": record.id,
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "date": record.date,
                "created_at": record.created_at,
            }
        )

    return samples


def main():
    print_separator("TOP BAITS DATE RANGE DEBUGGER")
    print("This script analyzes the date ranges used by Top Baits feature")
    print("to identify why users might see no data in certain periods.")

    # Show database connection info
    from database import get_database_url

    db_url = get_database_url()
    print(f"\n🗄️  Database URL: {db_url}")

    if "sqlite" in db_url.lower():
        print("📝 NOTE: This is a local SQLite database.")
        print("   To debug production issues, you may need to:")
        print("   1. Set DATABASE_URL environment variable to production database")
        print("   2. Or copy production database locally")
        print("   3. Or run this script on the production server")
    elif "postgres" in db_url.lower():
        print("🐘 Connected to PostgreSQL database")

    # Show relevant environment variables
    print("\n🔧 Environment Variables:")
    env_vars = ["DATABASE_URL", "POSTGRES_URL", "RAILWAY_VOLUME_MOUNT_PATH"]
    for var in env_vars:
        value = os.environ.get(var)
        if value:
            # Mask sensitive parts of database URLs
            if "postgres" in value.lower() and "@" in value:
                # Hide password in postgres URLs
                masked = value.split("@")[0].split(":")[:-1]
                masked.append("***@" + value.split("@")[1])
                print(f"   {var}: {':'.join(masked)}")
            else:
                print(f"   {var}: {value}")
        else:
            print(f"   {var}: (not set)")

    # Connect to database
    db = SessionLocal()

    try:
        # Current time
        now = datetime.now(timezone.utc)
        print(f"\nCurrent UTC time: {format_datetime(now)}")

        print_separator("CALCULATING RESET DATES")

        # Calculate all reset dates
        last_reset = get_last_record_reset_date()
        two_resets_ago = get_two_resets_ago_date()
        three_resets_ago = get_three_resets_ago_date()
        four_resets_ago = get_four_resets_ago_date()

        print(f"Last Reset (This Week):     {format_datetime(last_reset)}")
        print(f"Two Resets Ago (Last Week): {format_datetime(two_resets_ago)}")
        print(f"Three Resets Ago:           {format_datetime(three_resets_ago)}")
        print(f"Four Resets Ago:            {format_datetime(four_resets_ago)}")

        # Show what day of week each reset is
        print(f"\nDay of week verification:")
        print(f"Last Reset day:       {last_reset.strftime('%A')}")
        print(f"Two Resets Ago day:   {two_resets_ago.strftime('%A')}")
        print(f"Three Resets Ago day: {three_resets_ago.strftime('%A')}")

        print_separator("DATE RANGE DEFINITIONS")

        # Define the periods as used by Top Baits
        periods = {
            "This Week (Last Reset)": (last_reset, None),
            "Last Week": (two_resets_ago, last_reset),
            "Three Weeks Ago": (three_resets_ago, two_resets_ago),
        }

        for period_name, (start_date, end_date) in periods.items():
            if end_date:
                print(f"{period_name}:")
                print(f"  From: {format_datetime(start_date)}")
                print(f"  To:   {format_datetime(end_date)}")
                print(f"  Duration: {(end_date - start_date).days} days")
            else:
                print(f"{period_name}:")
                print(f"  From: {format_datetime(start_date)}")
                print(f"  To:   Present")
                print(f"  Duration: {(now - start_date).days} days so far")
            print()

        print_separator("DATABASE RECORD ANALYSIS")

        # Get overall database stats
        total_records = db.query(Record).count()
        print(f"Total records in database: {total_records:,}")

        if total_records == 0:
            print("\n❌ DATABASE IS EMPTY!")
            print("   This explains why Top Baits shows no data.")
            print("   The database either:")
            print("   1. Has no records imported yet")
            print("   2. Is the wrong database (not production)")
            print("   3. Has connection issues")
            print("\n🔧 TO FIX:")
            print(
                "   - If this is local development: Import data or connect to production DB"
            )
            print("   - If this is production: Check data import process")
            print("   - Verify DATABASE_URL environment variable")
            return 0

        # Get oldest and newest records
        oldest_record = db.query(Record).order_by(Record.created_at.asc()).first()
        newest_record = db.query(Record).order_by(Record.created_at.desc()).first()

        if oldest_record:
            print(f"Oldest record: {format_datetime(oldest_record.created_at)}")
        if newest_record:
            print(f"Newest record: {format_datetime(newest_record.created_at)}")

        # Show data distribution by week
        print(
            f"\nData span: {(newest_record.created_at - oldest_record.created_at).days} days"
        )

        print_separator("RECORDS COUNT BY PERIOD")

        # Count records in each period
        for period_name, (start_date, end_date) in periods.items():
            query = db.query(Record).filter(Record.created_at >= start_date)
            if end_date:
                query = query.filter(Record.created_at < end_date)

            count = query.count()
            print(f"{period_name}: {count:,} records")

            if count == 0:
                print(
                    f"  ⚠️  NO RECORDS FOUND IN THIS PERIOD! This is likely the issue."
                )
            elif count < 10:
                print(f"  ⚠️  Very few records in this period - might be an issue.")
            else:
                print(f"  ✅ Good number of records in this period.")

        print_separator("SAMPLE RECORDS FROM EACH PERIOD")

        # Get sample records from each period
        for period_name, (start_date, end_date) in periods.items():
            print(f"\n{period_name}:")
            samples = get_sample_records(db, start_date, end_date, limit=3)

            if not samples:
                print("  No records found in this period!")
            else:
                print(f"  Found {len(samples)} sample records:")
                for i, record in enumerate(samples, 1):
                    print(
                        f"    {i}. ID:{record['id']} | {record['player']} | {record['fish']} | "
                        f"{record['weight']}g | {record['waterbody']} | "
                        f"Created: {format_datetime(record['created_at'])}"
                    )

        print_separator("ADDITIONAL DIAGNOSTICS")

        # Check for records around the reset boundaries
        print("Records around reset boundaries:")

        boundary_checks = [
            ("2 hours before last reset", last_reset, -2),
            ("2 hours after last reset", last_reset, 2),
            ("2 hours before two resets ago", two_resets_ago, -2),
            ("2 hours after two resets ago", two_resets_ago, 2),
        ]

        for check_name, base_date, hours_offset in boundary_checks:
            from datetime import timedelta

            check_start = base_date + timedelta(hours=hours_offset - 1)
            check_end = base_date + timedelta(hours=hours_offset + 1)

            count = (
                db.query(Record)
                .filter(
                    Record.created_at >= check_start, Record.created_at <= check_end
                )
                .count()
            )

            print(f"{check_name}: {count} records")
            print(
                f"  Time range: {format_datetime(check_start)} to {format_datetime(check_end)}"
            )

        print_separator("TIMEZONE INVESTIGATION")

        # Check if there are timezone issues
        print("Investigating potential timezone issues...")

        # Get a few recent records and check their created_at values
        recent_records = (
            db.query(Record).order_by(Record.created_at.desc()).limit(5).all()
        )

        print("Recent records with timezone info:")
        for record in recent_records:
            created_at = record.created_at
            tz_info = "UTC" if created_at.tzinfo else "No timezone (naive)"
            print(f"  ID {record.id}: {format_datetime(created_at)} ({tz_info})")

        print_separator("SUMMARY AND RECOMMENDATIONS")

        # Provide recommendations based on findings
        print("Analysis Summary:")

        # Check if "This Week" period has records
        this_week_count = (
            db.query(Record).filter(Record.created_at >= last_reset).count()
        )
        last_week_count = (
            db.query(Record)
            .filter(Record.created_at >= two_resets_ago, Record.created_at < last_reset)
            .count()
        )

        if this_week_count == 0:
            print("🔴 ISSUE IDENTIFIED: No records in 'This Week' period")
            print("   - This suggests the last_reset date is too recent")
            print("   - Or there's a timezone mismatch")
            print("   - Check if Sunday 6PM UTC calculation is correct")
        elif this_week_count < 50:
            print("🟡 POTENTIAL ISSUE: Very few records in 'This Week' period")
            print(f"   - Only {this_week_count} records found")
            print("   - This might be expected if it's early in the week")
        else:
            print("✅ 'This Week' period looks good")

        if last_week_count == 0:
            print("🔴 ISSUE IDENTIFIED: No records in 'Last Week' period")
            print("   - This suggests date calculation issues")
            print("   - Or the database doesn't have data from that period")
        else:
            print("✅ 'Last Week' period looks good")

        # Check data freshness
        if newest_record:
            hours_since_newest = (now - newest_record.created_at).total_seconds() / 3600
            if hours_since_newest > 24:
                print(
                    f"⚠️  Data freshness issue: Newest record is {hours_since_newest:.1f} hours old"
                )
                print("   - This might explain why recent periods have no data")
            else:
                print(
                    f"✅ Data is fresh: Newest record is {hours_since_newest:.1f} hours old"
                )

        print(f"\nTotal records analyzed: {total_records:,}")
        print("Debug analysis complete!")

    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback

        traceback.print_exc()
        return 1

    finally:
        db.close()

    return 0


if __name__ == "__main__":
    # Check for help argument
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help", "help"]:
        print("TOP BAITS DATE RANGE DEBUGGER")
        print("=============================")
        print("\nUsage:")
        print(
            "  python debug_top_baits_dates.py              # Debug with current database"
        )
        print("  python debug_top_baits_dates.py --help       # Show this help")
        print("\nTo debug production database:")
        print("  1. Set environment variable:")
        print("     export DATABASE_URL='postgresql://user:pass@host:port/db'")
        print("  2. Run script:")
        print("     python debug_top_baits_dates.py")
        print(
            "\nOr run directly on production server where DATABASE_URL is already set."
        )
        print()
        sys.exit(0)

    sys.exit(main())
