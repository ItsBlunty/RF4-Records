# RF4 Records Memory Management Guide

This document explains the memory management improvements implemented to prevent memory leaks when using Browserless v1 with Selenium WebDriver.

## Problem

The original implementation was experiencing steadily increasing memory usage over time, indicating memory leaks in WebDriver sessions. This is a common issue with Selenium and Browserless when sessions weren't properly managed.

## Root Causes

1. **Incomplete WebDriver cleanup** - Sessions weren't being properly terminated
2. **Missing memory optimization flags** - Chrome wasn't configured for memory efficiency
3. **No garbage collection** - Python objects weren't being cleaned up
4. **Session reuse without cleanup** - Driver sessions accumulated memory over time
5. **Missing timeout configurations** - Hanging operations could consume memory indefinitely

## Solutions Implemented

### 1. Enhanced Chrome Options for Memory Efficiency

```python
# Enhanced memory optimization flags
chrome_options.add_argument('--memory-pressure-off')
chrome_options.add_argument('--max_old_space_size=4096') 
chrome_options.add_argument('--aggressive-cache-discard')
chrome_options.add_argument('--disable-background-networking')
chrome_options.add_argument('--disable-images')  # Don't load images
chrome_options.add_argument('--window-size=1280,720')  # Smaller window

# Additional memory-specific optimizations
chrome_options.add_argument('--max-unused-resource-memory-usage-percentage=5')
chrome_options.add_argument('--purge-memory-button')
chrome_options.add_argument('--disable-accelerated-2d-canvas')
chrome_options.add_argument('--disable-accelerated-video-decode')
chrome_options.add_argument('--disable-3d-apis')

# Enhanced timeout and stability settings
chrome_options.add_argument('--timeout=25000')  # 25 second timeout
chrome_options.add_argument('--navigation-timeout=25000')
chrome_options.add_argument('--page-load-strategy=eager')  # Don't wait for all resources
```

### 2. Enhanced WebDriver Session Cleanup

```python
def cleanup_driver(driver):
    """Aggressively cleanup WebDriver session to prevent memory leaks"""
    if not driver:
        return
    
    try:
        # Clear all browser data to free memory
        driver.delete_all_cookies()
        driver.execute_script("window.localStorage.clear();")
        driver.execute_script("window.sessionStorage.clear();")
        
        # Enhanced storage cleanup
        driver.execute_script("window.indexedDB.deleteDatabase();")
        driver.execute_script("if (window.webkitStorageInfo) { window.webkitStorageInfo.requestQuota(0, 0); }")
        
        # Clear cache and history more aggressively
        driver.execute_script("window.caches.keys().then(names => names.forEach(name => caches.delete(name)));")
        driver.execute_script("if (window.performance && window.performance.clearResourceTimings) { window.performance.clearResourceTimings(); }")
        
        # Force browser-level garbage collection
        driver.execute_script("if (window.gc) { window.gc(); }")
        driver.execute_script("if (window.CollectGarbage) { window.CollectGarbage(); }")
        
        # Close all windows and tabs
        for handle in driver.window_handles:
            driver.switch_to.window(handle)
            driver.close()
            
    except Exception as e:
        logger.debug(f"Error during driver cleanup: {e}")
    
    try:
        # Final quit with extended cleanup delay
        driver.quit()
        time.sleep(0.8)  # Extended wait for proper cleanup
    except Exception as e:
        logger.debug(f"Error during driver quit: {e}")
```

### 3. Session Health Monitoring

```python
def is_driver_alive(driver):
    """Check if WebDriver session is still alive"""
    if not driver:
        return False
    
    try:
        driver.current_url
        return True
    except Exception:
        return False
```

### 4. Browserless v1 Specific Optimizations

```python
# Set timeouts to prevent hanging sessions
chrome_options.set_capability('browserless:timeout', 300000)  # 5 minutes max
chrome_options.set_capability('browserless:blockAds', True)  # Block ads to save memory

# Set WebDriver timeouts
driver.set_page_load_timeout(30)  # 30 second page load timeout
driver.implicitly_wait(10)  # 10 second implicit wait
```

### 5. Enhanced Strategic Garbage Collection

```python
def force_garbage_collection():
    """Aggressively force garbage collection to help with memory management"""
    try:
        import gc
        
        # Multiple collection passes for thorough cleanup
        collected = 0
        for i in range(3):  # 3 passes to catch circular references
            collected += gc.collect()
        
        # Force collection of specific generations
        gc.collect(0)  # Young objects
        gc.collect(1)  # Middle-aged objects  
        gc.collect(2)  # Old objects
        
        logger.debug(f"Garbage collection: {collected} objects collected")
        
    except Exception as e:
        logger.debug(f"Error during garbage collection: {e}")
```

Applied at key points:
- Between category scraping (double collection)
- Every 5 regions within categories
- After each scheduled scrape
- On manual cleanup requests
- When memory usage exceeds 350MB threshold

### 6. Enhanced Timeout and Reliability Management

```python
# Per-region timeout handling (35 seconds)
def timeout_handler(signum, frame):
    raise TimeoutError(f"Region {region['name']} timed out after {region_timeout} seconds")

# Multiple fallback strategies for element detection
try:
    # Strategy 1: Look for main records tables
    table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.records_subtable.flex_table")))
except Exception as e1:
    try:
        # Strategy 2: Look for any table-like structure
        table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.flex_table")))
    except Exception as e2:
        # Strategy 3: Look for any records container
        table_elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "[class*='record']")))
```

### 7. Memory Monitoring

Added memory monitoring to track usage:

```python
# In /status endpoint
import psutil
process = psutil.Process(os.getpid())
memory_info = process.memory_info()
memory_mb = memory_info.rss / 1024 / 1024

return {
    "memory_usage_mb": round(memory_mb, 2),
    "memory_percent": round(process.memory_percent(), 2),
    # ... other status info
}
```

### 8. Manual Cleanup Endpoint

Added `/cleanup` endpoint for manual memory management:

```bash
curl -X POST https://your-app.railway.app/cleanup
```

Returns current memory usage and objects collected.

## Implementation Details

### Before (Memory Leak Issues)
- Simple `driver.quit()` calls
- No session validation
- No memory optimization flags  
- No garbage collection
- Sessions reused without cleanup

### After (Memory Managed)
- Comprehensive cleanup with `cleanup_driver()`
- Session health checks with `is_driver_alive()`
- Memory-optimized Chrome configuration
- Strategic garbage collection
- Fresh sessions between categories
- Timeout configurations prevent hanging

## Monitoring Memory Usage

### 1. Check Current Memory Usage
```bash
curl https://your-app.railway.app/status
```

### 2. Force Memory Cleanup
```bash
curl -X POST https://your-app.railway.app/cleanup
```

### 3. Railway Dashboard
Monitor the memory graph in Railway dashboard to see if the upward trend has been resolved.

## Expected Results

With these improvements, you should see:

✅ **Stable memory usage** - No more continuous upward trend (target: ~120MB baseline)
✅ **Lower baseline memory** - Enhanced Chrome configuration with 20+ memory optimization flags
✅ **Faster session cleanup** - Aggressive WebDriver termination with browser-level garbage collection
✅ **Better error recovery** - Sessions refresh on failures with 3-tier fallback strategies
✅ **Enhanced timeout handling** - 35-second per-region timeouts with proper cleanup
✅ **Monitoring capabilities** - Real-time memory tracking with delta reporting
✅ **Automatic cleanup triggers** - Memory usage thresholds with forced garbage collection
✅ **Reduced memory deltas** - Periodic cleanup every 5 regions to prevent accumulation

## Best Practices for Browserless v1

1. **Always use cleanup_driver()** instead of direct driver.quit()
2. **Check session health** before reusing drivers
3. **Set appropriate timeouts** to prevent hanging operations
4. **Monitor memory usage** regularly via /status endpoint
5. **Force cleanup** if memory usage gets too high
6. **Use memory-optimized Chrome flags** for production
7. **Refresh sessions** between major operations (categories)

## Troubleshooting

### Memory Still Increasing?
1. Check if cleanup_driver() is being called consistently
2. Verify Browserless timeout settings are working
3. Monitor for hanging operations in logs
4. Consider reducing scraping frequency temporarily

### High Memory Usage?
1. Use `/cleanup` endpoint to force garbage collection
2. Check for error conditions preventing proper cleanup  
3. Restart the Railway service if memory usage is critical
4. Review logs for WebDriver session errors

### Session Errors?
1. Check Browserless service health
2. Verify timeout configurations
3. Review network connectivity to Browserless
4. Check if sessions are being properly refreshed

This comprehensive memory management approach should resolve the memory leak issues you were experiencing with Browserless v1. 