import schedule
import time
import threading
from datetime import datetime, timezone, timedelta
import logging
from scraper import scrape_and_update_records

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_current_schedule_period():
    """
    Determine which schedule period we're currently in:
    - 3-minute: Sunday 6PM UTC → Tuesday 6PM UTC (48 hours)
    - 30-minute: Tuesday 6PM UTC → Thursday 6PM UTC (48 hours)  
    - 1-hour: Thursday 6PM UTC → Sunday 6PM UTC (72 hours)
    """
    now = datetime.now(timezone.utc)
    
    # Get current day of week (0=Monday, 6=Sunday)
    current_day = now.weekday()
    current_hour = now.hour
    
    # Sunday 6PM UTC to Tuesday 6PM UTC = 3-minute period
    if current_day == 6:  # Sunday
        if current_hour >= 18:  # 6PM or later
            return "3-minute"
    elif current_day == 0:  # Monday
        return "3-minute"  # All day Monday
    elif current_day == 1:  # Tuesday
        if current_hour < 18:  # Before 6PM
            return "3-minute"
    
    # Tuesday 6PM UTC to Thursday 6PM UTC = 30-minute period
    if current_day == 1:  # Tuesday
        if current_hour >= 18:  # 6PM or later
            return "30-minute"
    elif current_day == 2:  # Wednesday
        return "30-minute"  # All day Wednesday
    elif current_day == 3:  # Thursday
        if current_hour < 18:  # Before 6PM
            return "30-minute"
    
    # Thursday 6PM UTC to Sunday 6PM UTC = 1-hour period
    # This covers Thursday 6PM+, Friday, Saturday, Sunday before 6PM
    return "1-hour"

def get_next_schedule_change():
    """Get when the next schedule change occurs and what it changes to"""
    now = datetime.now(timezone.utc)
    current_day = now.weekday()
    current_period = get_current_schedule_period()
    
    if current_period == "3-minute":
        # Next change is Tuesday 6PM UTC → 30-minute
        if current_day == 6:  # Sunday
            days_to_tuesday = 2
        elif current_day == 0:  # Monday
            days_to_tuesday = 1
        else:  # Tuesday before 6PM
            days_to_tuesday = 0
        
        next_change = now.replace(hour=18, minute=0, second=0, microsecond=0)
        if current_day != 1 or now.hour >= 18:  # Not Tuesday or already past 6PM
            next_change += timedelta(days=days_to_tuesday)
        
        return next_change, "30-minute"
    
    elif current_period == "30-minute":
        # Next change is Thursday 6PM UTC → 1-hour
        if current_day == 1:  # Tuesday
            days_to_thursday = 2
        elif current_day == 2:  # Wednesday
            days_to_thursday = 1
        else:  # Thursday before 6PM
            days_to_thursday = 0
        
        next_change = now.replace(hour=18, minute=0, second=0, microsecond=0)
        if current_day != 3 or now.hour >= 18:  # Not Thursday or already past 6PM
            next_change += timedelta(days=days_to_thursday)
        
        return next_change, "1-hour"
    
    else:  # current_period == "1-hour"
        # Next change is Sunday 6PM UTC → 3-minute
        days_to_sunday = (6 - current_day) % 7
        if days_to_sunday == 0 and now.hour >= 18:  # Already Sunday after 6PM
            days_to_sunday = 7
        
        next_change = now.replace(hour=18, minute=0, second=0, microsecond=0)
        next_change += timedelta(days=days_to_sunday)
        
        return next_change, "3-minute"

def run_scheduled_scrape():
    """Run the scraping with error handling"""
    try:
        current_period = get_current_schedule_period()
        logger.info(f"🕐 Starting {current_period} scheduled scrape")
        
        result = scrape_and_update_records()
        
        if result['success']:
            logger.info(f"✅ {current_period.capitalize()} scrape completed successfully")
            logger.info(f"   └─ {result.get('regions_scraped', 0)} regions, +{result.get('new_records', 0)} records")
            if 'truly_new_records' in result and 'category_updates' in result:
                logger.info(f"   └─ {result['truly_new_records']} new, {result['category_updates']} category updates")
        else:
            logger.warning(f"⚠️ {current_period.capitalize()} scrape completed with issues")
            
    except Exception as e:
        logger.error(f"❌ Scheduled scrape failed: {e}")

def setup_dynamic_schedule():
    """Set up the dynamic schedule based on current time"""
    # Clear any existing jobs
    schedule.clear()
    
    current_period = get_current_schedule_period()
    
    if current_period == "3-minute":
        # High frequency: every 3 minutes
        schedule.every(3).minutes.do(run_scheduled_scrape)
    elif current_period == "30-minute":
        # Medium frequency: every 30 minutes
        schedule.every(30).minutes.do(run_scheduled_scrape)
    else:  # "1-hour"
        # Low frequency: every hour
        schedule.every().hour.do(run_scheduled_scrape)
    
    next_change, next_period = get_next_schedule_change()
    logger.info(f"📅 Schedule set to {current_period} scraping")
    logger.info(f"📅 Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} → {next_period}")
    
    return next_change

def schedule_monitor():
    """Monitor and update the schedule when needed"""
    next_schedule_change = setup_dynamic_schedule()
    
    while True:
        try:
            # Run pending scheduled jobs
            schedule.run_pending()
            
            # Check if we need to change the schedule
            now = datetime.now(timezone.utc)
            if now >= next_schedule_change:
                logger.info("🔄 Schedule change time reached, updating schedule...")
                next_schedule_change = setup_dynamic_schedule()
            
            time.sleep(60)  # Check every minute
            
        except KeyboardInterrupt:
            logger.info("🛑 Scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"❌ Scheduler error: {e}")
            time.sleep(300)  # Wait 5 minutes before retrying

def start_scheduler():
    """Start the dynamic scheduler"""
    logger.info("🚀 Starting RF4 Records Dynamic Scheduler")
    logger.info("📋 New 3-Tier Schedule:")
    logger.info("   • Sunday 6PM UTC → Tuesday 6PM UTC: 3-minute intervals (48 hours)")
    logger.info("   • Tuesday 6PM UTC → Thursday 6PM UTC: 30-minute intervals (48 hours)")
    logger.info("   • Thursday 6PM UTC → Sunday 6PM UTC: 1-hour intervals (72 hours)")
    
    # Run initial check
    current_period = get_current_schedule_period()
    logger.info(f"🕐 Current period: {current_period} scraping")
    
    # Start the scheduler in a separate thread
    scheduler_thread = threading.Thread(target=schedule_monitor, daemon=True)
    scheduler_thread.start()
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Scheduler stopped by user")

if __name__ == "__main__":
    start_scheduler() 