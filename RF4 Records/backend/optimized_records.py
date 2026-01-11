#!/usr/bin/env python3
"""
High-performance record loading with database-level optimizations.
Replaces simplified_records.py with much faster queries.
"""

from database import Record, SessionLocal
from bait_utils import normalize_bait_display, get_normalized_bait_for_filtering
from sqlalchemy import func, distinct, text, or_
from datetime import datetime, timedelta, timezone
import logging
import time

logger = logging.getLogger(__name__)

# ============================================================================
# CACHES - Prevent repeated database queries for rarely-changing data
# Fish/bait/waterbody lists only change with game updates (rare)
# ============================================================================
_CACHE_TTL_SECONDS = 3600  # 1 hour cache - these values rarely change

_fish_names_cache = {
    "data": None,
    "timestamp": None,
}

_filter_values_cache = {
    "data": None,
    "timestamp": None,
}

_fish_location_mapping_cache = {
    "data": None,
    "timestamp": None,
}


def get_cached_fish_names(db):
    """Get fish names (lowercase set) for exact match checking. Cache refreshes every hour."""
    global _fish_names_cache

    now = time.time()

    # Check if cache is valid
    if (_fish_names_cache["data"] is not None and
        _fish_names_cache["timestamp"] is not None and
        now - _fish_names_cache["timestamp"] < _CACHE_TTL_SECONDS):
        return _fish_names_cache["data"]

    # Cache miss or expired - query database
    logger.info("🔄 Refreshing fish names cache...")
    all_fish_names = (
        db.query(distinct(Record.fish))
        .filter(Record.fish.isnot(None), Record.fish != "")
        .all()
    )
    fish_names_lower = set(name[0].lower() for name in all_fish_names if name[0])

    # Update cache
    _fish_names_cache["data"] = fish_names_lower
    _fish_names_cache["timestamp"] = now
    logger.info(f"✅ Fish names cache updated with {len(fish_names_lower)} species")

    return fish_names_lower


def get_cached_filter_values(db):
    """Get filter dropdown values (fish, waterbody, bait). Cache refreshes every hour."""
    global _filter_values_cache

    now = time.time()

    # Check if cache is valid
    if (_filter_values_cache["data"] is not None and
        _filter_values_cache["timestamp"] is not None and
        now - _filter_values_cache["timestamp"] < _CACHE_TTL_SECONDS):
        logger.debug("📦 Using cached filter values")
        return _filter_values_cache["data"]

    # Cache miss or expired - query database
    logger.info("🔄 Refreshing filter values cache (fish, waterbody, bait)...")

    # Fish names
    fish_query = db.query(distinct(Record.fish)).filter(
        Record.fish.isnot(None), Record.fish != ""
    )

    # Waterbody names
    waterbody_query = db.query(distinct(Record.waterbody)).filter(
        Record.waterbody.isnot(None), Record.waterbody != ""
    )

    # Bait names (complex query to handle semicolon-separated values)
    bait_query = db.execute(
        text("""
        SELECT DISTINCT TRIM(bait_part) as bait_display FROM (
            SELECT TRIM(UNNEST(STRING_TO_ARRAY(COALESCE(bait1, bait, ''), ';'))) as bait_part
            FROM records
            WHERE (bait1 IS NOT NULL AND bait1 != '')
               OR (bait IS NOT NULL AND bait != '')
            UNION
            SELECT TRIM(UNNEST(STRING_TO_ARRAY(bait2, ';'))) as bait_part
            FROM records
            WHERE bait2 IS NOT NULL AND bait2 != ''
        ) split_baits
        WHERE bait_part != '' AND bait_part IS NOT NULL
        ORDER BY bait_display
    """)
    )

    filter_values = {
        "fish": sorted([r[0] for r in fish_query.all() if r[0]]),
        "waterbody": sorted([r[0] for r in waterbody_query.all() if r[0]]),
        "bait": [r[0] for r in bait_query.fetchall() if r[0]],
    }

    # Update cache
    _filter_values_cache["data"] = filter_values
    _filter_values_cache["timestamp"] = now
    logger.info(f"✅ Filter values cache updated: {len(filter_values['fish'])} fish, "
               f"{len(filter_values['waterbody'])} waterbodies, {len(filter_values['bait'])} baits")

    return filter_values


def get_cached_fish_location_mapping(db):
    """
    Get fish-location mapping for dynamic dropdown filtering. Cache refreshes every hour.
    Returns:
        - fish_by_location: { "Mosquito Lake": ["Bass", "Carp", ...], ... }
        - locations_by_fish: { "Bass": ["Mosquito Lake", "Bear Lake", ...], ... }
    """
    global _fish_location_mapping_cache

    now = time.time()

    # Check if cache is valid
    if (_fish_location_mapping_cache["data"] is not None and
        _fish_location_mapping_cache["timestamp"] is not None and
        now - _fish_location_mapping_cache["timestamp"] < _CACHE_TTL_SECONDS):
        logger.debug("📦 Using cached fish-location mapping")
        return _fish_location_mapping_cache["data"]

    # Cache miss or expired - query database
    logger.info("🔄 Refreshing fish-location mapping cache...")

    # Query distinct fish-waterbody combinations
    fish_location_query = db.query(
        distinct(Record.fish), Record.waterbody
    ).filter(
        Record.fish.isnot(None),
        Record.fish != "",
        Record.waterbody.isnot(None),
        Record.waterbody != ""
    ).all()

    # Build mappings
    fish_by_location = {}
    locations_by_fish = {}

    for fish, waterbody in fish_location_query:
        # Add to fish_by_location
        if waterbody not in fish_by_location:
            fish_by_location[waterbody] = set()
        fish_by_location[waterbody].add(fish)

        # Add to locations_by_fish
        if fish not in locations_by_fish:
            locations_by_fish[fish] = set()
        locations_by_fish[fish].add(waterbody)

    # Convert sets to sorted lists
    fish_by_location = {loc: sorted(list(fish_set)) for loc, fish_set in fish_by_location.items()}
    locations_by_fish = {fish: sorted(list(loc_set)) for fish, loc_set in locations_by_fish.items()}

    mapping_data = {
        "fish_by_location": fish_by_location,
        "locations_by_fish": locations_by_fish,
    }

    # Update cache
    _fish_location_mapping_cache["data"] = mapping_data
    _fish_location_mapping_cache["timestamp"] = now
    logger.info(f"✅ Fish-location mapping cache updated: {len(fish_by_location)} locations, "
               f"{len(locations_by_fish)} fish species")

    return mapping_data


def get_fish_location_mapping_optimized():
    """Get fish-location mapping using cached database queries (1 hour TTL)"""
    db = SessionLocal()

    try:
        return get_cached_fish_location_mapping(db)
    except Exception as e:
        logger.error(f"Error getting fish-location mapping: {e}")
        raise
    finally:
        db.close()


def get_filter_values_optimized():
    """Get unique filter values using cached database queries (1 hour TTL)"""
    db = SessionLocal()

    try:
        return get_cached_filter_values(db)
    except Exception as e:
        logger.error(f"Error getting filter values: {e}")
        raise
    finally:
        db.close()


def get_initial_records_optimized(limit: int = 1000):
    """Get initial batch of records with optimized queries"""
    db = SessionLocal()

    try:
        # Get recent records with single optimized query
        records = (
            db.query(Record)
            .order_by(Record.created_at.desc(), Record.id.desc())
            .limit(limit)
            .all()
        )

        # Get total count with optimized count query
        total_count = db.query(func.count(Record.id)).scalar()

        # Format records efficiently
        result = []
        for record in records:
            # Format bait display
            if record.bait2:
                bait_display = normalize_bait_display(
                    record.bait1, record.bait2, record.bait
                )
            else:
                bait_display = record.bait1 or record.bait or ""

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
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "region": record.region,
                    "categories": categories,
                    "bait1": record.bait1,
                    "bait2": record.bait2,
                    "trophy_class": record.trophy_class,
                }
            )

        # Get filter values efficiently
        unique_values = get_filter_values_optimized()

        return {
            "records": result,
            "total_unique_records": total_count,
            "has_more": len(result) < total_count,
            "unique_values": unique_values,
        }

    except Exception as e:
        logger.error(f"Error retrieving initial optimized records: {e}")
        raise
    finally:
        db.close()


def get_remaining_records_optimized(skip: int = 1000):
    """Get remaining records with optimized pagination"""
    db = SessionLocal()

    try:
        # Get remaining records with optimized offset query
        records = (
            db.query(Record)
            .order_by(Record.created_at.desc(), Record.id.desc())
            .offset(skip)
            .all()
        )

        # Get total count
        total_count = db.query(func.count(Record.id)).scalar()

        # Format records efficiently
        result = []
        for record in records:
            # Format bait display
            if record.bait2:
                bait_display = normalize_bait_display(
                    record.bait1, record.bait2, record.bait
                )
            else:
                bait_display = record.bait1 or record.bait or ""

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
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "region": record.region,
                    "categories": categories,
                    "bait1": record.bait1,
                    "bait2": record.bait2,
                    "trophy_class": record.trophy_class,
                }
            )

        # Get filter values efficiently (cached or optimized)
        unique_values = get_filter_values_optimized()

        return {
            "records": result,
            "total_unique_records": total_count,
            "unique_values": unique_values,
        }

    except Exception as e:
        logger.error(f"Error retrieving remaining optimized records: {e}")
        raise
    finally:
        db.close()


def get_all_records_optimized():
    """Get all records with optimized single query (for backward compatibility)"""
    db = SessionLocal()

    try:
        # Get all records with optimized query
        records = (
            db.query(Record).order_by(Record.created_at.desc(), Record.id.desc()).all()
        )

        # Format records efficiently
        result = []
        for record in records:
            # Format bait display
            if record.bait2:
                bait_display = normalize_bait_display(
                    record.bait1, record.bait2, record.bait
                )
            else:
                bait_display = record.bait1 or record.bait or ""

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
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "region": record.region,
                    "categories": categories,
                    "bait1": record.bait1,
                    "bait2": record.bait2,
                    "trophy_class": record.trophy_class,
                }
            )

        return result, len(records)

    except Exception as e:
        logger.error(f"Error retrieving all optimized records: {e}")
        raise
    finally:
        db.close()


def get_leaderboard_optimized(
    fish: str = None, waterbody: str = None, limit: int = 100
):
    """Get leaderboard with optimized query using indexes"""
    db = SessionLocal()

    try:
        query = db.query(Record).order_by(Record.weight.desc())

        # Use indexed filters
        if fish:
            query = query.filter(Record.fish == fish)
        if waterbody:
            query = query.filter(Record.waterbody == waterbody)

        records = query.limit(limit).all()

        # Format records
        result = []
        for record in records:
            if record.bait2:
                bait_display = normalize_bait_display(
                    record.bait1, record.bait2, record.bait
                )
            else:
                bait_display = record.bait1 or record.bait or ""

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
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "region": record.region,
                    "categories": categories,
                    "bait1": record.bait1,
                    "bait2": record.bait2,
                    "trophy_class": record.trophy_class,
                }
            )

        return result

    except Exception as e:
        logger.error(f"Error retrieving leaderboard: {e}")
        raise
    finally:
        db.close()


# Date calculation functions (migrated from simplified_records)
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


def get_recent_records_optimized(limit: int = 1000):
    """Get recent records since last reset - MEMORY OPTIMIZED with raw SQL"""
    db = SessionLocal()

    try:
        last_reset = get_last_record_reset_date()

        # Get counts using efficient SQL COUNT (not loading objects)
        recent_count = db.execute(
            text("SELECT COUNT(*) FROM records WHERE created_at >= :last_reset"),
            {"last_reset": last_reset}
        ).scalar()
        total_records = db.execute(text("SELECT COUNT(*) FROM records")).scalar()

        # Get limited records using SQL LIMIT (not Python slicing)
        sql = """
            SELECT id, player, fish, weight, waterbody, bait, bait1, bait2,
                   date, region, category, created_at, trophy_class
            FROM records
            WHERE created_at >= :last_reset
            ORDER BY id DESC
            LIMIT :limit
        """
        rows = db.execute(text(sql), {"last_reset": last_reset, "limit": limit}).fetchall()

        result = []
        fish_set = set()
        waterbody_set = set()
        bait_set = set()

        for row in rows:
            bait1 = row[6]
            bait2 = row[7]
            bait_val = row[5]
            category = row[10]
            created_at = row[11]

            bait_display = normalize_bait_display(bait1, bait2, bait_val)

            if category and ";" in category:
                categories = category.split(";")
            else:
                categories = [category] if category else ["N"]

            result.append({
                "player": row[1],
                "fish": row[2],
                "weight": row[3],
                "waterbody": row[4],
                "bait_display": bait_display,
                "date": row[8],
                "region": row[9],
                "categories": categories,
                "created_at": created_at.isoformat() if created_at else None,
                "trophy_class": row[12],
            })

            # Build unique values during main loop
            if row[2]:  # fish
                fish_set.add(row[2])
            if row[4]:  # waterbody
                waterbody_set.add(row[4])
            if bait_display:
                bait_set.add(bait_display)

        return {
            "records": result,
            "recent_count": recent_count,
            "total_records": total_records,
            "showing_recent_only": True,
            "showing_limited": len(result) < recent_count,
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
        raise
    finally:
        db.close()


def get_all_recent_records_optimized():
    """Get ALL recent records since last reset - MEMORY OPTIMIZED with raw SQL"""
    start_time = time.time()
    db = SessionLocal()

    try:
        reset_start = time.time()
        last_reset = get_last_record_reset_date()
        reset_time = time.time() - reset_start

        # Get counts efficiently
        count_start = time.time()
        total_records = db.execute(text("SELECT COUNT(*) FROM records")).scalar()
        count_time = time.time() - count_start

        # Get records using raw SQL (not ORM objects)
        query_start = time.time()
        sql = """
            SELECT id, player, fish, weight, waterbody, bait, bait1, bait2,
                   date, region, category, created_at, trophy_class
            FROM records
            WHERE created_at >= :last_reset
            ORDER BY id DESC
        """
        rows = db.execute(text(sql), {"last_reset": last_reset}).fetchall()
        query_time = time.time() - query_start

        recent_count = len(rows)

        # Process raw rows
        process_start = time.time()
        result = []
        fish_set = set()
        waterbody_set = set()
        bait_set = set()

        for row in rows:
            bait1 = row[6]
            bait2 = row[7]
            bait_val = row[5]
            category = row[10]
            created_at = row[11]

            bait_display = normalize_bait_display(bait1, bait2, bait_val)

            if category and ";" in category:
                categories = category.split(";")
            else:
                categories = [category] if category else ["N"]

            result.append({
                "player": row[1],
                "fish": row[2],
                "weight": row[3],
                "waterbody": row[4],
                "bait_display": bait_display,
                "date": row[8],
                "region": row[9],
                "categories": categories,
                "created_at": created_at.isoformat() if created_at else None,
                "trophy_class": row[12],
            })

            if row[2]:
                fish_set.add(row[2])
            if row[4]:
                waterbody_set.add(row[4])
            if bait_display:
                bait_set.add(bait_display)

        process_time = time.time() - process_start

        sort_start = time.time()
        unique_values = {
            "fish": sorted(list(fish_set)),
            "waterbody": sorted(list(waterbody_set)),
            "bait": sorted(list(bait_set)),
        }
        sort_time = time.time() - sort_start

        total_time = time.time() - start_time

        logger.info(f"📊 Recent Records Performance (raw SQL):")
        logger.info(f"  Reset date calc: {reset_time:.3f}s")
        logger.info(f"  DB query ({recent_count} records): {query_time:.3f}s")
        logger.info(f"  Total count query: {count_time:.3f}s")
        logger.info(f"  Data processing: {process_time:.3f}s")
        logger.info(f"  Unique values sorting: {sort_time:.3f}s")
        logger.info(f"  TOTAL TIME: {total_time:.3f}s")
        logger.info(f"  Performance: {recent_count / total_time:.0f} records/second")

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
                "records_per_second": round(recent_count / total_time, 0) if total_time > 0 else 0,
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving all recent records after {total_time:.3f}s: {e}")
        raise
    finally:
        db.close()


def get_older_records_optimized():
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
        raise
    finally:
        db.close()


def get_filtered_records_optimized(
    fish=None, waterbody=None, bait=None, data_age=None, limit=None, offset=None
):
    """
    Get filtered records from database based on criteria - MEMORY OPTIMIZED VERSION

    Uses raw SQL instead of ORM objects to reduce memory usage by ~10x.
    100K records: ~50MB instead of ~500MB.
    """
    start_time = time.time()
    db = SessionLocal()

    try:
        # Build dynamic SQL query with parameters
        where_clauses = []
        params = {}

        # Fish filter
        if fish:
            available_fish = get_cached_fish_names(db)
            fish_list = fish if isinstance(fish, list) else [fish]
            fish_conditions = []

            for i, f in enumerate(fish_list):
                if f and f.strip():
                    param_name = f"fish_{i}"
                    search_term_lower = f.strip().lower()
                    if search_term_lower in available_fish:
                        # Exact match (case insensitive)
                        fish_conditions.append(f"LOWER(fish) = LOWER(:{param_name})")
                        params[param_name] = f.strip()
                    else:
                        # Partial match
                        fish_conditions.append(f"fish ILIKE :{param_name}")
                        params[param_name] = f"%{f.strip()}%"

            if fish_conditions:
                where_clauses.append(f"({' OR '.join(fish_conditions)})")

        # Waterbody filter
        if waterbody:
            waterbody_list = waterbody if isinstance(waterbody, list) else [waterbody]
            waterbody_conditions = []

            for i, w in enumerate(waterbody_list):
                if w and w.strip():
                    param_name = f"waterbody_{i}"
                    waterbody_conditions.append(f"waterbody ILIKE :{param_name}")
                    params[param_name] = f"%{w.strip()}%"

            if waterbody_conditions:
                where_clauses.append(f"({' OR '.join(waterbody_conditions)})")

        # Bait filter (check bait1, bait2, and bait fields)
        if bait:
            bait_list = bait if isinstance(bait, list) else [bait]
            bait_conditions = []

            for i, b in enumerate(bait_list):
                if b and b.strip():
                    param_name = f"bait_{i}"
                    params[param_name] = f"%{b.strip()}%"
                    bait_conditions.append(
                        f"(bait1 ILIKE :{param_name} OR bait2 ILIKE :{param_name} OR bait ILIKE :{param_name})"
                    )

            if bait_conditions:
                where_clauses.append(f"({' OR '.join(bait_conditions)})")

        # Date filter
        if data_age:
            now = datetime.now(timezone.utc)
            cutoff = None

            if data_age == "since-reset":
                cutoff = get_last_record_reset_date()
            elif data_age == "since-two-resets-ago":
                cutoff = get_two_resets_ago_date()
            elif data_age == "1-day":
                cutoff = now - timedelta(days=1)
            elif data_age == "2-days":
                cutoff = now - timedelta(days=2)
            elif data_age == "3-days":
                cutoff = now - timedelta(days=3)
            elif data_age == "7-days":
                cutoff = now - timedelta(days=7)
            elif data_age == "30-days":
                cutoff = now - timedelta(days=30)
            elif data_age == "90-days":
                cutoff = now - timedelta(days=90)

            if cutoff:
                where_clauses.append("created_at >= :cutoff")
                params["cutoff"] = cutoff

        # Build final SQL query - select only needed columns (not full ORM objects)
        sql = """
            SELECT id, player, fish, weight, waterbody, bait, bait1, bait2,
                   date, region, category, created_at, trophy_class
            FROM records
        """

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        sql += " ORDER BY id DESC"

        # Execute raw SQL query
        query_start = time.time()
        result = db.execute(text(sql), params)
        rows = result.fetchall()
        query_time = time.time() - query_start

        # Process raw rows into dicts (much smaller than ORM objects)
        process_start = time.time()
        filtered_records = []

        for row in rows:
            # Access by index for raw rows
            bait1 = row[6]
            bait2 = row[7]
            bait_val = row[5]
            category = row[10]
            created_at = row[11]

            # Format bait display
            bait_display = normalize_bait_display(bait1, bait2, bait_val)

            # Parse combined categories
            if category and ";" in category:
                categories = category.split(";")
            else:
                categories = [category] if category else ["N"]

            filtered_records.append({
                "player": row[1],
                "fish": row[2],
                "weight": row[3],
                "waterbody": row[4],
                "bait_display": bait_display,
                "date": row[8],
                "region": row[9],
                "categories": categories,
                "created_at": created_at.isoformat() if created_at else None,
                "trophy_class": row[12],
            })

        process_time = time.time() - process_start

        # Apply pagination if specified
        total_filtered = len(filtered_records)
        if offset or limit:
            start_idx = offset or 0
            end_idx = start_idx + limit if limit else len(filtered_records)
            filtered_records = filtered_records[start_idx:end_idx]

        total_time = time.time() - start_time

        # Log performance for monitoring
        logger.info(f"⚡ Filtered query: {total_filtered} records in {total_time:.3f}s "
                   f"(SQL: {query_time:.3f}s, Process: {process_time:.3f}s)")

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
        raise
    finally:
        db.close()


def get_top_baits_data_optimized():
    """
    Get top baits analysis for the past 3 weeks with Sunday 6PM UTC markers.

    OPTIMIZED VERSION: Uses SQL aggregation instead of loading all records into memory.
    Memory usage reduced from ~5GB (500K ORM objects) to ~10MB (aggregated results only).
    """
    start_time = time.time()
    db = SessionLocal()

    try:
        # Calculate weekly boundaries
        last_reset = get_last_record_reset_date()
        two_resets_ago = get_two_resets_ago_date()
        three_resets_ago = get_three_resets_ago_date()

        logger.info(f"🎣 Analyzing top baits for periods:")
        logger.info(f"  This Week: {last_reset.strftime('%Y-%m-%d %H:%M')} - Present")
        logger.info(
            f"  Last Week: {two_resets_ago.strftime('%Y-%m-%d %H:%M')} - {last_reset.strftime('%Y-%m-%d %H:%M')}"
        )
        logger.info(
            f"  3 Weeks Ago: {three_resets_ago.strftime('%Y-%m-%d %H:%M')} - {two_resets_ago.strftime('%Y-%m-%d %H:%M')}"
        )

        # SQL aggregation query - let PostgreSQL do the heavy lifting
        # This returns ~10K rows instead of loading 500K+ ORM objects
        query_start = time.time()

        aggregation_sql = text("""
            SELECT
                fish,
                bait1,
                bait2,
                bait,
                CASE
                    WHEN created_at >= :last_reset THEN 'this_week'
                    WHEN created_at >= :two_resets_ago AND created_at < :last_reset THEN 'last_week'
                    WHEN created_at >= :three_resets_ago AND created_at < :two_resets_ago THEN 'three_weeks_ago'
                END as period,
                COUNT(*) as catch_count,
                MAX(weight) as max_weight
            FROM records
            WHERE
                created_at >= :three_resets_ago
                AND fish IS NOT NULL
                AND fish != ''
            GROUP BY fish, bait1, bait2, bait,
                CASE
                    WHEN created_at >= :last_reset THEN 'this_week'
                    WHEN created_at >= :two_resets_ago AND created_at < :last_reset THEN 'last_week'
                    WHEN created_at >= :three_resets_ago AND created_at < :two_resets_ago THEN 'three_weeks_ago'
                END
            HAVING
                CASE
                    WHEN created_at >= :last_reset THEN 'this_week'
                    WHEN created_at >= :two_resets_ago AND created_at < :last_reset THEN 'last_week'
                    WHEN created_at >= :three_resets_ago AND created_at < :two_resets_ago THEN 'three_weeks_ago'
                END IS NOT NULL
        """)

        aggregated_rows = db.execute(
            aggregation_sql,
            {
                "last_reset": last_reset,
                "two_resets_ago": two_resets_ago,
                "three_resets_ago": three_resets_ago,
            }
        ).fetchall()

        query_time = time.time() - query_start
        logger.info(f"📊 SQL aggregation returned {len(aggregated_rows)} rows in {query_time:.3f}s")

        # Get total record count for stats (separate lightweight query)
        total_records = db.execute(
            text("SELECT COUNT(*) FROM records WHERE created_at >= :three_resets_ago"),
            {"three_resets_ago": three_resets_ago}
        ).scalar()

        # Process aggregated results in Python (much smaller dataset now)
        process_start = time.time()

        # Build nested structure: fish -> period -> bait -> stats
        fish_period_bait_stats = {}

        for row in aggregated_rows:
            fish = row[0]
            bait1 = row[1]
            bait2 = row[2]
            bait = row[3]
            period = row[4]
            catch_count = row[5]
            max_weight = row[6] or 0

            # Normalize bait display (same logic as before, but on aggregated data)
            bait_display = normalize_bait_display(bait1, bait2, bait)
            if not bait_display or bait_display.strip() == "":
                continue

            # Initialize nested dicts if needed
            if fish not in fish_period_bait_stats:
                fish_period_bait_stats[fish] = {}
            if period not in fish_period_bait_stats[fish]:
                fish_period_bait_stats[fish][period] = {}

            # Aggregate by normalized bait display
            # (multiple bait1/bait2/bait combos might normalize to same display)
            if bait_display not in fish_period_bait_stats[fish][period]:
                fish_period_bait_stats[fish][period][bait_display] = {
                    "count": 0,
                    "max_weight": 0,
                }

            fish_period_bait_stats[fish][period][bait_display]["count"] += catch_count
            fish_period_bait_stats[fish][period][bait_display]["max_weight"] = max(
                fish_period_bait_stats[fish][period][bait_display]["max_weight"],
                max_weight
            )

        # Build final results structure
        results = {}
        fish_names = sorted(fish_period_bait_stats.keys())
        period_names = ["this_week", "last_week", "three_weeks_ago"]

        for fish_name in fish_names:
            results[fish_name] = {}

            for period_name in period_names:
                bait_stats = fish_period_bait_stats[fish_name].get(period_name, {})

                if not bait_stats:
                    results[fish_name][period_name] = {
                        "caught_most": None,
                        "caught_biggest": None,
                    }
                    continue

                # Find top baits
                most_caught_bait = max(bait_stats.items(), key=lambda x: x[1]["count"])
                biggest_caught_bait = max(bait_stats.items(), key=lambda x: x[1]["max_weight"])

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

        process_time = time.time() - process_start
        total_time = time.time() - start_time

        logger.info(f"🎯 Top baits analysis completed:")
        logger.info(f"  SQL aggregation: {query_time:.3f}s")
        logger.info(f"  Python processing: {process_time:.3f}s")
        logger.info(f"  Total time: {total_time:.3f}s")
        logger.info(f"  Memory efficient: {len(aggregated_rows)} aggregated rows vs {total_records} total records")

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
                "total_records": total_records,
                "total_fish_species": len(fish_names),
                "aggregated_rows": len(aggregated_rows),
                "query_time": round(query_time, 3),
                "processing_time": round(process_time, 3),
                "total_time": round(total_time, 3),
            },
        }

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error analyzing top baits after {total_time:.3f}s: {e}")
        raise
    finally:
        db.close()
