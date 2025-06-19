# RF4 Records

A web application for tracking and displaying Russian Fishing 4 records data. Features include real-time data scraping, advanced filtering, and multiple view modes.

## Features

- **Real-time Data Scraping**: Automatically scrapes RF4 records from multiple regions and categories
- **Advanced Filtering**: Filter by fish type, waterbody, and bait combinations
- **Multiple View Modes**: 
  - Grouped by Bait (collapsible groups)
  - Grouped by Fish (collapsible groups)
  - List View (all records)
- **Sorting**: Sort by any column in all view modes
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-refresh**: Data updates automatically every 5 minutes

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **Selenium**: Web scraping for dynamic content
- **PostgreSQL**: Production database (SQLite for local development)
- **APScheduler**: Automated scraping every 15 minutes

### Frontend
- **React**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Axios**: HTTP client

## Local Development

### Prerequisites
- Python 3.8+
- Node.js 16+
- Chrome browser (for Selenium)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will start on `http://localhost:8000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

## Deployment to Railway

### Step 1: Prepare Your Repository
1. Make sure all changes are committed to your GitHub repository
2. Ensure the following files are present:
   - `railway.json` (Railway configuration)
   - `Procfile` (Process definition)
   - `backend/requirements.txt` (Python dependencies)
   - `backend/main.py` (FastAPI app)

### Step 2: Deploy Backend
1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect it's a Python project
5. Add a PostgreSQL database:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set the `DATABASE_URL` environment variable

### Step 3: Configure Environment Variables
In your Railway project settings, add these environment variables:
- `PORT`: `8000` (Railway will set this automatically)
- `HOST`: `0.0.0.0` (Railway will set this automatically)
- `RAILWAY_ENVIRONMENT`: `production`

### Step 4: Deploy Frontend
1. Create a new Railway project for the frontend
2. Deploy from the same GitHub repository
3. Set the build command: `cd frontend && npm install && npm run build`
4. Set the start command: `cd frontend && npm run preview`
5. Add environment variable:
   - `VITE_API_URL`: Your backend Railway URL (e.g., `https://your-backend.railway.app`)

### Step 5: Configure CORS
Update the CORS origins in `backend/main.py` to include your frontend URL:
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173", 
    "https://your-frontend.railway.app",  # Add your frontend URL
    "*"
],
```

### Step 6: Test Deployment
1. Visit your backend URL to check the API is working
2. Visit your frontend URL to test the full application
3. Check the logs in Railway dashboard for any errors

## Database Migration

When deploying for the first time, the database tables will be created automatically. If you need to migrate existing data:

1. Export your local SQLite data
2. Import to PostgreSQL using Railway's database tools
3. Run the migration script if needed

## Monitoring

- **Railway Dashboard**: Monitor logs, performance, and resource usage
- **API Health Check**: Visit `/` endpoint to check server status
- **Database Status**: Visit `/status` endpoint for detailed status

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure frontend URL is in CORS origins
2. **Database Connection**: Check `DATABASE_URL` environment variable
3. **Selenium Issues**: Railway provides Chrome in the build environment
4. **Memory Issues**: Monitor resource usage in Railway dashboard

### Logs
- Backend logs: Available in Railway dashboard
- Frontend logs: Check browser console
- Database logs: Available in Railway database section

## API Endpoints

- `GET /` - Server status
- `GET /records` - Get all fishing records
- `POST /refresh` - Trigger manual scrape
- `GET /status` - Server and database status
- `GET /docs` - Interactive API documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

This project is for educational purposes. Please respect the RF4 website's terms of service when scraping data. 