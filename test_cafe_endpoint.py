#!/usr/bin/env python3
"""
Test script for the cafe orders API endpoint.
"""

import requests
import json

def test_cafe_orders_endpoint():
    """Test the cafe orders add endpoint with sample data."""
    
    # Sample test data
    test_orders = [
        {
            "fish_name": "Test Fish",
            "location": "Test Location", 
            "quantity": 1,
            "mass": "100 g",
            "price": 10.50
        },
        {
            "fish_name": "Another Test Fish",
            "location": "Test Location",
            "quantity": 2, 
            "mass": "1.5 kg",
            "price": 25.75
        }
    ]
    
    # Test the endpoint
    try:
        print("Testing cafe orders endpoint...")
        print(f"Sending {len(test_orders)} test orders")
        
        response = requests.post('http://localhost:8000/api/cafe-orders/add', json=test_orders)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Added {data.get('added_count', 0)} orders")
            return True
        else:
            print(f"❌ Failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        print("Make sure the server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_cafe_orders():
    """Test getting cafe orders from the API."""
    try:
        print("\nTesting get cafe orders endpoint...")
        response = requests.get('http://localhost:8000/api/cafe-orders')
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {data.get('total_orders', 0)} total orders")
            print(f"Locations: {', '.join(data.get('locations', []))}")
            return True
        else:
            print(f"❌ Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=== Cafe Orders API Test ===")
    
    # Test adding orders
    add_success = test_cafe_orders_endpoint()
    
    # Test getting orders  
    get_success = test_get_cafe_orders()
    
    if add_success and get_success:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️ Some tests failed. Check server logs.")