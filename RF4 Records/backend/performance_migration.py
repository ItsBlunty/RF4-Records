#!/usr/bin/env python3
"""
Performance migration script to add database indexes on existing Railway deployment.
Run this once to add indexes to improve query performance.
"""

from database import get_database_url, Record
from sqlalchemy import create_engine, text, Index
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_performance_indexes():
    """Add performance indexes to existing database"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url, connect_args={'connect_timeout': 120})
        
        logger.info("🔧 Starting performance index migration...")
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Check if indexes already exist to avoid errors
                if 'postgresql' in database_url.lower():
                    # PostgreSQL index creation
                    indexes_to_create = [
                        ("idx_records_player", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_player ON records (player)"),
                        ("idx_records_fish", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_fish ON records (fish)"),
                        ("idx_records_weight", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_weight ON records (weight)"),
                        ("idx_records_waterbody", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_waterbody ON records (waterbody)"),
                        ("idx_records_bait1", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_bait1 ON records (bait1)"),
                        ("idx_records_date", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_date ON records (date)"),
                        ("idx_records_created_at", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_created_at ON records (created_at)"),
                        ("idx_records_region", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_region ON records (region)"),
                        ("idx_records_category", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_category ON records (category)"),
                        # Composite indexes for common queries
                        ("idx_records_fish_weight", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_fish_weight ON records (fish, weight)"),
                        ("idx_records_waterbody_fish", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_waterbody_fish ON records (waterbody, fish)"),
                        ("idx_records_region_fish", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_region_fish ON records (region, fish)"),
                        ("idx_records_created_desc", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_created_desc ON records (created_at DESC)"),
                    ]
                    
                    # Create indexes one by one
                    for index_name, create_sql in indexes_to_create:
                        try:
                            logger.info(f"Creating index: {index_name}")
                            conn.execute(text(create_sql))
                            logger.info(f"✅ Created index: {index_name}")
                        except Exception as e:
                            if "already exists" in str(e).lower():
                                logger.info(f"ℹ️  Index {index_name} already exists")
                            else:
                                logger.error(f"❌ Failed to create index {index_name}: {e}")
                
                else:
                    # SQLite index creation
                    indexes_to_create = [
                        ("idx_records_player", "CREATE INDEX IF NOT EXISTS idx_records_player ON records (player)"),
                        ("idx_records_fish", "CREATE INDEX IF NOT EXISTS idx_records_fish ON records (fish)"),
                        ("idx_records_weight", "CREATE INDEX IF NOT EXISTS idx_records_weight ON records (weight)"),
                        ("idx_records_waterbody", "CREATE INDEX IF NOT EXISTS idx_records_waterbody ON records (waterbody)"),
                        ("idx_records_bait1", "CREATE INDEX IF NOT EXISTS idx_records_bait1 ON records (bait1)"),
                        ("idx_records_date", "CREATE INDEX IF NOT EXISTS idx_records_date ON records (date)"),
                        ("idx_records_created_at", "CREATE INDEX IF NOT EXISTS idx_records_created_at ON records (created_at)"),
                        ("idx_records_region", "CREATE INDEX IF NOT EXISTS idx_records_region ON records (region)"),
                        ("idx_records_category", "CREATE INDEX IF NOT EXISTS idx_records_category ON records (category)"),
                        # Composite indexes
                        ("idx_records_fish_weight", "CREATE INDEX IF NOT EXISTS idx_records_fish_weight ON records (fish, weight)"),
                        ("idx_records_waterbody_fish", "CREATE INDEX IF NOT EXISTS idx_records_waterbody_fish ON records (waterbody, fish)"),
                        ("idx_records_region_fish", "CREATE INDEX IF NOT EXISTS idx_records_region_fish ON records (region, fish)"),
                        ("idx_records_created_desc", "CREATE INDEX IF NOT EXISTS idx_records_created_desc ON records (created_at DESC)"),
                    ]
                    
                    for index_name, create_sql in indexes_to_create:
                        try:
                            logger.info(f"Creating index: {index_name}")
                            conn.execute(text(create_sql))
                            logger.info(f"✅ Created index: {index_name}")
                        except Exception as e:
                            logger.error(f"❌ Failed to create index {index_name}: {e}")
                
                # Commit transaction
                trans.commit()
                logger.info("🎉 Performance index migration completed successfully!")
                
                # Analyze tables to update statistics
                if 'postgresql' in database_url.lower():
                    logger.info("📊 Updating table statistics...")
                    conn.execute(text("ANALYZE records"))
                    logger.info("✅ Table statistics updated")
                
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Migration failed, rolled back: {e}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Migration setup failed: {e}")
        return False

def verify_indexes():
    """Verify that indexes were created successfully"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        
        logger.info("🔍 Verifying indexes...")
        
        with engine.connect() as conn:
            if 'postgresql' in database_url.lower():
                # PostgreSQL index verification
                result = conn.execute(text("""
                    SELECT indexname, tablename 
                    FROM pg_indexes 
                    WHERE tablename = 'records' 
                    AND indexname LIKE 'idx_records_%'
                    ORDER BY indexname
                """))
                
                indexes = result.fetchall()
                logger.info(f"📋 Found {len(indexes)} performance indexes:")
                for idx in indexes:
                    logger.info(f"  - {idx[0]}")
                
            else:
                # SQLite index verification
                result = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type = 'index' 
                    AND tbl_name = 'records'
                    AND name LIKE 'idx_records_%'
                    ORDER BY name
                """))
                
                indexes = result.fetchall()
                logger.info(f"📋 Found {len(indexes)} performance indexes:")
                for idx in indexes:
                    logger.info(f"  - {idx[0]}")
                    
        return True
        
    except Exception as e:
        logger.error(f"❌ Index verification failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting performance optimization migration")
    
    # Add indexes
    success = add_performance_indexes()
    
    if success:
        # Verify indexes
        verify_indexes()
        logger.info("✅ Performance migration completed successfully!")
        logger.info("🎯 Database queries should now be significantly faster")
    else:
        logger.error("❌ Performance migration failed")
        exit(1)