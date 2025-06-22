#!/usr/bin/env python3
"""
Production migration script to add created_at column.
This script is safe to run multiple times and works with both SQLite and PostgreSQL.
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine, text, inspect, MetaData
from database import get_database_url, SessionLocal, Record, Base

def migrate_production():
    """Add created_at column to production database"""
    
    print("🔄 Starting production migration to add created_at column...")
    
    # Get database connection
    database_url = get_database_url()
    print(f"🗄️  Database: {database_url.split('@')[0] if '@' in database_url else database_url}")
    
    # Set connection timeout to prevent hanging during deployments
    connect_args = {}
    if 'postgresql' in database_url.lower() or 'postgres' in database_url.lower():
        connect_args['connect_timeout'] = 10
    
    engine = create_engine(database_url, connect_args=connect_args)
    
    try:
        # Check if created_at column already exists
        inspector = inspect(engine)
        
        # Check if records table exists
        if 'records' not in inspector.get_table_names():
            print("📝 Records table doesn't exist, creating all tables...")
            Base.metadata.create_all(bind=engine)
            print("✅ All tables created successfully")
            return True
            
        columns = [col['name'] for col in inspector.get_columns('records')]
        
        if 'created_at' in columns:
            print("✅ created_at column already exists, no migration needed")
            return True
        
        print("📝 Adding created_at column to records table...")
        
        # Add the column (PostgreSQL and SQLite compatible)
        with engine.connect() as conn:
            if 'postgresql' in database_url.lower() or 'postgres' in database_url.lower():
                # PostgreSQL syntax
                conn.execute(text("ALTER TABLE records ADD COLUMN created_at TIMESTAMP WITH TIME ZONE"))
                print("✅ created_at column added (PostgreSQL)")
            else:
                # SQLite syntax
                conn.execute(text("ALTER TABLE records ADD COLUMN created_at DATETIME"))
                print("✅ created_at column added (SQLite)")
            
            conn.commit()
        
        # Set default created_at for existing records
        print("📅 Setting default created_at for existing records...")
        
        db = SessionLocal()
        try:
            # Count records without created_at
            records_without_timestamp = db.query(Record).filter(Record.created_at.is_(None)).count()
            
            if records_without_timestamp > 0:
                print(f"   Found {records_without_timestamp} records without created_at timestamp")
                
                # Set a default timestamp (beginning of current month) for existing records
                default_timestamp = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                
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
                
        finally:
            db.close()
        
        print("🎉 Production migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = migrate_production()
    if success:
        print("✅ Migration completed - server can now start normally")
    else:
        print("❌ Migration failed - manual intervention may be required")
    sys.exit(0 if success else 1) 