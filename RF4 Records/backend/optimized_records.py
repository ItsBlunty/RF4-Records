#!/usr/bin/env python3
"""
High-performance record loading with database-level optimizations.
Replaces simplified_records.py with much faster queries.
"""

from database import Record, SessionLocal
from bait_utils import normalize_bait_display
from sqlalchemy import func, distinct, text
import logging

logger = logging.getLogger(__name__)


def get_filter_values_optimized():
    """Get unique filter values using optimized database queries"""
    db = SessionLocal()

    try:
        # Use database-level DISTINCT queries instead of loading all records
        fish_query = db.query(distinct(Record.fish)).filter(
            Record.fish.isnot(None), Record.fish != ""
        )
        waterbody_query = db.query(distinct(Record.waterbody)).filter(
            Record.waterbody.isnot(None), Record.waterbody != ""
        )

        # For bait, we need to handle single baits only (no sandwich baits)
        # Include both bait1 and bait2 fields individually, but not combinations
        # Use raw SQL for better performance with complex bait logic
        bait_query = db.execute(
            text("""
            SELECT DISTINCT bait_display FROM (
                SELECT COALESCE(bait1, bait, '') as bait_display
                FROM records 
                WHERE (bait1 IS NOT NULL AND bait1 != '') 
                   OR (bait IS NOT NULL AND bait != '')
                UNION
                SELECT bait2 as bait_display
                FROM records 
                WHERE bait2 IS NOT NULL AND bait2 != ''
            ) combined_baits
            WHERE bait_display != ''
            ORDER BY bait_display
        """)
        )

        return {
            "fish": sorted([r[0] for r in fish_query.all() if r[0]]),
            "waterbody": sorted([r[0] for r in waterbody_query.all() if r[0]]),
            "bait": [r[0] for r in bait_query.fetchall() if r[0]],
        }

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
