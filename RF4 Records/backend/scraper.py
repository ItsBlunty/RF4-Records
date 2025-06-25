import builtins
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from database import SessionLocal, Record
from sqlalchemy.orm import Session
from sqlalchemy import and_
import time
import random
import logging
from datetime import datetime, timezone
from bulk_operations import BulkRecordInserter, OptimizedRecordChecker
import os
import signal
import sys

# Built-in functions should be available naturally

# Global flag to track if scraping should be stopped
should_stop_scraping = False

# Global flag to prevent Chrome process creation after scraping is finished
_scraping_finished = False

def signal_handler(signum, frame):
    """Handle interruption signals during scraping"""
    global should_stop_scraping
    print(f"\n🛑 Scraping interrupted by signal {signum} - stopping gracefully...")
    should_stop_scraping = True

# Register signal handler for graceful interruption
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Set up logging
def setup_logging():
    """Set up logging configuration"""
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # Configure logging with clean, minimal output
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/scraper.log'),
            logging.StreamHandler()  # Also log to console
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

# Define all regional URLs to scrape for different categories
CATEGORIES = {
    'normal': {
        'name': 'Normal',
        'regions': [
            {'code': 'RU', 'name': 'Russia', 'url': 'https://rf4game.com/records/weekly/region/RU/'},
            {'code': 'DE', 'name': 'Germany', 'url': 'https://rf4game.com/records/weekly/region/DE/'},
            {'code': 'US', 'name': 'USA', 'url': 'https://rf4game.com/records/weekly/region/US/'},
            {'code': 'FR', 'name': 'France', 'url': 'https://rf4game.com/records/weekly/region/FR/'},
            {'code': 'CN', 'name': 'China', 'url': 'https://rf4game.com/records/weekly/region/CN/'},
            {'code': 'PL', 'name': 'Poland', 'url': 'https://rf4game.com/records/weekly/region/PL/'},
            {'code': 'KR', 'name': 'Korea', 'url': 'https://rf4game.com/records/weekly/region/KR/'},
            {'code': 'JP', 'name': 'Japan', 'url': 'https://rf4game.com/records/weekly/region/JP/'},
            {'code': 'ID', 'name': 'Indonesia', 'url': 'https://rf4game.com/records/weekly/region/ID/'},
            {'code': 'EN', 'name': 'Other Countries', 'url': 'https://rf4game.com/records/weekly/region/EN/'}
        ]
    },
    'ultralight': {
        'name': 'Ultralight',
        'regions': [
            {'code': 'RU', 'name': 'Russia', 'url': 'https://rf4game.com/ultralight/weekly/region/RU/'},
            {'code': 'DE', 'name': 'Germany', 'url': 'https://rf4game.com/ultralight/weekly/region/DE/'},
            {'code': 'US', 'name': 'USA', 'url': 'https://rf4game.com/ultralight/weekly/region/US/'},
            {'code': 'FR', 'name': 'France', 'url': 'https://rf4game.com/ultralight/weekly/region/FR/'},
            {'code': 'CN', 'name': 'China', 'url': 'https://rf4game.com/ultralight/weekly/region/CN/'},
            {'code': 'PL', 'name': 'Poland', 'url': 'https://rf4game.com/ultralight/weekly/region/PL/'},
            {'code': 'KR', 'name': 'Korea', 'url': 'https://rf4game.com/ultralight/weekly/region/KR/'},
            {'code': 'JP', 'name': 'Japan', 'url': 'https://rf4game.com/ultralight/weekly/region/JP/'},
            {'code': 'ID', 'name': 'Indonesia', 'url': 'https://rf4game.com/ultralight/weekly/region/ID/'},
            {'code': 'EN', 'name': 'Other Countries', 'url': 'https://rf4game.com/ultralight/weekly/region/EN/'}
        ]
    },
    'light': {
        'name': 'Light',
        'regions': [
            {'code': 'RU', 'name': 'Russia', 'url': 'https://rf4game.com/recordslight/weekly/region/RU/'},
            {'code': 'DE', 'name': 'Germany', 'url': 'https://rf4game.com/recordslight/weekly/region/DE/'},
            {'code': 'US', 'name': 'USA', 'url': 'https://rf4game.com/recordslight/weekly/region/US/'},
            {'code': 'FR', 'name': 'France', 'url': 'https://rf4game.com/recordslight/weekly/region/FR/'},
            {'code': 'CN', 'name': 'China', 'url': 'https://rf4game.com/recordslight/weekly/region/CN/'},
            {'code': 'PL', 'name': 'Poland', 'url': 'https://rf4game.com/recordslight/weekly/region/PL/'},
            {'code': 'KR', 'name': 'Korea', 'url': 'https://rf4game.com/recordslight/weekly/region/KR/'},
            {'code': 'JP', 'name': 'Japan', 'url': 'https://rf4game.com/recordslight/weekly/region/JP/'},
            {'code': 'ID', 'name': 'Indonesia', 'url': 'https://rf4game.com/recordslight/weekly/region/ID/'},
            {'code': 'EN', 'name': 'Other Countries', 'url': 'https://rf4game.com/recordslight/weekly/region/EN/'}
        ]
    },
    'bottomlight': {
        'name': 'Bottom Light',
        'regions': [
            {'code': 'RU', 'name': 'Russia', 'url': 'https://rf4game.com/bottomlight/weekly/region/RU/'},
            {'code': 'DE', 'name': 'Germany', 'url': 'https://rf4game.com/bottomlight/weekly/region/DE/'},
            {'code': 'US', 'name': 'USA', 'url': 'https://rf4game.com/bottomlight/weekly/region/US/'},
            {'code': 'FR', 'name': 'France', 'url': 'https://rf4game.com/bottomlight/weekly/region/FR/'},
            {'code': 'CN', 'name': 'China', 'url': 'https://rf4game.com/bottomlight/weekly/region/CN/'},
            {'code': 'PL', 'name': 'Poland', 'url': 'https://rf4game.com/bottomlight/weekly/region/PL/'},
            {'code': 'KR', 'name': 'Korea', 'url': 'https://rf4game.com/bottomlight/weekly/region/KR/'},
            {'code': 'JP', 'name': 'Japan', 'url': 'https://rf4game.com/bottomlight/weekly/region/JP/'},
            {'code': 'ID', 'name': 'Indonesia', 'url': 'https://rf4game.com/bottomlight/weekly/region/ID/'},
            {'code': 'EN', 'name': 'Other Countries', 'url': 'https://rf4game.com/bottomlight/weekly/region/EN/'}
        ]
    },
    'telescopic': {
        'name': 'Telescopic',
        'regions': [
            {'code': 'RU', 'name': 'Russia', 'url': 'https://rf4game.com/telestick/weekly/region/RU/'},
            {'code': 'DE', 'name': 'Germany', 'url': 'https://rf4game.com/telestick/weekly/region/DE/'},
            {'code': 'US', 'name': 'USA', 'url': 'https://rf4game.com/telestick/weekly/region/US/'},
            {'code': 'FR', 'name': 'France', 'url': 'https://rf4game.com/telestick/weekly/region/FR/'},
            {'code': 'CN', 'name': 'China', 'url': 'https://rf4game.com/telestick/weekly/region/CN/'},
            {'code': 'PL', 'name': 'Poland', 'url': 'https://rf4game.com/telestick/weekly/region/PL/'},
            {'code': 'KR', 'name': 'Korea', 'url': 'https://rf4game.com/telestick/weekly/region/KR/'},
            {'code': 'JP', 'name': 'Japan', 'url': 'https://rf4game.com/telestick/weekly/region/JP/'},
            {'code': 'ID', 'name': 'Indonesia', 'url': 'https://rf4game.com/telestick/weekly/region/ID/'},
            {'code': 'EN', 'name': 'Other Countries', 'url': 'https://rf4game.com/telestick/weekly/region/EN/'}
        ]
    }
}

# Helper to check if a record exists (updated for merged records with compact categories)
def record_exists_or_update(db: Session, data: dict):
    """
    Check if a record exists with the same fish/player/weight/waterbody/bait/date/region.
    If it exists, check if the category is already included in the category field.
    If not, update it by adding the new category to the existing category.
    Returns (exists, updated_record_id) tuple.
    """
    # Map full category names to compact format
    category_map = {
        'Normal': 'N',
        'Light': 'L', 
        'Ultralight': 'U',
        'BottomLight': 'B',
        'Bottom Light': 'B',  # Handle both formats
        'Telescopic': 'T'
    }
    
    # Find existing record (ignoring category for now)
    existing_record = db.query(Record).filter(
        and_(
            Record.player == data['player'],
            Record.fish == data['fish'],
            Record.weight == data['weight'],
            Record.waterbody == data['waterbody'],
            Record.bait1 == data['bait1'],
            Record.bait2 == data['bait2'],
            Record.date == data['date'],
            Record.region == data['region']
        )
    ).first()
    
    if existing_record:
        # Record exists - check if we need to add the new category
        new_category_code = category_map.get(data['category'], data['category'])
        
        # Parse existing categories from the category field (compact format)
        if existing_record.category:
            # Check if it's already in compact format (contains semicolons)
            if ';' in existing_record.category:
                existing_categories = set(existing_record.category.split(';'))
            else:
                # Convert old format to compact format
                old_category_code = category_map.get(existing_record.category, existing_record.category)
                existing_categories = {old_category_code}
        else:
            # Handle records that might not have category set yet
            existing_categories = set()
        
        # Add new category if not already present
        if new_category_code not in existing_categories:
            existing_categories.add(new_category_code)
            
            # Update the record with combined categories in the category field
            updated_categories = ';'.join(sorted(existing_categories))
            existing_record.category = updated_categories
            
            return True, existing_record.id
        else:
            # Category already exists, no update needed
            return True, None
    
    # Record doesn't exist
    return False, None

# Legacy function for backward compatibility
def record_exists(db: Session, data: dict):
    """Legacy function - checks if exact record exists (including category)"""
    exists, _ = record_exists_or_update(db, data)
    return exists

def split_bait_string(bait_string):
    """Split a bait string into primary and secondary baits"""
    if not bait_string:
        return None, None
    
    # Check if it's a sandwich bait (contains semicolon or plus sign)
    if ';' in bait_string:
        parts = bait_string.split(';', 1)  # Split on first semicolon
        bait1 = parts[0].strip()
        bait2 = parts[1].strip() if len(parts) > 1 else None
        return bait1, bait2
    elif '+' in bait_string:
        parts = bait_string.split('+', 1)  # Split on first plus sign only
        bait1 = parts[0].strip()
        bait2 = parts[1].strip() if len(parts) > 1 else None
        return bait1, bait2
    else:
        # Single bait
        return bait_string.strip(), None

def get_driver():
    """Create and configure Chrome WebDriver for Docker container or local development"""
    global _scraping_finished
    
    # Prevent creating new drivers if scraping is finished
    if _scraping_finished:
        logger.warning("🚫 Attempted to create Chrome driver after scraping finished - blocking to prevent memory leaks")
        raise RuntimeError("Chrome driver creation blocked - scraping session has ended")
    
    # PRE-EMPTIVE CLEANUP: Kill any existing Chrome processes before creating new ones
    chrome_count = count_chrome_processes()
    if chrome_count > 0:
        logger.info(f"Found {chrome_count} existing Chrome processes - cleaning up before creating new driver")
        kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
        time.sleep(2)  # Wait for cleanup
    
    # IMPROVED MEMORY MANAGEMENT - Check memory before creating new driver
    current_memory = get_memory_usage()
    
    # Emergency threshold - prevent memory bombs (realistic for Railway Docker)
    if current_memory > 1500:  # Realistic threshold for Railway Docker containers
        logger.critical(f"🚨 EMERGENCY: Memory critically high ({current_memory}MB) - BLOCKING Chrome creation to prevent memory bomb")
        raise MemoryError(f"EMERGENCY BLOCK: Cannot create Chrome driver - memory usage dangerous ({current_memory}MB)")
    
    # CIRCUIT BREAKER - Prevent infinite loops by allowing creation if no Chrome processes exist
    if current_memory > 1000:  # Realistic threshold for Railway with Chrome children
        logger.info(f"High memory usage ({current_memory}MB) detected - performing enhanced cleanup")
        
        # Check if there are actually Chrome processes to clean up
        chrome_process_count = count_chrome_processes()
        
        if chrome_process_count == 0:
            # No Chrome processes - memory is held by Python process
            logger.warning(f"High memory ({current_memory}MB) but no Chrome processes found - performing Python memory cleanup")
            enhanced_python_memory_cleanup()
            time.sleep(3)  # Allow cleanup to take effect
            
            # Check memory after Python cleanup
            memory_after = get_memory_usage()
            memory_freed = current_memory - memory_after
            logger.info(f"Python memory cleanup: {memory_after}MB (freed {memory_freed:.1f}MB)")
            
            # CIRCUIT BREAKER: Allow Chrome creation even if memory is still high
            # This prevents infinite loops when memory is held by Python process
            if memory_after > 1200:  # Still very high - one more attempt
                logger.warning(f"Memory still very high ({memory_after}MB) - forcing aggressive cleanup")
                enhanced_python_memory_cleanup()
                force_system_memory_release()
                time.sleep(5)
                
                final_memory = get_memory_usage()
                if final_memory > 1400:  # Emergency threshold
                    logger.error(f"Memory critically high ({final_memory}MB) after all cleanup - BLOCKING Chrome creation")
                    raise MemoryError(f"Cannot create Chrome driver - memory usage dangerous ({final_memory}MB)")
                else:
                    logger.warning(f"Proceeding with Chrome creation despite elevated memory ({final_memory}MB) - no Chrome processes to clean")
            elif memory_after > 1000:
                logger.warning(f"Memory elevated after cleanup ({memory_after}MB) - proceeding with caution")
        else:
            # Chrome processes exist - clean them up
            logger.info(f"Found {chrome_process_count} Chrome processes - performing process cleanup")
            kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
            enhanced_python_memory_cleanup()
            time.sleep(3)
            
            # Check again after cleanup
            memory_after = get_memory_usage()
            if memory_after > 1300:  # Realistic threshold for Railway
                logger.error(f"Memory still high ({memory_after}MB) after cleanup - BLOCKING Chrome creation")
                raise MemoryError(f"Cannot create Chrome driver - memory usage dangerous ({memory_after}MB)")
            else:
                logger.info(f"Memory acceptable after cleanup: {memory_after}MB")
    
    chrome_options = Options()
    
    # Core performance and memory optimization flags
    chrome_options.add_argument('--headless=new')  # Use new headless mode (faster)
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--window-size=1024,768')  # Smaller window for less memory
    
    # Chrome stability flags for Docker container
    chrome_options.add_argument('--disable-hang-monitor')  # Prevent hang detection timeout
    chrome_options.add_argument('--disable-prompt-on-repost')
    chrome_options.add_argument('--disable-client-side-phishing-detection')
    chrome_options.add_argument('--disable-web-security')  # Reduce security overhead
    chrome_options.add_argument('--disable-features=VizDisplayCompositor')
    chrome_options.add_argument('--disable-ipc-flooding-protection')  # Prevent IPC timeout
    chrome_options.add_argument('--disable-renderer-accessibility')  # Reduce renderer load
    
    # EXTREME memory optimization for Railway containers
    chrome_options.add_argument('--memory-pressure-off')
    chrome_options.add_argument('--max_old_space_size=512')  # Further reduced for Railway
    chrome_options.add_argument('--renderer-process-limit=1')  # Single renderer process
    chrome_options.add_argument('--max-unused-resource-memory-usage-percentage=5')
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-background-networking')
    chrome_options.add_argument('--aggressive-cache-discard')
    
    # Additional Railway-specific memory constraints
    chrome_options.add_argument('--max-old-space-size=256')  # V8 heap limit
    chrome_options.add_argument('--memory-pressure-off')
    chrome_options.add_argument('--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer')
    chrome_options.add_argument('--disable-gpu-sandbox')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-features=TranslateUI')
    chrome_options.add_argument('--disable-features=BlinkGenPropertyTrees')
    chrome_options.add_argument('--disable-ipc-flooding-protection')
    
    # Process management - Less aggressive approach
    chrome_options.add_argument('--disable-gpu-process')  # No separate GPU process
    chrome_options.add_argument('--disable-utility-process')  # No utility processes
    
    # Speed optimization flags
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-plugins')
    chrome_options.add_argument('--disable-images')  # Don't load images for speed
    chrome_options.add_argument('--disable-javascript-harmony-shipping')
    chrome_options.add_argument('--disable-component-extensions-with-background-pages')
    chrome_options.add_argument('--disable-default-apps')
    chrome_options.add_argument('--disable-sync')
    chrome_options.add_argument('--no-first-run')
    chrome_options.add_argument('--disable-breakpad')
    chrome_options.add_argument('--disable-features=TranslateUI,BlinkGenPropertyTrees')
    chrome_options.add_argument('--enable-features=NetworkService,NetworkServiceInProcess')
    
    # Resource optimization
    chrome_options.add_argument('--disable-3d-apis')
    chrome_options.add_argument('--disable-accelerated-2d-canvas')
    chrome_options.add_argument('--disable-accelerated-video-decode')
    chrome_options.add_argument('--hide-scrollbars')
    chrome_options.add_argument('--mute-audio')
    chrome_options.add_argument('--metrics-recording-only')
    
    # Docker container specific flags
    chrome_options.add_argument('--disable-setuid-sandbox')
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--allow-running-insecure-content')
    chrome_options.add_argument('--disable-ipc-flooding-protection')
    
    # Check deployment environment (Browserless support removed)
    chrome_bin = os.getenv('CHROME_BIN')  # Docker container Chrome path
    chromedriver_path = os.getenv('CHROMEDRIVER_PATH')  # Docker container ChromeDriver path
    
    if chrome_bin and chromedriver_path:
        # Running in Docker container with pre-installed Chrome
        logger.info("Using Docker container Chrome installation")
        
        # MEMORY MONITORING: Check memory before Chrome creation
        pre_chrome_memory = get_memory_usage()
        logger.info(f"Memory before Chrome creation: {pre_chrome_memory}MB")
        
        # Set Chrome binary location
        chrome_options.binary_location = chrome_bin
        
        # Create service with specific ChromeDriver path
        service = Service(executable_path=chromedriver_path)
        
        # MEMORY BOMB PREVENTION: Monitor memory during Chrome creation
        try:
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Check memory immediately after Chrome creation
            post_chrome_memory = get_memory_usage()
            memory_increase = post_chrome_memory - pre_chrome_memory
            logger.info(f"Memory after Chrome creation: {post_chrome_memory}MB (Δ+{memory_increase:.1f}MB)")
            
            # EMERGENCY: If Chrome creation caused massive memory spike (increased threshold)
            if post_chrome_memory > 1500:  # Much higher threshold for Railway Docker
                logger.critical(f"🚨 EMERGENCY: Chrome creation caused memory bomb ({post_chrome_memory}MB)!")
                logger.critical(f"Memory increased by {memory_increase:.1f}MB during Chrome creation")
                
                # Try to clean up the driver we just created
                try:
                    driver.quit()
                except Exception:
                    pass
                
                # Kill all Chrome processes
                kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                
                raise MemoryError(f"Chrome creation memory bomb: {post_chrome_memory}MB (increased by {memory_increase:.1f}MB)")
            
            elif memory_increase > 700:  # Chrome used more than 700MB (increased threshold)
                logger.warning(f"⚠️  Chrome creation used {memory_increase:.1f}MB - monitoring closely")
            else:
                logger.info(f"Chrome creation used {memory_increase:.1f}MB - normal range")
                
        except MemoryError:
            raise  # Re-raise memory errors
        except Exception as e:
            logger.error(f"Failed to create Chrome driver: {e}")
            raise
        
        # Set more aggressive timeouts to prevent renderer hangs in Docker
        driver.set_page_load_timeout(30)  # Reduced from 45 to prevent long hangs
        driver.implicitly_wait(10)  # Reduced from 15 to fail faster on timeouts
        
    else:
        # Local development
        logger.info("Using local ChromeDriver")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Set balanced timeouts for local development
        driver.set_page_load_timeout(30)  # Balanced timeout for local stability
        driver.implicitly_wait(10)  # Standard implicit wait
    
    return driver

def cleanup_driver(driver):
    """Aggressively cleanup WebDriver session to prevent memory leaks with fast-fail on renderer timeouts"""
    if not driver:
        logger.debug("cleanup_driver: No driver to cleanup")
        return True
    
    # Get session ID for tracking if possible
    session_id = "unknown"
    try:
        session_id = driver.session_id if hasattr(driver, 'session_id') else "unknown"
    except Exception:
        pass
    
    logger.info(f"[CLEANUP] Starting driver cleanup for session: {session_id}")
    cleanup_success = True
    cleanup_errors = []
    renderer_timeout_detected = False
    
    # Step 1: Quick responsiveness test - if this fails, skip to process termination
    try:
        # Set a very short timeout for responsiveness test
        driver.set_page_load_timeout(2)  # 2 second test
        _ = driver.current_url  # Quick test
        logger.debug(f"Session {session_id}: Renderer responsive, proceeding with cleanup")
    except Exception as e:
        if "timeout" in str(e).lower():
            logger.warning(f"Session {session_id}: Renderer unresponsive, switching to fast termination")
            renderer_timeout_detected = True
        else:
            logger.debug(f"Session {session_id}: Responsiveness test failed: {e}")
    
    # If renderer is unresponsive, skip cleanup and go straight to process termination
    if renderer_timeout_detected:
        logger.info(f"[FAST-FAIL] Session {session_id}: Skipping cleanup operations due to renderer timeout")
        cleanup_errors.append("renderer_unresponsive: skipped_cleanup_for_speed")
        cleanup_success = False
        
        # Go straight to process termination
        try:
            if hasattr(driver, 'service') and hasattr(driver.service, 'process'):
                logger.info(f"Session {session_id}: Force terminating Chrome process")
                main_pid = driver.service.process.pid
                
                # Kill main process
                driver.service.process.terminate()
                import time
                time.sleep(0.5)
                if driver.service.process.poll() is None:  # Still running
                    driver.service.process.kill()
                    time.sleep(0.2)
                
                # Kill any child processes that might have been spawned
                try:
                    import psutil
                    parent = psutil.Process(main_pid)
                    children = parent.children(recursive=True)
                    for child in children:
                        child.terminate()
                    psutil.wait_procs(children, timeout=3)
                    for child in children:
                        if child.is_running():
                            child.kill()
                    logger.info(f"Session {session_id}: Killed {len(children)} child processes")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                
                logger.info(f"Session {session_id}: Chrome process terminated successfully")
            else:
                # Fallback: try driver.quit() with very short timeout
                driver.quit()
        except Exception as e:
            logger.warning(f"Session {session_id}: Process termination failed: {e}")
        
        logger.error(f"[FAILED] Driver cleanup FAILED for session: {session_id}")
        logger.error(f"Session {session_id}: Cleanup errors: {'; '.join(cleanup_errors)}")
        
        logger.warning(f"[MEMORY LEAK RISK] Session {session_id} cleanup failed - may cause accumulation")
        return False
    
    # Normal cleanup path - renderer is responsive
    # Step 2: Clear browser data with timeout handling
    try:
        logger.debug(f"Session {session_id}: Clearing cookies...")
        driver.delete_all_cookies()
        logger.debug(f"Session {session_id}: Cookies cleared successfully")
    except Exception as e:
        # Check if it's a renderer timeout - these are expected during high load
        error_str = str(e)
        if "timeout" in error_str.lower() and "renderer" in error_str.lower():
            logger.debug(f"Session {session_id}: Cookie cleanup timeout (expected during high load)")
            cleanup_errors.append(f"delete_cookies: renderer_timeout")
        else:
            cleanup_errors.append(f"delete_cookies: {str(e)[:100]}")
            logger.warning(f"Session {session_id}: Failed to clear cookies: {e}")
        cleanup_success = False
    
    try:
        logger.debug(f"Session {session_id}: Clearing localStorage...")
        driver.execute_script("try { window.localStorage.clear(); } catch(e) { /* Storage disabled */ }")
        logger.debug(f"Session {session_id}: localStorage cleared successfully")
    except Exception as e:
        # Only treat as error if it's not a storage-disabled issue
        if "Storage is disabled" not in str(e):
            cleanup_errors.append(f"localStorage: {str(e)[:100]}")
            logger.warning(f"Session {session_id}: Failed to clear localStorage: {e}")
            cleanup_success = False
        else:
            logger.debug(f"Session {session_id}: localStorage disabled (data: URL) - skipping")
    
    try:
        logger.debug(f"Session {session_id}: Clearing sessionStorage...")
        driver.execute_script("try { window.sessionStorage.clear(); } catch(e) { /* Storage disabled */ }")
        logger.debug(f"Session {session_id}: sessionStorage cleared successfully")
    except Exception as e:
        # Only treat as error if it's not a storage-disabled issue
        if "Storage is disabled" not in str(e):
            cleanup_errors.append(f"sessionStorage: {str(e)[:100]}")
            logger.warning(f"Session {session_id}: Failed to clear sessionStorage: {e}")
            cleanup_success = False
        else:
            logger.debug(f"Session {session_id}: sessionStorage disabled (data: URL) - skipping")
    
    # Step 3: Advanced storage cleanup (non-critical) - skip if any timeouts occurred
    if cleanup_success:
        try:
            logger.debug(f"Session {session_id}: Clearing IndexedDB...")
            driver.execute_script("try { if (window.indexedDB) { window.indexedDB.deleteDatabase(''); } } catch(e) { /* Not available */ }")
            logger.debug(f"Session {session_id}: IndexedDB cleared successfully")
        except Exception as e:
            logger.debug(f"Session {session_id}: IndexedDB cleanup failed (non-critical): {e}")
        
        try:
            logger.debug(f"Session {session_id}: Clearing caches...")
            driver.execute_script("try { if (window.caches) { window.caches.keys().then(names => names.forEach(name => caches.delete(name))); } } catch(e) { /* Not available */ }")
            logger.debug(f"Session {session_id}: Caches cleared successfully")
        except Exception as e:
            logger.debug(f"Session {session_id}: Cache cleanup failed (non-critical): {e}")
        
        # Step 4: Close all windows and tabs
        try:
            logger.debug(f"Session {session_id}: Getting window handles...")
            handles = driver.window_handles.copy()
            logger.debug(f"Session {session_id}: Found {len(handles)} window handles")
            
            windows_closed = 0
            for i, handle in enumerate(handles):
                try:
                    driver.switch_to.window(handle)
                    driver.close()
                    windows_closed += 1
                    logger.debug(f"Session {session_id}: Closed window {i+1}/{len(handles)}")
                except Exception as e:
                    cleanup_errors.append(f"close_window_{i}: {str(e)[:50]}")
                    logger.warning(f"Session {session_id}: Failed to close window {i+1}: {e}")
                    cleanup_success = False
            
            logger.debug(f"Session {session_id}: Successfully closed {windows_closed}/{len(handles)} windows")
            
        except Exception as e:
            cleanup_errors.append(f"window_handles: {str(e)[:100]}")
            logger.warning(f"Session {session_id}: Failed to get/close window handles: {e}")
            cleanup_success = False
    
    # Step 5: Final quit - but with process termination fallback for timeouts
    try:
        logger.debug(f"Session {session_id}: Calling driver.quit()...")
        
        # Get the main process PID and kill child processes BEFORE quitting
        main_pid = None
        if hasattr(driver, 'service') and hasattr(driver.service, 'process'):
            main_pid = driver.service.process.pid
            
            # Kill child processes BEFORE calling quit to prevent detachment
            try:
                import psutil
                parent = psutil.Process(main_pid)
                children = parent.children(recursive=True)
                if children:
                    logger.debug(f"Session {session_id}: Found {len(children)} child processes to terminate")
                    for child in children:
                        child.terminate()
                    psutil.wait_procs(children, timeout=2)
                    for child in children:
                        if child.is_running():
                            child.kill()
                    logger.debug(f"Session {session_id}: Terminated {len(children)} child processes before quit")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        driver.quit()
        logger.debug(f"Session {session_id}: driver.quit() completed successfully")
        
        # Final check for any remaining processes after quit
        if main_pid:
            try:
                import psutil
                # Check if main process is still running and kill it
                try:
                    main_proc = psutil.Process(main_pid)
                    if main_proc.is_running():
                        main_proc.terminate()
                        main_proc.wait(timeout=2)
                        if main_proc.is_running():
                            main_proc.kill()
                        logger.debug(f"Session {session_id}: Terminated lingering main process")
                except psutil.NoSuchProcess:
                    pass  # Already gone, good
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Give system time to clean up processes
        import time
        time.sleep(0.5)  # Wait for cleanup
        logger.debug(f"Session {session_id}: Cleanup wait completed")
        
    except Exception as e:
        error_str = str(e)
        if "timeout" in error_str.lower() and "renderer" in error_str.lower():
            logger.debug(f"Session {session_id}: Quit timeout (expected during high load)")
            cleanup_errors.append(f"driver_quit: renderer_timeout")
            # Try to force kill the process if quit times out
            try:
                if hasattr(driver, 'service') and hasattr(driver.service, 'process'):
                    driver.service.process.terminate()
                    import time
                    time.sleep(0.5)
                    if driver.service.process.poll() is None:  # Still running
                        driver.service.process.kill()
                    logger.debug(f"Session {session_id}: Force killed Chrome process after timeout")
            except Exception:
                pass  # Best effort
        else:
            cleanup_errors.append(f"driver_quit: {str(e)[:100]}")
            logger.error(f"Session {session_id}: CRITICAL - driver.quit() failed: {e}")
        cleanup_success = False
    
    # Final cleanup summary
    if cleanup_success:
        logger.info(f"[SUCCESS] Driver cleanup completed successfully for session: {session_id}")
    else:
        logger.error(f"[FAILED] Driver cleanup FAILED for session: {session_id}")
        logger.error(f"Session {session_id}: Cleanup errors: {'; '.join(cleanup_errors)}")
        
        # Log this as a potential memory leak source
        logger.warning(f"[MEMORY LEAK RISK] Session {session_id} cleanup failed - may cause accumulation")
    
    return cleanup_success

def is_driver_alive(driver):
    """Check if the WebDriver is still alive and responsive"""
    if not driver:
        return False
    
    try:
        # Quick test to see if driver is responsive
        _ = driver.current_url
        return True
    except Exception:
        return False

def count_chrome_processes():
    """Count the number of Chrome processes currently running and analyze their memory usage"""
    try:
        import psutil
        import os
        
        chrome_count = 0
        total_chrome_memory = 0
        chrome_child_processes = 0
        current_pid = os.getpid()
        
        # Check all Chrome processes on the system
        for proc in psutil.process_iter(['pid', 'name', 'ppid', 'memory_info', 'cmdline']):
            try:
                if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                    chrome_count += 1
                    memory_mb = proc.info['memory_info'].rss / 1024 / 1024
                    total_chrome_memory += memory_mb
                    
                    # Check if this Chrome process is a child of the current Python process
                    if proc.info['ppid'] == current_pid:
                        chrome_child_processes += 1
                        logger.warning(f"Found Chrome child process: PID {proc.info['pid']}, Memory: {memory_mb:.1f}MB")
                        
                        # Log command line to see if it's headless
                        cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else 'N/A'
                        if '--headless' in cmdline:
                            logger.warning(f"  This is a HEADLESS Chrome process: {cmdline[:100]}...")
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Also check for any child processes of the current Python process
        try:
            parent = psutil.Process(current_pid)
            children = parent.children(recursive=True)
            
            for child in children:
                try:
                    if 'chrome' in child.name().lower():
                        chrome_child_processes += 1
                        try:
                            memory_mb = child.memory_info().rss / 1024 / 1024
                            # Only log if process has significant memory (not zombie)
                            if memory_mb > 1:
                                logger.warning(f"[CHILD CLEANUP] Killing Chrome child process PID: {child.pid}, Memory: {memory_mb:.1f}MB")
                            else:
                                logger.debug(f"[CHILD CLEANUP] Cleaning up zombie Chrome child PID: {child.pid}")
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                            logger.debug(f"[CHILD CLEANUP] Zombie Chrome child PID: {child.pid}")
                        
                        # Try to terminate gracefully first
                        try:
                            child.terminate()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass  # Already dead
                        
                        killed_count += 1
                        
                        # Quick wait then force kill if still running
                        try:
                            child.wait(timeout=1)  # Reduced timeout for faster cleanup
                        except psutil.TimeoutExpired:
                            try:
                                child.kill()
                                logger.debug(f"[CHILD CLEANUP] Force killed stubborn Chrome child PID: {child.pid}")
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                pass  # Already dead
                            
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                    
        except Exception as e:
            logger.debug(f"Error checking child processes: {e}")
        
        # Log summary if Chrome processes found
        if chrome_count > 0:
            logger.info(f"Chrome process analysis: {chrome_count} total processes, {total_chrome_memory:.1f}MB total memory")
            if chrome_child_processes > 0:
                logger.warning(f"⚠️  Found {chrome_child_processes} Chrome processes that are children of Python!")
                logger.warning("This suggests Chrome drivers are not being properly cleaned up")
        
        return chrome_count
        
    except Exception as e:
        logger.debug(f"Error counting Chrome processes: {e}")
        return 0

def enhanced_python_memory_cleanup():
    """Perform enhanced Python memory cleanup to free process memory"""
    try:
        import gc
        
        logger.debug("Starting enhanced Python memory cleanup")
        
        # Step 1: Multiple rounds of conservative garbage collection
        total_collected = 0
        for round_num in range(3):  # Conservative rounds
            collected = gc.collect()
            total_collected += collected
        
        # Step 2: Clear specific known caches safely
        try:
            # Clear BeautifulSoup parser cache if it exists
            import bs4
            if hasattr(bs4, 'BeautifulSoup') and hasattr(bs4.BeautifulSoup, '_parser_cache'):
                bs4.BeautifulSoup._parser_cache.clear()
        except (ImportError, AttributeError):
            pass
        
        try:
            # Clear Selenium WebDriver cache if it exists
            from selenium.webdriver.chrome import service
            if hasattr(service, 'Service') and hasattr(service.Service, '_instances'):
                service.Service._instances.clear()
        except (ImportError, AttributeError):
            pass
        
        # Step 3: Final garbage collection
        final_collected = gc.collect()
        total_collected += final_collected
        
        logger.debug(f"Enhanced cleanup completed: {total_collected} objects collected")
        
    except Exception as e:
        logger.debug(f"Error during enhanced memory cleanup: {e}")

def force_system_memory_release():
    """Force the system to release memory back to the OS"""
    try:
        # Step 1: Linux-specific memory trimming
        try:
            import ctypes
            import ctypes.util
            libc = ctypes.CDLL(ctypes.util.find_library("c"))
            if hasattr(libc, 'malloc_trim'):
                result = libc.malloc_trim(0)
                logger.debug(f"malloc_trim result: {result}")
        except Exception:
            pass  # Not available on all systems
        
        # Step 2: Python-specific memory optimization
        try:
            import gc
            
            # Conservative garbage collection without changing GC settings
            gc.collect()
            gc.collect(0)  # Young generation
            gc.collect(1)  # Middle generation
            gc.collect(2)  # Old generation
            
        except Exception:
            pass
        
        # Step 3: Process memory optimization
        try:
            import psutil
            import os
            
            # Get current process
            process = psutil.Process(os.getpid())
            
            # Force memory stats refresh
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            
            logger.debug(f"Process memory after cleanup: RSS={memory_info.rss/1024/1024:.1f}MB, Percent={memory_percent:.1f}%")
            
        except Exception:
            pass
        
        logger.debug("System memory release completed")
        
    except Exception as e:
        logger.debug(f"Error during system memory release: {e}")

def kill_orphaned_chrome_processes(max_age_seconds=600, aggressive=False):
    """Kill orphaned Chrome processes, with special focus on Chrome child processes
    
    Args:
        max_age_seconds: Maximum age in seconds before a process is considered orphaned (ignored if aggressive=True)
        aggressive: If True, kill ALL Chrome processes regardless of age or memory usage
    """
    try:
        import psutil
        import time
        import os
        
        killed_count = 0
        total_chrome_processes = 0
        chrome_child_processes = 0
        current_time = time.time()
        current_pid = os.getpid()
        
        # First, kill any Chrome processes that are direct children of this Python process
        try:
            parent = psutil.Process(current_pid)
            children = parent.children(recursive=True)
            
            for child in children:
                try:
                    if 'chrome' in child.name().lower():
                        chrome_child_processes += 1
                        try:
                            memory_mb = child.memory_info().rss / 1024 / 1024
                            # Only log if process has significant memory (not zombie)
                            if memory_mb > 1:
                                logger.warning(f"[CHILD CLEANUP] Killing Chrome child process PID: {child.pid}, Memory: {memory_mb:.1f}MB")
                            else:
                                logger.debug(f"[CHILD CLEANUP] Cleaning up zombie Chrome child PID: {child.pid}")
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                            logger.debug(f"[CHILD CLEANUP] Zombie Chrome child PID: {child.pid}")
                        
                        # Try to terminate gracefully first
                        try:
                            child.terminate()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass  # Already dead
                        
                        killed_count += 1
                        
                        # Quick wait then force kill if still running
                        try:
                            child.wait(timeout=1)  # Reduced timeout for faster cleanup
                        except psutil.TimeoutExpired:
                            try:
                                child.kill()
                                logger.debug(f"[CHILD CLEANUP] Force killed stubborn Chrome child PID: {child.pid}")
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                pass  # Already dead
                            
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                    
        except Exception as e:
            logger.debug(f"Error cleaning up child processes: {e}")
        
        # Then, kill other Chrome processes based on normal criteria
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'ppid']):
            try:
                if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                    total_chrome_processes += 1
                    process_age = current_time - proc.info['create_time']
                    
                    # Skip if this was already killed as a child process
                    if proc.info['ppid'] == current_pid:
                        continue  # Already handled above
                    
                    # Kill if aggressive mode, scraping finished, OR process is older than threshold
                    should_kill = (aggressive or 
                                 _scraping_finished or 
                                 process_age > max_age_seconds)
                    
                    if should_kill:
                        if aggressive:
                            logger.debug(f"[AGGRESSIVE CLEANUP] Killing Chrome process PID: {proc.info['pid']} (age: {process_age:.1f}s)")
                        else:
                            logger.debug(f"[PROCESS CLEANUP] Killing Chrome process PID: {proc.info['pid']} (age: {process_age:.1f}s)")
                        
                        proc.terminate()
                        killed_count += 1
                        
                        # Wait a bit then force kill if still running
                        try:
                            proc.wait(timeout=3)
                        except psutil.TimeoutExpired:
                            proc.kill()
                            logger.info(f"[PROCESS CLEANUP] Force killed stubborn Chrome process PID: {proc.info['pid']}")
                            
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        if killed_count > 0:
            mode_str = "AGGRESSIVE CLEANUP" if aggressive else "PROCESS CLEANUP"
            logger.info(f"[{mode_str}] Killed {killed_count} Chrome processes (found {total_chrome_processes} total)")
            if chrome_child_processes > 0:
                logger.info(f"[CHILD CLEANUP] Killed {chrome_child_processes} Chrome child processes")
            enhanced_python_memory_cleanup()  # Clean up after process cleanup
            time.sleep(3)  # Give processes time to die and memory to be freed
        else:
            mode_str = "AGGRESSIVE CLEANUP" if aggressive else "PROCESS CLEANUP"
            logger.info(f"[{mode_str}] No Chrome processes to kill (checked {total_chrome_processes} Chrome processes)")
            
    except Exception as e:
        logger.warning(f"Process cleanup failed: {e}")

def check_memory_before_scraping():
    """Check memory usage and cleanup if necessary before starting scrape"""
    memory_mb = get_memory_usage()
    
    # EMERGENCY CIRCUIT BREAKER - Prevent memory bombs (realistic for Railway Docker)
    if memory_mb > 1600:  # Realistic emergency threshold for Railway Docker
        logger.critical(f"🚨 EMERGENCY: Memory critically high ({memory_mb}MB) - ABORTING to prevent system failure")
        logger.critical(f"🚨 This would have caused a memory bomb like the 7GB incident")
        raise MemoryError(f"EMERGENCY ABORT: Memory usage dangerous ({memory_mb}MB) - preventing system failure")
    
    if memory_mb > 1000:  # Realistic threshold for Railway Docker with Chrome
        logger.warning(f"High memory usage detected ({memory_mb}MB) before scraping - performing enhanced cleanup")
        
        # Check if there are Chrome processes to clean up
        chrome_count = count_chrome_processes()
        logger.info(f"Found {chrome_count} Chrome processes before cleanup")
        
        # Kill ALL Chrome processes before starting new scrape
        if chrome_count > 0:
            logger.info("Pre-scrape cleanup - killing ALL Chrome processes...")
            kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
        
        # Perform enhanced Python memory cleanup
        logger.info("Performing enhanced Python memory cleanup...")
        enhanced_python_memory_cleanup()
        
        # Force system memory release
        force_system_memory_release()
        
        # Wait for cleanup to take effect
        time.sleep(5)
        
        # Check memory again after cleanup
        memory_after_cleanup = get_memory_usage()
        memory_freed = memory_mb - memory_after_cleanup
        
        logger.info(f"Enhanced memory cleanup completed: {memory_after_cleanup}MB (freed {memory_freed:.1f}MB)")
        
        # REALISTIC THRESHOLDS for Railway Docker deployment
        if memory_after_cleanup > 1500:  # Realistic critical threshold
            logger.critical(f"🚨 CRITICAL: Memory still critically high ({memory_after_cleanup}MB) after cleanup - ABORTING")
            raise MemoryError(f"CRITICAL ABORT: Memory usage dangerous ({memory_after_cleanup}MB) - preventing system failure")
        elif memory_after_cleanup > 1300:  # High but manageable
            # CIRCUIT BREAKER: Don't abort if no Chrome processes exist
            remaining_chrome = count_chrome_processes()
            if remaining_chrome == 0:
                logger.warning(f"Memory still high ({memory_after_cleanup}MB) but no Chrome processes - proceeding with caution")
                logger.warning("This prevents infinite loops when memory is held by Python process")
            else:
                logger.error(f"Memory usage still high ({memory_after_cleanup}MB) with {remaining_chrome} Chrome processes - this is dangerous")
                raise MemoryError(f"Memory usage too high ({memory_after_cleanup}MB) - aborting to prevent memory bomb")
        elif memory_after_cleanup > 1100:  # Elevated but acceptable
            logger.warning(f"Memory usage elevated ({memory_after_cleanup}MB) after cleanup - proceeding with enhanced monitoring")
    
    return memory_mb

def get_memory_usage():
    """Get current memory usage in MB, including child processes"""
    try:
        import psutil
        import os
        
        # Get main Python process memory
        process = psutil.Process(os.getpid())
        main_memory = process.memory_info().rss / 1024 / 1024
        
        # Get child process memory (this is what system monitoring includes)
        child_memory = 0
        try:
            children = process.children(recursive=True)
            for child in children:
                try:
                    child_memory += child.memory_info().rss / 1024 / 1024
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception:
            pass
        
        total_memory = main_memory + child_memory
        
        # Log breakdown if there are significant child processes
        if child_memory > 10:  # More than 10MB in child processes
            logger.debug(f"Memory breakdown: Python={main_memory:.1f}MB, Children={child_memory:.1f}MB, Total={total_memory:.1f}MB")
        
        return round(total_memory, 1)
        
    except Exception:
        return 0

def log_memory_usage(context=""):
    """Log current memory usage with context"""
    memory_mb = get_memory_usage()
    if memory_mb > 0:
        logger.info(f"Memory usage {context}: {memory_mb} MB")
        
        # DISABLED: No cleanup during active scraping
        # All cleanup now happens only between categories
            
    return memory_mb

def parse_table_selenium(driver, region_info):
    """Parse the records table using Selenium after JavaScript loads with enhanced timeout handling"""
    global should_stop_scraping
    
    # Minimal wait for faster processing in Docker container
    time.sleep(1)  # Reduced from 2 seconds
    
    # Check for interruption
    if should_stop_scraping:
        return []
    
    # Enhanced timeout handling with multiple strategies
    wait = WebDriverWait(driver, 15)  # Reasonable timeout for Docker
    
    # Look for all records tables on the page with multiple fallback strategies
    try:
        # Strategy 1: Look for the main records tables
        table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.records_subtable.flex_table")))
    except TimeoutException:
        try:
            # Strategy 2: Look for any table-like structure
            logger.debug(f"Primary table selector timeout for {region_info['name']}, trying fallback")
            table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.flex_table")))
        except TimeoutException:
            try:
                # Strategy 3: Look for any records container
                logger.debug(f"Secondary table selector timeout for {region_info['name']}, trying final fallback")
                table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "[class*='record']")))
            except TimeoutException:
                logger.warning(f"Timeout waiting for page content in {region_info['name']} - page may not have loaded properly")
                return []
            except Exception as e3:
                logger.warning(f"Error loading {region_info['name']}: {type(e3).__name__}")
                return []
        except Exception as e2:
            logger.warning(f"Error loading {region_info['name']}: {type(e2).__name__}")
            return []
    except Exception as e1:
        logger.warning(f"Error loading {region_info['name']}: {type(e1).__name__}")
        return []
    
    # Check for interruption
    if should_stop_scraping:
        return []
    
    # Get the page source and parse with BeautifulSoup
    try:
        html_content = driver.page_source
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # IMMEDIATELY clear the large HTML string from memory
        html_content = None
        
        # Check for interruption before parsing
        if should_stop_scraping:
            soup.decompose()
            return []
        
        # Now parse all the records tables
        records = parse_all_records_from_soup(soup, region_info)
        
        # AGGRESSIVE memory cleanup - clear large objects immediately and force release
        soup.decompose()  # BeautifulSoup method to free memory more aggressively
        soup = None
        
        # Clear the large HTML string from memory explicitly
        html_content = None
        
        # Force Selenium to clear its internal page cache
        try:
            # Navigate to a minimal page to force Selenium to release the large HTML
            driver.execute_script("document.open(); document.write(''); document.close();")
            # Force browser garbage collection
            driver.execute_script("if (window.gc) { window.gc(); }")
            # Clear performance timeline and resource timings
            driver.execute_script("if (window.performance) { window.performance.clearResourceTimings(); window.performance.clearMeasures(); window.performance.clearMarks(); }")
        except Exception:
            pass  # Non-critical
        
        logger.debug(f"Parsed {len(records)} records from {region_info['name']}")
        
        return records
        
    except Exception as e:
        logger.error(f"Error parsing page content for {region_info['name']}: {e}")
        return []

def parse_single_table(records_table, table_num, region_info):
    """Parse a single records table"""
    records = []
    
    # Find all direct children - header rows and detail row containers
    all_children = records_table.find_all(['div'], recursive=False)
    
    current_fish_name = ""
    
    for i, child in enumerate(all_children):
        child_classes = child.get('class', [])
        
        # Check if this is a header row (contains fish name AND is the first record)
        if 'row' in child_classes and 'header' in child_classes:
            
            # Extract fish name for subsequent rows
            fish_col = child.find('div', class_='col overflow nowrap fish')
            if fish_col:
                fish_text_div = fish_col.find('div', class_='text')
                if fish_text_div:
                    current_fish_name = fish_text_div.get_text(strip=True)
                else:
                    current_fish_name = fish_col.get_text(strip=True)
            
            # Process the header row as the first record
            try:
                record = parse_single_row(child, current_fish_name, "header", region_info)
                if record:  # Only append if we got a valid record
                    records.append(record)
            except Exception as e:
                logger.debug(f"Error parsing header row: {e}")
                continue
        
        # Check if this is a rows container (contains the 4 additional detail rows)
        elif 'rows' in child_classes:
            # Find all detail rows within this container
            detail_rows = child.find_all('div', class_='row')
            
            for j, row in enumerate(detail_rows):
                try:
                    record = parse_single_row(row, current_fish_name, f"additional {j+1}", region_info)
                    if record:  # Only append if we got a valid record
                        records.append(record)
                        
                except Exception as e:
                    logger.debug(f"Error parsing additional row {j+1}: {e}")
                    continue
        
        # Handle any standalone rows (fallback)
        elif 'row' in child_classes and 'header' not in child_classes:
            try:
                # Extract fish name if present
                fish_col = child.find('div', class_='col overflow nowrap fish')
                fish_text = ''
                if fish_col:
                    fish_text_div = fish_col.find('div', class_='text')
                    if fish_text_div:
                        fish_text = fish_text_div.get_text(strip=True)
                    else:
                        fish_text = fish_col.get_text(strip=True)
                
                record = parse_single_row(child, fish_text, "standalone", region_info)
                if record:  # Only append if we got a valid record
                    records.append(record)
                    
            except Exception as e:
                logger.debug(f"Error parsing standalone row: {e}")
                continue
    
    return records

def parse_single_row(row, fish_name, row_type, region_info):
    """Parse a single row and return a record dict"""
    try:
        # Find columns with more flexible matching for different languages
        weight_col = row.find('div', class_='col overflow nowrap weight')
        location_col = row.find('div', class_='col overflow nowrap location')
        bait_col = row.find('div', class_='col overflow nowrap bait')
        
        # Look for gamername column (with or without has_overflow)
        # Also try alternative class names that might exist in different language versions
        gamername_col = (
            row.find('div', class_='col overflow nowrap gamername') or
            row.find('div', class_='col overflow nowrap gamername has_overflow') or
            row.find('div', class_='col overflow nowrap player') or
            row.find('div', class_='col overflow nowrap username')
        )
        
        data_col = row.find('div', class_='col overflow nowrap data')
        

        
        # Extract text from each column with detailed debugging
        weight_text = weight_col.get_text(strip=True) if weight_col else ''
        location_text = location_col.get_text(strip=True) if location_col else ''
        
        # Extract bait from title attribute of bait_icon
        bait_text = ''
        if bait_col:
            bait_icon_div = bait_col.find('div', class_='bait_icon')
            if bait_icon_div:
                bait_text = bait_icon_div.get('title', '')
            else:
                bait_text = bait_col.get_text(strip=True)
        
        gamername_text = gamername_col.get_text(strip=True) if gamername_col else ''
        data_text = data_col.get_text(strip=True) if data_col else ''
        
        # Silently skip empty records (fish not caught this week in this region)
        if not weight_text or weight_text == '-' or not gamername_text or not fish_name:
            return None
            
        # Handle weight conversion with improved parsing for all formats
        try:
            # Clean and parse weight - handles: "9.747 kg", "341 g", "1 079.839 kg"
            weight_text = weight_text.strip()
            original_weight = weight_text
            
            # Determine if it's grams or kilograms
            is_grams = weight_text.lower().endswith('g') and not weight_text.lower().endswith('kg')
            is_kg = weight_text.lower().endswith('kg')
            
            # Remove units (case insensitive)
            weight_text = weight_text.lower().replace('kg', '').replace('g', '').strip()
            
            # Handle different number formats:
            # "9.747" -> 9.747
            # "341" -> 341  
            # "1 079.839" -> 1079.839
            
            # Remove spaces that are used as thousand separators
            weight_text = weight_text.replace(' ', '')
            
            # Replace comma with dot for decimal point (European format)
            weight_text = weight_text.replace(',', '.')
            
            # Convert to float
            weight_float = float(weight_text)
            
            # Convert to grams (our storage format)
            if is_grams:
                weight_grams = int(weight_float)
            elif is_kg:
                weight_grams = int(weight_float * 1000)  # Convert kg to g
            else:
                # If no unit specified, assume grams for small numbers, kg for large
                if weight_float < 50:  # Likely kg if less than 50
                    weight_grams = int(weight_float * 1000)
                else:  # Likely grams if 50 or more
                    weight_grams = int(weight_float)
            
            if weight_grams <= 0:
                logger.warning(f"Zero/negative weight {weight_grams}g found for {fish_name} by {gamername_text} in {region_info['name']}")
                return None
            

                
        except ValueError as e:
            logger.warning(f"Could not parse weight '{original_weight}' for {fish_name} by {gamername_text} in {region_info['name']}: {e}")
            return None
        
        record = {
            'fish': fish_name,
            'weight': weight_grams,
            'waterbody': location_text,
            'bait': bait_text,
            'player': gamername_text,
            'date': data_text,
            'region': region_info['name']
        }
        
        return record
        
    except Exception as e:
        logger.debug(f"Error parsing {row_type} row: {e}")
        return None

def parse_all_records_from_soup(soup, region_info):
    """Parse all records tables from the BeautifulSoup object"""
    all_records = []
    
    # Find all records tables on the page
    records_tables = soup.find_all('div', class_='records_subtable flex_table')
    
    if not records_tables:
        return []
    
    for i, table in enumerate(records_tables, 1):
        table_records = parse_single_table(table, i, region_info)
        all_records.extend(table_records)
    
    return all_records

def scrape_and_update_records():
    """Main scraping function with comprehensive logging and error handling"""
    global should_stop_scraping, _scraping_finished
    
    # Reset flags at the start of each scraping session
    should_stop_scraping = False
    _scraping_finished = False
    
    start_time = datetime.now()
    logger.info(f"=== STARTING SCHEDULED SCRAPE at {start_time} ===")
    
    # Check memory usage before starting and cleanup if necessary
    try:
        initial_memory = check_memory_before_scraping()
        logger.info(f"Pre-scrape memory check passed: {initial_memory}MB")
    except MemoryError as e:
        logger.error(f"Scraping aborted due to memory constraints: {e}")
        return {
            'success': False,
            'categories_scraped': 0,
            'regions_scraped': 0,
            'new_records': 0,
            'truly_new_records': 0,
            'category_updates': 0,
            'duration_seconds': 0,
            'errors_occurred': True,
            'interrupted': False,
            'category_failures': 0,
            'failed_cleanups': 0,
            'abort_reason': 'high_memory_usage'
        }
    
    # Log initial memory usage
    initial_memory = log_memory_usage("before scrape")
    
    db = SessionLocal()
    total_new_records = 0
    total_truly_new_records = 0  # Completely new records
    total_category_updates = 0   # Existing records with new categories
    driver = None
    all_unique_fish = set()
    regions_scraped = 0
    errors_occurred = False
    consecutive_region_failures = 0  # Track consecutive failures within a category
    category_failures = 0  # Track how many categories had failures
    failed_cleanups = 0  # Track failed driver cleanup attempts
    
    # Initialize bulk operations for performance with smaller batch sizes to prevent memory accumulation
    bulk_inserter = BulkRecordInserter(db, batch_size=25)  # Smaller batch size to prevent memory leaks
    record_checker = OptimizedRecordChecker(db)
    
    try:
        # Get initial database count
        initial_count = db.query(Record).count()
        driver = get_driver()
        
        # Loop through all categories
        for category_key, category_info in CATEGORIES.items():
            if should_stop_scraping:
                break
            # Removed verbose category start message
            
            # Reset consecutive failures for each new category
            consecutive_region_failures = 0
            category_had_success = False
            category_successful_regions = 0
            category_new_records = 0
            category_truly_new_records = 0
            category_updates = 0
            
            # Loop through all regions for this category
            for region in category_info['regions']:
                if should_stop_scraping:
                    break
                
                # Skip to next category if we've had 2 consecutive failures
                if consecutive_region_failures >= 2:
                    category_failures += 1
                    break
                region_start_time = datetime.now()
                # Removed verbose region start message
                try:
                    # Check if driver is still alive before using it
                    if not is_driver_alive(driver):
                        logger.info("Driver died - killing ALL Chrome processes and creating fresh driver")
                        
                        # Don't bother with complex cleanup - just kill everything and start fresh
                        if driver:
                            try:
                                driver.quit()
                            except Exception:
                                pass  # Don't care if quit fails
                            driver = None
                        
                        # Kill ALL Chrome processes - simple and effective
                        kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                        time.sleep(2)  # Wait for processes to die
                        
                        # Create fresh driver
                        driver = get_driver()
                    
                    # Load page with timeout protection
                    try:
                        driver.get(region['url'])
                        # Wait a moment for page to stabilize
                        time.sleep(1)
                    except Exception as page_error:
                        logger.warning(f"Page load failed for {region['name']}: {type(page_error).__name__}")
                        consecutive_region_failures += 1
                        continue
                    
                    records = parse_table_selenium(driver, region)
                    # Track unique fish names for this region
                    region_fish = set()
                    region_new_records = 0
                    region_truly_new_records = 0
                    region_category_updates = 0
                    for rec in records:
                        if should_stop_scraping:
                            break
                        try:
                            # Split bait into bait1 and bait2
                            bait_text = rec.get('bait', '')
                            bait1, bait2 = split_bait_string(bait_text)
                            
                            data = {
                                'player': rec.get('player', ''),
                                'fish': rec.get('fish', ''),
                                'weight': rec.get('weight'),  # Weight is already validated
                                'waterbody': rec.get('waterbody', ''),
                                'bait': bait_text,  # Keep original for backward compatibility
                                'bait1': bait1,
                                'bait2': bait2,
                                'date': rec.get('date', ''),  # Fishing date from leaderboard
                                'created_at': datetime.now(timezone.utc),  # When we scraped this record
                                'region': rec.get('region', region['name']),
                                'category': category_key
                            }
                            # Track unique fish
                            if data['fish']:
                                region_fish.add(data['fish'])
                                all_unique_fish.add(data['fish'])
                            # Only add records that have at least some meaningful data
                            if data['fish'] and data['player'] and data['weight']:
                                # Check if record exists or needs category update
                                exists, updated_id = record_exists_or_update(db, data)
                                if not exists:
                                    # Create new record with compact category format
                                    category_map = {
                                        'Normal': 'N',
                                        'Light': 'L', 
                                        'Ultralight': 'U',
                                        'BottomLight': 'B',
                                        'Bottom Light': 'B',
                                        'Telescopic': 'T'
                                    }
                                    # Set the category field with compact format
                                    data['category'] = category_map.get(data['category'], data['category'])
                                    bulk_inserter.add_record(data)
                                    region_new_records += 1
                                    region_truly_new_records += 1
                                    total_new_records += 1
                                    total_truly_new_records += 1
                                elif updated_id:
                                    # Record was updated with new category
                                    region_new_records += 1
                                    region_category_updates += 1
                                    total_new_records += 1
                                    total_category_updates += 1
                        except Exception as e:
                            logger.error(f"Error processing record in {category_info['name']} - {region['name']}: {e}")
                            errors_occurred = True
                            continue
                    if should_stop_scraping:
                        break
                    
                    # Success! Reset consecutive failures and mark category success
                    consecutive_region_failures = 0
                    category_had_success = True
                    category_successful_regions += 1
                    
                    # Update category totals
                    category_new_records += region_new_records
                    category_truly_new_records += region_truly_new_records
                    category_updates += region_category_updates
                    
                    # Success - just track the stats, no verbose logging
                    regions_scraped += 1
                    
                    # DISABLED: No memory monitoring during active scraping
                    # Memory cleanup only happens between categories now
                    # This prevents killing Chrome processes while they're actively scraping
                    pass
                    
                    # DISABLED: No mid-category Chrome resets during active scraping
                    if False and regions_scraped % 10 == 0:
                        logger.info(f"Chrome reset after {regions_scraped} regions")
                        
                        # Close current driver
                        if driver:
                            try:
                                driver.quit()
                            except Exception:
                                pass  # Don't care if quit fails
                            driver = None
                        
                        # Kill ALL Chrome processes - no exceptions, no age checks, no complex logic
                        kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                        
                        # Wait for processes to die
                        time.sleep(3)
                        
                        # Create fresh driver
                        driver = get_driver()
                        
                        # Flush database operations
                        bulk_inserter.flush()
                        db.commit()
                        
                        # Clear bulk inserter pending records
                        bulk_inserter.pending_records.clear()
                        
                        # Clear record checker cache
                        record_checker.clear_cache()
                        
                        # Force database session cleanup
                        db.expunge_all()  # Remove all objects from session
                        db.close()  # Close and reopen session to force cleanup
                        db = SessionLocal()  # Fresh session
                        
                        # Recreate bulk operations with fresh session
                        bulk_inserter = BulkRecordInserter(db, batch_size=25)
                        record_checker = OptimizedRecordChecker(db)
                        
                        # Conservative Python memory cleanup - avoid destroying built-ins
                        import gc
                        
                        # Standard garbage collection only - no aggressive module clearing
                        for cleanup_round in range(3):
                            gc.collect()
                            time.sleep(0.1)
                        
                        # Clear only safe, application-specific caches
                        try:
                            import importlib
                            importlib.invalidate_caches()
                        except Exception:
                            pass
                        
                        # Force memory trimming (Linux-specific but harmless on other systems)
                        try:
                            import ctypes
                            import ctypes.util
                            libc = ctypes.CDLL(ctypes.util.find_library("c"))
                            if hasattr(libc, 'malloc_trim'):
                                libc.malloc_trim(0)  # Force return unused memory to OS
                        except Exception:
                            pass  # Not available on all systems
                        
                        # Check memory after aggressive cleanup
                        memory_after_python_cleanup = get_memory_usage()
                        logger.info(f"🧹 Memory after aggressive Python cleanup: {memory_after_python_cleanup}MB")
                        
                        # If memory is still high, just do additional garbage collection
                        if memory_after_python_cleanup > 300:
                            logger.warning(f"Memory still high ({memory_after_python_cleanup}MB) - additional GC")
                            
                            # Safe additional cleanup - no module destruction
                            for _ in range(3):
                                gc.collect()
                                gc.collect(2)
                            
                            memory_after_additional = get_memory_usage()
                            logger.info(f"Memory after additional cleanup: {memory_after_additional}MB")
                        
                        logger.info(f"[CHROME RESET] Fresh Chrome instance created after killing all processes")
                        
                        # Force Python to trim memory back to OS (like during idle time)
                        try:
                            # This forces Python to release memory back to the OS
                            libc = ctypes.CDLL("libc.so.6")
                            libc.malloc_trim(0)
                        except:
                            pass  # Not available on all systems
                        
                        # Additional aggressive cleanup
                        gc.collect()
                        gc.collect()  # Second pass for any remaining circular refs
                        
                        # Clear any local variables that might be holding references
                        if 'records' in locals():
                            records = None
                        if 'region_fish' in locals():
                            region_fish.clear()
                        
                        # Check if our aggressive cleanup worked
                        current_memory = get_memory_usage()
                        if current_memory > 200:  # Still high after cleanup
                            logger.warning(f"⚠️ Memory still high after region cleanup: {current_memory}MB - may need additional investigation")
                            
                            # If memory is still high, force WebDriver recreation to clear Selenium's internal caches
                            if regions_scraped % 5 == 0:  # Every 5 regions if memory is high
                                logger.info(f"🔄 Force recreating WebDriver due to high memory ({current_memory}MB)")
                                try:
                                    cleanup_driver(driver)
                                    driver = get_driver()
                                    logger.info("✅ WebDriver recreated successfully")
                                except Exception as e:
                                    logger.error(f"Failed to recreate WebDriver: {e}")
                    
                    # DISABLED: No mid-category cleanup during active scraping
                    if False and regions_scraped % 10 == 0:
                        logger.info(f"🧹 Complete Chrome cleanup after {regions_scraped} regions (1 category complete)")
                        
                        # Flush database before cleanup
                        bulk_inserter.flush()
                        db.commit()
                        
                        # Clean up current driver
                        cleanup_success = cleanup_driver(driver)
                        if not cleanup_success:
                            failed_cleanups += 1
                            logger.warning("Driver cleanup failed during category cleanup")
                        
                        # Kill ALL Chrome processes - no guessing, no age/memory checks
                        logger.info("Killing ALL Chrome processes...")
                        kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                        
                        # AGGRESSIVE PYTHON MEMORY CLEANUP - Clear all large data structures
                        logger.info("🧹 Aggressive Python memory cleanup...")
                        
                        # Clear large data structures
                        all_unique_fish.clear()
                        
                        # Clear bulk inserter completely
                        bulk_inserter.pending_records.clear()
                        
                        # Clear record checker cache
                        record_checker.clear_cache()
                        
                        # Force database session cleanup
                        db.expunge_all()  # Remove all objects from session
                        db.flush()
                        
                        # Multiple rounds of garbage collection
                        import gc
                        gc.collect()
                        enhanced_python_memory_cleanup()
                        gc.collect(0)  # Young generation
                        gc.collect(1)  # Middle generation
                        gc.collect(2)  # Old generation
                        
                        # Start fresh with new Chrome instance
                        try:
                            driver = get_driver()
                            logger.info("✅ Fresh Chrome session started")
                        except Exception as restart_error:
                            logger.error(f"Failed to restart Chrome session: {restart_error}")
                            # Ensure database is still in good state
                            try:
                                db.rollback()
                            except Exception:
                                pass
                        
                        # Log memory after complete cleanup
                        current_memory = get_memory_usage()
                        logger.info(f"📊 Memory after complete cleanup: {current_memory}MB")
                    
                    time.sleep(2)
                except Exception as e:
                    logger.error(f"Error scraping {category_info['name']} - {region['name']}: {type(e).__name__}")
                    errors_occurred = True
                    consecutive_region_failures += 1
                    
                    # Handle failure strategy quietly
                    if consecutive_region_failures == 1:
                        # Try to refresh the WebDriver session after first failure
                        try:
                            cleanup_success = cleanup_driver(driver)
                            if not cleanup_success:
                                failed_cleanups += 1
                                logger.warning("Driver cleanup failed during error recovery")
                            driver = get_driver()
                        except Exception:
                            logger.error("Failed to refresh WebDriver session")
                    # Skip to next category after 2 consecutive failures (handled by loop logic)
                    
                    # Continue to next region (don't break the loop)
                    continue
            if should_stop_scraping:
                break
            
            # Track if this entire category failed
            if not category_had_success:
                category_failures += 1
            
            # Enhanced category summary with breakdown
            logger.info(f"📊 {category_info['name']}: {category_successful_regions}/{len(category_info['regions'])} regions")
            logger.info(f"   └─ +{category_new_records} records ({category_truly_new_records} new, {category_updates} category updates)")
            
            # ENHANCED CATEGORY-LEVEL CLEANUP - Kill ALL Chrome processes and children
            logger.info(f"🧹 CATEGORY COMPLETE: Thorough cleanup after {category_info['name']}")
            
            # Get memory before cleanup for comparison
            memory_before_cleanup = get_memory_usage()
            logger.info(f"Memory before category cleanup: {memory_before_cleanup}MB")
            
            # 1. Flush database operations first
            try:
                bulk_inserter.flush()  # Flush any pending records
                db.commit()
            except Exception as db_error:
                logger.error(f"Database flush error during category cleanup: {db_error}")
            
            # 2. Aggressive Chrome cleanup - kill EVERYTHING
            try:
                # Close current driver
                if driver:
                    try:
                        driver.quit()
                    except Exception:
                        pass  # Don't care if quit fails
                    driver = None
                
                # Kill ALL Chrome processes and children - no mercy, no age checks
                logger.info("🔥 Killing ALL Chrome processes and children...")
                kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                
                # Wait for processes to fully die
                time.sleep(3)
                
                # Verify all Chrome processes are dead
                chrome_count = count_chrome_processes()
                if chrome_count > 0:
                    logger.warning(f"⚠️  {chrome_count} Chrome processes still alive after cleanup - forcing kill")
                    # One more aggressive attempt
                    kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                    time.sleep(2)
                else:
                    logger.info("✅ All Chrome processes successfully killed")
                
            except Exception as chrome_error:
                logger.error(f"Chrome cleanup error: {chrome_error}")
            
            # 3. Database session refresh
            try:
                # Clear cache and flush bulk operations to free memory
                if 'record_checker' in locals() and record_checker:
                    record_checker.clear_cache()
                
                # Force immediate database write and clear pending operations
                db.flush()  # Write pending operations to database
                db.expunge_all()  # Remove all objects from session to free memory
                
                db.close()  # Close the current session
                db = SessionLocal()  # Fresh database session
                bulk_inserter = BulkRecordInserter(db, batch_size=25)  # Smaller batch size to prevent memory leaks
                record_checker = OptimizedRecordChecker(db)  # Refresh checker with new session
                
            except Exception as db_error:
                logger.error(f"Database session refresh error: {db_error}")
                # Ensure we have a valid database session
                try:
                    if db:
                        if 'record_checker' in locals():
                            record_checker.clear_cache()  # Clear cache before closing
                        db.close()  # Close the problematic session
                    db = SessionLocal()
                    bulk_inserter = BulkRecordInserter(db, batch_size=25)  # Smaller batch size to prevent memory leaks
                    record_checker = OptimizedRecordChecker(db)  # Refresh checker with new session
                except Exception as fallback_error:
                    logger.error(f"Failed to create fallback database session: {fallback_error}")
            
            # 4. AGGRESSIVE Python memory cleanup
            try:
                # Clear large data structures to prevent memory accumulation
                all_unique_fish.clear()  # Reset fish tracking for next category
                
                # Multiple rounds of aggressive cleanup
                enhanced_python_memory_cleanup()
                force_system_memory_release()
                
                # Additional aggressive cleanup
                import gc
                for _ in range(5):  # More aggressive cleanup rounds
                    gc.collect()
                    time.sleep(0.1)
                
                # Force memory trimming multiple times
                try:
                    import ctypes
                    import ctypes.util
                    libc = ctypes.CDLL(ctypes.util.find_library("c"))
                    if hasattr(libc, 'malloc_trim'):
                        for _ in range(3):  # Multiple trim attempts
                            libc.malloc_trim(0)
                            time.sleep(0.1)
                except Exception:
                    pass
                
            except Exception as py_error:
                logger.error(f"Python memory cleanup error: {py_error}")
            
            # 5. Check memory after cleanup (BEFORE creating new Chrome)
            memory_after_python_cleanup = get_memory_usage()
            python_memory_freed = memory_before_cleanup - memory_after_python_cleanup
            logger.info(f"📊 Memory after Python cleanup: {memory_after_python_cleanup}MB (freed {python_memory_freed:.1f}MB)")
            
            # Warn if Python cleanup wasn't effective enough
            if memory_after_python_cleanup > 500:  # Should be much lower after killing Chrome
                logger.warning(f"⚠️  Python cleanup not very effective - still at {memory_after_python_cleanup}MB")
                logger.warning("This suggests memory leaks in Python objects or database connections")
            
            # 6. Create fresh Chrome driver for next category (if not last category)
            remaining_categories = list(CATEGORIES.keys())[list(CATEGORIES.keys()).index(category_key) + 1:]
            if remaining_categories and not should_stop_scraping:
                try:
                    logger.info("🆕 Creating fresh Chrome driver for next category...")
                    driver = get_driver()
                    logger.info("✅ Fresh Chrome driver ready")
                except Exception as driver_error:
                    logger.error(f"Failed to create fresh driver: {driver_error}")
                    # We'll try to create it on-demand later
                    driver = None
            
            # 7. Final memory state (includes new Chrome if created)
            memory_after_cleanup = get_memory_usage()
            
            # 8. Final memory check - abort if still over 1.5GB
            if memory_after_cleanup > 1500:
                logger.critical(f"🚨 Memory still critically high ({memory_after_cleanup}MB) after category cleanup!")
                logger.critical("Aborting scraping to prevent memory bomb")
                should_stop_scraping = True
                break
        if should_stop_scraping:
            logger.info("🛑 Scraping interrupted by user")
        elif category_failures > 0:
            logger.info(f"✅ Scraping complete ({category_failures} categories had failures)")
        else:
            logger.info("✅ Scraping complete (all categories successful)")
        final_count = db.query(Record).count()
        sample_record = None
        if final_count > 0:
            random_record = db.query(Record).offset(random.randint(0, final_count - 1)).first()
            if random_record:
                sample_record = {
                    'fish': random_record.fish,
                    'weight': random_record.weight,
                    'player': random_record.player,
                    'waterbody': random_record.waterbody,
                    'bait1': random_record.bait1,
                    'bait2': random_record.bait2,
                    'date': random_record.date,
                    'region': random_record.region,
                    'category': random_record.category
                }
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        
        # Final summary with memory usage and record breakdown
        final_memory = get_memory_usage()
        memory_change = final_memory - initial_memory if 'initial_memory' in locals() else 0
        logger.info(f"📊 Final: {regions_scraped} regions, +{total_new_records} records, {total_duration:.1f}s")
        logger.info(f"   └─ {total_truly_new_records} truly new records, {total_category_updates} category updates")
        logger.info(f"🧠 Memory: {final_memory} MB (Δ{memory_change:+.1f} MB)")
        
        # Log cleanup failures summary
        if failed_cleanups > 0:
            logger.error(f"[CLEANUP FAILURES] {failed_cleanups} driver cleanup attempts failed - HIGH MEMORY LEAK RISK!")
        else:
            logger.info("[SUCCESS] All driver cleanup attempts successful")
    except Exception as e:
        logger.error(f"Critical error during scraping: {e}")
        errors_occurred = True
    finally:
        # Aggressive cleanup to prevent memory leaks
        try:
            # Flush any remaining bulk operations
            if 'bulk_inserter' in locals():
                bulk_inserter.close()
            
            # Close database session properly
            if db:
                db.rollback()  # Rollback any pending transactions
                db.close()
                db = None
        except Exception as e:
            logger.debug(f"Error closing database session: {e}")
        
        # SIMPLE FINAL CLEANUP - Just kill everything
        if driver:
            try:
                driver.quit()
            except Exception:
                pass  # Don't care if quit fails
            driver = None
        
        # CRITICAL: Mark scraping as finished IMMEDIATELY to prevent new Chrome processes
        _scraping_finished = True
        logger.info("🔒 Scraping session finished - killing ALL Chrome processes")
        
        # Kill ALL Chrome processes - simple and effective
        kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
        time.sleep(2)  # Wait for processes to die
        
        # Comprehensive Python memory cleanup
        logger.info("Final memory cleanup...")
        
        # Clear large variables
        if 'all_unique_fish' in locals():
            all_unique_fish.clear()
            all_unique_fish = None
        
        if 'bulk_inserter' in locals():
            if hasattr(bulk_inserter, 'pending_records'):
                bulk_inserter.pending_records.clear()
            if hasattr(bulk_inserter, 'close'):
                bulk_inserter.close()
            bulk_inserter = None
        
        if 'record_checker' in locals():
            if hasattr(record_checker, 'clear_cache'):
                record_checker.clear_cache()
            if hasattr(record_checker, '_cache'):
                record_checker._cache.clear()
            record_checker = None
        
        # Database cleanup
        if 'db' in locals() and db:
            try:
                db.expunge_all()
                db.close()
                db = None
            except Exception as e:
                logger.debug(f"Database cleanup error: {e}")
        
        # Garbage collection
        import gc
        memory_before_final = get_memory_usage()
        
        for i in range(3):  # Reduced rounds
            gc.collect()
            enhanced_python_memory_cleanup()
            gc.collect(0)
            gc.collect(2)
            if i < 2:
                time.sleep(0.3)
        
        # Skip aggressive cache clearing to preserve built-ins
        
        # Clear import caches
        try:
            import importlib
            importlib.invalidate_caches()
        except Exception:
            pass
        
        # Get memory after final cleanup
        memory_after_final = get_memory_usage()
        memory_freed_final = memory_before_final - memory_after_final
        logger.info(f"Memory after cleanup: {memory_after_final}MB (freed {memory_freed_final:.1f}MB)")
        
        # Reset global variables
        should_stop_scraping = False
        
        # Additional cleanup if memory still high
        if memory_after_final > 250:
            logger.warning(f"Memory still high ({memory_after_final}MB) - additional cleanup")
            for cleanup_round in range(2):
                kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)
                time.sleep(1)
                gc.collect()
                gc.collect(2)
            
            final_memory = get_memory_usage()
            if final_memory > 300:
                logger.critical(f"Memory remains very high ({final_memory}MB) after cleanup!")
    return {
        'success': not errors_occurred and not should_stop_scraping,
        'categories_scraped': len(CATEGORIES),
        'regions_scraped': regions_scraped,
        'new_records': total_new_records,
        'truly_new_records': total_truly_new_records,
        'category_updates': total_category_updates,
        'duration_seconds': total_duration if 'total_duration' in locals() else 0,
        'errors_occurred': errors_occurred,
        'interrupted': should_stop_scraping,
        'category_failures': category_failures,
        'failed_cleanups': failed_cleanups if 'failed_cleanups' in locals() else 0
    }

def scrape_limited_regions():
    print("Starting Selenium-based scrape for selected regions...")
    db = SessionLocal()
    total_new_records = 0
    total_truly_new_records = 0
    total_category_updates = 0
    driver = None
    all_unique_fish = set()
    regions_scraped = 0
    
    try:
        # Get initial database count
        initial_count = db.query(Record).count()
        
        driver = get_driver()
        
        # Loop through selected categories and regions
        for category_key, category_info in list(CATEGORIES.items())[:2]:  # Limit to first 2 categories
            print(f"\n{'='*60}")
            print(f"CATEGORY: {category_info['name']}")
            print(f"{'='*60}")
            
            # Loop through first 3 regions for this category
            for region in category_info['regions'][:3]:
                print(f"\n{'='*50}")
                print(f"SCRAPING {category_info['name'].upper()}: {region['name']} ({region['code']})")
                print(f"URL: {region['url']}")
                print(f"{'='*50}")
                
                try:
                    driver.get(region['url'])
                    records = parse_table_selenium(driver, region)
            
                    # Track unique fish names for this region
                    region_fish = set()
                    region_new_records = 0
                    region_truly_new_records = 0
                    region_category_updates = 0
            
                    for rec in records:
                        try:
                            # Split bait into bait1 and bait2
                            bait_text = rec.get('bait', '')
                            bait1, bait2 = split_bait_string(bait_text)
                            
                            data = {
                                'player': rec.get('player', ''),
                                'fish': rec.get('fish', ''),
                                'weight': rec.get('weight'),  # Weight is already validated
                                'waterbody': rec.get('waterbody', ''),
                                'bait': bait_text,  # Keep original for backward compatibility
                                'bait1': bait1,
                                'bait2': bait2,
                                'date': rec.get('date', ''),
                                'region': rec.get('region', region['name']),
                                'category': category_key
                            }
                            
                            # Track unique fish
                            if data['fish']:
                                region_fish.add(data['fish'])
                                all_unique_fish.add(data['fish'])
                            
                            # Only add records that have at least some meaningful data
                            if data['fish'] and data['player'] and data['weight']:  # Weight is already validated
                                # Check if record exists or needs category update
                                exists, updated_id = record_exists_or_update(db, data)
                                if not exists:
                                    # Create new record with compact category format
                                    category_map = {
                                        'Normal': 'N',
                                        'Light': 'L', 
                                        'Ultralight': 'U',
                                        'BottomLight': 'B',
                                        'Bottom Light': 'B',
                                        'Telescopic': 'T'
                                    }
                                    # Set the category field with compact format
                                    data['category'] = category_map.get(data['category'], data['category'])
                                    db.add(Record(**data))
                                    region_new_records += 1
                                    region_truly_new_records += 1
                                    total_new_records += 1
                                    total_truly_new_records += 1
                                elif updated_id:
                                    # Record was updated with new category
                                    region_new_records += 1
                                    region_category_updates += 1
                                    total_new_records += 1
                                    total_category_updates += 1
                        except Exception as e:
                            print(f"Error processing record in {category_info['name']} - {region['name']}: {e}")
                            continue
                    
                    print(f"\n{category_info['name']} - {region['name']} Summary:")
                    print(f"- Fish types found: {len(region_fish)}")
                    print(f"- Total records processed: {len(records)}")
                    print(f"- New records added: {region_new_records} ({region_truly_new_records} new, {region_category_updates} category updates)")
                    
                    regions_scraped += 1
                    
                    # Add a small delay between regions to be respectful
                    time.sleep(2)
                        
                except Exception as e:
                    print(f"Error scraping {category_info['name']} - {region['name']}: {e}")
                    continue
                    
            db.commit()
            
            # Get final database count
            final_count = db.query(Record).count()
            
            # Get a random sample record for verification
            sample_record = None
            if final_count > 0:
                random_record = db.query(Record).offset(random.randint(0, final_count - 1)).first()
                if random_record:
                    sample_record = {
                        'fish': random_record.fish,
                        'weight': random_record.weight,
                        'player': random_record.player,
                        'waterbody': random_record.waterbody,
                        'bait1': random_record.bait1,
                        'bait2': random_record.bait2,
                        'date': random_record.date,
                        'region': random_record.region,
                        'category': random_record.category
                    }
            
            # Final summary
            print(f"\n{'='*60}")
            print(f"MULTI-CATEGORY SCRAPING COMPLETE")
            print(f"{'='*60}")
            print(f"Categories scraped: {len(list(CATEGORIES.items())[:2])}")
            print(f"Total regions scraped: {regions_scraped}")
            print(f"Total unique fish types across all categories and regions: {len(all_unique_fish)}")
            print(f"Fish types: {', '.join(sorted(all_unique_fish))}")
            print(f"Total new records added: {total_new_records} ({total_truly_new_records} new, {total_category_updates} category updates)")
            print(f"Total records in database: {final_count} (was {initial_count})")
        
        if sample_record:
            print(f"\n=== RANDOM SAMPLE RECORD ===")
            print(f"Fish: {sample_record['fish']}")
            print(f"Weight: {sample_record['weight']} g")
            print(f"Player: {sample_record['player']}")
            print(f"Waterbody: {sample_record['waterbody']}")
            print(f"Bait1: {sample_record['bait1']}")
            print(f"Bait2: {sample_record['bait2']}")
            print(f"Date: {sample_record['date']}")
            print(f"Region: {sample_record['region']}")
            print(f"Category: {sample_record['category']}")
        
    except Exception as e:
        print(f"Error during scraping: {e}")
    finally:
        if driver:
            cleanup_success = cleanup_driver(driver)
            if not cleanup_success:
                print("WARNING: Driver cleanup failed in scrape_limited_regions - potential memory leak risk!")
        db.close()
    
    print(f"Multi-category scraping complete. Added {total_new_records} records ({total_truly_new_records} new, {total_category_updates} category updates) from {regions_scraped} regions across multiple categories.")

def get_detailed_memory_usage():
    """Get detailed memory usage breakdown including Chrome processes"""
    try:
        import psutil
        import os
        import gc
        import time
        
        # Main Python process memory
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        
        # Find all Chrome processes and their memory usage
        chrome_memory_total = 0
        chrome_process_count = 0
        chrome_processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'create_time']):
            try:
                if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                    chrome_process_count += 1
                    chrome_mem_mb = proc.info['memory_info'].rss / 1024 / 1024
                    chrome_memory_total += chrome_mem_mb
                    
                    # Track individual Chrome processes for debugging
                    chrome_processes.append({
                        'pid': proc.info['pid'],
                        'memory_mb': round(chrome_mem_mb, 1),
                        'age_seconds': round(time.time() - proc.info['create_time'], 1)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Sort Chrome processes by memory usage (largest first)
        chrome_processes.sort(key=lambda x: x['memory_mb'], reverse=True)
        
        # Get garbage collection stats
        gc_stats = gc.get_stats()
        gc_counts = gc.get_count()
        
        # Get Python object counts by type
        object_counts = {}
        try:
            for obj in gc.get_objects():
                obj_type = type(obj).__name__
                object_counts[obj_type] = object_counts.get(obj_type, 0) + 1
        except Exception:
            object_counts = {"error": "Could not get object counts"}
        
        # System memory info
        system_memory = psutil.virtual_memory()
        
        return {
            "python_process": {
                "rss_mb": round(memory_info.rss / 1024 / 1024, 2),
                "vms_mb": round(memory_info.vms / 1024 / 1024, 2),
                "percent": round(process.memory_percent(), 2)
            },
            "chrome_processes": {
                "total_memory_mb": round(chrome_memory_total, 1),
                "process_count": chrome_process_count,
                "largest_processes": chrome_processes[:5]  # Show top 5 Chrome processes by memory
            },
            "system": {
                "total_mb": round(system_memory.total / 1024 / 1024, 1),
                "available_mb": round(system_memory.available / 1024 / 1024, 1),
                "used_percent": system_memory.percent
            },
            "python_objects": {
                "gc_counts": gc_counts,
                "gc_stats": gc_stats,
                "top_objects": dict(sorted(object_counts.items(), key=lambda x: x[1], reverse=True)[:10])
            }
        }
    except Exception as e:
        return {"error": str(e)}

def log_detailed_memory_usage(context=""):
    """Log detailed memory usage information with Chrome process breakdown"""
    memory_info = get_detailed_memory_usage()
    
    if "error" not in memory_info:
        python_mem = memory_info['python_process']['rss_mb']
        chrome_mem = memory_info['chrome_processes']['total_memory_mb']
        chrome_count = memory_info['chrome_processes']['process_count']
        total_memory = python_mem + chrome_mem
        
        logger.info(f"🔍 Detailed memory breakdown {context}:")
        logger.info(f"  📊 TOTAL: {total_memory:.1f} MB (Python: {python_mem} MB + Chrome: {chrome_mem} MB)")
        logger.info(f"  🐍 Python Process: RSS: {python_mem} MB, VMS: {memory_info['python_process']['vms_mb']} MB ({memory_info['python_process']['percent']}%)")
        logger.info(f"  🌐 Chrome Processes: {chrome_count} processes using {chrome_mem} MB total")
        
        # Show largest Chrome processes if any exist
        if chrome_count > 0:
            largest_chrome = memory_info['chrome_processes']['largest_processes'][:3]  # Top 3
            chrome_details = []
            for proc in largest_chrome:
                chrome_details.append(f"PID {proc['pid']}: {proc['memory_mb']}MB (age: {proc['age_seconds']}s)")
            logger.info(f"  🔍 Largest Chrome processes: {' | '.join(chrome_details)}")
        
        logger.info(f"  🗑️ Python GC: {memory_info['python_objects']['gc_counts']}")
        logger.info(f"  📦 Top objects: {memory_info['python_objects']['top_objects']}")
        
        # Memory distribution analysis
        if total_memory > 0:
            python_percent = (python_mem / total_memory) * 100
            chrome_percent = (chrome_mem / total_memory) * 100
            logger.info(f"  📈 Memory distribution: Python {python_percent:.1f}% | Chrome {chrome_percent:.1f}%")
    else:
        logger.warning(f"Could not get detailed memory info: {memory_info['error']}")

if __name__ == '__main__':
    # Run full scraping (all 10 regions - could take 30+ minutes)
    scrape_and_update_records() 