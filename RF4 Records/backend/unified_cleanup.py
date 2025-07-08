"""
Streamlined cleanup module for RF4 Records scraper
This module consolidates all cleanup operations to reduce redundancy
"""

import gc
import time
import logging
import psutil
import os
import signal
from typing import Optional, Tuple
import subprocess

logger = logging.getLogger(__name__)

# Cleanup levels
CLEANUP_LIGHT = "light"
CLEANUP_NORMAL = "normal"
CLEANUP_AGGRESSIVE = "aggressive"

# Global state to prevent cleaning during active scraping
_is_scraping = False

def set_scraping_state(is_scraping: bool):
    """Set the global scraping state to prevent cleanup during active scrapes"""
    global _is_scraping
    _is_scraping = is_scraping
    logger.debug(f"Scraping state set to: {is_scraping}")

def is_safe_to_cleanup_chrome() -> bool:
    """Check if it's safe to kill Chrome processes"""
    return not _is_scraping

def cleanup_zombie_processes() -> int:
    """
    Clean up zombie processes, especially 'cat' processes
    Returns: Number of zombies cleaned
    """
    try:
        cleaned = 0
        
        # First, try to reap any children of this process
        while True:
            try:
                pid, status = os.waitpid(-1, os.WNOHANG)
                if pid == 0:
                    break
                cleaned += 1
                logger.debug(f"Reaped zombie child process {pid}")
            except ChildProcessError:
                break
        
        # Check for zombie processes and their parents
        try:
            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            
            zombie_pids = []
            for line in lines:
                parts = line.split()
                if len(parts) > 7:
                    # Check for zombie state (Z) or <defunct>
                    if parts[7] == 'Z' or '<defunct>' in line:
                        zombie_pids.append(parts[1])
            
            # Send SIGCHLD to parent processes to encourage reaping
            for pid in zombie_pids:
                try:
                    ppid_result = subprocess.run(['ps', '-p', pid, '-o', 'ppid='], 
                                               capture_output=True, text=True)
                    ppid = ppid_result.stdout.strip()
                    if ppid and ppid != '1':  # Don't signal init
                        os.kill(int(ppid), signal.SIGCHLD)
                        cleaned += 1
                except:
                    pass
                    
        except Exception as e:
            logger.debug(f"Error checking zombie processes: {e}")
            
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} zombie processes")
            
        return cleaned
        
    except Exception as e:
        logger.error(f"Error in cleanup_zombie_processes: {e}")
        return 0

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
    # Safety check - don't kill Chrome during active scraping unless aggressive
    if not aggressive and not is_safe_to_cleanup_chrome():
        logger.warning("Skipping Chrome cleanup - scraping is active")
        return 0
        
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
                   kill_chrome: bool = True,
                   clean_zombies: bool = True) -> Tuple[bool, float]:
    """
    Unified cleanup function that orchestrates all cleanup operations
    
    Args:
        level: Cleanup intensity - "light", "normal", or "aggressive"
        driver: Selenium WebDriver instance to clean up (optional)
        kill_chrome: Whether to kill Chrome processes (default: True)
        clean_zombies: Whether to clean zombie processes (default: True)
        
    Returns:
        Tuple of (success: bool, memory_freed_mb: float)
    """
    memory_before = get_memory_usage()
    success = True
    
    try:
        logger.info(f"Starting {level} cleanup (memory: {memory_before:.1f}MB)")
        
        # Always clean zombies first if requested
        if clean_zombies:
            zombies_cleaned = cleanup_zombie_processes()
            if zombies_cleaned > 0:
                logger.info(f"Cleaned {zombies_cleaned} zombie processes")
        
        if level == CLEANUP_LIGHT:
            # Just Python memory cleanup - safe during scraping
            clear_python_caches(aggressive=False)
            collected = smart_gc_collect()
            logger.debug(f"Light cleanup collected {collected} objects")
            
        elif level == CLEANUP_NORMAL:
            # Driver cleanup if provided
            if driver:
                success = safe_driver_quit(driver)
                
            # Kill old Chrome processes (only if safe)
            if kill_chrome and is_safe_to_cleanup_chrome():
                kill_chrome_processes(aggressive=False, max_age_seconds=300)
            elif kill_chrome:
                logger.warning("Skipping Chrome cleanup - scraping is active")
                
            # Python cleanup
            clear_python_caches(aggressive=False)
            collected = smart_gc_collect()
            logger.debug(f"Normal cleanup collected {collected} objects")
            
        elif level == CLEANUP_AGGRESSIVE:
            # Force quit driver
            if driver:
                safe_driver_quit(driver)  # Don't care about success
                
            # Kill ALL Chrome processes (aggressive overrides safety check)
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
    """Light cleanup for periodic maintenance - safe during scraping"""
    return unified_cleanup(CLEANUP_LIGHT, kill_chrome=False)

def pre_scrape_cleanup() -> Tuple[bool, float]:
    """Normal cleanup before starting a scrape"""
    # Set scraping state will be set by scraper after this
    return unified_cleanup(CLEANUP_NORMAL)

def post_scrape_cleanup(driver=None) -> Tuple[bool, float]:
    """Aggressive cleanup after scraping completes"""
    # Scraping is done, so aggressive cleanup is safe
    return unified_cleanup(CLEANUP_AGGRESSIVE, driver=driver)

def error_recovery_cleanup(driver=None) -> Tuple[bool, float]:
    """Aggressive cleanup for error recovery"""
    return unified_cleanup(CLEANUP_AGGRESSIVE, driver=driver)

def during_scrape_cleanup() -> Tuple[bool, float]:
    """Safe cleanup that can be run during active scraping"""
    # Only Python memory cleanup and zombies - no Chrome killing
    return unified_cleanup(CLEANUP_LIGHT, kill_chrome=False, clean_zombies=True)