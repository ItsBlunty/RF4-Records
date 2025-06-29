# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RF4 Records is a web application for tracking and displaying Russian Fishing 4 records data. It consists of a FastAPI backend with automated web scraping using Selenium, and a React frontend built with Vite and Tailwind CSS. It's hosted on Railway, so you can't work with it locally to check current status.

## Important Technical Details

### Web Scraping Requirements
- Uses Selenium ONLY (no manual scrapes or fallbacks) as JavaScript execution is required
- Must handle weight formats: "9.747 kg", "341 g", "1 079.839 kg"
- Scrapes from 10 regions and 5 categories - always include all in scraping changes

### Database
- PostgreSQL for production deployment
- Automatic table creation on startup

### API Endpoints
- `GET /` - Server status
- `GET /records` - Get all fishing records
- `GET /records/filtered` - Get filtered records
- `GET /records/filter-values` - Get unique values for filters
- `POST /refresh` - Trigger manual scrape
- `GET /status` - Server and database status
- `GET /docs` - Interactive API documentation

## Deployment

The application is designed for Railway deployment. Everything should be committed and pushed to dev branch after testing. Do not push to main branch unless directly asked. We only have one developer, Claude, so we don't need to worry about errors or merging properly. We just "add ." to add everything, not just what we were working on, and then commit, and push to dev branch. We can test builds locally but we dont test the database locally because it's on railway.