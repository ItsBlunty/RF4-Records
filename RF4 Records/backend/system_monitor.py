#!/usr/bin/env python3
"""
Comprehensive system monitoring that captures ALL memory usage in the container.
"""

import psutil
import subprocess
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class SystemMonitor:
    def __init__(self, storage_dir="/tmp/system_monitor"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.snapshot_file = self.storage_dir / "system_snapshots.json"
        
    def get_all_processes(self) -> List[Dict[str, Any]]:
        """Get memory usage for ALL processes in the system"""
        processes = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cmdline']):
                try:
                    info = proc.info
                    mem_info = info['memory_info']
                    
                    # Skip kernel threads (no memory info)
                    if mem_info is None:
                        continue
                    
                    process_data = {
                        'pid': info['pid'],
                        'name': info['name'],
                        'rss': mem_info.rss,
                        'vms': mem_info.vms,
                        'rss_mb': mem_info.rss / 1024 / 1024,
                        'vms_mb': mem_info.vms / 1024 / 1024,
                        'cmdline': ' '.join(info['cmdline']) if info['cmdline'] else info['name']
                    }
                    
                    processes.append(process_data)
                    
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting processes: {e}")
            
        # Sort by RSS descending
        processes.sort(key=lambda x: x['rss'], reverse=True)
        return processes
    
    def get_chrome_processes(self) -> List[Dict[str, Any]]:
        """Get all Chrome/Chromium related processes"""
        chrome_procs = []
        
        for proc in self.get_all_processes():
            name_lower = proc['name'].lower()
            cmd_lower = proc['cmdline'].lower()
            
            if any(chrome in name_lower or chrome in cmd_lower 
                   for chrome in ['chrome', 'chromium', 'chromedriver']):
                chrome_procs.append(proc)
                
        return chrome_procs
    
    def get_container_memory(self) -> Dict[str, Any]:
        """Get container-level memory stats using cgroup info"""
        container_stats = {}
        
        try:
            # Try to read cgroup memory stats (works in Docker/container environments)
            cgroup_files = [
                '/sys/fs/cgroup/memory/memory.usage_in_bytes',
                '/sys/fs/cgroup/memory/memory.limit_in_bytes',
                '/sys/fs/cgroup/memory/memory.stat',
                '/sys/fs/cgroup/memory.current',  # cgroup v2
                '/sys/fs/cgroup/memory.max',      # cgroup v2
            ]
            
            for file_path in cgroup_files:
                try:
                    path = Path(file_path)
                    if path.exists():
                        content = path.read_text().strip()
                        container_stats[path.name] = content
                except Exception:
                    pass
                    
            # Parse the stats if we got them
            if 'memory.usage_in_bytes' in container_stats:
                usage = int(container_stats['memory.usage_in_bytes'])
                container_stats['container_rss_mb'] = usage / 1024 / 1024
            elif 'memory.current' in container_stats:
                usage = int(container_stats['memory.current'])
                container_stats['container_rss_mb'] = usage / 1024 / 1024
                
        except Exception as e:
            logger.error(f"Error reading cgroup stats: {e}")
            
        return container_stats
    
    def get_system_memory_breakdown(self) -> Dict[str, Any]:
        """Get detailed memory breakdown for the entire system"""
        # Get all processes
        all_processes = self.get_all_processes()
        
        # Calculate totals
        total_rss = sum(p['rss'] for p in all_processes)
        total_vms = sum(p['vms'] for p in all_processes)
        
        # Group by process name
        process_groups = {}
        for proc in all_processes:
            name = proc['name']
            if name not in process_groups:
                process_groups[name] = {
                    'count': 0,
                    'total_rss': 0,
                    'total_vms': 0,
                    'pids': []
                }
            
            process_groups[name]['count'] += 1
            process_groups[name]['total_rss'] += proc['rss']
            process_groups[name]['total_vms'] += proc['vms']
            process_groups[name]['pids'].append(proc['pid'])
        
        # Get system memory
        sys_mem = psutil.virtual_memory()
        
        # Get container memory if available
        container_mem = self.get_container_memory()
        
        # Find our main Python process
        main_process = None
        for proc in all_processes:
            if 'uvicorn' in proc['cmdline'] or 'main:app' in proc['cmdline']:
                main_process = proc
                break
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'system_memory': {
                'total': sys_mem.total,
                'available': sys_mem.available,
                'used': sys_mem.used,
                'percent': sys_mem.percent
            },
            'all_processes_total': {
                'rss_mb': total_rss / 1024 / 1024,
                'vms_mb': total_vms / 1024 / 1024,
                'process_count': len(all_processes)
            },
            'main_process': main_process,
            'top_processes': all_processes[:10],  # Top 10 by RSS
            'process_groups': dict(sorted(
                process_groups.items(),
                key=lambda x: x[1]['total_rss'],
                reverse=True
            )[:10]),  # Top 10 groups
            'chrome_processes': self.get_chrome_processes(),
            'container_memory': container_mem
        }
    
    def compare_with_railway(self, railway_reported_mb: float) -> Dict[str, Any]:
        """Compare our measurements with Railway's reported memory"""
        breakdown = self.get_system_memory_breakdown()
        
        our_total = breakdown['all_processes_total']['rss_mb']
        difference = railway_reported_mb - our_total
        
        analysis = {
            'railway_reported_mb': railway_reported_mb,
            'our_measured_mb': our_total,
            'difference_mb': difference,
            'main_process_mb': breakdown['main_process']['rss_mb'] if breakdown['main_process'] else 0,
            'chrome_count': len(breakdown['chrome_processes']),
            'chrome_total_mb': sum(p['rss_mb'] for p in breakdown['chrome_processes']),
            'process_count': breakdown['all_processes_total']['process_count']
        }
        
        # Check container memory if available
        if 'container_rss_mb' in breakdown['container_memory']:
            analysis['container_measured_mb'] = breakdown['container_memory']['container_rss_mb']
            analysis['container_vs_railway_diff'] = railway_reported_mb - analysis['container_measured_mb']
        
        return {
            'analysis': analysis,
            'breakdown': breakdown
        }
    
    def monitor_memory_sources(self) -> Dict[str, Any]:
        """Monitor all possible memory sources"""
        breakdown = self.get_system_memory_breakdown()
        
        # Calculate memory by category
        python_mb = 0
        chrome_mb = 0
        system_mb = 0
        other_mb = 0
        
        for proc in breakdown['top_processes']:
            name = proc['name'].lower()
            rss_mb = proc['rss_mb']
            
            if 'python' in name or 'uvicorn' in proc['cmdline']:
                python_mb += rss_mb
            elif 'chrome' in name or 'chromium' in name:
                chrome_mb += rss_mb
            elif name in ['systemd', 'init', 'kernel']:
                system_mb += rss_mb
            else:
                other_mb += rss_mb
        
        return {
            'timestamp': breakdown['timestamp'],
            'total_mb': breakdown['all_processes_total']['rss_mb'],
            'categories': {
                'python_app': python_mb,
                'chrome_selenium': chrome_mb,
                'system': system_mb,
                'other': other_mb
            },
            'top_consumers': [
                {
                    'name': p['name'],
                    'rss_mb': p['rss_mb'],
                    'cmdline': p['cmdline'][:100]  # First 100 chars
                }
                for p in breakdown['top_processes'][:5]
            ]
        }

# Global instance
system_monitor = SystemMonitor()