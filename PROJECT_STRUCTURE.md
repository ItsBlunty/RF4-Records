# RF4 Records - Project Structure

A comprehensive reference for the RF4 Records web application codebase.

## Project Overview

RF4 Records is a web application for tracking and displaying Russian Fishing 4 game records and data. It features real-time data scraping, advanced filtering, multiple view modes, and various game reference tools.

**Live URLs:**
- Production: rf4records.com (main branch)
- Development: https://rf4-records-dev.up.railway.app/ (dev branch)

## Directory Structure

```
RF4-Records/
├── CLAUDE.md                    # AI assistant behavioral rules
├── PROJECT_STRUCTURE.md         # This file - project overview
├── DEVELOPMENT.md               # Development workflow (branches, commits)
├── DOCKER_DEPLOYMENT.md         # Docker deployment guide
├── Dockerfile                   # Railway deployment container config
├── railway.json                 # Railway deployment settings
│
└── RF4 Records/                 # Main application directory
    ├── README.md                # Project documentation
    ├── RAILWAY_DEPLOYMENT.md    # Railway-specific deployment guide
    ├── MEMORY_MANAGEMENT.md     # Memory optimization documentation
    ├── SCHEDULER_SETUP.md       # Scraper scheduler documentation
    │
    ├── backend/                 # Python FastAPI backend
    │   ├── main.py              # FastAPI application entry point (154KB - large file)
    │   ├── database.py          # SQLAlchemy database models and connection
    │   ├── scraper.py           # Selenium web scraping logic (91KB)
    │   ├── scheduler.py         # APScheduler for automated scraping
    │   ├── requirements.txt     # Python dependencies
    │   ├── start_server.py      # Server startup script
    │   │
    │   ├── optimized_records.py # Optimized record queries
    │   ├── simplified_records.py # Simplified record handling
    │   ├── trophy_classifier.py # Trophy weight classification
    │   ├── bait_utils.py        # Bait normalization utilities
    │   ├── top_baits_cache.py   # Top baits caching logic
    │   ├── memory_tracker.py    # Memory usage monitoring
    │   ├── system_monitor.py    # System health monitoring
    │   │
    │   ├── cache/               # Runtime cache files
    │   ├── logs/                # Application logs
    │   └── rf4_records.db       # Local SQLite database (dev only)
    │
    └── frontend/                # React frontend
        ├── src/
        │   ├── App.jsx          # Main React application (30KB)
        │   ├── index.jsx        # React entry point
        │   ├── index.css        # Global styles
        │   │
        │   ├── components/      # React components
        │   │   ├── Header.jsx               # Navigation header (37KB)
        │   │   ├── Filters.jsx              # Filter controls
        │   │   ├── MultiSelectFilter.jsx    # Multi-select dropdown
        │   │   ├── SearchHistory.jsx        # Search history tracking
        │   │   │
        │   │   ├── RecordsTable.jsx         # Main records table
        │   │   ├── GroupedRecordsTable.jsx  # Grouped by bait view
        │   │   ├── FishGroupedRecordsTable.jsx # Grouped by fish view
        │   │   ├── TopBaits.jsx             # Top baits analysis
        │   │   ├── TrophyWeights.jsx        # Trophy weight reference
        │   │   │
        │   │   ├── MapViewer.jsx            # Interactive map viewer (46KB)
        │   │   ├── ReelInfo.jsx             # Reel database (51KB)
        │   │   ├── RodInfo.jsx              # Rod database (42KB)
        │   │   ├── Lines.jsx                # Fishing lines reference
        │   │   ├── Lures.jsx                # Lures database (38KB)
        │   │   ├── LureCraftingRecipes.jsx  # Lure crafting guide
        │   │   │
        │   │   ├── SkillTrees.jsx           # Skill tree planner (56KB)
        │   │   ├── SkillLevelingGuides.jsx  # Leveling guides
        │   │   ├── WearCalculator.jsx       # Gear wear calculator
        │   │   ├── WaterbodyPrices.jsx      # Waterbody costs
        │   │   │
        │   │   ├── CafeOrders.jsx           # Cafe order reference
        │   │   ├── AlcoholGuide.jsx         # Alcohol buffs guide
        │   │   ├── Timeline.jsx             # RF4 update timeline
        │   │   ├── QAPage.jsx               # Q&A section
        │   │   │
        │   │   ├── About.jsx                # About page
        │   │   ├── Links.jsx                # External links
        │   │   ├── FeedbackButton.jsx       # User feedback
        │   │   ├── PollOverlay.jsx          # Polls UI
        │   │   ├── LoadingOverlay.jsx       # Loading indicator
        │   │   └── ItemInfo.jsx             # Item detail popup
        │   │
        │   ├── config/          # Configuration files
        │   ├── hooks/           # Custom React hooks
        │   └── utils/           # Utility functions
        │
        ├── public/
        │   ├── images/          # Map images (named: MapName_minX_minY_maxX_maxY.jpg)
        │   ├── data/
        │   │   └── reels.csv    # Reel data
        │   ├── LinesData.csv    # Fishing lines data
        │   ├── LuresData.csv    # Lures data
        │   ├── RodList.csv      # Rod data
        │   └── RF4UpdateTimeline.csv # Game update history
        │
        ├── package.json         # Node.js dependencies
        ├── vite.config.js       # Vite build configuration
        └── tailwind.config.js   # Tailwind CSS configuration
```

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Production database (Railway)
- **Selenium** - Web scraping for RF4 records
- **APScheduler** - Automated scraping every 15 minutes

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### Deployment
- **Railway** - Hosting platform
- **Docker** - Containerization
- **GitHub** - Source control (pushes trigger deployments)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server status / frontend |
| `/records` | GET | Get all fishing records |
| `/records/filtered` | GET | Get filtered records |
| `/records/filter-values` | GET | Get unique filter values |
| `/refresh` | POST | Trigger manual scrape (auth required) |
| `/status` | GET | Server and database status |
| `/docs` | GET | Interactive API documentation |

## Key Files Reference

### Backend Entry Points
- `RF4 Records/backend/main.py` - Main FastAPI application, all API routes
- `RF4 Records/backend/database.py` - Database models, connection pooling
- `RF4 Records/backend/scraper.py` - Selenium scraping logic

### Frontend Entry Points
- `RF4 Records/frontend/src/App.jsx` - Main React app, routing
- `RF4 Records/frontend/src/components/Header.jsx` - Navigation, page switching

### Configuration
- `CLAUDE.md` - AI assistant rules and deployment workflow
- `railway.json` - Railway deployment config
- `Dockerfile` - Container build instructions

### Data Files
- `frontend/public/data/reels.csv` - Reel specifications
- `frontend/public/LinesData.csv` - Fishing line data
- `frontend/public/LuresData.csv` - Lure database
- `frontend/public/RodList.csv` - Rod specifications
- `frontend/public/images/` - Map images (format: `MapName_minX_minY_maxX_maxY.jpg`)

## Deployment Workflow

1. **Development**: Push to `dev` branch
   - Auto-deploys to https://rf4-records-dev.up.railway.app/
   - Test all changes here first

2. **Production**: Merge `dev` to `main`
   - Only after testing on dev
   - Auto-deploys to production

3. **Commands**:
   ```bash
   # Check Railway status (must show dev branch)
   railway status

   # View deployment logs
   timeout 10s railway logs

   # Push changes
   git add . && git commit -m "message" && git push origin dev
   ```

## Environment Variables

Required for Railway deployment:
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `CHROME_BIN` - Chrome binary path
- `CHROMEDRIVER_PATH` - ChromeDriver path
- `ADMIN_TOKEN` - Authentication for admin endpoints

## Features by Component

### Records & Fishing
- `RecordsTable.jsx` - Browse all fishing records
- `GroupedRecordsTable.jsx` - Records grouped by bait
- `FishGroupedRecordsTable.jsx` - Records grouped by fish
- `TopBaits.jsx` - Best baits analysis
- `TrophyWeights.jsx` - Trophy weight thresholds

### Equipment Reference
- `ReelInfo.jsx` - Complete reel database with filtering
- `RodInfo.jsx` - Rod specifications and matching
- `Lines.jsx` - Fishing line reference
- `Lures.jsx` - Lure database with crafting info
- `LureCraftingRecipes.jsx` - Crafting ingredient guide

### Maps & Locations
- `MapViewer.jsx` - Interactive maps with coordinate display
- `WaterbodyPrices.jsx` - Travel costs to waterbodies

### Game Guides
- `SkillTrees.jsx` - Interactive skill tree planner
- `SkillLevelingGuides.jsx` - Leveling optimization
- `WearCalculator.jsx` - Equipment wear estimation
- `AlcoholGuide.jsx` - Buff effects reference
- `CafeOrders.jsx` - Cafe food/drink effects

### Meta
- `Timeline.jsx` - RF4 game update history
- `QAPage.jsx` - Community Q&A
- `About.jsx` - Site information
- `Links.jsx` - External resources
