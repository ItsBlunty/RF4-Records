#!/usr/bin/env python3
"""
Top baits data caching system for fast API responses.
Precomputes bait analysis and stores it for quick serving.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Cache file location
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_FILE = CACHE_DIR / "top_baits_cache.json"
CACHE_METADATA_FILE = CACHE_DIR / "top_baits_metadata.json"

def ensure_cache_dir():
    """Ensure the cache directory exists"""
    CACHE_DIR.mkdir(exist_ok=True)

def generate_top_baits_cache():
    """Generate and save top baits data to cache"""
    start_time = time.time()
    logger.info("🎣 Generating top baits cache...")
    
    try:
        from simplified_records import get_top_baits_data
        
        # Generate the data
        data = get_top_baits_data()
        
        # Ensure cache directory exists
        ensure_cache_dir()
        
        # Save the data
        with open(CACHE_FILE, 'w') as f:
            json.dump(data, f, default=str, indent=2)
        
        # Save metadata
        metadata = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generation_time": time.time() - start_time,
            "total_records": data["performance"]["total_records"],
            "total_fish_species": data["performance"]["total_fish_species"]
        }
        
        with open(CACHE_METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✅ Top baits cache generated in {metadata['generation_time']:.3f}s")
        logger.info(f"   Records: {metadata['total_records']}, Fish: {metadata['total_fish_species']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to generate top baits cache: {e}")
        return False

def load_top_baits_cache():
    """Load cached top baits data"""
    try:
        if not CACHE_FILE.exists():
            logger.warning("Top baits cache file not found")
            return None
        
        with open(CACHE_FILE, 'r') as f:
            data = json.load(f)
        
        # Load metadata if available
        metadata = None
        if CACHE_METADATA_FILE.exists():
            with open(CACHE_METADATA_FILE, 'r') as f:
                metadata = json.load(f)
        
        # Add cache info to the data
        if metadata:
            data["cache_info"] = {
                "cached": True,
                "generated_at": metadata["generated_at"],
                "generation_time": metadata["generation_time"]
            }
        else:
            data["cache_info"] = {
                "cached": True,
                "generated_at": "unknown",
                "generation_time": 0
            }
        
        return data
        
    except Exception as e:
        logger.error(f"❌ Failed to load top baits cache: {e}")
        return None

def is_cache_valid():
    """Check if the cache exists and contains actual data"""
    try:
        if not CACHE_FILE.exists() or not CACHE_METADATA_FILE.exists():
            return False
        
        with open(CACHE_METADATA_FILE, 'r') as f:
            metadata = json.load(f)
        
        # Cache is only valid if it contains actual data (not empty)
        total_records = metadata.get("total_records", 0)
        if total_records == 0:
            logger.warning(f"Cache exists but is empty (0 records), marking as invalid")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"Error checking cache validity: {e}")
        return False

def get_cache_info():
    """Get information about the cache status"""
    try:
        if not CACHE_METADATA_FILE.exists():
            return {"exists": False}
        
        with open(CACHE_METADATA_FILE, 'r') as f:
            metadata = json.load(f)
        
        return {
            "exists": True,
            "generated_at": metadata["generated_at"],
            "generation_time": metadata["generation_time"],
            "total_records": metadata["total_records"],
            "total_fish_species": metadata["total_fish_species"]
        }
        
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {"exists": False, "error": str(e)}

if __name__ == "__main__":
    # Allow running this script directly to regenerate cache
    success = generate_top_baits_cache()
    if success:
        print("✅ Top baits cache generated successfully")
        info = get_cache_info()
        print(f"Generated at: {info.get('generated_at')}")
        print(f"Generation time: {info.get('generation_time', 0):.3f}s")
        print(f"Records: {info.get('total_records', 0)}")
        print(f"Fish species: {info.get('total_fish_species', 0)}")
    else:
        print("❌ Failed to generate cache")
        exit(1)