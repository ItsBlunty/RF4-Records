# RF4 Records Dynamic Scheduler

The RF4 Records project includes a dynamic scheduler that is **integrated directly into the main FastAPI application**. It automatically adjusts scraping frequency based on the day of the week.

## Schedule

- **High Frequency**: Sunday 6PM UTC → Tuesday 6PM UTC (every 15 minutes)
- **Low Frequency**: Tuesday 6PM UTC → Sunday 6PM UTC (every hour)

This schedule is designed around the game's weekly reset cycle, providing more frequent updates during the active period.

## How It Works

The dynamic scheduler is built into `backend/main.py` and:
- Automatically detects the current time period on startup
- Starts scraping at the appropriate frequency (15-minute or hourly)
- Automatically switches frequencies at transition times
- Provides fallback monitoring to ensure schedule changes are not missed
- Logs all schedule changes and scrape results

## Local Development

### Prerequisites

Install the required dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

Simply run the main application - the scheduler is included:

```bash
cd backend
python main.py
```

The application will show the current schedule on startup:
```
🔄 Dynamic scheduling active: hourly scraping
📅 Next schedule change: 2024-01-21 18:00 UTC -> 15-minute
```

### Manual Testing

To test the scraper manually:
```bash
cd backend
python -c "from scraper import scrape_and_update_records; scrape_and_update_records()"
```

Or trigger via API:
```bash
curl -X POST http://localhost:8000/refresh
```

## Production Deployment

### Railway Deployment

**No additional setup required!** The scheduler runs automatically as part of your main Railway deployment.

When you deploy your application to Railway:
1. The main service starts with FastAPI
2. The scheduler automatically initializes with the correct frequency
3. Schedule changes happen automatically at transition times
4. Everything runs in a single Railway service

### Environment Variables

The scheduler uses the same environment variables as the main application:
- `BROWSER_WEBDRIVER_ENDPOINT_PRIVATE` or `BROWSER_WEBDRIVER_ENDPOINT`
- `BROWSER_TOKEN`
- Database connection variables (if using PostgreSQL)

## API Endpoints

The scheduler status is available through the API:

### GET `/api`
Returns current scheduler information:
```json
{
  "message": "RF4 Records API",
  "status": "running",
  "scheduler_active": true,
  "current_frequency": "hourly",
  "next_schedule_change": "2024-01-21T18:00:00+00:00",
  "next_frequency": "15-minute",
  "timestamp": "2024-01-20T14:30:00.123456",
  "environment": "production"
}
```

### POST `/refresh`
Manually trigger a scrape (works independently of the scheduler)

## Monitoring

### Logs

The scheduler provides detailed logging integrated with the main application:
- Schedule changes and frequency updates
- Scrape start/completion with results summary
- Error handling and recovery

### Sample Log Output

```
2024-01-15 18:00:00 - INFO - Schedule updated to 15-minute scraping
2024-01-15 18:00:00 - INFO - Next schedule change: 2024-01-17 18:00 UTC -> hourly
2024-01-15 18:00:30 - INFO - Starting 15-minute scheduled scrape
2024-01-15 18:05:45 - INFO - 15-minute scrape completed successfully
2024-01-17 18:00:00 - INFO - Schedule updated to hourly scraping
```

## Manual Control

You can trigger manual scrapes anytime by:
1. Calling the `/refresh` endpoint via HTTP
2. Using the Railway dashboard to make an API call
3. The manual scrape runs independently of the scheduled scrapes

## Advantages of Integrated Scheduler

✅ **Single Service**: No need for separate Railway services or external cron jobs
✅ **Automatic**: Works out of the box with no additional setup
✅ **Reliable**: Built-in fallback monitoring ensures schedule changes happen
✅ **Cost Effective**: Uses the same Railway service resources
✅ **Synchronized**: Scheduler and API share the same database and environment

## Troubleshooting

### Common Issues

1. **Scheduler Not Working**: Check the main application logs in Railway dashboard
2. **Wrong Frequency**: Check the `/api` endpoint to see current frequency and next change time
3. **Database Connection**: Ensure database is initialized properly
4. **WebDriver Issues**: Check Browserless service connection status

### Manual Schedule Check

To check what schedule should be active:
```python
from scheduler import is_high_frequency_period, get_next_schedule_change

print(f"High frequency period: {is_high_frequency_period()}")
next_change, next_freq = get_next_schedule_change()
print(f"Next change: {next_change} -> {next_freq}")
```

### API Status Check

Check scheduler status via API:
```bash
curl http://localhost:8000/api
# or in production:
curl https://your-app.railway.app/api
```

## Architecture

The integrated scheduler uses APScheduler (Advanced Python Scheduler) with:

1. **Dynamic Job Management**: Jobs are created/updated automatically based on time periods
2. **Automatic Transitions**: Schedule changes are handled by timed jobs
3. **Fallback Monitoring**: Hourly checks ensure no schedule changes are missed
4. **Error Resilience**: Scheduler continues running even if individual scrapes fail
5. **Shared Resources**: Uses the same database and WebDriver configuration as the API

## Migration from Separate Scheduler

If you were previously using the separate `start_scheduler.py` approach:

1. **No migration needed** - just deploy the updated `main.py`
2. **Remove separate scheduler service** if you had one on Railway
3. **Update any external cron jobs** to use the `/refresh` endpoint instead
4. **Check logs** to confirm the integrated scheduler is working

The integrated approach is simpler, more reliable, and more cost-effective than running separate services. 