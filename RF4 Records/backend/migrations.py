"""
Database migrations for RF4 Records
"""

from sqlalchemy.orm import Session
from database import SessionLocal, CafeOrder
import logging

logger = logging.getLogger(__name__)

def migrate_yana_to_yama():
    """
    Migration: Update all cafe orders entries from 'Yana River' to 'Yama River'
    """
    db = SessionLocal()
    try:
        # Find all records with 'Yana River' location
        yana_orders = db.query(CafeOrder).filter(CafeOrder.location == 'Yana River').all()
        
        if not yana_orders:
            print("Migration: No 'Yana River' orders found to update", flush=True)
            return
        
        print(f"Migration: Found {len(yana_orders)} orders with 'Yana River' location", flush=True)
        
        # Update all found records
        updated_count = db.query(CafeOrder).filter(
            CafeOrder.location == 'Yana River'
        ).update({
            CafeOrder.location: 'Yama River'
        })
        
        db.commit()
        print(f"Migration: Successfully updated {updated_count} orders from 'Yana River' to 'Yama River'", flush=True)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Migration failed: {e}")
        print(f"Migration: Error updating Yana River to Yama River: {e}", flush=True)
    finally:
        db.close()

def run_migrations():
    """
    Run all pending migrations
    """
    print("Running database migrations...", flush=True)
    
    # Run the Yana to Yama migration
    migrate_yana_to_yama()
    
    print("Database migrations completed", flush=True)