#!/usr/bin/env python3
"""
Migration script to add 'categories' column to existing records table.
This enables the scraper to work with merged records.
"""

import os
import sys
from sqlalchemy import create_engine, text
from database import get_database_url

def add_categories_column():
    """Add categories column to records table if it doesn't exist"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        
        print(f"🔧 Adding categories column to database...")
        print(f"Database: {database_url}")
        
        with engine.connect() as conn:
            # Check if column already exists
            if 'postgresql' in database_url.lower() or 'postgres' in database_url.lower():
                # PostgreSQL
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'records' AND column_name = 'categories'
                """))
                column_exists = result.fetchone() is not None
                
                if not column_exists:
                    print("Adding categories column to PostgreSQL...")
                    conn.execute(text("ALTER TABLE records ADD COLUMN categories VARCHAR"))
                    conn.commit()
                    print("✅ Categories column added successfully")
                else:
                    print("✅ Categories column already exists")
                    
            else:
                # SQLite
                result = conn.execute(text("PRAGMA table_info(records)"))
                columns = [row[1] for row in result.fetchall()]
                
                if 'categories' not in columns:
                    print("Adding categories column to SQLite...")
                    conn.execute(text("ALTER TABLE records ADD COLUMN categories TEXT"))
                    conn.commit()
                    print("✅ Categories column added successfully")
                else:
                    print("✅ Categories column already exists")
            
            # Get record count
            result = conn.execute(text("SELECT COUNT(*) FROM records"))
            record_count = result.scalar()
            print(f"📊 Database has {record_count:,} records")
            
            # Check how many records have categories vs category
            result = conn.execute(text("SELECT COUNT(*) FROM records WHERE categories IS NOT NULL AND categories != ''"))
            merged_records = result.scalar()
            
            result = conn.execute(text("SELECT COUNT(*) FROM records WHERE category IS NOT NULL AND category != ''"))
            old_format_records = result.scalar()
            
            print(f"📊 Records with merged categories: {merged_records:,}")
            print(f"📊 Records with old category format: {old_format_records:,}")
            
        print("🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = add_categories_column()
    sys.exit(0 if success else 1) 