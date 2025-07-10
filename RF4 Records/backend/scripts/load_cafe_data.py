#!/usr/bin/env python3
"""
Simple script to load cafe order data
Run this on Railway after deployment
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import and run the loader
from load_cafe_orders import load_cafe_orders

if __name__ == "__main__":
    print("Loading cafe order data into PostgreSQL database...")
    load_cafe_orders()
    print("\nDone!")