#!/usr/bin/env python3
"""
Simplified record loading functions for post-migration database.
No deduplication needed since records are already merged with combined categories.
"""

from database import Record, SessionLocal
import logging

logger = logging.getLogger(__name__)

def get_all_records_simple():
    """Get all records from database - no deduplication needed after migration"""
    db = SessionLocal()
    
    try:
        # Simply get all records - no grouping or deduplication needed!
        records = db.query(Record).all()
        
        result = []
        for record in records:
            # Format bait display
            if record.bait2:
                bait_display = f"{record.bait1}; {record.bait2}"
            else:
                bait_display = record.bait1 or record.bait or ""
            
            # Parse combined categories back to list format for frontend compatibility
            if record.category and ';' in record.category:
                # Combined categories like "N;U;L" -> ["N", "U", "L"]
                categories = record.category.split(';')
            else:
                # Single category like "N" -> ["N"]
                categories = [record.category] if record.category else ["N"]
            
            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories  # Parsed from combined category field
            })
        
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
            # Format bait display
            if record.bait2:
                bait_display = f"{record.bait1}; {record.bait2}"
            else:
                bait_display = record.bait1 or record.bait or ""
            
            # Parse combined categories
            if record.category and ';' in record.category:
                categories = record.category.split(';')
            else:
                categories = [record.category] if record.category else ["N"]
            
            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories
            })
        
        # Get total count
        total_records = db.query(Record).count()
        
        # Get unique values for filters
        fish = sorted(list(set(r['fish'] for r in result if r['fish'])))
        waterbody = sorted(list(set(r['waterbody'] for r in result if r['waterbody'])))
        bait = sorted(list(set(r['bait_display'] for r in result if r['bait_display'])))
        
        db.close()
        
        return {
            "records": result,
            "total_unique_records": total_records,  # Now same as total since no duplicates
            "total_db_records": total_records,
            "has_more": len(result) < total_records,
            "unique_values": {
                "fish": fish,
                "waterbody": waterbody, 
                "bait": bait
            }
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
            # Format bait display
            if record.bait2:
                bait_display = f"{record.bait1}; {record.bait2}"
            else:
                bait_display = record.bait1 or record.bait or ""
            
            # Parse combined categories
            if record.category and ';' in record.category:
                categories = record.category.split(';')
            else:
                categories = [record.category] if record.category else ["N"]
            
            # OPTIMIZATION: Remove unnecessary fields to reduce JSON payload size
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories
            })
        
        # OPTIMIZATION: Get unique values from already-loaded records (no extra queries)
        fish = sorted(list(set(r.fish for r in all_records if r.fish)))
        waterbody = sorted(list(set(r.waterbody for r in all_records if r.waterbody)))
        
        # For bait, we need to format them
        bait_set = set()
        for r in all_records:
            if r.bait2:
                bait_set.add(f"{r.bait1}; {r.bait2}")
            else:
                bait_set.add(r.bait1 or r.bait or "")
        bait = sorted(list(bait_set))
        
        total_records = len(all_records)
        
        db.close()
        
        return {
            "records": result,
            "total_unique_records": total_records,
            "total_db_records": total_records,
            "unique_values": {
                "fish": fish,
                "waterbody": waterbody,
                "bait": bait
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving remaining simplified records: {e}")
        db.close()
        raise 