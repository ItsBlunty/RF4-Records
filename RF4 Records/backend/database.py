from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    func,
    Index,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import os

Base = declarative_base()


class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True)
    player = Column(String, index=True)  # Index for player filtering
    fish = Column(String, index=True)  # Index for fish filtering
    weight = Column(Integer, index=True)  # Index for weight sorting
    waterbody = Column(String, index=True)  # Index for waterbody filtering
    bait = Column(String)  # Keep for backward compatibility
    bait1 = Column(String, index=True)  # Index for bait filtering
    bait2 = Column(String)
    date = Column(String, index=True)  # Index for date sorting
    created_at = Column(
        DateTime, server_default=func.now(), index=True
    )  # Index for recent records
    region = Column(String, index=True)  # Index for region filtering
    category = Column(String, index=True)  # Index for category filtering
    trophy_class = Column(
        String, index=True
    )  # Trophy classification: 'record', 'trophy', 'normal'

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("idx_fish_weight", "fish", "weight"),  # Fish leaderboards
        Index("idx_waterbody_fish", "waterbody", "fish"),  # Location-specific records
        Index("idx_region_fish", "region", "fish"),  # Region-specific records
        Index(
            "idx_created_desc", "created_at", postgresql_using="btree"
        ),  # Recent records
    )


class QADataset(Base):
    __tablename__ = "qa_dataset"
    id = Column(Integer, primary_key=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    topic = Column(String, index=True)
    tags = Column(String)  # Comma-separated tags
    source = Column(String)
    original_poster = Column(String)  # Who posted the question/answer
    post_link = Column(String)  # Link to the original post
    date_added = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    # Simple indexes that work on all databases
    __table_args__ = (
        Index("idx_qa_topic", "topic"),
        Index("idx_qa_date", "date_added"),
    )


class CafeOrder(Base):
    __tablename__ = "cafe_orders"
    id = Column(Integer, primary_key=True)
    fish_name = Column(String, nullable=False, index=True)
    location = Column(String, nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    mass = Column(String, nullable=False)  # Store as string to preserve units (g/kg)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("idx_cafe_fish_location", "fish_name", "location"),
        Index("idx_cafe_location_fish", "location", "fish_name"),
    )


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True)
    type = Column(String, nullable=False, index=True)  # 'feedback' or 'issue'
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    user_info = Column(String)  # Optional user identifier/email
    page_url = Column(String)  # Which page they were on
    user_agent = Column(String)  # Browser info for debugging
    ip_address = Column(String)  # For spam detection
    status = Column(
        String, default="new", index=True
    )  # 'new', 'reviewing', 'resolved', 'closed'
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Index for common queries
    __table_args__ = (
        Index("idx_feedback_type_status", "type", "status"),
        Index("idx_feedback_created", "created_at"),
    )


class PollVote(Base):
    __tablename__ = "poll_votes"
    id = Column(Integer, primary_key=True)
    poll_id = Column(String, nullable=False, index=True)  # Identifier for the poll
    choice = Column(String, nullable=False)  # The choice they voted for
    ip_address = Column(
        String, nullable=False, index=True
    )  # IP for duplicate prevention
    user_agent = Column(String)  # Browser info for additional tracking
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Index for common queries
    __table_args__ = (
        Index("idx_poll_ip", "poll_id", "ip_address"),  # Check if IP already voted
        Index("idx_poll_choice", "poll_id", "choice"),  # Count votes by choice
    )


# Database configuration
def get_database_url():
    """Get database URL from environment or use default SQLite"""
    # Check for Railway PostgreSQL URL
    if "DATABASE_URL" in os.environ:
        return os.environ["DATABASE_URL"]

    # Check for other PostgreSQL URLs
    if "POSTGRES_URL" in os.environ:
        return os.environ["POSTGRES_URL"]

    # Check for individual PostgreSQL environment variables (for local development)
    if all(
        var in os.environ
        for var in ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"]
    ):
        host = os.environ["PGHOST"]
        port = os.environ["PGPORT"]
        database = os.environ["PGDATABASE"]
        user = os.environ["PGUSER"]
        password = os.environ["PGPASSWORD"]
        return f"postgresql://{user}:{password}@{host}:{port}/{database}"

    # Use persistent volume on Railway if available, otherwise local SQLite
    if "RAILWAY_VOLUME_MOUNT_PATH" in os.environ:
        # Railway persistent volume - store database in mounted volume
        volume_path = os.environ["RAILWAY_VOLUME_MOUNT_PATH"]
        db_path = os.path.join(volume_path, "rf4_records.db")
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


if __name__ == "__main__":
    create_tables()
