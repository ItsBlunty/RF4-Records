# Database Setup for Railway

This project supports both SQLite with persistent storage and PostgreSQL for production use.

## Option 1: SQLite with Persistent Volume (Recommended)

1. **Create a Railway Volume**:
   - Go to your Railway project dashboard
   - Click "Variables" tab
   - Add a new variable: `RAILWAY_VOLUME_NAME` with any name (e.g., `rf4-data`)
   - Railway will automatically create a persistent volume

2. **Deploy**: The application will automatically use the persistent volume for SQLite storage

## Option 2: PostgreSQL Database (Advanced)

1. **Add PostgreSQL Service**:
   - In Railway dashboard, click "Add Service"
   - Select "PostgreSQL" from templates
   - Railway will automatically set `DATABASE_URL` environment variable

2. **Deploy**: The application will automatically detect and use PostgreSQL

## Database Priority

The application checks for databases in this order:
1. `DATABASE_URL` (PostgreSQL from Railway)
2. `POSTGRES_URL` (Alternative PostgreSQL)
3. `RAILWAY_VOLUME_MOUNT_PATH` (Persistent SQLite)
4. Local SQLite file (development only)

## Current Configuration

The `railway.json` is configured to:
- Mount persistent volume at `/app/data`
- Store SQLite database in the persistent volume
- Preserve data between deployments

## Verification

Check the deployment logs for:
```
🗄️  Using database: sqlite:///app/data/rf4_records.db
```

This confirms the database is using persistent storage. 