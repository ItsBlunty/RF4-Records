"""
Streamlined cleanup module for RF4 Records scraper
This module consolidates all cleanup operations to reduce redundancy
"""

import gc
import time
import logging
import psutil
import os
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Cleanup levels
CLEANUP_LIGHT = "light"
CLEANUP_NORMAL = "normal"
CLEANUP_AGGRESSIVE = "aggressive"

def smart_gc_collect() -> int:
    """
    Perform intelligent garbage collection
    Returns: Number of objects collected
    """
    try:
        # Start with generation 2 (oldest objects)
        gc.collect(2)
        
        # Full collection
        collected = gc.collect()
        
        # Only do additional collection if significant objects were collected
        if collected > 1000:
            time.sleep(0.1)  # Brief pause
            collected += gc.collect()
            
        return collected
    except Exception as e:
        logger.debug(f"Error in smart_gc_collect: {e}")
        return 0

def clear_python_caches(aggressive: bool = False) -> None:
    """Clear Python-level caches"""
    try:
        # BeautifulSoup parser cache
        try:
            import bs4
            if hasattr(bs4, 'BeautifulSoup') and hasattr(bs4.BeautifulSoup, '_parser_cache'):
                bs4.BeautifulSoup._parser_cache.clear()
        except (ImportError, AttributeError):
            pass
        
        # Selenium WebDriver cache
        try:
            from selenium.webdriver.chrome import service
            if hasattr(service, 'Service') and hasattr(service.Service, '_instances'):
                service.Service._instances.clear()
        except (ImportError, AttributeError):
            pass
        
        if aggressive:
            # Import cache invalidation
            try:
                import importlib
                importlib.invalidate_caches()
            except Exception:
                pass
                
    except Exception as e:
        logger.debug(f"Error clearing caches: {e}")

def safe_driver_quit(driver) -> bool:
    """
    Simple, effective driver cleanup
    Returns: True if cleanup succeeded
    """
    if not driver:
        return True
        
    try:
        # Get Chrome PID before quit
        chrome_pid = None
        if hasattr(driver, 'service') and hasattr(driver.service, 'process'):
            chrome_pid = driver.service.process.pid
        
        # Simple quit attempt with timeout
        driver.quit()
        
        # If we got here, quit succeeded
        logger.debug(f"Driver quit succeeded")
        return True
        
    except Exception as e:
        logger.debug(f"Driver quit failed: {e}")
        
        # Quit failed, force kill the process if we have PID
        if chrome_pid:
            try:
                process = psutil.Process(chrome_pid)
                process.terminate()
                process.wait(timeout=2)
                if process.is_running():
                    process.kill()
                logger.debug(f"Force killed Chrome process {chrome_pid}")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass  # Already dead
                
        return False

def kill_chrome_processes(aggressive: bool = False, max_age_seconds: int = 300) -> int:
    """
    Kill Chrome processes based on criteria
    Returns: Number of processes killed
    """
    try:
        killed_count = 0
        current_time = time.time()
        current_pid = os.getpid()
        
        # First, always kill child Chrome processes of this Python process
        try:
            parent = psutil.Process(current_pid)
            children = parent.children(recursive=True)
            
            for child in children:
                try:
                    if 'chrome' in child.name().lower():
                        child.terminate()
                        killed_count += 1
                        try:
                            child.wait(timeout=1)
                        except psutil.TimeoutExpired:
                            child.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            logger.debug(f"Error killing child processes: {e}")
        
        # Then handle other Chrome processes
        if aggressive or max_age_seconds == 0:
            # Kill ALL Chrome processes
            for proc in psutil.process_iter(['name']):
                try:
                    if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                        proc.terminate()
                        killed_count += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        else:
            # Kill old Chrome processes
            for proc in psutil.process_iter(['name', 'create_time']):
                try:
                    if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                        process_age = current_time - proc.info['create_time']
                        if process_age > max_age_seconds:
                            proc.terminate()
                            killed_count += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        
        if killed_count > 0:
            time.sleep(0.5)  # Brief wait for processes to die
            logger.info(f"Killed {killed_count} Chrome processes")
            
        return killed_count
        
    except Exception as e:
        logger.error(f"Error in kill_chrome_processes: {e}")
        return 0

def get_memory_usage() -> float:
    """Get current process memory usage in MB"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    except Exception:
        return 0.0

def unified_cleanup(level: str = CLEANUP_NORMAL, 
                   driver=None,
                   kill_chrome: bool = True) -> Tuple[bool, float]:
    """
    Unified cleanup function that orchestrates all cleanup operations
    
    Args:
        level: Cleanup intensity - "light", "normal", or "aggressive"
        driver: Selenium WebDriver instance to clean up (optional)
        kill_chrome: Whether to kill Chrome processes (default: True)
        
    Returns:
        Tuple of (success: bool, memory_freed_mb: float)
    """
    memory_before = get_memory_usage()
    success = True
    
    try:
        logger.info(f"Starting {level} cleanup (memory: {memory_before:.1f}MB)")
        
        if level == CLEANUP_LIGHT:
            # Just Python memory cleanup
            clear_python_caches(aggressive=False)
            collected = smart_gc_collect()
            logger.debug(f"Light cleanup collected {collected} objects")
            
        elif level == CLEANUP_NORMAL:
            # Driver cleanup if provided
            if driver:
                success = safe_driver_quit(driver)
                
            # Kill old Chrome processes
            if kill_chrome:
                kill_chrome_processes(aggressive=False, max_age_seconds=300)
                
            # Python cleanup
            clear_python_caches(aggressive=False)
            collected = smart_gc_collect()
            logger.debug(f"Normal cleanup collected {collected} objects")
            
        elif level == CLEANUP_AGGRESSIVE:
            # Force quit driver
            if driver:
                safe_driver_quit(driver)  # Don't care about success
                
            # Kill ALL Chrome processes
            if kill_chrome:
                kill_chrome_processes(aggressive=True)
                time.sleep(1)  # Extra wait
                # Second pass to catch any stragglers
                kill_chrome_processes(aggressive=True)
                
            # Aggressive Python cleanup
            clear_python_caches(aggressive=True)
            
            # Multiple GC passes
            total_collected = 0
            for _ in range(3):
                collected = smart_gc_collect()
                total_collected += collected
                time.sleep(0.2)
                
            logger.debug(f"Aggressive cleanup collected {total_collected} objects")
            
            # Force system memory release (Linux)
            try:
                import ctypes
                libc = ctypes.CDLL("libc.so.6")
                libc.malloc_trim(0)
            except Exception:
                pass
                
        else:
            logger.error(f"Unknown cleanup level: {level}")
            success = False
            
    except Exception as e:
        logger.error(f"Error in unified_cleanup: {e}")
        success = False
        
    # Calculate memory freed
    memory_after = get_memory_usage()
    memory_freed = memory_before - memory_after
    
    if memory_freed > 10:
        logger.info(f"{level.capitalize()} cleanup freed {memory_freed:.1f}MB "
                   f"({memory_before:.1f}MB → {memory_after:.1f}MB)")
    else:
        logger.debug(f"{level.capitalize()} cleanup complete "
                    f"(memory: {memory_after:.1f}MB)")
        
    return success, memory_freed

# Convenience functions for specific use cases
def periodic_cleanup() -> Tuple[bool, float]:
    """Light cleanup for periodic maintenance"""
    return unified_cleanup(CLEANUP_LIGHT, kill_chrome=False)

def pre_scrape_cleanup() -> Tuple[bool, float]:
    """Normal cleanup before starting a scrape"""
    return unified_cleanup(CLEANUP_NORMAL)

def post_scrape_cleanup(driver=None) -> Tuple[bool, float]:
    """Aggressive cleanup after scraping completes"""
    return unified_cleanup(CLEANUP_AGGRESSIVE, driver=driver)

def error_recovery_cleanup(driver=None) -> Tuple[bool, float]:
    """Aggressive cleanup for error recovery"""
    return unified_cleanup(CLEANUP_AGGRESSIVE, driver=driver)

# Example usage in existing code:
"""
# Replace this:
enhanced_python_memory_cleanup()
gc.collect()
gc.collect(2)
kill_orphaned_chrome_processes(max_age_seconds=0, aggressive=True)

# With this:
from cleanup_refactor import post_scrape_cleanup
post_scrape_cleanup(driver=driver)

# Or for periodic cleanup:
from cleanup_refactor import periodic_cleanup
if memory > 350:
    periodic_cleanup()
"""