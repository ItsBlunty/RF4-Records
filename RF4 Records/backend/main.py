from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, Record, create_tables
from scraper import scrape_and_update_records, should_stop_scraping, kill_orphaned_chrome_processes, enhanced_python_memory_cleanup, get_memory_usage
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, timezone
from scheduler import get_current_schedule_period, get_next_schedule_change
import logging
import gc
import signal
import sys
import time
import threading
import os
import builtins

# Set up logging to stdout (not stderr) to avoid red text in Railway
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors to reduce red text
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout  # Explicitly use stdout to avoid red text in Railway
)
logger = logging.getLogger(__name__)

# Reduce APScheduler logging verbosity to avoid red text in Railway
logging.getLogger('apscheduler').setLevel(logging.WARNING)
# Also suppress uvicorn access logs that might show as red
logging.getLogger('uvicorn.access').setLevel(logging.WARNING)

# Initialize scheduler but don't start it yet
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan event handler for startup and shutdown"""
    # Startup
    print("=== SERVER STARTUP ===", flush=True)
    print("🚀 FastAPI server is starting up...", flush=True)
    
    # Create/verify database tables first
    try:
        create_tables()
        print("Database tables created/verified successfully", flush=True)
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        print(f"❌ Database error: {e}", flush=True)
    
    # Now start the scheduler after database is ready
    try:
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
        
        # Add periodic memory cleanup job (every 90 seconds during idle)
        scheduler.add_job(
            periodic_memory_cleanup,
            'interval',
            seconds=90,
            id='memory_cleanup_job'
        )
        
        print("Dynamic scheduler started - frequency based on weekly schedule", flush=True)
        print("Periodic memory cleanup scheduled every 90 seconds", flush=True)
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
    
    print("📊 Available endpoints:", flush=True)
    print("   GET  /         - Server status", flush=True)
    print("   GET  /records  - Get all fishing records", flush=True)
    print("   POST /refresh  - Trigger manual scrape", flush=True)
    print("   POST /optimize - Run database performance optimizations", flush=True)
    print("   POST /merge-duplicates - Merge duplicate records (MAJOR MIGRATION)", flush=True)
    print("   GET  /status   - Server and DB status", flush=True)
    print("   GET  /docs     - Interactive API documentation", flush=True)
    print("✅ Server ready! Frontend can connect to this URL", flush=True)
    
    # Show current schedule
    current_period = get_current_schedule_period()
    frequency = current_period
    next_change, next_frequency = get_next_schedule_change()
    print(f"🔄 Dynamic scheduling active: {frequency} delay after completion", flush=True)
    print(f"📅 Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}", flush=True)
    print("🛑 Press Ctrl+C to gracefully shut down the server", flush=True)
    
    print("Server started successfully - dynamic scheduled scraping active", flush=True)
    
    yield  # Server is running
    
    # Shutdown
    logger.info("=== SERVER SHUTDOWN ===")
    scheduler.shutdown()
    logger.info("Scheduler shutdown complete")

# Create FastAPI app with lifespan handler
app = FastAPI(
    title="RF4 Records API",
    description="API for Russian Fishing 4 records data",
    version="1.0.0",
    lifespan=lifespan
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
    print(f"Serving static assets from {os.path.join(frontend_dist_path, 'assets')}", flush=True)
else:
    print(f"Frontend dist directory not found at {frontend_dist_path}", flush=True)

# Global variables for scraping control
is_scraping = False
scraping_lock = threading.Lock()

# Built-in functions should be available naturally

def signal_handler(signum, frame):
    """Handle graceful shutdown"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    print(f"🛑 Shutdown signal received - stopping gracefully...", flush=True)
    
    # Stop any ongoing scraping
    global should_stop_scraping
    should_stop_scraping = True
    
    # Wait for any ongoing scraping to finish (with timeout)
    with scraping_lock:
        if is_scraping:
            logger.info("Waiting for ongoing scraping to finish...")
            print("⏳ Waiting for ongoing scraping to finish...", flush=True)
            # Give it 10 seconds to finish gracefully
            for i in range(10):
                if not is_scraping:
                    break
                time.sleep(1)
                print(f"   Waiting... ({10-i}s remaining)", flush=True)
    
    logger.info("Graceful shutdown complete")
    print("✅ Server shutdown complete", flush=True)
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
        import gc  # Import gc at function scope to avoid UnboundLocalError
        
        # Get memory before any cleanup
        memory_before_cleanup = get_memory_usage()
        
        # PRE-SCRAPE CLEANUP: Clear memory accumulated during idle period
        if memory_before_cleanup > 300:  # Significant memory accumulation
            logger.info(f"🧹 Pre-scrape cleanup: Memory at {memory_before_cleanup:.1f}MB - clearing idle accumulation")
            
            # Kill any orphaned Chrome processes from previous sessions
            kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
            
            # Enhanced Python memory cleanup to clear API operation residue
            enhanced_python_memory_cleanup()
            
            # Additional garbage collection for FastAPI/database operations
            for _ in range(3):
                gc.collect()
            
            # Clear database session pools that may have accumulated
            try:
                from database import SessionLocal
                # Force database connection pool cleanup
                SessionLocal.close_all()
            except Exception:
                pass
            
            # Wait for cleanup to take effect
            import time
            time.sleep(2)
            
            memory_after_cleanup = get_memory_usage()
            memory_freed = memory_before_cleanup - memory_after_cleanup
            
            if memory_freed > 50:  # Significant cleanup
                logger.info(f"✅ Pre-scrape cleanup freed {memory_freed:.1f}MB (now {memory_after_cleanup:.1f}MB)")
            else:
                logger.debug(f"Pre-scrape cleanup freed {memory_freed:.1f}MB (now {memory_after_cleanup:.1f}MB)")
        
        # Get memory before scrape (after cleanup)
        memory_before = get_memory_usage()
        
        current_period = get_current_schedule_period()
        frequency = current_period
        logger.info(f"Starting {frequency} scheduled scrape (Memory: {memory_before:.1f} MB)")
        result = scrape_and_update_records()
        
        # Log memory after scrape
        memory_after = get_memory_usage()
        memory_change = memory_after - memory_before
        
        if result['success']:
            logger.info(f"{frequency.capitalize()} scrape completed successfully (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)")
        else:
            logger.warning(f"{frequency.capitalize()} scrape completed with issues (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)")
            
    except MemoryError as e:
        # Memory bomb detected - this is a critical system issue
        logger.critical(f"🚨 MEMORY BOMB DETECTED: {e}")
        logger.critical("🚨 This indicates a serious system issue that requires immediate attention")
        
        # Force aggressive cleanup to try to recover
        logger.info("🧹 Attempting emergency system recovery...")
        try:
            kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
            enhanced_python_memory_cleanup()
            import time
            time.sleep(5)  # Give system time to recover
            
            # Check if memory recovered
            memory_after_recovery = get_memory_usage()
            logger.info(f"Memory after emergency recovery: {memory_after_recovery:.1f} MB")
            
            if memory_after_recovery > 500:  # Still dangerously high
                logger.critical(f"🚨 RECOVERY FAILED: Memory still critically high ({memory_after_recovery:.1f} MB)")
                logger.critical("🚨 System may need Railway redeploy to fully recover")
            else:
                logger.info(f"✅ Emergency recovery successful: Memory reduced to {memory_after_recovery:.1f} MB")
                
        except Exception as recovery_error:
            logger.critical(f"🚨 Emergency recovery failed: {recovery_error}")
            
        # Continue with normal scheduling - let Railway handle redeploy if needed
        logger.info("Continuing with normal scheduling - Railway will handle redeploy if system becomes unstable")
        
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

def schedule_next_scrape():
    """Schedule the next scrape based on current time period"""
    try:
        # Remove any existing scrape job
        if scheduler.get_job('scrape_job'):
            scheduler.remove_job('scrape_job')
        
        current_period = get_current_schedule_period()
        if current_period == "3-minute":
            # High frequency: 3 minutes after completion
            delay_minutes = 3
            frequency = "3-minute"
        elif current_period == "30-minute":
            # Medium frequency: 30 minutes after completion
            delay_minutes = 30
            frequency = "30-minute"
        else:  # "1-hour"
            # Low frequency: 1 hour after completion
            delay_minutes = 60
            frequency = "1-hour"
        
        next_run_time = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
        
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=next_run_time,
            id='scrape_job'
        )
        
        print(f"Next {frequency} scrape scheduled for {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
        
    except Exception as e:
        logger.error(f"Error scheduling next scrape: {e}")

def update_schedule():
    """Update the scheduler based on current time period"""
    try:
        # Remove existing jobs
        if scheduler.get_job('scrape_job'):
            scheduler.remove_job('scrape_job')
        
        current_period = get_current_schedule_period()
        frequency = current_period
        
        next_change, next_frequency = get_next_schedule_change()
        print(f"Schedule updated to {frequency} scraping", flush=True)
        print(f"Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}", flush=True)
        
        # Schedule the first scrape based on current frequency period
        current_period = get_current_schedule_period()
        if current_period == "3-minute":
            delay_minutes = 3
        elif current_period == "30-minute":
            delay_minutes = 30
        else:  # "1-hour"
            delay_minutes = 60
        
        first_run_time = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=first_run_time,
            id='scrape_job'
        )
        
        print(f"First scrape scheduled for {first_run_time.strftime('%Y-%m-%d %H:%M:%S')} ({delay_minutes}-minute delay)", flush=True)
        
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

def periodic_memory_cleanup():
    """Periodic cleanup to prevent memory accumulation from API operations"""
    try:
        # Only run if not currently scraping
        if is_scraping:
            return
        
        current_memory = get_memory_usage()
        
        # Only cleanup if memory is elevated (>350MB) and we're not scraping
        if current_memory > 350:
            logger.info(f"🧹 Periodic cleanup: Memory at {current_memory:.1f}MB during idle")
            
            # Kill any orphaned processes
            kill_orphaned_chrome_processes(max_age_seconds=300, aggressive=False)
            
            # Light Python memory cleanup
            enhanced_python_memory_cleanup()
            
            # Clear database session pools
            try:
                from database import SessionLocal
                SessionLocal.close_all()
            except Exception:
                pass
            
            import gc
            gc.collect()
            gc.collect(2)
            
            memory_after = get_memory_usage()
            memory_freed = current_memory - memory_after
            
            if memory_freed > 20:
                logger.info(f"✅ Periodic cleanup freed {memory_freed:.1f}MB (now {memory_after:.1f}MB)")
            
    except Exception as e:
        logger.debug(f"Periodic cleanup error: {type(e).__name__}")



@app.get("/health")
def health_check():
    """Enhanced health check endpoint for Railway and monitoring"""
    try:
        # Get current memory usage consistently
        memory_mb = get_memory_usage()
        
        # Check if system is in a healthy state
        if memory_mb > 800:  # Critical memory threshold
            return JSONResponse(
                status_code=503,  # Service Unavailable - Railway will redeploy
                content={
                    "status": "unhealthy",
                    "reason": "critical_memory_usage",
                    "memory_mb": round(memory_mb, 1),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action_needed": "Railway should redeploy this instance"
                }
            )
        elif memory_mb > 500:  # Warning threshold
            return JSONResponse(
                status_code=200,
                content={
                    "status": "degraded",
                    "reason": "high_memory_usage",
                    "memory_mb": round(memory_mb, 1),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "warning": "Memory usage is elevated but still functional"
                }
            )
        else:
            return {
                "status": "healthy",
                "memory_mb": round(memory_mb, 1),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0"
            }
            
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "reason": "health_check_failed",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@app.get("/api")
def api_root():
    """API root endpoint"""
    current_period = get_current_schedule_period()
    frequency = current_period
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

def _get_processed_records():
    """Load records using optimized approach for better performance"""
    from optimized_records import get_all_records_optimized
    return get_all_records_optimized()

@app.get("/records/initial")
@app.get("/api/records/initial")
def get_initial_records():
    """Get first 1000 records for initial page load (high-performance optimized)"""
    try:
        from optimized_records import get_initial_records_optimized
        
        # Use optimized function that avoids loading all records
        result = get_initial_records_optimized(limit=1000)
        
        logger.info(f"Retrieved {len(result['records'])} initial records optimized")
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving initial records: {e}")
        return {"error": "Failed to retrieve initial records"}

@app.get("/records/remaining")
@app.get("/api/records/remaining")
def get_remaining_records():
    """Get remaining records after initial 1000 (high-performance optimized)"""
    try:
        from optimized_records import get_remaining_records_optimized
        
        # Use optimized function with database-level pagination
        result = get_remaining_records_optimized(skip=1000)
        
        logger.info(f"Retrieved {len(result['records'])} remaining records optimized")
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving remaining records: {e}")
        return {"error": "Failed to retrieve remaining records"}

@app.get("/records")
@app.get("/api/records")
def get_records():
    """Get all records from database with filter values (high-performance optimized)"""
    try:
        from optimized_records import get_all_records_optimized, get_filter_values_optimized
        
        # Get all records with optimized query
        all_records, total_count = get_all_records_optimized()
        
        # Get unique values with optimized queries
        unique_values = get_filter_values_optimized()
        
        logger.info(f"Retrieved all {len(all_records)} records optimized")
        return {
            "records": all_records,
            "total_records": len(all_records),
            "unique_values": unique_values
        }
    except Exception as e:
        logger.error(f"Error retrieving records: {e}")
        return {"error": "Failed to retrieve records"}

@app.get("/records/recent")
@app.get("/api/records/recent")
def get_recent_records():
    """Get recent records since last reset - optimized for fast initial load"""
    try:
        from simplified_records import get_recent_records_simple
        
        result = get_recent_records_simple(limit=1000)
        
        logger.info(f"Retrieved {len(result['records'])} recent records since {result['last_reset_date']}")
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving recent records: {e}")
        return {"error": "Failed to retrieve recent records"}

@app.get("/records/recent/all")
@app.get("/api/records/recent/all")
def get_all_recent_records():
    """Get ALL recent records since last reset (no limit)"""
    import time
    api_start = time.time()
    
    try:
        from simplified_records import get_all_recent_records_simple
        
        result = get_all_recent_records_simple()
        
        api_time = time.time() - api_start
        
        logger.info(f"🚀 API Response Complete:")
        logger.info(f"  Retrieved {len(result['records'])} recent records since {result['last_reset_date']}")
        logger.info(f"  Total API time: {api_time:.3f}s")
        logger.info(f"  DB time: {result['performance']['query_time']}s ({result['performance']['query_time']/api_time*100:.1f}%)")
        logger.info(f"  Processing time: {result['performance']['process_time']}s ({result['performance']['process_time']/api_time*100:.1f}%)")
        logger.info(f"  API overhead: {api_time - result['performance']['total_time']:.3f}s")
        
        return result
        
    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving all recent records after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve all recent records"}

@app.get("/records/older")
@app.get("/api/records/older")
def get_older_records():
    """Get older records (before last reset) for background loading"""
    import time
    api_start = time.time()
    
    try:
        from simplified_records import get_older_records_simple
        
        result = get_older_records_simple()
        
        api_time = time.time() - api_start
        
        logger.info(f"🚀 API Response Complete (Background):")
        logger.info(f"  Retrieved {len(result['records'])} older records for background")
        logger.info(f"  Total API time: {api_time:.3f}s")
        logger.info(f"  DB time: {result['performance']['query_time']}s ({result['performance']['query_time']/api_time*100:.1f}%)")
        logger.info(f"  API overhead: {api_time - result['performance']['total_time']:.3f}s")
        
        return result
        
    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving older records after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve older records"}

@app.get("/records/filtered")
@app.get("/api/records/filtered")
def get_filtered_records_endpoint(
    fish: str = None,
    waterbody: str = None, 
    bait: str = None,
    data_age: str = None,
    exclude_sandwich_bait: bool = True,
    limit: int = None,
    offset: int = None
):
    """Get filtered records based on criteria"""
    import time
    api_start = time.time()
    
    try:
        from simplified_records import get_filtered_records
        
        result = get_filtered_records(
            fish=fish,
            waterbody=waterbody,
            bait=bait,
            data_age=data_age,
            exclude_sandwich_bait=exclude_sandwich_bait,
            limit=limit,
            offset=offset
        )
        
        api_time = time.time() - api_start
        
        logger.info(f"🔍 Filtered API Response Complete:")
        logger.info(f"  Retrieved {result['showing_count']} of {result['total_filtered']} filtered records")
        logger.info(f"  Filters: fish={fish}, waterbody={waterbody}, bait={bait}, data_age={data_age}")
        logger.info(f"  SANDWICH BAIT DEBUG: exclude_sandwich_bait={exclude_sandwich_bait} (type: {type(exclude_sandwich_bait)})")
        logger.info(f"  Total API time: {api_time:.3f}s")
        logger.info(f"  DB time: {result['performance']['query_time']}s")
        logger.info(f"  Processing time: {result['performance']['process_time']}s")
        
        return result
        
    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving filtered records after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve filtered records"}

@app.get("/records/filter-values") 
@app.get("/api/records/filter-values")
def get_filter_values_endpoint():
    """Get unique values for filter dropdowns"""
    import time
    api_start = time.time()
    
    try:
        from simplified_records import get_filter_values
        
        result = get_filter_values()
        
        api_time = time.time() - api_start
        
        logger.info(f"📋 Filter Values API Response Complete:")
        logger.info(f"  Fish: {len(result['fish'])} options")
        logger.info(f"  Waterbody: {len(result['waterbody'])} options")
        logger.info(f"  Bait: {len(result['bait'])} options")
        logger.info(f"  Total API time: {api_time:.3f}s")
        
        return result
        
    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving filter values after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve filter values"}

@app.get("/refresh")
def refresh_info():
    """Information about the refresh endpoint"""
    return {
        "message": "Manual scrape endpoint",
        "method": "POST",
        "description": "Send a POST request to this endpoint to trigger a manual scrape",
        "example": "curl -X POST https://your-domain.com/refresh",
        "current_status": "scraping" if is_scraping else "idle",
        "note": "GET requests to this endpoint only show this information"
    }

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

@app.post("/optimize")
def run_database_optimizations():
    """Manually run database performance optimizations including indexes"""
    try:
        # Run performance migration to add indexes
        from performance_migration import add_performance_indexes, verify_indexes
        
        logger.info("Running performance optimization...")
        index_success = add_performance_indexes()
        
        if index_success:
            verify_success = verify_indexes()
        else:
            verify_success = False
        
        # Also run database maintenance if available
        maintenance_result = None
        try:
            from db_maintenance import run_database_maintenance
            maintenance_result = run_database_maintenance()
        except ImportError:
            logger.info("Database maintenance module not available")
        
        return {
            "message": "Database optimization completed",
            "indexes_added": index_success,
            "indexes_verified": verify_success,
            "maintenance_result": maintenance_result,
            "performance_improvement": "Queries should be significantly faster with new indexes"
        }
        
    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        return {"error": "Database optimization failed", "details": str(e)}

@app.post("/vacuum")
def vacuum_database():
    """Manually run VACUUM to reclaim space from deleted records"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "VACUUM not needed for SQLite",
                "database_type": "SQLite"
            }
        
        # Capture output
        import io
        import sys
        
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            print("🧹 Running PostgreSQL VACUUM to reclaim space...", flush=True)
            
            engine = create_engine(database_url, connect_args={'connect_timeout': 60})
            
            with engine.connect() as conn:
                # Get size before VACUUM
                result = conn.execute(text("""
                    SELECT pg_size_pretty(pg_total_relation_size('records')) as size_before
                """))
                size_before = result.fetchone()[0]
                print(f"Database size before VACUUM: {size_before}", flush=True)
                
                # Run VACUUM
                conn.execute(text("COMMIT"))
                conn.execute(text("VACUUM records"))
                
                # Get size after VACUUM
                result = conn.execute(text("""
                    SELECT pg_size_pretty(pg_total_relation_size('records')) as size_after
                """))
                size_after = result.fetchone()[0]
                print(f"Database size after VACUUM: {size_after}", flush=True)
                
        finally:
            sys.stdout = old_stdout
        
        output = captured_output.getvalue()
        
        return {
            "message": "VACUUM completed successfully",
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"VACUUM failed: {e}")
        return {
            "error": "VACUUM failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/vacuum/full")
def vacuum_full_database():
    """Run VACUUM FULL to completely rebuild the database and reclaim maximum space"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "VACUUM FULL not needed for SQLite",
                "database_type": "SQLite"
            }
        
        # Capture output
        import io
        import sys
        
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            logger.info("🧹 Running PostgreSQL VACUUM FULL - this will take longer but reclaim maximum space...")
            logger.warning("⚠️  WARNING: This locks the table during operation!")
            
            engine = create_engine(database_url, connect_args={'connect_timeout': 300})  # Longer timeout
            
            with engine.connect() as conn:
                # Get sizes before VACUUM FULL
                result = conn.execute(text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as total_db_size,
                        pg_size_pretty(pg_total_relation_size('records')) as table_size
                """))
                before = result.fetchone()
                logger.info(f"Total database size before: {before[0]}")
                logger.info(f"Records table size before: {before[1]}")
                
                # Run VACUUM FULL
                conn.execute(text("COMMIT"))
                logger.info("Running VACUUM FULL records...")
                conn.execute(text("VACUUM FULL records"))
                
                # Get sizes after VACUUM FULL
                result = conn.execute(text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as total_db_size,
                        pg_size_pretty(pg_total_relation_size('records')) as table_size
                """))
                after = result.fetchone()
                logger.info(f"Total database size after: {after[0]}")
                logger.info(f"Records table size after: {after[1]}")
                
                logger.info("✅ VACUUM FULL completed successfully!")
                
        finally:
            sys.stdout = old_stdout
        
        output = captured_output.getvalue()
        
        return {
            "message": "VACUUM FULL completed successfully",
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "warning": "VACUUM FULL locks the table during operation but reclaims maximum space"
        }
        
    except Exception as e:
        logger.error(f"VACUUM FULL failed: {e}")
        return {
            "error": "VACUUM FULL failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/merge-duplicates/status")
def check_merge_status():
    """Check how many duplicate groups remain without running migration"""
    try:
        from merge_duplicate_records import check_duplicate_status
        
        # Capture output
        import io
        import sys
        
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            remaining_groups = check_duplicate_status()
        finally:
            sys.stdout = old_stdout
        
        output = captured_output.getvalue()
        
        return {
            "remaining_duplicate_groups": remaining_groups,
            "migration_complete": remaining_groups == 0,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "error": "Status check failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/merge-duplicates")
def merge_duplicate_records():
    """Merge duplicate records and combine categories - BATCH PROCESSING (5K groups per run)"""
    try:
        # Import and run the merger script
        from merge_duplicate_records import merge_duplicate_records, verify_migration
        
        # Capture output by redirecting stdout
        import io
        import sys
        
        # Capture the output
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            # Run the migration
            success = merge_duplicate_records()
            
            # Verify the migration
            if success:
                verification_success = verify_migration()
            else:
                verification_success = False
            
        finally:
            # Restore stdout
            sys.stdout = old_stdout
        
        # Get the captured output
        output = captured_output.getvalue()
        
        return {
            "message": "Batch migration completed" if success else "Batch migration failed",
            "success": success,
            "verification_passed": verification_success if success else False,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "warning": "BATCH PROCESSING: Processes 5,000 duplicate groups per run - run multiple times if needed"
        }
        
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        return {
            "error": "Database migration failed", 
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/merge-duplicates/rollback")
def rollback_duplicate_merge():
    """Emergency rollback of duplicate merge operation"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        
        rollback_info = {
            "pre_rollback_stats": {},
            "rollback_actions": [],
            "post_rollback_stats": {}
        }
        
        with engine.connect() as conn:
            # Get pre-rollback stats
            result = conn.execute(text("SELECT COUNT(*) FROM records"))
            rollback_info["pre_rollback_stats"]["total_records"] = result.scalar()
            
            result = conn.execute(text("SELECT COUNT(*) FROM records WHERE category LIKE '%;%'"))
            rollback_info["pre_rollback_stats"]["merged_records"] = result.scalar()
            
            # Check if we have merged records to rollback
            if rollback_info["pre_rollback_stats"]["merged_records"] == 0:
                return {
                    "message": "No merged records found to rollback",
                    "stats": rollback_info["pre_rollback_stats"]
                }
            
            # Start transaction for rollback
            trans = conn.begin()
            
            try:
                # Find all merged records and expand them back to individual records
                result = conn.execute(text("""
                    SELECT id, fish, weight, player, waterbody, region, date, category
                    FROM records 
                    WHERE category LIKE '%;%'
                    LIMIT 1000
                """))
                
                merged_records = result.fetchall()
                rollback_info["rollback_actions"].append(f"Found {len(merged_records)} merged records to expand")
                
                # Category mapping (reverse of merge)
                category_reverse_map = {
                    'N': 'Normal',
                    'L': 'Light', 
                    'U': 'Ultralight',
                    'B': 'BottomLight',
                    'T': 'Telescopic'
                }
                
                expanded_count = 0
                deleted_count = 0
                
                for record in merged_records:
                    # Parse categories
                    categories = record[7].split(';')
                    
                    # Delete the merged record
                    conn.execute(text("""
                        DELETE FROM records WHERE id = :record_id
                    """), {"record_id": record[0]})
                    deleted_count += 1
                    
                    # Insert individual records for each category
                    for cat_code in categories:
                        if cat_code.strip() in category_reverse_map:
                            full_category = category_reverse_map[cat_code.strip()]
                            
                            conn.execute(text("""
                                INSERT INTO records (fish, weight, player, waterbody, region, date, category)
                                VALUES (:fish, :weight, :player, :waterbody, :region, :date, :category)
                            """), {
                                "fish": record[1],
                                "weight": record[2], 
                                "player": record[3],
                                "waterbody": record[4],
                                "region": record[5],
                                "date": record[6],
                                "category": full_category
                            })
                            expanded_count += 1
                
                rollback_info["rollback_actions"].append(f"Deleted {deleted_count} merged records")
                rollback_info["rollback_actions"].append(f"Created {expanded_count} individual records")
                
                # Commit the rollback
                trans.commit()
                rollback_info["rollback_actions"].append("Rollback transaction committed")
                
                # Get post-rollback stats
                result = conn.execute(text("SELECT COUNT(*) FROM records"))
                rollback_info["post_rollback_stats"]["total_records"] = result.scalar()
                
                result = conn.execute(text("SELECT COUNT(*) FROM records WHERE category LIKE '%;%'"))
                rollback_info["post_rollback_stats"]["merged_records"] = result.scalar()
                
                return {
                    "message": "Duplicate merge rollback completed successfully",
                    "rollback_info": rollback_info,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "Records have been expanded back to individual category entries"
                }
                
            except Exception as e:
                trans.rollback()
                rollback_info["rollback_actions"].append(f"Rollback failed, transaction rolled back: {str(e)}")
                raise e
        
    except Exception as e:
        logger.error(f"Rollback operation failed: {e}")
        return {
            "error": "Rollback operation failed",
            "details": str(e),
            "rollback_info": rollback_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/cleanup")
def force_cleanup():
    """Force garbage collection and process cleanup for memory management"""
    try:
        import gc
        from scraper import enhanced_python_memory_cleanup, kill_orphaned_chrome_processes
        
        # Get memory before cleanup
        memory_before = get_memory_usage()
        
        # Force garbage collection
        enhanced_python_memory_cleanup()
        
        # Kill orphaned Chrome processes
        kill_orphaned_chrome_processes()
        
        # Additional aggressive cleanup
        gc.collect()
        gc.collect(0)
        gc.collect(1) 
        gc.collect(2)
        
        # Get memory after cleanup
        memory_after = get_memory_usage()
        memory_freed = memory_before - memory_after
        
        return {
            "status": "cleanup_completed",
            "memory_before_mb": round(memory_before, 2),
            "memory_after_mb": round(memory_after, 2), 
            "memory_freed_mb": round(memory_freed, 2),
            "cleanup_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@app.get("/status")
def get_status():
    """Get server and scraping status with memory information"""
    try:
        import psutil
        import os as os_module
        
        # Get memory usage consistently
        memory_mb = get_memory_usage()
        
        # Get memory percentage (need psutil for this specific metric)
        process = psutil.Process(os_module.getpid())
        
        db: Session = SessionLocal()
        total_records = db.query(Record).count()
        db.close()
        
        # Get current schedule info
        current_period = get_current_schedule_period()
        frequency = current_period
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

@app.get("/database/analysis")
def analyze_database_size():
    """Comprehensive database size analysis to identify space usage"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "Database analysis only available for PostgreSQL",
                "database_type": "SQLite"
            }
        
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        analysis = {}
        
        with engine.connect() as conn:
            # 1. Overall database size
            result = conn.execute(text("""
                SELECT 
                    pg_database.datname,
                    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
                FROM pg_database 
                WHERE pg_database.datname = current_database()
            """))
            db_info = result.fetchone()
            analysis["total_database_size"] = db_info[1]
            
            # 2. Table sizes breakdown
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
                    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
                    pg_total_relation_size(schemaname||'.'||tablename) as bytes_total
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """))
            tables = result.fetchall()
            analysis["tables"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "total_size": row[2],
                    "table_size": row[3], 
                    "index_size": row[4],
                    "bytes": row[5]
                }
                for row in tables
            ]
            
            # 3. WAL (Write-Ahead Log) size
            result = conn.execute(text("""
                SELECT 
                    pg_size_pretty(
                        COALESCE(
                            (SELECT SUM(size) FROM pg_ls_waldir()), 
                            0
                        )
                    ) as wal_size
            """))
            wal_info = result.fetchone()
            analysis["wal_size"] = wal_info[0] if wal_info else "Unknown"
            
            # 4. Temporary files
            result = conn.execute(text("""
                SELECT 
                    pg_size_pretty(
                        COALESCE(temp_bytes, 0)
                    ) as temp_size
                FROM pg_stat_database 
                WHERE datname = current_database()
            """))
            temp_info = result.fetchone()
            analysis["temp_files_size"] = temp_info[0] if temp_info else "0 bytes"
            
            # 5. Dead tuples and bloat
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    relname,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    CASE 
                        WHEN n_live_tup > 0 
                        THEN ROUND(CAST((n_dead_tup::numeric / n_live_tup::numeric) * 100 AS numeric), 2)
                        ELSE 0 
                    END as dead_tuple_ratio
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                ORDER BY n_dead_tup DESC
            """))
            bloat_info = result.fetchall()
            analysis["table_bloat"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "live_tuples": row[2],
                    "dead_tuples": row[3],
                    "dead_ratio_percent": row[4]
                }
                for row in bloat_info
            ]
            
            # 6. Database connections and locks
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) as total_connections,
                    COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                    COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """))
            conn_info = result.fetchone()
            analysis["connections"] = {
                "total": conn_info[0],
                "active": conn_info[1], 
                "idle": conn_info[2]
            }
            
            # 7. Last vacuum/analyze times
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    relname,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
            """))
            maintenance_info = result.fetchall()
            analysis["maintenance_history"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "last_vacuum": str(row[2]) if row[2] else "Never",
                    "last_autovacuum": str(row[3]) if row[3] else "Never",
                    "last_analyze": str(row[4]) if row[4] else "Never",
                    "last_autoanalyze": str(row[5]) if row[5] else "Never"
                }
                for row in maintenance_info
            ]
        
        return {
            "message": "Database analysis completed",
            "analysis": analysis,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Check for WAL files, temp files, and table bloat as potential causes of size discrepancy"
        }
        
    except Exception as e:
        logger.error(f"Database analysis failed: {e}")
        return {
            "error": "Database analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/checkpoint")
def force_checkpoint():
    """Force PostgreSQL checkpoint to clean up WAL files"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "CHECKPOINT not available for SQLite",
                "database_type": "SQLite"
            }
        
        # Capture output
        import io
        import sys
        
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output
        
        try:
            logger.info("🔄 Forcing PostgreSQL CHECKPOINT to clean up WAL files...")
            
            engine = create_engine(database_url, connect_args={'connect_timeout': 120})
            
            with engine.connect() as conn:
                # Get WAL size before checkpoint
                result = conn.execute(text("""
                    SELECT 
                        pg_size_pretty(
                            COALESCE(
                                (SELECT SUM(size) FROM pg_ls_waldir()), 
                                0
                            )
                        ) as wal_size_before
                """))
                wal_before = result.fetchone()[0]
                logger.info(f"WAL size before checkpoint: {wal_before}")
                
                # Force checkpoint
                conn.execute(text("COMMIT"))
                logger.info("Running CHECKPOINT...")
                conn.execute(text("CHECKPOINT"))
                
                # Get WAL size after checkpoint
                result = conn.execute(text("""
                    SELECT 
                        pg_size_pretty(
                            COALESCE(
                                (SELECT SUM(size) FROM pg_ls_waldir()), 
                                0
                            )
                        ) as wal_size_after
                """))
                wal_after = result.fetchone()[0]
                logger.info(f"WAL size after checkpoint: {wal_after}")
                
                # Also try to clean up temporary files
                logger.info("Checking for temp file cleanup...")
                result = conn.execute(text("""
                    SELECT 
                        pg_size_pretty(COALESCE(temp_bytes, 0)) as temp_size
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """))
                temp_size = result.fetchone()[0]
                logger.info(f"Temp files size: {temp_size}")
                
                logger.info("✅ CHECKPOINT completed successfully!")
                
        finally:
            sys.stdout = old_stdout
        
        output = captured_output.getvalue()
        
        return {
            "message": "CHECKPOINT completed successfully",
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "CHECKPOINT forces WAL file cleanup and may reduce database volume"
        }
        
    except Exception as e:
        logger.error(f"CHECKPOINT failed: {e}")
        return {
            "error": "CHECKPOINT failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/database/investigation")
def investigate_database_space():
    """Deep investigation of database space usage to find hidden space consumers"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "Investigation only available for PostgreSQL",
                "database_type": "SQLite"
            }
        
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        investigation = {}
        
        with engine.connect() as conn:
            # 1. All databases on this PostgreSQL instance
            result = conn.execute(text("""
                SELECT 
                    datname,
                    pg_size_pretty(pg_database_size(datname)) as size,
                    pg_database_size(datname) as bytes
                FROM pg_database 
                ORDER BY pg_database_size(datname) DESC
            """))
            investigation["all_databases"] = [
                {"name": row[0], "size": row[1], "bytes": row[2]}
                for row in result.fetchall()
            ]
            
            # 2. ALL tables in current database (including system tables)
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
                    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
                    pg_total_relation_size(schemaname||'.'||tablename) as bytes
                FROM pg_tables 
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 20
            """))
            investigation["all_tables"] = [
                {
                    "schema": row[0],
                    "table": row[1], 
                    "total_size": row[2],
                    "table_size": row[3],
                    "index_size": row[4],
                    "bytes": row[5]
                }
                for row in result.fetchall()
            ]
            
            # 3. WAL files breakdown
            result = conn.execute(text("""
                SELECT 
                    name,
                    pg_size_pretty(size) as size,
                    size as bytes,
                    modification
                FROM pg_ls_waldir()
                ORDER BY size DESC
                LIMIT 10
            """))
            investigation["wal_files"] = [
                {
                    "name": row[0],
                    "size": row[1], 
                    "bytes": row[2],
                    "modified": str(row[3])
                }
                for row in result.fetchall()
            ]
            
            # 4. Database activity and locks
            result = conn.execute(text("""
                SELECT 
                    pid,
                    usename,
                    application_name,
                    state,
                    query_start,
                    state_change,
                    LEFT(query, 100) as query_preview
                FROM pg_stat_activity 
                WHERE datname = current_database()
                ORDER BY query_start DESC
            """))
            investigation["active_connections"] = [
                {
                    "pid": row[0],
                    "user": row[1],
                    "app": row[2],
                    "state": row[3],
                    "query_start": str(row[4]) if row[4] else None,
                    "state_change": str(row[5]) if row[5] else None,
                    "query": row[6]
                }
                for row in result.fetchall()
            ]
            
            # 5. Check for orphaned temporary tables
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables 
                WHERE tablename LIKE '%temp%' 
                   OR tablename LIKE '%tmp%'
                   OR tablename LIKE '%backup%'
                   OR tablename LIKE '%old%'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """))
            investigation["potential_temp_tables"] = [
                {"schema": row[0], "table": row[1], "size": row[2]}
                for row in result.fetchall()
            ]
            
            # 6. Transaction and replication status
            result = conn.execute(text("""
                SELECT 
                    txid_current() as current_transaction_id,
                    pg_is_in_recovery() as in_recovery_mode
            """))
            tx_info = result.fetchone()
            investigation["transaction_info"] = {
                "current_txid": tx_info[0],
                "in_recovery": tx_info[1]
            }
            
            # 7. Check for replication slots (can hold WAL files)
            result = conn.execute(text("""
                SELECT 
                    slot_name,
                    slot_type,
                    active,
                    pg_size_pretty(
                        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
                    ) as retained_wal
                FROM pg_replication_slots
            """))
            investigation["replication_slots"] = [
                {
                    "name": row[0],
                    "type": row[1],
                    "active": row[2],
                    "retained_wal": row[3]
                }
                for row in result.fetchall()
            ]
        
        return {
            "message": "Database space investigation completed",
            "investigation": investigation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Look for hidden tables, WAL accumulation, or replication slots holding space"
        }
        
    except Exception as e:
        logger.error(f"Database investigation failed: {e}")
        return {
            "error": "Database investigation failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/database/volume-analysis")
def analyze_volume_usage():
    """Comprehensive analysis of all files in PostgreSQL data directory"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text
        
        database_url = get_database_url()
        is_postgres = 'postgresql' in database_url.lower() or 'postgres' in database_url.lower()
        
        if not is_postgres:
            return {
                "message": "Volume analysis only available for PostgreSQL",
                "database_type": "SQLite"
            }
        
        engine = create_engine(database_url, connect_args={'connect_timeout': 60})
        volume_analysis = {}
        
        with engine.connect() as conn:
            # Use autocommit mode to avoid transaction issues
            conn = conn.execution_options(autocommit=True)
            
            # 1. Total database size vs volume
            result = conn.execute(text("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    pg_database_size(current_database()) as database_bytes
            """))
            db_info = result.fetchone()
            volume_analysis["database_size"] = {
                "size": db_info[0],
                "bytes": db_info[1]
            }
            
            # 2. ALL WAL files (not just top 10)
            try:
                result = conn.execute(text("""
                    SELECT 
                        COUNT(*) as wal_file_count,
                        pg_size_pretty(SUM(size)) as total_wal_size,
                        SUM(size) as total_wal_bytes,
                        pg_size_pretty(AVG(size)) as avg_wal_size,
                        pg_size_pretty(MAX(size)) as max_wal_size,
                        pg_size_pretty(MIN(size)) as min_wal_size
                    FROM pg_ls_waldir()
                """))
                wal_summary = result.fetchone()
                volume_analysis["wal_summary"] = {
                    "count": wal_summary[0],
                    "total_size": wal_summary[1],
                    "total_bytes": wal_summary[2],
                    "avg_size": wal_summary[3],
                    "max_size": wal_summary[4],
                    "min_size": wal_summary[5]
                }
            except Exception as e:
                volume_analysis["wal_summary"] = {"error": f"Cannot access WAL files: {str(e)}"}
            
            # 3. Check pg_wal archive directory if accessible
            try:
                result = conn.execute(text("""
                    SELECT 
                        COUNT(*) as archive_count,
                        pg_size_pretty(SUM(size)) as total_archive_size,
                        SUM(size) as total_archive_bytes
                    FROM pg_ls_archive_statusdir()
                """))
                archive_info = result.fetchone()
                volume_analysis["wal_archive"] = {
                    "count": archive_info[0],
                    "total_size": archive_info[1],
                    "total_bytes": archive_info[2]
                }
            except Exception as e:
                volume_analysis["wal_archive"] = {"error": f"Cannot access WAL archive: {str(e)}"}
            
            # 4. Temporary files
            try:
                result = conn.execute(text("""
                    SELECT 
                        COUNT(*) as temp_file_count,
                        pg_size_pretty(SUM(size)) as total_temp_size,
                        SUM(size) as total_temp_bytes
                    FROM pg_ls_tmpdir()
                """))
                temp_info = result.fetchone()
                volume_analysis["temp_files"] = {
                    "count": temp_info[0],
                    "total_size": temp_info[1],
                    "total_bytes": temp_info[2]
                }
            except Exception as e:
                volume_analysis["temp_files"] = {"error": f"Cannot access temp files: {str(e)}"}
            
            # 5. Log files
            try:
                result = conn.execute(text("""
                    SELECT 
                        COUNT(*) as log_file_count,
                        pg_size_pretty(SUM(size)) as total_log_size,
                        SUM(size) as total_log_bytes
                    FROM pg_ls_logdir()
                """))
                log_info = result.fetchone()
                volume_analysis["log_files"] = {
                    "count": log_info[0],
                    "total_size": log_info[1],
                    "total_bytes": log_info[2]
                }
            except Exception as e:
                volume_analysis["log_files"] = {"error": f"Cannot access log files: {str(e)}"}
            
            # 6. PostgreSQL settings that affect disk usage (simplified to avoid transaction issues)
            try:
                result = conn.execute(text("""
                    SELECT 
                        'max_wal_size' as name, 
                        current_setting('max_wal_size') as setting,
                        'MB' as unit
                    UNION ALL
                    SELECT 
                        'min_wal_size' as name,
                        current_setting('min_wal_size') as setting, 
                        'MB' as unit
                    UNION ALL
                    SELECT
                        'wal_keep_size' as name,
                        current_setting('wal_keep_size') as setting,
                        'MB' as unit
                """))
                volume_analysis["postgres_settings"] = [
                    {
                        "name": row[0],
                        "setting": row[1],
                        "unit": row[2]
                    }
                    for row in result.fetchall()
                ]
            except Exception as e:
                volume_analysis["postgres_settings"] = {"error": f"Cannot access settings: {str(e)}"}
            
            # 7. Calculate estimated total volume usage
            total_estimated = db_info[1]  # Database size
            if "total_bytes" in volume_analysis.get("wal_summary", {}) and volume_analysis["wal_summary"]["total_bytes"]:
                total_estimated += volume_analysis["wal_summary"]["total_bytes"]
            if "total_bytes" in volume_analysis.get("temp_files", {}) and volume_analysis["temp_files"]["total_bytes"]:
                total_estimated += volume_analysis["temp_files"]["total_bytes"]
            if "total_bytes" in volume_analysis.get("log_files", {}) and volume_analysis["log_files"]["total_bytes"]:
                total_estimated += volume_analysis["log_files"]["total_bytes"]
            if "total_bytes" in volume_analysis.get("wal_archive", {}) and volume_analysis["wal_archive"]["total_bytes"]:
                total_estimated += volume_analysis["wal_archive"]["total_bytes"]
            
            volume_analysis["estimated_total"] = {
                "bytes": total_estimated,
                "size": f"{total_estimated / (1024*1024):.1f} MB"
            }
        
        return {
            "message": "Volume analysis completed",
            "volume_analysis": volume_analysis,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "This shows all PostgreSQL files contributing to volume size"
        }
        
    except Exception as e:
        logger.error(f"Volume analysis failed: {e}")
        return {
            "error": "Volume analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }



# Serve the frontend for all other routes (SPA routing)
@app.get("/{path:path}")
def serve_frontend(path: str):
    """Serve the frontend application for all non-API routes"""
    # Don't serve frontend for API paths and endpoints
    api_endpoints = ["api", "health", "refresh", "cleanup", "status", "records"]
    if path.startswith("api") or path in api_endpoints:
        raise HTTPException(status_code=404, detail="Not found")
    
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
    
    print(f"Starting server on {host}:{port}", flush=True)
    uvicorn.run(app, host=host, port=port) 