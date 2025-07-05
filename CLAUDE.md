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

## Critical Lessons Learned

### Git Workflow Mistakes to Avoid
- **NEVER make the same change on both branches separately** - This creates duplicate commits with different hashes and poor git history
- **ALWAYS use proper merge workflow** - Make changes on one branch, then merge to the other branch
- **Be extremely careful with git operations** - Previous mistakes include accidentally deleting user files during git operations
- **Double-check file integrity** - Always verify that user-added files are preserved during git operations

### Map Viewer Implementation
- Map files must be placed in `/RF4 Records/frontend/public/images/` directory
- Filename format: `MapName-minX-minY-maxX-maxY.png` (supports decimal coordinates)
- URL format: `/maps/mapname` (lowercase)
- Always verify image files exist before committing map viewer changes

### React Component Development - Critical Debugging Checklist
**ALWAYS verify these before committing React component changes to prevent white page crashes:**

1. **State Variables Declaration Check:**
   - Ensure ALL state variables used in JSX/logic are properly declared with `useState()`
   - Check that variable names in `useState()` exactly match those used in the component
   - Example: If using `saltwaterFilter` in logic, must have `const [saltwaterFilter, setSaltwaterFilter] = useState('All');`

2. **useMemo Dependencies Check:**
   - Verify ALL state variables used inside `useMemo()` are included in the dependency array
   - Missing dependencies cause stale closures and broken filtering/sorting
   - Example: `useMemo(() => {...}, [var1, var2, var3])` must include ALL vars used inside

3. **Unicode/Special Character Safety:**
   - Use `.includes()` instead of direct `===` comparison for emojis/unicode
   - Example: Use `reel.Saltwater_Resistance.includes('💧')` not `reel.Saltwater_Resistance === '💧'`

4. **Import Statement Completeness:**
   - Verify all imported React hooks are included: `useState`, `useEffect`, `useMemo`, etc.
   - Check that all Lucide icons used in JSX are imported

5. **Quick Syntax Validation:**
   - Check for missing commas in object/array definitions
   - Verify proper JSX closing tags and parentheses matching
   - Ensure proper string quotes and template literal backticks

**White page = JavaScript error. These checks prevent 95% of component crashes.**