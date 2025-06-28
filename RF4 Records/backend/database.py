from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, func, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import os

Base = declarative_base()

class Record(Base):
    __tablename__ = 'records'
    id = Column(Integer, primary_key=True)
    player = Column(String, index=True)  # Index for player filtering
    fish = Column(String, index=True)    # Index for fish filtering
    weight = Column(Integer, index=True) # Index for weight sorting
    waterbody = Column(String, index=True) # Index for waterbody filtering
    bait = Column(String)  # Keep for backward compatibility
    bait1 = Column(String, index=True)   # Index for bait filtering
    bait2 = Column(String)
    date = Column(String, index=True)    # Index for date sorting
    created_at = Column(DateTime, server_default=func.now(), index=True) # Index for recent records
    region = Column(String, index=True)  # Index for region filtering
    category = Column(String, index=True) # Index for category filtering
    trophy_class = Column(String, index=True) # Trophy classification: 'record', 'trophy', 'normal'
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_fish_weight', 'fish', 'weight'),          # Fish leaderboards
        Index('idx_waterbody_fish', 'waterbody', 'fish'),    # Location-specific records
        Index('idx_region_fish', 'region', 'fish'),          # Region-specific records
        Index('idx_created_desc', 'created_at', postgresql_using='btree'), # Recent records
    )

# Database configuration
def get_database_url():
    """Get database URL from environment or use default SQLite"""
    # Check for Railway PostgreSQL URL
    if 'DATABASE_URL' in os.environ:
        return os.environ['DATABASE_URL']
    
    # Check for other PostgreSQL URLs
    if 'POSTGRES_URL' in os.environ:
        return os.environ['POSTGRES_URL']
    
    # Use persistent volume on Railway if available, otherwise local SQLite
    if 'RAILWAY_VOLUME_MOUNT_PATH' in os.environ:
        # Railway persistent volume - store database in mounted volume
        volume_path = os.environ['RAILWAY_VOLUME_MOUNT_PATH']
        db_path = os.path.join(volume_path, 'rf4_records.db')
        return f"sqlite:///{db_path}"
    
    # Default to SQLite for local development
    return "sqlite:///./rf4_records.db"

# Create engine and session
database_url = get_database_url()
print(f"🗄️  Using database: {database_url}")
engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
def create_tables():
    print("Creating database tables with performance indexes...")
    Base.metadata.create_all(bind=engine)
    print("Database tables and indexes created successfully")

if __name__ == '__main__':
    create_tables() 