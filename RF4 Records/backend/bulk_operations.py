#!/usr/bin/env python3
"""
Optimized bulk database operations for PostgreSQL performance.
Replaces individual inserts with efficient bulk operations.
"""

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from database import Record, SessionLocal
from trophy_classifier import classify_trophy
import logging

logger = logging.getLogger(__name__)

class BulkRecordInserter:
    """Efficient bulk record insertion with PostgreSQL UPSERT"""
    
    def __init__(self, db_session, batch_size=25):  # Smaller batch size to prevent memory accumulation
        self.batch_size = batch_size
        self.pending_records = []
        self.db = db_session  # Use provided session instead of creating new one
        
    def add_record(self, record_data):
        """Add a record to the pending batch with trophy classification"""
        # Add trophy classification if not already present
        if 'trophy_class' not in record_data and 'fish' in record_data and 'weight' in record_data:
            record_data['trophy_class'] = classify_trophy(record_data['fish'], record_data['weight'])
        
        self.pending_records.append(record_data)
        
        # Auto-flush when batch is full
        if len(self.pending_records) >= self.batch_size:
            self.flush()
    
    def flush(self):
        """Insert all pending records using optimized batch processing"""
        if not self.pending_records:
            return 0
        
        try:
            # Use batch duplicate checking with the composite index
            new_records = []
            
            for record_data in self.pending_records:
                # Check if record exists using the composite index (very fast now)
                exists = self.db.query(Record).filter(
                    Record.player == record_data['player'],
                    Record.fish == record_data['fish'],
                    Record.weight == record_data['weight'],
                    Record.waterbody == record_data['waterbody'],
                    Record.bait1 == record_data['bait1'],
                    Record.bait2 == record_data['bait2'],
                    Record.date == record_data['date'],
                    Record.region == record_data['region'],
                    Record.category == record_data['category']
                ).first()
                
                if not exists:
                    new_records.append(record_data)
            
            # Bulk insert only new records
            if new_records:
                self.db.bulk_insert_mappings(Record, new_records)
                self.db.commit()
                logger.debug(f"Bulk inserted {len(new_records)} new records out of {len(self.pending_records)} checked")
            else:
                logger.debug(f"No new records to insert out of {len(self.pending_records)} checked")
            
            inserted_count = len(new_records)
            self.pending_records.clear()
            return inserted_count
            
        except Exception as e:
            logger.error(f"Bulk insert failed: {e}")
            self.db.rollback()
            
            # Fallback to individual inserts for error recovery
            return self._fallback_individual_inserts()
    
    def _fallback_individual_inserts(self):
        """Fallback to individual inserts if bulk insert fails"""
        logger.warning("Falling back to individual inserts due to bulk insert failure")
        
        inserted_count = 0
        failed_records = []
        
        for record_data in self.pending_records:
            try:
                # Check if record exists using the composite index
                exists = self.db.query(Record).filter(
                    Record.player == record_data['player'],
                    Record.fish == record_data['fish'],
                    Record.weight == record_data['weight'],
                    Record.waterbody == record_data['waterbody'],
                    Record.bait1 == record_data['bait1'],
                    Record.bait2 == record_data['bait2'],
                    Record.date == record_data['date'],
                    Record.region == record_data['region'],
                    Record.category == record_data['category']
                ).first()
                
                if not exists:
                    self.db.add(Record(**record_data))
                    inserted_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to insert individual record: {e}")
                failed_records.append(record_data)
        
        try:
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to commit individual inserts: {e}")
            self.db.rollback()
            inserted_count = 0
        
        self.pending_records.clear()
        
        if failed_records:
            logger.warning(f"Failed to insert {len(failed_records)} records during fallback")
        
        return inserted_count
    
    def close(self):
        """Flush remaining records (session is managed externally)"""
        inserted = self.flush()
        # Don't close the session - it's managed by the caller
        return inserted

class OptimizedRecordChecker:
    """Optimized record existence checking using bulk queries"""
    
    def __init__(self, db_session):
        self.db = db_session
        self._cache = {}
        self._cache_size = 0
        self.max_cache_size = 100  # Much smaller cache to prevent memory accumulation
    
    def record_exists(self, record_data):
        """Check if record exists using optimized caching and bulk queries"""
        
        # Create a cache key from the record data
        cache_key = (
            record_data['player'],
            record_data['fish'], 
            record_data['weight'],
            record_data['waterbody'],
            record_data['bait1'],
            record_data['bait2'],
            record_data['date'],
            record_data['region'],
            record_data['category']
        )
        
        # Check cache first
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Query database (this will use our composite index)
        exists = self.db.query(Record).filter(
            Record.player == record_data['player'],
            Record.fish == record_data['fish'],
            Record.weight == record_data['weight'],
            Record.waterbody == record_data['waterbody'],
            Record.bait1 == record_data['bait1'],
            Record.bait2 == record_data['bait2'],
            Record.date == record_data['date'],
            Record.region == record_data['region'],
            Record.category == record_data['category']
        ).first() is not None
        
        # Cache the result
        self._cache[cache_key] = exists
        self._cache_size += 1
        
        # Prevent cache from growing too large - clear completely when full
        if self._cache_size > self.max_cache_size:
            # Clear the entire cache instead of just half
            self._cache.clear()
            self._cache_size = 0
        
        return exists
    
    def clear_cache(self):
        """Clear the existence cache"""
        self._cache.clear()
        self._cache_size = 0

def bulk_upsert_records(records_data, batch_size=100):
    """
    Standalone function for bulk upserting records.
    Returns the number of records processed.
    """
    if not records_data:
        return 0
    
    inserter = BulkRecordInserter(SessionLocal(), batch_size)
    
    try:
        for record_data in records_data:
            inserter.add_record(record_data)
        
        # Flush any remaining records
        final_count = inserter.close()
        return len(records_data)
        
    except Exception as e:
        logger.error(f"Bulk upsert failed: {e}")
        inserter.close()
        return 0 