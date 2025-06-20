from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class Record(Base):
    __tablename__ = 'records'
    id = Column(Integer, primary_key=True)
    player = Column(String)
    fish = Column(String)
    weight = Column(Integer)  # Store weight in grams as integers
    waterbody = Column(String)
    bait = Column(String)  # Keep for backward compatibility
    bait1 = Column(String)  # Primary bait for sandwich baits
    bait2 = Column(String)  # Secondary bait for sandwich baits (None if single bait)
    date = Column(String)  # Use String for now, can convert to DateTime if format is known
    region = Column(String)  # Add region field to track which region the record is from
    category = Column(String)  # Add category field to track fishing type (normal, ultralight, light, bottomlight, telescopic)

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
    Base.metadata.create_all(bind=engine)

if __name__ == '__main__':
    create_tables() 