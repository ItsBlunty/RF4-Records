#!/usr/bin/env python3
"""
RF4 Records Dynamic Scheduler Startup Script
"""

import sys
import os
import signal
import logging
from scheduler import start_scheduler

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {signum}, shutting down scheduler...")
    sys.exit(0)

def main():
    """Main entry point for the scheduler"""
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    try:
        print("🚀 Starting RF4 Records Dynamic Scheduler...")
        print("📋 Schedule: 15min (Sun 6PM-Tue 6PM UTC), 1hr (Tue 6PM-Sun 6PM UTC)")
        print("🛑 Press Ctrl+C to stop")
        
        start_scheduler()
        
    except KeyboardInterrupt:
        print("\n🛑 Scheduler stopped by user")
    except Exception as e:
        print(f"❌ Failed to start scheduler: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 