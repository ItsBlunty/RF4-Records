#!/usr/bin/env python3
"""
Migration script to split sandwich baits into separate bait1 and bait2 fields
"""

from database import SessionLocal, Record, engine
from sqlalchemy import text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def split_bait_string(bait_string):
    """Split a bait string into primary and secondary baits"""
    if not bait_string:
        return None, None
    
    # First check for semicolon (old format) and convert to plus sign
    if ';' in bait_string:
        parts = bait_string.split(';', 1)  # Split on first semicolon only
        bait1 = parts[0].strip()
        bait2 = parts[1].strip() if len(parts) > 1 else None
        # Update the original bait string to use plus sign
        if bait2:
            bait_string = f"{bait1} + {bait2}"
    
    # Now check for plus sign (new format)
    if '+' in bait_string:
        parts = bait_string.split('+', 1)  # Split on first plus sign only
        bait1 = parts[0].strip()
        bait2 = parts[1].strip() if len(parts) > 1 else None
        return bait1, bait2
    else:
        # Single bait
        return bait_string.strip(), None

def migrate_sandwich_baits():
    """Migrate existing sandwich baits to separate fields"""
    logger.info("Starting sandwich bait migration...")
    
    # First, add the new columns if they don't exist
    try:
        with engine.connect() as conn:
            # Check if columns exist
            result = conn.execute(text("PRAGMA table_info(records)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'bait1' not in columns:
                logger.info("Adding bait1 column...")
                conn.execute(text("ALTER TABLE records ADD COLUMN bait1 TEXT"))
                conn.commit()
            
            if 'bait2' not in columns:
                logger.info("Adding bait2 column...")
                conn.execute(text("ALTER TABLE records ADD COLUMN bait2 TEXT"))
                conn.commit()
                
        logger.info("Database schema updated successfully")
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        return False
    
    # Now migrate the data
    db = SessionLocal()
    try:
        # Get all records
        total_records = db.query(Record).count()
        logger.info(f"Processing {total_records} records...")
        
        # Process in batches to avoid memory issues
        batch_size = 1000
        processed = 0
        updated = 0
        
        for offset in range(0, total_records, batch_size):
            records = db.query(Record).offset(offset).limit(batch_size).all()
            
            for record in records:
                if record.bait:
                    bait1, bait2 = split_bait_string(record.bait)
                    record.bait1 = bait1
                    record.bait2 = bait2
                    # Update the original bait field to use plus sign format
                    if bait2:
                        record.bait = f"{bait1} + {bait2}"
                    else:
                        record.bait = bait1
                    updated += 1
                
                processed += 1
                
                if processed % 1000 == 0:
                    logger.info(f"Processed {processed}/{total_records} records...")
            
            # Commit each batch
            db.commit()
        
        logger.info(f"Migration completed! Updated {updated} records out of {total_records} total records")
        
        # Verify the migration
        sandwich_records = db.query(Record).filter(Record.bait2.isnot(None)).count()
        single_bait_records = db.query(Record).filter(Record.bait1.isnot(None), Record.bait2.is_(None)).count()
        
        logger.info(f"Verification:")
        logger.info(f"  - Records with sandwich baits (bait2 not null): {sandwich_records}")
        logger.info(f"  - Records with single baits (bait2 is null): {single_bait_records}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def verify_migration():
    """Verify that the migration worked correctly"""
    logger.info("Verifying migration...")
    
    db = SessionLocal()
    try:
        # Check some sample sandwich baits
        sandwich_records = db.query(Record).filter(Record.bait2.isnot(None)).limit(5).all()
        
        logger.info("Sample sandwich bait records after migration:")
        for record in sandwich_records:
            logger.info(f"  Original: {record.bait}")
            logger.info(f"  Bait1: {record.bait1}")
            logger.info(f"  Bait2: {record.bait2}")
            logger.info("  ---")
        
        # Check some single bait records
        single_records = db.query(Record).filter(Record.bait1.isnot(None), Record.bait2.is_(None)).limit(3).all()
        
        logger.info("Sample single bait records after migration:")
        for record in single_records:
            logger.info(f"  Original: {record.bait}")
            logger.info(f"  Bait1: {record.bait1}")
            logger.info(f"  Bait2: {record.bait2}")
            logger.info("  ---")
            
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("SANDWICH BAIT MIGRATION")
    print("=" * 60)
    
    success = migrate_sandwich_baits()
    
    if success:
        print("\n✅ Migration completed successfully!")
        verify_migration()
    else:
        print("\n❌ Migration failed!")
    
    print("=" * 60) 