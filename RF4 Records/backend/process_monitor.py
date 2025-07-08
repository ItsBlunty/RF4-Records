#!/usr/bin/env python3
"""
Monitor process creation to find where zombie cat processes come from.
"""

import os
import signal
import subprocess
import logging

logger = logging.getLogger(__name__)

def check_zombie_processes():
    """Check for zombie processes and log details"""
    try:
        # Get all processes with their parent info
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        
        zombies = []
        for line in lines:
            if '<defunct>' in line or 'Z' in line.split()[7] if len(line.split()) > 7 else False:
                zombies.append(line)
        
        if zombies:
            logger.warning(f"Found {len(zombies)} zombie processes:")
            for zombie in zombies[:5]:  # Show first 5
                logger.warning(f"  {zombie}")
                
        # Also check specifically for cat processes
        cat_result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        cat_processes = [line for line in cat_result.stdout.split('\n') if ' cat' in line and 'grep' not in line]
        
        if cat_processes:
            logger.info(f"Found {len(cat_processes)} cat processes")
            # Get parent process info
            for proc_line in cat_processes[:3]:
                parts = proc_line.split()
                if len(parts) > 1:
                    pid = parts[1]
                    try:
                        ppid_result = subprocess.run(['ps', '-p', pid, '-o', 'ppid='], capture_output=True, text=True)
                        ppid = ppid_result.stdout.strip()
                        if ppid:
                            parent_result = subprocess.run(['ps', '-p', ppid, '-o', 'comm='], capture_output=True, text=True)
                            parent_name = parent_result.stdout.strip()
                            logger.info(f"  Cat PID {pid} parent: {parent_name} (PID {ppid})")
                    except:
                        pass
                        
        return len(zombies), len(cat_processes)
        
    except Exception as e:
        logger.error(f"Error checking zombie processes: {e}")
        return 0, 0

def cleanup_zombie_processes():
    """Attempt to cleanup zombie processes"""
    try:
        # First, try to reap children
        while True:
            try:
                pid, status = os.waitpid(-1, os.WNOHANG)
                if pid == 0:
                    break
                logger.info(f"Reaped zombie process {pid}")
            except ChildProcessError:
                break
        
        # For remaining zombies, try to signal their parents
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        
        zombie_count = 0
        for line in lines:
            parts = line.split()
            if len(parts) > 7 and parts[7] == 'Z':
                zombie_count += 1
                pid = parts[1]
                try:
                    # Get parent PID
                    ppid_result = subprocess.run(['ps', '-p', pid, '-o', 'ppid='], capture_output=True, text=True)
                    ppid = ppid_result.stdout.strip()
                    if ppid and ppid != '1':  # Don't signal init
                        os.kill(int(ppid), signal.SIGCHLD)
                        logger.info(f"Sent SIGCHLD to parent {ppid} of zombie {pid}")
                except:
                    pass
                    
        return zombie_count
        
    except Exception as e:
        logger.error(f"Error cleaning up zombies: {e}")
        return 0