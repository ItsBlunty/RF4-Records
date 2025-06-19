#!/usr/bin/env python3
"""
Test script to verify signal handling works correctly
"""

import signal
import sys
import time
import threading

# Global flag to track if we should stop
should_stop = False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global should_stop
    print(f"\n🛑 Received signal {signum} - initiating graceful shutdown...")
    should_stop = True

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

def main():
    global should_stop
    
    print("=" * 60)
    print("SIGNAL HANDLING TEST")
    print("=" * 60)
    print("This script will run for 30 seconds or until Ctrl+C is pressed")
    print("Press Ctrl+C to test graceful shutdown")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        while time.time() - start_time < 30 and not should_stop:
            elapsed = time.time() - start_time
            print(f"Running... {elapsed:.1f}s elapsed (Press Ctrl+C to stop)")
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 KeyboardInterrupt received")
        should_stop = True
    
    if should_stop:
        print("✅ Graceful shutdown initiated by signal")
    else:
        print("✅ Test completed normally")
    
    print("Test finished")

if __name__ == "__main__":
    main() 