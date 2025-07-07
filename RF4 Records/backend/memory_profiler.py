#!/usr/bin/env python3
"""
Enhanced memory profiling to identify memory allocation sources.
"""

import gc
import sys
import tracemalloc
import psutil
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class MemoryProfiler:
    def __init__(self, storage_dir="/tmp/memory_profiles"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.profile_file = self.storage_dir / "memory_profile.json"
        self.tracemalloc_started = False
        
    def start_tracing(self):
        """Start tracemalloc for detailed memory tracking"""
        if not self.tracemalloc_started:
            tracemalloc.start()
            self.tracemalloc_started = True
            return True
        return False
    
    def stop_tracing(self):
        """Stop tracemalloc"""
        if self.tracemalloc_started:
            tracemalloc.stop()
            self.tracemalloc_started = False
            return True
        return False
    
    def get_top_allocations(self, limit=20) -> List[Dict[str, Any]]:
        """Get top memory allocations by traceback"""
        if not self.tracemalloc_started:
            return []
        
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('traceback')
        
        allocations = []
        for stat in top_stats[:limit]:
            # Get the traceback
            tb_lines = []
            for frame in stat.traceback:
                tb_lines.append(f"{frame.filename}:{frame.lineno}")
            
            allocations.append({
                "size": stat.size,
                "size_mb": stat.size / 1024 / 1024,
                "count": stat.count,
                "traceback": tb_lines[-3:] if len(tb_lines) > 3 else tb_lines  # Last 3 frames
            })
        
        return allocations
    
    def get_memory_by_type(self) -> Dict[str, Any]:
        """Analyze memory usage by object type"""
        type_stats = {}
        
        # Collect all objects
        for obj in gc.get_objects():
            obj_type = type(obj).__name__
            obj_size = sys.getsizeof(obj, 0)
            
            if obj_type not in type_stats:
                type_stats[obj_type] = {"count": 0, "total_size": 0}
            
            type_stats[obj_type]["count"] += 1
            type_stats[obj_type]["total_size"] += obj_size
        
        # Sort by total size
        sorted_types = sorted(
            type_stats.items(), 
            key=lambda x: x[1]["total_size"], 
            reverse=True
        )[:20]  # Top 20 types
        
        return {
            obj_type: {
                "count": stats["count"],
                "total_size": stats["total_size"],
                "total_size_mb": stats["total_size"] / 1024 / 1024,
                "avg_size": stats["total_size"] / stats["count"] if stats["count"] > 0 else 0
            }
            for obj_type, stats in sorted_types
        }
    
    def analyze_sqlalchemy_sessions(self) -> Dict[str, Any]:
        """Check for SQLAlchemy session leaks"""
        try:
            from sqlalchemy.orm import Session
            from sqlalchemy.pool import Pool
            
            sessions = []
            pools = []
            
            for obj in gc.get_objects():
                if isinstance(obj, Session):
                    sessions.append({
                        "id": id(obj),
                        "is_active": obj.is_active,
                        "dirty": len(obj.dirty),
                        "new": len(obj.new),
                        "deleted": len(obj.deleted)
                    })
                elif isinstance(obj, Pool):
                    pools.append({
                        "id": id(obj),
                        "size": obj.size() if hasattr(obj, 'size') else 'unknown',
                        "checked_out": obj.checkedout() if hasattr(obj, 'checkedout') else 'unknown'
                    })
            
            return {
                "active_sessions": len(sessions),
                "session_details": sessions[:10],  # First 10
                "connection_pools": len(pools),
                "pool_details": pools
            }
        except ImportError:
            return {"error": "SQLAlchemy not available"}
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_thread_locals(self) -> Dict[str, Any]:
        """Check for thread-local storage leaks"""
        import threading
        
        thread_count = threading.active_count()
        threads = []
        
        for thread in threading.enumerate():
            thread_info = {
                "name": thread.name,
                "daemon": thread.daemon,
                "is_alive": thread.is_alive()
            }
            
            # Check for thread-local data
            if hasattr(thread, '_target') and thread._target:
                thread_info["target"] = str(thread._target)
            
            threads.append(thread_info)
        
        return {
            "active_threads": thread_count,
            "thread_details": threads
        }
    
    def get_gc_stats(self) -> Dict[str, Any]:
        """Get garbage collector statistics"""
        gc_stats = {
            "enabled": gc.isenabled(),
            "collection_counts": gc.get_count(),
            "threshold": gc.get_threshold(),
            "objects": len(gc.get_objects()),
            "garbage": len(gc.garbage)
        }
        
        # Get generation stats
        for i in range(gc.get_count().__len__()):
            gc_stats[f"generation_{i}_collected"] = gc.get_stats()[i].get('collected', 0) if i < len(gc.get_stats()) else 0
        
        return gc_stats
    
    def get_detailed_profile(self) -> Dict[str, Any]:
        """Get comprehensive memory profile"""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        profile = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "process": {
                "rss": memory_info.rss,
                "vms": memory_info.vms,
                "rss_mb": memory_info.rss / 1024 / 1024,
                "vms_mb": memory_info.vms / 1024 / 1024,
                "num_threads": process.num_threads(),
                "num_fds": process.num_fds() if hasattr(process, 'num_fds') else None
            },
            "allocations": self.get_top_allocations() if self.tracemalloc_started else [],
            "types": self.get_memory_by_type(),
            "sqlalchemy": self.analyze_sqlalchemy_sessions(),
            "threads": self.analyze_thread_locals(),
            "gc": self.get_gc_stats()
        }
        
        return profile
    
    def save_profile(self, profile: Dict[str, Any]):
        """Save profile to file"""
        try:
            # Load existing profiles
            profiles = []
            if self.profile_file.exists():
                with open(self.profile_file, 'r') as f:
                    profiles = json.load(f)
            
            # Add new profile
            profiles.append(profile)
            
            # Keep only last 100 profiles
            if len(profiles) > 100:
                profiles = profiles[-100:]
            
            # Save back
            with open(self.profile_file, 'w') as f:
                json.dump(profiles, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving profile: {e}")
    
    def compare_profiles(self, profile1: Dict, profile2: Dict) -> Dict[str, Any]:
        """Compare two profiles to identify changes"""
        comparison = {
            "rss_diff": profile2["process"]["rss"] - profile1["process"]["rss"],
            "vms_diff": profile2["process"]["vms"] - profile1["process"]["vms"],
            "rss_diff_mb": (profile2["process"]["rss"] - profile1["process"]["rss"]) / 1024 / 1024,
            "vms_diff_mb": (profile2["process"]["vms"] - profile1["process"]["vms"]) / 1024 / 1024,
            "thread_diff": profile2["process"]["num_threads"] - profile1["process"]["num_threads"],
            "object_diff": profile2["gc"]["objects"] - profile1["gc"]["objects"]
        }
        
        # Compare top types
        type_diffs = {}
        types1 = profile1.get("types", {})
        types2 = profile2.get("types", {})
        
        all_types = set(types1.keys()) | set(types2.keys())
        for obj_type in all_types:
            old_size = types1.get(obj_type, {}).get("total_size", 0)
            new_size = types2.get(obj_type, {}).get("total_size", 0)
            diff = new_size - old_size
            
            if abs(diff) > 1024 * 1024:  # Only show diffs > 1MB
                type_diffs[obj_type] = {
                    "old_size_mb": old_size / 1024 / 1024,
                    "new_size_mb": new_size / 1024 / 1024,
                    "diff_mb": diff / 1024 / 1024
                }
        
        comparison["significant_type_changes"] = type_diffs
        
        return comparison

# Global instance
memory_profiler = MemoryProfiler()