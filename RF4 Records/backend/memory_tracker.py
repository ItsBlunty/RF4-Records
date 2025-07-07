#!/usr/bin/env python3
"""
Simple memory monitoring system for tracking memory usage over time.
Takes snapshots every minute and stores them for historical analysis.
"""

import psutil
import time
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class MemoryTracker:
    def __init__(self, storage_dir="/tmp/memory_snapshots"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.snapshots_file = self.storage_dir / "memory_snapshots.json"
        self.running = False
        self.thread = None
        self.max_snapshots = 1440  # Keep 24 hours of data (1440 minutes)
        
    def get_memory_snapshot(self) -> Dict[str, Any]:
        """Get current memory usage snapshot"""
        try:
            # Get process memory info
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            
            # Get system memory info
            system_memory = psutil.virtual_memory()
            
            # Get number of threads
            num_threads = process.num_threads()
            
            snapshot = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "process": {
                    "rss": memory_info.rss,  # Resident Set Size
                    "vms": memory_info.vms,  # Virtual Memory Size
                    "percent": memory_percent,
                    "num_threads": num_threads
                },
                "system": {
                    "total": system_memory.total,
                    "available": system_memory.available,
                    "used": system_memory.used,
                    "percent": system_memory.percent
                }
            }
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Error getting memory snapshot: {e}")
            return None
    
    def save_snapshot(self, snapshot: Dict[str, Any]):
        """Save snapshot to storage"""
        try:
            # Load existing snapshots
            snapshots = self.load_snapshots()
            
            # Add new snapshot
            snapshots.append(snapshot)
            
            # Keep only recent snapshots
            if len(snapshots) > self.max_snapshots:
                snapshots = snapshots[-self.max_snapshots:]
            
            # Save back to file
            with open(self.snapshots_file, 'w') as f:
                json.dump(snapshots, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving memory snapshot: {e}")
    
    def load_snapshots(self) -> List[Dict[str, Any]]:
        """Load all stored snapshots"""
        try:
            if not self.snapshots_file.exists():
                return []
            
            with open(self.snapshots_file, 'r') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"Error loading memory snapshots: {e}")
            return []
    
    def get_recent_snapshots(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get snapshots from the last N minutes"""
        try:
            snapshots = self.load_snapshots()
            if not snapshots:
                return []
            
            # Calculate cutoff time
            cutoff_time = datetime.now(timezone.utc).timestamp() - (minutes * 60)
            
            # Filter recent snapshots
            recent = []
            for snapshot in snapshots:
                snapshot_time = datetime.fromisoformat(snapshot["timestamp"].replace('Z', '+00:00')).timestamp()
                if snapshot_time >= cutoff_time:
                    recent.append(snapshot)
            
            return recent
            
        except Exception as e:
            logger.error(f"Error getting recent snapshots: {e}")
            return []
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get summary statistics about memory usage"""
        try:
            snapshots = self.load_snapshots()
            if not snapshots:
                return {"error": "No snapshots available"}
            
            # Calculate stats
            rss_values = [s["process"]["rss"] for s in snapshots]
            vms_values = [s["process"]["vms"] for s in snapshots]
            
            stats = {
                "total_snapshots": len(snapshots),
                "first_snapshot": snapshots[0]["timestamp"] if snapshots else None,
                "last_snapshot": snapshots[-1]["timestamp"] if snapshots else None,
                "rss": {
                    "current": rss_values[-1] if rss_values else 0,
                    "min": min(rss_values) if rss_values else 0,
                    "max": max(rss_values) if rss_values else 0,
                    "avg": sum(rss_values) / len(rss_values) if rss_values else 0
                },
                "vms": {
                    "current": vms_values[-1] if vms_values else 0,
                    "min": min(vms_values) if vms_values else 0,
                    "max": max(vms_values) if vms_values else 0,
                    "avg": sum(vms_values) / len(vms_values) if vms_values else 0
                }
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting memory stats: {e}")
            return {"error": str(e)}
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        logger.info("Memory monitoring started")
        
        while self.running:
            try:
                # Take snapshot
                snapshot = self.get_memory_snapshot()
                if snapshot:
                    self.save_snapshot(snapshot)
                
                # Wait 60 seconds
                time.sleep(60)
                
            except Exception as e:
                logger.error(f"Error in memory monitoring loop: {e}")
                time.sleep(60)  # Still wait before retrying
        
        logger.info("Memory monitoring stopped")
    
    def start_monitoring(self):
        """Start background memory monitoring"""
        if self.running:
            return False
        
        self.running = True
        self.thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.thread.start()
        return True
    
    def stop_monitoring(self):
        """Stop background memory monitoring"""
        if not self.running:
            return False
        
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        return True
    
    def is_running(self) -> bool:
        """Check if monitoring is running"""
        return self.running and self.thread and self.thread.is_alive()

# Global instance
memory_tracker = MemoryTracker()