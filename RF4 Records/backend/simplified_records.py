#!/usr/bin/env python3
"""
Simplified record loading functions for post-migration database.
No deduplication needed since records are already merged with combined categories.
"""

from database import Record, SessionLocal
from bait_utils import normalize_bait_display, get_normalized_bait_for_filtering
from datetime import datetime, timedelta, timezone
import logging
import time

logger = logging.getLogger(__name__)


def get_last_record_reset_date():
    """Calculate the last record reset date (previous Sunday at 6PM UTC)"""
    now = datetime.now(timezone.utc)
    current_day = now.weekday()  # 0 = Monday, 6 = Sunday
    current_hour = now.hour

    # Convert to Sunday-based system (0 = Sunday)
    sunday_day = (current_day + 1) % 7

    # Calculate days to subtract to get to the most recent Sunday 6PM UTC
    if sunday_day == 0:  # Sunday
        if current_hour >= 18:  # 6PM or later today
            days_to_subtract = 0
        else:
            days_to_subtract = 7  # Use last Sunday
    else:
        days_to_subtract = sunday_day

    last_reset = now - timedelta(days=days_to_subtract)
    last_reset = last_reset.replace(hour=18, minute=0, second=0, microsecond=0)

    return last_reset


def get_two_resets_ago_date():
    """Calculate the reset date from two resets ago (two weeks before last reset)"""
    last_reset = get_last_record_reset_date()
    two_resets_ago = last_reset - timedelta(days=7)  # Go back one more week

    return two_resets_ago


def get_three_resets_ago_date():
    """Calculate the reset date from three resets ago (three weeks before last reset)"""
    last_reset = get_last_record_reset_date()
    three_resets_ago = last_reset - timedelta(days=14)  # Go back two more weeks

    return three_resets_ago


def get_four_resets_ago_date():
    """Calculate the reset date from four resets ago (four weeks before last reset)"""
    last_reset = get_last_record_reset_date()
    four_resets_ago = last_reset - timedelta(days=21)  # Go back three more weeks

    return four_resets_ago


def get_recent_records_simple(limit: int = 1000):
    """Get recent records since last reset - SPEED OPTIMIZED for initial load"""
    db = SessionLocal()

    try:
        last_reset = get_last_record_reset_date()

        # Get ALL recent records since last reset (not limited)
        all_recent_records = (
            db.query(Record)
            .filter(Record.created_at >= last_reset)
            .order_by(Record.id.desc())
            .all()
        )

        # Get actual counts
        recent_count = len(all_recent_records)
        total_records = db.query(Record).count()

        # Limit for initial display but return actual count
        recent_records = (
            all_recent_records[:limit]
            if len(all_recent_records) > limit
            else all_recent_records
        )

        result = []
        fish_set = set()
        waterbody_set = set()
        bait_set = set()

        for record in recent_records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "trophy_class": record.trophy_class,
                }
            )

            # OPTIMIZATION: Build unique values during main loop (faster)
            if record.fish:
                fish_set.add(record.fish)
            if record.waterbody:
                waterbody_set.add(record.waterbody)
            if bait_display:
                bait_set.add(bait_display)

        db.close()

        return {
            "records": result,
            "recent_count": recent_count,  # Actual count of recent records
            "total_records": total_records,
            "showing_recent_only": True,
            "showing_limited": len(recent_records)
            < recent_count,  # True if we're showing limited subset
            "has_older_records": recent_count < total_records,
            "last_reset_date": last_reset.isoformat(),
            "unique_values": {
                "fish": sorted(list(fish_set)),
                "waterbody": sorted(list(waterbody_set)),
                "bait": sorted(list(bait_set)),
            },
        }

    except Exception as e:
        logger.error(f"Error retrieving recent records: {e}")
        db.close()
        raise


def get_all_recent_records_simple():
    """Get ALL recent records since last reset (no limit) for when user filters by since-reset"""
    start_time = time.time()
    db = SessionLocal()

    try:
        # Timer: Reset date calculation
        reset_start = time.time()
        last_reset = get_last_record_reset_date()
        reset_time = time.time() - reset_start

        # Timer: Database query for recent records
        query_start = time.time()
        recent_records = (
            db.query(Record)
            .filter(Record.created_at >= last_reset)
            .order_by(Record.id.desc())
            .all()
        )
        query_time = time.time() - query_start

        # Timer: Total count query
        count_start = time.time()
        total_records = db.query(Record).count()
        count_time = time.time() - count_start

        recent_count = len(recent_records)

        # Timer: Data processing
        process_start = time.time()
        result = []
        fish_set = set()
        waterbody_set = set()
        bait_set = set()

        for record in recent_records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "trophy_class": record.trophy_class,
                }
            )

            # Build unique values during main loop
            if record.fish:
                fish_set.add(record.fish)
            if record.waterbody:
                waterbody_set.add(record.waterbody)
            if bait_display:
                bait_set.add(bait_display)

        process_time = time.time() - process_start

        # Timer: Unique values sorting
        sort_start = time.time()
        unique_values = {
            "fish": sorted(list(fish_set)),
            "waterbody": sorted(list(waterbody_set)),
            "bait": sorted(list(bait_set)),
        }
        sort_time = time.time() - sort_start

        total_time = time.time() - start_time

        # Log performance metrics
        logger.info(f"📊 Recent Records Performance:")
        logger.info(f"  Reset date calc: {reset_time:.3f}s")
        logger.info(f"  DB query ({recent_count} records): {query_time:.3f}s")
        logger.info(f"  Total count query: {count_time:.3f}s")
        logger.info(f"  Data processing: {process_time:.3f}s")
        logger.info(f"  Unique values sorting: {sort_time:.3f}s")
        logger.info(f"  TOTAL TIME: {total_time:.3f}s")
        logger.info(f"  Performance: {recent_count / total_time:.0f} records/second")

        db.close()

        return {
            "records": result,
            "recent_count": recent_count,
            "total_records": total_records,
            "showing_all_recent": True,
            "has_older_records": recent_count < total_records,
            "last_reset_date": last_reset.isoformat(),
            "unique_values": unique_values,
            "performance": {
                "total_time": round(total_time, 3),
                "query_time": round(query_time, 3),
                "process_time": round(process_time, 3),
                "records_per_second": round(recent_count / total_time, 0),
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(
            f"Error retrieving all recent records after {total_time:.3f}s: {e}"
        )
        db.close()
        raise


def get_older_records_simple():
    """Get all older records (before last reset) for background loading"""
    start_time = time.time()
    db = SessionLocal()

    try:
        # Timer: Reset date calculation
        reset_start = time.time()
        last_reset = get_last_record_reset_date()
        reset_time = time.time() - reset_start

        # Timer: Database query for older records
        query_start = time.time()
        older_records = (
            db.query(Record)
            .filter(Record.created_at < last_reset)
            .order_by(Record.created_at.desc())
            .all()
        )
        query_time = time.time() - query_start

        # Timer: Data processing
        process_start = time.time()
        result = []
        for record in older_records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "trophy_class": record.trophy_class,
                }
            )
        process_time = time.time() - process_start

        # Timer: Unique values calculation (reuse same query results)
        unique_start = time.time()
        fish = sorted(list(set(r.fish for r in older_records if r.fish)))
        waterbody = sorted(list(set(r.waterbody for r in older_records if r.waterbody)))

        bait_set = set()
        for r in older_records:
            bait_display = normalize_bait_display(r.bait1, r.bait2, r.bait)
            if bait_display:
                bait_set.add(bait_display)
        bait = sorted(list(bait_set))
        unique_time = time.time() - unique_start

        total_time = time.time() - start_time
        older_count = len(result)

        # Log performance metrics
        logger.info(f"📊 Older Records Performance:")
        logger.info(f"  Reset date calc: {reset_time:.3f}s")
        logger.info(f"  DB query ({older_count} records): {query_time:.3f}s")
        logger.info(f"  Data processing: {process_time:.3f}s")
        logger.info(f"  Unique values calc: {unique_time:.3f}s")
        logger.info(f"  TOTAL TIME: {total_time:.3f}s")
        if older_count > 0:
            logger.info(f"  Performance: {older_count / total_time:.0f} records/second")

        db.close()

        return {
            "records": result,
            "older_count": older_count,
            "showing_older_only": True,
            "unique_values": {"fish": fish, "waterbody": waterbody, "bait": bait},
            "performance": {
                "total_time": round(total_time, 3),
                "query_time": round(query_time, 3),
                "process_time": round(process_time, 3),
                "records_per_second": round(older_count / total_time, 0)
                if older_count > 0
                else 0,
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving older records after {total_time:.3f}s: {e}")
        db.close()
        raise


def get_all_records_simple():
    """Get all records from database - no deduplication needed after migration"""
    db = SessionLocal()

    try:
        # Simply get all records - no grouping or deduplication needed!
        records = db.query(Record).all()

        result = []
        for record in records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories back to list format for frontend compatibility
            if record.category and ";" in record.category:
                # Combined categories like "N;U;L" -> ["N", "U", "L"]
                categories = record.category.split(";")
            else:
                # Single category like "N" -> ["N"]
                categories = [record.category] if record.category else ["N"]

            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,  # Parsed from combined category field
                }
            )

        db.close()
        return result, len(records)

    except Exception as e:
        logger.error(f"Error retrieving simplified records: {e}")
        db.close()
        raise


def get_initial_records_simple(limit: int = 1000):
    """Get initial batch of records - much simpler after migration"""
    db = SessionLocal()

    try:
        # Get recent records directly - no deduplication needed!
        records = db.query(Record).order_by(Record.id.desc()).limit(limit).all()

        result = []
        for record in records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                }
            )

        # Get total count
        total_records = db.query(Record).count()

        # Get unique values for filters
        fish = sorted(list(set(r["fish"] for r in result if r["fish"])))
        waterbody = sorted(list(set(r["waterbody"] for r in result if r["waterbody"])))
        bait = sorted(list(set(r["bait_display"] for r in result if r["bait_display"])))

        db.close()

        return {
            "records": result,
            "total_unique_records": total_records,  # Now same as total since no duplicates
            "total_db_records": total_records,
            "has_more": len(result) < total_records,
            "unique_values": {"fish": fish, "waterbody": waterbody, "bait": bait},
        }

    except Exception as e:
        logger.error(f"Error retrieving initial simplified records: {e}")
        db.close()
        raise


def get_remaining_records_simple(skip: int = 1000):
    """Get remaining records after initial batch - OPTIMIZED VERSION"""
    db = SessionLocal()

    try:
        # OPTIMIZATION: Single query to get ALL records, then slice in Python
        # This eliminates the double database query bottleneck
        all_records = db.query(Record).order_by(Record.id.desc()).all()

        # Get remaining records by slicing (much faster than second DB query)
        remaining_records = all_records[skip:]

        result = []
        for record in remaining_records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                }
            )

        # OPTIMIZATION: Get unique values from already-loaded records (no extra queries)
        fish = sorted(list(set(r.fish for r in all_records if r.fish)))
        waterbody = sorted(list(set(r.waterbody for r in all_records if r.waterbody)))

        # For bait, we need to format them
        bait_set = set()
        for r in all_records:
            bait_display = normalize_bait_display(r.bait1, r.bait2, r.bait)
            if bait_display:
                bait_set.add(bait_display)
        bait = sorted(list(bait_set))

        total_records = len(all_records)

        db.close()

        return {
            "records": result,
            "total_unique_records": total_records,
            "total_db_records": total_records,
            "unique_values": {"fish": fish, "waterbody": waterbody, "bait": bait},
        }

    except Exception as e:
        logger.error(f"Error retrieving remaining simplified records: {e}")
        db.close()
        raise


def get_filtered_records(
    fish=None, waterbody=None, bait=None, data_age=None, limit=None, offset=None
):
    """Get filtered records from database based on criteria"""
    start_time = time.time()
    db = SessionLocal()

    try:
        # Start with base query
        query = db.query(Record)

        # Apply fish filter (support multiple values)
        if fish:
            if isinstance(fish, list):
                # Multiple fish - use OR condition
                from sqlalchemy import or_

                fish_conditions = [
                    Record.fish.ilike(f"%{f.strip()}%") for f in fish if f.strip()
                ]
                if fish_conditions:
                    query = query.filter(or_(*fish_conditions))
            else:
                # Single fish (backward compatibility)
                query = query.filter(Record.fish.ilike(f"%{fish}%"))

        # Apply waterbody filter (support multiple values)
        if waterbody:
            if isinstance(waterbody, list):
                # Multiple waterbodies - use OR condition
                from sqlalchemy import or_

                waterbody_conditions = [
                    Record.waterbody.ilike(f"%{w.strip()}%")
                    for w in waterbody
                    if w.strip()
                ]
                if waterbody_conditions:
                    query = query.filter(or_(*waterbody_conditions))
            else:
                # Single waterbody (backward compatibility)
                query = query.filter(Record.waterbody.ilike(f"%{waterbody}%"))

        # Apply bait filter (support multiple values, check both bait1 and bait2)
        if bait:
            if isinstance(bait, list):
                # Multiple baits - use OR condition for each bait across all bait fields
                from sqlalchemy import or_

                all_bait_conditions = []
                for b in bait:
                    if b.strip():
                        bait_conditions = [
                            Record.bait1.ilike(f"%{b.strip()}%"),
                            Record.bait2.ilike(f"%{b.strip()}%"),
                            Record.bait.ilike(f"%{b.strip()}%"),
                        ]
                        all_bait_conditions.append(or_(*bait_conditions))
                if all_bait_conditions:
                    query = query.filter(or_(*all_bait_conditions))
            else:
                # Single bait (backward compatibility)
                query = query.filter(
                    (Record.bait1.ilike(f"%{bait}%"))
                    | (Record.bait2.ilike(f"%{bait}%"))
                    | (Record.bait.ilike(f"%{bait}%"))
                )

        # Apply data age filter
        if data_age:
            if data_age == "since-reset":
                last_reset = get_last_record_reset_date()
                query = query.filter(Record.created_at >= last_reset)
            elif data_age == "since-two-resets-ago":
                two_resets_ago = get_two_resets_ago_date()
                query = query.filter(Record.created_at >= two_resets_ago)

        # Get all matching records
        query_start = time.time()
        records = query.order_by(Record.id.desc()).all()
        query_time = time.time() - query_start

        # Apply post-processing filters that can't be done in SQL easily
        process_start = time.time()
        filtered_records = []

        for record in records:
            # Format bait display with alphabetical ordering
            bait_display = normalize_bait_display(
                record.bait1, record.bait2, record.bait
            )

            # Apply additional bait filtering for exact normalized matches
            if bait:
                if isinstance(bait, list):
                    # Multiple baits - check if any match
                    bait_matches = False
                    for b in bait:
                        if b.strip():
                            normalized_search = get_normalized_bait_for_filtering(
                                b.strip()
                            )
                            if normalized_search.lower() in bait_display.lower():
                                bait_matches = True
                                break
                    if not bait_matches:
                        continue
                else:
                    # Single bait (backward compatibility)
                    normalized_search = get_normalized_bait_for_filtering(bait)
                    if normalized_search.lower() not in bait_display.lower():
                        continue

            # Parse combined categories
            if record.category and ";" in record.category:
                categories = record.category.split(";")
            else:
                categories = [record.category] if record.category else ["N"]

            # Apply data age filter for day-based filters (using fishing date)
            if data_age and data_age not in ["since-reset", "since-two-resets-ago"]:
                from datetime import datetime, timezone

                now = datetime.now(timezone.utc)

                # Parse date string (DD.MM.YY format)
                if record.date:
                    try:
                        # Validate date format before parsing
                        if not isinstance(record.date, str) or not record.date.strip():
                            logger.warning(
                                f"Invalid date format for record {record.player}/{record.fish}: empty or non-string date"
                            )
                            continue  # Skip records with invalid date format for day-based filters

                        parts = record.date.strip().split(".")
                        if len(parts) != 3:
                            logger.warning(
                                f"Invalid date format for record {record.player}/{record.fish}: '{record.date}' - expected DD.MM.YY format"
                            )
                            continue  # Skip records with invalid date format for day-based filters

                        try:
                            day = int(parts[0])
                            month = int(parts[1])
                            year = int(parts[2])
                        except ValueError as e:
                            logger.warning(
                                f"Date parsing error for record {record.player}/{record.fish}: '{record.date}' - non-numeric components: {e}"
                            )
                            continue  # Skip records with non-numeric date components

                        # Validate date component ranges
                        if not (1 <= day <= 31):
                            logger.warning(
                                f"Invalid day for record {record.player}/{record.fish}: '{record.date}' - day {day} out of range"
                            )
                            continue
                        if not (1 <= month <= 12):
                            logger.warning(
                                f"Invalid month for record {record.player}/{record.fish}: '{record.date}' - month {month} out of range"
                            )
                            continue
                        if not (0 <= year <= 99):
                            logger.warning(
                                f"Invalid year for record {record.player}/{record.fish}: '{record.date}' - year {year} out of range for 2-digit format"
                            )
                            continue

                        # Convert 2-digit year to 4-digit
                        if year <= 50:
                            year += 2000
                        elif year < 100:
                            year += 1900

                        try:
                            record_date = datetime(
                                year, month, day, 12, 0, 0, tzinfo=timezone.utc
                            )
                        except ValueError as e:
                            logger.warning(
                                f"Invalid date for record {record.player}/{record.fish}: '{record.date}' - {year}-{month}-{day} is not a valid date: {e}"
                            )
                            continue  # Skip records with invalid calendar dates

                        # Calculate days difference
                        today = datetime(
                            now.year, now.month, now.day, tzinfo=timezone.utc
                        )
                        days_diff = (today - record_date).days

                        max_days = {
                            "1-day": 0,
                            "2-days": 1,
                            "3-days": 2,
                            "7-days": 6,
                            "30-days": 29,
                            "90-days": 89,
                        }.get(data_age)

                        # Debug logging for problematic cases
                        if data_age == "1-day" and days_diff > 0:
                            logger.debug(
                                f"Filtering out record from {record.date} ({days_diff} days ago) for 1-day filter: {record.player}/{record.fish}"
                            )

                        if max_days is not None and days_diff > max_days:
                            continue

                    except Exception as e:
                        # Log any unexpected errors and skip the record for day-based filters
                        logger.warning(
                            f"Unexpected error parsing date for record {record.player}/{record.fish}: '{record.date}' - {type(e).__name__}: {e}"
                        )
                        continue  # Skip records with any parsing errors for day-based filters
                else:
                    # No date field - skip for day-based filters
                    logger.debug(
                        f"No date field for record {record.player}/{record.fish} - skipping for day-based filter"
                    )
                    continue

            # Add to filtered results
            filtered_records.append(
                {
                    "player": record.player,
                    "fish": record.fish,
                    "weight": record.weight,
                    "waterbody": record.waterbody,
                    "bait_display": bait_display,
                    "date": record.date,
                    "region": record.region,
                    "categories": categories,
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "trophy_class": record.trophy_class,
                }
            )

        process_time = time.time() - process_start

        # Apply pagination if specified
        total_filtered = len(filtered_records)
        if offset or limit:
            start_idx = offset or 0
            end_idx = start_idx + limit if limit else len(filtered_records)
            filtered_records = filtered_records[start_idx:end_idx]

        total_time = time.time() - start_time

        db.close()

        return {
            "records": filtered_records,
            "total_filtered": total_filtered,
            "showing_count": len(filtered_records),
            "has_more": limit
            and total_filtered > (offset or 0) + len(filtered_records),
            "performance": {
                "total_time": round(total_time, 3),
                "query_time": round(query_time, 3),
                "process_time": round(process_time, 3),
                "records_per_second": round(total_filtered / total_time, 0)
                if total_time > 0
                else 0,
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving filtered records after {total_time:.3f}s: {e}")
        db.close()
        raise


def get_filter_values():
    """Get unique values for all filter dropdowns"""
    start_time = time.time()
    db = SessionLocal()

    try:
        # Get all records to extract unique values
        records = db.query(Record).all()

        fish_set = set()
        waterbody_set = set()
        bait_set = set()

        for record in records:
            if record.fish:
                fish_set.add(record.fish)
            if record.waterbody:
                waterbody_set.add(record.waterbody)

            # Include both bait1 and bait2 individually (no sandwich baits) in autocomplete
            # Add bait1 or legacy bait field
            bait1_display = record.bait1 or record.bait or ""
            if bait1_display and bait1_display.strip():
                bait_set.add(bait1_display.strip())

            # Add bait2 separately if it exists
            if record.bait2 and record.bait2.strip():
                bait_set.add(record.bait2.strip())

        total_time = time.time() - start_time

        db.close()

        return {
            "fish": sorted(list(fish_set)),
            "waterbody": sorted(list(waterbody_set)),
            "bait": sorted(list(bait_set)),
            "performance": {"total_time": round(total_time, 3)},
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving filter values after {total_time:.3f}s: {e}")
        db.close()
        raise


def get_top_baits_data():
    """Get top baits analysis for the past 3 weeks with Sunday 6PM UTC markers"""
    start_time = time.time()
    db = SessionLocal()

    try:
        # Calculate weekly boundaries
        last_reset = get_last_record_reset_date()
        two_resets_ago = get_two_resets_ago_date()
        three_resets_ago = get_three_resets_ago_date()
        four_resets_ago = get_four_resets_ago_date()

        # Define the three weekly periods
        periods = {
            "this_week": (last_reset, None),
            "last_week": (two_resets_ago, last_reset),
            "three_weeks_ago": (three_resets_ago, two_resets_ago),
        }

        logger.info(f"🎣 Analyzing top baits for periods:")
        logger.info(f"  This Week: {last_reset.strftime('%Y-%m-%d %H:%M')} - Present")
        logger.info(
            f"  Last Week: {two_resets_ago.strftime('%Y-%m-%d %H:%M')} - {last_reset.strftime('%Y-%m-%d %H:%M')}"
        )
        logger.info(
            f"  3 Weeks Ago: {three_resets_ago.strftime('%Y-%m-%d %H:%M')} - {two_resets_ago.strftime('%Y-%m-%d %H:%M')}"
        )

        # Get all records from 3 weeks ago onwards
        query_start = time.time()
        all_records = (
            db.query(Record).filter(Record.created_at >= three_resets_ago).all()
        )
        query_time = time.time() - query_start

        logger.info(f"📊 Retrieved {len(all_records)} records in {query_time:.3f}s")

        # Get all unique fish names
        fish_names = set()
        for record in all_records:
            if record.fish:
                fish_names.add(record.fish)

        fish_names = sorted(list(fish_names))
        logger.info(f"🐟 Analyzing {len(fish_names)} unique fish species")

        # Process each fish and period
        process_start = time.time()
        results = {}

        for fish_name in fish_names:
            results[fish_name] = {}

            for period_name, (start_date, end_date) in periods.items():
                # Filter records for this fish and period
                period_records = []
                for record in all_records:
                    if record.fish != fish_name:
                        continue

                    # Ensure record.created_at is timezone-aware
                    record_created_at = record.created_at
                    if record_created_at.tzinfo is None:
                        # If naive, assume UTC
                        record_created_at = record_created_at.replace(
                            tzinfo=timezone.utc
                        )

                    # Now we can safely compare timezone-aware datetimes
                    if record_created_at >= start_date and (
                        end_date is None or record_created_at < end_date
                    ):
                        period_records.append(record)

                if not period_records:
                    results[fish_name][period_name] = {
                        "caught_most": None,
                        "caught_biggest": None,
                    }
                    continue

                # Analyze baits for this period
                bait_stats = {}

                for record in period_records:
                    # Get normalized bait display
                    bait_display = normalize_bait_display(
                        record.bait1, record.bait2, record.bait
                    )

                    if not bait_display or bait_display.strip() == "":
                        continue

                    if bait_display not in bait_stats:
                        bait_stats[bait_display] = {
                            "count": 0,
                            "max_weight": 0,
                            "records": [],
                        }

                    bait_stats[bait_display]["count"] += 1
                    bait_stats[bait_display]["max_weight"] = max(
                        bait_stats[bait_display]["max_weight"], record.weight or 0
                    )
                    bait_stats[bait_display]["records"].append(
                        {
                            "weight": record.weight,
                            "player": record.player,
                            "date": record.date,
                        }
                    )

                # Find top baits
                if bait_stats:
                    # Most caught: bait with highest count
                    most_caught_bait = max(
                        bait_stats.items(), key=lambda x: x[1]["count"]
                    )

                    # Biggest caught: bait with highest max weight
                    biggest_caught_bait = max(
                        bait_stats.items(), key=lambda x: x[1]["max_weight"]
                    )

                    results[fish_name][period_name] = {
                        "caught_most": {
                            "bait": most_caught_bait[0],
                            "count": most_caught_bait[1]["count"],
                        },
                        "caught_biggest": {
                            "bait": biggest_caught_bait[0],
                            "weight": biggest_caught_bait[1]["max_weight"],
                        },
                    }
                else:
                    results[fish_name][period_name] = {
                        "caught_most": None,
                        "caught_biggest": None,
                    }

        process_time = time.time() - process_start
        total_time = time.time() - start_time

        logger.info(f"🎯 Top baits analysis completed:")
        logger.info(f"  Query time: {query_time:.3f}s")
        logger.info(f"  Processing time: {process_time:.3f}s")
        logger.info(f"  Total time: {total_time:.3f}s")

        db.close()

        return {
            "fish_data": results,
            "periods": {
                "this_week": {
                    "label": "This Week",
                    "start_date": last_reset.isoformat(),
                    "end_date": None,
                },
                "last_week": {
                    "label": "Last Week",
                    "start_date": two_resets_ago.isoformat(),
                    "end_date": last_reset.isoformat(),
                },
                "three_weeks_ago": {
                    "label": "3 Weeks Ago",
                    "start_date": three_resets_ago.isoformat(),
                    "end_date": two_resets_ago.isoformat(),
                },
            },
            "performance": {
                "total_records": len(all_records),
                "total_fish_species": len(fish_names),
                "query_time": round(query_time, 3),
                "processing_time": round(process_time, 3),
                "total_time": round(total_time, 3),
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error analyzing top baits after {total_time:.3f}s: {e}")
        db.close()
        raise
