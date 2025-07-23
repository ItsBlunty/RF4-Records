# RF4 Records - Project-Specific Patterns

## Data Scraping Patterns
- **Selenium with Chrome Headless**: Used for scraping dynamic RF4 website content
- **Weight Format Handling**: Support multiple formats: "9.747 kg", "341 g", "1 079.839 kg"
- **Multi-Region Support**: 10 regions and 5 categories in scraping logic
- **Scheduled Scraping**: APScheduler runs scraping every 15 minutes

## Database Patterns
- **SQLAlchemy Models**: Record, QADataset, CafeOrder, Feedback, PollVote
- **PostgreSQL**: Production database with proper connection handling
- **Memory Management**: Periodic cleanup to prevent memory leaks
- **Trophy Classification**: Automated classification system for fish records

## Frontend Patterns
- **Component Structure**: Functional components with hooks
- **State Management**: React hooks for local state, no external state library
- **Filtering System**: Multi-select filters with real-time updates
- **View Modes**: Grouped by Bait, Grouped by Fish, List View
- **Responsive Design**: Tailwind CSS for mobile-first design

## Map System
- **File Format**: `/RF4 Records/frontend/public/images/MapName-minX-minY-maxX-maxY.png`
- **URL Pattern**: `/maps/mapname` (lowercase)
- **Coordinate Support**: Decimal coordinates in filename

## API Patterns
- **FastAPI**: RESTful endpoints with proper HTTP status codes
- **Rate Limiting**: SlowAPI for request throttling
- **CORS**: Configured for frontend domains
- **Health Checks**: `/health` endpoint for Railway monitoring
- **Admin Authentication**: Bearer token required for admin endpoints

## Security Patterns
- **ADMIN_TOKEN**: Environment variable for admin endpoint authentication
- **Input Validation**: Proper validation for all user inputs
- **SQL Injection Prevention**: SQLAlchemy ORM usage
- **XSS Prevention**: React's built-in XSS protection

## Performance Patterns
- **GZip Compression**: Middleware for response compression
- **Memory Monitoring**: psutil for system resource tracking
- **Background Tasks**: APScheduler for non-blocking operations
- **Caching**: Strategic caching for frequently accessed data