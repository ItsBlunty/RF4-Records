#!/usr/bin/env python3
"""
Add more Q&A entries to the dataset
"""

from database import SessionLocal, QADataset
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def add_more_qa_data():
    """Add 6 more Q&A entries from Dev FAQ 2024"""
    try:
        db = SessionLocal()
        
        # New Q&A pairs from Dev FAQ 2024 - December 2, 2024
        qa_pairs = [
            {
                'question': 'I have written many times in the suggestions about adding a technoplankton rig to float fishing for catching Bighead Carp, Buffalo and other fish with similar preferences. As for realism, it\'s only a plus, in addition it will revive heavy match tackle, which is now of little use and float fishing in general. And yes, here too, RF4 lags behind other games where such rigs are present. Are there any plans to add such rigs?',
                'answer': 'We have no plans to add this kind of float fishing rig at the moment, especially since this kind of rig, due to its narrow specialization, is expected to cause a game balance disorder, but we are constantly looking for ideas for the development of the project. Thank you for your idea.',
                'topic': 'Fishing Equipment',
                'tags': 'technoplankton,float fishing,match tackle,bighead carp,buffalo',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'When fishing on droppers (dropshots), only two of the baits used are displayed in the upper left corner of the screen. Are there plans to increase the number of boxes to display all the baits included in the assembly?',
                'answer': 'This problem we will try to solve.',
                'topic': 'UI/Interface',
                'tags': 'droppers,dropshots,UI,bait display,interface',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'Are there plans to implement spring, autumn water bodies? (season changes)',
                'answer': 'Definitely! Stay tuned.',
                'topic': 'Game Features',
                'tags': 'seasons,spring,autumn,waterbodies,seasonal changes',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'Are there plans to redesign the chat room, in particular we really miss the "Friends" function, where you could add your friends, and in this tab see only messages from them, quickly switch between profiles, etc. Now the "Messages" tab is very quickly clogged with beggars and other strange people.',
                'answer': 'Yes, we will improve the chat and messages, including the introduction of "Friends" and related functionality.',
                'topic': 'Social Features',
                'tags': 'chat,friends,messages,social,communication',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'Are there plans to introduce new lures for spin fishing? For example, tail spinners, swim baits, and other modern things.',
                'answer': 'We plan to develop spin fishing further and add new lures and rigs. We can\'t say yet what exactly will be added first.',
                'topic': 'Fishing Equipment',
                'tags': 'lures,spin fishing,tail spinners,swim baits,tackle',
                'source': 'RF4 Dev FAQ 2024',
                'original_poster': 'TpCatch - RF4',
                'post_link': 'https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/',
                'date_added': datetime(2024, 12, 2, tzinfo=timezone.utc)
            },
            {
                'question': 'Are there any improvements planned for the houses? 1)Many nice, interesting fish have appeared. I would like to hang their trophies on the walls, but there is not enough space. Can we add the possibility of buying a room for trophies? There is the door for it on Norwegian Sea already..... 2)Expand the functionality of the house: an aquarium for storing bait fish, a kitchen for cooking new dishes, etc. 3) There is no place to put/store/hang medals/cups etc. Additional shelves/boards would be nice. 4)Add a team house, at least for lures/baits storage.',
                'answer': 'Since there is such a request, yes, we will work on further development of the houses.',
                'topic': 'Game Features',
                'tags': 'houses,trophies,aquarium,kitchen,medals,team house,storage',
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
        logger.info(f'Successfully added {len(qa_pairs)} more Q&A entries')
        
        # Verify the data
        count = db.query(QADataset).count()
        logger.info(f'Total Q&A pairs in database: {count}')
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"Error adding more Q&A data: {e}")
        return False

if __name__ == "__main__":
    add_more_qa_data()