# RF4 Records - Tech Stack

## Backend
- **FastAPI**: Modern Python web framework for API development
- **SQLAlchemy**: Database ORM for data modeling and queries
- **Selenium**: Web scraping for dynamic content from RF4 website
- **PostgreSQL**: Production database (Railway deployment)
- **APScheduler**: Automated scraping every 15 minutes
- **Python 3.11**: Runtime environment

### Key Backend Dependencies
- `requests==2.31.0` - HTTP requests
- `beautifulsoup4==4.12.2` - HTML parsing
- `fastapi==0.104.1` - Web framework
- `uvicorn[standard]==0.24.0` - ASGI server
- `sqlalchemy==2.0.23` - ORM
- `psycopg2-binary==2.9.9` - PostgreSQL adapter
- `selenium==4.15.2` - Web scraping
- `webdriver-manager==4.0.1` - Chrome driver management

## Frontend
- **React 19.1.0**: UI framework with functional components and hooks
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Axios**: HTTP client for API communication
- **React Router DOM**: Client-side routing

### Key Frontend Dependencies
- `react-router-dom==6.28.0` - Routing
- `lucide-react==0.517.0` - Icon library
- `axios==1.10.0` - HTTP client

## Infrastructure
- **Railway**: Cloud deployment platform
- **Docker**: Containerization with custom Dockerfile
- **GitHub**: Version control and CI/CD integration
- **Chrome Headless**: Browser automation for scraping