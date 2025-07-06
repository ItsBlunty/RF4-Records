#!/usr/bin/env python3
"""
Initialize Q&A dataset with initial entries
"""

from database import SessionLocal, QADataset, create_tables
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def init_qa_data():
    """Initialize Q&A dataset with the first 3 entries"""
    try:
        # Ensure tables exist
        create_tables()
        
        db = SessionLocal()
        
        # Check if we already have data
        existing_count = db.query(QADataset).count()
        if existing_count > 0:
            logger.info(f"Q&A dataset already has {existing_count} entries, skipping initialization")
            db.close()
            return
        
        # Initial Q&A pairs from Dev FAQ 2024
        qa_pairs = [
            {
                'question': 'Regarding Marine fishing, specifically droppers: Let\'s say we have an assembly of pilker plus 3 baits. Do they work independently, as separate, or as a sandwich, influencing each other, and also, is there a difference in the order, i.e. will there be a difference in bites if you change their positions.',
                'answer': 'In this case droppers work independently.',
                'topic': 'Marine Fishing',
                'tags': 'droppers,marine,bait,pilker',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'On June 17, 2022 "Collectible Cards" was announced. Are there any plans to release this feature or have you abandoned it. If possible, present more details.',
                'answer': 'Collectible cards will be implemented. The cards were postponed several times in order to implement other tasks, and as a result, as it sometimes happens, we were wrong with the initial estimate, but now the cards are being actively developed.',
                'topic': 'Game Features',
                'tags': 'collectible cards,development,features',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'Are there plans to develop teams inside the game, not on the website as it is now?',
                'answer': 'Yes, absolutely. We consider teams as an important area of development and plan to develop them directly inside the game, not only on the website.',
                'topic': 'Game Features',
                'tags': 'teams,development,in-game',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            }
        ]
        
        # Add all Q&A pairs
        for qa_data in qa_pairs:
            new_item = QADataset(
                question=qa_data['question'],
                answer=qa_data['answer'],
                topic=qa_data['topic'],
                tags=qa_data['tags'],
                source=qa_data['source'],
                original_poster=qa_data['original_poster'],
                post_link=qa_data['post_link'],
                date_added=qa_data['date_added']
            )
            db.add(new_item)
        
        db.commit()
        logger.info(f'Successfully initialized Q&A dataset with {len(qa_pairs)} entries')
        
        # Verify the data
        count = db.query(QADataset).count()
        logger.info(f'Total Q&A pairs in database: {count}')
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"Error initializing Q&A data: {e}")
        return False

if __name__ == "__main__":
    init_qa_data()