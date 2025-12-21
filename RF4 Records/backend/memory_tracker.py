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

            # Calculate MB-hours (memory-time metric for cost analysis)
            mb_hours = self.calculate_mb_hours(snapshots)

            # Calculate percentile highs (like FPS "1% lows" but for memory spikes)
            rss_percentiles = self._calculate_percentile_highs(rss_values)
            vms_percentiles = self._calculate_percentile_highs(vms_values)

            stats = {
                "total_snapshots": len(snapshots),
                "first_snapshot": snapshots[0]["timestamp"] if snapshots else None,
                "last_snapshot": snapshots[-1]["timestamp"] if snapshots else None,
                "rss": {
                    "current": rss_values[-1] if rss_values else 0,
                    "min": min(rss_values) if rss_values else 0,
                    "max": max(rss_values) if rss_values else 0,
                    "avg": sum(rss_values) / len(rss_values) if rss_values else 0,
                    "top_1_percent": rss_percentiles["top_1_percent"],
                    "top_0_1_percent": rss_percentiles["top_0_1_percent"]
                },
                "vms": {
                    "current": vms_values[-1] if vms_values else 0,
                    "min": min(vms_values) if vms_values else 0,
                    "max": max(vms_values) if vms_values else 0,
                    "avg": sum(vms_values) / len(vms_values) if vms_values else 0,
                    "top_1_percent": vms_percentiles["top_1_percent"],
                    "top_0_1_percent": vms_percentiles["top_0_1_percent"]
                },
                "cost_metrics": {
                    "mb_hours_total": mb_hours["total"],
                    "mb_hours_per_day": mb_hours["per_day"],
                    "gb_hours_total": mb_hours["total"] / 1024,
                    "gb_hours_per_day": mb_hours["per_day"] / 1024,
                    "avg_memory_mb": mb_hours["avg_mb"],
                    "time_period_hours": mb_hours["hours"]
                }
            }

            return stats

        except Exception as e:
            logger.error(f"Error getting memory stats: {e}")
            return {"error": str(e)}

    def _calculate_percentile_highs(self, values: list) -> Dict[str, float]:
        """
        Calculate top percentile values (like FPS "1% lows" but for memory spikes).
        Shows worst-case memory usage that averages hide.

        Returns:
            - top_1_percent: Average of worst 1% of samples (memory spikes)
            - top_0_1_percent: Average of worst 0.1% of samples (extreme spikes)
        """
        if not values or len(values) < 10:
            return {
                "top_1_percent": 0,
                "top_0_1_percent": 0
            }

        # Sort values descending (highest first)
        sorted_values = sorted(values, reverse=True)

        # Calculate how many samples for each percentile
        count_1_percent = max(1, int(len(values) * 0.01))  # Top 1%
        count_0_1_percent = max(1, int(len(values) * 0.001))  # Top 0.1%

        # Get top percentile samples
        top_1_percent_samples = sorted_values[:count_1_percent]
        top_0_1_percent_samples = sorted_values[:count_0_1_percent]

        # Calculate averages
        avg_top_1_percent = sum(top_1_percent_samples) / len(top_1_percent_samples)
        avg_top_0_1_percent = sum(top_0_1_percent_samples) / len(top_0_1_percent_samples)

        return {
            "top_1_percent": avg_top_1_percent,
            "top_0_1_percent": avg_top_0_1_percent
        }

    def calculate_mb_hours(self, snapshots: List[Dict[str, Any]] = None) -> Dict[str, float]:
        """
        Calculate MB-hours metric for cost analysis.
        This is the key metric Railway uses for billing: Memory (MB) × Time (hours)

        Returns:
            - total: Total MB-hours for the snapshot period
            - per_day: Projected MB-hours per 24-hour day
            - avg_mb: Average memory usage in MB
            - hours: Time period covered by snapshots in hours
        """
        try:
            if snapshots is None:
                snapshots = self.load_snapshots()

            if len(snapshots) < 2:
                return {
                    "total": 0,
                    "per_day": 0,
                    "avg_mb": 0,
                    "hours": 0
                }

            # Calculate time span (in hours)
            first_time = datetime.fromisoformat(snapshots[0]["timestamp"].replace('Z', '+00:00'))
            last_time = datetime.fromisoformat(snapshots[-1]["timestamp"].replace('Z', '+00:00'))
            time_diff_hours = (last_time - first_time).total_seconds() / 3600

            if time_diff_hours == 0:
                time_diff_hours = len(snapshots) / 60  # Assume 1 snapshot per minute

            # Calculate average memory in MB (using RSS - Resident Set Size)
            total_rss_mb = sum(s["process"]["rss"] / (1024 * 1024) for s in snapshots)
            avg_memory_mb = total_rss_mb / len(snapshots)

            # Calculate MB-hours: Average Memory (MB) × Time (hours)
            mb_hours_total = avg_memory_mb * time_diff_hours

            # Project to 24-hour period for comparison
            if time_diff_hours > 0:
                mb_hours_per_day = (mb_hours_total / time_diff_hours) * 24
            else:
                mb_hours_per_day = 0

            return {
                "total": round(mb_hours_total, 2),
                "per_day": round(mb_hours_per_day, 2),
                "avg_mb": round(avg_memory_mb, 2),
                "hours": round(time_diff_hours, 2)
            }

        except Exception as e:
            logger.error(f"Error calculating MB-hours: {e}")
            return {
                "total": 0,
                "per_day": 0,
                "avg_mb": 0,
                "hours": 0
            }

    def compare_periods(self, hours_1: int = 24, hours_2: int = 24) -> Dict[str, Any]:
        """
        Compare memory usage between two time periods for A/B testing fixes.

        Args:
            hours_1: Hours to look back for period 1 (older period)
            hours_2: Hours to look back for period 2 (recent period)

        Returns comparison of memory usage and cost metrics
        """
        try:
            all_snapshots = self.load_snapshots()
            if len(all_snapshots) < 2:
                return {"error": "Not enough snapshots for comparison"}

            now = datetime.now(timezone.utc).timestamp()

            # Split snapshots into two periods
            cutoff_2 = now - (hours_2 * 3600)
            cutoff_1 = now - ((hours_1 + hours_2) * 3600)

            period_1 = []  # Older period
            period_2 = []  # Recent period

            for snapshot in all_snapshots:
                snapshot_time = datetime.fromisoformat(snapshot["timestamp"].replace('Z', '+00:00')).timestamp()

                if cutoff_1 <= snapshot_time < cutoff_2:
                    period_1.append(snapshot)
                elif snapshot_time >= cutoff_2:
                    period_2.append(snapshot)

            if not period_1 or not period_2:
                return {"error": "Not enough data in both periods"}

            # Calculate MB-hours for both periods
            mb_hours_1 = self.calculate_mb_hours(period_1)
            mb_hours_2 = self.calculate_mb_hours(period_2)

            # Calculate savings
            mb_hours_saved = mb_hours_1["per_day"] - mb_hours_2["per_day"]
            percent_reduction = ((mb_hours_1["per_day"] - mb_hours_2["per_day"]) / mb_hours_1["per_day"] * 100) if mb_hours_1["per_day"] > 0 else 0

            return {
                "period_1": {
                    "label": f"Previous {hours_1} hours",
                    "snapshots": len(period_1),
                    "avg_memory_mb": mb_hours_1["avg_mb"],
                    "mb_hours_per_day": mb_hours_1["per_day"],
                    "gb_hours_per_day": mb_hours_1["per_day"] / 1024
                },
                "period_2": {
                    "label": f"Recent {hours_2} hours",
                    "snapshots": len(period_2),
                    "avg_memory_mb": mb_hours_2["avg_mb"],
                    "mb_hours_per_day": mb_hours_2["per_day"],
                    "gb_hours_per_day": mb_hours_2["per_day"] / 1024
                },
                "comparison": {
                    "mb_hours_saved_per_day": round(mb_hours_saved, 2),
                    "gb_hours_saved_per_day": round(mb_hours_saved / 1024, 2),
                    "percent_reduction": round(percent_reduction, 2),
                    "avg_memory_reduction_mb": round(mb_hours_1["avg_mb"] - mb_hours_2["avg_mb"], 2)
                }
            }

        except Exception as e:
            logger.error(f"Error comparing periods: {e}")
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