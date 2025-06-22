# Docker Deployment Guide

This guide covers deploying RF4 Records using a custom Docker container instead of Browserless.

## Overview

The Docker approach provides:
- ✅ **Complete Control**: Full control over Chrome browser and environment
- ✅ **No Memory Leaks**: Direct management eliminates third-party session issues
- ✅ **Cost Effective**: No dependency on external Browserless services
- ✅ **Reliable**: Consistent environment across deployments

## Architecture

```
┌─────────────────────────────────────┐
│           Docker Container          │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │   Python    │ │     Chrome      │ │
│  │   FastAPI   │ │   + ChromeDriver│ │
│  │   Scraper   │ │   + Xvfb        │ │
│  └─────────────┘ └─────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │        React Frontend           │ │
│  │        (Built Assets)           │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Files Created

### Core Files
- `Dockerfile` - Main container definition
- `railway.json` - Railway deployment configuration
- `.dockerignore` - Build optimization
- `build-docker.sh` - Local build script

### Key Features
- **Multi-stage environment detection** in `scraper.py`
- **Health check endpoint** at `/` and `/health`
- **Automatic frontend build** during container creation
- **Memory optimized Chrome flags** for container environment

## Railway Deployment

### 1. Push Changes
```bash
git add .
git commit -m "Add Docker container deployment"
git push
```

### 2. Railway Configuration
Railway will automatically detect the `Dockerfile` and `railway.json` configuration.

### 3. Environment Variables
Set these in Railway (if you want to keep Browserless as fallback):
- `BROWSER_WEBDRIVER_ENDPOINT_PRIVATE` (optional)
- `BROWSER_TOKEN` (optional)

### 4. Deploy
Railway will build and deploy the container automatically.

## Local Testing

### Prerequisites
- Docker installed
- Git repository cloned

### Build and Run
```bash
# Make build script executable
chmod +x build-docker.sh

# Build the container
./build-docker.sh

# Run locally
docker run -p 8000:8000 rf4-records:latest
```

### Access
- Frontend: http://localhost:8000
- API: http://localhost:8000/api
- Health Check: http://localhost:8000/health

## Container Details

### Base Image
- `python:3.11-slim` with Ubuntu base for Chrome compatibility

### Installed Components
- Python 3.11 + dependencies
- Google Chrome (latest stable)
- ChromeDriver (auto-matched version)
- Node.js 18 (for frontend build)
- Xvfb (virtual display for headless Chrome)

### Memory Optimization
- Chrome flags optimized for container environment
- Aggressive memory management in scraper
- Garbage collection after each scrape session

### Process Management
- Xvfb starts automatically for headless display
- Chrome runs in sandbox-disabled mode for containers
- Proper signal handling for graceful shutdown

## Advantages Over Browserless

### Memory Management
- **Direct Control**: No third-party session management
- **Immediate Cleanup**: Chrome processes killed immediately
- **No Accumulation**: Memory leaks eliminated at source

### Reliability
- **No External Dependencies**: Self-contained environment
- **Consistent Behavior**: Same Chrome version across deployments
- **No Service Limits**: No session limits or timeouts

### Cost
- **No Browserless Fees**: Eliminate external service costs
- **Railway Only**: Single service deployment
- **Efficient Resource Use**: Optimized for Railway's pricing model

## Monitoring

### Health Checks
- Railway uses `/health` endpoint for container health
- Returns status, timestamp, and version info

### Logging
- Enhanced cleanup logging still active
- Container logs available in Railway dashboard
- Memory usage tracking in scraper

### Debugging
- Access Railway logs for troubleshooting
- Health endpoint for quick status checks
- API endpoints remain unchanged

## Migration Strategy

### Phase 1: Deploy Docker Container
1. Deploy this Docker version to Railway
2. Test scraping functionality
3. Monitor memory usage and performance

### Phase 2: Compare Performance
1. Run both versions in parallel (if needed)
2. Compare memory usage and reliability
3. Monitor for any issues

### Phase 3: Full Migration
1. Remove Browserless service dependencies
2. Clean up environment variables
3. Update documentation

## Troubleshooting

### Common Issues

**Build Failures**
- Check Docker logs in Railway
- Verify all files are committed to git
- Check Node.js build process

**Chrome Issues**
- Container includes all necessary Chrome flags
- Xvfb provides virtual display
- Sandbox disabled for container environment

**Memory Issues**
- Monitor through `/status` endpoint
- Check Railway resource limits
- Enhanced logging shows cleanup status

### Support
- Railway logs provide detailed build/runtime info
- Health check endpoint confirms container status
- API endpoints unchanged for frontend compatibility

## Next Steps

1. **Deploy and Test**: Deploy the Docker version
2. **Monitor Performance**: Watch memory usage and scraping success
3. **Compare Results**: Evaluate vs. Browserless performance
4. **Optimize**: Fine-tune Chrome flags if needed
5. **Full Migration**: Remove Browserless dependencies once stable 