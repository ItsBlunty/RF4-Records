#!/usr/bin/env python3
"""
Simplified record loading functions for post-migration database.
No deduplication needed since records are already merged with combined categories.
"""

from database import Record, SessionLocal
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

def get_recent_records_simple(limit: int = 1000):
    """Get recent records since last reset - SPEED OPTIMIZED for initial load"""
    db = SessionLocal()
    
    try:
        last_reset = get_last_record_reset_date()
        
        # Get ALL recent records since last reset (not limited)
        all_recent_records = db.query(Record).filter(
            Record.created_at >= last_reset
        ).order_by(Record.id.desc()).all()
        
        # Get actual counts
        recent_count = len(all_recent_records)
        total_records = db.query(Record).count()
        
        # Limit for initial display but return actual count
        recent_records = all_recent_records[:limit] if len(all_recent_records) > limit else all_recent_records
        
        result = []
        fish_set = set()
        waterbody_set = set()
        bait_set = set()
        
        for record in recent_records:
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
            
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories,
                "created_at": record.created_at.isoformat() if record.created_at else None
            })
            
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
            "showing_limited": len(recent_records) < recent_count,  # True if we're showing limited subset
            "has_older_records": recent_count < total_records,
            "last_reset_date": last_reset.isoformat(),
            "unique_values": {
                "fish": sorted(list(fish_set)),
                "waterbody": sorted(list(waterbody_set)),
                "bait": sorted(list(bait_set))
            }
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
        recent_records = db.query(Record).filter(
            Record.created_at >= last_reset
        ).order_by(Record.id.desc()).all()
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
            
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories,
                "created_at": record.created_at.isoformat() if record.created_at else None
            })
            
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
            "bait": sorted(list(bait_set))
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
        logger.info(f"  Performance: {recent_count/total_time:.0f} records/second")
        
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
                "records_per_second": round(recent_count/total_time, 0)
            }
        }
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving all recent records after {total_time:.3f}s: {e}")
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
        older_records = db.query(Record).filter(
            Record.created_at < last_reset
        ).order_by(Record.created_at.desc()).all()
        query_time = time.time() - query_start
        
        # Timer: Data processing
        process_start = time.time()
        result = []
        for record in older_records:
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
            
            result.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories,
                "created_at": record.created_at.isoformat() if record.created_at else None
            })
        process_time = time.time() - process_start
        
        # Timer: Unique values calculation (reuse same query results)
        unique_start = time.time()
        fish = sorted(list(set(r.fish for r in older_records if r.fish)))
        waterbody = sorted(list(set(r.waterbody for r in older_records if r.waterbody)))
        
        bait_set = set()
        for r in older_records:
            if r.bait2:
                bait_set.add(f"{r.bait1}; {r.bait2}")
            else:
                bait_set.add(r.bait1 or r.bait or "")
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
            logger.info(f"  Performance: {older_count/total_time:.0f} records/second")
        
        db.close()
        
        return {
            "records": result,
            "older_count": older_count,
            "showing_older_only": True,
            "unique_values": {
                "fish": fish,
                "waterbody": waterbody,
                "bait": bait
            },
            "performance": {
                "total_time": round(total_time, 3),
                "query_time": round(query_time, 3),
                "process_time": round(process_time, 3),
                "records_per_second": round(older_count/total_time, 0) if older_count > 0 else 0
            }
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

def get_filtered_records(fish=None, waterbody=None, bait=None, data_age=None, 
                        include_sandwich_bait=True, limit=None, offset=None):
    """Get filtered records from database based on criteria"""
    start_time = time.time()
    db = SessionLocal()
    
    try:
        # Start with base query
        query = db.query(Record)
        
        # Apply fish filter
        if fish:
            query = query.filter(Record.fish.ilike(f"%{fish}%"))
        
        # Apply waterbody filter
        if waterbody:
            query = query.filter(Record.waterbody.ilike(f"%{waterbody}%"))
        
        # Apply bait filter (check both bait1 and bait2)
        if bait:
            query = query.filter(
                (Record.bait1.ilike(f"%{bait}%")) | 
                (Record.bait2.ilike(f"%{bait}%")) |
                (Record.bait.ilike(f"%{bait}%"))
            )
        
        # Apply data age filter
        if data_age:
            if data_age == 'since-reset':
                last_reset = get_last_record_reset_date()
                query = query.filter(Record.created_at >= last_reset)
        
        # Get all matching records
        query_start = time.time()
        records = query.order_by(Record.id.desc()).all()
        query_time = time.time() - query_start
        
        # Apply post-processing filters that can't be done in SQL easily
        process_start = time.time()
        filtered_records = []
        
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
            
            # Apply sandwich bait filter - SIMPLE LOGIC
            # If include_sandwich_bait is False, exclude records with semicolon
            if include_sandwich_bait == False and ';' in bait_display:
                continue
            
            # Apply data age filter for day-based filters (using fishing date)
            if data_age and data_age != 'since-reset':
                from datetime import datetime, timezone
                
                now = datetime.now(timezone.utc)
                
                # Parse date string (DD.MM.YY format)
                if record.date:
                    try:
                        parts = record.date.split('.')
                        if len(parts) == 3:
                            day = int(parts[0])
                            month = int(parts[1])
                            year = int(parts[2])
                            
                            # Convert 2-digit year to 4-digit
                            if year <= 50:
                                year += 2000
                            elif year < 100:
                                year += 1900
                            
                            record_date = datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
                            
                            # Calculate days difference
                            today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
                            days_diff = (today - record_date).days
                            
                            max_days = {
                                '1-day': 1, '2-days': 2, '3-days': 3, '7-days': 7, 
                                '30-days': 30, '90-days': 90
                            }.get(data_age)
                            
                            if max_days and days_diff > max_days:
                                continue
                    except:
                        pass  # Keep record if date parsing fails
            
            # Add to filtered results
            filtered_records.append({
                "player": record.player,
                "fish": record.fish,
                "weight": record.weight,
                "waterbody": record.waterbody,
                "bait_display": bait_display,
                "date": record.date,
                "region": record.region,
                "categories": categories,
                "created_at": record.created_at.isoformat() if record.created_at else None
            })
        
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
            "has_more": limit and total_filtered > (offset or 0) + len(filtered_records),
            "performance": {
                "total_time": round(total_time, 3),
                "query_time": round(query_time, 3),
                "process_time": round(process_time, 3),
                "records_per_second": round(total_filtered/total_time, 0) if total_time > 0 else 0
            }
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
            
            # Format bait display
            if record.bait2:
                bait_set.add(f"{record.bait1}; {record.bait2}")
            else:
                bait_display = record.bait1 or record.bait or ""
                if bait_display:
                    bait_set.add(bait_display)
        
        total_time = time.time() - start_time
        
        db.close()
        
        return {
            "fish": sorted(list(fish_set)),
            "waterbody": sorted(list(waterbody_set)),
            "bait": sorted(list(bait_set)),
            "performance": {
                "total_time": round(total_time, 3)
            }
        }
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error retrieving filter values after {total_time:.3f}s: {e}")
        db.close()
        raise 