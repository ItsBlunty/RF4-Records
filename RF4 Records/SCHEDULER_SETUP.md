# RF4 Records Dynamic Scheduler

The RF4 Records project includes a dynamic scheduler that automatically adjusts scraping frequency based on the day of the week.

## Schedule

- **High Frequency**: Sunday 6PM UTC → Tuesday 6PM UTC (every 15 minutes)
- **Low Frequency**: Tuesday 6PM UTC → Sunday 6PM UTC (every hour)

This schedule is designed around the game's weekly reset cycle, providing more frequent updates during the active period.

## Local Development

### Prerequisites

Install the required dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Scheduler

```bash
cd backend
python start_scheduler.py
```

The scheduler will:
- Automatically detect the current period (high/low frequency)
- Set up the appropriate schedule
- Switch schedules automatically at the transition times
- Log all activities to `logs/scheduler.log`

### Manual Testing

To test the scraper manually:
```bash
cd backend
python -c "from scraper import scrape_and_update_records; scrape_and_update_records()"
```

## Production Deployment

### Railway Deployment

For Railway deployment, you can run the scheduler as a separate service or use a cron job service.

#### Option 1: Separate Railway Service

1. Create a new Railway service
2. Connect the same GitHub repository
3. Set the start command to: `cd backend && python start_scheduler.py`
4. Add the same environment variables as your main service

#### Option 2: Cron Job Service

Use Railway's cron job feature or an external service like GitHub Actions to trigger scraping:

```yaml
# .github/workflows/scraper.yml
name: RF4 Records Scraper
on:
  schedule:
    # Every 15 minutes during high frequency period
    - cron: '*/15 * * 0,1 *'  # Sunday and Monday
    - cron: '0,15,30,45 0-17 * * 2'  # Tuesday before 6PM
    # Every hour during low frequency period  
    - cron: '0 18-23 * * 2'  # Tuesday after 6PM
    - cron: '0 * * 3,4,5,6 *'  # Wednesday through Saturday
    - cron: '0 0-17 * * 0'  # Sunday before 6PM

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scraping
        run: curl -X POST ${{ secrets.SCRAPER_WEBHOOK_URL }}
```

### Environment Variables

The scheduler requires the same environment variables as the main scraper:
- `BROWSER_WEBDRIVER_ENDPOINT_PRIVATE` or `BROWSER_WEBDRIVER_ENDPOINT`
- `BROWSER_TOKEN`
- Database connection variables (if using PostgreSQL)

## Monitoring

### Logs

The scheduler logs to both console and `logs/scheduler.log`:
- Schedule changes
- Scraping start/completion
- Errors and issues

### Sample Log Output

```
2025-06-20 18:00:00,000 - INFO - 🚀 Starting RF4 Records Dynamic Scheduler
2025-06-20 18:00:00,001 - INFO - 📅 Schedule set to 15-minute scraping
2025-06-20 18:00:00,002 - INFO - 📅 Next schedule change: 2025-06-22 18:00 UTC -> hourly
2025-06-20 18:00:00,003 - INFO - 🕐 Starting 15-minute scheduled scrape
2025-06-20 18:02:30,000 - INFO - Light: 8/10 regions, 1234 total records
2025-06-20 18:02:35,000 - INFO - 📊 Final: 45 regions, +123 new records, 155.2s
2025-06-20 18:02:35,001 - INFO - ✅ 15-minute scrape completed successfully
```

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure you're running from the `backend` directory
2. **Database Connection**: Ensure database is initialized with `python init_db.py`
3. **WebDriver Issues**: Check Browserless service is running and environment variables are set
4. **Schedule Not Changing**: Check system timezone is set correctly

### Manual Schedule Check

To check what schedule should be active:
```python
from scheduler import is_high_frequency_period, get_next_schedule_change

print(f"High frequency period: {is_high_frequency_period()}")
next_change, next_freq = get_next_schedule_change()
print(f"Next change: {next_change} -> {next_freq}")
```

## Architecture

The scheduler uses the `schedule` library for simple, readable scheduling logic. It:

1. Determines the current period based on UTC time
2. Sets up appropriate schedule (15min or 1hr)
3. Monitors for schedule change times
4. Automatically switches schedules when needed
5. Handles errors gracefully and continues running 