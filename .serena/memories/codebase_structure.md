# RF4 Records - Codebase Structure

## Root Directory Structure
```
RF4-Records/
├── RF4 Records/                 # Main application directory
│   ├── backend/                 # Python FastAPI backend
│   ├── frontend/                # React frontend
│   ├── bin/                     # Shell scripts
│   └── *.py                     # Data processing scripts
├── Screenshots/                 # Game screenshots and assets
├── scannedcafepics/            # Cafe-related images
├── *.csv                       # Data files (reels, rods, etc.)
├── *.md                        # Documentation files
├── Dockerfile                  # Container configuration
├── railway.json               # Railway deployment config
└── AGENTS.md                  # Development guidelines
```

## Backend Structure (`RF4 Records/backend/`)
```
backend/
├── main.py                     # FastAPI application entry point
├── database.py                 # SQLAlchemy models and database setup
├── scraper.py                  # Web scraping logic with Selenium
├── scheduler.py                # Background task scheduling
├── unified_cleanup.py          # Memory management and cleanup
├── trophy_classifier.py        # Trophy classification logic
├── bait_utils.py              # Bait normalization utilities
├── requirements.txt           # Python dependencies
└── *.py                       # Various utility and maintenance scripts
```

## Frontend Structure (`RF4 Records/frontend/`)
```
frontend/
├── src/
│   ├── components/            # React components
│   │   ├── RecordsTable.jsx   # Main records display
│   │   ├── Filters.jsx        # Filtering interface
│   │   ├── MapViewer.jsx      # Interactive maps
│   │   └── *.jsx             # Other UI components
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   ├── config/                # Configuration files
│   ├── assets/                # Images and static assets
│   ├── App.jsx               # Main application component
│   └── index.jsx             # Application entry point
├── public/                    # Static assets
├── package.json              # Node.js dependencies and scripts
├── vite.config.js            # Vite build configuration
└── tailwind.config.js        # Tailwind CSS configuration
```

## Key Files and Their Purposes
- **main.py**: FastAPI server with API endpoints, CORS, rate limiting
- **database.py**: SQLAlchemy models for records, QA data, cafe orders, etc.
- **scraper.py**: Selenium-based scraping of RF4 records from multiple regions
- **App.jsx**: Main React component with routing and state management
- **RecordsTable.jsx**: Core table component with sorting and filtering
- **Dockerfile**: Multi-stage build with Chrome, Node.js, and Python setup