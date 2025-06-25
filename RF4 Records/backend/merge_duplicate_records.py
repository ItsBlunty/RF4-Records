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

def merge_duplicate_records(batch_size=5000):
    """Merge duplicate records and combine categories into single field - BATCH PROCESSING"""
    
    print("🔄 Starting BATCH duplicate record merger for Railway production...")
    print(f"📦 Batch size: {batch_size:,} duplicate groups per run")
    
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
        
        # Step 2: Process duplicate groups - LIMITED BATCH SIZE FOR SAFETY
        print(f"\n🔄 Step 2: Merging duplicate records (batch size: {batch_size:,})...")
        
        merged_count = 0
        deleted_count = 0
        
        # Convert to list to allow slicing
        duplicate_items = list(duplicate_groups.items())
        total_duplicates = len(duplicate_items)
        
        # Process only the first batch_size groups
        batch_to_process = duplicate_items[:batch_size]
        remaining_after_batch = total_duplicates - len(batch_to_process)
        
        print(f"📊 Processing {len(batch_to_process):,} groups this run")
        print(f"📊 {remaining_after_batch:,} groups will remain for next run")
        
        for key, group_records in batch_to_process:
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
                
                # Commit in smaller batches to avoid memory issues
                if merged_count % 500 == 0:
                    db.commit()
                    print(f"  Processed {merged_count:,} groups, deleted {deleted_count:,} duplicates...")
                
            except Exception as e:
                logger.error(f"Error processing group: {e}")
                db.rollback()
                continue
        
        # Step 3: Update remaining single records to use new category format
        print("\n🏷️  Step 3: Updating single record categories...")
        
        updated_singles = 0
        
        # Use a direct query to update remaining single category records efficiently
        try:
            # Update records that still have old category format
            for old_cat, new_cat in category_mapping.items():
                result = db.execute(text(f"""
                    UPDATE records 
                    SET category = :new_cat 
                    WHERE category = :old_cat
                """), {"new_cat": new_cat, "old_cat": old_cat})
                updated_singles += result.rowcount
            
            # Set null categories to Normal
            result = db.execute(text("""
                UPDATE records 
                SET category = 'N' 
                WHERE category IS NULL
            """))
            updated_singles += result.rowcount
            
            print(f"  Updated {updated_singles:,} single records with SQL batch update")
            
        except Exception as e:
            logger.error(f"Error updating single records: {e}")
            # Continue anyway as this is not critical
        
        # Final commit
        db.commit()
        
        # Step 4: Database cleanup to reclaim space from deleted records
        print("\n🧹 Step 4: Database cleanup to reclaim space...")
        
        try:
            # Get database connection for maintenance operations
            database_url = get_database_url()
            is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
            
            if is_postgres:
                print("  Running PostgreSQL VACUUM to reclaim space from deleted records...")
                
                # Close the current session before VACUUM
                db.close()
                
                # Create new engine for VACUUM operations
                maintenance_engine = create_engine(database_url, connect_args=connect_args)
                
                with maintenance_engine.connect() as conn:
                    # Get size before VACUUM
                    result = conn.execute(text("""
                        SELECT pg_size_pretty(pg_total_relation_size('records')) as size_before
                    """))
                    size_before = result.fetchone()[0]
                    print(f"  Database size before cleanup: {size_before}")
                    
                    # Run VACUUM to reclaim space
                    conn.execute(text("COMMIT"))  # Ensure we're not in a transaction
                    conn.execute(text("VACUUM records"))
                    
                    # Get size after VACUUM
                    result = conn.execute(text("""
                        SELECT pg_size_pretty(pg_total_relation_size('records')) as size_after
                    """))
                    size_after = result.fetchone()[0]
                    print(f"  Database size after cleanup: {size_after}")
                
                # Reconnect for final operations
                db = SessionLocal()
                
            else:
                print("  SQLite database - space will be reclaimed automatically")
                
        except Exception as e:
            logger.error(f"Database cleanup failed: {e}")
            # Reconnect if cleanup failed
            try:
                db = SessionLocal()
            except:
                pass
        
        # Get final record count
        final_count = db.query(Record).count()
        
        print(f"\n📊 Batch Migration Summary:")
        print(f"  Initial records: {initial_count:,}")
        print(f"  Final records: {final_count:,}")
        print(f"  Records deleted this batch: {deleted_count:,}")
        print(f"  Groups merged this batch: {merged_count:,}")
        print(f"  Singles updated: {updated_singles:,}")
        print(f"  Space saved this batch: {((initial_count - final_count) / initial_count * 100):.1f}%")
        print(f"  Remaining duplicate groups: {remaining_after_batch:,}")
        
        if remaining_after_batch > 0:
            print(f"\n⚠️  BATCH PROCESSING: {remaining_after_batch:,} duplicate groups remain")
            print(f"💡 Run the migration again to process the next {batch_size:,} groups")
        else:
            print(f"\n✅ ALL DUPLICATE GROUPS PROCESSED!")
        
        # Step 5: Show sample of new category format
        print(f"\n📋 Sample of merged categories:")
        sample_records = db.query(Record).filter(Record.category.contains(';')).limit(10).all()
        
        for record in sample_records:
            print(f"  {record.fish} ({record.weight}g) - Categories: {record.category}")
        
        db.close()
        
        if remaining_after_batch > 0:
            print(f"\n🎉 Batch processing completed successfully!")
            print(f"🔄 Run migration again to process remaining {remaining_after_batch:,} groups")
            print(f"📈 Progress: {((total_duplicates - remaining_after_batch) / total_duplicates * 100):.1f}% complete")
        else:
            print(f"\n🎉 ALL DUPLICATE MERGING COMPLETED!")
            print(f"💡 Frontend deduplication is no longer needed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Record merger failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

def check_duplicate_status():
    """Check how many duplicate groups remain without running migration"""
    
    print("🔍 Checking duplicate status...")
    
    db = SessionLocal()
    
    try:
        # Get all records
        records = db.query(Record).all()
        initial_count = len(records)
        
        # Group records by unique combination (excluding category)
        record_groups = {}
        for r in records:
            key = (r.player, r.fish, r.weight, r.waterbody, r.bait, r.bait1, r.bait2, r.date, r.region)
            if key not in record_groups:
                record_groups[key] = []
            record_groups[key].append(r)
        
        # Count duplicates
        duplicate_groups = {k: v for k, v in record_groups.items() if len(v) > 1}
        single_records = {k: v for k, v in record_groups.items() if len(v) == 1}
        
        # Calculate actual record counts
        records_in_duplicate_groups = sum(len(group) for group in duplicate_groups.values())
        records_in_single_groups = sum(len(group) for group in single_records.values())
        total_duplicate_records_to_delete = sum(len(group) - 1 for group in duplicate_groups.values())
        
        print(f"📊 Current Status:")
        print(f"  Total records in database: {initial_count:,}")
        print(f"  Records in {len(duplicate_groups):,} duplicate groups: {records_in_duplicate_groups:,}")
        print(f"  Records in {len(single_records):,} unique groups: {records_in_single_groups:,}")
        print(f"  Total duplicate records to delete: {total_duplicate_records_to_delete:,}")
        print(f"  Final records after full migration: {initial_count - total_duplicate_records_to_delete:,}")
        
        if len(duplicate_groups) > 0:
            batch_groups_to_process = min(5000, len(duplicate_groups))
            batch_records_to_delete = sum(len(group) - 1 for group in list(duplicate_groups.values())[:5000])
            print(f"  Next batch will process: {batch_groups_to_process:,} duplicate groups")
            print(f"  Next batch will delete: {batch_records_to_delete:,} records")
        else:
            print(f"  ✅ No duplicate groups found - migration complete!")
        
        db.close()
        return len(duplicate_groups)
        
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        db.close()
        return -1

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