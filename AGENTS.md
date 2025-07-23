# AGENTS.md - Development Guidelines for RF4 Records

## Behavioral Rules (CRITICAL - Follow Always)
1. **Railway Deployment**: This is a remote project on Railway, design everything for Railway deployment. It will not be tested locally.
2. **Database**: The other service available is a PostgreSQL deployment.
3. **Branch Management**: Always push to dev branch unless directly asked, when you complete a task. Don't just commit without pushing.
4. **Git Operations**: When pushing anything, always `git add .` to include everything, and attach a useful commit message.
5. **Main Branch Protection**: Never make changes to main unless they are already tested on dev, unless the user asks directly and has confirmed it has been tested on dev.
6. **React Safety**: When making changes to React, ALWAYS take an extra step to check for potential white-page/JavaScript errors (state variables, useMemo dependencies, unicode safety, imports, etc.).
7. **Railway CLI**: Never push through railway CLI, always push through GitHub. When using "railway" commands, check with `railway status` to ensure you're on dev branch and "RF4-Records" project.
8. **Deployment Verification**: After pushing to dev, sleep 120s and use `timeout 10s railway logs` to check the deployed commit hash in the logs. **CRITICAL**: Look for your commit hash (from `git log --oneline -1`) in the railway logs output - they must match! If the commit hash doesn't appear in logs OR if you see "No deployments found", sleep another 120s (up to 5 times) until Railway deploys your new commit. **NOTE**: "No deployments found" is normal when the dev server is spun down and needs time to provision - keep waiting! **NEVER TRIGGER A REDEPLOY TO RAILWAY! ALWAYS JUST KEEP WAITING!** If you've waited 10 minutes total, try to build it locally and check for build errors. Only when your commit hash appears in the logs should you test with Playwright at https://rf4-records-dev.up.railway.app/. Don't stop until issue is solved and request fulfilled.
9. **Command Timeouts**: Always consider adding timeouts to commands to prevent getting stuck.
10. **Rule Display**: Display all behavioral rules at start of every 3rd response (readable format, not XML).

## Build/Test Commands
- **Frontend**: `cd "RF4 Records/frontend" && npm run dev` (development), `npm run build` (production)
- **Backend**: `cd "RF4 Records/backend" && python main.py` (FastAPI server)
- **No test framework configured** - verify changes via Railway deployment testing

## Deployment & Testing
- Always deploy to Railway dev branch first, never push directly to main
- After pushing, wait 120s and use `timeout 10s railway logs` to check deployed commit hash
- **CRITICAL**: Look for your commit hash (from `git log --oneline -1`) in the railway logs - they MUST match!
- If commit hash doesn't appear in logs OR "No deployments found", the new code hasn't deployed yet - wait longer!
- **NOTE**: "No deployments found" means dev server is spun down and provisioning - this is normal, keep waiting!
- Use `railway logs` to verify deployment timing by checking for your commit hash
- Test implementation at https://rf4-records-dev.up.railway.app/ using Playwright
- **Production URL**: https://rf4records.com/
- Use `railway status` to confirm you're on dev branch and RF4-Records project

## Code Style Guidelines
- **Python**: Use SQLAlchemy models, FastAPI patterns, logging to stdout (not stderr)
- **React**: Use functional components with hooks, .jsx extensions, proper imports
- **Imports**: Absolute imports for components, relative for utils/config
- **Error Handling**: Use try/catch blocks, proper HTTP status codes, user-friendly messages
- **Naming**: camelCase for JS/React, snake_case for Python, descriptive variable names

## Project-Specific Rules
- Use Selenium with Chrome headless for scraping, handle weight formats: "9.747 kg", "341 g", "1 079.839 kg"
- Support 10 regions and 5 categories in scraping logic
- Map files: `/RF4 Records/frontend/public/images/MapName-minX-minY-maxX-maxY.png`
- Always `git add .` before committing, use descriptive commit messages