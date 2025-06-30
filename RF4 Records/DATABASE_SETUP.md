# Database Setup for RF4 Records

This project supports SQLite for local development, PostgreSQL for production on Railway, and includes tools for syncing production data locally.

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

## Local Development with Production Data

### Quick Start

1. **Start local PostgreSQL** (using Docker):
   ```bash
   cd "RF4 Records"
   docker-compose up -d db
   ```

2. **Pull production database**:
   ```bash
   cd "RF4 Records"
   ./bin/database_pull.sh
   ```

3. **Run backend with local data**:
   ```bash
   cd "RF4 Records/backend"
   source .env.development
   python main.py
   ```

### Environment Files

The setup includes two environment files:

- `backend/.env.production` - Railway PostgreSQL credentials
- `backend/.env.development` - Local PostgreSQL settings

### Database Pull Process

The `database_pull.sh` script:
1. Connects to Railway PostgreSQL using production credentials
2. Creates a compressed dump (~50-100MB for 174k+ records)  
3. Drops and recreates local database
4. Restores production data locally
5. Verifies record count and cleans up

### Manual Database Operations

#### Connect to local database:
```bash
source "./RF4 Records/backend/.env.development"
psql -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE
```

#### Connect to production database:
```bash
source "./RF4 Records/backend/.env.production"  
psql -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE
```

#### Check record counts:
```sql
SELECT COUNT(*) FROM records;
SELECT COUNT(*) FROM records WHERE trophy_class = 'trophy';
SELECT COUNT(*) FROM records WHERE trophy_class = 'record';
```

### Troubleshooting

#### PostgreSQL not found
Install PostgreSQL client tools:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS  
brew install postgresql
```

#### Permission denied on scripts
Make scripts executable:
```bash
chmod +x "./RF4 Records/bin/"*.sh
```

### Security Notes

- `.env.production` contains production credentials
- Add `*.env*` to `.gitignore` to avoid committing secrets
- Use environment-specific passwords for local development 