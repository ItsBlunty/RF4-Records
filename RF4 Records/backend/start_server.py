#!/usr/bin/env python3
"""
Startup script for RF4 Records API Server
This script starts the FastAPI server with the scheduled scraping service
"""

import uvicorn
import logging
from datetime import datetime

if __name__ == "__main__":
    print("=" * 60)
    print("RF4 RECORDS API SERVER")
    print("=" * 60)
    print(f"Starting server at: {datetime.now()}")
    print("Features:")
    print("- FastAPI server with CORS enabled")
    print("- Scheduled scraping every 15 minutes")
    print("- Comprehensive logging to logs/ directory")
    print("- Manual scrape trigger via /refresh endpoint")
    print("- Status monitoring via /status endpoint")
    print("- Graceful shutdown with Ctrl+C support")
    print("=" * 60)
    print("🌐 SERVER URLS:")
    print("   Local:  http://localhost:8000")
    print("   Network: http://127.0.0.1:8000")
    print("   API Docs: http://localhost:8000/docs")
    print("=" * 60)
    print("🛑 Press Ctrl+C to gracefully shut down the server")
    print("=" * 60)
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allow external connections
        port=8000,
        reload=False,  # Disable reload for production
        log_level="info"
    ) 