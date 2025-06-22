#!/usr/bin/env python3
"""
Migration script to add created_at column to existing records.
This script will:
1. Add the created_at column if it doesn't exist
2. Set a default created_at timestamp for existing records without one
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine, text, inspect
from database import get_database_url, SessionLocal, Record

def migrate_add_created_at():
    """Add created_at column to existing records"""
    
    print("🔄 Starting migration to add created_at column...")
    
    # Get database connection
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    # Check if created_at column already exists
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('records')]
    
    if 'created_at' in columns:
        print("✅ created_at column already exists, no migration needed")
        return
    
    print("📝 Adding created_at column to records table...")
    
    # Add the column (SQLite and PostgreSQL compatible)
    try:
        if 'sqlite' in database_url.lower():
            # SQLite syntax
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE records ADD COLUMN created_at DATETIME"))
                conn.commit()
        else:
            # PostgreSQL syntax
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE records ADD COLUMN created_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
        
        print("✅ created_at column added successfully")
        
    except Exception as e:
        print(f"❌ Error adding created_at column: {e}")
        return False
    
    # Set default created_at for existing records (use a reasonable past date)
    print("📅 Setting default created_at for existing records...")
    
    try:
        db = SessionLocal()
        
        # Count records without created_at
        records_without_timestamp = db.query(Record).filter(Record.created_at.is_(None)).count()
        
        if records_without_timestamp > 0:
            print(f"   Found {records_without_timestamp} records without created_at timestamp")
            
            # Set a default timestamp (e.g., 1 week ago) for existing records
            default_timestamp = datetime.now(timezone.utc).replace(day=1)  # Beginning of current month
            
            # Update all records without created_at
            updated = db.query(Record).filter(Record.created_at.is_(None)).update(
                {Record.created_at: default_timestamp},
                synchronize_session=False
            )
            
            db.commit()
            print(f"✅ Set default created_at timestamp for {updated} existing records")
            print(f"   Default timestamp: {default_timestamp.isoformat()}")
        else:
            print("   All records already have created_at timestamps")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error setting default timestamps: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False
    
    print("🎉 Migration completed successfully!")
    return True

if __name__ == "__main__":
    success = migrate_add_created_at()
    sys.exit(0 if success else 1) 