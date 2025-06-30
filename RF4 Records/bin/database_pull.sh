#!/bin/bash

# RF4 Records Database Pull Script
# Downloads production database from Railway and loads it locally

set -e  # Exit on any error

DUMP_FILENAME='./rf4_records_production_dump.sql'
BACKEND_DIR="./RF4 Records/backend"

echo "🎣 RF4 Records Database Pull"
echo "============================="

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found: $BACKEND_DIR"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Load production environment
echo "📡 Loading production environment..."
if [ ! -f "$BACKEND_DIR/.env.production" ]; then
    echo "❌ Production environment file not found: $BACKEND_DIR/.env.production"
    exit 1
fi

source "$BACKEND_DIR/.env.production" || exit $?
echo "✅ Connected to Railway PostgreSQL: $PGHOST:$PGPORT/$PGDATABASE"

# Create production dump
echo "💾 Creating production database dump..."
echo "   Records: ~174,000+ fishing records"
echo "   Size: Estimated 50-100MB"
pg_dump -U $PGUSER -h $PGHOST -p $PGPORT -w -F t $PGDATABASE > $DUMP_FILENAME

if [ $? -eq 0 ]; then
    DUMP_SIZE=$(du -h $DUMP_FILENAME | cut -f1)
    echo "✅ Production dump created: $DUMP_FILENAME ($DUMP_SIZE)"
else
    echo "❌ Failed to create production dump"
    exit 1
fi

# Load development environment
echo "🔄 Loading development environment..."
if [ ! -f "$BACKEND_DIR/.env.development" ]; then
    echo "❌ Development environment file not found: $BACKEND_DIR/.env.development"
    exit 1
fi

source "$BACKEND_DIR/.env.development" || exit $?
echo "✅ Targeting local PostgreSQL: $PGHOST:$PGPORT/$PGDATABASE"

# Drop and recreate local database
echo "🗑️  Dropping existing local database (if exists)..."
dropdb $PGDATABASE -p $PGPORT -U $PGUSER -h $PGHOST --if-exists

echo "🆕 Creating fresh local database..."
createdb $PGDATABASE -p $PGPORT -U $PGUSER -h $PGHOST

# Restore dump to local database
echo "📥 Restoring production data to local database..."
pg_restore -U $PGUSER -h $PGHOST -p $PGPORT -w -F t -d $PGDATABASE $DUMP_FILENAME

if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    
    # Verify the restore
    echo "🔍 Verifying restore..."
    RECORD_COUNT=$(psql -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE -t -c "SELECT COUNT(*) FROM records;" | xargs)
    echo "   Local database now contains: $RECORD_COUNT records"
    
    # Clean up dump file
    echo "🧹 Cleaning up dump file..."
    rm $DUMP_FILENAME
    
    echo ""
    echo "🎉 SUCCESS! Production database pulled to local development environment"
    echo "   Database: $PGDATABASE"
    echo "   Records: $RECORD_COUNT"
    echo ""
    echo "You can now run your FastAPI backend locally with production data!"
    
else
    echo "❌ Failed to restore database"
    exit 1
fi