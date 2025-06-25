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
from scheduler import is_high_frequency_period, get_next_schedule_change
import logging
import gc
import signal
import sys
import time
import threading
import os
import builtins

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

# Initialize scheduler but don't start it yet
scheduler = BackgroundScheduler()

# Built-in functions should be available naturally

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
        
        frequency = "3-minute" if is_high_frequency_period() else "15-minute"
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
        
        if is_high_frequency_period():
            # High frequency: 3 minutes after completion
            delay_minutes = 3
            frequency = "3-minute"
        else:
            # Low frequency: 15 minutes after completion
            delay_minutes = 15
            frequency = "15-minute"
        
        next_run_time = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
        
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=next_run_time,
            id='scrape_job'
        )
        
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
        
        # Schedule the first scrape based on current frequency period
        if is_high_frequency_period():
            delay_minutes = 3
        else:
            delay_minutes = 15
        
        first_run_time = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
        scheduler.add_job(
            scheduled_scrape,
            'date',
            run_date=first_run_time,
            id='scrape_job'
        )
        
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

@app.on_event("startup")
def startup_event():
    """Server startup - run migrations and start scheduler"""
    logger.info("=== SERVER STARTUP ===")
    print("🚀 FastAPI server is starting up...")
    
    # Create/verify database tables first
    try:
        create_tables()
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        print(f"❌ Database error: {e}")
    
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
        
        logger.info("Dynamic scheduler started - frequency based on weekly schedule")
        logger.info("Periodic memory cleanup scheduled every 90 seconds")
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
    
    print("📊 Available endpoints:")
    print("   GET  /         - Server status")
    print("   GET  /records  - Get all fishing records")
    print("   POST /refresh  - Trigger manual scrape")
    print("   POST /optimize - Run database performance optimizations")
    print("   POST /merge-duplicates - Merge duplicate records (MAJOR MIGRATION)")
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

def _get_processed_records():
    """Load records using simplified approach since duplicates are now merged"""
    from simplified_records import get_simplified_records
    return get_simplified_records()

@app.get("/records/initial")
@app.get("/api/records/initial")
def get_initial_records(limit: int = 1000):
    """Get initial batch of records for FAST page load - optimized to avoid processing all records"""
    try:
        db: Session = SessionLocal()
        
        # FAST PATH: Get only a limited set of records from database (not all 90K!)
        # Order by ID descending to get most recent records first
        limited_records = db.query(Record).order_by(Record.id.desc()).limit(limit * 3).all()  # Get 3x limit to account for deduplication
        
        # Quick deduplication on limited set
        record_groups = {}
        for r in limited_records:
            key = (r.player, r.fish, r.weight, r.waterbody, r.bait1, r.bait2, r.date, r.region)
            if key not in record_groups:
                record_groups[key] = []
            record_groups[key].append(r)
        
        # Process limited records
        initial_batch = []
        for key, group_records in record_groups.items():
            if len(initial_batch) >= limit:
                break
                
            representative = group_records[0]
            categories = [r.category for r in group_records if r.category]
            
            bait_display = f"{representative.bait1}; {representative.bait2}" if representative.bait2 else (representative.bait1 or representative.bait or "")
            
            initial_batch.append({
                "player": representative.player,
                "fish": representative.fish,
                "weight": representative.weight,
                "waterbody": representative.waterbody,
                "bait_display": bait_display,
                "date": representative.date,
                "created_at": representative.created_at.isoformat() if hasattr(representative, 'created_at') and representative.created_at else None,
                "region": representative.region,
                "categories": categories,
                "bait1": representative.bait1,
                "bait2": representative.bait2
            })
        
        # Get total counts efficiently (without processing all records)
        total_db_records = db.query(Record).count()
        
        # Get unique values from limited set for now (will be updated when full data loads)
        fish = sorted(list(set(r['fish'] for r in initial_batch if r['fish'])))
        waterbody = sorted(list(set(r['waterbody'] for r in initial_batch if r['waterbody'])))
        bait = sorted(list(set(r['bait_display'] for r in initial_batch if r['bait_display'])))
        
        db.close()
        
        logger.info(f"FAST: Retrieved initial {len(initial_batch)} records from limited query (total DB records: {total_db_records})")
        return {
            "records": initial_batch,
            "total_unique_records": "unknown",  # Will be determined when full data loads
            "total_db_records": total_db_records,
            "has_more": True,  # Always true for initial load
            "unique_values": {
                "fish": fish,
                "waterbody": waterbody,
                "bait": bait
            }
        }
    except Exception as e:
        logger.error(f"Error retrieving initial records: {e}")
        return {"error": "Failed to retrieve initial records"}

@app.get("/records/remaining")
@app.get("/api/records/remaining")
def get_remaining_records(skip: int = 1000):
    """Get remaining records after initial batch - this processes the full dataset"""
    try:
        result, total_db_records = _get_processed_records()
        
        # Return records after the skip point
        remaining_records = result[skip:]
        
        # Also return complete unique values for filters (from full dataset)
        fish = sorted(list(set(r['fish'] for r in result if r['fish'])))
        waterbody = sorted(list(set(r['waterbody'] for r in result if r['waterbody'])))
        bait = sorted(list(set(r['bait_display'] for r in result if r['bait_display'])))
        
        logger.info(f"Retrieved {len(remaining_records)} remaining records (skipped first {skip}, total unique: {len(result)})")
        return {
            "records": remaining_records,
            "total_unique_records": len(result),
            "total_db_records": total_db_records,
            "unique_values": {
                "fish": fish,
                "waterbody": waterbody,
                "bait": bait
            }
        }
    except Exception as e:
        logger.error(f"Error retrieving remaining records: {e}")
        return {"error": "Failed to retrieve remaining records"}

@app.get("/records")
@app.get("/api/records")
def get_records():
    """Get all records from database, deduplicated for frontend display (legacy endpoint)"""
    try:
        result, total_db_records = _get_processed_records()
        
        logger.info(f"Retrieved {len(result)} unique records (from {total_db_records} total records) via legacy API")
        return result
    except Exception as e:
        logger.error(f"Error retrieving records: {e}")
        return {"error": "Failed to retrieve records"}

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
    """Manually run database performance optimizations"""
    try:
        # Run database maintenance
        from db_maintenance import run_database_maintenance
        maintenance_result = run_database_maintenance()
        
        return {
            "message": "Database maintenance completed",
            "result": maintenance_result
        }
        
    except Exception as e:
        return {"error": "Database maintenance failed", "details": str(e)}

@app.post("/merge-duplicates")
def merge_duplicate_records():
    """Merge duplicate records and combine categories - MAJOR DATABASE MIGRATION"""
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
            "message": "Database migration completed" if success else "Database migration failed",
            "success": success,
            "verification_passed": verification_success if success else False,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "warning": "This is a major database migration that permanently modifies data structure"
        }
        
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        return {
            "error": "Database migration failed", 
            "details": str(e),
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
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port) 