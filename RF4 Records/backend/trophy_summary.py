#!/usr/bin/env python3
"""
Generate trophy classification summary for frontend integration
"""

from database import SessionLocal, Record
from sqlalchemy import func

def generate_trophy_summary():
    """Generate a summary of trophy classifications in the database"""
    
    session = SessionLocal()
    try:
        print("🏆 Trophy Classification Summary\n")
        
        # Get total records
        total_records = session.query(Record).count()
        print(f"📊 Total Records: {total_records:,}")
        
        if total_records == 0:
            print("   No records in database")
            return
        
        # Get classification breakdown
        classification_counts = session.query(
            Record.trophy_class,
            func.count(Record.id).label('count')
        ).group_by(Record.trophy_class).all()
        
        print("\n🏅 Classification Breakdown:")
        for classification, count in classification_counts:
            percentage = (count / total_records * 100) if total_records > 0 else 0
            emoji = {"record": "🥇", "trophy": "🏆", "normal": "🐟"}.get(classification, "❓")
            print(f"   {emoji} {classification.title()}: {count:,} ({percentage:.1f}%)")
        
        # Get top trophy fish by species
        print("\n🎯 Top Trophy Fish (by species):")
        trophy_fish = session.query(
            Record.fish,
            func.count(Record.id).label('trophy_count')
        ).filter(
            Record.trophy_class.in_(['trophy', 'record'])
        ).group_by(Record.fish).order_by(
            func.count(Record.id).desc()
        ).limit(10).all()
        
        for fish, count in trophy_fish:
            print(f"   🐠 {fish}: {count:,} trophies/records")
        
        # Get record holders
        print("\n🥇 Recent Record Catches:")
        recent_records = session.query(Record).filter(
            Record.trophy_class == 'record'
        ).order_by(Record.created_at.desc()).limit(5).all()
        
        for record in recent_records:
            weight_kg = record.weight / 1000 if record.weight >= 1000 else record.weight
            unit = "kg" if record.weight >= 1000 else "g"
            print(f"   🏆 {record.fish} - {weight_kg:.1f}{unit} by {record.player} ({record.waterbody})")
        
        # Example API endpoint format
        print("\n🔌 Example API Usage:")
        print("   GET /api/records?trophy_class=record    # Get all record catches")
        print("   GET /api/records?trophy_class=trophy    # Get all trophy catches") 
        print("   GET /api/records?trophy_class=normal    # Get all normal catches")
        print("   GET /api/leaderboard?filter=trophy      # Trophy leaderboard")
        
    finally:
        session.close()

if __name__ == "__main__":
    generate_trophy_summary()