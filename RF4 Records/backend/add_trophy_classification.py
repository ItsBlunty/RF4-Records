#!/usr/bin/env python3
"""
Database migration to add trophy classification column and backfill existing records.

This script:
1. Adds the trophy_class column to the records table
2. Backfills existing records with appropriate trophy classification
3. Creates an index on the new column for performance
"""

import sys
import os
from sqlalchemy import create_engine, text, Column, String
from sqlalchemy.orm import sessionmaker
from database import get_database_url, SessionLocal, Record
from trophy_classifier import classify_trophy
import time

def add_trophy_column():
    """Add the trophy_class column to the records table"""
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            if 'postgresql' in database_url.lower():
                result = conn.execute(text("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'records' AND column_name = 'trophy_class'
                """))
            else:  # SQLite
                result = conn.execute(text("""
                    SELECT COUNT(*) 
                    FROM pragma_table_info('records') 
                    WHERE name = 'trophy_class'
                """))
            
            if result.scalar() > 0:
                print("✅ trophy_class column already exists")
                return True
            
            # Add the column
            print("📝 Adding trophy_class column to records table...")
            conn.execute(text("ALTER TABLE records ADD COLUMN trophy_class VARCHAR"))
            conn.commit()
            
            # Create index
            print("🔍 Creating index on trophy_class column...")
            conn.execute(text("CREATE INDEX idx_trophy_class ON records (trophy_class)"))
            conn.commit()
            
            print("✅ Trophy classification column added successfully")
            return True
            
    except Exception as e:
        print(f"❌ Error adding trophy_class column: {e}")
        return False

def backfill_trophy_classifications():
    """Backfill existing records with trophy classifications"""
    print("🔄 Starting trophy classification backfill...")
    
    session = SessionLocal()
    try:
        # Get total count for progress tracking
        total_records = session.query(Record).count()
        print(f"📊 Found {total_records:,} records to classify")
        
        if total_records == 0:
            print("✅ No records to classify")
            return True
        
        # Process records in batches
        batch_size = 1000
        processed = 0
        start_time = time.time()
        
        # Get records without trophy classification
        records_query = session.query(Record).filter(
            (Record.trophy_class.is_(None)) | (Record.trophy_class == '')
        )
        
        records_to_update = records_query.count()
        print(f"🎯 {records_to_update:,} records need classification")
        
        if records_to_update == 0:
            print("✅ All records already classified")
            return True
        
        # Process in batches
        offset = 0
        while offset < records_to_update:
            batch = records_query.offset(offset).limit(batch_size).all()
            
            if not batch:
                break
            
            # Classify each record in the batch
            for record in batch:
                if record.fish and record.weight:
                    classification = classify_trophy(record.fish, record.weight)
                    record.trophy_class = classification
                else:
                    # Records without fish name or weight default to normal
                    record.trophy_class = 'normal'
            
            # Commit the batch
            session.commit()
            processed += len(batch)
            
            # Progress update
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = records_to_update - processed
            eta = remaining / rate if rate > 0 else 0
            
            print(f"⏳ Processed {processed:,}/{records_to_update:,} records "
                  f"({processed/records_to_update*100:.1f}%) - "
                  f"{rate:.0f} records/sec - ETA: {eta:.0f}s")
            
            offset += batch_size
        
        print(f"✅ Trophy classification backfill completed!")
        print(f"📈 Processed {processed:,} records in {time.time() - start_time:.1f} seconds")
        
        # Show classification summary
        print("\n📊 Classification Summary:")
        for classification in ['record', 'trophy', 'normal']:
            count = session.query(Record).filter(Record.trophy_class == classification).count()
            percentage = (count / total_records * 100) if total_records > 0 else 0
            print(f"   {classification.title()}: {count:,} records ({percentage:.1f}%)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during backfill: {e}")
        session.rollback()
        return False
    finally:
        session.close()

def verify_migration():
    """Verify the migration completed successfully"""
    print("\n🔍 Verifying migration...")
    
    session = SessionLocal()
    try:
        # Check that all records have classifications
        unclassified = session.query(Record).filter(
            (Record.trophy_class.is_(None)) | (Record.trophy_class == '')
        ).count()
        
        total = session.query(Record).count()
        
        if unclassified == 0:
            print(f"✅ All {total:,} records have trophy classifications")
        else:
            print(f"⚠️  {unclassified:,} records still need classification")
        
        # Sample some records
        print("\n🎯 Sample classifications:")
        sample_records = session.query(Record).filter(
            Record.trophy_class.isnot(None)
        ).limit(5).all()
        
        for record in sample_records:
            print(f"   {record.fish} ({record.weight}g) -> {record.trophy_class}")
        
        return unclassified == 0
        
    finally:
        session.close()

def main():
    """Run the complete migration"""
    print("🚀 Starting trophy classification migration...\n")
    
    # Step 1: Add the column
    if not add_trophy_column():
        print("❌ Failed to add trophy_class column")
        sys.exit(1)
    
    # Step 2: Backfill existing records
    if not backfill_trophy_classifications():
        print("❌ Failed to backfill trophy classifications")
        sys.exit(1)
    
    # Step 3: Verify migration
    if not verify_migration():
        print("❌ Migration verification failed")
        sys.exit(1)
    
    print("\n🎉 Trophy classification migration completed successfully!")

if __name__ == "__main__":
    main()