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
    """Clear BeautifulSoup parser cache that can accumulate HTML objects"""
    try:
        import bs4
        if hasattr(bs4, 'BeautifulSoup') and hasattr(bs4.BeautifulSoup, '_parser_cache'):
            cache_size = len(bs4.BeautifulSoup._parser_cache)
            bs4.BeautifulSoup._parser_cache.clear()
            if cache_size > 0:
                logger.debug(f"Cleared BeautifulSoup cache ({cache_size} parsers)")
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
