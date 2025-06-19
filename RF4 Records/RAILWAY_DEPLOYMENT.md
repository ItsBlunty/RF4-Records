# Railway Deployment Guide

## Overview
This application consists of two services on Railway:
1. **RF-Records** - The main FastAPI backend application
2. **Postgres** - The PostgreSQL database service

## Deployment Process

### 1. Initial Setup
- Create a new Railway project
- Add a PostgreSQL service from the Railway marketplace
- Connect your GitHub repository

### 2. Build Configuration
The application uses these configuration files:
- `railway.json` - Main Railway configuration
- `nixpacks.toml` - Build process specification
- `Procfile` - Process management (alternative to railway.json)

### 3. Environment Variables
Railway will automatically set:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Port for the application to run on
- `RAILWAY_ENVIRONMENT` - Environment name

### 4. Build Process
1. Railway detects Python application
2. Installs dependencies from `backend/requirements.txt`
3. Runs the application using `start_server.py`

### 5. Troubleshooting Build Errors

#### Common Issues:
1. **Python version mismatch** - Check `runtime.txt`
2. **Missing dependencies** - Verify `requirements.txt`
3. **Import errors** - Check file paths and imports
4. **Database connection** - Ensure PostgreSQL service is running

#### Debug Steps:
1. Check Railway logs for specific error messages
2. Verify all files are in the correct locations
3. Test locally with the same Python version
4. Ensure database service is properly connected

### 6. Service Connection
- The PostgreSQL service should automatically provide `DATABASE_URL`
- The backend will connect to this database automatically
- Tables will be created on first startup

### 7. Health Checks
- Railway will check the `/` endpoint for health
- Application should respond within 100 seconds (configured in railway.json)

## File Structure
```
RF4 Records/
├── railway.json          # Railway configuration
├── nixpacks.toml         # Build configuration
├── Procfile             # Process management
├── backend/
│   ├── main.py          # FastAPI application
│   ├── start_server.py  # Server startup script
│   ├── requirements.txt # Python dependencies
│   ├── runtime.txt      # Python version
│   └── database.py      # Database configuration
└── frontend/            # Frontend (deployed separately)
```

## Monitoring
- Check Railway dashboard for service status
- View logs in Railway console
- Monitor database connections and performance
- Verify scheduled scraping is working via `/status` endpoint 