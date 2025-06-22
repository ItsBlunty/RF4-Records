from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, Record, create_tables
from scraper import scrape_and_update_records, should_stop_scraping
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, timezone
from scheduler import is_high_frequency_period, get_next_schedule_change
import logging
import gc
import signal
import sys
import time
import threading
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="RF4 Records API",
    description="API for Russian Fishing 4 records data",
    version="1.0.0"
)

# Add compression middleware (should be added before CORS)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:5173",  # Vite dev server
        "https://rf4-records.vercel.app",  # Vercel frontend
        "https://rf4-records-frontend.railway.app",  # Railway frontend
        "*"  # Allow all origins for now (you can restrict this later)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (built frontend) in production
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    logger.info(f"Serving static assets from {os.path.join(frontend_dist_path, 'assets')}")
else:
    logger.warning(f"Frontend dist directory not found at {frontend_dist_path}")

# Global variables for scraping control
is_scraping = False
scraping_lock = threading.Lock()

# Initialize scheduler
scheduler = BackgroundScheduler()

def signal_handler(signum, frame):
    """Handle graceful shutdown"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    print(f"\n🛑 Shutdown signal received - stopping gracefully...")
    
    # Stop any ongoing scraping
    global should_stop_scraping
    should_stop_scraping = True
    
    # Wait for any ongoing scraping to finish (with timeout)
    with scraping_lock:
        if is_scraping:
            logger.info("Waiting for ongoing scraping to finish...")
            print("⏳ Waiting for ongoing scraping to finish...")
            # Give it 10 seconds to finish gracefully
            for i in range(10):
                if not is_scraping:
                    break
                time.sleep(1)
                print(f"   Waiting... ({10-i}s remaining)")
    
    logger.info("Graceful shutdown complete")
    print("✅ Server shutdown complete")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

def scheduled_scrape():
    """Wrapper function for scheduled scraping with error handling and memory management"""
    global is_scraping
    
    with scraping_lock:
        if is_scraping:
            logger.warning("Scraping already in progress, skipping scheduled run")
            return
        is_scraping = True
    
    try:
        import psutil
        import os
        
        # Log memory before scrape
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024
        
        frequency = "3-minute" if is_high_frequency_period() else "15-minute"
        logger.info(f"Starting {frequency} scheduled scrape (Memory: {memory_before:.1f} MB)")
        result = scrape_and_update_records()
        
        # Log memory after scrape
        memory_after = process.memory_info().rss / 1024 / 1024
        memory_change = memory_after - memory_before
        
        if result['success']:
            logger.info(f"{frequency.capitalize()} scrape completed successfully (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)")
        else:
            logger.warning(f"{frequency.capitalize()} scrape completed with issues (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)")
            
    except Exception as e:
        logger.error(f"Scheduled scrape failed: {e}")
    finally:
        # Aggressive garbage collection after each scrape
        for _ in range(3):  # Multiple passes
            gc.collect()
        with scraping_lock:
            is_scraping = False
        
        # Schedule the next scrape AFTER this one completes
        schedule_next_scrape()

def is_in_browserless_redeploy_window(check_time):
    """Check if a given time falls within a Browserless redeploy window"""
    # Browserless redeploys every 3 hours at 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00 UTC
    # Avoid scheduling from 10 minutes before to 3 minutes after each redeploy time
    
    # Convert to UTC if not already
    if check_time.tzinfo is None:
        check_time = check_time.replace(tzinfo=timezone.utc)
    elif check_time.tzinfo != timezone.utc:
        check_time = check_time.astimezone(timezone.utc)
    
    # Get the current hour and minute
    hour = check_time.hour
    minute = check_time.minute
    
    # Redeploy happens at hours: 0, 3, 6, 9, 12, 15, 18, 21
    redeploy_hours = [0, 3, 6, 9, 12, 15, 18, 21]
    
    for redeploy_hour in redeploy_hours:
        # Check if we're in the window: 10 minutes before to 3 minutes after
        if hour == redeploy_hour:
            # Same hour as redeploy - check if we're in the danger zone (50-59 minutes or 0-3 minutes)
            if minute >= 50 or minute <= 3:
                return True, redeploy_hour
        elif hour == (redeploy_hour - 1) % 24:
            # Hour before redeploy - check if we're in the last 10 minutes (50-59)
            if minute >= 50:
                return True, redeploy_hour
    
    return False, None

def get_next_safe_time(base_time, delay_minutes):
    """Get the next safe time to schedule, avoiding Browserless redeploy windows"""
    candidate_time = base_time + timedelta(minutes=delay_minutes)
    
    # Check if the candidate time is in a redeploy window
    in_window, redeploy_hour = is_in_browserless_redeploy_window(candidate_time)
    
    if not in_window:
        return candidate_time, delay_minutes
    
    # If we're in a redeploy window, schedule for 3 minutes after the detected redeploy hour
    # All times should already be in UTC
    safe_time = base_time.replace(hour=redeploy_hour, minute=3, second=0, microsecond=0)
    
    # If the safe time is in the past, it means we need the next occurrence of this redeploy hour
    if safe_time <= base_time:
        # Find the next redeploy hour
        redeploy_hours = [0, 3, 6, 9, 12, 15, 18, 21]
        next_redeploy_hour = None
        
        for hour in redeploy_hours:
            if hour > redeploy_hour:
                next_redeploy_hour = hour
                break
        
        if next_redeploy_hour is None:
            # Wrap to next day
            safe_time = safe_time.replace(hour=0, minute=3) + timedelta(days=1)
        else:
            safe_time = safe_time.replace(hour=next_redeploy_hour, minute=3)
    
    # Calculate the actual delay
    actual_delay = (safe_time - base_time).total_seconds() / 60
    
    return safe_time, int(actual_delay)

def schedule_next_scrape():
    """Schedule the next scrape based on current time period, avoiding Browserless redeploy windows"""
    try:
        # Remove any existing scrape job
        if scheduler.get_job('scrape_job'):
            scheduler.remove_job('scrape_job')
        
        if is_high_frequency_period():
            # High frequency: 3 minutes after completion
            delay_minutes = 3
            frequency = "3-minute"
        else:
            # Low frequency: 15 minutes after completion
            delay_minutes = 15
            frequency = "15-minute"
        
        base_time = datetime.now(timezone.utc)
        next_run_time, actual_delay = get_next_safe_time(base_time, delay_minutes)
        
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=next_run_time,
            id='scrape_job'
        )
        
        if actual_delay != delay_minutes:
            logger.info(f"Next {frequency} scrape scheduled for {next_run_time.strftime('%Y-%m-%d %H:%M:%S')} (delayed {actual_delay}min to avoid Browserless redeploy)")
        else:
            logger.info(f"Next {frequency} scrape scheduled for {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        logger.error(f"Error scheduling next scrape: {e}")

def update_schedule():
    """Update the scheduler based on current time period"""
    try:
        # Remove existing jobs
        if scheduler.get_job('scrape_job'):
            scheduler.remove_job('scrape_job')
        
        frequency = "3-minute" if is_high_frequency_period() else "15-minute"
        
        next_change, next_frequency = get_next_schedule_change()
        logger.info(f"Schedule updated to {frequency} scraping")
        logger.info(f"Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}")
        
        # Schedule the first scrape based on current frequency period, avoiding Browserless redeploy windows
        if is_high_frequency_period():
            delay_minutes = 3
        else:
            delay_minutes = 15
        
        base_time = datetime.now(timezone.utc)
        first_run_time, actual_delay = get_next_safe_time(base_time, delay_minutes)
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=first_run_time,
            id='scrape_job'
        )
        
        if actual_delay != delay_minutes:
            logger.info(f"First scrape scheduled for {first_run_time.strftime('%Y-%m-%d %H:%M:%S')} (delayed {actual_delay}min to avoid Browserless redeploy)")
        else:
            logger.info(f"First scrape scheduled for {first_run_time.strftime('%Y-%m-%d %H:%M:%S')} ({delay_minutes}-minute delay)")
        
        # Schedule the next schedule update
        scheduler.add_job(
            update_schedule,
            'date',
            run_date=next_change,
            id='schedule_update_job',
            replace_existing=True
        )
        
    except Exception as e:
        logger.error(f"Error updating schedule: {e}")

def schedule_monitor():
    """Monitor and update schedule when needed (fallback check every hour)"""
    try:
        # Check if we need to update the schedule
        now = datetime.now(timezone.utc)
        
        # Get the next scheduled change time
        next_change, _ = get_next_schedule_change()
        
        # If we're past the change time and no update job exists, update now
        if now >= next_change and not scheduler.get_job('schedule_update_job'):
            logger.info("Schedule change detected, updating...")
            update_schedule()
            
    except Exception as e:
        logger.error(f"Error in schedule monitor: {e}")

# Initialize the dynamic scheduler
scheduler.start()

# Set up dynamic scheduling based on current time
update_schedule()

# Add hourly monitoring job as fallback
scheduler.add_job(
    schedule_monitor,
    'interval',
    hours=1,
    id='schedule_monitor_job'
)

logger.info("Dynamic scheduler started - frequency based on weekly schedule")

@app.on_event("startup")
def startup_event():
    """Server startup - create tables and start scheduler"""
    logger.info("=== SERVER STARTUP ===")
    print("🚀 FastAPI server is starting up...")
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        print(f"❌ Database error: {e}")
    
    print("📊 Available endpoints:")
    print("   GET  /         - Server status")
    print("   GET  /records  - Get all fishing records")
    print("   POST /refresh  - Trigger manual scrape")
    print("   GET  /status   - Server and DB status")
    print("   GET  /docs     - Interactive API documentation")
    print("✅ Server ready! Frontend can connect to this URL")
    
    # Show current schedule
    frequency = "3-minute" if is_high_frequency_period() else "15-minute"
    next_change, next_frequency = get_next_schedule_change()
    print(f"🔄 Dynamic scheduling active: {frequency} delay after completion")
    print(f"📅 Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}")
    print("🛑 Press Ctrl+C to gracefully shut down the server")
    
    logger.info("Server started successfully - dynamic scheduled scraping active")

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on server shutdown"""
    logger.info("=== SERVER SHUTDOWN ===")
    scheduler.shutdown()
    logger.info("Scheduler shutdown complete")

@app.get("/api")
def api_root():
    """API root endpoint"""
    frequency = "3-minute" if is_high_frequency_period() else "15-minute"
    next_change, next_frequency = get_next_schedule_change()
    
    return {
        "message": "RF4 Records API",
        "status": "running",
        "scheduler_active": scheduler.running,
        "current_frequency": frequency,
        "next_schedule_change": next_change.isoformat(),
        "next_frequency": next_frequency,
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")
    }

@app.get("/records")
@app.get("/api/records")
def get_records():
    """Get all records from database, deduplicated for frontend display"""
    try:
        db: Session = SessionLocal()
        
        # Get all records with category information
        records = db.query(Record).all()
        
        # Group records by unique combination (excluding category)
        record_groups = {}
        for r in records:
            # Create a key for deduplication (excluding category)
            key = (r.player, r.fish, r.weight, r.waterbody, r.bait1, r.bait2, r.date, r.region)
            
            if key not in record_groups:
                record_groups[key] = []
            record_groups[key].append(r)
        
        # For each group, select one representative record and include category info
        result = []
        for key, group_records in record_groups.items():
            # Use the first record as the representative
            representative = group_records[0]
            
            # Collect all categories for this record
            categories = [r.category for r in group_records if r.category]
            
            # Format bait display
            if representative.bait2:
                # Sandwich bait
                bait_display = f"{representative.bait1} + {representative.bait2}"
            else:
                # Single bait
                bait_display = representative.bait1 or representative.bait or ""
            
            # Optimized response - only send data actually used by frontend
            result.append({
                "player": representative.player,
                "fish": representative.fish,
                "weight": representative.weight,
                "waterbody": representative.waterbody,
                "bait_display": bait_display,
                "date": representative.date,
                "region": representative.region
            })
        
        db.close()
        logger.info(f"Retrieved {len(result)} unique records (from {len(records)} total records) via API")
        return result
    except Exception as e:
        logger.error(f"Error retrieving records: {e}")
        return {"error": "Failed to retrieve records"}

@app.post("/refresh")
def refresh():
    """Manually trigger a scrape"""
    global is_scraping
    
    with scraping_lock:
        if is_scraping:
            return {
                "message": "Scraping already in progress",
                "success": False,
                "error": "Another scraping operation is currently running"
            }
        is_scraping = True
    
    logger.info("=== MANUAL SCRAPE TRIGGERED ===")
    try:
        result = scrape_and_update_records()
        return {
            "message": "Scraping completed",
            "success": result['success'],
            "new_records": result['new_records'],
            "regions_scraped": result['regions_scraped'],
            "duration_seconds": result['duration_seconds']
        }
    except Exception as e:
        logger.error(f"Error in manual scrape: {e}")
        return {"error": "Scraping failed", "details": str(e)}
    finally:
        with scraping_lock:
            is_scraping = False

@app.post("/cleanup")
def force_cleanup():
    """Force garbage collection and memory cleanup"""
    try:
        import gc
        
        # Force garbage collection
        collected = gc.collect()
        
        # Get memory info
        import psutil
        import os as os_module
        process = psutil.Process(os_module.getpid())
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        
        return {
            "message": "Memory cleanup completed",
            "objects_collected": collected,
            "current_memory_mb": round(memory_mb, 2),
            "memory_percent": round(process.memory_percent(), 2),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return {"error": "Cleanup failed", "details": str(e)}

@app.get("/status")
def get_status():
    """Get server and scraping status with memory information"""
    try:
        import psutil
        import os as os_module
        
        # Get memory usage
        process = psutil.Process(os_module.getpid())
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
        
        db: Session = SessionLocal()
        total_records = db.query(Record).count()
        db.close()
        
        # Get current schedule info
        frequency = "15-minute" if is_high_frequency_period() else "hourly"
        next_change, next_frequency = get_next_schedule_change()
        
        return {
            "server_status": "running",
            "scheduler_active": scheduler.running,
            "is_scraping": is_scraping,
            "total_records": total_records,
            "current_frequency": frequency,
            "next_schedule_change": next_change.isoformat(),
            "next_frequency": next_frequency,
            "memory_usage_mb": round(memory_mb, 2),
            "memory_percent": round(process.memory_percent(), 2),
            "last_update": datetime.now().isoformat(),
            "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")
        }
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {"error": "Failed to get status"}

# Serve the frontend for all other routes (SPA routing)
@app.get("/{path:path}")
def serve_frontend(path: str):
    """Serve the frontend application for all non-API routes"""
    frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    index_path = os.path.join(frontend_dist_path, "index.html")
    
    # If the frontend build exists, serve it
    if os.path.exists(index_path):
        # Check if the requested path is a file that exists
        requested_file = os.path.join(frontend_dist_path, path)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
        else:
            # For SPA routing, serve index.html for all other paths
            return FileResponse(index_path)
    else:
        # Fallback if frontend is not built
        return {"message": "Frontend not available - API only mode", "path": path}

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port) 