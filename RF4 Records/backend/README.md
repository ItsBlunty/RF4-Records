# RF4 Records Backend

A FastAPI server that automatically scrapes Russian Fishing 4 records from all regional leaderboards every 10 minutes.

## Features

- **Automated Scraping**: Scrapes all 10 regional leaderboards every 10 minutes
- **Multi-Region Support**: Russia, Germany, USA, France, China, Poland, Korea, Japan, Indonesia, Other Countries
- **Comprehensive Logging**: All activities logged to `logs/` directory
- **Error Handling**: Robust error handling with detailed logging
- **REST API**: FastAPI endpoints for data access and manual control
- **Real-time Status**: Monitor scraping status and database statistics

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize the database:**
   ```bash
   python database.py
   ```

3. **Start the server:**
   ```bash
   python start_server.py
   ```
   
   Or alternatively:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `GET /` - Server status and information
- `GET /records` - Get all fishing records from database
- `GET /status` - Detailed server and scraping status
- `POST /refresh` - Manually trigger a scraping session

## Logging

The server creates comprehensive logs in the `logs/` directory:

- `logs/scraper.log` - Detailed scraping activity and errors
- `logs/server.log` - Server operations and API requests

## Scheduled Scraping

The server automatically:
- Runs an initial scrape on startup
- Scrapes all 10 regions every 10 minutes
- Logs all activities and errors
- Handles failures gracefully and continues operation

## Database Schema

Records include:
- Player name
- Fish type
- Weight (kg)
- Waterbody location
- Bait used
- Date caught
- Region (which leaderboard it came from)

## Monitoring

Check the server status at `http://localhost:8000/status` to see:
- Total records in database
- Scheduler status
- Last update time
- Next scheduled scrape

## Manual Control

Trigger a manual scrape:
```bash
curl -X POST http://localhost:8000/refresh
```

## Error Handling

- All scraping errors are logged to `logs/scraper.log`
- Server continues running even if individual regions fail
- Database connection issues are handled gracefully
- Chrome WebDriver errors are logged and recovered from 