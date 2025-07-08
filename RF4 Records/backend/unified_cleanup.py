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

# Simplified cleanup - no state management needed

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

def get_memory_usage() -> float:
    """Get current process memory usage in MB"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    except Exception:
        return 0.0

def clear_beautifulsoup_cache():
    """Clear BeautifulSoup parser cache and force cleanup of HTML objects"""
    try:
        import bs4
        import gc
        
        objects_before = 0
        objects_after = 0
        
        # Count BeautifulSoup objects before cleanup
        try:
            for obj in gc.get_objects():
                if isinstance(obj, (bs4.Tag, bs4.NavigableString)):
                    objects_before += 1
        except:
            pass
        
        # Clear parser cache
        if hasattr(bs4, 'BeautifulSoup') and hasattr(bs4.BeautifulSoup, '_parser_cache'):
            cache_size = len(bs4.BeautifulSoup._parser_cache)
            bs4.BeautifulSoup._parser_cache.clear()
        
        # Force garbage collection to clean up HTML objects
        gc.collect()
        gc.collect()  # Second pass for circular references
        
        # Clear any remaining BeautifulSoup module-level caches
        try:
            if hasattr(bs4.builder, '_registry'):
                bs4.builder._registry.clear()
        except (AttributeError, TypeError):
            pass
            
        # Count objects after cleanup
        try:
            for obj in gc.get_objects():
                if isinstance(obj, (bs4.Tag, bs4.NavigableString)):
                    objects_after += 1
        except:
            pass
        
        objects_freed = objects_before - objects_after
        
        if objects_before > 0:
            logger.debug(f"BeautifulSoup cleanup: {objects_before} → {objects_after} objects ({objects_freed} freed)")
            
    except (ImportError, AttributeError):
        pass

def safe_driver_quit(driver) -> bool:
    """Simple driver quit function"""
    if not driver:
        return True
    try:
        driver.quit()
        return True
    except Exception as e:
        logger.debug(f"Driver quit failed: {e}")
        return False

def kill_chrome_processes() -> int:
    """Kill Chrome processes, especially child processes of current Python process"""
    try:
        import psutil
        killed_count = 0
        current_pid = os.getpid()
        
        # First, kill Chrome child processes of current Python process
        try:
            parent = psutil.Process(current_pid)
            children = parent.children(recursive=True)
            
            for child in children:
                try:
                    if 'chrome' in child.name().lower():
                        logger.debug(f"Killing Chrome child process: PID {child.pid}")
                        child.terminate()
                        killed_count += 1
                        try:
                            child.wait(timeout=1)
                        except psutil.TimeoutExpired:
                            child.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.debug(f"Error killing child Chrome processes: {e}")
        
        if killed_count > 0:
            logger.info(f"Killed {killed_count} Chrome processes")
            
        return killed_count
        
    except Exception as e:
        logger.error(f"Error in kill_chrome_processes: {e}")
        return 0

def post_scrape_cleanup() -> Tuple[bool, float]:
    """Comprehensive cleanup after scraping completes - clears all accumulating objects"""
    memory_before = get_memory_usage()
    
    try:
        # Clean zombie processes
        zombies_cleaned = cleanup_zombie_processes()
        
        # Comprehensive BeautifulSoup cleanup 
        clear_beautifulsoup_cache()
        
        # Clear SQLAlchemy session to release Record objects
        try:
            from database import SessionLocal
            # Get a fresh session and close it to clear any cached objects
            temp_session = SessionLocal()
            temp_session.expunge_all()  # Remove all objects from session
            temp_session.close()
            logger.debug("SQLAlchemy session cleared")
        except Exception as e:
            logger.debug(f"SQLAlchemy cleanup error: {e}")
        
        # Aggressive garbage collection
        import gc
        collected = 0
        for _ in range(3):  # Multiple passes to catch circular references
            collected += gc.collect()
        
        # Force system-level memory release to combat container memory growth
        try:
            # Drop filesystem caches (requires elevated privileges, may fail)
            import subprocess
            subprocess.run(['sync'], check=False, capture_output=True)
            
            # Force malloc to return memory to OS
            import ctypes
            try:
                libc = ctypes.CDLL("libc.so.6")
                libc.malloc_trim(0)  # Force malloc to release memory back to OS
                logger.debug("Forced malloc trim to release system memory")
            except:
                pass
                
            # Python-specific memory release
            try:
                import sys
                if hasattr(sys, '_clear_type_cache'):
                    sys._clear_type_cache()  # Clear type cache
            except:
                pass
                
        except Exception as e:
            logger.debug(f"System memory release attempt failed: {e}")
        
        memory_after = get_memory_usage()
        memory_freed = memory_before - memory_after
        
        logger.info(f"Post-scrape cleanup: {zombies_cleaned} zombies, {collected} objects collected, {memory_freed:.1f}MB freed")
        logger.info(f"🔧 Attempted system-level memory release to combat container memory growth")
        
        return True, memory_freed
        
    except Exception as e:
        logger.error(f"Error in post_scrape_cleanup: {e}")
        return False, 0.0

def periodic_cleanup() -> Tuple[bool, float]:
    """Light cleanup for periodic maintenance - safe during scraping"""
    memory_before = get_memory_usage()
    
    try:
        # Always clean zombies
        zombies_cleaned = cleanup_zombie_processes()
        
        # Clear BeautifulSoup cache (major memory leak source!)
        clear_beautifulsoup_cache()
        
        # Light Python memory cleanup
        collected = gc.collect()
        
        memory_after = get_memory_usage()
        memory_freed = memory_before - memory_after
        
        if zombies_cleaned > 0 or memory_freed > 5:
            logger.info(f"Periodic cleanup: {zombies_cleaned} zombies, {memory_freed:.1f}MB freed")
        
        return True, memory_freed
        
    except Exception as e:
        logger.error(f"Error in periodic_cleanup: {e}")
        return False, 0.0
