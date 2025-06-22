#!/usr/bin/env python3
"""
Database maintenance script for PostgreSQL optimization.
Performs VACUUM, ANALYZE, and REINDEX operations to maintain performance.
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine, text, inspect
from database import get_database_url

def run_database_maintenance():
    """Run database maintenance operations"""
    
    print("🧹 Starting database maintenance...")
    
    # Get database connection
    database_url = get_database_url()
    print(f"🗄️  Database: {database_url.split('@')[0] if '@' in database_url else database_url}")
    
    engine = create_engine(database_url)
    
    try:
        # Check if we're using PostgreSQL
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            print("ℹ️  Not using PostgreSQL, maintenance not needed")
            return True
        
        # Check if records table exists
        inspector = inspect(engine)
        if 'records' not in inspector.get_table_names():
            print("ℹ️  Records table doesn't exist, no maintenance needed")
            return True
        
        print("🔧 Running PostgreSQL maintenance operations...")
        
        # Get table size before maintenance
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('records')) as total_size,
                    pg_size_pretty(pg_relation_size('records')) as table_size,
                    pg_size_pretty(pg_indexes_size('records')) as index_size
            """))
            size_before = result.fetchone()
            
            print(f"📊 Table size before maintenance:")
            print(f"  Total: {size_before[0]}")
            print(f"  Table: {size_before[1]}")
            print(f"  Indexes: {size_before[2]}")
        
        maintenance_operations = [
            {
                'name': 'VACUUM ANALYZE',
                'sql': 'VACUUM ANALYZE records',
                'description': 'Remove dead tuples and update statistics'
            },
            {
                'name': 'REINDEX',
                'sql': 'REINDEX TABLE records',
                'description': 'Rebuild indexes for optimal performance'
            }
        ]
        
        # Note: We need separate connections for each operation due to PostgreSQL transaction requirements
        for operation in maintenance_operations:
            try:
                print(f"  🔨 Running {operation['name']} - {operation['description']}")
                
                # Create a new connection for each maintenance operation
                with engine.connect() as conn:
                    # Set autocommit mode for VACUUM operations
                    conn.execute(text("COMMIT"))
                    conn.execute(text(operation['sql']))
                
                print(f"  ✅ {operation['name']} completed")
                
            except Exception as e:
                print(f"  ❌ {operation['name']} failed: {e}")
                # Continue with other operations
                continue
        
        # Get table size after maintenance
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('records')) as total_size,
                    pg_size_pretty(pg_relation_size('records')) as table_size,
                    pg_size_pretty(pg_indexes_size('records')) as index_size
            """))
            size_after = result.fetchone()
            
            print(f"\n📊 Table size after maintenance:")
            print(f"  Total: {size_after[0]}")
            print(f"  Table: {size_after[1]}")
            print(f"  Indexes: {size_after[2]}")
        
        # Get index usage statistics
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    indexrelname as indexname,
                    idx_scan as scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes 
                WHERE relname = 'records'
                ORDER BY idx_scan DESC
            """))
            
            index_stats = result.fetchall()
            
            if index_stats:
                print(f"\n📈 Index usage statistics:")
                for stat in index_stats:
                    print(f"  {stat[0]}: {stat[1]} scans, {stat[2]} reads, {stat[3]} fetches")
            else:
                print(f"\n📈 No index usage statistics available yet")
        
        print(f"\n🎉 Database maintenance completed successfully!")
        print(f"💡 Recommendations:")
        print(f"  - Run this maintenance weekly during low-traffic periods")
        print(f"  - Monitor index usage to identify unused indexes")
        print(f"  - Consider partitioning if table grows beyond 10M records")
        
        return True
        
    except Exception as e:
        print(f"❌ Database maintenance failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = run_database_maintenance()
    if success:
        print("✅ Database maintenance completed successfully")
    else:
        print("❌ Database maintenance failed")
    sys.exit(0 if success else 1) 