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

def is_high_frequency_period():
    """
    Check if we're in the high-frequency scraping period
    High frequency: Sunday 6PM UTC to Tuesday 6PM UTC (every 15 minutes)
    Low frequency: Tuesday 6PM UTC to Sunday 6PM UTC (every hour)
    """
    now = datetime.now(timezone.utc)
    
    # Get current day of week (0=Monday, 6=Sunday)
    current_day = now.weekday()
    current_hour = now.hour
    
    # Sunday 6PM UTC to Tuesday 6PM UTC = high frequency
    if current_day == 6:  # Sunday
        return current_hour >= 18  # 6PM or later
    elif current_day == 0:  # Monday
        return True  # All day Monday
    elif current_day == 1:  # Tuesday
        return current_hour < 18  # Before 6PM
    else:
        return False  # Wednesday, Thursday, Friday, Saturday = low frequency

def get_next_schedule_change():
    """Get when the next schedule change occurs"""
    now = datetime.now(timezone.utc)
    current_day = now.weekday()
    
    if is_high_frequency_period():
        # We're in high frequency, next change is Tuesday 6PM
        if current_day == 6:  # Sunday
            days_to_tuesday = 2
        elif current_day == 0:  # Monday
            days_to_tuesday = 1
        else:  # Tuesday before 6PM
            days_to_tuesday = 0
        
        next_change = now.replace(hour=18, minute=0, second=0, microsecond=0)
        if current_day != 1 or now.hour >= 18:  # Not Tuesday or already past 6PM
            next_change += timedelta(days=days_to_tuesday)
        
        return next_change, "hourly"
    else:
        # We're in low frequency, next change is Sunday 6PM
        days_to_sunday = (6 - current_day) % 7
        if days_to_sunday == 0 and now.hour >= 18:  # Already Sunday after 6PM
            days_to_sunday = 7
        
        next_change = now.replace(hour=18, minute=0, second=0, microsecond=0)
        next_change += timedelta(days=days_to_sunday)
        
        return next_change, "15-minute"

def run_scheduled_scrape():
    """Run the scraping with error handling"""
    try:
        frequency = "15-minute" if is_high_frequency_period() else "hourly"
        logger.info(f"🕐 Starting {frequency} scheduled scrape")
        
        result = scrape_and_update_records()
        
        if result['success']:
            logger.info(f"✅ {frequency.capitalize()} scrape completed successfully")
        else:
            logger.warning(f"⚠️ {frequency.capitalize()} scrape completed with issues")
            
    except Exception as e:
        logger.error(f"❌ Scheduled scrape failed: {e}")

def setup_dynamic_schedule():
    """Set up the dynamic schedule based on current time"""
    # Clear any existing jobs
    schedule.clear()
    
    if is_high_frequency_period():
        # High frequency: every 15 minutes
        schedule.every(15).minutes.do(run_scheduled_scrape)
        frequency = "15-minute"
    else:
        # Low frequency: every hour
        schedule.every().hour.do(run_scheduled_scrape)
        frequency = "hourly"
    
    next_change, next_frequency = get_next_schedule_change()
    logger.info(f"📅 Schedule set to {frequency} scraping")
    logger.info(f"📅 Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}")
    
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
    logger.info("📋 Schedule:")
    logger.info("   • Sunday 6PM UTC → Tuesday 6PM UTC: Every 15 minutes")
    logger.info("   • Tuesday 6PM UTC → Sunday 6PM UTC: Every hour")
    
    # Run initial check
    frequency = "15-minute" if is_high_frequency_period() else "hourly"
    logger.info(f"🕐 Current period: {frequency} scraping")
    
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