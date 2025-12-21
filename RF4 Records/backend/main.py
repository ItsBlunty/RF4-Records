from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import (
    SessionLocal,
    Record,
    QADataset,
    CafeOrder,
    Feedback,
    PollVote,
    create_tables,
)
from scraper import scrape_and_update_records, should_stop_scraping
from unified_cleanup import periodic_cleanup, get_memory_usage
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
import aiosmtplib
from email.message import EmailMessage
from email.utils import formatdate

# Set up logging to stdout (not stderr) to avoid red text in Railway
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors to reduce red text
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,  # Explicitly use stdout to avoid red text in Railway
)
logger = logging.getLogger(__name__)

# Reduce APScheduler logging verbosity to avoid red text in Railway
logging.getLogger("apscheduler").setLevel(logging.WARNING)
# Also suppress uvicorn access logs that might show as red
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

# Initialize scheduler but don't start it yet
# Configure with misfire grace time to handle timing issues better
scheduler = BackgroundScheduler(
    job_defaults={
        'misfire_grace_time': 60,  # Allow jobs to run up to 60 seconds late
        'coalesce': True,          # Combine multiple missed executions into one
        'max_instances': 1         # Prevent multiple instances of same job
    }
)

# Track server startup time for uptime calculation
server_start_time = None


def get_git_commit_info():
    """Get current git commit information from Railway environment variables or git"""
    try:
        # Try Railway environment variables first (available when deployed via GitHub)
        railway_commit_sha = os.getenv("RAILWAY_GIT_COMMIT_SHA")
        railway_author = os.getenv("RAILWAY_GIT_AUTHOR")
        railway_branch = os.getenv("RAILWAY_GIT_BRANCH")
        railway_repo_name = os.getenv("RAILWAY_GIT_REPO_NAME")
        railway_repo_owner = os.getenv("RAILWAY_GIT_REPO_OWNER")
        railway_commit_message = os.getenv("RAILWAY_GIT_COMMIT_MESSAGE")

        if railway_commit_sha:
            return {
                "commit_hash": railway_commit_sha[:7],  # Short hash
                "commit_hash_full": railway_commit_sha,
                "commit_message": railway_commit_message or "No message available",
                "commit_date": "Railway deployment",  # Railway doesn't provide commit date
                "branch": railway_branch or "unknown",
                "author": railway_author or "unknown",
                "repo": f"{railway_repo_owner}/{railway_repo_name}"
                if railway_repo_owner and railway_repo_name
                else "unknown",
            }

        # Fallback to git commands for local development
        import subprocess

        # Get current commit hash
        commit_hash = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            universal_newlines=True,
        ).strip()

        # Get commit message
        commit_message = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%s"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            universal_newlines=True,
        ).strip()

        # Get commit date
        commit_date = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%ci"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            universal_newlines=True,
        ).strip()

        # Get current branch
        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            universal_newlines=True,
        ).strip()

        # Get author
        author = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%an"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            universal_newlines=True,
        ).strip()

        return {
            "commit_hash": commit_hash[:7],  # Short hash
            "commit_hash_full": commit_hash,
            "commit_message": commit_message,
            "commit_date": commit_date,
            "branch": branch,
            "author": author,
            "repo": "local",
        }
    except Exception as e:
        logger.warning(f"Could not get git commit info: {e}")
        return {
            "commit_hash": "unknown",
            "commit_hash_full": "unknown",
            "commit_message": "Git info not available",
            "commit_date": "unknown",
            "branch": "unknown",
            "author": "unknown",
            "repo": "unknown",
        }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan event handler for startup and shutdown"""
    # Startup
    global server_start_time
    server_start_time = datetime.now()
    print("=== SERVER STARTUP ===", flush=True)
    print("🚀 FastAPI server is starting up...", flush=True)

    # Log git commit information for deployment tracking
    git_info = get_git_commit_info()
    if git_info:
        print(
            f"📝 Git commit: {git_info['commit_hash']} ({git_info['branch']})",
            flush=True,
        )
        print(f"📦 Commit message: {git_info['commit_message']}", flush=True)
        if git_info.get("author"):
            print(f"👤 Author: {git_info['author']}", flush=True)

    # Create/verify database tables first
    try:
        create_tables()
        print("Database tables created/verified successfully", flush=True)
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        print(f"❌ Database error: {e}", flush=True)

    # Run database migrations
    try:
        from migrations import run_migrations

        run_migrations()
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        print(f"❌ Migration error: {e}", flush=True)

    # Initialize Q&A dataset with initial data (database is ready at this point)
    try:
        from init_qa_data import init_qa_data

        print("📝 Initializing Q&A dataset on startup...", flush=True)
        success = init_qa_data()
        if success:
            print("✅ Q&A dataset initialized successfully", flush=True)
        else:
            print(
                "⚠️ Q&A dataset initialization completed (may already exist)", flush=True
            )
    except Exception as e:
        logger.error(f"Error initializing Q&A dataset on startup: {e}")

    # Generate top baits cache on startup (database is ready at this point)
    try:
        from top_baits_cache import generate_top_baits_cache

        print("🎣 Generating top baits cache on startup...", flush=True)
        success = generate_top_baits_cache()
        if success:
            print("✅ Top baits cache generated successfully", flush=True)
        else:
            print("⚠️ Failed to generate top baits cache on startup", flush=True)
    except Exception as e:
        logger.error(f"Error generating top baits cache on startup: {e}")

    # Now start the scheduler after database is ready
    try:
        scheduler.start()

        # Set up dynamic scheduling based on current time
        update_schedule()

        # Add hourly monitoring job as fallback
        scheduler.add_job(
            schedule_monitor, "interval", hours=1, id="schedule_monitor_job"
        )

        # Add periodic memory cleanup job (every 90 seconds during idle)
        scheduler.add_job(
            periodic_memory_cleanup, "interval", seconds=90, id="memory_cleanup_job"
        )

        print(
            "Dynamic scheduler started - frequency based on weekly schedule", flush=True
        )
        print("Periodic memory cleanup scheduled every 90 seconds", flush=True)

    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")

    print("📊 Available endpoints:", flush=True)
    print("   GET  /         - Server status", flush=True)
    print("   GET  /records  - Get all fishing records", flush=True)
    print("   POST /refresh  - Trigger manual scrape", flush=True)
    print("   POST /optimize - Run database performance optimizations", flush=True)
    print(
        "   POST /merge-duplicates - Merge duplicate records (MAJOR MIGRATION)",
        flush=True,
    )
    print("   GET  /status   - Server and DB status", flush=True)
    print("   GET  /docs     - Interactive API documentation", flush=True)
    print("   GET  /api/poll/current - Get current poll", flush=True)
    print("   POST /api/poll/vote - Submit poll vote", flush=True)
    print("   GET  /api/poll/results - Get poll results", flush=True)
    print("   GET  /api/poll/check-voted - Check if voted", flush=True)
    print("✅ Server ready! Frontend can connect to this URL", flush=True)

    # Show current schedule
    current_period = get_current_schedule_period()
    frequency = current_period
    next_change, next_frequency = get_next_schedule_change()
    print(
        f"🔄 Dynamic scheduling active: {frequency} delay after completion", flush=True
    )
    print(
        f"📅 Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}",
        flush=True,
    )
    print("🛑 Press Ctrl+C to gracefully shut down the server", flush=True)

    # Start memory monitoring
    try:
        from memory_tracker import memory_tracker

        success = memory_tracker.start_monitoring()
        if success:
            print(
                "🔍 Memory monitoring started - taking snapshots every minute",
                flush=True,
            )
        else:
            print("⚠️ Memory monitoring failed to start", flush=True)
    except Exception as e:
        logger.error(f"Error starting memory monitoring: {e}")
        print(f"⚠️ Memory monitoring error: {e}", flush=True)

    print("Server started successfully - dynamic scheduled scraping active", flush=True)

    yield  # Server is running

    # Shutdown
    logger.info("=== SERVER SHUTDOWN ===")
    scheduler.shutdown()
    logger.info("Scheduler shutdown complete")

    # Stop memory monitoring
    try:
        from memory_tracker import memory_tracker

        if memory_tracker.is_running():
            memory_tracker.stop_monitoring()
            logger.info("Memory monitoring stopped")
    except Exception as e:
        logger.error(f"Error stopping memory monitoring: {e}")


# Authentication setup
security = HTTPBearer()


async def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Verify admin authentication token"""
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Admin authentication not configured",
        )

    if credentials.credentials != admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


async def send_feedback_email(feedback_data: dict):
    """Send email notification for new feedback submissions"""
    try:
        admin_email = os.getenv("ADMIN_EMAIL")
        if not admin_email:
            logger.warning("ADMIN_EMAIL not configured, skipping email notification")
            return

        # Create email message
        message = EmailMessage()
        message["From"] = "noreply@rf4records.com"
        message["To"] = admin_email
        message["Subject"] = (
            f"New {feedback_data['type'].title()} Submission: {feedback_data['subject']}"
        )
        message["Date"] = formatdate(localtime=True)

        # Email body
        body = f"""
New {feedback_data["type"].title()} Submission Received

Subject: {feedback_data["subject"]}
Type: {feedback_data["type"].title()}
Message: {feedback_data["message"]}

Contact Info: {feedback_data.get("user_info", "Not provided")}
Page URL: {feedback_data.get("page_url", "Unknown")}
User Agent: {feedback_data.get("user_agent", "Unknown")}
IP Address: {feedback_data.get("ip_address", "Unknown")}
Submitted: {feedback_data.get("created_at", "Unknown")}

---
RF4 Records Feedback System
"""

        message.set_content(body)

        # Send email using Gmail SMTP
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=admin_email,
            password=os.getenv("GMAIL_APP_PASSWORD", ""),
        )

        logger.info(
            f"Email notification sent for feedback ID: {feedback_data.get('id', 'unknown')}"
        )

    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")


# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
rate_limit_state = {}

# Create FastAPI app with lifespan handler
app = FastAPI(
    title="RF4 Records API",
    description="API for Russian Fishing 4 records data",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Serve static files (built frontend) in production
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist_path):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist_path, "assets")),
        name="assets",
    )
    print(
        f"Serving static assets from {os.path.join(frontend_dist_path, 'assets')}",
        flush=True,
    )
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
                print(f"   Waiting... ({10 - i}s remaining)", flush=True)

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
            logger.info(
                f"🧹 Pre-scrape cleanup: Memory at {memory_before_cleanup:.1f}MB - clearing idle accumulation"
            )

            # Simple cleanup - no Chrome killing during API operations
            from unified_cleanup import (
                cleanup_zombie_processes,
                clear_beautifulsoup_cache,
            )

            cleanup_zombie_processes()
            clear_beautifulsoup_cache()

            # Additional garbage collection for FastAPI/database operations
            for _ in range(3):
                gc.collect()

            # Clear database session pools that may have accumulated
            try:
                from database import SessionLocal

                # Force database connection pool cleanup
                SessionLocal.close_all_sessions()
            except Exception:
                pass

            # Wait for cleanup to take effect
            import time

            time.sleep(2)

            memory_after_cleanup = get_memory_usage()
            memory_freed = memory_before_cleanup - memory_after_cleanup

            if memory_freed > 50:  # Significant cleanup
                logger.info(
                    f"✅ Pre-scrape cleanup freed {memory_freed:.1f}MB (now {memory_after_cleanup:.1f}MB)"
                )
            else:
                logger.debug(
                    f"Pre-scrape cleanup freed {memory_freed:.1f}MB (now {memory_after_cleanup:.1f}MB)"
                )

        # Get memory before scrape (after cleanup)
        memory_before = get_memory_usage()

        current_period = get_current_schedule_period()
        frequency = current_period
        logger.info(
            f"Starting {frequency} scheduled scrape (Memory: {memory_before:.1f} MB)"
        )
        result = scrape_and_update_records()

        # Log memory after scrape
        memory_after = get_memory_usage()
        memory_change = memory_after - memory_before

        if result["success"]:
            logger.info(
                f"{frequency.capitalize()} scrape completed successfully (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)"
            )
        else:
            logger.warning(
                f"{frequency.capitalize()} scrape completed with issues (Memory: {memory_after:.1f} MB, Δ{memory_change:+.1f} MB)"
            )

    except MemoryError as e:
        # Memory bomb detected - this is a critical system issue
        logger.critical(f"🚨 MEMORY BOMB DETECTED: {e}")
        logger.critical(
            "🚨 This indicates a serious system issue that requires immediate attention"
        )

        # Force aggressive cleanup to try to recover
        logger.info("🧹 Attempting emergency system recovery...")
        try:
            from unified_cleanup import (
                cleanup_zombie_processes,
                clear_beautifulsoup_cache,
            )

            cleanup_zombie_processes()
            clear_beautifulsoup_cache()
            import time

            time.sleep(5)  # Give system time to recover

            # Check if memory recovered
            memory_after_recovery = get_memory_usage()
            logger.info(
                f"Memory after emergency recovery: {memory_after_recovery:.1f} MB"
            )

            if memory_after_recovery > 500:  # Still dangerously high
                logger.critical(
                    f"🚨 RECOVERY FAILED: Memory still critically high ({memory_after_recovery:.1f} MB)"
                )
                logger.critical("🚨 System may need Railway redeploy to fully recover")
            else:
                logger.info(
                    f"✅ Emergency recovery successful: Memory reduced to {memory_after_recovery:.1f} MB"
                )

        except Exception as recovery_error:
            logger.critical(f"🚨 Emergency recovery failed: {recovery_error}")

        # Continue with normal scheduling - let Railway handle redeploy if needed
        logger.info(
            "Continuing with normal scheduling - Railway will handle redeploy if system becomes unstable"
        )

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
        if scheduler.get_job("scrape_job"):
            scheduler.remove_job("scrape_job")

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
            scheduled_scrape, "date", run_date=next_run_time, id="scrape_job"
        )

        print(
            f"Next {frequency} scrape scheduled for {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}",
            flush=True,
        )

    except Exception as e:
        logger.error(f"Error scheduling next scrape: {e}")


def update_schedule():
    """Update the scheduler based on current time period"""
    try:
        # Remove existing jobs
        if scheduler.get_job("scrape_job"):
            scheduler.remove_job("scrape_job")

        current_period = get_current_schedule_period()
        frequency = current_period

        next_change, next_frequency = get_next_schedule_change()
        print(f"Schedule updated to {frequency} scraping", flush=True)
        print(
            f"Next schedule change: {next_change.strftime('%Y-%m-%d %H:%M UTC')} -> {next_frequency}",
            flush=True,
        )

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
            scheduled_scrape, "date", run_date=first_run_time, id="scrape_job"
        )

        print(
            f"First scrape scheduled for {first_run_time.strftime('%Y-%m-%d %H:%M:%S')} ({delay_minutes}-minute delay)",
            flush=True,
        )

        # Schedule the next schedule update
        scheduler.add_job(
            update_schedule,
            "date",
            run_date=next_change,
            id="schedule_update_job",
            replace_existing=True,
        )

    except Exception as e:
        logger.error(f"Error updating schedule: {e}")


def schedule_monitor():
    """Monitor and update schedule when needed (fallback check every hour)"""
    try:
        now = datetime.now(timezone.utc)
        
        # First priority: Check if we need to update the schedule period
        next_change, _ = get_next_schedule_change()
        if now >= next_change and not scheduler.get_job("schedule_update_job"):
            logger.info("Schedule change detected, updating...")
            update_schedule()
            return
        
        # Second priority: Check if scrape job exists (recovery from missed jobs)
        scrape_job = scheduler.get_job("scrape_job")
        if not scrape_job:
            logger.warning("🚨 Scrape job missing! This likely means a job was missed. Recreating...")
            schedule_next_scrape()
            return
        
        # Third priority: Check if scrape job is overdue (indicates missed execution)
        if scrape_job.next_run_time:
            # Allow 2 minute grace period for job execution
            overdue_threshold = scrape_job.next_run_time + timedelta(minutes=2)
            if now > overdue_threshold and not is_scraping:
                logger.warning(f"🚨 Scrape job overdue by {now - scrape_job.next_run_time}. Rescheduling...")
                scheduler.remove_job("scrape_job")
                schedule_next_scrape()
                return
        
        # Log healthy status occasionally for debugging
        if scrape_job and scrape_job.next_run_time:
            time_until_next = scrape_job.next_run_time - now
            logger.info(f"✅ Schedule monitor: Next scrape in {time_until_next}")
        
    except Exception as e:
        logger.error(f"Error in schedule monitor: {e}")
        # Emergency recovery: ensure we have a scrape job scheduled
        try:
            if not scheduler.get_job("scrape_job") and not is_scraping:
                logger.warning("Emergency recovery: scheduling scrape job")
                schedule_next_scrape()
        except Exception as recovery_error:
            logger.error(f"Emergency recovery failed: {recovery_error}")


def periodic_memory_cleanup():
    """Periodic cleanup to prevent memory accumulation from API operations"""
    try:
        # Only run if not currently scraping
        if is_scraping:
            return

        current_memory = get_memory_usage()

        # Only cleanup if memory is elevated (>350MB) and we're not scraping
        if current_memory > 350:
            logger.info(
                f"🧹 Periodic cleanup: Memory at {current_memory:.1f}MB during idle"
            )

            # Use unified periodic cleanup (safe during any state)
            success, memory_freed = periodic_cleanup()

            # Clear database session pools
            try:
                from database import SessionLocal

                SessionLocal.close_all_sessions()
            except Exception:
                pass

            if memory_freed > 20:
                logger.info(f"✅ Periodic cleanup freed {memory_freed:.1f}MB")

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
                    "action_needed": "Railway should redeploy this instance",
                },
            )
        elif memory_mb > 500:  # Warning threshold
            return JSONResponse(
                status_code=200,
                content={
                    "status": "degraded",
                    "reason": "high_memory_usage",
                    "memory_mb": round(memory_mb, 1),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "warning": "Memory usage is elevated but still functional",
                },
            )
        else:
            return {
                "status": "healthy",
                "memory_mb": round(memory_mb, 1),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0",
            }

    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "reason": "health_check_failed",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
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
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development"),
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
        from optimized_records import (
            get_all_records_optimized,
            get_filter_values_optimized,
        )

        # Get all records with optimized query
        all_records, total_count = get_all_records_optimized()

        # Get unique values with optimized queries
        unique_values = get_filter_values_optimized()

        logger.info(f"Retrieved all {len(all_records)} records optimized")
        return {
            "records": all_records,
            "total_records": len(all_records),
            "unique_values": unique_values,
        }
    except Exception as e:
        logger.error(f"Error retrieving records: {e}")
        return {"error": "Failed to retrieve records"}


@app.get("/records/recent")
@app.get("/api/records/recent")
def get_recent_records():
    """Get recent records since last reset - optimized for fast initial load"""
    try:
        from optimized_records import get_recent_records_optimized

        result = get_recent_records_optimized(limit=1000)

        logger.info(
            f"Retrieved {len(result['records'])} recent records since {result['last_reset_date']}"
        )
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
        from optimized_records import get_all_recent_records_optimized

        result = get_all_recent_records_optimized()

        api_time = time.time() - api_start

        logger.info(f"🚀 API Response Complete:")
        logger.info(
            f"  Retrieved {len(result['records'])} recent records since {result['last_reset_date']}"
        )
        logger.info(f"  Total API time: {api_time:.3f}s")
        logger.info(
            f"  DB time: {result['performance']['query_time']}s ({result['performance']['query_time'] / api_time * 100:.1f}%)"
        )
        logger.info(
            f"  Processing time: {result['performance']['process_time']}s ({result['performance']['process_time'] / api_time * 100:.1f}%)"
        )
        logger.info(
            f"  API overhead: {api_time - result['performance']['total_time']:.3f}s"
        )

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
        from optimized_records import get_older_records_optimized

        result = get_older_records_optimized()

        api_time = time.time() - api_start

        logger.info(f"🚀 API Response Complete (Background):")
        logger.info(
            f"  Retrieved {len(result['records'])} older records for background"
        )
        logger.info(f"  Total API time: {api_time:.3f}s")
        logger.info(
            f"  DB time: {result['performance']['query_time']}s ({result['performance']['query_time'] / api_time * 100:.1f}%)"
        )
        logger.info(
            f"  API overhead: {api_time - result['performance']['total_time']:.3f}s"
        )

        return result

    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving older records after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve older records"}


@app.get("/records/filtered")
@app.get("/api/records/filtered")
@limiter.limit("30/minute")  # Allow normal usage but prevent abuse
def get_filtered_records_endpoint(
    request: Request,
    fish: str = None,
    waterbody: str = None,
    bait: str = None,
    data_age: str = None,
    limit: int = None,
    offset: int = None,
):
    """Get filtered records based on criteria"""
    import time

    api_start = time.time()

    try:
        from optimized_records import get_filtered_records_optimized

        # Parse comma-separated values for multi-select support
        fish_list = fish.split(",") if fish else None
        waterbody_list = waterbody.split(",") if waterbody else None
        bait_list = bait.split(",") if bait else None

        result = get_filtered_records_optimized(
            fish=fish_list,
            waterbody=waterbody_list,
            bait=bait_list,
            data_age=data_age,
            limit=limit,
            offset=offset,
        )

        api_time = time.time() - api_start

        logger.info(f"🔍 Filtered API Response Complete:")
        logger.info(
            f"  Retrieved {result['showing_count']} of {result['total_filtered']} filtered records"
        )
        logger.info(
            f"  Filters: fish={fish}, waterbody={waterbody}, bait={bait}, data_age={data_age}"
        )
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
        from optimized_records import get_filter_values_optimized

        result = get_filter_values_optimized()

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


@app.get("/records/top-baits")
@app.get("/api/records/top-baits")
def get_top_baits():
    """Get top baits analysis for each fish across 3 weekly periods (Sunday 6PM UTC markers)"""
    api_start = time.time()

    try:
        from top_baits_cache import (
            load_top_baits_cache,
            is_cache_valid,
            generate_top_baits_cache,
        )

        # Try to load from cache first
        if is_cache_valid():
            result = load_top_baits_cache()
            if result:
                api_time = time.time() - api_start
                logger.info(f"🎣 Top Baits API Response Complete (CACHED):")
                logger.info(
                    f"  Fish analyzed: {result['performance']['total_fish_species']} species"
                )
                logger.info(
                    f"  Records processed: {result['performance']['total_records']} records"
                )
                logger.info(f"  Total API time: {api_time:.3f}s (cached)")
                return result

        # Cache miss or invalid - generate on demand (fallback)
        logger.warning(
            "Top baits cache miss - generating on demand (this will be slow)"
        )
        from optimized_records import get_top_baits_data_optimized

        result = get_top_baits_data_optimized()

        # Try to update cache in background (don't block response)
        try:
            generate_top_baits_cache()
        except Exception as cache_error:
            logger.error(f"Failed to update cache: {cache_error}")

        api_time = time.time() - api_start
        logger.info(f"🎣 Top Baits API Response Complete (LIVE):")
        logger.info(
            f"  Fish analyzed: {result['performance']['total_fish_species']} species"
        )
        logger.info(
            f"  Records processed: {result['performance']['total_records']} records"
        )
        logger.info(f"  Total API time: {api_time:.3f}s (live generation)")

        return result

    except Exception as e:
        api_time = time.time() - api_start
        logger.error(f"Error retrieving top baits data after {api_time:.3f}s: {e}")
        return {"error": "Failed to retrieve top baits data"}


@app.post("/admin/regenerate-top-baits-cache")
def regenerate_top_baits_cache(token: str = Depends(verify_admin_token)):
    """Manually regenerate the top baits cache"""
    try:
        from top_baits_cache import generate_top_baits_cache, get_cache_info

        logger.info("Manual top baits cache regeneration requested")
        success = generate_top_baits_cache()

        if success:
            info = get_cache_info()
            return {
                "message": "Top baits cache regenerated successfully",
                "success": True,
                "cache_info": info,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        else:
            return {
                "error": "Failed to regenerate top baits cache",
                "success": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    except Exception as e:
        logger.error(f"Error regenerating top baits cache: {e}")
        return {
            "error": f"Cache regeneration failed: {str(e)}",
            "success": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/admin/top-baits-cache-info")
def get_top_baits_cache_info(token: str = Depends(verify_admin_token)):
    """Get information about the top baits cache status"""
    try:
        from top_baits_cache import get_cache_info

        info = get_cache_info()
        return {"cache_info": info, "timestamp": datetime.now(timezone.utc).isoformat()}

    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {
            "error": f"Failed to get cache info: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/admin/debug-top-baits-dates")
def debug_top_baits_dates(token: str = Depends(verify_admin_token)):
    """Debug endpoint to check Top Baits date ranges and data availability"""
    try:
        from optimized_records import (
            get_last_record_reset_date,
            get_two_resets_ago_date,
            get_three_resets_ago_date,
            get_four_resets_ago_date,
        )
        from database import SessionLocal, Record
        import os

        # Get current time
        now = datetime.now(timezone.utc)

        # Calculate reset dates
        last_reset = get_last_record_reset_date()
        two_resets_ago = get_two_resets_ago_date()
        three_resets_ago = get_three_resets_ago_date()
        four_resets_ago = get_four_resets_ago_date()

        # Database connection info
        db_url = os.getenv("DATABASE_URL", "sqlite:///./rf4_records.db")

        # Connect to database
        db = SessionLocal()

        # Get total record count
        total_records = db.query(Record).count()

        # Get oldest and newest records
        oldest_record = db.query(Record).order_by(Record.created_at.asc()).first()
        newest_record = db.query(Record).order_by(Record.created_at.desc()).first()

        # Count records in each period
        this_week_count = (
            db.query(Record).filter(Record.created_at >= last_reset).count()
        )
        last_week_count = (
            db.query(Record)
            .filter(Record.created_at >= two_resets_ago, Record.created_at < last_reset)
            .count()
        )
        three_weeks_ago_count = (
            db.query(Record)
            .filter(
                Record.created_at >= three_resets_ago,
                Record.created_at < two_resets_ago,
            )
            .count()
        )

        # Get sample records from each period
        this_week_samples = (
            db.query(Record).filter(Record.created_at >= last_reset).limit(3).all()
        )
        last_week_samples = (
            db.query(Record)
            .filter(Record.created_at >= two_resets_ago, Record.created_at < last_reset)
            .limit(3)
            .all()
        )
        three_weeks_ago_samples = (
            db.query(Record)
            .filter(
                Record.created_at >= three_resets_ago,
                Record.created_at < two_resets_ago,
            )
            .limit(3)
            .all()
        )

        # Get records around reset boundaries for debugging
        around_last_reset = (
            db.query(Record)
            .filter(
                Record.created_at >= last_reset - timedelta(hours=2),
                Record.created_at <= last_reset + timedelta(hours=2),
            )
            .order_by(Record.created_at)
            .limit(5)
            .all()
        )

        db.close()

        # Format sample records
        def format_samples(samples):
            return [
                {
                    "fish": record.fish,
                    "player": record.player,
                    "weight": record.weight,
                    "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None,
                    "date": record.date,
                }
                for record in samples
            ]

        # Build response
        result = {
            "timestamp": now.isoformat(),
            "database_info": {
                "url": db_url.split("@")[0] + "@***"
                if "@" in db_url
                else db_url,  # Hide password
                "total_records": total_records,
                "oldest_record": oldest_record.created_at.isoformat()
                if oldest_record and oldest_record.created_at
                else None,
                "newest_record": newest_record.created_at.isoformat()
                if newest_record and newest_record.created_at
                else None,
            },
            "reset_dates": {
                "current_time": now.isoformat(),
                "last_reset": last_reset.isoformat(),
                "two_resets_ago": two_resets_ago.isoformat(),
                "three_resets_ago": three_resets_ago.isoformat(),
                "four_resets_ago": four_resets_ago.isoformat(),
                "verification": {
                    "last_reset_day": last_reset.strftime("%A"),
                    "two_resets_ago_day": two_resets_ago.strftime("%A"),
                    "three_resets_ago_day": three_resets_ago.strftime("%A"),
                },
            },
            "period_analysis": {
                "this_week": {
                    "label": "This Week",
                    "start": last_reset.isoformat(),
                    "end": "Present",
                    "record_count": this_week_count,
                    "duration_days": (now - last_reset).days,
                    "samples": format_samples(this_week_samples),
                },
                "last_week": {
                    "label": "Last Week",
                    "start": two_resets_ago.isoformat(),
                    "end": last_reset.isoformat(),
                    "record_count": last_week_count,
                    "duration_days": 7,
                    "samples": format_samples(last_week_samples),
                },
                "three_weeks_ago": {
                    "label": "3 Weeks Ago",
                    "start": three_resets_ago.isoformat(),
                    "end": two_resets_ago.isoformat(),
                    "record_count": three_weeks_ago_count,
                    "duration_days": 7,
                    "samples": format_samples(three_weeks_ago_samples),
                },
            },
            "boundary_analysis": {
                "records_around_last_reset": format_samples(around_last_reset),
                "description": f"Records within 2 hours of last reset ({last_reset.isoformat()})",
            },
            "issues_detected": [],
            "recommendations": [],
        }

        # Detect issues and add recommendations
        if total_records == 0:
            result["issues_detected"].append("Database is completely empty")
            result["recommendations"].append(
                "Check data import process or database connection"
            )

        if last_week_count == 0 and total_records > 0:
            result["issues_detected"].append("No records found in 'Last Week' period")
            result["recommendations"].append(
                "Check if records exist with created_at timestamps in the expected date range"
            )

        if this_week_count == 0 and total_records > 0:
            result["issues_detected"].append("No records found in 'This Week' period")
            result["recommendations"].append(
                "Verify recent data import and timezone handling"
            )

        if (
            oldest_record
            and oldest_record.created_at
            and oldest_record.created_at > three_resets_ago
        ):
            result["issues_detected"].append("Oldest record is newer than 3 weeks ago")
            result["recommendations"].append(
                "Data may not cover the full 3-week analysis period"
            )

        return result

    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        return {
            "error": f"Debug analysis failed: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/refresh")
def refresh_info():
    """Information about the refresh endpoint"""
    return {
        "message": "Manual scrape endpoint",
        "method": "POST",
        "description": "Send a POST request to this endpoint to trigger a manual scrape",
        "example": "curl -X POST https://your-domain.com/refresh",
        "current_status": "scraping" if is_scraping else "idle",
        "note": "GET requests to this endpoint only show this information",
    }


@app.post("/refresh")
@limiter.limit("3/minute")  # Admin operations should be infrequent
def refresh(request: Request, token: str = Depends(verify_admin_token)):
    """Manually trigger a scrape"""
    global is_scraping

    with scraping_lock:
        if is_scraping:
            return {
                "message": "Scraping already in progress",
                "success": False,
                "error": "Another scraping operation is currently running",
            }
        is_scraping = True

    logger.info("=== MANUAL SCRAPE TRIGGERED ===")
    try:
        result = scrape_and_update_records()
        return {
            "message": "Scraping completed",
            "success": result["success"],
            "new_records": result["new_records"],
            "regions_scraped": result["regions_scraped"],
            "duration_seconds": result["duration_seconds"],
        }
    except Exception as e:
        logger.error(f"Error in manual scrape: {e}")
        return {"error": "Scraping failed", "details": str(e)}
    finally:
        with scraping_lock:
            is_scraping = False

        # Schedule the next scrape after manual scrape completes
        try:
            schedule_next_scrape()
        except Exception as e:
            logger.error(f"Error scheduling next scrape after manual refresh: {e}")


@app.post("/optimize")
@limiter.limit("2/hour")  # Heavy database operations
def run_database_optimizations(
    request: Request, token: str = Depends(verify_admin_token)
):
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
            "performance_improvement": "Queries should be significantly faster with new indexes",
        }

    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        return {"error": "Database optimization failed", "details": str(e)}


@app.post("/migrate-trophy-classification")
def migrate_trophy_classification(token: str = Depends(verify_admin_token)):
    """Run trophy classification migration to add trophy_class column and backfill existing records"""
    try:
        # Import and run the migration script
        from add_trophy_classification import (
            add_trophy_column,
            backfill_trophy_classifications,
            verify_migration,
        )

        # Capture output by redirecting stdout
        import io
        import sys

        # Capture the output
        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output

        try:
            logger.info("Starting trophy classification migration...")

            # Step 1: Add the column
            column_success = add_trophy_column()
            if not column_success:
                return {
                    "error": "Failed to add trophy_class column",
                    "success": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

            # Step 2: Backfill existing records
            backfill_success = backfill_trophy_classifications()
            if not backfill_success:
                return {
                    "error": "Failed to backfill trophy classifications",
                    "success": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

            # Step 3: Verify migration
            verification_success = verify_migration()

        finally:
            # Restore stdout
            sys.stdout = old_stdout

        # Get the captured output
        output = captured_output.getvalue()

        return {
            "message": "Trophy classification migration completed successfully"
            if verification_success
            else "Migration completed with issues",
            "success": verification_success,
            "column_added": column_success,
            "backfill_completed": backfill_success,
            "verification_passed": verification_success,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Trophy classification migration failed: {e}")
        return {
            "error": "Trophy classification migration failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/vacuum")
def vacuum_database(token: str = Depends(verify_admin_token)):
    """Manually run VACUUM to reclaim space from deleted records"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "VACUUM not needed for SQLite",
                "database_type": "SQLite",
            }

        # Capture output
        import io
        import sys

        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output

        try:
            print("🧹 Running PostgreSQL VACUUM to reclaim space...", flush=True)

            engine = create_engine(database_url, connect_args={"connect_timeout": 60})

            with engine.connect() as conn:
                # Get size before VACUUM
                result = conn.execute(
                    text("""
                    SELECT pg_size_pretty(pg_total_relation_size('records')) as size_before
                """)
                )
                size_before = result.fetchone()[0]
                print(f"Database size before VACUUM: {size_before}", flush=True)

                # Run VACUUM
                conn.execute(text("COMMIT"))
                conn.execute(text("VACUUM records"))

                # Get size after VACUUM
                result = conn.execute(
                    text("""
                    SELECT pg_size_pretty(pg_total_relation_size('records')) as size_after
                """)
                )
                size_after = result.fetchone()[0]
                print(f"Database size after VACUUM: {size_after}", flush=True)

        finally:
            sys.stdout = old_stdout

        output = captured_output.getvalue()

        return {
            "message": "VACUUM completed successfully",
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"VACUUM failed: {e}")
        return {
            "error": "VACUUM failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/vacuum/full")
def vacuum_full_database(token: str = Depends(verify_admin_token)):
    """Run VACUUM FULL to completely rebuild the database and reclaim maximum space"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "VACUUM FULL not needed for SQLite",
                "database_type": "SQLite",
            }

        # Capture output
        import io
        import sys

        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output

        try:
            logger.info(
                "🧹 Running PostgreSQL VACUUM FULL - this will take longer but reclaim maximum space..."
            )
            logger.warning("⚠️  WARNING: This locks the table during operation!")

            engine = create_engine(
                database_url, connect_args={"connect_timeout": 300}
            )  # Longer timeout

            with engine.connect() as conn:
                # Get sizes before VACUUM FULL
                result = conn.execute(
                    text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as total_db_size,
                        pg_size_pretty(pg_total_relation_size('records')) as table_size
                """)
                )
                before = result.fetchone()
                logger.info(f"Total database size before: {before[0]}")
                logger.info(f"Records table size before: {before[1]}")

                # Run VACUUM FULL
                conn.execute(text("COMMIT"))
                logger.info("Running VACUUM FULL records...")
                conn.execute(text("VACUUM FULL records"))

                # Get sizes after VACUUM FULL
                result = conn.execute(
                    text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as total_db_size,
                        pg_size_pretty(pg_total_relation_size('records')) as table_size
                """)
                )
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
            "warning": "VACUUM FULL locks the table during operation but reclaims maximum space",
        }

    except Exception as e:
        logger.error(f"VACUUM FULL failed: {e}")
        return {
            "error": "VACUUM FULL failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "error": "Status check failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/merge-duplicates")
def merge_duplicate_records(token: str = Depends(verify_admin_token)):
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
            "message": "Batch migration completed"
            if success
            else "Batch migration failed",
            "success": success,
            "verification_passed": verification_success if success else False,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "warning": "BATCH PROCESSING: Processes 5,000 duplicate groups per run - run multiple times if needed",
        }

    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        return {
            "error": "Database migration failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/merge-duplicates/rollback")
def rollback_duplicate_merge(token: str = Depends(verify_admin_token)):
    """Emergency rollback of duplicate merge operation"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        engine = create_engine(database_url, connect_args={"connect_timeout": 60})

        rollback_info = {
            "pre_rollback_stats": {},
            "rollback_actions": [],
            "post_rollback_stats": {},
        }

        with engine.connect() as conn:
            # Get pre-rollback stats
            result = conn.execute(text("SELECT COUNT(*) FROM records"))
            rollback_info["pre_rollback_stats"]["total_records"] = result.scalar()

            result = conn.execute(
                text("SELECT COUNT(*) FROM records WHERE category LIKE '%;%'")
            )
            rollback_info["pre_rollback_stats"]["merged_records"] = result.scalar()

            # Check if we have merged records to rollback
            if rollback_info["pre_rollback_stats"]["merged_records"] == 0:
                return {
                    "message": "No merged records found to rollback",
                    "stats": rollback_info["pre_rollback_stats"],
                }

            # Start transaction for rollback
            trans = conn.begin()

            try:
                # Find all merged records and expand them back to individual records
                result = conn.execute(
                    text("""
                    SELECT id, fish, weight, player, waterbody, region, date, category
                    FROM records 
                    WHERE category LIKE '%;%'
                    LIMIT 1000
                """)
                )

                merged_records = result.fetchall()
                rollback_info["rollback_actions"].append(
                    f"Found {len(merged_records)} merged records to expand"
                )

                # Category mapping (reverse of merge)
                category_reverse_map = {
                    "N": "Normal",
                    "L": "Light",
                    "U": "Ultralight",
                    "B": "BottomLight",
                    "T": "Telescopic",
                }

                expanded_count = 0
                deleted_count = 0

                for record in merged_records:
                    # Parse categories
                    categories = record[7].split(";")

                    # Delete the merged record
                    conn.execute(
                        text("""
                        DELETE FROM records WHERE id = :record_id
                    """),
                        {"record_id": record[0]},
                    )
                    deleted_count += 1

                    # Insert individual records for each category
                    for cat_code in categories:
                        if cat_code.strip() in category_reverse_map:
                            full_category = category_reverse_map[cat_code.strip()]

                            conn.execute(
                                text("""
                                INSERT INTO records (fish, weight, player, waterbody, region, date, category)
                                VALUES (:fish, :weight, :player, :waterbody, :region, :date, :category)
                            """),
                                {
                                    "fish": record[1],
                                    "weight": record[2],
                                    "player": record[3],
                                    "waterbody": record[4],
                                    "region": record[5],
                                    "date": record[6],
                                    "category": full_category,
                                },
                            )
                            expanded_count += 1

                rollback_info["rollback_actions"].append(
                    f"Deleted {deleted_count} merged records"
                )
                rollback_info["rollback_actions"].append(
                    f"Created {expanded_count} individual records"
                )

                # Commit the rollback
                trans.commit()
                rollback_info["rollback_actions"].append(
                    "Rollback transaction committed"
                )

                # Get post-rollback stats
                result = conn.execute(text("SELECT COUNT(*) FROM records"))
                rollback_info["post_rollback_stats"]["total_records"] = result.scalar()

                result = conn.execute(
                    text("SELECT COUNT(*) FROM records WHERE category LIKE '%;%'")
                )
                rollback_info["post_rollback_stats"]["merged_records"] = result.scalar()

                return {
                    "message": "Duplicate merge rollback completed successfully",
                    "rollback_info": rollback_info,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "Records have been expanded back to individual category entries",
                }

            except Exception as e:
                trans.rollback()
                rollback_info["rollback_actions"].append(
                    f"Rollback failed, transaction rolled back: {str(e)}"
                )
                raise e

    except Exception as e:
        logger.error(f"Rollback operation failed: {e}")
        return {
            "error": "Rollback operation failed",
            "details": str(e),
            "rollback_info": rollback_info,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/cleanup")
def force_cleanup(token: str = Depends(verify_admin_token)):
    """Force garbage collection and process cleanup for memory management"""
    try:
        import gc
        from unified_cleanup import cleanup_zombie_processes, clear_beautifulsoup_cache

        # Get memory before cleanup
        memory_before = get_memory_usage()

        # Force garbage collection
        cleanup_zombie_processes()
        clear_beautifulsoup_cache()

        # Additional garbage collection
        gc.collect()

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
            "cleanup_timestamp": datetime.now(timezone.utc).isoformat(),
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

        # Calculate uptime
        uptime_info = {}
        if server_start_time:
            current_time = datetime.now()
            uptime_delta = current_time - server_start_time
            uptime_info = {
                "server_start_time": server_start_time.isoformat(),
                "uptime_seconds": uptime_delta.total_seconds(),
                "uptime_formatted": str(uptime_delta).split(".")[
                    0
                ],  # Remove microseconds
            }
        else:
            uptime_info = {
                "server_start_time": "unknown",
                "uptime_seconds": 0,
                "uptime_formatted": "unknown",
            }

        # Get git commit information
        git_info = get_git_commit_info()

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
            "environment": os.getenv("RAILWAY_ENVIRONMENT", "development"),
            **uptime_info,
            "git_info": git_info,
        }
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {"error": "Failed to get status"}


@app.get("/memory/cost-metrics")
def get_memory_cost_metrics():
    """
    Get memory cost metrics (MB-hours, GB-hours) for Railway billing analysis.
    This shows the memory-time product that Railway uses for billing.
    """
    try:
        from memory_tracker import memory_tracker

        # Get current stats with MB-hours calculation
        stats = memory_tracker.get_memory_stats()

        if "error" in stats:
            return {"error": stats["error"]}

        # Extract cost metrics for easy display
        cost_metrics = stats.get("cost_metrics", {})

        return {
            "current_memory_mb": round(stats["rss"]["current"] / (1024 * 1024), 2),
            "avg_memory_mb": round(cost_metrics.get("avg_memory_mb", 0), 2),
            "tracking_period_hours": cost_metrics.get("time_period_hours", 0),
            "mb_hours_total": cost_metrics.get("mb_hours_total", 0),
            "mb_hours_per_day": cost_metrics.get("mb_hours_per_day", 0),
            "gb_hours_per_day": cost_metrics.get("gb_hours_per_day", 0),
            "snapshots_count": stats.get("total_snapshots", 0),
            "first_snapshot": stats.get("first_snapshot"),
            "last_snapshot": stats.get("last_snapshot"),
        }
    except Exception as e:
        logger.error(f"Error getting memory cost metrics: {e}")
        return {"error": str(e)}


@app.get("/memory/compare")
def compare_memory_periods(hours_before: int = 24, hours_after: int = 24):
    """
    Compare memory usage between two time periods.
    Useful for A/B testing memory leak fixes.

    Args:
        hours_before: Hours to look back for the "before" period (default 24)
        hours_after: Hours to look back for the "after" period (default 24)

    Returns comparison showing MB-hours saved and percent reduction
    """
    try:
        from memory_tracker import memory_tracker

        comparison = memory_tracker.compare_periods(hours_before, hours_after)

        if "error" in comparison:
            return {"error": comparison["error"]}

        return comparison
    except Exception as e:
        logger.error(f"Error comparing memory periods: {e}")
        return {"error": str(e)}


@app.get("/database/analysis")
def analyze_database_size(token: str = Depends(verify_admin_token)):
    """Comprehensive database size analysis to identify space usage"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "Database analysis only available for PostgreSQL",
                "database_type": "SQLite",
            }

        engine = create_engine(database_url, connect_args={"connect_timeout": 60})
        analysis = {}

        with engine.connect() as conn:
            # 1. Overall database size
            result = conn.execute(
                text("""
                SELECT 
                    pg_database.datname,
                    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
                FROM pg_database 
                WHERE pg_database.datname = current_database()
            """)
            )
            db_info = result.fetchone()
            analysis["total_database_size"] = db_info[1]

            # 2. Table sizes breakdown
            result = conn.execute(
                text("""
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
            """)
            )
            tables = result.fetchall()
            analysis["tables"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "total_size": row[2],
                    "table_size": row[3],
                    "index_size": row[4],
                    "bytes": row[5],
                }
                for row in tables
            ]

            # 3. WAL (Write-Ahead Log) size
            result = conn.execute(
                text("""
                SELECT 
                    pg_size_pretty(
                        COALESCE(
                            (SELECT SUM(size) FROM pg_ls_waldir()), 
                            0
                        )
                    ) as wal_size
            """)
            )
            wal_info = result.fetchone()
            analysis["wal_size"] = wal_info[0] if wal_info else "Unknown"

            # 4. Temporary files
            result = conn.execute(
                text("""
                SELECT 
                    pg_size_pretty(
                        COALESCE(temp_bytes, 0)
                    ) as temp_size
                FROM pg_stat_database 
                WHERE datname = current_database()
            """)
            )
            temp_info = result.fetchone()
            analysis["temp_files_size"] = temp_info[0] if temp_info else "0 bytes"

            # 5. Dead tuples and bloat
            result = conn.execute(
                text("""
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
            """)
            )
            bloat_info = result.fetchall()
            analysis["table_bloat"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "live_tuples": row[2],
                    "dead_tuples": row[3],
                    "dead_ratio_percent": row[4],
                }
                for row in bloat_info
            ]

            # 6. Database connections and locks
            result = conn.execute(
                text("""
                SELECT 
                    COUNT(*) as total_connections,
                    COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                    COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """)
            )
            conn_info = result.fetchone()
            analysis["connections"] = {
                "total": conn_info[0],
                "active": conn_info[1],
                "idle": conn_info[2],
            }

            # 7. Last vacuum/analyze times
            result = conn.execute(
                text("""
                SELECT 
                    schemaname,
                    relname,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
            """)
            )
            maintenance_info = result.fetchall()
            analysis["maintenance_history"] = [
                {
                    "table": f"{row[0]}.{row[1]}",
                    "last_vacuum": str(row[2]) if row[2] else "Never",
                    "last_autovacuum": str(row[3]) if row[3] else "Never",
                    "last_analyze": str(row[4]) if row[4] else "Never",
                    "last_autoanalyze": str(row[5]) if row[5] else "Never",
                }
                for row in maintenance_info
            ]

        return {
            "message": "Database analysis completed",
            "analysis": analysis,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Check for WAL files, temp files, and table bloat as potential causes of size discrepancy",
        }

    except Exception as e:
        logger.error(f"Database analysis failed: {e}")
        return {
            "error": "Database analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/checkpoint")
def force_checkpoint(token: str = Depends(verify_admin_token)):
    """Force PostgreSQL checkpoint to clean up WAL files"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "CHECKPOINT not available for SQLite",
                "database_type": "SQLite",
            }

        # Capture output
        import io
        import sys

        captured_output = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_output

        try:
            logger.info("🔄 Forcing PostgreSQL CHECKPOINT to clean up WAL files...")

            engine = create_engine(database_url, connect_args={"connect_timeout": 120})

            with engine.connect() as conn:
                # Get WAL size before checkpoint
                result = conn.execute(
                    text("""
                    SELECT 
                        pg_size_pretty(
                            COALESCE(
                                (SELECT SUM(size) FROM pg_ls_waldir()), 
                                0
                            )
                        ) as wal_size_before
                """)
                )
                wal_before = result.fetchone()[0]
                logger.info(f"WAL size before checkpoint: {wal_before}")

                # Force checkpoint
                conn.execute(text("COMMIT"))
                logger.info("Running CHECKPOINT...")
                conn.execute(text("CHECKPOINT"))

                # Get WAL size after checkpoint
                result = conn.execute(
                    text("""
                    SELECT 
                        pg_size_pretty(
                            COALESCE(
                                (SELECT SUM(size) FROM pg_ls_waldir()), 
                                0
                            )
                        ) as wal_size_after
                """)
                )
                wal_after = result.fetchone()[0]
                logger.info(f"WAL size after checkpoint: {wal_after}")

                # Also try to clean up temporary files
                logger.info("Checking for temp file cleanup...")
                result = conn.execute(
                    text("""
                    SELECT 
                        pg_size_pretty(COALESCE(temp_bytes, 0)) as temp_size
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)
                )
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
            "note": "CHECKPOINT forces WAL file cleanup and may reduce database volume",
        }

    except Exception as e:
        logger.error(f"CHECKPOINT failed: {e}")
        return {
            "error": "CHECKPOINT failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/database/investigation")
def investigate_database_space(token: str = Depends(verify_admin_token)):
    """Deep investigation of database space usage to find hidden space consumers"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "Investigation only available for PostgreSQL",
                "database_type": "SQLite",
            }

        engine = create_engine(database_url, connect_args={"connect_timeout": 60})
        investigation = {}

        with engine.connect() as conn:
            # 1. All databases on this PostgreSQL instance
            result = conn.execute(
                text("""
                SELECT 
                    datname,
                    pg_size_pretty(pg_database_size(datname)) as size,
                    pg_database_size(datname) as bytes
                FROM pg_database 
                ORDER BY pg_database_size(datname) DESC
            """)
            )
            investigation["all_databases"] = [
                {"name": row[0], "size": row[1], "bytes": row[2]}
                for row in result.fetchall()
            ]

            # 2. ALL tables in current database (including system tables)
            result = conn.execute(
                text("""
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
            """)
            )
            investigation["all_tables"] = [
                {
                    "schema": row[0],
                    "table": row[1],
                    "total_size": row[2],
                    "table_size": row[3],
                    "index_size": row[4],
                    "bytes": row[5],
                }
                for row in result.fetchall()
            ]

            # 3. WAL files breakdown
            result = conn.execute(
                text("""
                SELECT 
                    name,
                    pg_size_pretty(size) as size,
                    size as bytes,
                    modification
                FROM pg_ls_waldir()
                ORDER BY size DESC
                LIMIT 10
            """)
            )
            investigation["wal_files"] = [
                {
                    "name": row[0],
                    "size": row[1],
                    "bytes": row[2],
                    "modified": str(row[3]),
                }
                for row in result.fetchall()
            ]

            # 4. Database activity and locks
            result = conn.execute(
                text("""
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
            """)
            )
            investigation["active_connections"] = [
                {
                    "pid": row[0],
                    "user": row[1],
                    "app": row[2],
                    "state": row[3],
                    "query_start": str(row[4]) if row[4] else None,
                    "state_change": str(row[5]) if row[5] else None,
                    "query": row[6],
                }
                for row in result.fetchall()
            ]

            # 5. Check for orphaned temporary tables
            result = conn.execute(
                text("""
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
            """)
            )
            investigation["potential_temp_tables"] = [
                {"schema": row[0], "table": row[1], "size": row[2]}
                for row in result.fetchall()
            ]

            # 6. Transaction and replication status
            result = conn.execute(
                text("""
                SELECT 
                    txid_current() as current_transaction_id,
                    pg_is_in_recovery() as in_recovery_mode
            """)
            )
            tx_info = result.fetchone()
            investigation["transaction_info"] = {
                "current_txid": tx_info[0],
                "in_recovery": tx_info[1],
            }

            # 7. Check for replication slots (can hold WAL files)
            result = conn.execute(
                text("""
                SELECT 
                    slot_name,
                    slot_type,
                    active,
                    pg_size_pretty(
                        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
                    ) as retained_wal
                FROM pg_replication_slots
            """)
            )
            investigation["replication_slots"] = [
                {
                    "name": row[0],
                    "type": row[1],
                    "active": row[2],
                    "retained_wal": row[3],
                }
                for row in result.fetchall()
            ]

        return {
            "message": "Database space investigation completed",
            "investigation": investigation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Look for hidden tables, WAL accumulation, or replication slots holding space",
        }

    except Exception as e:
        logger.error(f"Database investigation failed: {e}")
        return {
            "error": "Database investigation failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/database/volume-analysis")
def analyze_volume_usage(token: str = Depends(verify_admin_token)):
    """Comprehensive analysis of all files in PostgreSQL data directory"""
    try:
        from database import get_database_url
        from sqlalchemy import create_engine, text

        database_url = get_database_url()
        is_postgres = (
            "postgresql" in database_url.lower() or "postgres" in database_url.lower()
        )

        if not is_postgres:
            return {
                "message": "Volume analysis only available for PostgreSQL",
                "database_type": "SQLite",
            }

        engine = create_engine(database_url, connect_args={"connect_timeout": 60})
        volume_analysis = {}

        with engine.connect() as conn:
            # Use autocommit mode to avoid transaction issues
            conn = conn.execution_options(autocommit=True)

            # 1. Total database size vs volume
            result = conn.execute(
                text("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    pg_database_size(current_database()) as database_bytes
            """)
            )
            db_info = result.fetchone()
            volume_analysis["database_size"] = {"size": db_info[0], "bytes": db_info[1]}

            # 2. ALL WAL files (not just top 10)
            try:
                result = conn.execute(
                    text("""
                    SELECT 
                        COUNT(*) as wal_file_count,
                        pg_size_pretty(SUM(size)) as total_wal_size,
                        SUM(size) as total_wal_bytes,
                        pg_size_pretty(AVG(size)) as avg_wal_size,
                        pg_size_pretty(MAX(size)) as max_wal_size,
                        pg_size_pretty(MIN(size)) as min_wal_size
                    FROM pg_ls_waldir()
                """)
                )
                wal_summary = result.fetchone()
                volume_analysis["wal_summary"] = {
                    "count": wal_summary[0],
                    "total_size": wal_summary[1],
                    "total_bytes": wal_summary[2],
                    "avg_size": wal_summary[3],
                    "max_size": wal_summary[4],
                    "min_size": wal_summary[5],
                }
            except Exception as e:
                volume_analysis["wal_summary"] = {
                    "error": f"Cannot access WAL files: {str(e)}"
                }

            # 3. Check pg_wal archive directory if accessible
            try:
                result = conn.execute(
                    text("""
                    SELECT 
                        COUNT(*) as archive_count,
                        pg_size_pretty(SUM(size)) as total_archive_size,
                        SUM(size) as total_archive_bytes
                    FROM pg_ls_archive_statusdir()
                """)
                )
                archive_info = result.fetchone()
                volume_analysis["wal_archive"] = {
                    "count": archive_info[0],
                    "total_size": archive_info[1],
                    "total_bytes": archive_info[2],
                }
            except Exception as e:
                volume_analysis["wal_archive"] = {
                    "error": f"Cannot access WAL archive: {str(e)}"
                }

            # 4. Temporary files
            try:
                result = conn.execute(
                    text("""
                    SELECT 
                        COUNT(*) as temp_file_count,
                        pg_size_pretty(SUM(size)) as total_temp_size,
                        SUM(size) as total_temp_bytes
                    FROM pg_ls_tmpdir()
                """)
                )
                temp_info = result.fetchone()
                volume_analysis["temp_files"] = {
                    "count": temp_info[0],
                    "total_size": temp_info[1],
                    "total_bytes": temp_info[2],
                }
            except Exception as e:
                volume_analysis["temp_files"] = {
                    "error": f"Cannot access temp files: {str(e)}"
                }

            # 5. Log files
            try:
                result = conn.execute(
                    text("""
                    SELECT 
                        COUNT(*) as log_file_count,
                        pg_size_pretty(SUM(size)) as total_log_size,
                        SUM(size) as total_log_bytes
                    FROM pg_ls_logdir()
                """)
                )
                log_info = result.fetchone()
                volume_analysis["log_files"] = {
                    "count": log_info[0],
                    "total_size": log_info[1],
                    "total_bytes": log_info[2],
                }
            except Exception as e:
                volume_analysis["log_files"] = {
                    "error": f"Cannot access log files: {str(e)}"
                }

            # 6. PostgreSQL settings that affect disk usage (simplified to avoid transaction issues)
            try:
                result = conn.execute(
                    text("""
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
                """)
                )
                volume_analysis["postgres_settings"] = [
                    {"name": row[0], "setting": row[1], "unit": row[2]}
                    for row in result.fetchall()
                ]
            except Exception as e:
                volume_analysis["postgres_settings"] = {
                    "error": f"Cannot access settings: {str(e)}"
                }

            # 7. Calculate estimated total volume usage
            total_estimated = db_info[1]  # Database size
            if (
                "total_bytes" in volume_analysis.get("wal_summary", {})
                and volume_analysis["wal_summary"]["total_bytes"]
            ):
                total_estimated += volume_analysis["wal_summary"]["total_bytes"]
            if (
                "total_bytes" in volume_analysis.get("temp_files", {})
                and volume_analysis["temp_files"]["total_bytes"]
            ):
                total_estimated += volume_analysis["temp_files"]["total_bytes"]
            if (
                "total_bytes" in volume_analysis.get("log_files", {})
                and volume_analysis["log_files"]["total_bytes"]
            ):
                total_estimated += volume_analysis["log_files"]["total_bytes"]
            if (
                "total_bytes" in volume_analysis.get("wal_archive", {})
                and volume_analysis["wal_archive"]["total_bytes"]
            ):
                total_estimated += volume_analysis["wal_archive"]["total_bytes"]

            volume_analysis["estimated_total"] = {
                "bytes": total_estimated,
                "size": f"{total_estimated / (1024 * 1024):.1f} MB",
            }

        return {
            "message": "Volume analysis completed",
            "volume_analysis": volume_analysis,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "This shows all PostgreSQL files contributing to volume size",
        }

    except Exception as e:
        logger.error(f"Volume analysis failed: {e}")
        return {
            "error": "Volume analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Q&A Dataset API endpoints
@app.get("/api/qa")
def get_qa_dataset():
    """Get all Q&A pairs"""
    try:
        # First, ensure table exists
        from database import create_tables

        create_tables()

        db = SessionLocal()

        # Check if table exists by trying to query it
        try:
            qa_items = db.query(QADataset).order_by(QADataset.date_added.desc()).all()
        except Exception as table_error:
            logger.error(f"Q&A table access error: {table_error}")
            # Try to initialize the data
            try:
                from init_qa_data import init_qa_data

                init_qa_data()
                qa_items = (
                    db.query(QADataset).order_by(QADataset.date_added.desc()).all()
                )
            except Exception as init_error:
                logger.error(f"Q&A initialization error: {init_error}")
                db.close()
                return {
                    "error": f"Q&A system not available: {str(table_error)}",
                    "details": f"Initialization failed: {str(init_error)}",
                    "qa_items": [],
                    "total_count": 0,
                }

        db.close()

        return {
            "qa_items": [
                {
                    "id": item.id,
                    "question": item.question,
                    "answer": item.answer,
                    "topic": item.topic,
                    "tags": item.tags.split(",") if item.tags else [],
                    "source": item.source,
                    "original_poster": item.original_poster,
                    "post_link": item.post_link,
                    "date_added": item.date_added.isoformat(),
                    "created_at": item.created_at.isoformat(),
                }
                for item in qa_items
            ],
            "total_count": len(qa_items),
        }
    except Exception as e:
        logger.error(f"Error retrieving Q&A dataset: {e}")
        return {
            "error": f"Failed to retrieve Q&A dataset: {str(e)}",
            "qa_items": [],
            "total_count": 0,
        }


@app.get("/api/qa/search")
def search_qa_dataset(q: str = None, topic: str = None):
    """Search Q&A dataset by text or topic"""
    try:
        db = SessionLocal()
        query = db.query(QADataset)

        if q:
            # PostgreSQL text search
            search_text = f"%{q}%"
            query = query.filter(
                (QADataset.question.ilike(search_text))
                | (QADataset.answer.ilike(search_text))
            )

        if topic:
            query = query.filter(QADataset.topic.ilike(f"%{topic}%"))

        results = query.order_by(QADataset.date_added.desc()).all()
        db.close()

        return {
            "results": [
                {
                    "id": item.id,
                    "question": item.question,
                    "answer": item.answer,
                    "topic": item.topic,
                    "tags": item.tags.split(",") if item.tags else [],
                    "source": item.source,
                    "original_poster": item.original_poster,
                    "post_link": item.post_link,
                    "date_added": item.date_added.isoformat(),
                    "created_at": item.created_at.isoformat(),
                }
                for item in results
            ],
            "total_results": len(results),
            "search_query": q,
            "topic_filter": topic,
        }
    except Exception as e:
        logger.error(f"Error searching Q&A dataset: {e}")
        return {"error": "Failed to search Q&A dataset"}


@app.post("/api/qa")
@limiter.limit("10/hour")  # Reasonable limit for adding Q&A items
def add_qa_item(request: Request, qa_data: dict):
    """Add a new Q&A item"""
    try:
        db = SessionLocal()

        # Parse the date
        date_added = datetime.fromisoformat(
            qa_data["date_added"].replace("Z", "+00:00")
        )

        new_item = QADataset(
            question=qa_data["question"],
            answer=qa_data["answer"],
            topic=qa_data.get("topic", "Dev FAQ"),
            tags=",".join(qa_data.get("tags", [])),
            source=qa_data.get("source", "RF4 Forum"),
            original_poster=qa_data.get("original_poster"),
            post_link=qa_data.get("post_link"),
            date_added=date_added,
        )

        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        db.close()

        return {
            "message": "Q&A item added successfully",
            "id": new_item.id,
            "question": new_item.question[:100] + "..."
            if len(new_item.question) > 100
            else new_item.question,
        }
    except Exception as e:
        logger.error(f"Error adding Q&A item: {e}")
        return {"error": "Failed to add Q&A item"}


@app.delete("/admin/qa/{item_id}")
def delete_qa_item(item_id: int, token: str = Depends(verify_admin_token)):
    """Delete a Q&A item by ID (admin only)"""
    try:
        db = SessionLocal()

        # Find the item
        item = db.query(QADataset).filter(QADataset.id == item_id).first()
        if not item:
            db.close()
            return {"error": "Q&A item not found"}

        # Delete the item
        db.delete(item)
        db.commit()
        db.close()

        return {"message": "Q&A item deleted successfully", "id": item_id}
    except Exception as e:
        logger.error(f"Error deleting Q&A item: {e}")
        return {"error": "Failed to delete Q&A item"}


@app.post("/admin/add-more-qa-entries")
def add_more_qa_entries(token: str = Depends(verify_admin_token)):
    """Add 6 more Q&A entries from Dev FAQ 2024"""
    try:
        db = SessionLocal()

        # Check if these entries already exist (to prevent duplicates)
        existing_count = db.query(QADataset).count()
        if existing_count >= 9:
            db.close()
            return {
                "message": "Additional Q&A entries already exist",
                "total_count": existing_count,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        # New Q&A pairs from Dev FAQ 2024 - December 2, 2024
        qa_pairs = [
            {
                "question": "I have written many times in the suggestions about adding a technoplankton rig to float fishing for catching Bighead Carp, Buffalo and other fish with similar preferences. As for realism, it's only a plus, in addition it will revive heavy match tackle, which is now of little use and float fishing in general. And yes, here too, RF4 lags behind other games where such rigs are present. Are there any plans to add such rigs?",
                "answer": "We have no plans to add this kind of float fishing rig at the moment, especially since this kind of rig, due to its narrow specialization, is expected to cause a game balance disorder, but we are constantly looking for ideas for the development of the project. Thank you for your idea.",
                "topic": "Fishing Equipment",
                "tags": "technoplankton,float fishing,match tackle,bighead carp,buffalo",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
            {
                "question": "When fishing on droppers (dropshots), only two of the baits used are displayed in the upper left corner of the screen. Are there plans to increase the number of boxes to display all the baits included in the assembly?",
                "answer": "This problem we will try to solve.",
                "topic": "UI/Interface",
                "tags": "droppers,dropshots,UI,bait display,interface",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
            {
                "question": "Are there plans to implement spring, autumn water bodies? (season changes)",
                "answer": "Definitely! Stay tuned.",
                "topic": "Game Features",
                "tags": "seasons,spring,autumn,waterbodies,seasonal changes",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
            {
                "question": 'Are there plans to redesign the chat room, in particular we really miss the "Friends" function, where you could add your friends, and in this tab see only messages from them, quickly switch between profiles, etc. Now the "Messages" tab is very quickly clogged with beggars and other strange people.',
                "answer": 'Yes, we will improve the chat and messages, including the introduction of "Friends" and related functionality.',
                "topic": "Social Features",
                "tags": "chat,friends,messages,social,communication",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
            {
                "question": "Are there plans to introduce new lures for spin fishing? For example, tail spinners, swim baits, and other modern things.",
                "answer": "We plan to develop spin fishing further and add new lures and rigs. We can't say yet what exactly will be added first.",
                "topic": "Fishing Equipment",
                "tags": "lures,spin fishing,tail spinners,swim baits,tackle",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
            {
                "question": "Are there any improvements planned for the houses? 1)Many nice, interesting fish have appeared. I would like to hang their trophies on the walls, but there is not enough space. Can we add the possibility of buying a room for trophies? There is the door for it on Norwegian Sea already..... 2)Expand the functionality of the house: an aquarium for storing bait fish, a kitchen for cooking new dishes, etc. 3) There is no place to put/store/hang medals/cups etc. Additional shelves/boards would be nice. 4)Add a team house, at least for lures/baits storage.",
                "answer": "Since there is such a request, yes, we will work on further development of the houses.",
                "topic": "Game Features",
                "tags": "houses,trophies,aquarium,kitchen,medals,team house,storage",
                "source": "RF4 Dev FAQ 2024",
                "original_poster": "TpCatch - RF4",
                "post_link": "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/",
                "date_added": datetime(2024, 12, 2, tzinfo=timezone.utc),
            },
        ]

        # Add all Q&A pairs
        for qa_data in qa_pairs:
            new_item = QADataset(
                question=qa_data["question"],
                answer=qa_data["answer"],
                topic=qa_data["topic"],
                tags=qa_data["tags"],
                source=qa_data["source"],
                original_poster=qa_data["original_poster"],
                post_link=qa_data["post_link"],
                date_added=qa_data["date_added"],
            )
            db.add(new_item)

        db.commit()

        # Get final count
        final_count = db.query(QADataset).count()
        db.close()

        return {
            "message": f"Successfully added {len(qa_pairs)} more Q&A entries",
            "entries_added": len(qa_pairs),
            "total_count": final_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Error adding more Q&A entries: {e}")
        return {
            "error": f"Failed to add more Q&A entries: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/admin/create-qa-table")
def create_qa_table(token: str = Depends(verify_admin_token)):
    """Manually create the Q&A table for troubleshooting"""
    try:
        from database import create_tables, get_database_url
        from sqlalchemy import create_engine, text

        # Get database info
        database_url = get_database_url()

        # Create engine and check table existence
        engine = create_engine(database_url)

        # Try to create all tables
        create_tables()

        # Check if qa_dataset table now exists
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'qa_dataset'
            """)
            )

            table_exists = result.fetchone() is not None

            if table_exists:
                # Count records
                result = conn.execute(text("SELECT COUNT(*) FROM qa_dataset"))
                record_count = result.scalar()

                # Initialize data if empty
                if record_count == 0:
                    from init_qa_data import init_qa_data

                    init_success = init_qa_data()

                    # Recount after initialization
                    result = conn.execute(text("SELECT COUNT(*) FROM qa_dataset"))
                    record_count = result.scalar()

                    return {
                        "message": "Q&A table created and initialized successfully",
                        "table_exists": True,
                        "record_count": record_count,
                        "initialization_success": init_success,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                else:
                    return {
                        "message": "Q&A table already exists with data",
                        "table_exists": True,
                        "record_count": record_count,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
            else:
                return {
                    "error": "Failed to create Q&A table",
                    "table_exists": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

    except Exception as e:
        logger.error(f"Error creating Q&A table: {e}")
        return {
            "error": f"Failed to create Q&A table: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Memory monitoring endpoints
@app.get("/admin/memory/start")
def start_memory_monitoring(token: str = Depends(verify_admin_token)):
    """Start memory monitoring"""
    try:
        from memory_tracker import memory_tracker

        if memory_tracker.is_running():
            return {
                "message": "Memory monitoring already running",
                "status": "already_running",
            }

        success = memory_tracker.start_monitoring()
        if success:
            return {
                "message": "Memory monitoring started successfully",
                "status": "started",
            }
        else:
            return {"error": "Failed to start memory monitoring", "status": "failed"}
    except Exception as e:
        logger.error(f"Error starting memory monitoring: {e}")
        return {"error": str(e), "status": "error"}


@app.get("/admin/memory/stop")
def stop_memory_monitoring(token: str = Depends(verify_admin_token)):
    """Stop memory monitoring"""
    try:
        from memory_tracker import memory_tracker

        if not memory_tracker.is_running():
            return {"message": "Memory monitoring not running", "status": "not_running"}

        success = memory_tracker.stop_monitoring()
        if success:
            return {
                "message": "Memory monitoring stopped successfully",
                "status": "stopped",
            }
        else:
            return {"error": "Failed to stop memory monitoring", "status": "failed"}
    except Exception as e:
        logger.error(f"Error stopping memory monitoring: {e}")
        return {"error": str(e), "status": "error"}


@app.get("/admin/memory/status")
def get_memory_monitoring_status(token: str = Depends(verify_admin_token)):
    """Get memory monitoring status"""
    try:
        from memory_tracker import memory_tracker

        return {
            "running": memory_tracker.is_running(),
            "total_snapshots": len(memory_tracker.load_snapshots()),
            "current_snapshot": memory_tracker.get_memory_snapshot(),
        }
    except Exception as e:
        logger.error(f"Error getting memory monitoring status: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/stats")
def get_memory_stats(token: str = Depends(verify_admin_token)):
    """Get memory usage statistics"""
    try:
        from memory_tracker import memory_tracker

        stats = memory_tracker.get_memory_stats()
        return {"memory_stats": stats}
    except Exception as e:
        logger.error(f"Error getting memory stats: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/recent")
def get_recent_memory_snapshots(
    minutes: int = 60, token: str = Depends(verify_admin_token)
):
    """Get recent memory snapshots"""
    try:
        from memory_tracker import memory_tracker

        snapshots = memory_tracker.get_recent_snapshots(minutes)
        return {
            "snapshots": snapshots,
            "count": len(snapshots),
            "period_minutes": minutes,
        }
    except Exception as e:
        logger.error(f"Error getting recent memory snapshots: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/all")
def get_all_memory_snapshots(token: str = Depends(verify_admin_token)):
    """Get all memory snapshots"""
    try:
        from memory_tracker import memory_tracker

        snapshots = memory_tracker.load_snapshots()
        return {"snapshots": snapshots, "count": len(snapshots)}
    except Exception as e:
        logger.error(f"Error getting all memory snapshots: {e}")
        return {"error": str(e)}


@app.post("/api/cafe-orders/confirm")
async def confirm_cafe_orders(orders: list[dict]):
    """Confirm and save cafe orders to database"""
    db = SessionLocal()
    try:
        saved_orders = []
        for order in orders:
            # Convert mass to grams for consistent storage
            mass_str = order.get("mass", "")
            mass_grams = 0
            if "kg" in mass_str:
                mass_grams = float(mass_str.replace("kg", "").strip()) * 1000
            elif "g" in mass_str:
                mass_grams = float(mass_str.replace("g", "").strip())

            # Create new cafe order
            cafe_order = CafeOrder(
                fish_name=order.get("fish_name", order.get("name", "")),
                location=order["location"],
                quantity=order["quantity"]
                if isinstance(order["quantity"], int)
                else int(order["quantity"].split()[0]),
                mass=order["mass"],
                price=float(order["price"]),
            )
            db.add(cafe_order)
            saved_orders.append(cafe_order)

        db.commit()

        return {
            "success": True,
            "saved_count": len(saved_orders),
            "message": f"Successfully saved {len(saved_orders)} cafe orders",
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error saving cafe orders: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving orders: {str(e)}")
    finally:
        db.close()


@app.post("/api/cafe-orders/add")
@limiter.limit("20/hour")  # Reasonable limit for adding cafe orders
async def add_cafe_orders(request: Request, orders: list[dict]):
    """Add new cafe orders to database (simplified endpoint)"""
    db = SessionLocal()
    try:
        saved_orders = []
        for order in orders:
            cafe_order = CafeOrder(
                fish_name=order["fish_name"],
                location=order["location"],
                quantity=order["quantity"],
                mass=order["mass"],
                price=float(order["price"]),
            )
            db.add(cafe_order)
            saved_orders.append(cafe_order)

        db.commit()

        return {
            "success": True,
            "added_count": len(saved_orders),
            "message": f"Successfully added {len(saved_orders)} cafe orders",
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error adding cafe orders: {e}")
        raise HTTPException(status_code=500, detail=f"Error adding orders: {str(e)}")
    finally:
        db.close()


@app.get("/api/cafe-orders")
def get_cafe_orders(location: str = None):
    """Get all cafe orders with price ranges"""
    db = SessionLocal()
    try:
        from sqlalchemy import func

        # Base query to get price ranges
        query = db.query(
            CafeOrder.fish_name,
            CafeOrder.location,
            CafeOrder.quantity,
            CafeOrder.mass,
            func.min(CafeOrder.price).label("min_price"),
            func.max(CafeOrder.price).label("max_price"),
            func.count(CafeOrder.id).label("sample_count"),
        ).group_by(
            CafeOrder.fish_name, CafeOrder.location, CafeOrder.quantity, CafeOrder.mass
        )

        if location:
            query = query.filter(CafeOrder.location == location)

        results = query.all()

        # Format results
        cafe_orders = []
        for result in results:
            cafe_orders.append(
                {
                    "fish_name": result.fish_name,
                    "location": result.location,
                    "quantity": result.quantity,
                    "mass": result.mass,
                    "min_price": result.min_price,
                    "max_price": result.max_price,
                    "price_range": f"{result.min_price:.2f} - {result.max_price:.2f}"
                    if result.min_price != result.max_price
                    else f"{result.min_price:.2f}",
                    "sample_count": result.sample_count,
                }
            )

        # Get unique locations
        locations = db.query(CafeOrder.location).distinct().all()

        return {
            "orders": cafe_orders,
            "locations": [loc[0] for loc in locations],
            "total_orders": len(cafe_orders),
        }

    except Exception as e:
        logger.error(f"Error getting cafe orders: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving orders: {str(e)}"
        )
    finally:
        db.close()


# Feedback and Issues endpoints
@app.post("/api/feedback")
@limiter.limit("5/hour")  # Prevent spam while allowing legitimate feedback
async def submit_feedback(request: Request, feedback_data: dict):
    """Submit user feedback or issue report"""
    db = SessionLocal()
    try:
        # Get client IP and user agent for spam detection and debugging
        client_ip = (
            getattr(request.client, "host", "unknown")
            if hasattr(request, "client")
            else "unknown"
        )
        user_agent = request.headers.get("user-agent", "unknown")

        # Validate required fields
        if not feedback_data.get("type") or feedback_data["type"] not in [
            "feedback",
            "issue",
        ]:
            raise HTTPException(
                status_code=400, detail="Type must be 'feedback' or 'issue'"
            )

        if not feedback_data.get("subject") or not feedback_data.get("message"):
            raise HTTPException(
                status_code=400, detail="Subject and message are required"
            )

        # Create feedback record
        feedback = Feedback(
            type=feedback_data["type"],
            subject=feedback_data["subject"][:200],  # Limit subject length
            message=feedback_data["message"][:2000],  # Limit message length
            user_info=feedback_data.get("user_info", "")[:100]
            if feedback_data.get("user_info")
            else None,
            page_url=feedback_data.get("page_url", "")[:500]
            if feedback_data.get("page_url")
            else None,
            user_agent=user_agent[:500],
            ip_address=client_ip,
            status="new",
        )

        db.add(feedback)
        db.commit()

        # Send email notification asynchronously
        feedback_dict = {
            "id": feedback.id,
            "type": feedback.type,
            "subject": feedback.subject,
            "message": feedback.message,
            "user_info": feedback.user_info,
            "page_url": feedback.page_url,
            "user_agent": feedback.user_agent,
            "ip_address": feedback.ip_address,
            "created_at": feedback.created_at.isoformat()
            if feedback.created_at
            else None,
        }

        # Send email notification (don't await to avoid blocking the response)
        import asyncio

        asyncio.create_task(send_feedback_email(feedback_dict))

        return {
            "success": True,
            "message": "Thank you for your feedback! We'll review it soon.",
            "feedback_id": feedback.id,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
    finally:
        db.close()


@app.get("/admin/feedback")
def get_feedback(
    token: str = Depends(verify_admin_token),
    status: str = None,
    type: str = None,
    limit: int = 50,
    offset: int = 0,
):
    """Get feedback and issues (admin only)"""
    db = SessionLocal()
    try:
        query = db.query(Feedback)

        # Filter by status if provided
        if status and status in ["new", "reviewing", "resolved", "closed"]:
            query = query.filter(Feedback.status == status)

        # Filter by type if provided
        if type and type in ["feedback", "issue"]:
            query = query.filter(Feedback.type == type)

        # Order by newest first
        query = query.order_by(Feedback.created_at.desc())

        # Apply pagination
        total_count = query.count()
        feedback_items = query.offset(offset).limit(limit).all()

        return {
            "feedback": [
                {
                    "id": item.id,
                    "type": item.type,
                    "subject": item.subject,
                    "message": item.message,
                    "user_info": item.user_info,
                    "page_url": item.page_url,
                    "user_agent": item.user_agent,
                    "ip_address": item.ip_address,
                    "status": item.status,
                    "created_at": item.created_at.isoformat(),
                    "updated_at": item.updated_at.isoformat()
                    if item.updated_at
                    else None,
                }
                for item in feedback_items
            ],
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
        }

    except Exception as e:
        logger.error(f"Error getting feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve feedback")
    finally:
        db.close()


@app.patch("/admin/feedback/{feedback_id}/status")
def update_feedback_status(
    feedback_id: int, status_data: dict, token: str = Depends(verify_admin_token)
):
    """Update feedback status (admin only)"""
    db = SessionLocal()
    try:
        new_status = status_data.get("status")
        if not new_status or new_status not in [
            "new",
            "reviewing",
            "resolved",
            "closed",
        ]:
            raise HTTPException(status_code=400, detail="Invalid status")

        feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")

        feedback.status = new_status
        feedback.updated_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "success": True,
            "message": f"Feedback status updated to {new_status}",
            "feedback_id": feedback_id,
            "new_status": new_status,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating feedback status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update feedback status")
    finally:
        db.close()


# Enhanced memory profiling endpoints
@app.post("/admin/memory/profile/start")
def start_memory_profiling(token: str = Depends(verify_admin_token)):
    """Start detailed memory profiling with tracemalloc"""
    try:
        from memory_profiler import memory_profiler

        success = memory_profiler.start_tracing()
        if success:
            return {"message": "Memory profiling started", "status": "started"}
        else:
            return {
                "message": "Memory profiling already running",
                "status": "already_running",
            }
    except Exception as e:
        logger.error(f"Error starting memory profiling: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/profile/current")
def get_current_memory_profile(token: str = Depends(verify_admin_token)):
    """Get detailed current memory profile"""
    try:
        from memory_profiler import memory_profiler

        profile = memory_profiler.get_detailed_profile()
        memory_profiler.save_profile(profile)

        return {"profile": profile}
    except Exception as e:
        logger.error(f"Error getting memory profile: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/profile/types")
def get_memory_by_type():
    """Get memory usage broken down by object type"""
    try:
        from memory_profiler import memory_profiler

        types = memory_profiler.get_memory_by_type()
        return {"memory_by_type": types}
    except Exception as e:
        logger.error(f"Error getting memory by type: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/profile/sqlalchemy")
def get_sqlalchemy_analysis():
    """Analyze SQLAlchemy sessions and connections"""
    try:
        from memory_profiler import memory_profiler

        analysis = memory_profiler.analyze_sqlalchemy_sessions()
        return {"sqlalchemy_analysis": analysis}
    except Exception as e:
        logger.error(f"Error analyzing SQLAlchemy: {e}")
        return {"error": str(e)}


@app.post("/admin/memory/profile/gc-collect")
def force_gc_collect(token: str = Depends(verify_admin_token)):
    """Force garbage collection and return stats"""
    try:
        import gc

        before = gc.get_count()
        collected = gc.collect()
        after = gc.get_count()

        return {
            "collected": collected,
            "before": before,
            "after": after,
            "garbage": len(gc.garbage),
        }
    except Exception as e:
        logger.error(f"Error during GC collect: {e}")
        return {"error": str(e)}


# System-wide memory monitoring endpoints
@app.get("/admin/memory/system/breakdown")
def get_system_memory_breakdown(token: str = Depends(verify_admin_token)):
    """Get comprehensive memory breakdown for all processes"""
    try:
        from system_monitor import system_monitor

        breakdown = system_monitor.get_system_memory_breakdown()
        return {"system_breakdown": breakdown}
    except Exception as e:
        logger.error(f"Error getting system breakdown: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/system/categories")
def get_memory_by_category():
    """Get memory usage categorized by type (Python, Chrome, etc)"""
    try:
        from system_monitor import system_monitor

        categories = system_monitor.monitor_memory_sources()
        return {"memory_categories": categories}
    except Exception as e:
        logger.error(f"Error getting memory categories: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/system/chrome")
def get_chrome_processes():
    """Get all Chrome/Chromium processes"""
    try:
        from system_monitor import system_monitor

        chrome_procs = system_monitor.get_chrome_processes()
        return {
            "chrome_processes": chrome_procs,
            "count": len(chrome_procs),
            "total_rss_mb": sum(p["rss_mb"] for p in chrome_procs),
        }
    except Exception as e:
        logger.error(f"Error getting Chrome processes: {e}")
        return {"error": str(e)}


@app.get("/admin/memory/system/compare/{railway_mb}")
def compare_with_railway(railway_mb: float):
    """Compare our measurements with Railway's reported memory"""
    try:
        from system_monitor import system_monitor

        comparison = system_monitor.compare_with_railway(railway_mb)
        return comparison
    except Exception as e:
        logger.error(f"Error comparing with Railway: {e}")
        return {"error": str(e)}


@app.post("/admin/memory/cleanup/beautifulsoup")
def force_beautifulsoup_cleanup(token: str = Depends(verify_admin_token)):
    """Force clear BeautifulSoup cache to free memory"""
    try:
        from unified_cleanup import clear_beautifulsoup_cache, get_memory_usage

        memory_before = get_memory_usage()
        clear_beautifulsoup_cache()

        # Force garbage collection to clean up the objects
        import gc

        collected = gc.collect()

        memory_after = get_memory_usage()
        memory_freed = memory_before - memory_after

        return {
            "message": "BeautifulSoup cache cleared",
            "memory_before_mb": memory_before,
            "memory_after_mb": memory_after,
            "memory_freed_mb": memory_freed,
            "objects_collected": collected,
        }
    except Exception as e:
        logger.error(f"Error clearing BeautifulSoup cache: {e}")
        return {"error": str(e)}


@app.post("/admin/memory/system/release")
def force_system_memory_release(token: str = Depends(verify_admin_token)):
    """Force system-level memory release to combat container memory growth"""
    try:
        from unified_cleanup import post_scrape_cleanup

        memory_before = get_memory_usage()

        # Run comprehensive cleanup including system memory release
        success, memory_freed = post_scrape_cleanup()

        memory_after = get_memory_usage()

        return {
            "status": "system_memory_release_completed",
            "success": success,
            "memory_before_mb": memory_before,
            "memory_after_mb": memory_after,
            "memory_freed_mb": memory_freed,
            "message": "Attempted aggressive system-level memory release to combat Railway container memory growth",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in system memory release: {e}")
        return {"error": str(e)}


@app.get("/admin/system/info")
def get_system_info(token: str = Depends(verify_admin_token)):
    """Get system information including C library details"""
    try:
        import platform
        import subprocess
        import ctypes
        import os

        info = {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "architecture": platform.architecture(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "system": platform.system(),
            "release": platform.release(),
        }

        # Check for glibc
        try:
            # Try to load libc and get version
            libc = ctypes.CDLL("libc.so.6")
            info["libc_available"] = True
            info["libc_path"] = "libc.so.6"

            # Try to get glibc version
            try:
                result = subprocess.run(
                    ["ldd", "--version"], capture_output=True, text=True
                )
                if result.returncode == 0:
                    info["ldd_version"] = result.stdout.split("\n")[0]
            except:
                info["ldd_version"] = "not available"

        except OSError as e:
            info["libc_available"] = False
            info["libc_error"] = str(e)

            # Try alternative libc names
            for lib_name in ["libc.so", "libSystem.dylib", "msvcrt.dll"]:
                try:
                    ctypes.CDLL(lib_name)
                    info["alternative_libc"] = lib_name
                    break
                except:
                    continue

        # Check /etc/os-release for distro info
        try:
            with open("/etc/os-release", "r") as f:
                os_release = {}
                for line in f:
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        os_release[key] = value.strip('"')
                info["os_release"] = os_release
        except:
            info["os_release"] = "not available"

        return info

    except Exception as e:
        return {"error": str(e)}


@app.get("/admin/memory/malloc/info")
def get_malloc_info():
    """Get malloc configuration and test malloc_trim()"""
    try:
        import ctypes
        import os

        info = {
            "malloc_trim_threshold": os.environ.get("MALLOC_TRIM_THRESHOLD", "not_set"),
            "other_malloc_vars": {
                "MALLOC_MMAP_THRESHOLD_": os.environ.get(
                    "MALLOC_MMAP_THRESHOLD_", "not_set"
                ),
                "MALLOC_TOP_PAD_": os.environ.get("MALLOC_TOP_PAD_", "not_set"),
                "MALLOC_MMAP_MAX_": os.environ.get("MALLOC_MMAP_MAX_", "not_set"),
            },
        }

        # Test malloc_trim()
        try:
            libc = ctypes.CDLL("libc.so.6")

            # Get memory before trim
            before_memory = get_memory_usage()

            # Call malloc_trim(0) to release all possible memory
            trim_result = libc.malloc_trim(0)

            # Get memory after trim
            after_memory = get_memory_usage()
            memory_freed = before_memory - after_memory

            info["malloc_trim_test"] = {
                "success": bool(trim_result),
                "memory_before_mb": before_memory,
                "memory_after_mb": after_memory,
                "memory_freed_mb": memory_freed,
                "trim_return_value": trim_result,
            }

        except Exception as e:
            info["malloc_trim_test"] = {"error": str(e)}

        return info

    except Exception as e:
        return {"error": str(e)}


# Poll endpoints
@app.get("/api/poll/current")
def get_current_poll():
    """Get the current active poll"""
    try:
        # For now, return the hardcoded poll
        # In the future, this could be stored in database
        return {
            "poll": {
                "id": "fishing_type_2025",
                "title": "What type of fishing would you like to see added to Russian Fishing 4?",
                "choices": ["Fly Fishing", "Ice Fishing", "Netting", "Something Else"],
                "active": True,
                "created_at": "2025-01-20T00:00:00Z",
            }
        }
    except Exception as e:
        logger.error(f"Error getting current poll: {e}")
        return {"error": "Failed to get current poll"}


@app.post("/api/poll/vote")
@limiter.limit("1/hour")  # One vote per hour per IP
async def submit_poll_vote(request: Request, vote_data: dict):
    """Submit a vote for the current poll"""
    db = SessionLocal()
    try:
        # Get client IP for duplicate prevention
        client_ip = (
            getattr(request.client, "host", "unknown")
            if hasattr(request, "client")
            else "unknown"
        )
        user_agent = request.headers.get("user-agent", "unknown")

        # Validate vote data
        poll_id = vote_data.get("poll_id")
        choice = vote_data.get("choice")

        if not poll_id or not choice:
            raise HTTPException(
                status_code=400, detail="Poll ID and choice are required"
            )

        # Check if this IP has already voted for this poll
        existing_vote = (
            db.query(PollVote)
            .filter(PollVote.poll_id == poll_id, PollVote.ip_address == client_ip)
            .first()
        )

        if existing_vote:
            raise HTTPException(
                status_code=409, detail="You have already voted in this poll"
            )

        # Validate choice is one of the allowed options
        valid_choices = ["Fly Fishing", "Ice Fishing", "Netting", "Something Else"]
        if choice not in valid_choices:
            raise HTTPException(status_code=400, detail="Invalid choice")

        # Create new vote
        new_vote = PollVote(
            poll_id=poll_id,
            choice=choice,
            ip_address=client_ip,
            user_agent=user_agent[:500] if user_agent else None,
        )

        db.add(new_vote)
        db.commit()

        return {
            "success": True,
            "message": "Vote submitted successfully",
            "choice": choice,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting poll vote: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit vote")
    finally:
        db.close()


@app.get("/api/poll/results")
def get_poll_results(poll_id: str = "fishing_type_2025"):
    """Get poll results"""
    db = SessionLocal()
    try:
        from sqlalchemy import func

        # Get vote counts by choice
        results = (
            db.query(PollVote.choice, func.count(PollVote.id).label("vote_count"))
            .filter(PollVote.poll_id == poll_id)
            .group_by(PollVote.choice)
            .all()
        )

        # Calculate total votes
        total_votes = sum(result.vote_count for result in results)

        # Format results with percentages
        formatted_results = []
        for result in results:
            percentage = (
                (result.vote_count / total_votes * 100) if total_votes > 0 else 0
            )
            formatted_results.append(
                {
                    "choice": result.choice,
                    "votes": result.vote_count,
                    "percentage": round(percentage, 1),
                }
            )

        # Sort by vote count descending
        formatted_results.sort(key=lambda x: x["votes"], reverse=True)

        return {
            "poll_id": poll_id,
            "total_votes": total_votes,
            "results": formatted_results,
        }

    except Exception as e:
        logger.error(f"Error getting poll results: {e}")
        return {"error": "Failed to get poll results"}
    finally:
        db.close()


@app.get("/api/poll/check-voted")
async def check_if_voted(request: Request, poll_id: str = "fishing_type_2025"):
    """Check if the current IP has already voted"""
    db = SessionLocal()
    try:
        # Get client IP
        client_ip = (
            getattr(request.client, "host", "unknown")
            if hasattr(request, "client")
            else "unknown"
        )

        # Check if this IP has voted
        existing_vote = (
            db.query(PollVote)
            .filter(PollVote.poll_id == poll_id, PollVote.ip_address == client_ip)
            .first()
        )

        return {
            "has_voted": existing_vote is not None,
            "choice": existing_vote.choice if existing_vote else None,
        }

    except Exception as e:
        logger.error(f"Error checking vote status: {e}")
        return {"error": "Failed to check vote status"}
    finally:
        db.close()


# Serve the frontend for all other routes (SPA routing)
@app.get("/{path:path}")
def serve_frontend(path: str):
    """Serve the frontend application for all non-API routes"""
    # Don't serve frontend for API paths and endpoints
    # These paths should have been handled by their specific routes already
    # If we reach here with these paths, it means the endpoint doesn't exist
    api_prefixes = [
        "api/",
        "admin/",
        "health",
        "refresh",
        "cleanup",
        "status",
        "records",
    ]
    for prefix in api_prefixes:
        if path.startswith(prefix) or path == prefix.rstrip("/"):
            raise HTTPException(
                status_code=404, detail=f"API endpoint /{path} not found"
            )

    frontend_dist_path = os.path.join(
        os.path.dirname(__file__), "..", "frontend", "dist"
    )
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


@app.post("/test-trophy-classification")
def test_trophy_classification(
    fish_name: str, weight: int, token: str = Depends(verify_admin_token)
):
    """Test the trophy classification system"""
    try:
        from trophy_classifier import classify_trophy

        result = classify_trophy(fish_name, weight)
        return {
            "fish_name": fish_name,
            "weight": weight,
            "classification": result,
            "case_test": {
                "original": classify_trophy(fish_name, weight),
                "lowercase": classify_trophy(fish_name.lower(), weight),
                "uppercase": classify_trophy(fish_name.upper(), weight),
                "title_case": classify_trophy(fish_name.title(), weight),
            },
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/force-reclassify-trophies")
def force_reclassify_trophies(token: str = Depends(verify_admin_token)):
    """Force reclassification of all trophy records (ignores current classification)"""
    try:
        import time
        from database import SessionLocal, Record
        from trophy_classifier import classify_trophy

        start_time = time.time()
        db = SessionLocal()

        # Get all records with weights
        all_records = (
            db.query(Record).filter(Record.weight.isnot(None), Record.weight > 0).all()
        )

        total_records = len(all_records)
        updated_count = 0

        logger.info(f"🔄 Force reclassifying {total_records} records...")

        for i, record in enumerate(all_records):
            if i % 1000 == 0:
                logger.info(f"  Processed {i}/{total_records} records...")

            old_class = record.trophy_class
            new_class = classify_trophy(record.fish, record.weight)

            if old_class != new_class:
                record.trophy_class = new_class
                updated_count += 1

        # Commit all changes
        db.commit()
        db.close()

        elapsed_time = time.time() - start_time

        logger.info(
            f"✅ Force reclassification completed: {updated_count} records updated"
        )

        return {
            "message": "Force reclassification completed successfully",
            "success": True,
            "total_records": total_records,
            "updated_records": updated_count,
            "elapsed_time": f"{elapsed_time:.2f}s",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Force reclassification failed: {e}")
        return {
            "error": "Force reclassification failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/check-fish-name-matches")
def check_fish_name_matches():
    """Check for mismatches between database fish names and trophy weights"""
    try:
        from database import SessionLocal, Record
        from trophy_classifier import TROPHY_WEIGHTS

        db = SessionLocal()

        # Get all unique fish names from database
        db_fish_names = set()
        raw_db_names = (
            db.query(Record.fish).filter(Record.fish.isnot(None)).distinct().all()
        )
        for (fish_name,) in raw_db_names:
            if fish_name and fish_name.strip():
                db_fish_names.add(fish_name.strip())

        # Get all fish names from trophy weights dictionary
        trophy_fish_names = set(TROPHY_WEIGHTS.keys())

        # Find database fish names that don't have trophy weights (case-insensitive)
        db_without_trophies = set()
        for db_fish in db_fish_names:
            has_match = False
            for trophy_fish in trophy_fish_names:
                if db_fish.lower() == trophy_fish.lower():
                    has_match = True
                    break
            if not has_match:
                db_without_trophies.add(db_fish)

        # Find trophy weights that don't have database records (case-insensitive)
        trophies_without_db = set()
        for trophy_fish in trophy_fish_names:
            has_match = False
            for db_fish in db_fish_names:
                if trophy_fish.lower() == db_fish.lower():
                    has_match = True
                    break
            if not has_match:
                trophies_without_db.add(trophy_fish)

        # Check for case mismatches
        case_mismatches = []
        for db_fish in db_fish_names:
            for trophy_fish in trophy_fish_names:
                if db_fish.lower() == trophy_fish.lower() and db_fish != trophy_fish:
                    case_mismatches.append(
                        {"db_name": db_fish, "trophy_name": trophy_fish}
                    )

        # Get sample records for fish without trophy weights
        sample_records = []
        if db_without_trophies:
            for fish_name in sorted(list(db_without_trophies))[:10]:
                sample_record = (
                    db.query(Record).filter(Record.fish == fish_name).first()
                )
                if sample_record:
                    sample_records.append(
                        {
                            "fish": fish_name,
                            "weight": sample_record.weight,
                            "waterbody": sample_record.waterbody,
                        }
                    )

        db.close()

        total_mismatches = len(db_without_trophies) + len(trophies_without_db)

        return {
            "summary": {
                "database_fish_count": len(db_fish_names),
                "trophy_weights_count": len(trophy_fish_names),
                "total_mismatches": total_mismatches,
                "perfect_match": total_mismatches == 0,
            },
            "db_without_trophies": {
                "count": len(db_without_trophies),
                "fish_names": sorted(list(db_without_trophies))[:50],  # First 50
            },
            "trophies_without_db": {
                "count": len(trophies_without_db),
                "fish_names": sorted(list(trophies_without_db))[:50],  # First 50
            },
            "case_mismatches": {
                "count": len(case_mismatches),
                "examples": case_mismatches[:10],  # First 10
            },
            "sample_records_without_trophies": sample_records,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        return {
            "error": "Fish name match check failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


if __name__ == "__main__":
    import uvicorn

    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting server on {host}:{port}", flush=True)
    uvicorn.run(app, host=host, port=port)
