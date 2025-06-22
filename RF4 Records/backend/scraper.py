from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from database import SessionLocal, Record
from sqlalchemy.orm import Session
from sqlalchemy import and_
import time
import random
import logging
from datetime import datetime
import os
import signal
import sys

# Global flag to track if scraping should be stopped
should_stop_scraping = False

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

# Helper to check if a record exists (now includes region and category)
def record_exists(db: Session, data: dict):
    return db.query(Record).filter(
        and_(
            Record.player == data['player'],
            Record.fish == data['fish'],
            Record.weight == data['weight'],
            Record.waterbody == data['waterbody'],
            Record.bait1 == data['bait1'],
            Record.bait2 == data['bait2'],
            Record.date == data['date'],
            Record.region == data['region'],
            Record.category == data['category']
        )
    ).first() is not None

def split_bait_string(bait_string):
    """Split a bait string into primary and secondary baits"""
    if not bait_string:
        return None, None
    
    # Check if it's a sandwich bait (contains plus sign)
    if '+' in bait_string:
        parts = bait_string.split('+', 1)  # Split on first plus sign only
        bait1 = parts[0].strip()
        bait2 = parts[1].strip() if len(parts) > 1 else None
        return bait1, bait2
    else:
        # Single bait
        return bait_string.strip(), None

def get_driver():
    """Create and configure Chrome WebDriver for Docker container, Browserless, or local development"""
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
    
    # Aggressive memory optimization
    chrome_options.add_argument('--memory-pressure-off')
    chrome_options.add_argument('--max_old_space_size=2048')  # Reduced from 4096
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-background-networking')
    chrome_options.add_argument('--aggressive-cache-discard')
    
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
    
    # Check deployment environment
    browser_endpoint = os.getenv('BROWSER_WEBDRIVER_ENDPOINT_PRIVATE') or os.getenv('BROWSER_WEBDRIVER_ENDPOINT')
    browser_token = os.getenv('BROWSER_TOKEN')
    chrome_bin = os.getenv('CHROME_BIN')  # Docker container Chrome path
    chromedriver_path = os.getenv('CHROMEDRIVER_PATH')  # Docker container ChromeDriver path
    
    if browser_endpoint:
        # Using Browserless service
        logger.info("Using Browserless service for WebDriver")
        
        # Safe timeout settings for Browserless
        chrome_options.add_argument('--page-load-strategy=eager')  # Don't wait for all resources
        
        # Add Browserless v1 authentication and configuration
        if browser_token:
            chrome_options.set_capability('browserless:token', browser_token)
            chrome_options.set_capability('browserless:timeout', 300000)  # 5 minutes max session
            chrome_options.set_capability('browserless:blockAds', True)  # Block ads to save memory
        
        # Create remote WebDriver with enhanced timeouts
        driver = webdriver.Remote(
            command_executor=browser_endpoint,
            options=chrome_options
        )
        
        # Set aggressive timeouts for better reliability
        driver.set_page_load_timeout(25)  # 25 seconds max page load
        driver.implicitly_wait(10)  # 10 seconds implicit wait
        
    elif chrome_bin and chromedriver_path:
        # Running in Docker container with pre-installed Chrome
        logger.info("Using Docker container Chrome installation")
        
        # Set Chrome binary location
        chrome_options.binary_location = chrome_bin
        
        # Create service with specific ChromeDriver path
        service = Service(executable_path=chromedriver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Set reasonable timeouts for container environment  
        driver.set_page_load_timeout(45)  # Same as local for database stability
        driver.implicitly_wait(15)  # Same as local for database stability
        
    else:
        # Local development
        logger.info("Using local ChromeDriver")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Set timeouts - more generous for Docker container stability
        driver.set_page_load_timeout(45)  # Increased from 30 to handle renderer delays
        driver.implicitly_wait(15)  # Increased from 10 to handle slow responses
    
    return driver

def cleanup_driver(driver):
    """Aggressively cleanup WebDriver session to prevent memory leaks with comprehensive logging"""
    if not driver:
        logger.debug("cleanup_driver: No driver to cleanup")
        return
    
    # Get session ID for tracking if possible
    session_id = "unknown"
    try:
        session_id = driver.session_id if hasattr(driver, 'session_id') else "unknown"
    except Exception:
        pass
    
    logger.info(f"[CLEANUP] Starting driver cleanup for session: {session_id}")
    cleanup_success = True
    cleanup_errors = []
    
    # Step 1: Clear browser data with timeout handling
    try:
        logger.debug(f"Session {session_id}: Clearing cookies...")
        # Don't change timeouts during cleanup - they persist and affect next scrape session!
        # Just use existing timeouts for cleanup operations
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
    
    # Step 2: Advanced storage cleanup (non-critical)
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
    
    # Step 3: Close all windows and tabs
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
                cleanup_errors.append(f"close_window_{i}: {str(e)[:100]}")
                logger.warning(f"Session {session_id}: Failed to close window {i+1}: {e}")
                cleanup_success = False
        
        logger.debug(f"Session {session_id}: Successfully closed {windows_closed}/{len(handles)} windows")
        
    except Exception as e:
        cleanup_errors.append(f"window_handles: {str(e)[:100]}")
        logger.warning(f"Session {session_id}: Failed to get/close window handles: {e}")
        cleanup_success = False
    
    # Step 4: Final quit with timeout handling
    try:
        logger.debug(f"Session {session_id}: Calling driver.quit()...")
        
        # For renderer timeout situations, try a force quit approach
        if any("renderer_timeout" in error for error in cleanup_errors):
            logger.debug(f"Session {session_id}: Renderer timeout detected, using force quit strategy")
            # Try to kill the session more aggressively
            try:
                driver.service.process.terminate()  # Terminate Chrome process
                import time
                time.sleep(1)
                driver.service.process.kill()  # Force kill if still running
            except Exception:
                pass  # Best effort
        
        driver.quit()
        logger.debug(f"Session {session_id}: driver.quit() completed successfully")
        
        # Give system time to clean up processes
        import time
        time.sleep(0.5)  # Wait for cleanup
        logger.debug(f"Session {session_id}: Cleanup wait completed")
        
    except Exception as e:
        error_str = str(e)
        if "timeout" in error_str.lower() and "renderer" in error_str.lower():
            logger.debug(f"Session {session_id}: Quit timeout (expected during high load)")
            cleanup_errors.append(f"driver_quit: renderer_timeout")
            # Even if quit times out, the process termination above should help
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
    """Check if WebDriver session is still alive"""
    if not driver:
        return False
    
    try:
        # Simple check to see if session is alive
        driver.current_url
        return True
    except Exception:
        return False

def force_garbage_collection():
    """Aggressively force garbage collection to help with memory management"""
    try:
        import gc
        
        # Multiple collection passes for cleanup
        collected = 0
        for i in range(2):  # 2 passes to catch circular references
            collected += gc.collect()
        
        # Force collection of specific generations
        gc.collect(0)  # Young objects
        gc.collect(2)  # Old objects
        
        logger.debug(f"Garbage collection: {collected} objects collected")
        
    except Exception as e:
        logger.debug(f"Error during garbage collection: {e}")

def get_memory_usage():
    """Get current memory usage in MB"""
    try:
        import psutil
        import os
        process = psutil.Process(os.getpid())
        memory_mb = process.memory_info().rss / 1024 / 1024
        return round(memory_mb, 1)
    except Exception:
        return 0

def log_memory_usage(context=""):
    """Log current memory usage with context"""
    memory_mb = get_memory_usage()
    if memory_mb > 0:
        logger.info(f"Memory usage {context}: {memory_mb} MB")
        
        # Force aggressive cleanup if memory usage is too high
        if memory_mb > 350:  # Threshold for aggressive cleanup
            logger.warning(f"High memory usage detected ({memory_mb} MB), forcing aggressive cleanup")
            force_garbage_collection()
            force_garbage_collection()  # Double cleanup
            
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
    wait = WebDriverWait(driver, 20)  # Increased timeout for reliability
    
    # Look for all records tables on the page with multiple fallback strategies
    try:
        # Strategy 1: Look for the main records tables
        table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.records_subtable.flex_table")))
    except Exception as e1:
        try:
            # Strategy 2: Look for any table-like structure
            logger.debug(f"Primary table selector failed for {region_info['name']}, trying fallback")
            table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.flex_table")))
        except Exception as e2:
            try:
                # Strategy 3: Look for any records container
                logger.debug(f"Secondary table selector failed for {region_info['name']}, trying final fallback")
                table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "[class*='record']")))
            except Exception as e3:
                logger.warning(f"All table selectors failed for {region_info['name']}: {str(e1)[:100]}")
                return []
    
    # Check for interruption
    if should_stop_scraping:
        return []
    
    # Get the page source and parse with BeautifulSoup
    try:
        html_content = driver.page_source
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Check for interruption before parsing
        if should_stop_scraping:
            return []
        
        # Now parse all the records tables
        records = parse_all_records_from_soup(soup, region_info)
        
        # Clear the HTML content from memory immediately
        html_content = None
        soup = None
        
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
    global should_stop_scraping
    
    # Reset the stop flag at the start of each scraping session
    should_stop_scraping = False
    
    start_time = datetime.now()
    logger.info(f"=== STARTING SCHEDULED SCRAPE at {start_time} ===")
    
    # Log initial memory usage
    initial_memory = log_memory_usage("before scrape")
    
    db = SessionLocal()
    total_new_records = 0
    driver = None
    all_unique_fish = set()
    regions_scraped = 0
    errors_occurred = False
    consecutive_region_failures = 0  # Track consecutive failures within a category
    category_failures = 0  # Track how many categories had failures
    failed_cleanups = 0  # Track failed driver cleanup attempts
    
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
                        cleanup_success = cleanup_driver(driver)
                        if not cleanup_success:
                            failed_cleanups += 1
                            logger.warning("Driver cleanup failed - potential memory leak risk")
                        driver = get_driver()
                    
                    driver.get(region['url'])
                    records = parse_table_selenium(driver, region)
                    # Track unique fish names for this region
                    region_fish = set()
                    region_new_records = 0
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
                                'date': rec.get('date', ''),
                                'region': rec.get('region', region['name']),
                                'category': category_key
                            }
                            # Track unique fish
                            if data['fish']:
                                region_fish.add(data['fish'])
                                all_unique_fish.add(data['fish'])
                            # Only add records that have at least some meaningful data
                            if data['fish'] and data['player'] and data['weight']:
                                if not record_exists(db, data):
                                    db.add(Record(**data))
                                    region_new_records += 1
                                    total_new_records += 1
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
                    
                    # Success - just track the stats, no verbose logging
                    regions_scraped += 1
                    
                    # More aggressive Chrome session management for Docker container
                    if regions_scraped % 10 == 0:  # Every 10 regions, restart Chrome completely
                        logger.info(f"Restarting Chrome after {regions_scraped} regions for memory management")
                        try:
                            # Commit database session before Chrome restart to prevent large transactions
                            db.commit()
                            
                            cleanup_success = cleanup_driver(driver)
                            if not cleanup_success:
                                failed_cleanups += 1
                                logger.warning("Driver cleanup failed during proactive restart - potential memory leak risk")
                            force_garbage_collection()
                            driver = get_driver()
                            logger.info("Chrome session restarted successfully")
                        except Exception as restart_error:
                            logger.error(f"Failed to restart Chrome session: {restart_error}")
                            # Ensure database is still in good state
                            try:
                                db.rollback()
                            except Exception:
                                pass
                    elif regions_scraped % 5 == 0:  # Every 5 regions, just garbage collect
                        force_garbage_collection()
                        # Additional Docker-specific cleanup
                        chrome_bin = os.getenv('CHROME_BIN')
                        if chrome_bin:  # In Docker container
                            import gc
                            gc.collect(2)  # Force old generation cleanup
                    
                    time.sleep(2)
                except Exception as e:
                    logger.error(f"Error scraping {category_info['name']} - {region['name']}: {e}")
                    errors_occurred = True
                    consecutive_region_failures += 1
                    
                    # Handle failure strategy quietly
                    if consecutive_region_failures == 1:
                        # Try to refresh the WebDriver session after first failure
                        try:
                            cleanup_success = cleanup_driver(driver)
                            if not cleanup_success:
                                failed_cleanups += 1
                                logger.warning("Driver cleanup failed during error recovery - potential memory leak risk")
                            driver = get_driver()
                        except Exception as refresh_error:
                            logger.error(f"Failed to refresh WebDriver session: {refresh_error}")
                    # Skip to next category after 2 consecutive failures (handled by loop logic)
                    
                    # Continue to next region (don't break the loop)
                    continue
            if should_stop_scraping:
                break
            
            # Track if this entire category failed
            if not category_had_success:
                category_failures += 1
            
            # Simple one-line category summary
            logger.info(f"{category_info['name']}: {category_successful_regions}/{len(category_info['regions'])} regions, {total_new_records} total records")
            
            # Commit and refresh database session between categories
            try:
                db.commit()
                db.close()
                db = SessionLocal()  # Fresh database session
            except Exception as db_error:
                logger.error(f"Database session refresh error: {db_error}")
                # Ensure we have a valid database session
                try:
                    db = SessionLocal()
                except Exception as fallback_error:
                    logger.error(f"Failed to create fallback database session: {fallback_error}")
            
            # Refresh WebDriver session between categories to prevent staleness and memory leaks
            try:
                cleanup_success = cleanup_driver(driver)
                if not cleanup_success:
                    failed_cleanups += 1
                    logger.warning(f"Driver cleanup failed between categories ({category_info['name']}) - potential memory leak risk")
                force_garbage_collection()  # Force garbage collection between categories
                driver = get_driver()
                
                # Log memory usage after category cleanup
                log_memory_usage(f"after {category_info['name']} category")
                
            except Exception as refresh_error:
                logger.error(f"Failed to refresh WebDriver session between categories: {refresh_error}")
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
        
        # Final summary with memory usage
        final_memory = get_memory_usage()
        memory_change = final_memory - initial_memory if 'initial_memory' in locals() else 0
        logger.info(f"📊 Final: {regions_scraped} regions, +{total_new_records} new records, {total_duration:.1f}s")
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
            # Close database session properly
            if db:
                db.rollback()  # Rollback any pending transactions
                db.close()
                db = None
        except Exception as e:
            logger.debug(f"Error closing database session: {e}")
        
        # Clean up WebDriver
        cleanup_success = cleanup_driver(driver)
        if not cleanup_success:
            failed_cleanups += 1
            logger.error("FINAL driver cleanup failed - this is a critical memory leak risk!")
        driver = None
        
        # Clear large variables
        all_unique_fish = None
        
        # Force multiple garbage collection cycles
        force_garbage_collection()
        force_garbage_collection()  # Second pass for circular references
        
        should_stop_scraping = False
    return {
        'success': not errors_occurred and not should_stop_scraping,
        'categories_scraped': len(CATEGORIES),
        'regions_scraped': regions_scraped,
        'new_records': total_new_records,
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
                                if not record_exists(db, data):
                                    db.add(Record(**data))
                                    region_new_records += 1
                                    total_new_records += 1
                        except Exception as e:
                            print(f"Error processing record in {category_info['name']} - {region['name']}: {e}")
                            continue
                    
                    print(f"\n{category_info['name']} - {region['name']} Summary:")
                    print(f"- Fish types found: {len(region_fish)}")
                    print(f"- Total records processed: {len(records)}")
                    print(f"- New records added: {region_new_records}")
                    
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
            print(f"Total new records added: {total_new_records}")
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
    
    print(f"Multi-category scraping complete. Added {total_new_records} new records from {regions_scraped} regions across multiple categories.")

if __name__ == '__main__':
    # Run full scraping (all 10 regions - could take 30+ minutes)
    scrape_and_update_records() 