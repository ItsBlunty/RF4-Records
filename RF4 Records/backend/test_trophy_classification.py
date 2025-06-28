#!/usr/bin/env python3
"""
Test script for trophy classification system
"""

from database import SessionLocal, Record
from trophy_classifier import classify_trophy
from bulk_operations import BulkRecordInserter
from datetime import datetime, timezone

def test_trophy_classification():
    """Test the trophy classification system with sample data"""
    
    print("🧪 Testing trophy classification system...\n")
    
    # Test data with various fish and weights
    test_records = [
        # Record catches (super trophy weights)
        {"fish": "Pike", "weight": 25000, "expected": "record"},  # Record weight: 20000
        {"fish": "Common Carp", "weight": 35000, "expected": "record"},  # Record weight: 30000
        {"fish": "Beluga", "weight": 1500000, "expected": "record"},  # Record weight: 1000000
        
        # Trophy catches
        {"fish": "Pike", "weight": 15000, "expected": "trophy"},  # Trophy: 12000, Record: 20000
        {"fish": "Common Carp", "weight": 25000, "expected": "trophy"},  # Trophy: 20000, Record: 30000
        {"fish": "Perch", "weight": 2000, "expected": "trophy"},  # Trophy: 1600, Record: 2700
        
        # Normal catches
        {"fish": "Pike", "weight": 8000, "expected": "normal"},  # Below trophy weight
        {"fish": "Common Carp", "weight": 15000, "expected": "normal"},  # Below trophy weight
        {"fish": "Perch", "weight": 800, "expected": "normal"},  # Below trophy weight
        
        # Fish not in trophy list
        {"fish": "Unknown Fish", "weight": 50000, "expected": "normal"},
    ]
    
    print("🔍 Testing classification logic:")
    all_passed = True
    
    for i, test_case in enumerate(test_records, 1):
        result = classify_trophy(test_case["fish"], test_case["weight"])
        expected = test_case["expected"]
        status = "✅" if result == expected else "❌"
        
        print(f"{status} Test {i}: {test_case['fish']} ({test_case['weight']}g) -> {result} (expected: {expected})")
        
        if result != expected:
            all_passed = False
    
    print(f"\n📊 Classification Tests: {'✅ All Passed' if all_passed else '❌ Some Failed'}")
    
    # Test database integration
    print("\n🗄️ Testing database integration...")
    
    session = SessionLocal()
    try:
        # Create a test record using BulkRecordInserter
        inserter = BulkRecordInserter(session, batch_size=5)
        
        # Add test records
        for i, test_case in enumerate(test_records[:3]):  # Just test first 3
            record_data = {
                'player': f'TestPlayer{i+1}',
                'fish': test_case['fish'],
                'weight': test_case['weight'],
                'waterbody': 'Test Lake',
                'bait1': 'Test Bait',
                'bait2': None,
                'date': '2025-01-01',
                'region': 'TEST',
                'category': 'N',
                'created_at': datetime.now(timezone.utc)
            }
            
            print(f"📝 Adding test record: {record_data['fish']} ({record_data['weight']}g)")
            inserter.add_record(record_data)
        
        # Flush remaining records
        inserted_count = inserter.close()
        print(f"✅ Inserted {inserted_count} test records")
        
        # Verify trophy classification was added automatically
        print("\n🔍 Verifying auto-classification in database:")
        test_records_in_db = session.query(Record).filter(Record.player.like('TestPlayer%')).all()
        
        for record in test_records_in_db:
            print(f"   {record.fish} ({record.weight}g) -> trophy_class: {record.trophy_class}")
        
        # Clean up test records
        session.query(Record).filter(Record.player.like('TestPlayer%')).delete()
        session.commit()
        print(f"🧹 Cleaned up {len(test_records_in_db)} test records")
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        session.rollback()
    finally:
        session.close()
    
    print("\n🎉 Trophy classification testing completed!")

if __name__ == "__main__":
    test_trophy_classification()