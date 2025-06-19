#!/usr/bin/env python3
"""
Startup script for RF4 Records API Server
This script starts the FastAPI server with the scheduled scraping service
"""

import uvicorn
import os
from main import app

if __name__ == "__main__":
    # Get port from environment (Railway sets PORT)
    port = int(os.getenv("PORT", 8000))
    
    # Run the FastAPI app with uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    ) 