# Railway Deployment Guide

This document outlines the deployment process for the RF4 Records application on Railway.

## Overview

The RF4 Records application consists of:
- **Backend**: FastAPI server with SQLite database and Selenium web scraping
- **Frontend**: React application built with Vite

## Deployment Architecture

The application is deployed as a single service on Railway that:
1. Builds both frontend and backend
2. Serves the React frontend as static files
3. Provides API endpoints for data access
4. Runs scheduled scraping tasks using Browserless v1

## Railway Configuration

### Services Required

1. **Main Application Service** (this repository)
2. **Browserless v1 Service** (from Railway template)

### Environment Variables

The following environment variables are automatically configured when you connect the Browserless service:

```
BROWSER_WEBDRIVER_ENDPOINT=${{Browserless.BROWSER_WEBDRIVER_ENDPOINT}}
BROWSER_TOKEN=${{Browserless.BROWSER_TOKEN}}
```

These are configured in `railway.json` and will be automatically set when you connect the services.

### Build Process

The build process is configured in `nixpacks.toml`:

1. **Setup Phase**: Installs Python 3.11, pip, Node.js 20, and npm
2. **Install Phase**: 
   - Installs Python dependencies from `backend/requirements.txt`
   - Installs Node.js dependencies from `frontend/package.json`
3. **Build Phase**: Builds the React frontend using `npm run build`
4. **Start Phase**: Runs the FastAPI server which serves both API and frontend

### File Structure

```
RF4 Records/
├── backend/          # Python FastAPI application
│   ├── scraper.py    # Modified for Browserless v1 support
│   ├── main.py       # FastAPI server with frontend serving
│   └── ...
├── frontend/         # React frontend application
├── nixpacks.toml     # Railway build configuration
├── railway.json      # Railway deployment configuration
├── Procfile          # Alternative startup configuration
└── README.md         # Project documentation
```

## Deployment Steps

1. **Fork or clone this repository**

2. **Deploy Browserless v1 service**:
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from template"
   - Search for "Browserless" and deploy the **v1** template (not v2)

3. **Deploy main application**:
   - In the same Railway project, click "New Service"
   - Connect your GitHub repository
   - Railway will automatically detect and use the `nixpacks.toml` configuration

4. **Connect services**:
   - The environment variables are already configured in `railway.json`
   - Railway will automatically connect the services and set the variables

5. **Configure domain** (optional):
   - In your main application service settings
   - Go to "Networking" and generate a domain
   - The application will be available at the generated URL

## Key Modifications for Railway

### Backend Changes
- **Selenium Configuration**: Modified `get_driver()` function in `scraper.py` to use Browserless v1 when environment variables are present
- **Frontend Serving**: Added static file serving in `main.py` to serve the built React app
- **API Routing**: Updated endpoints to work with both API calls and frontend routing

### Frontend Changes
- **API Configuration**: Updated to work in both development (with proxy) and production (direct calls)
- **Build Integration**: Frontend builds during Railway deployment and is served by FastAPI

### Configuration Files
- **railway.json**: Configured with Browserless environment variables
- **nixpacks.toml**: Updated to build both frontend and backend
- **Procfile**: Updated to use the correct startup script

## Features

- **Automatic Scraping**: Runs every 15 minutes using Browserless v1
- **Manual Refresh**: API endpoint to trigger immediate scraping
- **Database Persistence**: SQLite database for storing records
- **Responsive Frontend**: React application with filtering and sorting
- **API Documentation**: Available at `/docs` endpoint
- **Full-Stack Deployment**: Single service serves both frontend and backend

## API Endpoints

- `GET /api` - API status and information
- `GET /records` - Get all fishing records
- `POST /refresh` - Trigger manual scraping
- `GET /status` - Server and database status
- `GET /docs` - Interactive API documentation
- `GET /` - Frontend application (all other routes)

## Monitoring

Check the Railway logs to monitor:
- Scraping operations with Browserless
- API requests
- Error messages
- Database operations
- Frontend serving

## Troubleshooting

### Common Issues

1. **Browserless connection failed**:
   - Verify Browserless v1 service is running (not v2)
   - Check environment variables are set correctly
   - Review logs for connection errors

2. **Frontend not loading**:
   - Check if build completed successfully in Railway logs
   - Verify static files are being served from `/frontend/dist`
   - Check browser console for errors

3. **Scraping failures**:
   - Review scraper logs for Browserless connection issues
   - Check if target website structure changed
   - Verify Selenium configuration with Browserless v1

### Logs

Access logs through Railway dashboard:
- Service logs show application output and scraping operations
- Build logs show compilation process for both frontend and backend
- Deploy logs show deployment status

## Local Development

To run locally (uses local Chrome instead of Browserless):

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python start_server.py
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The local setup automatically detects the absence of Browserless environment variables and uses local Chrome WebDriver.

## Database

The application uses SQLite for data persistence. The database file is stored in the backend directory and persists across deployments on Railway.

## Security

- CORS is configured for cross-origin requests
- Environment variables protect Browserless tokens
- Graceful shutdown handling for ongoing scraping operations
- Browserless v1 provides isolated browser instances for secure scraping

## Performance

- Browserless v1 provides optimized browser instances
- Frontend is served as static files for fast loading
- Database queries are optimized for the 10 regions × 5 categories structure
- Automatic cleanup of browser resources after each scraping session 