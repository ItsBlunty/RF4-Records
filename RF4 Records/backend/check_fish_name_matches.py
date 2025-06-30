#!/usr/bin/env python3
"""
Check for mismatches between database fish names and trophy weights dictionary
"""

import os
from database import SessionLocal, Record
from trophy_classifier import TROPHY_WEIGHTS

# Set environment variables for production
os.environ.update({
    'PGDATABASE': 'railway',
    'PGUSER': 'postgres', 
    'PGPASSWORD': 'FAUBKdJaFyecBvLueekeXhSjPBwMUurC',
    'PGHOST': 'yamanote.proxy.rlwy.net',
    'PGPORT': '29646'
})

def check_fish_name_matches():
    print('🔍 Checking fish name matches between database and trophy weights...')
    print()
    
    try:
        db = SessionLocal()
        
        # Get all unique fish names from database (case-insensitive)
        db_fish_names = set()
        raw_db_names = db.query(Record.fish).filter(Record.fish.isnot(None)).distinct().all()
        for (fish_name,) in raw_db_names:
            if fish_name and fish_name.strip():
                db_fish_names.add(fish_name.strip())
        
        # Get all fish names from trophy weights dictionary
        trophy_fish_names = set(TROPHY_WEIGHTS.keys())
        
        print(f'📊 Summary:')
        print(f'  Database fish names: {len(db_fish_names)}')
        print(f'  Trophy weights fish names: {len(trophy_fish_names)}')
        print()
        
        # Find database fish names that don't have trophy weights (case-insensitive)
        db_without_trophies = set()
        for db_fish in db_fish_names:
            has_match = False
            for trophy_fish in trophy_fish_names:
                if db_fish.lower() == trophy_fish.lower():
                    has_match = True
                    break
            if not has_match:
                db_without_trophies.add(db_fish)
        
        # Find trophy weights that don't have database records (case-insensitive)
        trophies_without_db = set()
        for trophy_fish in trophy_fish_names:
            has_match = False
            for db_fish in db_fish_names:
                if trophy_fish.lower() == db_fish.lower():
                    has_match = True
                    break
            if not has_match:
                trophies_without_db.add(trophy_fish)
        
        # Report results
        print(f'🎣 Database fish WITHOUT trophy weights: {len(db_without_trophies)}')
        if db_without_trophies:
            print('   (These fish in database have no trophy classification rules)')
            for fish in sorted(db_without_trophies)[:20]:  # Show first 20
                print(f'     "{fish}"')
            if len(db_without_trophies) > 20:
                print(f'     ... and {len(db_without_trophies) - 20} more')
        
        print()
        print(f'🏆 Trophy weights WITHOUT database records: {len(trophies_without_db)}')
        if trophies_without_db:
            print('   (These trophy rules have no matching fish in database)')
            for fish in sorted(trophies_without_db)[:20]:  # Show first 20
                print(f'     "{fish}"')
            if len(trophies_without_db) > 20:
                print(f'     ... and {len(trophies_without_db) - 20} more')
        
        print()
        
        # Check for exact case mismatches (names that match case-insensitively but not exactly)
        case_mismatches = []
        for db_fish in db_fish_names:
            for trophy_fish in trophy_fish_names:
                if db_fish.lower() == trophy_fish.lower() and db_fish != trophy_fish:
                    case_mismatches.append((db_fish, trophy_fish))
        
        print(f'🔤 Case mismatches (same fish, different capitalization): {len(case_mismatches)}')
        if case_mismatches:
            print('   (These work with our case-insensitive fix)')
            for db_name, trophy_name in sorted(case_mismatches)[:10]:
                print(f'     DB: "{db_name}" → Trophy: "{trophy_name}"')
            if len(case_mismatches) > 10:
                print(f'     ... and {len(case_mismatches) - 10} more')
        
        print()
        
        # Summary score
        total_mismatches = len(db_without_trophies) + len(trophies_without_db)
        if total_mismatches == 0:
            print('🎉 PERFECT MATCH! All database fish names have corresponding trophy weights!')
        else:
            print(f'❌ Total mismatches: {total_mismatches}')
            print(f'   • {len(db_without_trophies)} database fish need trophy weights added')
            print(f'   • {len(trophies_without_db)} trophy weights have no database records')
        
        # Show some examples of what records look like for fish without trophy weights
        if db_without_trophies:
            print()
            print('📋 Sample records for fish without trophy weights:')
            sample_fish = list(db_without_trophies)[:5]
            for fish_name in sample_fish:
                sample_record = db.query(Record).filter(Record.fish == fish_name).first()
                if sample_record:
                    print(f'   "{fish_name}" - {sample_record.weight}g at {sample_record.waterbody}')
        
        db.close()
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_fish_name_matches()