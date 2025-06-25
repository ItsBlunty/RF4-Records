#!/usr/bin/env python3
"""
Database migration script to merge duplicate records and combine categories.
Eliminates the need for frontend deduplication by storing combined categories.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from database import get_database_url, Record, SessionLocal
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def merge_duplicate_records():
    """Merge duplicate records and combine categories into single field"""
    
    print("🔄 Starting duplicate record merger for Railway production...")
    
    # Get database connection
    database_url = get_database_url()
    print(f"🗄️  Database: {database_url.split('@')[0] if '@' in database_url else 'Local SQLite'}")
    
    # Set connection timeout for Railway
    connect_args = {}
    if 'postgresql' in database_url.lower() or 'postgres' in database_url.lower():
        connect_args['connect_timeout'] = 60  # Longer timeout for migration
    
    engine = create_engine(database_url, connect_args=connect_args)
    
    try:
        # Check if records table exists
        inspector = inspect(engine)
        if 'records' not in inspector.get_table_names():
            print("❌ Records table doesn't exist")
            return False
        
        # Get initial record count
        db = SessionLocal()
        initial_count = db.query(Record).count()
        print(f"📊 Initial record count: {initial_count:,}")
        
        # Category mapping
        category_mapping = {
            'normal': 'N',
            'light': 'L', 
            'ultralight': 'U',
            'bottomlight': 'B',
            'telescopic': 'T'
        }
        
        print(f"🏷️  Category mapping: {category_mapping}")
        
        # Step 1: Find all unique record combinations (excluding category)
        print("\n🔍 Step 1: Identifying duplicate records...")
        
        # Get all records grouped by unique combination
        records = db.query(Record).all()
        
        record_groups = {}
        for record in records:
            # Create key for grouping (all fields except id, created_at, and category)
            key = (
                record.player,
                record.fish, 
                record.weight,
                record.waterbody,
                record.bait,
                record.bait1,
                record.bait2,
                record.date,
                record.region
            )
            
            if key not in record_groups:
                record_groups[key] = []
            record_groups[key].append(record)
        
        # Count duplicates
        duplicate_groups = {k: v for k, v in record_groups.items() if len(v) > 1}
        single_records = {k: v for k, v in record_groups.items() if len(v) == 1}
        
        print(f"📈 Found {len(duplicate_groups):,} groups with duplicates")
        print(f"📈 Found {len(single_records):,} unique records")
        
        # Step 2: Process duplicate groups
        print("\n🔄 Step 2: Merging duplicate records...")
        
        merged_count = 0
        deleted_count = 0
        
        for key, group_records in duplicate_groups.items():
            try:
                # Collect all categories for this group
                categories = []
                for record in group_records:
                    if record.category:
                        category_normalized = record.category.lower().strip()
                        if category_normalized in category_mapping:
                            category_code = category_mapping[category_normalized]
                            if category_code not in categories:
                                categories.append(category_code)
                
                # Sort categories for consistent ordering
                categories.sort()
                combined_category = ';'.join(categories) if categories else 'N'  # Default to Normal if no valid categories
                
                # Keep the first record and update its category
                primary_record = group_records[0]
                primary_record.category = combined_category
                
                # Delete the duplicate records
                for duplicate_record in group_records[1:]:
                    db.delete(duplicate_record)
                    deleted_count += 1
                
                merged_count += 1
                
                # Commit in batches to avoid memory issues
                if merged_count % 1000 == 0:
                    db.commit()
                    print(f"  Processed {merged_count:,} groups, deleted {deleted_count:,} duplicates...")
                
            except Exception as e:
                logger.error(f"Error processing group: {e}")
                db.rollback()
                continue
        
        # Step 3: Update single records to use new category format
        print("\n🏷️  Step 3: Updating single record categories...")
        
        updated_singles = 0
        for key, group_records in single_records.items():
            try:
                record = group_records[0]
                if record.category:
                    category_normalized = record.category.lower().strip()
                    if category_normalized in category_mapping:
                        record.category = category_mapping[category_normalized]
                        updated_singles += 1
                    else:
                        record.category = 'N'  # Default to Normal for unknown categories
                        updated_singles += 1
                else:
                    record.category = 'N'  # Default to Normal for null categories
                    updated_singles += 1
                
                # Commit in batches
                if updated_singles % 1000 == 0:
                    db.commit()
                    print(f"  Updated {updated_singles:,} single records...")
                    
            except Exception as e:
                logger.error(f"Error updating single record: {e}")
                continue
        
        # Final commit
        db.commit()
        
        # Get final record count
        final_count = db.query(Record).count()
        
        print(f"\n📊 Migration Summary:")
        print(f"  Initial records: {initial_count:,}")
        print(f"  Final records: {final_count:,}")
        print(f"  Records deleted: {deleted_count:,}")
        print(f"  Groups merged: {merged_count:,}")
        print(f"  Singles updated: {updated_singles:,}")
        print(f"  Space saved: {((initial_count - final_count) / initial_count * 100):.1f}%")
        
        # Step 4: Show sample of new category format
        print(f"\n📋 Sample of merged categories:")
        sample_records = db.query(Record).filter(Record.category.contains(';')).limit(10).all()
        
        for record in sample_records:
            print(f"  {record.fish} ({record.weight}g) - Categories: {record.category}")
        
        db.close()
        
        print(f"\n🎉 Record merger completed successfully!")
        print(f"💡 Frontend deduplication is no longer needed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Record merger failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

def verify_migration():
    """Verify the migration was successful"""
    
    print("\n🔍 Verifying migration results...")
    
    db = SessionLocal()
    
    try:
        # Check total records
        total_records = db.query(Record).count()
        print(f"📊 Total records after migration: {total_records:,}")
        
        # Check category distribution
        with db.bind.connect() as conn:
            result = conn.execute(text("""
                SELECT category, COUNT(*) as count
                FROM records 
                WHERE category IS NOT NULL
                GROUP BY category 
                ORDER BY count DESC
                LIMIT 20
            """))
            
            categories = result.fetchall()
            
            print(f"\n📈 Top category combinations:")
            for cat, count in categories:
                print(f"  {cat}: {count:,} records")
        
        # Check for any remaining duplicates
        result = db.execute(text("""
            SELECT player, fish, weight, waterbody, bait1, bait2, date, region, COUNT(*) as count
            FROM records 
            GROUP BY player, fish, weight, waterbody, bait1, bait2, date, region
            HAVING COUNT(*) > 1
            LIMIT 5
        """))
        
        remaining_dupes = result.fetchall()
        
        if remaining_dupes:
            print(f"\n⚠️  Found {len(remaining_dupes)} remaining duplicate groups:")
            for dupe in remaining_dupes:
                print(f"  {dupe}")
        else:
            print(f"\n✅ No duplicate records found - migration successful!")
        
        db.close()
        return len(remaining_dupes) == 0
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        db.close()
        return False

if __name__ == "__main__":
    print("🚀 RF4 Records Duplicate Merger - Railway Production")
    print("=" * 60)
    
    success = merge_duplicate_records()
    
    if success:
        verification_success = verify_migration()
        if verification_success:
            print("\n✅ Migration completed and verified successfully!")
            print("🚀 Frontend deduplication can now be removed!")
        else:
            print("\n⚠️  Migration completed but verification found issues")
    else:
        print("\n❌ Migration failed")
    
    sys.exit(0 if success else 1) 