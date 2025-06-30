#!/usr/bin/env python3
"""
Fix trophy classifications for production database
"""

import os
from database import SessionLocal, Record
from trophy_classifier import classify_trophy

# Set environment variables for production
os.environ.update({
    'PGDATABASE': 'railway',
    'PGUSER': 'postgres', 
    'PGPASSWORD': 'FAUBKdJaFyecBvLueekeXhSjPBwMUurC',
    'PGHOST': 'yamanote.proxy.rlwy.net',
    'PGPORT': '29646'
})

def fix_trophy_classifications():
    print('🔧 Force updating trophy classifications...')
    try:
        db = SessionLocal()
        
        # Find that specific 6740g largemouth bass
        problem_record = db.query(Record).filter(
            Record.fish.ilike('%largemouth%'),
            Record.weight == 6740
        ).first()
        
        if problem_record:
            old_class = problem_record.trophy_class
            new_class = classify_trophy(problem_record.fish, problem_record.weight)
            
            print(f'Found problem record:')
            print(f'  Fish: {repr(problem_record.fish)}')
            print(f'  Weight: {problem_record.weight}g')
            print(f'  Current class: {old_class}')  
            print(f'  Should be: {new_class}')
            
            if old_class != new_class:
                print(f'🔄 Updating classification...')
                problem_record.trophy_class = new_class
                db.commit()
                print(f'✅ Updated to: {new_class}')
            else:
                print(f'✅ Already correct!')
        else:
            print('❌ Problem record not found')
        
        # Check for other misclassified records
        print('\n🔍 Checking for other misclassified largemouth bass...')
        all_largemouth = db.query(Record).filter(
            Record.fish.ilike('%largemouth%'),
            Record.weight >= 6000  # Should be trophies
        ).all()
        
        updates = 0
        for record in all_largemouth:
            current = record.trophy_class
            should_be = classify_trophy(record.fish, record.weight)
            if current != should_be:
                print(f'  Updating: {record.fish} ({record.weight}g) {current} -> {should_be}')
                record.trophy_class = should_be
                updates += 1
        
        if updates > 0:
            db.commit()
            print(f'\n✅ Updated {updates} largemouth bass records')
        else:
            print(f'\n✅ All largemouth bass records correctly classified')
        
        # Now check ALL records that might be misclassified due to case sensitivity
        print('\n🔍 Checking for case-sensitive misclassifications...')
        
        # Get a sample of records to check
        sample_records = db.query(Record).filter(
            Record.weight.isnot(None),
            Record.weight > 0
        ).limit(1000).all()
        
        total_updates = 0
        for record in sample_records:
            current = record.trophy_class
            should_be = classify_trophy(record.fish, record.weight)
            if current != should_be:
                print(f'  Updating: {record.fish} ({record.weight}g) {current} -> {should_be}')
                record.trophy_class = should_be
                total_updates += 1
        
        if total_updates > 0:
            db.commit()
            print(f'\n✅ Updated {total_updates} records in sample')
        else:
            print(f'\n✅ No misclassifications found in sample')
        
        db.close()
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_trophy_classifications()